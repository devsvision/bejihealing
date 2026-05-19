import { api } from "./api.js";
import { qsa } from "./core.js";

export function initAnimations() {
  initScrollAnimations();
  luxuryParallax();
  initHeroLight();
  initCounters();
  initServiceToggle();
  initRitualTabs();
  initRitualGallery();
  initRitualServicePagination();
  initPackageServicePagination();
  initHealerPagination();
  initHealerPhotoModal();
  initInstagramGallery();
  initTikTokGallery();
  initTestimonials();
}

export function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: .14 });

  qsa(".reveal").forEach((node) => observer.observe(node));
}

export function luxuryParallax() {
  const targets = qsa(".parallax-slow");
  if (!targets.length) return;
  let ticking = false;
  const update = () => {
    const offset = window.scrollY * -0.06;
    targets.forEach((node) => {
      node.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
    ticking = false;
  };
  window.onscroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };
}

export function initHeroLight() {
  const hero = document.querySelector("[data-hero-light]");
  if (!hero || hero.dataset.lightReady === "true") return;
  hero.dataset.lightReady = "true";

  const position = { x: 50, y: 38 };
  const target = { x: 50, y: 38 };
  let ticking = false;

  const render = () => {
    position.x += (target.x - position.x) * 0.12;
    position.y += (target.y - position.y) * 0.12;
    hero.style.setProperty("--light-x", `${position.x}%`);
    hero.style.setProperty("--light-y", `${position.y}%`);
    ticking = Math.abs(target.x - position.x) > 0.05 || Math.abs(target.y - position.y) > 0.05;
    if (ticking) requestAnimationFrame(render);
  };

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width) * 100;
    target.y = ((event.clientY - rect.top) / rect.height) * 100;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  });

  hero.addEventListener("pointerleave", () => {
    target.x = 50;
    target.y = 38;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  });
}

export function initCounters() {
  const counters = [...document.querySelectorAll("[data-counter]")].filter((node) => node.dataset.counted !== "true");
  bindCounterHover();
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      node.dataset.counted = "true";
      animateCounter(node, Number(node.dataset.target || 0));
      observer.unobserve(node);
    });
  }, { threshold: .35 });

  counters.forEach((node) => observer.observe(node));
}

export function initServiceToggle() {
  const toggle = document.querySelector("[data-service-toggle]");
  if (!toggle || toggle.dataset.ready === "true") return;
  toggle.dataset.ready = "true";
  toggle.dataset.active = "ritual";

  toggle.addEventListener("click", (event) => {
    const button = event.target.closest("[data-service-tab]");
    if (!button) return;
    const active = button.dataset.serviceTab;
    toggle.dataset.active = active;
    document.querySelectorAll("[data-service-tab]").forEach((node) => {
      node.classList.toggle("is-active", node.dataset.serviceTab === active);
    });
    document.querySelectorAll("[data-service-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.servicePanel !== active);
    });
  });
}

export function initRitualTabs() {
  document.querySelectorAll(".ritual-service-card").forEach((card) => {
    if (card.dataset.tabsReady === "true") return;
    card.dataset.tabsReady = "true";
    card.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-ritual-tab]");
      if (!tab) return;
      const active = tab.dataset.ritualTab;
      card.querySelectorAll("[data-ritual-tab]").forEach((node) => {
        node.classList.toggle("is-active", node.dataset.ritualTab === active);
      });
      card.querySelectorAll("[data-ritual-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.ritualPanel !== active);
      });
    });
  });
}

export function initRitualGallery() {
  document.querySelectorAll("[data-gallery-photos]").forEach((button) => {
    if (button.dataset.galleryReady === "true") return;
    button.dataset.galleryReady = "true";
    button.addEventListener("click", () => {
      const photos = button.dataset.galleryPhotos.split("|").filter(Boolean);
      openGallery(button.dataset.galleryTitle || "Gallery", photos);
    });
  });
}

