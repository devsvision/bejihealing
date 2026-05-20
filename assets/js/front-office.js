import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { toast } from "./helper.js";
import { statusLabel, t } from "./i18n.js";

let walkIns = [];
const WALKIN_STORAGE_KEY = "beji-front-office-walkins";

const emptyGuest = {
  id: "",
  guest: "",
  phone: "",
  email: "",
  country: "",
  serviceCategory: "Ritual Services",
  serviceType: "",
  healer: "",
  visitDate: "",
  visitTime: "",
  guests: 1,
  source: "Walk In",
  priority: "normal",
  status: "waiting",
  paymentStatus: "unpaid",
  amount: 0,
  assignedRoom: "",
  notes: ""
};

export async function initFrontOfficePage() {
  const rows = qs("#front-office-rows");
  if (!rows) return;

  walkIns = loadWalkIns(await api.walkIns());
  bindFrontOfficeEvents();
  renderFrontOffice();
}

function bindFrontOfficeEvents() {
  const rows = qs("#front-office-rows");
  if (rows?.dataset.bound === "true") return;
  if (rows) rows.dataset.bound = "true";
  qs("[data-front-office-new]")?.addEventListener("click", () => openGuestModal());
  qs("#front-office-search")?.addEventListener("input", renderFrontOffice);
  qs("#front-office-status")?.addEventListener("change", renderFrontOffice);
  qs("#front-office-payment")?.addEventListener("change", renderFrontOffice);
  rows?.addEventListener("click", handleTableAction);
  rows?.addEventListener("change", handleTableAction);
}

function renderFrontOffice() {
  const filtered = getFilteredGuests();
  renderStats();
  qs("#front-office-total").textContent = `${filtered.length} tamu`;

  renderList("#front-office-rows", filtered, (guest) => `
    <tr>
      <td>${guest.id}</td>
      <td>
        <p class="font-semibold text-white">${guest.guest}</p>
        <p class="text-xs text-white/45">${guest.phone}</p>
        <p class="text-xs text-white/45">${guest.email}</p>
        <p class="text-xs text-white/45">${guest.country}</p>
      </td>
      <td>
        <p class="font-semibold text-white">${guest.serviceType}</p>
        <p class="text-xs text-white/45">${guest.serviceCategory}</p>
        <p class="text-xs text-white/45">${guest.guests} ${t("guest").toLowerCase()} - ${guest.source}</p>
      </td>
      <td>
        <p>${guest.healer}</p>
        <p class="text-xs text-white/45">${guest.assignedRoom}</p>
      </td>
      <td>
        <p>${guest.visitDate}</p>
        <p class="text-xs text-white/45">${guest.visitTime}</p>
      </td>
      <td>
        <select class="glass-input !py-2" data-front-office-status-update data-id="${guest.id}">
          ${["waiting", "confirmed", "in-progress", "completed", "cancelled"].map((status) => `<option value="${status}" ${guest.status === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
        </select>
      </td>
      <td>
        <p>${formatIDR(Number(guest.amount || 0))}</p>
        <span class="status-pill status-${guest.paymentStatus === "paid" ? "paid" : guest.paymentStatus === "deposit" ? "pending" : "cancelled"}">${statusLabel(guest.paymentStatus)}</span>
      </td>
      <td>${guest.notes}</td>
      <td>
        <div class="flex items-center gap-2">
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-front-office-action="view" data-id="${guest.id}" aria-label="Detail ${guest.guest}" title="Detail">
            <i data-lucide="eye" class="size-4"></i>
          </button>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-front-office-action="edit" data-id="${guest.id}" aria-label="Edit ${guest.guest}" title="Edit">
            <i data-lucide="pencil" class="size-4"></i>
          </button>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-front-office-action="print" data-id="${guest.id}" aria-label="Print ${guest.id}" title="Print">
            <i data-lucide="printer" class="size-4"></i>
          </button>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-front-office-action="delete" data-id="${guest.id}" aria-label="Hapus ${guest.guest}" title="Hapus">
            <i data-lucide="trash-2" class="size-4"></i>
          </button>
        </div>
      </td>
    </tr>`);

  window.lucide?.createIcons();
}

function renderStats() {
  const stats = [
    [t("totalWalkIn"), walkIns.length, t("allGuests"), "users"],
    [t("waiting"), countBy("status", "waiting"), t("needsProcessing"), "clock"],
    [t("inService"), countBy("status", "in-progress"), t("beingHandled"), "activity"],
    [t("paid"), countBy("paymentStatus", "paid"), t("paymentSettled"), "wallet"]
  ];

  renderList("#front-office-stats", stats, ([label, value, hint, icon]) => `
    <article class="stat-card glass-card luxury-border">
      <div class="flex items-center justify-between gap-3">
        <span class="text-white/50 text-sm">${label}</span>
        <span class="grid size-10 place-items-center rounded-full bg-gold/10 text-gold"><i data-lucide="${icon}" class="size-4"></i></span>
      </div>
      <p class="mt-5 font-display text-3xl text-white">${value}</p>
      <p class="mt-2 text-sm text-white/45">${hint}</p>
    </article>`);
}

function getFilteredGuests() {
  const search = qs("#front-office-search")?.value.toLowerCase().trim() || "";
  const status = qs("#front-office-status")?.value || "all";
  const payment = qs("#front-office-payment")?.value || "all";

  return walkIns.filter((guest) => {
    const haystack = `${guest.guest} ${guest.phone} ${guest.email} ${guest.serviceType} ${guest.healer}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = status === "all" || guest.status === status;
    const matchesPayment = payment === "all" || guest.paymentStatus === payment;
    return matchesSearch && matchesStatus && matchesPayment;
  });
}

