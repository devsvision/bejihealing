import { processPayment } from "../../services/payment.service.js";
import { qs } from "./core.js";
import { appState } from "./state.js";
import { toast } from "./helper.js";

export function initPaymentModal() {
  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-pay]");
    if (!trigger) return;
    const amount = Number(trigger.dataset.amount || appState.payment.lastInvoice?.amount || 0);
    const provider = trigger.dataset.provider || "midtrans";
    const result = await processPayment(provider, {
      amount,
      currency: "IDR",
      customer: trigger.dataset.customer || "Guest",
      source: trigger.dataset.source || "checkout"
    });
    appState.payment.lastInvoice = result;
    renderPaymentModal(result);
  });
}

export function renderPaymentModal(invoice) {
  const modal = qs("#modal-root");
  modal.innerHTML = `
    <section class="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" data-modal-close>
      <div class="glass-card luxury-border w-full max-w-lg p-6" onclick="event.stopPropagation()">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow">${invoice.provider} gateway</p>
            <h2 class="font-display text-3xl mt-2">Payment Created</h2>
          </div>
          <button class="ghost-button !min-h-10 !px-3" data-modal-close aria-label="Close">x</button>
        </div>
        <div class="mt-6 rounded-2xl bg-white/5 p-5">
          <p class="text-white/50 text-sm">Invoice</p>
          <p class="font-semibold text-lg">${invoice.invoiceId}</p>
          <p class="text-white/50 text-sm mt-4">Amount</p>
          <p class="text-gold font-display text-3xl">${invoice.formattedAmount}</p>
          <p class="text-white/55 text-sm mt-4">${invoice.instructions}</p>
        </div>
        <button class="luxury-button w-full mt-5" data-modal-close>Mark as Paid</button>
      </div>
    </section>`;
  modal.querySelectorAll("[data-modal-close]").forEach((node) => {
    node.addEventListener("click", () => {
      modal.innerHTML = "";
      toast("Payment status updated.");
    });
  });
}
