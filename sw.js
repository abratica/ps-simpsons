// App shell is cached; episode data is network-first so new weeks show up right away.
var CACHE = "ps-simpsons-v30";
var SHELL = ["./", "index.html", "css/app.css?v=29", "js/app.js?v=17", "manifest.webmanifest", "icons/icon-192.png?v=3", "fonts/chewy.woff2", "fonts/gloria-hallelujah.woff2", "fonts/manrope.woff2", "img/wordmark.webp", "img/wordmark.png", "img/coming-soon.webp", "img/coming-soon.jpg"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Pages and data are network-first so updates show on the first open; versioned assets stay cache-first.
  var isFresh = req.mode === "navigate" || /\.json(\?|$)/.test(req.url);
  if (isFresh) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req); }));
  } else {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
  }
});
