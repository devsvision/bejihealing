export async function createMidtransPayment(payload) {
  return {
    invoiceId: `MID-${Date.now()}`,
    status: "pending",
    redirectUrl: "/mock/midtrans/snap",
    instructions: `Open the Midtrans Snap checkout for ${payload.customer}. This mock is ready to be replaced with server-side token creation.`
  };
}
