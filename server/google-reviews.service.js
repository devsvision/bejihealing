const defaultSearchQuery = "Beji Healing Bali";

export async function getGoogleReviews() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Google Places API key. Set GOOGLE_PLACES_API_KEY.");
  }

  const placeId = process.env.GOOGLE_PLACE_ID || await findPlaceId(apiKey);
  if (!placeId) throw new Error("Unable to find Google Place ID for Beji Healing.");

  const place = await fetchPlaceDetails(apiKey, placeId);
  return {
    source: "google",
    placeId,
    placeName: place.displayName?.text || "Beji Healing",
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || null,
    reviews: normalizeReviews(place.reviews || [])
  };
}

async function findPlaceId(apiKey) {
  const query = process.env.GOOGLE_PLACE_SEARCH_QUERY || defaultSearchQuery;
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress"
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "en"
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[google-reviews] Text Search failed", { status: response.status, body });
    throw new Error("Google Places Text Search failed.");
  }

  return body.places?.[0]?.id || "";
}

async function fetchPlaceDetails(apiKey, placeId) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews"
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[google-reviews] Place Details failed", { placeId, status: response.status, body });
    throw new Error("Google Places Details failed.");
  }

  return body;
}

function normalizeReviews(reviews) {
  return reviews
    .filter((review) => review.text?.text || review.originalText?.text)
    .map((review) => ({
      authorName: review.authorAttribution?.displayName || "Google reviewer",
      authorPhotoUrl: review.authorAttribution?.photoUri || "",
      authorUrl: review.authorAttribution?.uri || "",
      rating: Number(review.rating || 5),
      relativeTime: review.relativePublishTimeDescription || "",
      text: review.text?.text || review.originalText?.text || "",
      url: review.googleMapsUri || review.name || ""
    }));
}
