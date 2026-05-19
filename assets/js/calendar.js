import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { getLanguage, statusLabel } from "./i18n.js";

let activeMonth = null;

export async function initDashboardCalendarPage() {
  const grid = qs("#booking-calendar-grid");
  if (!grid) return;

  const bookings = await api.bookings();
  activeMonth = getInitialMonth(bookings);

  const render = () => renderCalendar(bookings);
  qs("[data-calendar-prev]")?.addEventListener("click", () => {
    activeMonth = new Date(Date.UTC(activeMonth.getUTCFullYear(), activeMonth.getUTCMonth() - 1, 1));
    render();
  });
  qs("[data-calendar-next]")?.addEventListener("click", () => {
    activeMonth = new Date(Date.UTC(activeMonth.getUTCFullYear(), activeMonth.getUTCMonth() + 1, 1));
    render();
  });
  qs("[data-calendar-today]")?.addEventListener("click", () => {
    activeMonth = getInitialMonth(bookings);
    render();
  });

  render();
}

function renderCalendar(bookings) {
  const grid = qs("#booking-calendar-grid");
  const title = qs("#calendar-title");
  if (!grid || !title) return;

  const year = activeMonth.getUTCFullYear();
  const month = activeMonth.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingDays = firstDay.getUTCDay();
  const cells = [];
  const bookingsByDate = groupBookingsByDate(bookings);

  title.textContent = activeMonth.toLocaleDateString(getLanguage() === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push({ blank: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateKey, bookings: bookingsByDate.get(dateKey) || [] });
  }

  renderList(grid, cells, (cell) => {
    if (cell.blank) return `<div class="min-h-[8.5rem] rounded-2xl border border-white/5 bg-white/[.015]"></div>`;

    return `
      <article class="min-h-[8.5rem] rounded-2xl border border-white/10 bg-white/[.035] p-3">
        <div class="flex items-center justify-between gap-2">
          <span class="grid size-8 place-items-center rounded-full bg-white/5 font-semibold text-white">${cell.day}</span>
          ${cell.bookings.length ? `<span class="status-pill status-confirmed">${cell.bookings.length}</span>` : ""}
        </div>
        <div class="mt-3 space-y-2">
          ${cell.bookings.map(renderCalendarNote).join("")}
        </div>
      </article>`;
  });

  window.lucide?.createIcons();
}

function renderCalendarNote(booking) {
  return `
    <div class="rounded-xl border border-gold/20 bg-gold/10 p-2 text-left">
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="text-xs font-semibold text-gold">${booking.sessionTime} - ${booking.guest}</p>
          <p class="mt-1 text-xs text-white/70">${booking.program}</p>
          <p class="mt-1 text-xs text-white/50">${booking.healer}</p>
        </div>
        <span class="status-pill status-${booking.status}">${statusLabel(booking.status)}</span>
      </div>
      <p class="mt-2 line-clamp-2 text-xs text-white/60">${booking.notes}</p>
      <p class="mt-2 text-xs text-white/45">${booking.serviceCategory} - ${formatIDR(booking.amount)}</p>
    </div>`;
}

function groupBookingsByDate(bookings) {
  return bookings.reduce((groups, booking) => {
    const current = groups.get(booking.date) || [];
    current.push(booking);
    groups.set(booking.date, current);
    return groups;
  }, new Map());
}

function getInitialMonth(bookings) {
  const latestBooking = bookings.reduce((latest, booking) => {
    const bookingDate = parseDate(booking.date);
    return bookingDate > latest ? bookingDate : latest;
  }, parseDate(bookings[0]?.date || new Date().toISOString().slice(0, 10)));

  return new Date(Date.UTC(latestBooking.getUTCFullYear(), latestBooking.getUTCMonth(), 1));
}

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}
