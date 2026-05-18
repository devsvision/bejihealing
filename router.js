import { ROUTES } from "./config.js";
import { loadPage, mountLayout, qs, qsa } from "./assets/js/core.js";
import { initBookingPage } from "./assets/js/booking.js";
import { initDashboardPage } from "./assets/js/finance.js";
import { initPOSPage } from "./assets/js/pos.js";
import { initPaymentModal } from "./assets/js/payment.js";
import { initCounters, initHealerPagination, initHealerPhotoModal, initHeroLight, initPackageServicePagination, initRitualGallery, initRitualServicePagination, initRitualTabs, initScrollAnimations, initServiceToggle, initTestimonials, luxuryParallax } from "./assets/js/animation.js";

const pageInitializers = {
  booking: initBookingPage,
  customers: initDashboardPage,
  dashboard: initDashboardPage,
  finance: initDashboardPage,
  pos: initPOSPage
};

let currentLayout = "";
let pendingSection = "";

export function getRouteName() {
  const raw = location.hash.replace("#/", "").replace("#", "");
  return ROUTES[raw] ? raw : "home";
}

export async function navigateTo(routeName) {
  if (!ROUTES[routeName]) routeName = "home";
  location.hash = `#/${routeName}`;
}

export async function renderRoute() {
  const routeName = getRouteName();
  const route = ROUTES[routeName];

  if (currentLayout !== route.layout) {
    await mountLayout(route.layout);
    currentLayout = route.layout;
  }

  document.title = `${route.title} | Beji Healing`;
  await loadPage("app", route.path);
  updateActiveLinks(routeName);
  initPaymentModal();
  pageInitializers[routeName]?.();
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
  if (!location.hash) location.hash = "#/home";
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
