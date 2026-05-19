import { createHostedPayment } from "../../../server/ottopay.service.js";

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  try {
    const payload = await readBody(request);
    const payment = await createHostedPayment(payload);
    return response.status(200).json(payment);
  } catch (error) {
    console.error("[api] OttoPay create payment error", error);
    return response.status(500).json({ error: error.message || "Unable to create OttoPay payment." });
  }
}

async function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");

  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Timestamp, Authorization, Signature");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}
