const CACHE = "classroom-rpg-v126-20260827-manual-class-start-v24";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./assets/app-icon.svg", "./vendor/firebase/firebase-app-compat.js", "./vendor/firebase/firebase-auth-compat.js", "./vendor/firebase/firebase-firestore-compat.js", "./vendor/qrcode/qrcode.min.js", "./Lession/Lessionindex.html", "./Lession/question-bank.html", "./Lession/question-bank-data.js", "./Lession/math-dungeon.html", "./Lession/學生名冊匯入範例.xlsx"];
const NEVER_CACHE = /(?:firestore|googleapis|gstatic\.com\/firebasejs|identitytoolkit|securetoken)/i;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || NEVER_CACHE.test(request.url)) return;
  const isPage = request.mode === "navigate";
  event.respondWith(
    fetch(request).then(response => {
      if (response && (response.ok || response.type === "opaque")) {
        caches.open(CACHE).then(cache => cache.put(request, response.clone())).catch(() => null);
      }
      return response;
    }).catch(() => caches.match(request).then(hit => hit || (isPage ? caches.match("./index.html") : Response.error())))
  );
});
