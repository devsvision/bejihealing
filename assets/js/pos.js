import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { appState } from "./state.js";
import { toast } from "./helper.js";

export async function initPOSPage() {
  const grid = qs("#product-grid");
  if (!grid) return;
  const products = await api.products();
  renderList(grid, products, productCard);
  renderCart();

  grid.addEventListener("click", (event) => {
    const item = event.target.closest("[data-product]");
    if (!item) return;
    addToCart(products.find((product) => product.id === item.dataset.product));
  });

  qs("#pos-cart")?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-cart-action]");
    if (!action) return;
    updateCart(action.dataset.id, action.dataset.cartAction);
  });
}

function productCard(product) {
  return `
    <button class="glass-card hover-lift luxury-border p-4 text-left" data-product="${product.id}">
      <div class="flex h-28 items-center justify-center rounded-2xl bg-emerald/15 text-4xl">${product.icon}</div>
      <p class="mt-4 font-semibold">${product.name}</p>
      <p class="text-sm text-white/50">${product.category}</p>
      <p class="mt-3 text-gold font-semibold">${formatIDR(product.price)}</p>
    </button>`;
}

function addToCart(product) {
  const existing = appState.cart.find((item) => item.id === product.id);
  existing ? existing.qty++ : appState.cart.push({ ...product, qty: 1 });
  renderCart();
  toast(`${product.name} added to cart.`);
}

function updateCart(id, action) {
  const item = appState.cart.find((cartItem) => cartItem.id === id);
  if (!item) return;
  if (action === "inc") item.qty++;
  if (action === "dec") item.qty--;
  appState.cart = appState.cart.filter((cartItem) => cartItem.qty > 0);
  renderCart();
}

function renderCart() {
  const cart = qs("#pos-cart");
  if (!cart) return;
  const total = appState.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cart.innerHTML = `
    <div class="space-y-3">
      ${appState.cart.length ? appState.cart.map((item) => `
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-white/[.04] p-3">
          <div>
            <p class="font-medium">${item.name}</p>
            <p class="text-sm text-white/45">${formatIDR(item.price)} x ${item.qty}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="ghost-button !min-h-9 !px-3" data-cart-action="dec" data-id="${item.id}">-</button>
            <button class="ghost-button !min-h-9 !px-3" data-cart-action="inc" data-id="${item.id}">+</button>
          </div>
        </div>`).join("") : `<p class="text-white/50">Cart is ready for a calm transaction.</p>`}
    </div>
    <div class="mt-6 border-t border-white/10 pt-5">
      <div class="flex items-center justify-between">
        <span class="text-white/55">Total</span>
        <strong class="font-display text-3xl text-gold">${formatIDR(total)}</strong>
      </div>
      <div class="mt-5 grid grid-cols-2 gap-3">
        <button class="ghost-button" data-pay data-provider="ottopay" data-amount="${total}" data-source="qris">QRIS</button>
        <button class="ghost-button" data-pay data-provider="hitpay" data-amount="${total}" data-source="cash">Cash</button>
      </div>
      <button class="luxury-button mt-3 w-full" onclick="window.print()">Print Receipt</button>
    </div>`;
}
