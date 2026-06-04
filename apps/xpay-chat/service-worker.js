const CACHE_NAME = "xpaychat-20260604-ui-refresh";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./privacy.html",
  "./terms.html",
  "./manifest.webmanifest",
  "./robots.txt",
  "./assets/xpay-logo.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./vendor/qrious.min.js",
  "./vendor/jsQR.js"
];
const CACHE_PATHS = new Set(["/", "/index.html", "/styles.css", "/app.js", "/privacy.html", "/terms.html", "/manifest.webmanifest", "/robots.txt", "/assets/xpay-logo.svg", "/assets/icon-192.png", "/assets/icon-512.png", "/assets/apple-touch-icon.png", "/vendor/qrious.min.js", "/vendor/jsQR.js"]);

function shouldCache(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin && CACHE_PATHS.has(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok || !shouldCache(event.request)) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
