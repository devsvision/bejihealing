import { createHostedPayment } from "../../server/ottopay.service.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return response(204, "");
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed" });

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const payment = await createHostedPayment(payload);
    return response(200, payment);
  } catch (error) {
    console.error("[netlify] OttoPay create payment error", error);
    return response(500, { error: error.message || "Unable to create OttoPay payment." });
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Timestamp, Authorization, Signature",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json; charset=utf-8"
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  };
}
