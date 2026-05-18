import { qs, qsa } from "./core.js";

export function hydrateClock() {
  const tick = () => {
    qsa("[data-clock]").forEach((node) => {
      node.textContent = new Intl.DateTimeFormat("en-ID", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Makassar"
      }).format(new Date());
    });
  };
  tick();
  setInterval(tick, 30_000);
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
