import { getInstagramFeed } from "../../server/instagram-feed.service.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return response(204, "");
  if (event.httpMethod !== "GET") return response(405, { error: "Method not allowed" });

  try {
    const feed = await getInstagramFeed();
    return response(200, feed);
  } catch (error) {
    console.error("[netlify] Instagram feed error", error);
    return response(500, { error: error.message || "Unable to load Instagram feed." });
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json; charset=utf-8"
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  };
}
