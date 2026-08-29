# 班級經營前端程式

- `firebase-bootstrap.js`：Firebase 初始化與登入基礎狀態。
- `classroom-rpg.js`：既有班級 RPG 相容 runtime。

這兩個檔案使用傳統全域 script，載入順序不可交換。新程式應優先建立小型、有明確責任的檔案；不要把新功能重新塞回 HTML。

