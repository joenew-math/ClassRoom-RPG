/* firebase-bootstrap.js
 * 從 班級RPG-公會大廳v126.html 拆出的傳統全域 runtime。
 * 請保留為一般 script，不要直接改成 type=module，避免破壞既有 inline handlers。
 */
/* ── Firebase 初始化(階段1:僅登入;資料仍在本機)── */
var FB = { ready:false, auth:null, user:null, db:null };
/* 正式部署後填入 Cloudflare Workers 免費後端網址；教師離線時交易仍可運作。 */
var CLASS_RPG_API_URL = window.CLASS_RPG_API_URL || (/\.workers\.dev$/i.test(location.hostname)
  ? location.origin + "/api"
  : (location.hostname==="joenew-math.github.io" ? "https://classroom-rpg-guild.joenew.workers.dev/api" : ""));
try{
  if(typeof firebase !== "undefined"){
    firebase.initializeApp({
      apiKey: "AIzaSyAmaXF1DDO5L31sjDnjrrkffqujOvUfpds",
      authDomain: "class-rpg-c9cb9.firebaseapp.com",
      projectId: "class-rpg-c9cb9",
      storageBucket: "class-rpg-c9cb9.firebasestorage.app",
      messagingSenderId: "935964696129",
      appId: "1:935964696129:web:aa081bb14cb43a334030c0"
    });
    FB.auth = firebase.auth();
    FB.db = firebase.firestore();
    try{ FB.db.enablePersistence({synchronizeTabs:true}).catch(()=>{}); }catch(e){}   /* 離線快取 */
    FB.ready = true;
  }
}catch(e){ FB.ready = false; }

