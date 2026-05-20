export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const componentCache = new Map();
const ASSET_VERSION = "20260521-open-front-office-v1";

export async function fetchText(path) {
  if (componentCache.has(path)) return componentCache.get(path);
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${separator}v=${ASSET_VERSION}`);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  const text = await response.text();
  componentCache.set(path, text);
  return text;
}

export async function loadComponent(targetId, path, data = {}) {
  const target = typeof targetId === "string" ? qs(`#${targetId}`) : targetId;
  if (!target) return;
  target.innerHTML = interpolate(await fetchText(path), data);
  await hydrateIncludes(target);
}

export async function loadPage(targetId, path) {
  await loadComponent(targetId, path);
}

async function hydrateIncludes(scope = document) {
  const includes = qsa("[data-include]", scope);
  await Promise.all(includes.map(async (node) => {
    node.innerHTML = interpolate(await fetchText(node.dataset.include), node.dataset);
  }));
}

export async function mountLayout(layout) {
  const shell = qs("#shell");
  const app = qs("#app");
  const map = {
    main: "layouts/main-layout.html",
    dashboard: "layouts/dashboard-layout.html",
    "front-office": "layouts/front-office-layout.html",
    auth: "layouts/auth-layout.html"
  };
  shell.innerHTML = await fetchText(map[layout]);
  qs("#page-slot")?.appendChild(app);

  if (layout === "main") {
    await loadComponent("navbar-slot", "components/navbar.html");
    await loadComponent("footer-slot", "components/footer.html");
  }

  if (layout === "dashboard") {
    await loadComponent("sidebar-slot", "components/sidebar.html");
    bindDashboardSidebar();
  }
}

export function interpolate(template, data) {
  return Object.entries(data).reduce((html, [key, value]) => {
    return html.replaceAll(`{{${key}}}`, value);
  }, template);
}

export function formatIDR(value) {
  return new Intl.NumberFormat("en-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDurationMinutes(value) {
  const minutes = Number(value || 0);
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`;
}

export function durationToMinutes(duration = "") {
  const lower = String(duration).toLowerCase();
  const dayMatch = lower.match(/(\d+)\s*(day|days|hari|night|nights|malam)/);
  const hourMatch = lower.match(/(\d+)\s*(h|hr|hour|hours|jam)/);
  const minuteMatch = lower.match(/(\d+)\s*(m|min|minute|minutes|menit)/);
  if (dayMatch) return Number(dayMatch[1]) * 60;
  return (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minuteMatch ? Number(minuteMatch[1]) : 0);
}

export function formatItemDuration(item = {}) {
  const minutes = Number(item.durationMinutes || durationToMinutes(item.duration));
  return formatDurationMinutes(minutes) || item.duration || "-";
}

export function bindDashboardSidebar() {
  if (document.body.dataset.dashboardSidebarBound) return;
  document.body.dataset.dashboardSidebarBound = "true";

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-sidebar-open]")) qs("#dashboard-sidebar")?.classList.add("is-open");
    if (event.target.closest("[data-sidebar-close]")) qs("#dashboard-sidebar")?.classList.remove("is-open");
  });

  document.addEventListener("toggle", (event) => {
    const group = event.target.closest?.("[data-sidebar-routes]");
    if (!group?.open) return;
    qsa("[data-sidebar-routes]").forEach((item) => {
      if (item !== group) item.open = false;
    });
  }, true);
}

export function renderList(target, items, renderer) {
  const node = typeof target === "string" ? qs(target) : target;
  if (node) node.innerHTML = items.map(renderer).join("");
}
