import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { toast } from "./helper.js";
import { statusLabel, t } from "./i18n.js";

const SERVICE_STORAGE_KEY = "beji-dashboard-services";
const HEALER_STORAGE_KEY = "beji-dashboard-healers";
const SERVICE_TYPE_OPTIONS = ["RITUAL SERVICE", "HEALING PACKAGES"];
const SERVICE_UNIT_OPTIONS = ["/ Tamu", "/ Packages"];
const FALLBACK_SERVICE_PHOTO = "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80";
const FALLBACK_HEALER_PHOTO = "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=900&q=80";

let services = [];
let healers = [];

export async function initServicesPage() {
  const rows = qs("#service-rows");
  if (!rows) return;
  services = await loadServices();
  qs("[data-service-new]")?.addEventListener("click", () => openServiceModal());
  qs("#service-search")?.addEventListener("input", renderServices);
  rows.addEventListener("click", handleServiceAction);
  renderServices();
}

export async function initPublicServices() {
  const ritualPanel = qs('[data-service-panel="ritual"]');
  const packagePanel = qs('[data-service-panel="packages"]');
  if (!ritualPanel || !packagePanel) return;

  services = await loadServices();
  healers = await loadHealers();
  const publicServices = services.filter((service) => service.status === "active");
  const publicHealers = healers.filter((healer) => healer.status === "active");
  renderPublicServicePanel(ritualPanel, publicServices.filter((service) => isRitualService(service)), publicHealers);
  renderPublicServicePanel(packagePanel, publicServices.filter((service) => !isRitualService(service)), publicHealers);
  window.lucide?.createIcons();
}

export async function initPublicHealers() {
  const firstCard = qs("[data-healer-card]");
  if (!firstCard) return;
  const grid = firstCard.parentElement;
  const controls = grid.querySelector("[data-healer-controls]");
  services = await loadServices();
  healers = await loadHealers();
  const publicHealers = healers.filter((healer) => healer.status === "active");
  grid.querySelectorAll("[data-healer-card]").forEach((card) => card.remove());
  grid.insertAdjacentHTML("afterbegin", publicHealers.map(renderPublicHealerCard).join(""));
  if (controls) grid.appendChild(controls);
}

export async function initHealersPage() {
  const grid = qs("#healer-grid");
  if (!grid) return;
  services = await loadServices();
  healers = await loadHealers();
  qs("[data-healer-new]")?.addEventListener("click", () => openHealerModal());
  qs("#healer-search")?.addEventListener("input", renderHealers);
  grid.addEventListener("click", handleHealerAction);
  renderHealers();
}

function renderServices() {
  const query = qs("#service-search")?.value.toLowerCase().trim() || "";
  const normalized = services.map(normalizeService);
  const filtered = normalized.filter((service) => `${service.category} ${service.name} ${service.description}`.toLowerCase().includes(query));
  const categories = new Set(normalized.map((service) => service.category)).size;
  renderList("#service-stats", [
    [t("serviceCategories"), categories, t("totalCategories"), "layers"],
    [t("services"), normalized.length, t("totalServices"), "sparkles"],
    [t("activeStatus"), normalized.filter((service) => service.status === "active").length, t("publishedServices"), "check-circle"],
    [t("inactiveStatus"), normalized.filter((service) => service.status === "inactive").length, t("hiddenServices"), "eye-off"]
  ], statCard);

  renderList("#service-rows", filtered, (service) => `
    <tr>
      <td>${service.id}</td>
      <td>${service.category}</td>
      <td class="font-semibold text-white">${service.name}</td>
      <td>${service.duration}</td>
      <td>${service.capacity}</td>
      <td>${formatIDR(Number(service.price || 0))}</td>
      <td>${service.unit}</td>
      <td>${service.photos.length} foto</td>
      <td><span class="status-pill status-${service.status === "active" ? "paid" : "cancelled"}">${statusLabel(service.status)}</span></td>
      <td>${service.description}</td>
      <td>
        <div class="flex items-center gap-2">
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-service-action="edit" data-id="${service.id}" aria-label="Edit ${service.name}" title="Edit">
            <i data-lucide="pencil" class="size-4"></i>
          </button>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-service-action="delete" data-id="${service.id}" aria-label="Hapus ${service.name}" title="Hapus">
            <i data-lucide="trash-2" class="size-4"></i>
          </button>
        </div>
      </td>
    </tr>`);
  window.lucide?.createIcons();
}