export function initRitualServicePagination() {
  initServicePanelPagination({
    panelSelector: '[data-service-panel="ritual"]',
    cardSelector: "[data-ritual-card]",
    viewMoreSelector: "[data-ritual-view-more]",
    paginationSelector: "[data-ritual-pagination]"
  });
}

export function initPackageServicePagination() {
  initServicePanelPagination({
    panelSelector: '[data-service-panel="packages"]',
    cardSelector: "[data-service-card]",
    viewMoreSelector: "[data-service-view-more]",
    paginationSelector: "[data-service-pagination]"
  });
}

export function initHealerPagination() {
  initServicePanelPagination({
    panelSelector: "#healers",
    cardSelector: "[data-healer-card]",
    viewMoreSelector: "[data-healer-view-more]",
    paginationSelector: "[data-healer-pagination]"
  });
}

export function initHealerPhotoModal() {
  document.querySelectorAll("[data-healer-photo]").forEach((photo) => {
    if (photo.dataset.photoReady === "true") return;
    photo.dataset.photoReady = "true";
    photo.addEventListener("click", () => {
      openSinglePhoto(photo.dataset.fullSrc || photo.src, photo.alt || "Healer photo");
    });
  });
}

export function initTestimonials() {
  const track = document.querySelector("[data-testimonial-track]");
  const dots = document.querySelector("[data-testimonial-dots]");
  if (!track || !dots || track.dataset.ready === "true") return;
  track.dataset.ready = "true";

  loadGoogleTestimonials(track, dots).catch((error) => {
    console.warn("[testimonials] Google reviews fallback active", error);
    setupTestimonials(track, dots);
  });
}

async function loadGoogleTestimonials(track, dots) {
  const data = await api.googleReviews();
  if (!data.reviews?.length) {
    setupTestimonials(track, dots);
    return;
  }

  track.innerHTML = data.reviews.map(renderGoogleReviewCard).join("");
  const ratingLabel = document.querySelector("[data-google-review-label]");
  if (ratingLabel) {
    const rating = data.rating ? Number(data.rating).toFixed(1).replace(/\.0$/, "") : "5";
    const count = data.userRatingCount ? ` from ${Number(data.userRatingCount).toLocaleString("en-US")} reviews` : "";
    ratingLabel.innerHTML = `${rating} <span>${renderStars(Math.round(data.rating || 5))}</span>${count}`;
  }
  setupTestimonials(track, dots);
}

export function initInstagramGallery() {
  const track = document.querySelector("[data-instagram-track]");
  const carousel = document.querySelector("[data-instagram-gallery]");
  if (!track || !carousel || track.dataset.ready === "true") return;
  track.dataset.ready = "true";

  loadInstagramGallery(track).finally(() => {
    setupInstagramCarousel(track, carousel);
    window.lucide?.createIcons();
  });
}

export function initTikTokGallery() {
  const track = document.querySelector("[data-tiktok-track]");
  const carousel = document.querySelector("[data-tiktok-gallery]");
  if (!track || !carousel || track.dataset.ready === "true") return;
  track.dataset.ready = "true";

  loadTikTokGallery(track).finally(() => {
    setupMediaCarousel(track, carousel, "[data-tiktok-prev]", "[data-tiktok-next]");
    window.lucide?.createIcons();
  });
}

async function loadTikTokGallery(track) {
  try {
    const feed = await api.tiktokFeed();
    updateTikTokProfile(feed.profile);
    if (feed.videos?.length) track.innerHTML = feed.videos.map(renderTikTokCard).join("");
  } catch (error) {
    console.warn("[tiktok] fallback gallery active", error);
  }
}

