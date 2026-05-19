import { CONFIG, ROUTES } from "./config.js";
import { loadPage, mountLayout, qs, qsa } from "./assets/js/core.js";
import { initBookingPage, initDashboardBookingPage } from "./assets/js/booking.js";
import { initDashboardCalendarPage } from "./assets/js/calendar.js";
import { initHealersPage, initServicesPage } from "./assets/js/catalog.js";
import { initDashboardPage } from "./assets/js/finance.js";
import { initFrontOfficePage } from "./assets/js/front-office.js";
import { applyI18n, t } from "./assets/js/i18n.js";
import { initPaymentModal } from "./assets/js/payment.js";
import { initSettingsPage } from "./assets/js/settings.js";
import { initCounters, initHealerPagination, initHealerPhotoModal, initHeroLight, initPackageServicePagination, initRitualGallery, initRitualServicePagination, initRitualTabs, initScrollAnimations, initServiceToggle, initTestimonials, luxuryParallax } from "./assets/js/animation.js";

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
  settings: initSettingsPage
};

let currentLayout = "";
let pendingSection = "";

function getPathRouteName() {
  const cleanPath = location.pathname.replace(/\/+$/, "") || "/";
  if (cleanPath === "/" || cleanPath.endsWith("/index.html")) return "home";
  if (cleanPath === "/admin") return "dashboard";
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
  const routeName = getRouteName();
  const route = ROUTES[routeName];

  if (currentLayout !== route.layout) {
    await mountLayout(route.layout);
    currentLayout = route.layout;
  }

  document.title = route.seoTitle || `${route.titleKey ? t(route.titleKey) : route.title} | ${CONFIG.appName}`;
  await loadPage("app", route.path);
  applyI18n();
  updateActiveLinks(routeName);
  initPaymentModal();
  pageInitializers[routeName]?.();
  applyI18n();
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
  initTestimonials();
  scrollToPendingSection();
}

function updateActiveLinks(routeName) {
  qsa("[data-route]").forEach((link) => {
    const sectionMatches = link.dataset.section ? link.dataset.section === pendingSection : !pendingSection;
    link.classList.toggle("is-active", link.dataset.route === routeName && sectionMatches);
  });
  qs("#mobile-menu")?.classList.add("hidden");
}

export function initRouter() {
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("language:change", renderRoute);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-route]");
    if (!trigger) return;
    event.preventDefault();
    pendingSection = trigger.dataset.section || "";
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