function renderHealers() {
  const query = qs("#healer-search")?.value.toLowerCase().trim() || "";
  const filtered = healers.filter((healer) => `${healer.name} ${healer.role} ${healer.specialty} ${healer.description} ${serviceNamesForHealer(healer).join(" ")}`.toLowerCase().includes(query));
  renderList("#healer-stats", [
    [t("healers"), healers.length, t("totalHealers"), "users"],
    [t("activeStatus"), healers.filter((healer) => healer.status === "active").length, t("activeHealers"), "check-circle"],
    [t("inactiveStatus"), healers.filter((healer) => healer.status === "inactive").length, t("inactiveHealers"), "eye-off"],
    [t("specialty"), new Set(healers.map((healer) => healer.specialty)).size, t("totalSpecialties"), "badge-check"]
  ], statCard);

  renderList("#healer-grid", filtered, (healer) => `
    <article class="glass-card luxury-border overflow-hidden p-4">
      <img class="h-56 w-full rounded-2xl object-cover" src="${healer.photo || FALLBACK_HEALER_PHOTO}" alt="${healer.name}" />
      <div class="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="font-display text-2xl text-white">${healer.name}</h3>
          <p class="mt-1 text-sm text-gold">${healer.role}</p>
        </div>
        <span class="status-pill status-${healer.status === "active" ? "paid" : "cancelled"}">${statusLabel(healer.status)}</span>
      </div>
      <p class="mt-3 text-sm text-white/55">${healer.specialty}</p>
      <p class="mt-2 text-sm text-gold">${serviceNamesForHealer(healer).join(", ") || "Belum pilih layanan"}</p>
      <p class="mt-3 line-clamp-2 text-sm text-white/70">${healer.description}</p>
      <div class="mt-5 flex items-center gap-2">
        <button class="ghost-button !min-h-10 !px-4" type="button" data-healer-action="edit" data-id="${healer.id}">
          <i data-lucide="pencil" class="size-4"></i>${t("edit")}
        </button>
        <button class="ghost-button !min-h-10 !px-4" type="button" data-healer-action="delete" data-id="${healer.id}">
          <i data-lucide="trash-2" class="size-4"></i>${t("delete")}
        </button>
      </div>
    </article>`);
  window.lucide?.createIcons();
}

function statCard([label, value, hint, icon]) {
  return `
    <article class="stat-card glass-card luxury-border">
      <div class="flex items-center justify-between gap-3">
        <span class="text-white/50 text-sm">${label}</span>
        <span class="grid size-10 place-items-center rounded-full bg-gold/10 text-gold"><i data-lucide="${icon}" class="size-4"></i></span>
      </div>
      <p class="mt-5 font-display text-3xl text-white">${value}</p>
      <p class="mt-2 text-sm text-white/45">${hint}</p>
    </article>`;
}

function handleServiceAction(event) {
  const button = event.target.closest("[data-service-action]");
  if (!button) return;
  const service = services.find((item) => item.id === button.dataset.id);
  if (!service) return;
  if (button.dataset.serviceAction === "edit") openServiceModal(service);
  if (button.dataset.serviceAction === "delete") {
    if (!window.confirm(`${t("deleteServiceConfirm")} ${service.name}?`)) return;
    services = services.filter((item) => item.id !== service.id);
    saveServices();
    renderServices();
    toast(t("serviceDeleted"));
  }
}

function handleHealerAction(event) {
  const button = event.target.closest("[data-healer-action]");
  if (!button) return;
  const healer = healers.find((item) => item.id === button.dataset.id);
  if (!healer) return;
  if (button.dataset.healerAction === "edit") openHealerModal(healer);
  if (button.dataset.healerAction === "delete") {
    if (!window.confirm(`${t("deleteHealerConfirm")} ${healer.name}?`)) return;
    healers = healers.filter((item) => item.id !== healer.id);
    saveHealers();
    renderHealers();
    toast(t("healerDeleted"));
  }
}

