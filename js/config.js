// Math Quest 可調整數值（全部集中在這裡）
// 來源：Nova game-design.md 第 3、5、6、7、9 節；Euclid 各單元規格。
// 試玩 1–2 週後依 log 調整（風險 R10）。改數值不需要改其他程式。

export const CONFIG = Object.freeze({
  // ---- 3.1 計分 ----
  SCORE: Object.freeze({ correct: 1, half: 0.5, wrong: 0 }),

  // ---- 3.4 難度升降 ----
  PROMOTE_STREAK: 3,            // 同一級連續 3 題 correct → 升一級
  DEMOTE_POINTS: 2,             // 同一級錯誤點數 ≥ 2 → 降一級
  ERROR_POINTS: Object.freeze({ correct: 0, half: 0.5, wrong: 1 }),
  HISTORY_LEN: 10,              // history 只保留最近 10 題
  DEMOTION_KEEP_DAYS: 30,
  PREREQ_INSERT_ON_DEMOTE: 1,   // 降級時插入幾題先備
  PREREQ_INSERT_AT_FLOOR: 2,    // 已在最低級時插入幾題先備（另加示範題）

  // ---- 3.5 關卡內保護 ----
  ASSIST_TRIGGER_WRONGS: 2,     // 同一關連續 2 題 wrong → 陪練模式
  QUICK_WRONG_SECS: 3,          // 選擇題 < 3 秒且答錯
  QUICK_WRONG_TRIGGER: 2,       // 同一關發生 2 次 → 下一題確定鍵延遲
  CONFIRM_DELAY_MS: 3000,

  // ---- 3.6 熟練度 ----
  RECENT_MIN_DENOM: 5,          // history 不足 5 題時用 5 當分母
  MASTERED: Object.freeze({ level: 4, accuracy: 0.8, history: 10 }),
  FAMILIAR: Object.freeze({ level: 3, accuracy: 0.7, history: 6 }),
  // 題型的最高等級低於門檻時（例如圓周長題型 1 只有 L1–2），門檻改成「該題型的最高等級」。
  CLAMP_MASTERY_LEVEL_TO_TYPE_MAX: true,

  // ---- 3.7 關卡組成 ----
  STAGE_MAIN_COUNT: 4,          // 第 2–5 題主練
  STAGE_MAX_ITEMS: 8,           // 6 題 + 最多 2 題插入
  REVIEW_STAGE_MAX: 6,          // 修補工坊一關最多幾張卡

  // ---- 2.3 初始熟練度（尚未做診斷時用「未測到，其他」）----
  INITIAL_LEVEL_UNTESTED: 2,
  INITIAL_GUIDANCE_UNTESTED: 2,
  GUIDANCE_FLOOR_WORD_GEO: 2,   // 應用題、幾何題型初始 G 不低於 2

  // ---- 4.2 引導等級（讀題小幫手 UI 在下一個里程碑；規則先保留）----
  GUIDE_FLOOR_BY_LEVEL: Object.freeze({ 1: 2, 2: 2, 3: 1, 4: 0, 5: 0 }),
  FADE_STREAK: 4,
  RAISE_READ_ERRORS: 2,

  // ---- 5 錯題本 ----
  INTERVAL_DAYS: Object.freeze([0, 1, 3, 7]),
  OVERCOME_STREAK: 2,
  NEEDS_HELP_WRONG: 3,
  READING_OVERCOME_MAX_G: 2,
  MISTAKE_REVIEWS_KEEP: 10,
  DAILY_REVIEW_LIMIT: 6,

  // ---- 6.1 星星 ----
  STAR2_RATE: 0.6,
  STAR3_RATE: 0.85,

  // ---- 6.4 努力點 ----
  DEW: Object.freeze({ answer: 1, halfBonus: 1, afterExplanation: 2, overcome: 5, diagnosticSegment: 5, daily: 10 }),
  DEW_DAILY_CAP: 80,
  MASCOT_STAGES: Object.freeze([0, 40, 140, 320, 600]),

  // ---- 7 / 9 時間與保存 ----
  DAY_START_HOUR: 4,            // 凌晨 04:00 換日
  PRACTICE_DAY_SECS: 300,       // 「練習 1 天」：≥ 5 分鐘或 ≥ 1 關
  IDLE_STOP_SECS: 60,           // 單題超過 60 秒沒有觸控就停止計時
  LOG_MAX: 2000,
  KEEP_DAYS: 180,               // sessions、daily 保留天數
  RECENT_SEED_DAYS: 7,          // 同技能鍵 7 天內不重複同一組數字
  GEN_MAX_RETRIES: 40,

  // ---- 4.2 讀題小幫手 ----
  HELPER_NOISE_MAX: 1,          // 圈已知時，干擾數字最多可以多圈 1 個
  HELPER_STEP_TRIES: 2,         // 同一步最多試 2 次，第 2 次還沒成功就自動示範

  // ---- 7 每日任務 ----
  DAILY_MINUTES_DEFAULT: 10,
  DAILY_MINUTES_OPTIONS: Object.freeze([10, 15]),   // 一般模式上限 15 分鐘
  MINUTES_PER_STAGE: 5,
  DIGEST_MODE_ACTIVE: 20,       // 修補中的卡 > 20 張 → 消化模式
  DIGEST_RESUME_ACTIVE: 12,
  REVIEW_FIRST_DUE: 3,          // 到期 ≥ 3 張 → 先排一關錯題小站

  // ---- 2 診斷 ----
  DIAG_EARLY_STOP: null,        // diagnostic.md 沒有規定提早結束；Nova 2.2 的「連錯 3 題」先關閉（每段題目橫跨不同題組）
  DIAG_READING_TYPE_MIN: 3,     // 拆題後 C 類 ≥ 3 題 → 讀題型

  // ---- 8 家長區 ----
  PIN_SALT: 'mathquest-pin-v1',
  BACKUP_CARD_DAYS: 7,          // ≥ 7 天沒備份：家長區先顯示「該備份囉」
  BACKUP_CHILD_ICON_DAYS: 14,   // ≥ 14 天：孩子首頁出現小圖示
  SNAPSHOT_WEEKS: 12,

  // ---- 回饋：答對時刻（使用者試玩回饋：鼓勵太少、好像直接跳下一題）----
  CORRECT_AUTO_ADVANCE_MS: null,  // null = 不自動前進，停在慶祝畫面，由孩子按「下一題」
  HIGH_FIVE_DEW: 1,               // 點吉祥物擊掌 +1 努力點，每題 1 次（仍受每日 80 點上限）
  STREAK_CELEBRATE: 3,            // 同一關連續答對 3 題 → 連續慶祝
  CHALLENGE_LEVEL: 4,             // L4 以上第一次就答對 → 挑戰級慶祝
  FAST_RATIO: 0.5,                // 思考時間 < 該題型中位數 × 0.5 又答對 → 「又快又準」
  FAST_MIN_SAMPLES: 5,            // 至少 5 筆紀錄才算中位數
  STAR_INTERVAL_MS: 300,          // 結算時星星逐顆亮起的間隔

  // ---- 9 儲存 ----
  SCHEMA_VERSION: 1,
  STORAGE_KEY: 'mathquest:v1',
  BEFORE_IMPORT_KEY: 'mathquest:v1:before-import',
  DAILY_SNAPSHOT_KEY: 'mathquest:v1:daily-snapshot',
  IDB_NAME: 'mathquest',
  IDB_STORE: 'kv',

  // ---- 3.2 回饋文字（不可出現「錯了」「不對」「失敗」）----
  RETRY_PHRASES: Object.freeze([
    '差一點點！我們看看提示',
    '再想想，你快找到了',
    '我們一起看看這個提示',
    '慢慢來，換個方向想想看',
    '很接近了！看一下小提示',
    '先停一下，讀讀這句提示',
    '沒關係，提示來幫忙了',
    '你已經想到一半了，再試一次',
    '換個角度看看，提示在這裡',
    '深呼吸，我們再試一次',
  ]),
  SOLVE_PHRASE: '沒關係，我們一起一步一步做',
  MISTAKE_NOTE: '這題我會幫你記下來，等一下再挑戰一次類似的！',
  CORRECT_PHRASES: Object.freeze(['答對了！', '好棒！', '漂亮！', '你做到了！', '太厲害了！']),
  LEVEL_UP_PHRASE: '你越來越厲害了，來點新挑戰！',
  SLOW_DOWN_PHRASE: '我們慢慢想，不急喔',
});
