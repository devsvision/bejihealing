import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { todayISO, toast } from "./helper.js";
import { statusLabel, t } from "./i18n.js";
import { appState } from "./state.js";

const programs = [
  { id: "forest-reset", name: "Forest Reset Immersion", price: 4200000, duration: "3 days" },
  { id: "moon-bath", name: "Moon Bath Ceremony", price: 1850000, duration: "1 night" },
  { id: "golden-silence", name: "Golden Silence Retreat", price: 7600000, duration: "5 days" }
];

export async function initBookingPage() {
  const form = qs("#booking-form");
  if (!form) return;
  qs("#booking-date").min = todayISO();
  renderProgramOptions();
  updateBookingSummary();

  form.addEventListener("input", () => {
    appState.bookingDraft = Object.fromEntries(new FormData(form).entries());
    appState.bookingDraft.guests = Number(appState.bookingDraft.guests || 1);
    updateBookingSummary(false);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const total = calculateTotal();
    qs("#checkout-button").dataset.amount = total;
    qs("#checkout-button").dataset.provider = appState.bookingDraft.provider;
    qs("#checkout-button").click();
  });

  const bookings = await api.bookings();
  renderList("#booking-history", bookings.slice(0, 4), (booking) => `
    <article class="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <div>
        <p class="font-semibold">${booking.guest}</p>
        <p class="text-sm text-white/50">${booking.program} - ${booking.date}</p>
      </div>
      <span class="status-pill status-${booking.status}">${statusLabel(booking.status)}</span>
    </article>`);
}

export async function initDashboardBookingPage() {
  const rows = qs("#booking-status-rows");
  const summary = qs("#booking-status-summary");
  if (!rows || !summary) return;

  const bookings = await api.bookings();
  const statuses = ["paid", "confirmed", "pending", "completed", "cancelled"];
  qs("#booking-total-label").textContent = `${bookings.length} ${t("booking")}`;

  renderList(summary, statuses, (status) => {
    const count = bookings.filter((booking) => booking.status === status).length;
    return `
      <article class="stat-card glass-card luxury-border">
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-white/50">${statusLabel(status)}</span>
          <span class="status-pill status-${status}">${count}</span>
        </div>
        <p class="mt-5 font-display text-3xl text-white">${count}</p>
        <p class="mt-2 text-sm text-white/45">${t("total")} ${t("booking")} ${statusLabel(status)}</p>
      </article>`;
  });

  renderList(rows, bookings, (booking) => `
    <tr>
      <td>${booking.id}</td>
      <td>
        <p class="font-semibold text-white">${booking.guest}</p>
        <p class="text-xs text-white/45">${booking.email}</p>
        <p class="text-xs text-white/45">${booking.phone}</p>
        <p class="text-xs text-white/45">${booking.country}</p>
      </td>
      <td>
        <p class="font-semibold text-white">${booking.program}</p>
        <p class="text-xs text-white/45">${booking.serviceCategory}</p>
        <p class="text-xs text-white/45">${booking.serviceType}</p>
      </td>
      <td>
        <p class="font-semibold text-white">${booking.healer}</p>
        <p class="text-xs text-white/45">${booking.healerRole}</p>
      </td>
      <td>
        <p>${booking.date}</p>
        <p class="text-xs text-white/45">${booking.sessionTime} - ${booking.duration}</p>
        <p class="text-xs text-white/45">${t("created")} ${booking.createdAt}</p>
      </td>
      <td>${booking.guests} ${t("people")}</td>
      <td>
        <p>${booking.paymentProvider}</p>
        <p class="text-xs text-white/45">${booking.paymentStatus}</p>
      </td>
      <td>${formatIDR(booking.amount)}</td>
      <td><span class="status-pill status-${booking.status}">${statusLabel(booking.status)}</span></td>
      <td>${booking.notes}</td>
      <td>
        <div class="flex items-center gap-2">
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-booking-action="view" data-booking-id="${booking.id}" aria-label="Buka detail ${booking.guest}" title="Detail pelanggan">
            <i data-lucide="eye" class="size-4"></i>
          </button>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-booking-action="print" data-booking-id="${booking.id}" aria-label="Print booking ${booking.id}" title="Print booking">
            <i data-lucide="printer" class="size-4"></i>
          </button>
        </div>
      </td>
    </tr>`);

  window.lucide?.createIcons();
  rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-booking-action]");
    if (!button) return;
    const booking = bookings.find((item) => item.id === button.dataset.bookingId);
    if (!booking) return;

    if (button.dataset.bookingAction === "view") openBookingDetailModal(booking);
    if (button.dataset.bookingAction === "print") printBooking(booking);
  });
}

