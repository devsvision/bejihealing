const defaultProfile = {
  username: "beji_healing",
  name: "Beji Healing",
  biography: "Beji Healing - Wellness Center\nPalm Reading\nTarot Card Reading\nTrauma Healing\nHatha Yoga & Meditation\nBalinese Dance Class",
  followersCount: null,
  mediaCount: null,
  profilePictureUrl: "./assets/images/beji-healing-favicon.webp",
  permalink: "https://www.instagram.com/beji_healing/"
};

export async function getInstagramFeed() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Missing Instagram access token. Set INSTAGRAM_ACCESS_TOKEN.");
  }

  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (businessAccountId) return getBusinessFeed(accessToken, businessAccountId);
  return getBasicDisplayFeed(accessToken);
}

async function getBusinessFeed(accessToken, businessAccountId) {
  const limit = Number(process.env.INSTAGRAM_MEDIA_LIMIT || 12);
  const fields = [
    "username",
    "name",
    "biography",
    "followers_count",
    "media_count",
    "profile_picture_url",
    `media.limit(${limit}){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}}`
  ].join(",");
  const url = new URL(`https://graph.facebook.com/v20.0/${businessAccountId}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);

  const body = await fetchInstagram(url, "Instagram Graph media request failed.");
  return {
    profile: {
      username: body.username || defaultProfile.username,
      name: body.name || defaultProfile.name,
      biography: body.biography || defaultProfile.biography,
      followersCount: body.followers_count ?? null,
      mediaCount: body.media_count ?? null,
      profilePictureUrl: body.profile_picture_url || defaultProfile.profilePictureUrl,
      permalink: `https://www.instagram.com/${body.username || defaultProfile.username}/`
    },
    media: normalizeMedia(body.media?.data || [])
  };
}

async function getBasicDisplayFeed(accessToken) {
  const limit = Number(process.env.INSTAGRAM_MEDIA_LIMIT || 12);
  const profileUrl = new URL("https://graph.instagram.com/me");
  profileUrl.searchParams.set("fields", "id,username,media_count,account_type");
  profileUrl.searchParams.set("access_token", accessToken);

  const mediaUrl = new URL("https://graph.instagram.com/me/media");
  mediaUrl.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}");
  mediaUrl.searchParams.set("limit", String(limit));
  mediaUrl.searchParams.set("access_token", accessToken);

  const [profile, media] = await Promise.all([
    fetchInstagram(profileUrl, "Instagram Basic Display profile request failed."),
    fetchInstagram(mediaUrl, "Instagram Basic Display media request failed.")
  ]);

  return {
    profile: {
      ...defaultProfile,
      username: profile.username || defaultProfile.username,
      mediaCount: profile.media_count ?? null,
      permalink: `https://www.instagram.com/${profile.username || defaultProfile.username}/`
    },
    media: normalizeMedia(media.data || [])
  };
}

async function fetchInstagram(url, errorMessage) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[instagram-feed] request failed", { status: response.status, body });
    throw new Error(body.error?.message || errorMessage);
  }
  return body;
}

function normalizeMedia(items) {
  return items
    .map((item) => {
      const child = item.children?.data?.find((entry) => entry.media_url || entry.thumbnail_url);
      const imageUrl = item.media_type === "VIDEO"
        ? item.thumbnail_url
        : item.media_url || child?.media_url || child?.thumbnail_url;

      return {
        id: item.id,
        caption: item.caption || "",
        mediaType: item.media_type || "IMAGE",
        mediaUrl: imageUrl || "",
        permalink: item.permalink || defaultProfile.permalink,
        timestamp: item.timestamp || "",
        isCarousel: item.media_type === "CAROUSEL_ALBUM"
      };
    })
    .filter((item) => item.mediaUrl);
}