function openServiceModal(service = null) {
  const data = normalizeService({
    id: service?.id || nextId("SVC", services, 1001),
    category: SERVICE_TYPE_OPTIONS[0],
    name: "",
    durationMinutes: "",
    price: 0,
    unit: SERVICE_UNIT_OPTIONS[0],
    capacity: "",
    status: "active",
    description: "",
    photos: [],
    ...(service || {})
  });
  const isEdit = Boolean(service);
  openModal(`
    <form class="glass-card luxury-border max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6" data-catalog-form>
      ${modalHeader(isEdit ? t("editService") : t("addService"))}
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        ${inputField("id", "ID", data.id, "text", true)}
        ${selectField("category", t("serviceCategory"), data.category, SERVICE_TYPE_OPTIONS, (option) => option)}
        ${inputField("name", t("selectedService"), data.name)}
        ${inputField("durationMinutes", t("durationMinutes"), data.durationMinutes, "number", false, "1")}
        <label>${t("duration")}
          <input name="duration" type="text" value="${data.duration}" class="glass-input mt-2" readonly data-duration-preview />
        </label>
        ${inputField("price", t("price"), data.price, "number")}
        ${selectField("unit", t("unit"), data.unit, SERVICE_UNIT_OPTIONS, (option) => option)}
        ${inputField("capacity", t("capacity"), data.capacity, "number", false, "1")}
        ${selectField("status", t("status"), data.status, ["active", "inactive"])}
        <div class="md:col-span-2">
          <label>${t("photos")}
          <input name="photoFiles" type="file" accept="image/*" multiple class="sr-only" data-service-photos />
          <input name="photos" type="hidden" value="${encodeURIComponent(JSON.stringify(data.photos))}" data-service-photo-store />
          </label>
          <p class="mt-2 text-sm text-white/45">Maksimal 5 foto dari device.</p>
        </div>
        <div class="md:col-span-2 grid gap-3 sm:grid-cols-5" data-service-photo-preview data-photo-count="${data.photos.length}">
          ${renderPhotoSlots(data.photos)}
        </div>
        <label class="md:col-span-2">${t("descriptionLabel")}<textarea name="description" class="glass-input mt-2 min-h-[120px]">${data.description}</textarea></label>
      </div>
      ${modalActions()}
    </form>`);

  const form = qs("[data-catalog-form]");
  const durationInput = form?.elements.durationMinutes;
  const updateDuration = () => {
    const formatted = formatDurationMinutes(durationInput?.value);
    if (form?.elements.duration) form.elements.duration.value = formatted;
  };
  durationInput?.addEventListener("input", updateDuration);
  updateDuration();
  form?.querySelector("[data-service-photos]")?.addEventListener("change", handleServicePhotoInput);
  form?.querySelector("[data-service-photo-preview]")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-service-photo-add]")) return;
    form.querySelector("[data-service-photos]")?.click();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(event.currentTarget).entries());
    next.durationMinutes = Number(next.durationMinutes || 0);
    next.duration = formatDurationMinutes(next.durationMinutes);
    next.price = Number(next.price || 0);
    next.capacity = Number(next.capacity || 0);
    next.photos = parseStoredPhotos(next.photos);
    delete next.photoFiles;
    services = isEdit ? services.map((item) => item.id === next.id ? next : item) : [next, ...services];
    saveServices();
    closeModal();
    renderServices();
    toast(t("serviceSaved"));
  });
}

function openHealerModal(healer = null) {
  const data = normalizeHealer({ id: healer?.id || nextId("HLR", healers, 2001), name: "", role: "", specialty: "", photo: "", serviceIds: [], status: "active", description: "", ...(healer || {}) });
  const isEdit = Boolean(healer);
  const serviceOptions = services.map(normalizeService);
  openModal(`
    <form class="glass-card luxury-border max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6" data-catalog-form>
      ${modalHeader(isEdit ? t("editHealer") : t("addHealer"))}
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        ${inputField("id", "ID", data.id, "text", true)}
        ${inputField("name", t("healerName"), data.name)}
        ${inputField("role", t("healerRole"), data.role)}
        ${inputField("specialty", t("specialty"), data.specialty)}
        ${multiSelectField("serviceIds", "Jenis Layanan", data.serviceIds, serviceOptions)}
        ${selectField("status", t("status"), data.status, ["active", "inactive"])}
        <div class="md:col-span-2">
          <label>Foto Profile
            <input name="photoFile" type="file" accept="image/*" class="sr-only" data-healer-photo />
            <input name="photo" type="hidden" value="${data.photo}" data-healer-photo-store />
          </label>
          <div class="mt-3" data-healer-photo-preview>
            ${renderHealerPhotoSlot(data.photo)}
          </div>
        </div>
        <label class="md:col-span-2">${t("descriptionLabel")}<textarea name="description" class="glass-input mt-2 min-h-[120px]">${data.description}</textarea></label>
      </div>
      ${modalActions()}
    </form>`);

  const form = qs("[data-catalog-form]");
  form?.querySelector("[data-healer-photo-preview]")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-healer-photo-add]")) return;
    form.querySelector("[data-healer-photo]")?.click();
  });
  form?.querySelector("[data-healer-photo]")?.addEventListener("change", handleHealerPhotoInput);

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(event.currentTarget).entries());
    next.serviceIds = new FormData(event.currentTarget).getAll("serviceIds");
    delete next.photoFile;
    healers = isEdit ? healers.map((item) => item.id === next.id ? next : item) : [next, ...healers];
    saveHealers();
    closeModal();
    renderHealers();
    toast(t("healerSaved"));
  });
}