function openBookingDetailModal(booking) {
  const modal = qs("#modal-root");
  if (!modal) return;
  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-booking-modal-close>
      <article class="glass-card luxury-border max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6" data-booking-modal>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">${t("customerDetail")}</p>
            <h2 class="font-display text-3xl mt-2">${booking.guest}</h2>
            <p class="mt-2 text-white/55">${booking.id} - ${booking.program} - ${booking.serviceCategory}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-booking-action="print-modal" aria-label="Print booking" title="Print booking">
              <i data-lucide="printer" class="size-4"></i>
            </button>
            <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-booking-modal-close aria-label="Tutup detail" title="Tutup">
              <i data-lucide="x" class="size-4"></i>
            </button>
          </div>
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${renderDetailItem(t("email"), booking.email)}
          ${renderDetailItem(t("phone"), booking.phone)}
          ${renderDetailItem(t("country"), booking.country)}
          ${renderDetailItem(t("bookingChannel"), booking.bookingChannel)}
          ${renderDetailItem(t("serviceCategory"), booking.serviceCategory)}
          ${renderDetailItem(t("selectedService"), booking.serviceType)}
          ${renderDetailItem(t("healerName"), booking.healer)}
          ${renderDetailItem(t("healerRole"), booking.healerRole)}
          ${renderDetailItem(t("bookingDate"), booking.date)}
          ${renderDetailItem(t("sessionTime"), booking.sessionTime)}
          ${renderDetailItem(t("createdDate"), booking.createdAt)}
          ${renderDetailItem(t("duration"), booking.duration)}
          ${renderDetailItem(t("location"), booking.location)}
          ${renderDetailItem(t("language"), booking.language)}
          ${renderDetailItem(t("pickup"), booking.pickup)}
          ${renderDetailItem(t("participants"), `${booking.guests} ${t("people")}`)}
          ${renderDetailItem(t("bookingStatus"), `<span class="status-pill status-${booking.status}">${statusLabel(booking.status)}</span>`)}
          ${renderDetailItem(t("paymentProvider"), booking.paymentProvider)}
          ${renderDetailItem(t("paymentStatus"), booking.paymentStatus)}
          ${renderDetailItem(t("totalPayment"), formatIDR(booking.amount))}
          ${renderDetailItem(t("notes"), booking.notes)}
        </div>
      </article>
    </section>`;

  window.lucide?.createIcons();
  modal.onclick = (event) => {
    if (event.target.closest("[data-booking-action='print-modal']")) printBooking(booking);
    if (event.target.closest("[data-booking-modal-close]") && !event.target.closest("[data-booking-modal]")) modal.innerHTML = "";
    if (event.target.closest("button[data-booking-modal-close]")) modal.innerHTML = "";
  };
}

function renderDetailItem(label, value) {
  return `
    <div class="rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <p class="text-xs uppercase tracking-[.18em] text-white/40">${label}</p>
      <div class="mt-2 text-white">${value}</div>
    </div>`;
}

function printBooking(booking) {
  const printWindow = window.open("", "_blank", "width=760,height=900");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${t("printBookingTitle")} ${booking.id}</title>
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
        <h1>${t("printBookingTitle")}</h1>
        <p class="muted">${booking.id} - ${booking.program}</p>
        <table>
          <tr><th>${t("guestName")}</th><td>${booking.guest}</td></tr>
          <tr><th>${t("email")}</th><td>${booking.email}</td></tr>
          <tr><th>${t("phone")}</th><td>${booking.phone}</td></tr>
          <tr><th>${t("country")}</th><td>${booking.country}</td></tr>
          <tr><th>${t("bookingChannel")}</th><td>${booking.bookingChannel}</td></tr>
          <tr><th>${t("program")}</th><td>${booking.program}</td></tr>
          <tr><th>${t("serviceCategory")}</th><td>${booking.serviceCategory}</td></tr>
          <tr><th>${t("selectedService")}</th><td>${booking.serviceType}</td></tr>
          <tr><th>${t("healerName")}</th><td>${booking.healer}</td></tr>
          <tr><th>${t("healerRole")}</th><td>${booking.healerRole}</td></tr>
          <tr><th>${t("bookingDate")}</th><td>${booking.date}</td></tr>
          <tr><th>${t("sessionTime")}</th><td>${booking.sessionTime}</td></tr>
          <tr><th>${t("createdDate")}</th><td>${booking.createdAt}</td></tr>
          <tr><th>${t("duration")}</th><td>${booking.duration}</td></tr>
          <tr><th>${t("location")}</th><td>${booking.location}</td></tr>
          <tr><th>${t("language")}</th><td>${booking.language}</td></tr>
          <tr><th>${t("pickup")}</th><td>${booking.pickup}</td></tr>
          <tr><th>${t("participants")}</th><td>${booking.guests} ${t("people")}</td></tr>
          <tr><th>${t("paymentProvider")}</th><td>${booking.paymentProvider}</td></tr>
          <tr><th>${t("paymentStatus")}</th><td>${booking.paymentStatus}</td></tr>
          <tr><th>${t("totalPayment")}</th><td>${formatIDR(booking.amount)}</td></tr>
          <tr><th>${t("bookingStatus")}</th><td>${statusLabel(booking.status)}</td></tr>
          <tr><th>${t("notes")}</th><td>${booking.notes}</td></tr>
        </table>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
    </html>`);
  printWindow.document.close();
}

function renderProgramOptions() {
  const select = qs("#program");
  select.innerHTML = programs.map((program) => `
    <option value="${program.id}">${program.name} - ${program.duration} - ${formatIDR(program.price)}</option>
  `).join("");
}

function calculateTotal() {
  const selected = programs.find((program) => program.id === qs("#program").value) || programs[0];
  const guests = Number(qs("#guests").value || 1);
  return selected.price * guests;
}

function updateBookingSummary(showToast = true) {
  const selected = programs.find((program) => program.id === qs("#program").value) || programs[0];
  const guests = Number(qs("#guests").value || 1);
  qs("#summary-program").textContent = selected.name;
  qs("#summary-guests").textContent = `${guests} guest${guests > 1 ? "s" : ""}`;
  qs("#summary-total").textContent = formatIDR(selected.price * guests);
  if (showToast) toast(t("bookingStatus"));
}