function handleTableAction(event) {
  const statusSelect = event.target.closest("[data-front-office-status-update]");
  if (statusSelect) {
    const guest = findGuest(statusSelect.dataset.id);
    if (guest) guest.status = statusSelect.value;
    saveWalkIns();
    renderFrontOffice();
    toast(t("frontOfficeUpdated"));
    return;
  }

  const button = event.target.closest("[data-front-office-action]");
  if (!button) return;
  const guest = findGuest(button.dataset.id);
  if (!guest) return;

  if (button.dataset.frontOfficeAction === "view") openGuestDetail(guest);
  if (button.dataset.frontOfficeAction === "edit") openGuestModal(guest);
  if (button.dataset.frontOfficeAction === "print") printGuest(guest);
  if (button.dataset.frontOfficeAction === "delete") deleteGuest(guest.id);
}

function openGuestModal(guest = null) {
  const isEdit = Boolean(guest);
  const data = { ...emptyGuest, ...(guest || {}), id: guest?.id || nextGuestId() };
  const modal = qs("#modal-root");
  if (!modal) return;

  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-front-office-close>
      <form class="glass-card luxury-border max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6" data-front-office-form>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">${isEdit ? t("editWalkIn") : t("newWalkIn")}</p>
            <h2 class="font-display text-3xl mt-2">${isEdit ? data.guest : t("addWalkInGuest")}</h2>
          </div>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-front-office-close aria-label="Tutup">
            <i data-lucide="x" class="size-4"></i>
          </button>
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${inputField("id", "ID", data.id, "text", true)}
          ${inputField("guest", t("guestName"), data.guest)}
          ${inputField("phone", t("phone"), data.phone)}
          ${inputField("email", t("email"), data.email, "email")}
          ${inputField("country", t("country"), data.country)}
          ${selectField("serviceCategory", t("serviceCategory"), data.serviceCategory, ["Ritual Services", "Healing Packages", "Consultation", "Wellness Add-on"])}
          ${inputField("serviceType", t("selectedService"), data.serviceType)}
          ${inputField("healer", t("healerName"), data.healer)}
          ${inputField("visitDate", t("date"), data.visitDate, "date")}
          ${inputField("visitTime", t("sessionTime"), data.visitTime, "time")}
          ${inputField("guests", t("participants"), data.guests, "number")}
          ${selectField("source", t("source"), data.source, ["Walk In", "Hotel Referral", "WhatsApp Admin", "Partner Concierge", "Email"])}
          ${selectField("priority", t("priority"), data.priority, ["normal", "high", "vip"], statusLabel)}
          ${selectField("status", t("status"), data.status, ["waiting", "confirmed", "in-progress", "completed", "cancelled"], statusLabel)}
          ${selectField("paymentStatus", t("paymentStatus"), data.paymentStatus, ["unpaid", "deposit", "paid"], statusLabel)}
          ${inputField("amount", t("total"), data.amount, "number")}
          ${inputField("assignedRoom", t("roomArea"), data.assignedRoom)}
          <label class="md:col-span-2">${t("notes")}<textarea name="notes" class="glass-input mt-2 min-h-[110px]">${data.notes}</textarea></label>
        </div>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button class="ghost-button" type="button" data-front-office-close>${t("cancel")}</button>
          <button class="luxury-button" type="submit">${t("saveData")}</button>
        </div>
      </form>
    </section>`;

  window.lucide?.createIcons();
  modal.onclick = (event) => {
    if (event.target.closest("[data-front-office-close]") && !event.target.closest("[data-front-office-form]")) closeModal();
    if (event.target.closest("button[data-front-office-close]")) closeModal();
  };
  qs("[data-front-office-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveGuest(new FormData(event.currentTarget), isEdit);
  });
}

function openGuestDetail(guest) {
  const modal = qs("#modal-root");
  if (!modal) return;
  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-front-office-close>
      <article class="glass-card luxury-border max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6" data-front-office-detail>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">${t("walkInDetail")}</p>
            <h2 class="font-display text-3xl mt-2">${guest.guest}</h2>
            <p class="mt-2 text-white/55">${guest.id} - ${guest.serviceType}</p>
          </div>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-front-office-close aria-label="Tutup">
            <i data-lucide="x" class="size-4"></i>
          </button>
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${detailItem(t("phone"), guest.phone)}
          ${detailItem(t("email"), guest.email)}
          ${detailItem(t("country"), guest.country)}
          ${detailItem(t("serviceCategory"), guest.serviceCategory)}
          ${detailItem(t("selectedService"), guest.serviceType)}
          ${detailItem(t("healer"), guest.healer)}
          ${detailItem(t("schedule"), `${guest.visitDate} ${guest.visitTime}`)}
          ${detailItem(t("participants"), `${guest.guests} ${t("people")}`)}
          ${detailItem(t("source"), guest.source)}
          ${detailItem(t("priority"), statusLabel(guest.priority))}
          ${detailItem(t("status"), statusLabel(guest.status))}
          ${detailItem(t("payment"), `${statusLabel(guest.paymentStatus)} - ${formatIDR(Number(guest.amount || 0))}`)}
          ${detailItem(t("roomArea"), guest.assignedRoom)}
          ${detailItem(t("notes"), guest.notes)}
        </div>
      </article>
    </section>`;
  window.lucide?.createIcons();
  modal.onclick = (event) => {
    if (event.target.closest("[data-front-office-close]") && !event.target.closest("[data-front-office-detail]")) closeModal();
    if (event.target.closest("button[data-front-office-close]")) closeModal();
  };
}