function openModal(content) {
  const modal = qs("#modal-root");
  if (!modal) return;
  modal.innerHTML = `<section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-catalog-close>${content}</section>`;
  modal.onclick = (event) => {
    if (event.target.closest("[data-catalog-close]") && !event.target.closest("[data-catalog-form]")) closeModal();
    if (event.target.closest("button[data-catalog-close]")) closeModal();
  };
  window.lucide?.createIcons();
}

function modalHeader(title) {
  return `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="eyebrow">${t("dataInput")}</p>
        <h2 class="font-display text-3xl mt-2">${title}</h2>
      </div>
      <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-catalog-close aria-label="${t("cancel")}">
        <i data-lucide="x" class="size-4"></i>
      </button>
    </div>`;
}

function modalActions() {
  return `
    <div class="mt-6 flex flex-wrap justify-end gap-3">
      <button class="ghost-button" type="button" data-catalog-close>${t("cancel")}</button>
      <button class="luxury-button" type="submit">${t("saveData")}</button>
    </div>`;
}

function inputField(name, label, value = "", type = "text", readOnly = false, step = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${value}" class="glass-input mt-2" ${step ? `step="${step}"` : ""} ${readOnly ? "readonly" : ""} /></label>`;
}

function selectField(name, label, value, options, labeler = statusLabel) {
  return `
    <label>${label}
      <select name="${name}" class="glass-input mt-2">
        ${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${labeler(option)}</option>`).join("")}
      </select>
    </label>`;
}

function multiSelectField(name, label, values = [], options = []) {
  const selected = new Set(values);
  return `
    <fieldset>
      <legend>${label}</legend>
      <div class="mt-2 grid max-h-44 gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
        ${options.map((option) => `
          <label class="flex cursor-pointer items-center gap-3 rounded-xl bg-white/[.04] px-3 py-2 text-sm text-white/80 hover:bg-white/[.08]">
            <input class="size-4 accent-[#d4af37]" type="checkbox" name="${name}" value="${option.id}" ${selected.has(option.id) ? "checked" : ""} />
            <span>${option.name}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>`;
}

async function loadServices() {
  const stored = localStorage.getItem(SERVICE_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored).map(normalizeService);
    } catch {
      localStorage.removeItem(SERVICE_STORAGE_KEY);
    }
  }
  const initialServices = (await api.services()).map(normalizeService);
  localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(initialServices));
  return initialServices;
}

async function loadHealers() {
  const stored = localStorage.getItem(HEALER_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored).map(normalizeHealer);
    } catch {
      localStorage.removeItem(HEALER_STORAGE_KEY);
    }
  }
  const initialHealers = (await api.healers()).map(normalizeHealer);
  localStorage.setItem(HEALER_STORAGE_KEY, JSON.stringify(initialHealers));
  return initialHealers;
}

function saveServices() {
  try {
    localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(services.map(normalizeService)));
  } catch (error) {
    console.error("[services] unable to store services", error);
    toast("Data layanan tersimpan di sesi ini, tetapi foto terlalu besar untuk cache browser.");
  }
}

function saveHealers() {
  try {
    localStorage.setItem(HEALER_STORAGE_KEY, JSON.stringify(healers.map(normalizeHealer)));
  } catch (error) {
    console.error("[healers] unable to store healers", error);
    toast("Data healer tersimpan di sesi ini, tetapi foto terlalu besar untuk cache browser.");
  }
}

