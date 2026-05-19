import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnv(rootDir = process.cwd()) {
  const envPath = resolve(rootDir, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = valueParts.join("=").trim();
  }
}

export function getOttoPayConfig() {
  const apiKey = process.env.OTTOPAY_API_KEY;
  const merchantId = process.env.OTTOPAY_MERCHANT_ID;
  const baseUrl = process.env.OTTOPAY_BASE_URL || "https://dev-secure.ottopay.id/securepage-be";

  if (!apiKey || !merchantId) {
    throw new Error("Missing OttoPay credentials. Set OTTOPAY_API_KEY and OTTOPAY_MERCHANT_ID.");
  }

  return {
    apiKey,
    merchantId,
    baseUrl: baseUrl.replace(/\/+$/, "")
  };
}
