import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { toast } from "./helper.js";
import { statusLabel, t } from "./i18n.js";

const programs = [
  {
    id: "hatha-yoga",
    name: "HATHA YOGA",
    category: "Service",
    price: 600000,
    duration: "1h",
    healer: "Jro Upit",
    location: "Beji Healing",
    capacity: "1/4",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=240&q=80"
  },
  {
    id: "purification",
    name: "PURIFICATION RITUAL",
    category: "Ritual Services",
    price: 850000,
    duration: "1h 30m",
    healer: "Ida Bagus Wayan",
    location: "Beji Healing",
    capacity: "1/5",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=240&q=80"
  },
  {
    id: "sound-healing",
    name: "SOUND HEALING",
    category: "Service",
    price: 750000,
    duration: "1h",
    healer: "Raka Suryana",
    location: "Beji Healing",
    capacity: "1/6",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=240&q=80"
  }
];

const bookingState = {
  step: 0,
  people: 0,
  selectedDate: "",
  selectedTime: "",
  fullAmount: false,
  coupon: "",
  cartOpen: true,
  customer: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "Indonesia",
    address: "",
    city: "",
    province: "Bali",
    postcode: "",
    agree: false
  }
};

const bookingSteps = [
  { label: "Bringing anyone with you?", icon: "user-plus" },
  { label: "Date & Time", icon: "calendar-days" },
  { label: "Cart", icon: "shopping-cart" },
  { label: "Your Information", icon: "user" },
  { label: "Payments", icon: "credit-card" }
];

const bookingTimes = ["9:30 AM - 10:30 AM", "11:00 AM - 12:00 PM", "12:30 PM - 1:30 PM", "2:00 PM - 3:00 PM", "3:30 PM - 4:30 PM"];

export async function initBookingPage() {
  const root = qs("#booking-wizard");
  if (!root) return;
  renderBookingWizard(root);
  root.addEventListener("click", handleBookingClick);
  root.addEventListener("input", handleBookingInput);
  window.lucide?.createIcons();
}

function renderBookingWizard(root) {
  if (bookingState.step === 5) {
    root.classList.add("is-checkout");
    root.innerHTML = renderCheckout();
    window.lucide?.createIcons();
    return;
  }

  root.classList.remove("is-checkout");
  root.innerHTML = `
    <aside class="booking-side">
      <div class="booking-step-list">
        ${bookingSteps.map((step, index) => renderBookingStep(step, index)).join("")}
      </div>
      <div class="booking-contact">
        <p>Get in Touch</p>
        <a href="tel:+628139788886">+628139788886</a>
        <a href="mailto:info@bejihealing.com">info@bejihealing.com</a>
      </div>
      <button class="booking-collapse" type="button">
        <span>Collapse menu</span>
        <i data-lucide="circle-arrow-right"></i>
      </button>
    </aside>
    <article class="booking-panel">
      <header class="booking-panel-head">
        ${bookingState.step > 0 ? `<button class="booking-icon-button" type="button" data-booking-back aria-label="Back"><i data-lucide="chevron-left"></i></button>` : ""}
        <h1>${bookingSteps[bookingState.step].label}</h1>
        <button class="booking-close" type="button" data-route="home" aria-label="Close"><i data-lucide="x"></i></button>
      </header>
      <div class="booking-panel-body">
        ${renderStepBody()}
      </div>
      <footer class="booking-panel-foot">
        <button class="booking-primary" type="button" data-booking-continue>${bookingState.step === 4 ? "Continue" : "Continue"}</button>
      </footer>
    </article>`;
  window.lucide?.createIcons();
}

function renderBookingStep(step, index) {
  const completed = index < bookingState.step;
  const active = index === bookingState.step;
  const dateDetail = index === 1 && bookingState.step > 1 && bookingState.selectedDate ? `<small>${formatSelectedDate()} - ${shortTime()}</small>` : "";
  const badge = index === 2 && bookingState.step >= 2 ? `<b class="booking-badge">1</b>` : "";
  return `
    <button class="booking-step ${active ? "is-active" : ""} ${completed ? "is-complete" : ""}" type="button" data-booking-step="${index}">
      ${badge}
      <i data-lucide="${step.icon}"></i>
      <span>${step.label}${dateDetail}</span>
      <em>${completed ? `<i data-lucide="check"></i>` : ""}</em>
    </button>`;
}

