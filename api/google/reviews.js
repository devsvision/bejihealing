import { getGoogleReviews } from "../../server/google-reviews.service.js";

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });

  try {
    const reviews = await getGoogleReviews();
    return response.status(200).json(reviews);
  } catch (error) {
    console.error("[api] Google reviews error", error);
    return response.status(500).json({ error: error.message || "Unable to load Google reviews." });
  }
}
