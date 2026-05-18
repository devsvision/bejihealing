export const appState = {
  user: {
    name: "Alya Mahendra",
    role: "Retreat Director"
  },
  cart: [],
  bookingDraft: {
    programId: "forest-reset",
    date: "",
    guests: 1,
    provider: "midtrans"
  },
  payment: {
    lastInvoice: null
  }
};

export function setState(path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((scope, key) => scope[key], appState);
  target[last] = value;
  window.dispatchEvent(new CustomEvent("state:change", { detail: { path, value } }));
}
