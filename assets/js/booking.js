import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { todayISO, toast } from "./helper.js";
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
      <span class="status-pill status-${booking.status}">${booking.status}</span>
    </article>`);
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
  if (showToast) toast("Booking studio is ready.");
}
