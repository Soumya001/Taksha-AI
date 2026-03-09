const CACHE = "taksha-v1";
const SHELL = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/site.webmanifest",
];

// Install — cache app shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener("fetch", e => {
  // Skip non-GET and API calls — always go to network for those
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses for static assets
        if (res.ok && !e.request.url.includes("chrome-extension")) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("/index.html")))
  );
});
