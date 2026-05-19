import { createHmac } from "node:crypto";

export function createOttoPaySignature(body, timestamp, apiKey) {
  const sanitizedBody = JSON.stringify(body)
    .replace(/[^a-zA-Z0-9{}:.,]/g, "")
    .toLowerCase();
  const signaturePayload = `${sanitizedBody}&${timestamp}&${apiKey}`;

  return createHmac("sha512", apiKey)
    .update(signaturePayload)
    .digest("hex");
}
