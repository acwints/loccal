const OFFLINE_CACHE = "loccal-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("loccal-offline-") && key !== OFFLINE_CACHE)
      .map((key) => caches.delete(key))
  )));
});

// Calendar data, auth responses, and app pages always come from the network.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET" ||
      new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match(OFFLINE_URL)) || Response.error()
  ));
});
