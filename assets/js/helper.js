import { qs, qsa } from "./core.js";
import { getLanguage } from "./i18n.js";

let clockInterval = null;
let clockObserver = null;

export function hydrateClock() {
  const tick = () => {
    const formattedTime = new Intl.DateTimeFormat(getLanguage() === "en" ? "en-US" : "id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Makassar"
    }).format(new Date());

    qsa("[data-clock]").forEach((node) => {
      if (node.textContent !== formattedTime) node.textContent = formattedTime;
    });
  };
  tick();
  if (!clockInterval) clockInterval = setInterval(tick, 1_000);
  if (!clockObserver && "MutationObserver" in window) {
    clockObserver = new MutationObserver(tick);
    clockObserver.observe(document.body, { childList: true, subtree: true });
  }
}

export function toast(message) {
  const existing = qs("#toast");
  existing?.remove();
  const toastNode = document.createElement("div");
  toastNode.id = "toast";
  toastNode.className = "fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 glass-card luxury-border px-5 py-3 text-sm text-white shadow-luxury";
  toastNode.textContent = message;
  document.body.appendChild(toastNode);
  setTimeout(() => toastNode.remove(), 2200);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
