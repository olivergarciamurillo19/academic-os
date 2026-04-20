/* Academic OS — minimal service worker (no external deps)
 * Strategy summary:
 *   - Precache the offline shell: /offline, manifest, icons
 *   - Static assets (same-origin /_next/static, /icons): cache-first with SWR
 *   - API responses (/api/*): network-first, fall back to cache when offline
 *   - Everything else: network-first
 *
 * Replace with Workbox / Serwist if/when we need background sync or
 * precaching the full App Router manifest.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `academic-os-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `academic-os-static-${CACHE_VERSION}`;
const API_CACHE = `academic-os-api-${CACHE_VERSION}`;

const SHELL_ASSETS = ["/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) => ![SHELL_CACHE, STATIC_CACHE, API_CACHE].includes(k),
          )
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Static assets → cache-first + SWR
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchAndCache = fetch(req)
          .then((resp) => {
            if (resp.ok) cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || fetchAndCache;
      }),
    );
    return;
  }

  // API → network-first with stale fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          if (resp.ok) caches.open(API_CACHE).then((c) => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then((cached) => cached || Response.error())),
    );
    return;
  }

  // Navigations → fall back to /offline when the network fails
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline").then((r) => r || Response.error())),
    );
  }
});
