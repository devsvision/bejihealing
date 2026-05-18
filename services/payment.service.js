import { createMidtransPayment } from "./midtrans.service.js";
import { createHitPayPayment } from "./hitpay.service.js";
import { createOttoPayPayment } from "./ottopay.service.js";
import { formatIDR } from "../assets/js/core.js";

const providers = {
  midtrans: createMidtransPayment,
  hitpay: createHitPayPayment,
  ottopay: createOttoPayPayment
};

export async function processPayment(provider, payload) {
  const gateway = providers[provider];
  if (!gateway) throw new Error(`Unsupported payment provider: ${provider}`);
  const response = await gateway(payload);
  return {
    ...response,
    provider,
    amount: payload.amount,
    formattedAmount: formatIDR(payload.amount)
  };
}