function saveGuest(formData, isEdit) {
  const guest = Object.fromEntries(formData.entries());
  guest.guests = Number(guest.guests || 1);
  guest.amount = Number(guest.amount || 0);

  if (isEdit) {
    walkIns = walkIns.map((item) => item.id === guest.id ? guest : item);
  } else {
    walkIns = [guest, ...walkIns];
  }

  saveWalkIns();
  closeModal();
  renderFrontOffice();
  toast(t("frontOfficeSaved"));
}

function deleteGuest(id) {
  const guest = findGuest(id);
  if (!guest) return;
  const confirmed = window.confirm(`${t("deleteWalkInConfirm")} ${guest.guest}?`);
  if (!confirmed) return;
  walkIns = walkIns.filter((item) => item.id !== id);
  saveWalkIns();
  renderFrontOffice();
  toast(t("frontOfficeDeleted"));
}

function printGuest(guest) {
  const printWindow = window.open("", "_blank", "width=760,height=900");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Front Office ${guest.id}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; padding: 32px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          .muted { color: #555; margin-bottom: 28px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; }
          th { width: 34%; background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>${t("walkInSlip")}</h1>
        <p class="muted">${guest.id} - ${guest.guest}</p>
        <table>
          ${Object.entries({
            [t("guestName")]: guest.guest,
            [t("phone")]: guest.phone,
            [t("email")]: guest.email,
            [t("country")]: guest.country,
            [t("serviceCategory")]: guest.serviceCategory,
            [t("selectedService")]: guest.serviceType,
            [t("healer")]: guest.healer,
            [t("date")]: guest.visitDate,
            [t("sessionTime")]: guest.visitTime,
            [t("participants")]: `${guest.guests} ${t("people")}`,
            [t("source")]: guest.source,
            [t("priority")]: statusLabel(guest.priority),
            [t("status")]: statusLabel(guest.status),
            [t("paymentStatus")]: statusLabel(guest.paymentStatus),
            [t("total")]: formatIDR(Number(guest.amount || 0)),
            [t("roomArea")]: guest.assignedRoom,
            [t("notes")]: guest.notes
          }).map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join("")}
        </table>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
    </html>`);
  printWindow.document.close();
}

function inputField(name, label, value = "", type = "text", readOnly = false) {
  return `<label>${label}<input name="${name}" type="${type}" value="${value}" class="glass-input mt-2" ${readOnly ? "readonly" : ""} /></label>`;
}

function selectField(name, label, value, options, formatter = (option) => option) {
  return `
    <label>${label}
      <select name="${name}" class="glass-input mt-2">
        ${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${formatter(option)}</option>`).join("")}
      </select>
    </label>`;
}

function detailItem(label, value) {
  return `
    <div class="rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <p class="text-xs uppercase tracking-[.18em] text-white/40">${label}</p>
      <div class="mt-2 text-white">${value}</div>
    </div>`;
}

function countBy(key, value) {
  return walkIns.filter((guest) => guest[key] === value).length;
}

function findGuest(id) {
  return walkIns.find((guest) => guest.id === id);
}

function nextGuestId() {
  const lastNumber = walkIns
    .map((guest) => Number(String(guest.id || "").replace(/\D/g, "")))
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || 2400;
  const nextNumber = lastNumber + 1;
  return `WI-${nextNumber}`;
}

function closeModal() {
  const modal = qs("#modal-root");
  if (modal) modal.innerHTML = "";
}

function loadWalkIns(defaultWalkIns) {
  try {
    const stored = JSON.parse(localStorage.getItem(WALKIN_STORAGE_KEY) || "null");
    return Array.isArray(stored) ? stored : defaultWalkIns;
  } catch {
    return defaultWalkIns;
  }
}

function saveWalkIns() {
  localStorage.setItem(WALKIN_STORAGE_KEY, JSON.stringify(walkIns));
}
