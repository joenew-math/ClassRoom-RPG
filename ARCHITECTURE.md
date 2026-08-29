# ClassRoom RPG 程式架構

這份文件是維護入口。系統採「漸進式模組化」：先把 HTML、程式、題庫資料分離，再逐步依功能領域拆分，不一次重寫已經在線上使用的功能。

## 1. 正式來源與部署副本

| 類型 | 正式來源 | GitHub Pages 副本 |
| --- | --- | --- |
| 班級經營頁面 | `班級RPG-公會大廳v126.html` | `github-pages-ready-20260809/index.html` |
| 班級經營程式 | `app/*.js` | `github-pages-ready-20260809/app/*.js` |
| 地下城頁面 | `Lession/math-dungeon.html` | `github-pages-ready-20260809/Lession/math-dungeon.html` |
| 地下城程式 | `Lession/app/math-dungeon.js` | `github-pages-ready-20260809/Lession/app/math-dungeon.js` |
| 課程目錄 | `Lession/Lessionindex.html` | `github-pages-ready-20260809/Lession/Lessionindex.html` |
| 課程內容資料 | `Lession/app/course-content-data.js` | 同路徑部署副本 |
| 題庫檢視頁 | `Lession/question-bank.html` | 同路徑部署副本 |
| 地下城共用題庫 | `Lession/question-bank-data.js` | 同路徑部署副本 |

`public-release/` 是公開儲存庫的工作目錄。不要直接只改部署副本；所有功能修改應先改正式來源，通過 `tools/verify-release.ps1` 後再同步。

## 2. 瀏覽器載入順序

### 班級經營

1. HTML 與畫面樣式
2. Firebase 相容版 SDK
3. `Lession/question-bank-data.js`
4. `app/firebase-bootstrap.js`：只負責 Firebase 初始化與登入基礎狀態
5. `app/classroom-rpg.js`：班級、角色、戰鬥、題庫、教師／學生／家長介面
6. Service Worker 註冊與離線快取

### 地下城

1. `Lession/math-dungeon.html`：畫布與介面骨架
2. `Lession/question-bank-data.js`：六冊共用題庫
3. `Lession/app/math-dungeon.js`：迷宮、卡牌、怪物、寵物與成果回傳

### 課程目錄與題庫

1. `Lession/app/course-content-data.js`：可快取的課程內容資料
2. `Lession/app/course-catalog.js`：目錄、單元開啟與遊戲連結
3. `Lession/app/course-leaderboard.js`：完成度排行榜
4. `Lession/app/question-bank.js`：題庫檢視與評量頁
5. `Lession/question-bank-data.js`：從題庫來源整理出的輕量共用格式

## 3. 資料責任邊界

- **Firebase Authentication**：Google 身分，不保存遊戲規則。
- **Firestore**：班級、學生角色、課堂、任務、家長摘要與低頻同步資料。
- **Cloudflare Worker**：抽卡、QR 獎勵、商店、工坊及審核等需要防重複的交易。
- **GitHub Pages / Service Worker**：HTML、程式、圖片、課程與題庫靜態資料。
- **localStorage**：離線暫存與未同步操作，不應作為 XP、鑽石等正式權威資料。

## 4. 維護規則

1. 新功能不要再加入大型 inline `<script>`；放到對應 `app/` 目錄。
2. 保留既有 classic script 全域行為。除非完成依賴盤點，不直接改成 `type="module"`。
3. 題庫只維護一份來源，由 `tools/build-question-bank-data.ps1` 產生地下城共用資料。
4. 新增外部程式後，同步加入 `sw.js` 的 `CORE`，確保教室斷線時仍能開啟。
5. 所有測試使用 `tools/source-bundle.js` 讀取 HTML 與其本機 script，避免模組化後測試只檢查空殼 HTML。
6. 發布前執行 `tools/verify-release.ps1`；部署副本的雜湊必須與正式來源一致。

## 5. 下一階段拆分順序

`app/classroom-rpg.js` 與 `Lession/app/math-dungeon.js` 仍是相容性 runtime，後續按下列順序拆分：

1. 純資料表：職業、技能、裝備、詞條、怪物與寵物定義。
2. 無畫面的純函式：價格、傷害、冷卻、題庫篩選與獎勵公式。
3. 雲端存取層：登入、班級讀寫、交易 API 與同步佇列。
4. 教師、學生、家長三個介面控制器。
5. 一般戰鬥、Dota、知識挑戰與地下城各自的遊戲迴圈。

每一階段都要先補對應測試，再移動程式碼；不得用一次性全面重寫取代已驗證的線上流程。

## 6. 常用驗證

```powershell
& tools\verify-release.ps1
```

若只更新題庫：

```powershell
& tools\update-question-bank.ps1 -SourceHtml "新版題庫.html"
```

本機伺服器：

```powershell
node tools\local-static-server.js
```

然後開啟 `http://127.0.0.1:8765/`。

