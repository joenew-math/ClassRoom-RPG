# 課程與地下城前端程式

- `math-dungeon.js`：地下城相容 runtime，保留牌組、角色、校園與對戰等既有入口。
- `math-dungeon-classroom.js`：班級角色／指定題庫帶入、成果回傳、上課關閉與健康休息控制器。
- `math-dungeon-learning.js`：題庫、幾何題、錯題複習、NPC 與設施問答。
- `math-dungeon-pets.js`：寵物收服、圖鑑、性格、技能與融合。
- `math-dungeon-gameplay.js`：樓層、移動、戰鬥、掉落與主選單。
- `course-content-data.js`：課程內容資料，體積較大但可由瀏覽器獨立快取。
- `course-catalog.js`：課程目錄與七個數學遊戲連結。
- `course-leaderboard.js`：課程完成度排行榜。
- `question-bank.js`：題庫檢視與評量介面。

`question-bank-data.js` 位於上一層，提供班級經營、地下城與課堂知識挑戰共用的標準化題庫。