function updateTikTokProfile(profile = {}) {
  const username = profile.username || "beji.healing";
  const avatar = document.querySelector("[data-tiktok-avatar]");
  const usernameNode = document.querySelector("[data-tiktok-username]");
  const videosNode = document.querySelector("[data-tiktok-videos]");
  const followersNode = document.querySelector("[data-tiktok-followers]");
  const bioNode = document.querySelector("[data-tiktok-bio]");
  const follow = document.querySelector(".tiktok-follow");

  if (avatar && profile.avatarUrl) avatar.src = profile.avatarUrl;
  if (usernameNode) usernameNode.textContent = `@${username}`;
  if (videosNode && profile.videoCount !== null && profile.videoCount !== undefined) videosNode.textContent = Number(profile.videoCount).toLocaleString("en-US");
  if (followersNode && profile.followerCount !== null && profile.followerCount !== undefined) followersNode.textContent = `${Number(profile.followerCount).toLocaleString("en-US")} Followers`;
  if (bioNode && profile.bio) bioNode.textContent = profile.bio;
  if (follow) follow.href = profile.profileUrl || `https://www.tiktok.com/@${username}`;
}

function renderTikTokCard(video) {
  return `
    <a class="tiktok-card" href="${escapeAttribute(video.shareUrl)}" target="_blank" rel="noopener" aria-label="Open TikTok video">
      <img src="${escapeAttribute(video.coverImageUrl)}" alt="${escapeAttribute(video.title || "Beji Healing TikTok video")}" loading="lazy" />
      <span><i data-lucide="music-2"></i></span>
      <p>${escapeHTML(video.title || video.description || "Beji Healing")}</p>
    </a>`;
}

async function loadInstagramGallery(track) {
  try {
    const feed = await api.instagramFeed();
    updateInstagramProfile(feed.profile);
    if (feed.media?.length) track.innerHTML = feed.media.map(renderInstagramCard).join("");
  } catch (error) {
    console.warn("[instagram] fallback gallery active", error);
  }
}

function updateInstagramProfile(profile = {}) {
  const username = profile.username || "beji_healing";
  const permalink = profile.permalink || `https://www.instagram.com/${username}/`;
  const avatar = document.querySelector("[data-instagram-avatar]");
  const usernameNode = document.querySelector("[data-instagram-username]");
  const postsNode = document.querySelector("[data-instagram-posts]");
  const followersNode = document.querySelector("[data-instagram-followers]");
  const bioNode = document.querySelector("[data-instagram-bio]");
  const follow = document.querySelector(".instagram-follow");

  if (avatar && profile.profilePictureUrl) avatar.src = profile.profilePictureUrl;
  if (usernameNode) usernameNode.textContent = `@${username}`;
  if (postsNode && profile.mediaCount !== null && profile.mediaCount !== undefined) postsNode.textContent = Number(profile.mediaCount).toLocaleString("en-US");
  if (followersNode && profile.followersCount !== null && profile.followersCount !== undefined) followersNode.textContent = Number(profile.followersCount).toLocaleString("en-US");
  if (bioNode && profile.biography) bioNode.innerHTML = escapeHTML(profile.biography).replaceAll("\n", "<br />");
  if (follow) follow.href = permalink;
}

function renderInstagramCard(item) {
  const icon = item.isCarousel ? "gallery-horizontal" : item.mediaType === "VIDEO" ? "video" : "instagram";
  return `
    <a class="instagram-card" href="${escapeAttribute(item.permalink)}" target="_blank" rel="noopener" aria-label="Open Instagram post">
      <img src="${escapeAttribute(item.mediaUrl)}" alt="${escapeAttribute(item.caption || "Beji Healing Instagram post")}" loading="lazy" />
      <span><i data-lucide="${icon}"></i></span>
    </a>`;
}

function setupInstagramCarousel(track, carousel) {
  setupMediaCarousel(track, carousel, "[data-instagram-prev]", "[data-instagram-next]");
}