function renderStepBody() {
  if (bookingState.step === 0) return `
    <div class="booking-people-row">
      <span><i data-lucide="users"></i> Additional people</span>
      <div class="booking-counter">
        <button type="button" data-people="-1" aria-label="Decrease additional people" ${bookingState.people <= 0 ? "disabled" : ""}><i data-lucide="minus"></i></button>
        <strong>${bookingState.people}</strong>
        <button type="button" data-people="1" aria-label="Increase additional people" ${bookingState.people >= maxAdditionalPeople() ? "disabled" : ""}><i data-lucide="plus"></i></button>
      </div>
    </div>
    <p class="booking-muted">Number of people that are coming with you.</p>`;

  if (bookingState.step === 1) return `
    <div class="booking-calendar-toolbar">
      <select aria-label="Month"><option>May</option></select>
      <select aria-label="Year"><option>2026</option></select>
      <div class="booking-month-buttons">
        <button type="button" aria-label="Previous month"><i data-lucide="chevron-left"></i></button>
        <button type="button" aria-label="Next month"><i data-lucide="chevron-right"></i></button>
      </div>
    </div>
    <p class="booking-zone">Australia/Perth</p>
    <div class="booking-calendar">
      ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<strong>${day}</strong>`).join("")}
      ${renderCalendarDays()}
    </div>
    ${bookingState.selectedDate ? `
      <div class="booking-time-section">
        <p>${formatSelectedDate(true)}${bookingState.selectedTime ? ` - ${shortTime()}` : ""}</p>
        <div class="booking-time-grid">
          ${bookingTimes.map((time) => `<button class="${time === bookingState.selectedTime ? "is-selected" : ""}" type="button" data-time="${time}">${time}</button>`).join("")}
        </div>
      </div>` : ""}`;

  if (bookingState.step === 2) return renderCart();
  if (bookingState.step === 3) return renderInformationForm();
  return renderPayments();
}

function renderCalendarDays() {
  const cells = [];
  for (let day = 27; day <= 30; day += 1) cells.push({ day, muted: true, disabled: true });
  for (let day = 1; day <= 17; day += 1) cells.push({ day, disabled: true });
  for (let day = 18; day <= 31; day += 1) cells.push({ day, date: `2026-05-${String(day).padStart(2, "0")}` });
  for (let day = 1; day <= 7; day += 1) cells.push({ day, muted: true, date: `2026-06-${String(day).padStart(2, "0")}` });
  return cells.map((cell) => `
    <button class="${cell.muted ? "is-muted" : ""} ${cell.disabled ? "is-disabled" : ""} ${cell.date === bookingState.selectedDate ? "is-selected" : ""}" type="button" ${cell.disabled ? "disabled" : ""} data-date="${cell.date || ""}">
      ${cell.day}${cell.day === 19 && !cell.muted ? `<span></span>` : ""}
    </button>`).join("");
}

function renderCart() {
  const service = programs[0];
  const guests = totalGuests();
  const capacity = serviceCapacity(service);
  const total = service.price * guests;
  return `
    <p class="booking-copy">You can find below the appointments you selected for booking. If you want to book more, click on the button below.</p>
    <section class="booking-cart-card">
      <header>
        <img src="${service.image}" alt="${service.name}" />
        <h2>${service.name}</h2>
        <span>${formatIDR(total)}</span>
        <button class="booking-cart-toggle" type="button" data-cart-toggle aria-label="${bookingState.cartOpen ? "Close" : "Open"} appointment detail">
          <i data-lucide="${bookingState.cartOpen ? "chevron-up" : "chevron-down"}"></i>
        </button>
      </header>
      <div class="booking-cart-detail ${bookingState.cartOpen ? "is-open" : ""}">
        <div class="booking-cart-lines">
          <p>Service</p>
          <div><span>${service.name} (${formatIDR(service.price)}) x ${guests} person${guests > 1 ? "s" : ""}</span><b>${formatIDR(total)}</b></div>
          <div><strong>Service Subtotal</strong><b>${formatIDR(total)}</b></div>
          <div class="booking-total"><strong>Total Price</strong><b>${formatIDR(total)}</b></div>
        </div>
        <div class="booking-info-box">
          <p>Info</p>
          <span><i data-lucide="calendar-days"></i>${formatSelectedDate()}</span>
          <span><i data-lucide="clock"></i>${bookingState.selectedTime}</span>
          <span><i data-lucide="user"></i>${service.healer}</span>
          <span><i data-lucide="calendar-clock"></i>${service.duration}</span>
          <span><i data-lucide="map-pin"></i>${service.location}</span>
          <span><i data-lucide="users"></i>${guests} / ${capacity}</span>
        </div>
        <footer>
          <button type="button" class="booking-delete"><i data-lucide="trash-2"></i> Delete</button>
          <button type="button" class="booking-edit"><span>Edit</span><i data-lucide="pencil"></i></button>
        </footer>
      </div>
    </section>
    <button class="booking-add" type="button"><i data-lucide="circle-plus"></i> Book another</button>`;
}

function renderInformationForm() {
  return `
    <form class="booking-form">
      ${bookingInput("firstName", "* First Name:", "Enter first name", bookingState.customer.firstName)}
      ${bookingInput("lastName", "* Last Name:", "Enter last name", bookingState.customer.lastName)}
      ${bookingInput("email", "Email:", "Enter email", bookingState.customer.email, "email")}
      <label>Phone:
        <div class="booking-phone">
          <button type="button"><span></span><i data-lucide="chevron-down"></i></button>
          <input data-customer="phone" type="tel" placeholder="Enter phone" value="${bookingState.customer.phone}" />
        </div>
      </label>
    </form>`;
}

function renderPayments() {
  const total = programs[0].price * totalGuests();
  const deposit = bookingState.fullAmount ? total : total / 2;
  return `
    <h2 class="booking-subtitle">Summary</h2>
    <section class="booking-payment-card">
      <div class="booking-summary-box">
        <p>Services</p>
        <div><span>${programs[0].name} (${formatIDR(programs[0].price)}) x ${totalGuests()} person${totalGuests() > 1 ? "s" : ""}</span><b>${formatIDR(total)}</b></div>
      </div>
      <label class="booking-coupon">Coupon:
        <input data-booking-coupon value="${bookingState.coupon}" />
        <button type="button">Add</button>
      </label>
      <div class="booking-pay-lines">
        <div><strong>Total Amount:</strong><span>${formatIDR(total)}</span></div>
        <div><strong>Paying now:</strong><span>${formatIDR(deposit)}</span></div>
        <div><strong>Paying later:</strong><span>${formatIDR(total - deposit)}</span></div>
      </div>
    </section>
    <label class="booking-check-row">
      <input type="checkbox" data-full-amount ${bookingState.fullAmount ? "checked" : ""} />
      <span>I want to pay full amount</span>
    </label>
    <p class="booking-muted booking-center">You will be redirected to the payment checkout.</p>`;
}

function renderCheckout() {
  const customer = bookingState.customer;
  const service = programs[0];
  const guests = totalGuests();
  const total = service.price * guests;
  return `
    <main class="booking-checkout">
      <form class="checkout-billing">
        <h1>Billing details</h1>
        <div class="checkout-grid">
          ${checkoutField("firstName", "First name *", customer.firstName || "fgdg")}
          ${checkoutField("lastName", "Last name *", customer.lastName || "asdfgafg")}
        </div>
        ${checkoutField("company", "Company name (optional)", "")}
        ${checkoutSelect("country", "Country / Region *", customer.country)}
        ${checkoutField("address", "Street address *", customer.address, "House number and street name")}
        ${checkoutField("address2", "", "", "Apartment, suite, unit, etc. (optional)")}
        ${checkoutField("city", "Town / City *", customer.city)}
        ${checkoutSelect("province", "Province *", customer.province)}
        ${checkoutField("postcode", "Postcode / ZIP *", customer.postcode)}
        ${checkoutField("phone", "Phone *", `+62${customer.phone || "32152535"}`)}
        ${checkoutField("email", "Email address *", customer.email || "asfaf@dfgdf.com")}
        <label class="checkout-mini-check"><input type="checkbox" /> Create an account?</label>
      </form>
      <aside class="checkout-order">
        <h2>Your order</h2>
        <div class="checkout-order-head"><b>Product</b><b>Subtotal</b></div>
        <div class="checkout-product">
          <strong>Appointment x 1</strong>
          <p>Appointment Info:</p>
          <p>Local Time: ${formatSelectedDate(true)}<br />${shortTime()}</p>
          <p>Client Time: (UTC+08:00) ${formatSelectedDate(true)} ${shortTime()}</p>
          <p>service: ${service.name}</p>
          <p>employee: ${service.healer}</p>
          <p>Total Number of People: ${guests}</p>
        </div>
        <div class="checkout-line"><span>Subtotal</span><b>${formatIDR(total)}</b></div>
        <div class="checkout-line"><span>Total</span><b>${formatIDR(total)}</b></div>
        <div class="checkout-payment">
          <label><input type="radio" checked /> All Supported Payment</label>
          <p>Accept all various supported payment methods. Choose your preferred payment on the next page. Secure payment via Midtrans.</p>
          <label><input type="radio" /> HitPay Payment Gateway</label>
        </div>
        <p class="checkout-privacy">Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.</p>
        <label class="checkout-terms"><input data-checkout-agree type="checkbox" /> I have read and agree to the website terms and conditions *</label>
        <button class="checkout-place" type="button">Place order</button>
      </aside>
    </main>`;
}

function bookingInput(name, label, placeholder, value, type = "text") {
  return `<label>${label}<input data-customer="${name}" type="${type}" placeholder="${placeholder}" value="${value}" /></label>`;
}

function checkoutField(name, label, value, placeholder = "") {
  return `<label>${label ? `<span>${label}</span>` : ""}<input data-customer="${name}" value="${value || ""}" placeholder="${placeholder}" /></label>`;
}

function checkoutSelect(name, label, value) {
  return `<label><span>${label}</span><select data-customer="${name}"><option>${value || "Indonesia"}</option></select></label>`;
}

function handleBookingClick(event) {
  const root = qs("#booking-wizard");
  if (!root) return;
  const peopleButton = event.target.closest("[data-people]");
  const dateButton = event.target.closest("[data-date]");
  const timeButton = event.target.closest("[data-time]");
  const stepButton = event.target.closest("[data-booking-step]");

  if (peopleButton) bookingState.people = clampAdditionalPeople(bookingState.people + Number(peopleButton.dataset.people));
  if (dateButton?.dataset.date) {
    bookingState.selectedDate = dateButton.dataset.date;
    bookingState.selectedTime = bookingState.selectedTime || bookingTimes[0];
  }
  if (timeButton) bookingState.selectedTime = timeButton.dataset.time;
  if (event.target.closest("[data-booking-back]")) bookingState.step = Math.max(0, bookingState.step - 1);
  if (event.target.closest("[data-booking-continue]")) {
    if (bookingState.step === 1 && !bookingState.selectedDate) return;
    bookingState.step = Math.min(5, bookingState.step + 1);
  }
  if (stepButton) bookingState.step = Number(stepButton.dataset.bookingStep);
  if (event.target.closest("[data-full-amount]")) bookingState.fullAmount = event.target.closest("[data-full-amount]").checked;
  if (event.target.closest("[data-cart-toggle]")) bookingState.cartOpen = !bookingState.cartOpen;

  if (peopleButton || dateButton || timeButton || stepButton || event.target.closest("[data-booking-back]") || event.target.closest("[data-booking-continue]") || event.target.closest("[data-full-amount]") || event.target.closest("[data-cart-toggle]")) {
    renderBookingWizard(root);
  }
}

function handleBookingInput(event) {
  const customerKey = event.target.dataset.customer;
  if (customerKey) bookingState.customer[customerKey] = event.target.value;
  if (event.target.dataset.bookingCoupon !== undefined) bookingState.coupon = event.target.value;
}

function formatSelectedDate(withYear = false) {
  if (!bookingState.selectedDate) return "";
  const date = new Date(`${bookingState.selectedDate}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: withYear ? "numeric" : undefined });
}

function shortTime() {
  if (!bookingState.selectedTime) return "";
  return bookingState.selectedTime.split(" - ")[0];
}

function totalGuests() {
  return bookingState.people + 1;
}

function serviceCapacity(service) {
  return Number(service.capacity.split("/").at(-1) || 4);
}

function maxAdditionalPeople() {
  return Math.max(0, serviceCapacity(programs[0]) - 1);
}

function clampAdditionalPeople(value) {
  return Math.min(maxAdditionalPeople(), Math.max(0, value));
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
