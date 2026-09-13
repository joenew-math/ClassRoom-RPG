const CACHE = "classroom-rpg-v126-20260913-campus-v93";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./assets/app-icon.svg", "./vendor/firebase/firebase-app-compat.js", "./vendor/firebase/firebase-auth-compat.js", "./vendor/firebase/firebase-firestore-compat.js", "./vendor/qrcode/qrcode.min.js", "./vendor/html5-qrcode/html5-qrcode.min.js", "./app/firebase-bootstrap.js", "./app/runtime-health.js", "./app/classroom-game-data.js", "./app/classroom-skill-data.js", "./app/classroom-policy-data.js", "./app/classroom-avatar-data.js", "./app/classroom-art.js", "./app/classroom-rule-functions.js", "./app/classroom-skill-rules.js", "./app/classroom-cloud.js", "./app/classroom-auth.js", "./app/classroom-quiz.js", "./app/classroom-battle.js", "./app/classroom-parent.js", "./app/classroom-teacher.js", "./app/classroom-student.js", "./app/classroom-board.js", "./app/classroom-rpg.js", "./Lession/Lessionindex.html", "./Lession/app/course-content-data.js", "./Lession/app/course-catalog.js", "./Lession/app/course-leaderboard.js", "./Lession/question-bank.html", "./Lession/app/question-bank.js", "./Lession/question-bank-data.js", "./Lession/math-dungeon.html", "./Lession/app/math-dungeon-load-policy.js", "./Lession/app/math-dungeon-data.js", "./Lession/app/math-dungeon-monster-data.js", "./Lession/app/math-dungeon-core.js", "./Lession/app/math-dungeon-card-rules.js", "./Lession/app/math-dungeon-state.js", "./Lession/app/math-dungeon-combat-art.css", "./Lession/app/math-dungeon-combat-art.js", "./Lession/app/math-dungeon-network.js", "./Lession/app/math-dungeon-classroom.js", "./Lession/app/math-dungeon-learning.js", "./Lession/app/math-dungeon-pets.js", "./Lession/assets/monsters/monster-atlas-foundation-v1.js", "./Lession/assets/monsters/monster-atlas-foundation-v1.png", "./Lession/assets/npcs/math-teacher-v1.png", "./Lession/app/math-dungeon-gameplay.js", "./Lession/app/math-dungeon.js", "./Lession/學生名冊匯入範例.xlsx"];
CORE.push("./app/classroom-polish.css", "./app/classroom-pixel-set-data.js", "./app/classroom-pixel-set-atlas.js", "./app/classroom-pixel-sets.js");
CORE.push("./app/classroom-equipment-art.js");
CORE.push("./app/classroom-dungeon-editor.js", "./Lession/app/math-dungeon-campus-data.js", "./Lession/app/math-dungeon-campus.js");
CORE.push("./app/interface-tokens.css", "./app/classroom-interface.css", "./Lession/app/learning-interface.css", "./Lession/app/dungeon-interface.css");
CORE.push("./assets/pixel-sets/star-knight-v1.webp", "./assets/pixel-sets/crystal-sage-v1.webp", "./assets/pixel-sets/jade-hunter-v1.webp", "./assets/pixel-sets/dawn-oracle-v1.webp");
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