function setupMediaCarousel(track, carousel, prevSelector, nextSelector) {
  const prev = carousel.querySelector(prevSelector);
  const next = carousel.querySelector(nextSelector);
  let index = 0;
  let timer = null;

  const visibleCount = () => window.innerWidth <= 640 ? 1 : window.innerWidth <= 920 ? 2 : 3;
  const maxIndex = () => Math.max(0, track.children.length - visibleCount());
  const render = () => {
    index = Math.max(0, Math.min(index, maxIndex()));
    const firstCard = track.children[0];
    if (!firstCard) return;
    const gap = parseFloat(getComputedStyle(track).gap || 0);
    const offset = index * (firstCard.getBoundingClientRect().width + gap);
    track.style.transform = `translateX(${-offset}px)`;
    prev.disabled = index === 0;
    next.disabled = index === maxIndex();
  };
  const advance = () => {
    if (maxIndex() <= 0) return;
    index = index >= maxIndex() ? 0 : index + 1;
    render();
  };
  const start = () => {
    clearInterval(timer);
    timer = setInterval(advance, 3600);
  };

  prev?.addEventListener("click", () => {
    index -= 1;
    render();
    start();
  });
  next?.addEventListener("click", () => {
    index += 1;
    render();
    start();
  });
  carousel.addEventListener("mouseenter", () => clearInterval(timer));
  carousel.addEventListener("mouseleave", start);
  window.addEventListener("resize", () => {
    render();
    start();
  });
  render();
  start();
}

function setupTestimonials(track, dots) {
  const cards = [...track.children];
  if (!cards.length) return;
  const perPage = () => window.innerWidth <= 640 ? 1 : window.innerWidth <= 900 ? 2 : 3;
  let page = 0;
  let timer = null;

  const renderDots = () => {
    const total = Math.ceil(cards.length / perPage());
    dots.innerHTML = Array.from({ length: total }, (_, index) => `<button type="button" class="${index === page ? "is-active" : ""}" data-testimonial-page="${index}" aria-label="Show testimonial page ${index + 1}"></button>`).join("");
  };

  const render = () => {
    const size = cards[0].getBoundingClientRect().width + 16;
    const total = Math.ceil(cards.length / perPage());
    page = page % total;
    track.style.transform = `translateX(${-page * perPage() * size}px)`;
    renderDots();
  };

  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => {
      page += 1;
      render();
    }, 3600);
  };

  dots.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-testimonial-page]");
    if (!dot) return;
    page = Number(dot.dataset.testimonialPage);
    render();
    start();
  });

  window.addEventListener("resize", () => {
    page = 0;
    render();
  });

  render();
  start();
}

function renderGoogleReviewCard(review) {
  const photo = review.authorPhotoUrl || "./assets/images/beji-healing-favicon.webp";
  const authorUrl = review.authorUrl ? ` href="${escapeAttribute(review.authorUrl)}" target="_blank" rel="noopener"` : "";
  return `
    <article class="testimonial-card">
      <img src="${escapeAttribute(photo)}" alt="${escapeAttribute(review.authorName)}" />
      <span class="google-mark">G</span>
      <h3>${escapeHTML(review.authorName)} <b>✓</b></h3>
      <p class="stars">${renderStars(review.rating)}</p>
      <small>${escapeHTML(review.relativeTime || "Google review")}</small>
      <p class="quote">${escapeHTML(review.text)}</p>
      ${review.authorUrl ? `<a class="testimonial-source" ${authorUrl}>View on Google</a>` : ""}
    </article>`;
}

function renderStars(rating) {
  const rounded = Math.max(1, Math.min(5, Math.round(Number(rating || 5))));
  return "★".repeat(rounded);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}

function openSinglePhoto(src, title) {
  const root = document.querySelector("#modal-root");
  if (!root) return;
  root.innerHTML = `
    <section class="gallery-modal" data-photo-close>
      <div class="gallery-dialog healer-photo-dialog" onclick="event.stopPropagation()">
        <div class="gallery-header">
          <h3>${title}</h3>
          <button class="gallery-close" type="button" data-photo-close aria-label="Close photo">x</button>
        </div>
        <div class="healer-photo-stage">
          <img src="${src}" alt="${title}" />
        </div>
      </div>
    </section>`;

  root.querySelectorAll("[data-photo-close]").forEach((node) => {
    node.addEventListener("click", () => root.innerHTML = "");
  });
}

