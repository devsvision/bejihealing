import { handleCallback } from "../../server/ottopay.service.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return response(204, "");
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed" });

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    await handleCallback(payload);
  } catch (error) {
    console.error("[netlify] OttoPay callback error", error);
  }

  return response(200, {
    responseCode: "00",
    responseDescription: "Success"
  });
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
