const defaultProfile = {
  username: "beji.healing",
  displayName: "Beji Healing",
  bio: "Beji Healing wellness experiences, rituals, meditation, and Balinese healing moments.",
  followerCount: null,
  videoCount: null,
  avatarUrl: "./assets/images/beji-healing-favicon.webp",
  profileUrl: "https://www.tiktok.com/@beji.healing"
};

export async function getTikTokFeed() {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Missing TikTok access token. Set TIKTOK_ACCESS_TOKEN.");
  }

  const [profile, videos] = await Promise.all([
    fetchTikTokProfile(accessToken),
    fetchTikTokVideos(accessToken)
  ]);

  return {
    profile,
    videos
  };
}

async function fetchTikTokProfile(accessToken) {
  const fields = [
    "open_id",
    "union_id",
    "avatar_url",
    "avatar_url_100",
    "avatar_large_url",
    "display_name",
    "bio_description",
    "profile_deep_link",
    "username",
    "follower_count",
    "video_count"
  ].join(",");
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");
  url.searchParams.set("fields", fields);

  const body = await fetchTikTok(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }, "TikTok profile request failed.");

  const user = body.data?.user || {};
  return {
    username: user.username || defaultProfile.username,
    displayName: user.display_name || defaultProfile.displayName,
    bio: user.bio_description || defaultProfile.bio,
    followerCount: user.follower_count ?? null,
    videoCount: user.video_count ?? null,
    avatarUrl: user.avatar_large_url || user.avatar_url_100 || user.avatar_url || defaultProfile.avatarUrl,
    profileUrl: user.profile_deep_link || `https://www.tiktok.com/@${user.username || defaultProfile.username}`
  };
}

async function fetchTikTokVideos(accessToken) {
  const fields = [
    "id",
    "title",
    "cover_image_url",
    "share_url",
    "video_description",
    "duration",
    "create_time",
    "embed_link",
    "like_count",
    "comment_count",
    "share_count",
    "view_count"
  ].join(",");
  const limit = Number(process.env.TIKTOK_VIDEO_LIMIT || 12);
  const url = new URL("https://open.tiktokapis.com/v2/video/list/");
  url.searchParams.set("fields", fields);

  const body = await fetchTikTok(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      max_count: Math.max(1, Math.min(limit, 20))
    })
  }, "TikTok video list request failed.");

  return normalizeVideos(body.data?.videos || []);
}

async function fetchTikTok(url, options, errorMessage) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || (body.error && body.error.code && body.error.code !== "ok")) {
    console.error("[tiktok-feed] request failed", { status: response.status, body });
    throw new Error(body.error?.message || errorMessage);
  }

  return body;
}

function normalizeVideos(videos) {
  return videos
    .map((video) => ({
      id: video.id,
      title: video.title || video.video_description || "Beji Healing TikTok video",
      description: video.video_description || video.title || "",
      coverImageUrl: video.cover_image_url || "",
      shareUrl: video.share_url || video.embed_link || defaultProfile.profileUrl,
      duration: video.duration || null,
      createTime: video.create_time || null,
      viewCount: video.view_count ?? null,
      likeCount: video.like_count ?? null,
      commentCount: video.comment_count ?? null,
      shareCount: video.share_count ?? null
    }))
    .filter((video) => video.coverImageUrl);
}
