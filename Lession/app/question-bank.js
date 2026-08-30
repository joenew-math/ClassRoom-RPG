/* question-bank.js
 * 從 Lession/question-bank.html 拆出的傳統全域 runtime。
 * 請保留為一般 script，不要直接改成 type=module，避免破壞既有 inline handlers。
 */
const ASSESS={"g7_sem1": {"title": "七年級上學期 學力檢測", "range": "第 1~4 章", "items": [{"q": "計算 (−6) + 15 − (−4) 的結果是多少？", "opts": ["5", "13", "−13", "25"], "ans": "13", "sol": "(−6)+15 = 9，9−(−4) = 9+4 = 13。減負變加正是關鍵。", "chs": ["第1章"]}, {"q": "下列各數中，絕對值最小的是哪一個？", "opts": ["−8", "−3", "5", "6"], "ans": "−3", "sol": "絕對值分別是 8、3、5、6，最小的是 3。絕對值看的是與 0 的距離。", "chs": ["第1章"]}, {"q": "計算 (−2)³ + (−3)² 的值是多少？", "opts": ["1", "−17", "17", "−1"], "ans": "1", "sol": "(−2)³ = −8（奇數次方保持負）、(−3)² = 9，−8+9 = 1。", "chs": ["第1章"]}, {"q": "某冷凍庫溫度為 −18°C，調高 25 度後又調低 12 度，最後溫度是幾度？", "opts": ["−5°C", "5°C", "−31°C", "31°C"], "ans": "−5°C", "sol": "(−18)+25 = 7，7−12 = −5。連續變化要依序計算。", "chs": ["第1章"]}, {"q": "84 的質因數分解是下列何者？", "opts": ["2²×3×7", "2×3²×7", "2²×21", "4×21"], "ans": "2²×3×7", "sol": "84 = 4×21 = 2²×3×7，必須拆到全部都是質數為止。", "chs": ["第2章"]}, {"q": "有 54 本書與 72 枝筆平分給若干人且都不剩，最多可分給幾人？", "opts": ["6 人", "9 人", "18 人", "27 人"], "ans": "18 人", "sol": "求 (54,72)。54=2×3³、72=2³×3²，共同取最小次方得 2×3² = 18。", "chs": ["第2章"]}, {"q": "甲燈每 12 秒、乙燈每 18 秒閃一次，同時閃過後最少幾秒再同時閃？", "opts": ["6 秒", "30 秒", "36 秒", "216 秒"], "ans": "36 秒", "sol": "求 [12,18]。12=2²×3、18=2×3²，取最大次方得 2²×3² = 36。", "chs": ["第2章"]}, {"q": "下列哪一組數互質？", "opts": ["9 與 15", "14 與 21", "16 與 25", "24 與 30"], "ans": "16 與 25", "sol": "16=2⁴、25=5² 沒有共同質因數，最大公因數為 1。其餘各組都有公因數 3 或 7。", "chs": ["第2章"]}, {"q": "計算 2/3 − 1/4 + 1/6 的結果是多少？", "opts": ["7/12", "5/12", "1/2", "3/4"], "ans": "7/12", "sol": "通分為 8/12 − 3/12 + 2/12 = 7/12。加減必須先通分。", "chs": ["第3章"]}, {"q": "一條繩子長 3 又 1/2 公尺，剪成每段 7/8 公尺，可剪成幾段？", "opts": ["3 段", "4 段", "5 段", "28 段"], "ans": "4 段", "sol": "7/2 ÷ 7/8 = 7/2 × 8/7 = 4。帶分數要先化成假分數，除以分數要乘倒數。", "chs": ["第3章"]}, {"q": "計算 (3/4 − 1/2) × 8 的值是多少？", "opts": ["2", "4", "6", "1/4"], "ans": "2", "sol": "括號內 1/4，1/4 × 8 = 2。先算括號再乘。", "chs": ["第3章"]}, {"q": "下列四個分數中，數值最大的是哪一個？", "opts": ["5/8", "2/3", "7/12", "3/5"], "ans": "2/3", "sol": "通分成 24 分母：15/24、16/24、14/24、14.4/24，最大為 2/3。", "chs": ["第3章"]}, {"q": "解方程式 5x − 8 = 2x + 7，x 的值是多少？", "opts": ["3", "5", "−5", "15"], "ans": "5", "sol": "移項得 3x = 15，x = 5。兩邊都有未知數時先集中到同一邊。", "chs": ["第4章"]}, {"q": "解方程式 2(x + 3) = 3x − 1，x 的值是多少？", "opts": ["5", "7", "−7", "1"], "ans": "7", "sol": "展開得 2x + 6 = 3x − 1，移項得 x = 7。有括號要先展開。", "chs": ["第4章"]}, {"q": "買 7 顆糖和一包 30 元的餅乾共 100 元，每顆糖多少元？", "opts": ["8 元", "10 元", "12 元", "14 元"], "ans": "10 元", "sol": "7x + 30 = 100 → 7x = 70 → x = 10。只有糖要乘 7。", "chs": ["第4章"]}, {"q": "哥哥比弟弟大 6 歲，兩人年齡和為 34 歲，弟弟今年幾歲？", "opts": ["12 歲", "14 歲", "16 歲", "20 歲"], "ans": "14 歲", "sol": "x + (x+6) = 34 → 2x = 28 → x = 14。哥哥則是 20 歲。", "chs": ["第4章"]}, {"q": "解方程式 x/3 − x/4 = 2，x 的值是多少？", "opts": ["6", "12", "24", "48"], "ans": "24", "sol": "兩邊同乘 12 去分母得 4x − 3x = 24 → x = 24。", "chs": ["第4章"]}, {"q": "若 a = −3、b = 2，則 |a| × b − a² 的值是多少？", "opts": ["−3", "3", "−15", "15"], "ans": "−3", "sol": "|−3| = 3，3×2 = 6；a² = 9；6 − 9 = −3。要先算絕對值與平方。", "chs": ["第1章"]}, {"q": "某數的 2/5 是 18，這個數是多少？", "opts": ["36", "45", "7.2", "90"], "ans": "45", "sol": "設該數為 x，(2/5)x = 18 → x = 18 × 5/2 = 45。", "chs": ["第3章", "第4章"]}, {"q": "一個長方形的長是寬的 3 倍，周長為 48 公分，寬是多少公分？", "opts": ["6 公分", "9 公分", "12 公分", "18 公分"], "ans": "6 公分", "sol": "設寬 x，2(x + 3x) = 48 → 8x = 48 → x = 6。長則是 18 公分。", "chs": ["第4章"]}]}, "g7_full": {"title": "七年級 全年學力檢測", "range": "第 1~9 章", "items": [{"q": "計算 (−4) × (−3) + (−10) ÷ 5 的結果是多少？", "opts": ["10", "14", "−14", "−10"], "ans": "10", "sol": "先乘除：(−4)×(−3) = 12、(−10)÷5 = −2，12 + (−2) = 10。", "chs": ["第1章"]}, {"q": "有 60 顆糖與 90 顆餅乾要平分且都不剩，最多可分給幾人？每人得幾顆糖？", "opts": ["30 人，2 顆", "15 人，4 顆", "30 人，3 顆", "10 人，6 顆"], "ans": "30 人，2 顆", "sol": "(60,90) = 30，60÷30 = 2。這是最大公因數的應用。", "chs": ["第2章"]}, {"q": "計算 1/2 + 2/3 × 3/4 的值是多少？", "opts": ["1", "7/8", "5/6", "9/8"], "ans": "1", "sol": "先乘：2/3 × 3/4 = 1/2，再 1/2 + 1/2 = 1。先乘除後加減。", "chs": ["第3章"]}, {"q": "解方程式 3(2x − 1) = 4x + 7，x 的值是多少？", "opts": ["2", "5", "−5", "1"], "ans": "5", "sol": "展開得 6x − 3 = 4x + 7，移項得 2x = 10，x = 5。", "chs": ["第4章"]}, {"q": "解聯立方程式 x + y = 12、x − y = 4，x 的值是多少？", "opts": ["4", "6", "8", "16"], "ans": "8", "sol": "兩式相加得 2x = 16，x = 8，代回得 y = 4。", "chs": ["第5章"]}, {"q": "雞與兔共 20 隻，腳共 56 隻，兔子有幾隻？", "opts": ["6 隻", "8 隻", "12 隻", "14 隻"], "ans": "8 隻", "sol": "設雞 x 兔 y：x+y=20、2x+4y=56。全為雞時 40 隻腳，每換一隻兔多 2 隻腳，(56−40)÷2 = 8。", "chs": ["第5章"]}, {"q": "點 A(−3, 5) 在第幾象限？", "opts": ["第一象限", "第二象限", "第三象限", "第四象限"], "ans": "第二象限", "sol": "x 為負、y 為正，在左上方的第二象限。", "chs": ["第6章"]}, {"q": "直線 2x + y = 8 與 x 軸的交點坐標是什麼？", "opts": ["(0,8)", "(4,0)", "(8,0)", "(0,4)"], "ans": "(4,0)", "sol": "與 x 軸相交時 y = 0，代入得 2x = 8 → x = 4。", "chs": ["第6章"]}, {"q": "把 45:60 化成最簡整數比是什麼？", "opts": ["9:12", "3:4", "5:6", "15:20"], "ans": "3:4", "sol": "同除以最大公因數 15 得 3:4。要化到前後項互質為止。", "chs": ["第7章"]}, {"q": "果汁與水以 3:5 調配成 800 毫升，需要水多少毫升？", "opts": ["300 毫升", "480 毫升", "500 毫升", "533 毫升"], "ans": "500 毫升", "sol": "總份數 8，800÷8 = 100，水佔 5 份 = 500 毫升。", "chs": ["第7章"]}, {"q": "某工作 6 人做需 20 天，改由 8 人做需幾天？（效率相同）", "opts": ["12 天", "15 天", "18 天", "27 天"], "ans": "15 天", "sol": "人數與天數成反比：6×20 = 120，120÷8 = 15。", "chs": ["第7章"]}, {"q": "解不等式 4x − 7 < 2x + 5，x 的範圍是什麼？", "opts": ["x < 6", "x > 6", "x < 3", "x > 3"], "ans": "x < 6", "sol": "移項得 2x < 12 → x < 6。此題不需變號。", "chs": ["第8章"]}, {"q": "解不等式 −3x + 9 ≥ 0，x 的範圍是什麼？", "opts": ["x ≥ 3", "x ≤ 3", "x ≥ −3", "x ≤ −3"], "ans": "x ≤ 3", "sol": "−3x ≥ −9，兩邊除以 −3 時不等號要變向，得 x ≤ 3。", "chs": ["第8章"]}, {"q": "帶 400 元買每個 35 元的筆記本，最多可買幾本？", "opts": ["10 本", "11 本", "12 本", "13 本"], "ans": "11 本", "sol": "35x ≤ 400 → x ≤ 11.4，「最多」無條件捨去取 11。", "chs": ["第8章"]}, {"q": "某班 50 人，其中 20 人參加社團，佔全班的百分之幾？", "opts": ["20%", "30%", "40%", "50%"], "ans": "40%", "sol": "20÷50 = 0.4 = 40%。相對次數是該組人數除以總人數。", "chs": ["第9章"]}, {"q": "圓形圖中某項佔全體的 1/6，其圓心角是幾度？", "opts": ["30°", "45°", "60°", "90°"], "ans": "60°", "sol": "360° ÷ 6 = 60°。圓心角與佔比成正比。", "chs": ["第9章"]}, {"q": "資料 12、25、18、31、24 的全距是多少？", "opts": ["13", "19", "22", "31"], "ans": "19", "sol": "最大 31 減最小 12 = 19。全距是相減。", "chs": ["第9章"]}, {"q": "A 班 25 人中 15 人及格、B 班 40 人中 22 人及格，哪一班及格率高？", "opts": ["A 班", "B 班", "一樣", "無法比較"], "ans": "A 班", "sol": "A 班 60%、B 班 55%。人數不同時必須比較比例。", "chs": ["第9章"]}, {"q": "某數的 3 倍加 5 等於 26，這個數的 2 倍是多少？", "opts": ["7", "14", "21", "42"], "ans": "14", "sol": "3x + 5 = 26 → x = 7，2x = 14。注意題目問的是 2 倍而非該數本身。", "chs": ["第4章"]}, {"q": "長方形長比寬多 5 公分、周長 46 公分，面積是多少平方公分？", "opts": ["84", "126", "136", "150"], "ans": "126", "sol": "2(x + x+5) = 46 → x = 9，長 14，面積 9×14 = 126。", "chs": ["第4章", "第7章"]}]}, "g7_mockA": {"title": "七年級數學 學力檢測模擬卷 A", "range": "七年級全冊（對照官方評量向度）", "basis": "115年度縣市學生學習能力檢測 評量向度說明（國立臺中教育大學 測驗統計與適性學習研究中心）", "url": "https://saaassessment.ntcu.edu.tw/AssessmentFrame", "items": [{"q": "下列哪一個數是質數？", "opts": ["51", "57", "61", "91"], "ans": "61", "sol": "51=3×17、57=3×19、91=7×13 都是合數；61 只有 1 和它本身兩個因數。", "chs": ["數與量／100以內的質數"]}, {"q": "100 以內最大的質數是多少？", "opts": ["91", "93", "97", "99"], "ans": "97", "sol": "91=7×13、93=3×31、99=9×11 都是合數，97 無法再分解。", "chs": ["數與量／100以內的質數"]}, {"q": "360 的標準分解式是下列何者？", "opts": ["2³×3²×5", "2²×3³×5", "2³×3×5²", "2⁴×3×5"], "ans": "2³×3²×5", "sol": "360 = 8×45 = 2³×3²×5。標準分解式須由小到大排列且指數正確。", "chs": ["數與量／質因數分解"]}, {"q": "若某數的標準分解式為 2²×5²，這個數的因數共有幾個？", "opts": ["4 個", "6 個", "9 個", "12 個"], "ans": "9 個", "sol": "各指數加 1 後相乘：(2+1)×(2+1) = 9。這個數是 100。", "chs": ["數與量／質因數分解"]}, {"q": "計算 (−3)² − 2 × (−4) 的值是多少？", "opts": ["1", "17", "−17", "−1"], "ans": "17", "sol": "(−3)² = 9（負數平方為正），2×(−4) = −8，9−(−8) = 17。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 (−1/2) + 3/4 × (−2) 的值是多少？", "opts": ["−2", "−1", "−1/2", "1"], "ans": "−2", "sol": "先乘：3/4 × (−2) = −3/2，再 (−1/2)+(−3/2) = −2。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 −2.5 + 1.8 − (−0.7) 的值是多少？", "opts": ["0", "−0.7", "−4.4", "1.4"], "ans": "0", "sol": "−2.5+1.8 = −0.7，−0.7−(−0.7) = 0。減負變加正。", "chs": ["數與量／四則混合運算"]}, {"q": "觀察數列 2、6、18、54、…，第 6 項是多少？", "opts": ["162", "324", "486", "648"], "ans": "486", "sol": "每項乘 3：54×3=162、162×3=486。先找出規律再往後推。", "chs": ["數與量／數的運算規律"]}, {"q": "觀察 1、4、9、16、25、…，第 8 項是多少？", "opts": ["49", "56", "64", "81"], "ans": "64", "sol": "這是平方數列，第 n 項為 n²，8² = 64。", "chs": ["數與量／數的運算規律"]}, {"q": "數線上點 A 表示 −5、點 B 表示 3，線段 AB 的長度是多少？", "opts": ["2", "8", "−8", "15"], "ans": "8", "sol": "數線上兩點距離為 |3−(−5)| = 8。距離取絕對值不會是負的。", "chs": ["數與量／數線"]}, {"q": "數線上 −2 與 6 的中點所表示的數是多少？", "opts": ["2", "4", "−4", "8"], "ans": "2", "sol": "中點為 (−2+6)÷2 = 2。中點即兩數的平均。", "chs": ["數與量／數線"]}, {"q": "(−2)⁴ 的值是多少？", "opts": ["−16", "16", "−8", "8"], "ans": "16", "sol": "偶數次方結果為正：(−2)×(−2)×(−2)×(−2) = 16。若寫成 −2⁴ 則為 −16。", "chs": ["數與量／指數的意義"]}, {"q": "2³ × 2⁵ 等於下列何者？", "opts": ["2⁸", "2¹⁵", "4⁸", "2²"], "ans": "2⁸", "sol": "同底數相乘，指數相加：3+5 = 8。不是把底數也相乘。", "chs": ["數與量／指數律"]}, {"q": "(3²)³ 等於下列何者？", "opts": ["3⁵", "3⁶", "3⁸", "9³"], "ans": "3⁶", "sol": "指數的指數要相乘：2×3 = 6。與同底數相乘的規則不同。", "chs": ["數與量／指數律"]}, {"q": "5⁷ ÷ 5⁴ 等於下列何者？", "opts": ["5³", "5¹¹", "5²⁸", "1³"], "ans": "5³", "sol": "同底數相除，指數相減：7−4 = 3。", "chs": ["數與量／指數律"]}, {"q": "把 3600000 用科學記號表示，正確的是？", "opts": ["3.6×10⁵", "3.6×10⁶", "36×10⁵", "0.36×10⁷"], "ans": "3.6×10⁶", "sol": "科學記號的形式為 a×10ⁿ，其中 1 ≤ a < 10。小數點左移 6 位。", "chs": ["數與量／科學記號"]}, {"q": "把 0.00042 用科學記號表示，正確的是？", "opts": ["4.2×10⁻⁴", "4.2×10⁴", "42×10⁻⁵", "4.2×10⁻³"], "ans": "4.2×10⁻⁴", "sol": "小數點右移 4 位，指數為負：4.2×10⁻⁴。", "chs": ["數與量／科學記號"]}, {"q": "2×10⁵ 與 4×10³ 相乘，結果用科學記號表示是？", "opts": ["8×10⁸", "8×10¹⁵", "6×10⁸", "8×10⁷"], "ans": "8×10⁸", "sol": "係數相乘 2×4=8，10 的指數相加 5+3=8。", "chs": ["數與量／科學記號"]}, {"q": "把 42:56 化成最簡整數比是什麼？", "opts": ["6:8", "3:4", "7:8", "21:28"], "ans": "3:4", "sol": "同除以最大公因數 14 得 3:4。要化到前後項互質。", "chs": ["數與量／比與比例式"]}, {"q": "解比例式 5:8 = x:24，x 是多少？", "opts": ["10", "12", "15", "20"], "ans": "15", "sol": "交叉相乘得 8x = 120，x = 15。", "chs": ["數與量／比與比例式"]}, {"q": "點 P(−4, 7) 位於第幾象限？", "opts": ["第一象限", "第二象限", "第三象限", "第四象限"], "ans": "第二象限", "sol": "x 為負、y 為正，位於左上方的第二象限。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "點 A(5, −3) 到 x 軸的距離是多少？", "opts": ["3", "5", "−3", "8"], "ans": "3", "sol": "到 x 軸的距離看 y 坐標的絕對值 |−3| = 3。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "一枝筆 x 元、一本簿子 y 元，買 3 枝筆和 2 本簿子共付多少元？", "opts": ["3x+2y", "2x+3y", "5xy", "6xy"], "ans": "3x+2y", "sol": "筆的部分是 3 枝乘 x 元、簿子是 2 本乘 y 元，兩者相加得 3x+2y。不可寫成 5xy。", "chs": ["代數與函數／代數符號"]}, {"q": "解方程式 4(x − 3) = 2x + 6，x 的值是多少？", "opts": ["3", "6", "9", "12"], "ans": "9", "sol": "展開得 4x−12 = 2x+6，移項得 2x = 18，x = 9。", "chs": ["代數與函數／一元一次方程式"]}, {"q": "聯立方程式 x+y=7、x−y=1 的解在坐標平面上代表什麼？", "opts": ["兩直線的交點 (4,3)", "兩直線平行", "兩直線重合", "無法表示"], "ans": "兩直線的交點 (4,3)", "sol": "解得 x=4、y=3，即兩直線的交點坐標。", "chs": ["代數與函數／聯立方程式的幾何意義"]}]}, "g7_mockB": {"title": "七年級數學 學力檢測模擬卷 B", "range": "七年級全冊（對照官方評量向度）", "basis": "115年度縣市學生學習能力檢測 評量向度說明（國立臺中教育大學 測驗統計與適性學習研究中心）", "url": "https://saaassessment.ntcu.edu.tw/AssessmentFrame", "items": [{"q": "下列四個數中，哪一個「不是」質數？", "opts": ["29", "37", "49", "53"], "ans": "49", "sol": "49 = 7×7 是合數；其餘三數都只有兩個因數。", "chs": ["數與量／100以內的質數"]}, {"q": "20 到 30 之間共有幾個質數？", "opts": ["1 個", "2 個", "3 個", "4 個"], "ans": "2 個", "sol": "23 與 29，共 2 個。21=3×7、25=5²、27=3³ 都是合數。", "chs": ["數與量／100以內的質數"]}, {"q": "252 的標準分解式是下列何者？", "opts": ["2²×3²×7", "2²×3×7²", "2³×3²×7", "2²×63"], "ans": "2²×3²×7", "sol": "252 = 4×63 = 2²×3²×7。標準分解式必須全部拆成質數。", "chs": ["數與量／質因數分解"]}, {"q": "兩數的標準分解式分別為 2³×3 與 2²×3²，它們的最大公因數是多少？", "opts": ["6", "12", "24", "72"], "ans": "12", "sol": "共同質因數取最小次方：2²×3 = 12。", "chs": ["數與量／質因數分解"]}, {"q": "計算 (−4) × 3 − (−6) ÷ 2 的值是多少？", "opts": ["−9", "−15", "9", "15"], "ans": "−9", "sol": "先乘除：(−4)×3 = −12、(−6)÷2 = −3，−12−(−3) = −9。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 2/3 ÷ (−4/9) 的值是多少？", "opts": ["−3/2", "−8/27", "3/2", "−2/3"], "ans": "−3/2", "sol": "除以分數要乘倒數：2/3 × (−9/4) = −3/2。異號得負。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 (−0.5)² × 8 的值是多少？", "opts": ["−2", "2", "4", "−4"], "ans": "2", "sol": "(−0.5)² = 0.25，0.25×8 = 2。負數平方為正。", "chs": ["數與量／四則混合運算"]}, {"q": "觀察數列 3、7、11、15、…，第 12 項是多少？", "opts": ["43", "47", "51", "55"], "ans": "47", "sol": "公差為 4，第 12 項 = 3 + 11×4 = 47。", "chs": ["數與量／數的運算規律"]}, {"q": "觀察 1、3、6、10、15、…，第 7 項是多少？", "opts": ["21", "24", "28", "36"], "ans": "28", "sol": "差依序為 2、3、4、5…，第 6 項 21，再加 7 得 28。", "chs": ["數與量／數的運算規律"]}, {"q": "數線上點 M 表示 −8、點 N 表示 −2，MN 的中點表示什麼數？", "opts": ["−5", "−3", "−10", "5"], "ans": "−5", "sol": "(−8 + (−2))÷2 = −5。", "chs": ["數與量／數線"]}, {"q": "在數線上，下列哪一個數距離原點最遠？", "opts": ["−9", "−4", "6", "8"], "ans": "−9", "sol": "距離看絕對值：9 最大。負號不影響距離。", "chs": ["數與量／數線"]}, {"q": "−3² 的值是多少？", "opts": ["9", "−9", "6", "−6"], "ans": "−9", "sol": "沒有括號時平方只作用在 3 上，前面的負號最後才加。與 (−3)²=9 不同。", "chs": ["數與量／指數的意義"]}, {"q": "a³ × a⁴ ÷ a² 等於下列何者？", "opts": ["a⁵", "a⁶", "a⁹", "a²⁴"], "ans": "a⁵", "sol": "先相加 3+4=7，再相減 7−2=5。", "chs": ["數與量／指數律"]}, {"q": "(2×3)² 等於下列何者？", "opts": ["36", "12", "2×9", "6²以外皆錯"], "ans": "36", "sol": "(2×3)² = 6² = 36。積的乘方等於各因數分別乘方：2²×3² = 4×9 = 36。", "chs": ["數與量／指數律"]}, {"q": "10⁰ 的值是多少？", "opts": ["0", "1", "10", "無意義"], "ans": "1", "sol": "任何非零數的 0 次方都等於 1。", "chs": ["數與量／指數律"]}, {"q": "光速約每秒 300000 公里，用科學記號表示是？", "opts": ["3×10⁵ 公里", "3×10⁶ 公里", "30×10⁴ 公里", "3×10⁴ 公里"], "ans": "3×10⁵ 公里", "sol": "300000 的小數點左移 5 位，得 3×10⁵。", "chs": ["數與量／科學記號"]}, {"q": "6×10⁸ 除以 3×10² 的結果是？", "opts": ["2×10⁶", "2×10⁴", "3×10⁶", "18×10⁶"], "ans": "2×10⁶", "sol": "係數相除 6÷3=2，指數相減 8−2=6。", "chs": ["數與量／科學記號"]}, {"q": "下列哪一個數最大？", "opts": ["2.5×10³", "3×10²", "9×10²", "1.2×10³"], "ans": "2.5×10³", "sol": "先比指數再比係數：2.5×10³ = 2500 最大。", "chs": ["數與量／科學記號"]}, {"q": "某地圖比例尺為 1:50000，圖上 4 公分代表實際多少公里？", "opts": ["2 公里", "20 公里", "200 公里", "0.2 公里"], "ans": "2 公里", "sol": "4×50000 = 200000 公分 = 2000 公尺 = 2 公里。單位換算是關鍵。", "chs": ["數與量／比與比例式"]}, {"q": "甲乙兩數的比為 3:7，若兩數和為 60，較大的數是多少？", "opts": ["18", "24", "36", "42"], "ans": "42", "sol": "總份數 10，每份 6，較大數 = 7×6 = 42。", "chs": ["數與量／比與比例式"]}, {"q": "點 A(3, 5) 向下平移 8 單位後，新坐標在第幾象限？", "opts": ["第一象限", "第二象限", "第三象限", "第四象限"], "ans": "第四象限", "sol": "新坐標為 (3, −3)，x 正 y 負在第四象限。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "直線 y = −2 上的點，下列何者正確？", "opts": ["(−2, 0)", "(0, −2)", "(2, 0)", "(0, 2)"], "ans": "(0, −2)", "sol": "y = −2 是水平線，線上所有點的 y 坐標都是 −2。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "原價 a 元的商品打八折後再折 50 元，實付多少元？", "opts": ["0.8a − 50", "0.8(a − 50)", "a − 0.8×50", "0.2a − 50"], "ans": "0.8a − 50", "sol": "先打折再減 50，順序不可顛倒。", "chs": ["代數與函數／代數符號"]}, {"q": "解方程式 x/2 + 3 = x/3 + 5，x 的值是多少？", "opts": ["6", "12", "18", "24"], "ans": "12", "sol": "兩邊同乘 6 得 3x+18 = 2x+30，移項得 x = 12。", "chs": ["代數與函數／一元一次方程式"]}, {"q": "若聯立方程式 2x+y=5、4x+2y=10 求解，其圖形關係是？", "opts": ["交於一點", "平行不相交", "兩直線重合", "互相垂直"], "ans": "兩直線重合", "sol": "第二式是第一式的 2 倍，兩者為同一直線，有無限多組解。", "chs": ["代數與函數／聯立方程式的幾何意義"]}]}, "g7_mockC": {"title": "七年級數學 學力檢測模擬卷 C", "range": "七年級全冊（對照官方評量向度）", "basis": "115年度縣市學生學習能力檢測 七年級數學評量向度說明（國立臺中教育大學 測驗統計與適性學習研究中心）", "url": "https://saaassessment.ntcu.edu.tw/AssessmentFrame", "items": [{"q": "下列哪一組數全部都是質數？", "opts": ["2, 3, 9", "5, 7, 11", "13, 17, 21", "19, 23, 27"], "ans": "5, 7, 11", "sol": "9=3²、21=3×7、27=3³ 都是合數，只有 5、7、11 全為質數。", "chs": ["數與量／100以內的質數"]}, {"q": "40 到 50 之間的質數共有幾個？", "opts": ["1 個", "2 個", "3 個", "4 個"], "ans": "3 個", "sol": "41、43、47 共 3 個。45 = 9×5、49 = 7² 都是合數。", "chs": ["數與量／100以內的質數"]}, {"q": "540 的標準分解式是下列何者？", "opts": ["2²×3³×5", "2³×3²×5", "2²×3²×5²", "2×3³×5²"], "ans": "2²×3³×5", "sol": "540 = 4×135 = 2²×27×5 = 2²×3³×5。", "chs": ["數與量／質因數分解"]}, {"q": "兩數的標準分解式為 2³×3²×5 與 2²×3×5²，它們的最大公因數是多少？", "opts": ["30", "60", "90", "120"], "ans": "60", "sol": "共同質因數取最小次方：2²×3×5 = 60。", "chs": ["數與量／質因數分解"]}, {"q": "計算 (−5)² − 4 × (−3) 的值是多少？", "opts": ["13", "37", "−37", "−13"], "ans": "37", "sol": "(−5)² = 25（負數平方為正），4×(−3) = −12，25−(−12) = 37。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 (−3/4) ÷ (1/2) + 1 的值是多少？", "opts": ["−1/2", "1/2", "−2", "2"], "ans": "−1/2", "sol": "除以分數要乘倒數：(−3/4)×2 = −3/2，再加 1 得 −1/2。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 −1.5 × 4 + 2.5 的值是多少？", "opts": ["−3.5", "3.5", "−8.5", "8.5"], "ans": "−3.5", "sol": "先乘：−1.5×4 = −6，再 −6+2.5 = −3.5。", "chs": ["數與量／四則混合運算"]}, {"q": "觀察數列 1、3、6、10、15、…，第 9 項是多少？", "opts": ["36", "45", "55", "40"], "ans": "45", "sol": "差依序為 2、3、4、5…，這是三角形數，第 n 項 = n(n+1)÷2，9×10÷2 = 45。", "chs": ["數與量／數的運算規律"]}, {"q": "觀察 3、6、12、24、…，第 7 項是多少？", "opts": ["96", "144", "192", "384"], "ans": "192", "sol": "每項乘 2：3×2⁶ = 192。", "chs": ["數與量／數的運算規律"]}, {"q": "數線上點 P 表示 −7、點 Q 表示 5，PQ 的中點表示什麼數？", "opts": ["−2", "−1", "1", "2"], "ans": "−1", "sol": "中點 = (−7+5)÷2 = −1。", "chs": ["數與量／數線"]}, {"q": "數線上與 −2 距離 6 的數有哪些？", "opts": ["4 與 −8", "4 與 8", "−4 與 8", "只有 4"], "ans": "4 與 −8", "sol": "往右 −2+6 = 4，往左 −2−6 = −8，共有兩個。", "chs": ["數與量／數線"]}, {"q": "(−1)⁷ + (−1)⁸ 的值是多少？", "opts": ["0", "1", "2", "−2"], "ans": "0", "sol": "奇次方為 −1、偶次方為 1，(−1)+1 = 0。", "chs": ["數與量／指數的意義"]}, {"q": "3⁵ × 3² ÷ 3⁴ 等於下列何者？", "opts": ["3³", "3¹¹", "3⁷", "3¹"], "ans": "3³", "sol": "同底數運算：5+2−4 = 3。", "chs": ["數與量／指數律"]}, {"q": "(2³)² × 2 等於下列何者？", "opts": ["2⁶", "2⁷", "2⁸", "4⁷"], "ans": "2⁷", "sol": "(2³)² = 2⁶（指數相乘），再乘 2¹ 得 2⁷。", "chs": ["數與量／指數律"]}, {"q": "若 2ⁿ = 32，則 n 是多少？", "opts": ["3", "4", "5", "16"], "ans": "5", "sol": "依序試算：2³=8、2⁴=16、2⁵=32，所以 n = 5。", "chs": ["數與量／指數律"]}, {"q": "把 0.000078 用科學記號表示，正確的是？", "opts": ["7.8×10⁻⁵", "7.8×10⁵", "78×10⁻⁶", "7.8×10⁻⁴"], "ans": "7.8×10⁻⁵", "sol": "小數點右移 5 位，指數為負。", "chs": ["數與量／科學記號"]}, {"q": "(4×10⁶) ÷ (8×10²) 的結果是多少？", "opts": ["5×10³", "0.5×10⁴", "5×10⁴", "2×10⁴"], "ans": "5×10³", "sol": "4÷8 = 0.5，指數 6−2 = 4，得 0.5×10⁴ = 5×10³。", "chs": ["數與量／科學記號"]}, {"q": "下列四個數中，最小的是哪一個？", "opts": ["3×10⁻²", "5×10⁻³", "2×10⁻¹", "8×10⁻²"], "ans": "5×10⁻³", "sol": "先比指數：10⁻³ 最小，所以 5×10⁻³ = 0.005 最小。", "chs": ["數與量／科學記號"]}, {"q": "某班男女生比 5:4，全班 36 人，男生比女生多幾人？", "opts": ["2 人", "4 人", "6 人", "8 人"], "ans": "4 人", "sol": "總份 9，每份 4 人，男 20、女 16，相差 4 人。", "chs": ["數與量／比與比例式"]}, {"q": "解比例式 (x−1):4 = 6:8，x 是多少？", "opts": ["3", "4", "5", "7"], "ans": "4", "sol": "8(x−1) = 24 → x−1 = 3 → x = 4。", "chs": ["數與量／比與比例式"]}, {"q": "點 A(−5, −2) 位於第幾象限？到 x 軸的距離是多少？", "opts": ["第三象限，2", "第三象限，5", "第二象限，2", "第四象限，5"], "ans": "第三象限，2", "sol": "x、y 皆負在第三象限；到 x 軸距離看 |y| = 2。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "點 B(3, −4) 對 x 軸的對稱點坐標是什麼？", "opts": ["(3, 4)", "(−3, −4)", "(−3, 4)", "(4, −3)"], "ans": "(3, 4)", "sol": "對 x 軸對稱時 x 不變、y 變號。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "原價 x 元的商品先打七折，再加 5% 稅金，實付多少元？", "opts": ["0.7x × 1.05", "0.7x + 0.05", "0.7x × 0.05", "x × 0.75"], "ans": "0.7x × 1.05", "sol": "先打折得 0.7x，再加 5% 稅金即乘以 1.05。", "chs": ["代數與函數／代數符號"]}, {"q": "解方程式 (x+2)/3 = (x−4)/2，x 是多少？", "opts": ["8", "10", "14", "16"], "ans": "16", "sol": "交叉相乘得 2(x+2) = 3(x−4) → 2x+4 = 3x−12 → x = 16。", "chs": ["代數與函數／一元一次方程式"]}, {"q": "解聯立方程式 3x+2y=16、x−2y=0，xy 的值是多少？", "opts": ["4", "8", "12", "16"], "ans": "8", "sol": "兩式相加得 4x = 16 → x = 4，y = 2，xy = 8。", "chs": ["代數與函數／二元一次聯立方程式"]}]}, "g7_mockD": {"title": "七年級數學 學力檢測模擬卷 D", "range": "七年級全冊（對照官方評量向度）", "basis": "115年度縣市學生學習能力檢測 七年級數學評量向度說明（國立臺中教育大學 測驗統計與適性學習研究中心）", "url": "https://saaassessment.ntcu.edu.tw/AssessmentFrame", "items": [{"q": "下列哪一個數「不是」質數？", "opts": ["31", "41", "51", "61"], "ans": "51", "sol": "51 = 3×17 是合數；其餘三數都只有兩個因數。", "chs": ["數與量／100以內的質數"]}, {"q": "100 以內的質數中，個位數是 7 的有幾個？", "opts": ["4 個", "5 個", "6 個", "7 個"], "ans": "6 個", "sol": "7、17、37、47、67、97 共 6 個（27、57、77、87 皆為合數）。", "chs": ["數與量／100以內的質數"]}, {"q": "一個數的標準分解式是 2⁴×3²，這個數的因數共有幾個？", "opts": ["12 個", "15 個", "16 個", "20 個"], "ans": "15 個", "sol": "各指數加 1 後相乘：(4+1)×(2+1) = 15。", "chs": ["數與量／質因數分解"]}, {"q": "兩數的標準分解式為 2²×3 與 2×3²×5，它們的最小公倍數是多少？", "opts": ["60", "90", "180", "360"], "ans": "180", "sol": "各質因數取最大次方：2²×3²×5 = 180。", "chs": ["數與量／質因數分解"]}, {"q": "計算 (−2)³ ÷ 4 − (−3) 的值是多少？", "opts": ["1", "−1", "5", "−5"], "ans": "1", "sol": "(−2)³ = −8，−8÷4 = −2，−2−(−3) = 1。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 2/3 − (−1/6) × 2 的值是多少？", "opts": ["1", "1/3", "2/3", "1/2"], "ans": "1", "sol": "先乘：(−1/6)×2 = −1/3，2/3−(−1/3) = 1。", "chs": ["數與量／四則混合運算"]}, {"q": "計算 (−0.2)² × 50 的值是多少？", "opts": ["−2", "2", "20", "−20"], "ans": "2", "sol": "(−0.2)² = 0.04（負數平方為正），0.04×50 = 2。", "chs": ["數與量／四則混合運算"]}, {"q": "觀察數列 2、5、10、17、26、…，第 8 項是多少？", "opts": ["50", "65", "82", "101"], "ans": "65", "sol": "差依序為 3、5、7、9…，第 n 項 = n²+1，8²+1 = 65。", "chs": ["數與量／數的運算規律"]}, {"q": "觀察 100、50、25、12.5、…，第 6 項是多少？", "opts": ["3.125", "6.25", "1.5625", "0.78125"], "ans": "3.125", "sol": "每項除以 2：100÷2⁵ = 3.125。", "chs": ["數與量／數的運算規律"]}, {"q": "數線上 a 表示 −9、b 表示 3，線段 ab 的長度是多少？", "opts": ["6", "12", "−12", "27"], "ans": "12", "sol": "距離 = |3−(−9)| = 12，距離不會是負的。", "chs": ["數與量／數線"]}, {"q": "數線上介於 −5 與 2 之間（不含端點）的整數共有幾個？", "opts": ["5 個", "6 個", "7 個", "8 個"], "ans": "6 個", "sol": "−4、−3、−2、−1、0、1 共 6 個。", "chs": ["數與量／數線"]}, {"q": "下列四個式子中，值最大的是哪一個？", "opts": ["(−2)⁴", "−2⁴", "(−2)³", "−2³"], "ans": "(−2)⁴", "sol": "分別是 16、−16、−8、−8，(−2)⁴ = 16 最大。", "chs": ["數與量／指數的意義"]}, {"q": "a⁶ ÷ a² × a³ 等於下列何者？", "opts": ["a⁵", "a⁷", "a¹¹", "a¹"], "ans": "a⁷", "sol": "同底數：6−2+3 = 7。", "chs": ["數與量／指數律"]}, {"q": "(3x²)³ 等於下列何者？", "opts": ["3x⁶", "9x⁶", "27x⁶", "27x⁵"], "ans": "27x⁶", "sol": "積的乘方各自乘方：3³ = 27，(x²)³ = x⁶。", "chs": ["數與量／指數律"]}, {"q": "若 (2ᵐ)³ = 2¹², 則 m 是多少？", "opts": ["2", "3", "4", "9"], "ans": "4", "sol": "3m = 12 → m = 4。", "chs": ["數與量／指數律"]}, {"q": "某病毒直徑約 0.00000012 公尺，用科學記號表示是？", "opts": ["1.2×10⁻⁷", "1.2×10⁻⁸", "12×10⁻⁸", "1.2×10⁷"], "ans": "1.2×10⁻⁷", "sol": "小數點從 0.00000012 右移 7 位得 1.2，指數為 −7。", "chs": ["數與量／科學記號"]}, {"q": "(3×10⁻⁴) × (5×10⁷) 的結果是多少？", "opts": ["1.5×10³", "1.5×10⁴", "15×10³", "1.5×10⁻³"], "ans": "1.5×10⁴", "sol": "3×5 = 15，指數 −4+7 = 3，得 15×10³ = 1.5×10⁴。", "chs": ["數與量／科學記號"]}, {"q": "2.5×10⁶ 是 5×10³ 的幾倍？", "opts": ["50 倍", "500 倍", "5000 倍", "2 倍"], "ans": "500 倍", "sol": "2.5÷5 = 0.5，指數 6−3 = 3，0.5×10³ = 500。", "chs": ["數與量／科學記號"]}, {"q": "糖與水以 1:8 調配成糖水。若使用 40 公克糖，可調出多少公克糖水？", "opts": ["320 公克", "360 公克", "400 公克", "320 毫升"], "ans": "360 公克", "sol": "水 = 40×8 = 320 公克，糖水總重 = 40+320 = 360 公克。", "chs": ["數與量／比與比例式"]}, {"q": "a:b = 4:5、b:c = 3:2，則 a:c 是多少？", "opts": ["4:2", "6:5", "12:10", "2:1"], "ans": "6:5", "sol": "統一 b 為 15：a:b = 12:15、b:c = 15:10，故 a:c = 12:10 = 6:5。", "chs": ["數與量／比與比例式"]}, {"q": "點 P(a, b) 滿足 a < 0 且 b < 0，則 P 在第幾象限？", "opts": ["第一象限", "第二象限", "第三象限", "第四象限"], "ans": "第三象限", "sol": "兩者皆負在左下方的第三象限。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "直線 x = 4 與直線 y = −1 的交點坐標是什麼？", "opts": ["(4, −1)", "(−1, 4)", "(4, 1)", "(0, 0)"], "ans": "(4, −1)", "sol": "x = 4 是鉛直線、y = −1 是水平線，交點 x 為 4、y 為 −1。", "chs": ["坐標幾何／平面直角坐標系"]}, {"q": "每盒 a 元的餅乾買 3 盒，用 b 元的折價券折抵後實付多少元？", "opts": ["3a − b", "3(a − b)", "3a + b", "a − 3b"], "ans": "3a − b", "sol": "總價 3a 元，折抵 b 元後實付 3a − b。", "chs": ["代數與函數／代數符號"]}, {"q": "某數的 4 倍減 7 等於它的 2 倍加 9，這個數的一半是多少？", "opts": ["4", "8", "16", "2"], "ans": "4", "sol": "4x−7 = 2x+9 → 2x = 16 → x = 8，一半是 4。", "chs": ["代數與函數／一元一次方程式"]}, {"q": "若聯立方程式 x+3y=11、2x−y=1 的解為 (a, b)，則 a+b 是多少？", "opts": ["4", "5", "6", "7"], "ans": "5", "sol": "由第二式 y = 2x−1 代入得 x+3(2x−1) = 11 → 7x = 14 → x = 2，y = 3，a+b = 5。", "chs": ["代數與函數／二元一次聯立方程式"]}]}};
const BANK=Array.isArray(window.CLASS_RPG_QUESTION_BANK)?window.CLASS_RPG_QUESTION_BANK:[];
if(!BANK.length){throw new Error('共用題庫資料未載入：請確認 question-bank-data.js 載入順序。');}
const sel=new Set();
let filter='全部', fmt='json';
const key=(b,i)=>b.vol+'|'+b.cn+'|'+b.topic+'|'+i;

function render(){
  const box=document.getElementById('list');box.innerHTML='';
  let curChap=null,el=null,curUnit=null;
  BANK.filter(b=>filter==='全部'||('第'+b.vol+'冊')===filter).forEach(b=>{
    const cid=b.vol+'-'+b.cn;
    if(cid!==curChap){
      curChap=cid;curUnit=null;
      el=document.createElement('div');el.className='chap';
      const tot=BANK.filter(x=>x.vol===b.vol&&x.cn===b.cn);
      const rdy=tot.filter(x=>x.qs.length).length;
      el.innerHTML='<div class="chap-h"><span class="v">第 '+b.vol+' 冊</span>'+
        '<h2>第 '+b.cn+' 章　'+b.chap+'</h2>'+
        '<span class="st">'+rdy+' / '+tot.length+' 主題已建題庫</span></div>';
      box.appendChild(el);
    }
    if(b.unit!==curUnit){curUnit=b.unit;
      const u=document.createElement('div');u.className='unit-h';u.textContent='單元 '+b.unit;el.appendChild(u);}
    const row=document.createElement('div');row.className='trow';
    const has=b.qs.length>0;
    row.innerHTML='<div class="thead"><span class="tt">'+b.topic+'</span>'+
      '<span class="badge '+(has?'rdy':'non')+'">'+(has?b.qs.length+' 題':'待建置')+'</span></div>';
    if(has){
      const qs=document.createElement('div');qs.className='qs';
      b.qs.forEach((q,i)=>{
        const k=key(b,i);
        const lab=document.createElement('label');
        lab.className='qchk'+(q.adv?' adv':'')+(sel.has(k)?' on':'');
        lab.innerHTML='<input type="checkbox" '+(sel.has(k)?'checked':'')+'><span>第'+(i+1)+'題</span>';
        lab.querySelector('input').addEventListener('change',e=>{
          if(e.target.checked){sel.add(k);lab.classList.add('on');}
          else{sel.delete(k);lab.classList.remove('on');}
          upd();
        });
        qs.appendChild(lab);
      });
      const all=document.createElement('label');
      all.className='qchk';all.innerHTML='<input type="checkbox"><span>整組 '+b.qs.length+' 題</span>';
      all.querySelector('input').addEventListener('change',e=>{
        b.qs.forEach((q,i)=>{const k=key(b,i);if(e.target.checked)sel.add(k);else sel.delete(k);});
        upd();render();
      });
      qs.appendChild(all);
      if(b.mis&&b.mis.length){
        const ml=document.createElement('div');
        ml.className='misline';
        ml.innerHTML='<span class="lb">迷思診斷</span>';
        b.mis.forEach((q,i)=>{
          const k='M|'+b.ch+'|'+b.unit+'|'+i;
          const lab=document.createElement('label');
          lab.className='mischk'+(sel.has(k)?' on':'');
          lab.innerHTML='<input type="checkbox" '+(sel.has(k)?'checked':'')+'><span>'+(i+1)+'</span>';
          lab.querySelector('input').addEventListener('change',e=>{
            if(e.target.checked){sel.add(k);lab.classList.add('on');}
            else{sel.delete(k);lab.classList.remove('on');}
            upd();
          });
          ml.appendChild(lab);
        });
        const all2=document.createElement('label');
        all2.className='mischk';all2.innerHTML='<input type="checkbox"><span>整組 5 題</span>';
        all2.querySelector('input').addEventListener('change',e=>{
          b.mis.forEach((q,i)=>{const k='M|'+b.ch+'|'+b.unit+'|'+i;
            if(e.target.checked)sel.add(k);else sel.delete(k);});
          upd();render();
        });
        ml.appendChild(all2);
        const note=document.createElement('span');
        note.className='misnote';note.textContent='（同單元共用，勾選一次即可）';
        ml.appendChild(note);
        row.appendChild(ml);
      }
      const pvb=document.createElement('button');
      pvb.className='pvbtn';pvb.type='button';pvb.textContent='👁 看題目';
      qs.appendChild(pvb);
      row.appendChild(qs);
      const pv=document.createElement('div');
      pv.className='pv';
      pv.innerHTML=b.qs.map((q,i)=>
        '<div class="pvq'+(q.adv?' advq':'')+'"><span class="n">'+(i+1)+(q.adv?'★':'')+'</span><span class="qq">'+q.q+'</span>'+
        '<div class="oo">'+q.opts.map(o=>o===q.ans?'<b>'+o+' ✓</b>':o).join('　｜　')+'</div>'+
        '<div class="ss">解析：'+q.sol+'</div></div>').join('')
        + (b.mis||[]).map((q,i)=>
        '<div class="pvq mis"><span class="n">迷思 '+(i+1)+'</span><span class="qq">'+q.q+'</span>'+
        '<div class="oo">'+q.opts.map(o=>o===q.ans?'<b>'+o+' ✓</b>':o).join('　｜　')+'</div>'+
        '<div class="dg"><b>為什麼會錯：</b>'+q.diag+'　<b>['+q.type+']</b></div></div>').join('');
      pvb.addEventListener('click',()=>{
        pv.classList.toggle('open');
        pvb.textContent=pv.classList.contains('open')?'▲ 收起':'👁 看題目';
      });
      row.appendChild(pv);
    }
    el.appendChild(row);
  });
  if(filter==='全部')renderAssess();
}
function renderAssess(){
  const box=document.getElementById('list');
  Object.keys(ASSESS).forEach(pk=>{
    const P=ASSESS[pk];
    const sec=document.createElement('div');
    sec.className='asec';
    const picked=P.items.filter((q,i)=>sel.has('A|'+pk+'|'+i)).length;
    sec.innerHTML='<div class="asec-h"><span class="v">學力檢測</span>'+
      '<h2>'+P.title+'</h2><span class="st">範圍 '+P.range+'　共 '+P.items.length+' 題</span></div>'+
      (P.basis?'<div style="padding:8px 15px;font-size:11.5px;color:var(--soft);background:#F7FAFF;border-bottom:2px solid #EEF2F7">命題依據：'+P.basis+'（題目為對照評量向度自行撰寫，非重製官方試題）</div>':'');
    const top=document.createElement('div');
    top.className='arow';
    const all=document.createElement('label');
    all.className='achk';
    all.innerHTML='<input type="checkbox"'+(picked===P.items.length?' checked':'')+'><span>整卷 '+P.items.length+' 題</span>';
    all.querySelector('input').addEventListener('change',e=>{
      P.items.forEach((q,i)=>{const k='A|'+pk+'|'+i;
        if(e.target.checked)sel.add(k);else sel.delete(k);});
      upd();render();
    });
    top.appendChild(all);
    sec.appendChild(top);
    P.items.forEach((q,i)=>{
      const k='A|'+pk+'|'+i;
      const r=document.createElement('div');
      r.className='arow';
      r.innerHTML='<div class="aq">'+(i+1)+'. '+q.q+
        (q.chs||[]).map(c=>'<span class="ach">'+c+'</span>').join('')+'</div>';
      const line=document.createElement('div');
      line.className='aline';
      const lab=document.createElement('label');
      lab.className='achk'+(sel.has(k)?' on':'');
      lab.innerHTML='<input type="checkbox"'+(sel.has(k)?' checked':'')+'><span>選入</span>';
      lab.querySelector('input').addEventListener('change',e=>{
        if(e.target.checked){sel.add(k);lab.classList.add('on');}
        else{sel.delete(k);lab.classList.remove('on');}
        upd();
      });
      line.appendChild(lab);
      const ans=document.createElement('span');
      ans.style.cssText='font-size:12.5px;color:var(--soft);font-weight:700';
      ans.textContent='答案：'+q.ans;
      line.appendChild(ans);
      r.appendChild(line);
      sec.appendChild(r);
    });
    box.appendChild(sec);
  });
}
function upd(){document.getElementById('cnt').textContent='已選 '+sel.size+' 題';}
['全部','第1冊','第2冊','第3冊','第4冊','第5冊','第6冊'].forEach(t=>{
  const b=document.createElement('button');
  b.className='tab'+(t==='全部'?' on':'');b.textContent=t;
  b.addEventListener('click',()=>{filter=t;
    document.querySelectorAll('#tabs .tab').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');render();});
  document.getElementById('tabs').appendChild(b);
});
let expanded=false;
document.getElementById('expAll').addEventListener('click',()=>{
  expanded=!expanded;
  document.querySelectorAll('.pv').forEach(p=>p.classList.toggle('open',expanded));
  document.querySelectorAll('.pvbtn').forEach(b=>b.textContent=expanded?'▲ 收起':'👁 看題目');
  document.getElementById('expAll').textContent=expanded?'全部收合':'全部展開';
});
document.getElementById('q').addEventListener('input',e=>{
  const kw=e.target.value.trim();
  document.querySelectorAll('.trow').forEach(r=>{
    r.style.display = !kw || r.textContent.includes(kw) ? '' : 'none';
  });
  document.querySelectorAll('.chap').forEach(c=>{
    const any=[...c.querySelectorAll('.trow')].some(r=>r.style.display!=='none');
    c.style.display = any ? '' : 'none';
  });
});
render();
document.getElementById('fJson').addEventListener('click',()=>{fmt='json';
  document.getElementById('fJson').classList.add('on');document.getElementById('fText').classList.remove('on');});
document.getElementById('fText').addEventListener('click',()=>{fmt='text';
  document.getElementById('fText').classList.add('on');document.getElementById('fJson').classList.remove('on');});
document.getElementById('gen').addEventListener('click',()=>{
  const out=document.getElementById('out');out.style.display='block';
  if(!sel.size){out.value='（尚未勾選任何題目）';return;}
  const picked=[];
  BANK.forEach(b=>b.qs.forEach((q,i)=>{
    if(sel.has(key(b,i)))picked.push({kind:'practice',level:(q.adv?'進階':'基礎'),tag:(q.tag||''),vol:b.vol,chapter:b.cn,chapterName:b.chap,
      unit:b.unit,topic:b.topic,question:q.q,options:q.opts,answer:q.ans,solution:q.sol});
  }));
  Object.keys(ASSESS).forEach(pk=>{
    const P=ASSESS[pk];
    P.items.forEach((q,i)=>{
      if(sel.has('A|'+pk+'|'+i))picked.push({kind:'assessment',paper:P.title,
        range:P.range,vol:0,chapter:'',chapterName:(q.chs||[]).join('、'),
        unit:'',topic:'',question:q.q,options:q.opts,answer:q.ans,solution:q.sol});
    });
  });
  const seen=new Set();
  BANK.forEach(b=>(b.mis||[]).forEach((q,i)=>{
    const k='M|'+b.ch+'|'+b.unit+'|'+i;
    if(sel.has(k)&&!seen.has(k)){
      seen.add(k);
      picked.push({kind:'misconception',vol:b.vol,chapter:b.cn,chapterName:b.chap,
        unit:b.unit,topic:'',question:q.q,options:q.opts,answer:q.ans,
        solution:q.diag,errorType:q.type});
    }
  }));
  if(fmt==='json')out.value=JSON.stringify({count:picked.length,items:picked},null,1);
  else{
    let s='【出題清單】共 '+picked.length+' 題\n\n',last='';
    picked.forEach((p,i)=>{
      const h = p.kind==='assessment'
        ? (p.paper+'（範圍 '+p.range+'）')
        : ('第'+p.vol+'冊 第'+p.chapter+'章 '+p.chapterName+' ／ '+(p.topic||('單元 '+p.unit+'（迷思診斷）')));
      if(h!==last){s+='\n■ '+h+'\n';last=h;}
      s+='  '+(i+1)+'. '+(p.kind==='misconception'?'【迷思診斷】':(p.kind==='assessment'?'【學力檢測】':(p.level==='進階'?'【進階·'+p.tag+'】':'')))+p.question+'\n';
      if(p.options)s+='     選項：'+p.options.join('　')+'\n';
      s+='     答案：'+p.answer+'\n     '+(p.kind==='misconception'?'為什麼會錯：':'解析：')+p.solution+(p.errorType?'　['+p.errorType+']':'')+'\n';
    });
    out.value=s;
  }
  out.focus();out.select();
});
document.getElementById('clr').addEventListener('click',()=>{sel.clear();upd();render();
  document.getElementById('out').style.display='none';});