function normalizeService(service) {
  const durationMinutes = Number(service.durationMinutes || durationToMinutes(service.duration) || 0);
  const photos = Array.isArray(service.photos) ? service.photos.slice(0, 5) : service.photo ? [service.photo] : [];
  return {
    ...service,
    category: normalizeServiceCategory(service.category),
    name: service.name || "",
    durationMinutes,
    duration: formatDurationMinutes(durationMinutes) || service.duration || "",
    unit: service.unit || SERVICE_UNIT_OPTIONS[0],
    capacity: normalizeCapacity(service.capacity),
    photos,
    status: service.status || "active",
    description: service.description || ""
  };
}

function normalizeHealer(healer) {
  return {
    ...healer,
    photo: healer.photo || "",
    serviceIds: normalizeHealerServiceIds(healer)
  };
}

function normalizeHealerServiceIds(healer) {
  if (Array.isArray(healer.serviceIds)) return healer.serviceIds;
  const specialty = String(healer.specialty || "").toLowerCase();
  return services
    .map(normalizeService)
    .filter((service) => specialty && `${service.name} ${service.category}`.toLowerCase().includes(specialty))
    .map((service) => service.id);
}

function normalizeServiceCategory(category = "") {
  const upper = category.toUpperCase();
  if (upper.includes("HEALING")) return "HEALING PACKAGES";
  return "RITUAL SERVICE";
}

