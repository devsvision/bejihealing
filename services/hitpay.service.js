export async function createHitPayPayment(payload) {
  return {
    invoiceId: `HIT-${Date.now()}`,
    status: "pending",
    redirectUrl: "/mock/hitpay/checkout",
    instructions: `HitPay payment request prepared for ${payload.source}. Connect API keys on the backend service before production.`
  };
}
