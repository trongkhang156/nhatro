const CACHE_NAME = "room-billing-cache-v1";
const urlsToCache = ["/","/index.html","/manifest.json"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(urlsToCache)));
});

self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.map(k=>k!==CACHE_NAME?caches.delete(k):null)
  )));
});

self.addEventListener("fetch", e=>{
  e.respondWith(caches.match(e.request).then(resp=>resp||fetch(e.request)));
});
