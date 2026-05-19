import { randomUUID } from "node:crypto";
import { getOttoPayConfig } from "./config.js";
import { createOttoPaySignature } from "./ottopay-signature.js";
import { saveTransaction, updateTransactionStatus } from "./transaction-store.js";

const paymentStatusMap = {
  "00": "SUCCESS",
  "11": "FAILED",
  "41": "EXPIRED",
  "39": "CANCELLED",
  "12": "REFUNDED",
  "68": "PENDING"
};

export function mapOttoPayStatus(code) {
  return paymentStatusMap[String(code)] || "PENDING";
}

export async function createHostedPayment(payload) {
  validateCreatePaymentPayload(payload);

  const config = getOttoPayConfig();
  const orderId = payload.orderId || `INV-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const amount = Number(payload.amount);
  const requestBody = {
    customerDetails: {
      email: payload.customerDetails.email,
      firstName: payload.customerDetails.firstName,
      lastName: payload.customerDetails.lastName,
      phone: normalizePhone(payload.customerDetails.phone)
    },
    transactionDetails: {
      amount,
      currency: "IDR",
      merchantName: payload.merchantName || "BEJI HEALING",
      orderId,
      paymentMethod: 7
    }
  };
  const timestamp = new Date().toISOString();
  const signature = createOttoPaySignature(requestBody, timestamp, config.apiKey);
  const authorization = `Basic ${Buffer.from(config.merchantId).toString("base64")}`;
  const url = `${config.baseUrl}/payment-services/v2.1.0/api/token`;

  console.info("[ottopay] creating hosted payment", { orderId, amount });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Timestamp: timestamp,
      Authorization: authorization,
      Signature: signature
    },
    body: JSON.stringify(requestBody)
  });

  const responseText = await response.text();
  let responseBody;
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = { raw: responseText };
  }

  if (!response.ok) {
    console.error("[ottopay] create payment failed", { orderId, status: response.status, responseBody });
    throw new Error(`OttoPay create payment failed with HTTP ${response.status}`);
  }

  const endpointUrl = findEndpointUrl(responseBody);
  if (!endpointUrl) {
    console.error("[ottopay] endpointUrl missing", { orderId, responseBody });
    throw new Error("OttoPay response did not include endpointUrl.");
  }

  await saveTransaction({
    orderId,
    booking: payload.booking || null,
    customerDetails: requestBody.customerDetails,
    transactionDetails: requestBody.transactionDetails,
    provider: "ottopay",
    paymentMethod: "QRIS",
    status: "PENDING",
    endpointUrl,
    gatewayResponse: responseBody,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return {
    orderId,
    endpointUrl,
    status: "PENDING"
  };
}

export async function handleCallback(payload) {
  const orderId = payload.orderId || payload.transactionDetails?.orderId || payload.merchantOrderId;
  const code = payload.responseCode || payload.statusCode || payload.transactionStatus;
  const status = mapOttoPayStatus(code);

  if (!orderId) {
    console.error("[ottopay] callback missing orderId", payload);
    throw new Error("OttoPay callback missing orderId.");
  }

  console.info("[ottopay] callback received", { orderId, code, status });
  return updateTransactionStatus(orderId, status, payload);
}

function validateCreatePaymentPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Payment payload is required.");
  if (!Number.isFinite(Number(payload.amount)) || Number(payload.amount) <= 0) throw new Error("Valid payment amount is required.");

  const customer = payload.customerDetails || {};
  if (!customer.email) throw new Error("Customer email is required.");
  if (!customer.firstName) throw new Error("Customer first name is required.");
  if (!customer.lastName) throw new Error("Customer last name is required.");
  if (!customer.phone) throw new Error("Customer phone is required.");
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function findEndpointUrl(responseBody) {
  return responseBody.endpointUrl
    || responseBody.data?.endpointUrl
    || responseBody.responseData?.endpointUrl
    || responseBody.result?.endpointUrl;
}
