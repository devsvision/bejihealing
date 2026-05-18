export async function createOttoPayPayment(payload) {
  return {
    invoiceId: `OTP-${Date.now()}`,
    status: "pending",
    qrString: "00020101021226660014ID.CO.QRIS.WWW",
    instructions: `OttoPay QRIS payload generated for ${payload.customer}. Replace this QR mock with a signed QRIS response.`
  };
}
