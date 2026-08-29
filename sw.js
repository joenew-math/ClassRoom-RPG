const CACHE = "classroom-rpg-v126-20260829-student-tools-v41";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./assets/app-icon.svg", "./vendor/firebase/firebase-app-compat.js", "./vendor/firebase/firebase-auth-compat.js", "./vendor/firebase/firebase-firestore-compat.js", "./vendor/qrcode/qrcode.min.js", "./vendor/html5-qrcode/html5-qrcode.min.js", "./app/firebase-bootstrap.js", "./app/runtime-health.js", "./app/classroom-rpg.js", "./Lession/Lessionindex.html", "./Lession/app/course-content-data.js", "./Lession/app/course-catalog.js", "./Lession/app/course-leaderboard.js", "./Lession/question-bank.html", "./Lession/app/question-bank.js", "./Lession/question-bank-data.js", "./Lession/math-dungeon.html", "./Lession/app/math-dungeon.js", "./Lession/學生名冊匯入範例.xlsx"];
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
