import { CONFIG, ROUTES } from "./config.js";
import { canAccessRoute, getCurrentUser, routeForUser } from "./assets/js/access.js";
import { api } from "./assets/js/api.js";
import { formatIDR, loadPage, mountLayout, qs, qsa } from "./assets/js/core.js";
import { initBookingPage, initDashboardBookingPage } from "./assets/js/booking.js";
import { initDashboardCalendarPage } from "./assets/js/calendar.js";
import { initHealersPage, initPublicHealers, initPublicServices, initServicesPage } from "./assets/js/catalog.js";
import { initDashboardPage } from "./assets/js/finance.js";
import { initFrontOfficePage } from "./assets/js/front-office.js";
import { hydrateClock } from "./assets/js/helper.js";
import { applyI18n, t } from "./assets/js/i18n.js";
import { initPaymentModal } from "./assets/js/payment.js";
import { initReportsPage } from "./assets/js/reports.js";
import { initSettingsPage } from "./assets/js/settings.js";
import { initUsersPage } from "./assets/js/users.js";
import { initCounters, initHealerPagination, initHealerPhotoModal, initHeroLight, initInstagramGallery, initPackageServicePagination, initRitualGallery, initRitualServicePagination, initRitualTabs, initScrollAnimations, initServiceToggle, initTestimonials, initTikTokGallery, luxuryParallax } from "./assets/js/animation.js";

const pageInitializers = {
  booking: initBookingPage,
  "dashboard-booking": initDashboardBookingPage,
  "dashboard-calendar": initDashboardCalendarPage,
  "dashboard-services": initServicesPage,
  "dashboard-healers": initHealersPage,
  customers: initDashboardPage,
  dashboard: initDashboardPage,
  finance: initDashboardPage,
  "front-office": initFrontOfficePage,
  reports: initReportsPage,
  users: initUsersPage,
  settings: initSettingsPage
};

let currentLayout = "";
let pendingSection = "";

function getPathRouteName() {
  const cleanPath = location.pathname.replace(/\/+$/, "") || "/";
  if (cleanPath === "/" || cleanPath.endsWith("/index.html")) return "home";
  if (cleanPath === "/admin") return "dashboard";
  if (cleanPath === "/fo") return "front-office";
  return "notFound";
}

export function getRouteName() {
  const raw = location.hash.replace("#/", "").replace("#", "");
  if (raw) return ROUTES[raw] ? raw : "notFound";
  return getPathRouteName();
}

export async function navigateTo(routeName) {
  if (!ROUTES[routeName]) routeName = "notFound";
  location.hash = routeName === "notFound" ? "#/404" : `#/${routeName}`;
}

export async function renderRoute() {
  let routeName = getRouteName();
  const user = getCurrentUser();
  if (!canAccessRoute(routeName, user)) {
    routeName = routeForUser(user);
    location.hash = `#/${routeName}`;
  }
  const route = ROUTES[routeName];

  if (currentLayout !== route.layout) {
    await mountLayout(route.layout);
    currentLayout = route.layout;
  }

  document.title = route.seoTitle || `${route.titleKey ? t(route.titleKey) : route.title} | ${CONFIG.appName}`;
  await loadPage("app", route.path);
  applyI18n();
  hydrateClock();
  applyAccessVisibility(user);
  updateSidebarTodayMetrics();
  updateActiveLinks(routeName);
  updateSidebarGroups(routeName);
  initPaymentModal();
  pageInitializers[routeName]?.();
  applyI18n();
  await initPublicServices();
  await initPublicHealers();
  initScrollAnimations();
  luxuryParallax();
  initHeroLight();
  initCounters();
  initServiceToggle();
  initRitualTabs();
  initRitualGallery();
  initRitualServicePagination();
  initPackageServicePagination();
  initHealerPagination();
  initHealerPhotoModal();
  initInstagramGallery();
  initTikTokGallery();
  initTestimonials();
  scrollToPendingSection();
}

function applyAccessVisibility(user) {
  if (!user) return;
  qsa("[data-route]").forEach((link) => {
    const route = link.dataset.route;
    if (route) link.hidden = !canAccessRoute(route, user);
  });
  qsa("[data-sidebar-routes]").forEach((group) => {
    const routes = group.dataset.sidebarRoutes.split(" ");
    group.hidden = !routes.some((route) => canAccessRoute(route, user));
  });
  const avatar = qs("[data-current-user-avatar]");
  const name = qs("[data-current-user-name]");
  if (avatar) avatar.textContent = user.name?.slice(0, 1) || "U";
  if (name) name.textContent = user.name || "User";
}

async function updateSidebarTodayMetrics() {
  const ordersNode = qs("[data-sidebar-today-orders]");
  const summaryNode = qs("[data-sidebar-today-summary]");
  if (!ordersNode || !summaryNode) return;

  try {
    const bookings = await api.bookings();
    const today = localDateISO(new Date());
    const todayBookings = bookings.filter((booking) => booking.date === today && isOperationalBooking(booking));
    const revenue = todayBookings
      .filter((booking) => isRevenueBooking(booking))
      .reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
    const activeHealers = new Set(todayBookings.map((booking) => booking.healer).filter(Boolean)).size;

    ordersNode.textContent = `${todayBookings.length} pesanan`;
    summaryNode.textContent = `${formatIDR(revenue)} - ${activeHealers} healer aktif melayani`;
  } catch (error) {
    console.error("[sidebar] today metrics failed", error);
  }
}

function isOperationalBooking(booking) {
  return !["cancelled", "refunded"].includes(String(booking.status || "").toLowerCase());
}

function isRevenueBooking(booking) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.paymentStatus || "").toLowerCase();
  return ["paid", "confirmed", "completed"].includes(status) || /paid|deposit|lunas|settled/.test(paymentStatus);
}

function localDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateActiveLinks(routeName) {
  qsa("[data-route]").forEach((link) => {
    const sectionMatches = link.dataset.section ? link.dataset.section === pendingSection : !pendingSection;
    link.classList.toggle("is-active", link.dataset.route === routeName && sectionMatches);
  });
  qs("#mobile-menu")?.classList.add("hidden");
}

function updateSidebarGroups(routeName) {
  qsa("[data-sidebar-routes]").forEach((group) => {
    const routes = group.dataset.sidebarRoutes.split(" ");
    group.open = routes.includes(routeName);
  });
}

export function initRouter() {
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("popstate", renderRoute);
  window.addEventListener("language:change", renderRoute);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-route]");
    if (!trigger) return;
    if (trigger.hasAttribute("data-path-route")) return;
    event.preventDefault();
    pendingSection = trigger.dataset.section || "";
    if (trigger.dataset.route === "finance") {
      if (pendingSection) sessionStorage.setItem("beji-active-finance-section", pendingSection);
      else sessionStorage.removeItem("beji-active-finance-section");
    }
    if (getRouteName() === trigger.dataset.route) {
      renderRoute();
    } else {
      navigateTo(trigger.dataset.route);
    }
  });
  if (!location.hash && getPathRouteName() === "home") location.hash = "#/home";
  renderRoute();
}

function scrollToPendingSection() {
  if (!pendingSection) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const target = qs(`#${pendingSection}`);
  pendingSection = "";
  if (!target) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}