function formatDurationMinutes(value) {
  const minutes = Number(value || 0);
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`;
}

function durationToMinutes(duration = "") {
  const lower = String(duration).toLowerCase();
  const hourMatch = lower.match(/(\d+)\s*(h|hr|hour|hours|jam)/);
  const minuteMatch = lower.match(/(\d+)\s*(m|min|minute|minutes|menit)/);
  const dayMatch = lower.match(/(\d+)\s*(day|days|hari)/);
  if (dayMatch) return Number(dayMatch[1]) * 24 * 60;
  return (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minuteMatch ? Number(minuteMatch[1]) : 0);
}

function parseStoredPhotos(value) {
  try {
    return JSON.parse(decodeURIComponent(value || "[]")).slice(0, 5);
  } catch {
    return [];
  }
}

function renderPhotoSlots(photos = []) {
  const currentPhotos = photos.slice(0, 5);
  const photoItems = currentPhotos.map((photo, index) => `
    <figure class="relative h-24 overflow-hidden rounded-xl border border-white/10 bg-white/[.04]">
      <img class="h-full w-full object-cover" src="${photo}" alt="Foto layanan ${index + 1}" />
      <figcaption class="absolute bottom-1 right-1 rounded-full bg-black/65 px-2 py-1 text-xs text-white/80">${index + 1}</figcaption>
    </figure>
  `).join("");

  const addSlot = currentPhotos.length < 5 ? `
    <button class="grid h-24 place-items-center rounded-xl border border-dashed border-gold/45 bg-white/[.025] text-gold hover:border-gold hover:bg-gold/10" type="button" data-service-photo-add aria-label="Tambah foto layanan">
      <i data-lucide="plus" class="size-7"></i>
    </button>
  ` : "";

  return photoItems + addSlot;
}

function handleServicePhotoInput(event) {
  const form = event.target.closest("[data-catalog-form]");
  const store = form?.querySelector("[data-service-photo-store]");
  const preview = form?.querySelector("[data-service-photo-preview]");
  const existingPhotos = parseStoredPhotos(store?.value);
  const availableSlots = Math.max(0, 5 - existingPhotos.length);
  const files = [...event.target.files].slice(0, availableSlots);
  if (event.target.files.length > availableSlots) toast("Maksimal 5 foto.");

  Promise.all(files.map(readFileAsDataUrl)).then((photos) => {
    const nextPhotos = [...existingPhotos, ...photos].slice(0, 5);
    if (store) store.value = encodeURIComponent(JSON.stringify(nextPhotos));
    if (preview) preview.innerHTML = renderPhotoSlots(nextPhotos);
    event.target.value = "";
    window.lucide?.createIcons();
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderHealerPhotoSlot(photo = "") {
  if (photo) {
    return `
      <button class="relative h-40 w-40 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]" type="button" data-healer-photo-add aria-label="Ganti foto profile">
        <img class="h-full w-full object-cover" src="${photo}" alt="Foto profile healer" />
        <span class="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-sm text-white">Ganti Foto</span>
      </button>`;
  }
  return `
    <button class="grid h-40 w-40 place-items-center rounded-2xl border border-dashed border-gold/45 bg-white/[.025] text-gold hover:border-gold hover:bg-gold/10" type="button" data-healer-photo-add aria-label="Tambah foto profile">
      <i data-lucide="plus" class="size-8"></i>
    </button>`;
}

function renderPublicHealerCard(healer) {
  const serviceNames = serviceNamesForHealer(healer);
  return `
    <article class="healer-card reveal" data-healer-card>
      <img src="${healer.photo || FALLBACK_HEALER_PHOTO}" alt="${healer.name}" data-healer-photo data-full-src="${healer.photo || FALLBACK_HEALER_PHOTO}" />
      <div>
        <h3>${healer.name}</h3>
        <p>${healer.description}</p>
        <p class="mt-3 text-gold">${serviceNames.join(", ") || healer.specialty}</p>
      </div>
    </article>`;
}

function handleHealerPhotoInput(event) {
  const file = event.target.files?.[0];
  const form = event.target.closest("[data-catalog-form]");
  const store = form?.querySelector("[data-healer-photo-store]");
  const preview = form?.querySelector("[data-healer-photo-preview]");
  if (!file) return;
  readFileAsDataUrl(file).then((photo) => {
    if (store) store.value = photo;
    if (preview) preview.innerHTML = renderHealerPhotoSlot(photo);
    event.target.value = "";
  });
}

function renderPublicServicePanel(panel, panelServices, panelHealers = []) {
  const controls = panel.querySelector("[data-service-controls], [data-ritual-controls]");
  panel.querySelectorAll("[data-service-card], [data-ritual-card]").forEach((card) => card.remove());
  panel.insertAdjacentHTML("afterbegin", panelServices.map((service) => renderPublicServiceCard(service, panelHealers)).join(""));
  if (controls) panel.appendChild(controls);
}

function renderPublicServiceCard(service, panelHealers = []) {
  const photos = service.photos.length ? service.photos : [FALLBACK_SERVICE_PHOTO];
  const galleryPhotos = photos.join("|");
  const cardAttr = isRitualService(service) ? "data-ritual-card" : "data-service-card";
  const assignedHealers = panelHealers.filter((healer) => healer.serviceIds.includes(service.id));
  const healerNames = assignedHealers.length ? assignedHealers.map((healer) => healer.name) : ["Beji Healing Team"];
  return `
    <article class="ritual-service-card reveal" ${cardAttr}>
      <div class="ritual-card-head">
        <h3>${service.name}</h3>
        <div class="ritual-card-action">
          <p class="ritual-price">${formatIDR(Number(service.price || 0))} ${service.unit}</p>
          <a class="ritual-book" href="#/booking" data-route="booking">Book Now</a>
        </div>
      </div>
      <div class="ritual-meta">
        <span class="meta-type">${service.category}</span><span class="meta-time">${service.duration}</span><span class="meta-guest">${service.capacity} tamu</span><span class="meta-location">Beji Healing</span>
      </div>
      <div class="ritual-photo">
        <img src="${photos[0]}" alt="${service.name}" />
        <button type="button" data-gallery-title="${service.name}" data-gallery-photos="${galleryPhotos}">View all photos</button>
      </div>
      <div class="ritual-tabs"><button class="is-active" type="button" data-ritual-tab="about">About Service</button><button type="button" data-ritual-tab="healers">Healers</button></div>
      <div class="ritual-tab-panel" data-ritual-panel="about">
        <p class="ritual-desc">${service.description}</p>
      </div>
      <div class="ritual-tab-panel hidden" data-ritual-panel="healers">
        <div class="ritual-healers">${healerNames.map((name) => `<span>${name}</span>`).join("")}</div>
      </div>
    </article>`;
}

function isRitualService(service) {
  return normalizeServiceCategory(service.category) === "RITUAL SERVICE";
}

function normalizeCapacity(capacity = 0) {
  if (typeof capacity === "number") return capacity;
  const matches = String(capacity).match(/\d+/g);
  if (!matches?.length) return 0;
  return Number(matches.at(-1));
}

function serviceNamesForHealer(healer) {
  const selected = new Set(healer.serviceIds || []);
  return services
    .map(normalizeService)
    .filter((service) => selected.has(service.id))
    .map((service) => service.name);
}

function nextId(prefix, items, start) {
  const nextNumber = start + items.length;
  return `${prefix}-${nextNumber}`;
}

function closeModal() {
  const modal = qs("#modal-root");
  if (modal) modal.innerHTML = "";
}
