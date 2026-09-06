const CACHE = "localjot-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
);

// Network-first for same-origin GET requests, falling back to whatever was
// last cached when offline. Model weights are fetched from a CDN origin and
// are cached by the browser/ORT's own storage layer, not here.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin && e.request.method === "GET") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
