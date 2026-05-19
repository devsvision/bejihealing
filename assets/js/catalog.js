import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { toast } from "./helper.js";
import { statusLabel, t } from "./i18n.js";

let services = [];
let healers = [];

export async function initServicesPage() {
  const rows = qs("#service-rows");
  if (!rows) return;
  services = await api.services();
  qs("[data-service-new]")?.addEventListener("click", () => openServiceModal());
  qs("#service-search")?.addEventListener("input", renderServices);
  rows.addEventListener("click", handleServiceAction);
  renderServices();
}

export async function initHealersPage() {
  const grid = qs("#healer-grid");
  if (!grid) return;
  healers = await api.healers();
  qs("[data-healer-new]")?.addEventListener("click", () => openHealerModal());
  qs("#healer-search")?.addEventListener("input", renderHealers);
  grid.addEventListener("click", handleHealerAction);
  renderHealers();
}

function renderServices() {
  const query = qs("#service-search")?.value.toLowerCase().trim() || "";
  const filtered = services.filter((service) => `${service.category} ${service.name} ${service.description}`.toLowerCase().includes(query));
  const categories = new Set(services.map((service) => service.category)).size;
  renderList("#service-stats", [
    [t("serviceCategories"), categories, t("totalCategories"), "layers"],
    [t("services"), services.length, t("totalServices"), "sparkles"],
    [t("activeStatus"), services.filter((service) => service.status === "active").length, t("publishedServices"), "check-circle"],
    [t("inactiveStatus"), services.filter((service) => service.status === "inactive").length, t("hiddenServices"), "eye-off"]
  ], statCard);

  renderList("#service-rows", filtered, (service) => `
    <tr>
      <td>${service.id}</td>
      <td>${service.category}</td>
      <td class="font-semibold text-white">${service.name}</td>
      <td>${service.duration}</td>
      <td>${service.capacity}</td>
      <td>${formatIDR(Number(service.price || 0))}</td>
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
  const filtered = healers.filter((healer) => `${healer.name} ${healer.role} ${healer.specialty} ${healer.description}`.toLowerCase().includes(query));
  renderList("#healer-stats", [
    [t("healers"), healers.length, t("totalHealers"), "users"],
    [t("activeStatus"), healers.filter((healer) => healer.status === "active").length, t("activeHealers"), "check-circle"],
    [t("inactiveStatus"), healers.filter((healer) => healer.status === "inactive").length, t("inactiveHealers"), "eye-off"],
    [t("specialty"), new Set(healers.map((healer) => healer.specialty)).size, t("totalSpecialties"), "badge-check"]
  ], statCard);

  renderList("#healer-grid", filtered, (healer) => `
    <article class="glass-card luxury-border overflow-hidden p-4">
      <img class="h-56 w-full rounded-2xl object-cover" src="${healer.photo}" alt="${healer.name}" />
      <div class="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="font-display text-2xl text-white">${healer.name}</h3>
          <p class="mt-1 text-sm text-gold">${healer.role}</p>
        </div>
        <span class="status-pill status-${healer.status === "active" ? "paid" : "cancelled"}">${statusLabel(healer.status)}</span>
      </div>
      <p class="mt-3 text-sm text-white/55">${healer.specialty}</p>
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
    renderHealers();
    toast(t("healerDeleted"));
  }
}

function openServiceModal(service = null) {
  const data = { id: service?.id || nextId("SVC", services, 1001), category: "", name: "", duration: "", price: 0, capacity: "", status: "active", description: "", ...(service || {}) };
  const isEdit = Boolean(service);
  openModal(`
    <form class="glass-card luxury-border max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6" data-catalog-form>
      ${modalHeader(isEdit ? t("editService") : t("addService"))}
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        ${inputField("id", "ID", data.id, "text", true)}
        ${inputField("category", t("serviceCategory"), data.category)}
        ${inputField("name", t("selectedService"), data.name)}
        ${inputField("duration", t("duration"), data.duration)}
        ${inputField("price", t("price"), data.price, "number")}
        ${inputField("capacity", t("capacity"), data.capacity)}
        ${selectField("status", t("status"), data.status, ["active", "inactive"])}
        <label class="md:col-span-2">${t("descriptionLabel")}<textarea name="description" class="glass-input mt-2 min-h-[120px]">${data.description}</textarea></label>
      </div>
      ${modalActions()}
    </form>`);

  qs("[data-catalog-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(event.currentTarget).entries());
    next.price = Number(next.price || 0);
    services = isEdit ? services.map((item) => item.id === next.id ? next : item) : [next, ...services];
    closeModal();
    renderServices();
    toast(t("serviceSaved"));
  });
}

function openHealerModal(healer = null) {
  const data = { id: healer?.id || nextId("HLR", healers, 2001), name: "", role: "", specialty: "", photo: "", status: "active", description: "", ...(healer || {}) };
  const isEdit = Boolean(healer);
  openModal(`
    <form class="glass-card luxury-border max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6" data-catalog-form>
      ${modalHeader(isEdit ? t("editHealer") : t("addHealer"))}
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        ${inputField("id", "ID", data.id, "text", true)}
        ${inputField("name", t("healerName"), data.name)}
        ${inputField("role", t("healerRole"), data.role)}
        ${inputField("specialty", t("specialty"), data.specialty)}
        ${inputField("photo", t("photoUrl"), data.photo, "url")}
        ${selectField("status", t("status"), data.status, ["active", "inactive"])}
        <label class="md:col-span-2">${t("descriptionLabel")}<textarea name="description" class="glass-input mt-2 min-h-[120px]">${data.description}</textarea></label>
      </div>
      ${data.photo ? `<img class="mt-5 h-72 w-full rounded-2xl object-cover" src="${data.photo}" alt="${data.name}" />` : ""}
      ${modalActions()}
    </form>`);

  qs("[data-catalog-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(event.currentTarget).entries());
    healers = isEdit ? healers.map((item) => item.id === next.id ? next : item) : [next, ...healers];
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

function inputField(name, label, value = "", type = "text", readOnly = false) {
  return `<label>${label}<input name="${name}" type="${type}" value="${value}" class="glass-input mt-2" ${readOnly ? "readonly" : ""} /></label>`;
}

function selectField(name, label, value, options) {
  return `
    <label>${label}
      <select name="${name}" class="glass-input mt-2">
        ${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${statusLabel(option)}</option>`).join("")}
      </select>
    </label>`;
}

function nextId(prefix, items, start) {
  const nextNumber = start + items.length;
  return `${prefix}-${nextNumber}`;
}

function closeModal() {
  const modal = qs("#modal-root");
  if (modal) modal.innerHTML = "";
}