function initServicePanelPagination({ panelSelector, cardSelector, viewMoreSelector, paginationSelector }) {
  const panel = document.querySelector(panelSelector);
  if (!panel || panel.dataset.paginationReady === "true") return;
  panel.dataset.paginationReady = "true";

  const cards = [...panel.querySelectorAll(cardSelector)];
  const viewMore = panel.querySelector(viewMoreSelector);
  const pagination = panel.querySelector(paginationSelector);
  const initialLimit = 3;
  const pageSize = 6;
  let expanded = false;
  let page = 1;

  const render = () => {
    const totalPages = Math.ceil(cards.length / pageSize);
    cards.forEach((card, index) => {
      let visible = index < initialLimit;
      if (expanded) {
        const start = (page - 1) * pageSize;
        visible = index >= start && index < start + pageSize;
      }
      card.classList.toggle("hidden", !visible);
    });

    if (viewMore) {
      viewMore.classList.toggle("hidden", expanded || cards.length <= initialLimit);
    }

    if (!pagination) return;
    pagination.classList.toggle("hidden", !expanded || totalPages <= 1);
    if (!expanded || totalPages <= 1) return;

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
    pagination.innerHTML = `
      <button type="button" data-page-prev ${page === 1 ? "disabled" : ""} aria-label="Previous page">&lt;</button>
      ${pages.map((item) => `<button type="button" class="${item === page ? "is-active" : ""}" data-page="${item}">${item}</button>`).join("")}
      <button type="button" data-page-next ${page === totalPages ? "disabled" : ""} aria-label="Next page">&gt;</button>`;
  };

  viewMore?.addEventListener("click", () => {
    expanded = true;
    page = 1;
    render();
  });

  pagination?.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    const totalPages = Math.ceil(cards.length / pageSize);
    if (target.dataset.pagePrev !== undefined) page = Math.max(1, page - 1);
    if (target.dataset.pageNext !== undefined) page = Math.min(totalPages, page + 1);
    if (target.dataset.page) page = Number(target.dataset.page);
    render();
  });

  render();
}

function openGallery(title, photos) {
  const root = document.querySelector("#modal-root");
  if (!root || !photos.length) return;
  let index = 0;

  const render = () => {
    const hasMany = photos.length > 1;
    root.innerHTML = `
      <section class="gallery-modal" data-gallery-close>
        <div class="gallery-dialog" onclick="event.stopPropagation()">
          <div class="gallery-header">
            <h3>${title}</h3>
            <button class="gallery-close" type="button" data-gallery-close aria-label="Close gallery">x</button>
          </div>
          <div class="gallery-stage">
            <img src="${photos[index]}" alt="${title} photo ${index + 1}" />
            ${hasMany ? `<button class="gallery-nav prev" type="button" data-gallery-prev aria-label="Previous photo">&lt;</button>` : ""}
            ${hasMany ? `<button class="gallery-nav next" type="button" data-gallery-next aria-label="Next photo">&gt;</button>` : ""}
          </div>
          <div class="gallery-footer">${index + 1} / ${photos.length}</div>
        </div>
      </section>`;

    root.querySelectorAll("[data-gallery-close]").forEach((node) => {
      node.addEventListener("click", () => root.innerHTML = "");
    });
    root.querySelector("[data-gallery-prev]")?.addEventListener("click", () => {
      index = (index - 1 + photos.length) % photos.length;
      render();
    });
    root.querySelector("[data-gallery-next]")?.addEventListener("click", () => {
      index = (index + 1) % photos.length;
      render();
    });
  };

  render();
}

function bindCounterHover() {
  document.querySelectorAll(".hero-counter-card article").forEach((card) => {
    if (card.dataset.hoverReady === "true") return;
    card.dataset.hoverReady = "true";
    card.addEventListener("mouseenter", () => {
      const counter = card.querySelector("[data-counter]");
      if (!counter) return;
      animateCounter(counter, Number(counter.dataset.target || 0));
    });
  });
}

function animateCounter(node, target) {
  if (node.dataset.animating === "true") return;
  node.dataset.animating = "true";
  node.textContent = "0";
  const duration = 1400;
  const start = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const tick = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const value = Math.round(target * easeOut(progress));
    node.textContent = value.toLocaleString("en-US");
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      node.dataset.animating = "false";
    }
  };

  requestAnimationFrame(tick);
}
