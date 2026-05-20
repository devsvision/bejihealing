import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { loadEnv } from "./server/config.js";
import { getGoogleReviews } from "./server/google-reviews.service.js";
import { getInstagramFeed } from "./server/instagram-feed.service.js";
import { createHostedPayment, handleCallback } from "./server/ottopay.service.js";
import { getTikTokFeed } from "./server/tiktok-feed.service.js";

loadEnv();

const rootDir = process.cwd();
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") return sendNoContent(response);

    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/payments/ottopay/create" && request.method === "POST") {
      return handleCreatePayment(request, response);
    }
    if (url.pathname === "/api/ottopay/callback" && request.method === "POST") {
      return handleOttoPayCallback(request, response);
    }
    if (url.pathname === "/api/google/reviews" && request.method === "GET") {
      return handleGoogleReviews(response);
    }
    if (url.pathname === "/api/instagram/feed" && request.method === "GET") {
      return handleInstagramFeed(response);
    }
    if (url.pathname === "/api/tiktok/feed" && request.method === "GET") {
      return handleTikTokFeed(response);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return sendJson(response, 405, { error: "Method not allowed" });
    }
    return serveStatic(url.pathname, response, request.method === "HEAD");
  } catch (error) {
    console.error("[server] unhandled error", error);
    return sendJson(response, 500, { error: "Internal server error" });
  }
});

server.listen(port, () => {
  console.info(`[server] Beji Healing running at http://localhost:${port}/#/home`);
});

async function handleCreatePayment(request, response) {
  try {
    const payload = await readJson(request);
    const payment = await createHostedPayment(payload);
    return sendJson(response, 200, payment);
  } catch (error) {
    console.error("[api] OttoPay create payment error", error);
    return sendJson(response, 500, { error: error.message || "Unable to create OttoPay payment." });
  }
}

async function handleOttoPayCallback(request, response) {
  try {
    const payload = await readJson(request);
    await handleCallback(payload);
    return sendJson(response, 200, {
      responseCode: "00",
      responseDescription: "Success"
    });
  } catch (error) {
    console.error("[api] OttoPay callback error", error);
    return sendJson(response, 200, {
      responseCode: "00",
      responseDescription: "Success"
    });
  }
}

async function handleGoogleReviews(response) {
  try {
    const reviews = await getGoogleReviews();
    return sendJson(response, 200, reviews);
  } catch (error) {
    console.error("[api] Google reviews error", error);
    return sendJson(response, 500, { error: error.message || "Unable to load Google reviews." });
  }
}

async function handleInstagramFeed(response) {
  try {
    const feed = await getInstagramFeed();
    return sendJson(response, 200, feed);
  } catch (error) {
    console.error("[api] Instagram feed error", error);
    return sendJson(response, 500, { error: error.message || "Unable to load Instagram feed." });
  }
}

async function handleTikTokFeed(response) {
  try {
    const feed = await getTikTokFeed();
    return sendJson(response, 200, feed);
  } catch (error) {
    console.error("[api] TikTok feed error", error);
    return sendJson(response, 500, { error: error.message || "Unable to load TikTok feed." });
  }
}

async function serveStatic(pathname, response, headOnly = false) {
  const requestedPath = pathname === "/" || pathname === "/fo" ? "/index.html" : decodeURIComponent(pathname);
  const normalizedPath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(rootDir, `.${normalizedPath}`);

  if (!filePath.startsWith(rootDir)) {
    return sendJson(response, 403, { error: "Forbidden" });
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    if (!headOnly) response.end(content);
    else response.end();
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        const notFound = await readFile(join(rootDir, "404.html"));
        response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        return response.end(notFound);
      } catch {
        return sendJson(response, 404, { error: "Not found" });
      }
    }
    throw error;
  }
}

function readJson(request) {
  return new Promise((resolveJson, reject) => {
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
        resolveJson(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Timestamp, Authorization, Signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

function sendNoContent(response) {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Timestamp, Authorization, Signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  response.end();
}
