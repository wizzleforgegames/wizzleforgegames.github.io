"use strict";
/* =========================================================
   АРБУЗ: СОЕДИНЯЙ ФРУКТЫ (Watermelon Merge) — Merge & Grow
   Yandex Games SDK · Canvas 2D · vanilla JS
   ========================================================= */

/* ---------------- utils ---------------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const now = () => performance.now();
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function hash32(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function todayKey() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function dayIdx() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }

/* ---------------- i18n ---------------- */
const I18N = {
  ru: {
    name: "Арбуз: Соединяй Фрукты", logoA: "Арбуз", logoB: "Соединяй Фрукты",
    tag: "Капай · Сливай · Расти", play: "Играть", quest: "Квесты", zen: "Дзен",
    best: "Рекорд", coins: "Монеты", level: "Уровень", score: "Очки", next: "Далее",
    hint: "Тяни пальцем — капни фрукт", pause: "Пауза", resume: "Продолжить", restart: "Заново",
    menu: "Меню", over: "Игра окончена", newrec: "Новый рекорд!", again: "Играть снова",
    maxfruit: "Лучший фрукт", revive: "Оживить (видео)", shop: "Магазин", achv: "Достижения",
    lead: "Рекорды", howTitle: "Как играть", settings: "Настройки", quests: "Квесты",
    music: "Музыка", sfx: "Звуки", vib: "Вибрация", lang: "Язык", reset: "Сбросить прогресс",
    daily: "Задание дня", loading: "Загрузка…", continue: "Дальше", freecoins: "+100 монет (видео)",
    how1: "Целься пальцем или мышью, отпусти — фрукт упадёт.",
    how2: "Два одинаковых фрукта сливаются в следующий, крупнее.",
    how3: "Цепочка слияний даёт комбо-множитель и бонусные монеты.",
    how4: "Не давай стопке пересечь красную линию — иначе конец игры.",
    combo: "КОМБО", danger: "Осторожно! Стопка растёт",
    reviveDone: "Поле очищено — играй дальше!", noCoins: "Недостаточно монет",
    bought: "Куплено!", armed: "Нажми на фрукт, чтобы взорвать",
    leadHint: "Пока нет данных — сыграй партию!", you: "Вы",
    questNext: "Следующая цель", questDone: "Квест выполнен!", lvlUp: "Новый уровень!",
    dailyDone: "Задание дня выполнено!", adErr: "Видео недоступно", adWait: "Смотрим видео…",
    share: "Поделиться", rating: "Оценить игру",
    levelShort: "Уровень", xp: "Опыт", time: "Время", merges: "Слияний", drops: "Капель",
    bestCombo: "Макс. комбо", freeRevive: "Оживить (бесплатно)", adRevive: "Оживить (видео)",
    nearRec: "До рекорда совсем близко!", ms: "Рубеж",
    streakOn: "Заходи завтра — серия дней продлится!", dailyShort: "Цель дня", questShort: "Квест",
    tapDrop: "Тапни по полю, чтобы капнуть",
    pwBomb: "Бомба", pwBombD: "Уничтожает любой фрукт на поле",
    pwSwap: "Замена", pwSwapD: "Меняет фрукт в руке на другой",
    pwClear: "Очищение", pwClearD: "Убирает верхние фрукты (оживление)",
    achvT: (n) => `Открыто ${n}`,
    dmode: "Забег дня", dBest: "Рекорд дня", dGoal: "Побей рекорд дня", dReward: "Награда за забег",
    dcta: "Забег дня", dDone: "Награда за забег получена", dNew: "Новый рекорд дня!",
    themes: "Темы поля", themeOn: "Включена", themeBuy: "Купить", themePick: "Включить", themeHint: (a, b) => `Открыто ${a} из ${b}`,
    claim: "Забрать", claimed: "Забрано", calT: "Награда за вход", calBonus: "+бомба",
    chapter: "Этап", goal: "Цель", gold: "Золотой фрукт!", goldHint: "Слей его за монеты",
    missed: "Серия прервана — начни заново!", back: "С возвращением!",
    goalRun: "Идти к этой цели", qList: "Цели идут одна за другой — они не кончаются.",
    league: "Лига недели", lgUp: "Новая лига!", lgWeek: "Награда недели",
    chest: "Сундук этапа", chestOpen: "Открыть", chestGo: "Дальше", chestHint: "Награда за прохождение этапа",
    tut1: "Тяни пальцем по полю. Отпустишь — фрукт упадёт.", tut2: "Слей два одинаковых фрукта в один большой.",
    tut3: "Цепочка слияний даёт комбо и монеты. Ты справляешься!",
    giftBack: "Бонус за возвращение",
    iapT: "За реальные деньги", iapHint: "покупки в игре", iapOff: "недоступно в этой сборке",
    iapTag: "деньги", iapOwned: "Уже куплено", payOk: "Спасибо за покупку!",
    payCancel: "Покупка отменена", payErr: "Покупка не удалась", payOff: "Покупки сейчас недоступны",
    x2: "Удвоить награду", adLimit: "Видео за монеты на сегодня закончились",
    adLeft: (n) => "осталось " + n, reviveCoins: (c) => "или оживить за " + c + " монет",
    noadsOn: "Реклама отключена", dblOn: "Монеты ×2 включены",
    authBtn: "Войти с Яндекс ID", authOn: "Вы вошли — прогресс в облаке",
    authHint: "Вход сохраняет прогресс на всех устройствах и показывает ваше место в рекордах.",
    authErr: "Не удалось войти, попробуйте позже", authLead: "Войдите, чтобы попасть в таблицу рекордов",
  },
  en: {
    name: "Watermelon Merge: Fruit Drop", logoA: "Watermelon", logoB: "Merge",
    tag: "Drop · Merge · Grow", play: "Play", quest: "Quests", zen: "Zen",
    best: "Best", coins: "Coins", level: "Level", score: "Score", next: "Next",
    hint: "Drag to aim · release to drop", pause: "Pause", resume: "Continue", restart: "Restart",
    menu: "Menu", over: "Game Over", newrec: "New record!", again: "Play again",
    maxfruit: "Best fruit", revive: "Revive (video)", shop: "Shop", achv: "Achievements",
    lead: "Leaderboard", howTitle: "How to play", settings: "Settings", quests: "Quests",
    music: "Music", sfx: "Sound FX", vib: "Vibration", lang: "Language", reset: "Reset progress",
    daily: "Daily task", loading: "Loading…", continue: "Continue", freecoins: "+100 coins (watch ad)",
    how1: "Aim with finger or mouse, release to drop the fruit.",
    how2: "Two equal fruits merge into the next, bigger one.",
    how3: "Chain merges give a combo multiplier and bonus coins.",
    how4: "Don't let the pile cross the red line — or it's game over.",
    combo: "COMBO", danger: "Careful! The pile is growing",
    reviveDone: "Field cleared — keep playing!", noCoins: "Not enough coins",
    bought: "Bought!", armed: "Tap a fruit to blow it up",
    leadHint: "No scores yet — play a round!", you: "You",
    questNext: "Next goal", questDone: "Quest complete!", lvlUp: "New level!",
    dailyDone: "Daily task complete!", adErr: "Video unavailable", adWait: "Playing video…",
    share: "Share", rating: "Rate the game",
    levelShort: "Level", xp: "XP", time: "Time", merges: "Merges", drops: "Drops",
    bestCombo: "Best combo", freeRevive: "Revive (free)", adRevive: "Revive (video)",
    nearRec: "Your record is within reach!", ms: "Milestone",
    streakOn: "Come back tomorrow to keep the streak!", dailyShort: "Daily", questShort: "Quest",
    tapDrop: "Tap the field to drop a fruit",
    pwBomb: "Bomb", pwBombD: "Destroys any fruit on the field",
    pwSwap: "Swap", pwSwapD: "Changes the fruit in your hand",
    pwClear: "Clean up", pwClearD: "Removes the top fruits (revive)",
    achvT: (n) => `Unlocked ${n}`,
    dmode: "Daily run", dBest: "Today's best", dGoal: "Beat today's best", dReward: "Daily run reward",
    dcta: "Daily run", dDone: "Daily run reward claimed", dNew: "New daily record!",
    themes: "Field themes", themeOn: "Active", themeBuy: "Buy", themePick: "Equip", themeHint: (a, b) => `${a} of ${b} unlocked`,
    claim: "Claim", claimed: "Claimed", calT: "Daily reward", calBonus: "+bomb",
    chapter: "Chapter", goal: "Goal", gold: "Golden fruit!", goldHint: "Merge it for coins",
    missed: "Streak broken — start again!", back: "Welcome back!",
    goalRun: "Go for this goal", qList: "Goals keep coming — they never end.",
    league: "Weekly league", lgUp: "New league!", lgWeek: "Weekly reward",
    chest: "Chapter chest", chestOpen: "Open", chestGo: "Next", chestHint: "Reward for clearing the chapter",
    tut1: "Drag your finger across the field. Let go and the fruit drops.", tut2: "Merge two equal fruits into a bigger one.",
    tut3: "Merge chains give combo and coins. Nice work!",
    giftBack: "Welcome back bonus",
    iapT: "Real money", iapHint: "in-game purchases", iapOff: "not available in this build",
    iapTag: "money", iapOwned: "Already owned", payOk: "Thanks for your purchase!",
    payCancel: "Purchase cancelled", payErr: "Purchase failed", payOff: "Purchases are unavailable",
    x2: "Double the reward", adLimit: "No more coin videos today",
    adLeft: (n) => n + " left", reviveCoins: (c) => "or revive for " + c + " coins",
    noadsOn: "Ads are off", dblOn: "Coins ×2 active",
    authBtn: "Sign in with Yandex ID", authOn: "Signed in — progress is in the cloud",
    authHint: "Sign in to keep progress on every device and to appear in the leaderboard.",
    authErr: "Sign-in failed, please try later", authLead: "Sign in to join the leaderboard",
  }
};
let LANG = "ru";
const T = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;

/* ---------------- fruits ---------------- */
const FRUITS = [
  { img: "assets/sprites/00_cherry.png", r: 17, c: "#ff5c72", n: { ru: "Вишня", en: "Cherry" } },
  { img: "assets/sprites/01_strawberry.png", r: 21, c: "#ff7a8a", n: { ru: "Клубника", en: "Strawberry" } },
  { img: "assets/sprites/02_grape.png", r: 26, c: "#9b7bff", n: { ru: "Виноград", en: "Grape" } },
  { img: "assets/sprites/03_gyool.png", r: 31, c: "#f0a24a", n: { ru: "Кумкват", en: "Kumquat" } },
  { img: "assets/sprites/04_orange.png", r: 37, c: "#ff9f43", n: { ru: "Апельсин", en: "Orange" } },
  { img: "assets/sprites/05_apple.png", r: 44, c: "#e8433f", n: { ru: "Яблоко", en: "Apple" } },
  { img: "assets/sprites/06_pear.png", r: 52, c: "#d8c15a", n: { ru: "Груша", en: "Pear" } },
  { img: "assets/sprites/07_peach.png", r: 60, c: "#ff9aa2", n: { ru: "Персик", en: "Peach" } },
  { img: "assets/sprites/08_pineapple.png", r: 70, c: "#f4c531", n: { ru: "Ананас", en: "Pineapple" } },
  { img: "assets/sprites/09_melon.png", r: 84, c: "#7ed957", n: { ru: "Дыня", en: "Melon" } },
  { img: "assets/sprites/10_watermelon.png", r: 100, c: "#3fae5a", n: { ru: "Арбуз", en: "Watermelon" } },
];
const MAXLV = FRUITS.length - 1;
/* field themes: palettes only, no extra assets */
const THEMES = [
  { id: "classic", price: 0, n: { ru: "Классика", en: "Classic" }, d: { ru: "Тёплая кухня", en: "Warm kitchen" },
    sky: ["#fff6e6", "#ffe2c2", "#ffcdda"], shelf: ["rgba(196,132,96,.55)", "rgba(226,168,124,.75)", "rgba(178,116,84,.8)"],
    wall: "rgba(120,80,90,", shade: "rgba(180,110,120,", light: "rgba(255,255,255,.75)" },
  { id: "forest", price: 1500, n: { ru: "Лес", en: "Forest" }, d: { ru: "Прохладная поляна", en: "Cool glade" },
    sky: ["#f2fff0", "#d7f0cd", "#bfe3d6"], shelf: ["rgba(120,150,96,.55)", "rgba(158,186,124,.75)", "rgba(104,138,86,.8)"],
    wall: "rgba(50,90,60,", shade: "rgba(60,110,80,", light: "rgba(255,255,255,.6)" },
  { id: "space", price: 3000, dark: 1, n: { ru: "Космос", en: "Space" }, d: { ru: "Пурпурная туманность", en: "Purple nebula" },
    sky: ["#3a2f6b", "#241f47", "#15122c"], shelf: ["rgba(120,100,190,.55)", "rgba(150,130,220,.7)", "rgba(90,74,150,.85)"],
    wall: "rgba(10,6,30,", shade: "rgba(20,10,50,", light: "rgba(190,170,255,.35)" },
  { id: "candy", price: 5000, n: { ru: "Конфеты", en: "Candy" }, d: { ru: "Розовая вата", en: "Pink cotton" },
    sky: ["#fff0fa", "#ffd9ef", "#d9e4ff"], shelf: ["rgba(220,140,190,.55)", "rgba(240,170,215,.75)", "rgba(190,110,165,.8)"],
    wall: "rgba(140,70,110,", shade: "rgba(160,90,130,", light: "rgba(255,255,255,.7)" },
  /* paid themes: real money only, palettes only (no extra weight in the package) */
  { id: "neon", price: -1, iap: "theme_neon", dark: 1, n: { ru: "Неон", en: "Neon" }, d: { ru: "Ночной город", en: "Night city" },
    sky: ["#120f3a", "#1d1150", "#2b0b38"], shelf: ["rgba(0,220,255,.35)", "rgba(140,90,255,.55)", "rgba(0,180,220,.62)"],
    wall: "rgba(0,0,24,", shade: "rgba(10,0,44,", light: "rgba(120,240,255,.26)" },
  { id: "night", price: -1, iap: "theme_night", dark: 1, n: { ru: "Ночь", en: "Night" }, d: { ru: "Тихая луна", en: "Quiet moon" },
    sky: ["#243055", "#161d33", "#0b0f1c"], shelf: ["rgba(130,150,200,.42)", "rgba(160,180,215,.58)", "rgba(95,115,155,.7)"],
    wall: "rgba(4,8,22,", shade: "rgba(8,12,30,", light: "rgba(205,220,255,.2)" },
];
const THEME_BY_ID = {}; THEMES.forEach((t) => (THEME_BY_ID[t.id] = t));
const theme = () => THEME_BY_ID[(S.themes && S.themes.cur) || "classic"] || THEMES[0];
const themeOwned = () => THEMES.filter((t) => S.themes && S.themes.owned && S.themes.owned[t.id]).length;
const fruitName = (lv) => (FRUITS[lv].n[LANG] || FRUITS[lv].n.en);

/* ---------------- save ---------------- */
const DEF = {
  best: 0, coins: 0, xp: 0, lvl: 1, games: 0, totalMerges: 0, totalDrops: 0, totalScore: 0,
  maxLv: 0, bestCombo: 0, achv: {}, daily: { day: "", id: 0, prog: 0, done: false },
  music: true, sfx: true, vib: true, lang: null, quest: 0, plays: 0, revived: 0,
  bombCnt: 0, swapCnt: 0, bought: 0, boost: 0, seen: 0, finale: 0,
  streak: 0, lastDayIdx: 0, freeReviveDay: "",
  dRun: { day: "", best: 0, played: 0, claimed: 0, total: 0 },
  cal: { last: 0, streak: 0, claimDay: "" },
  themes: { cur: "classic", owned: { classic: 1 } },
  goldCnt: 0, rated: 0, finaleShown: 0,
  lg: { week: "", xp: 0, tier: 0, lastTier: 0, paid: 0 },
  tut: 0, lastVisit: 0, giftDay: "",
  iap: {}, adDay: "", adN: 0
};
let S = Object.assign({}, DEF);
function loadSave() {
  try { const raw = localStorage.getItem("fruitdrop_v2"); if (raw) S = Object.assign({}, DEF, JSON.parse(raw)); } catch (e) { }
  if (!S.lang) S.lang = null;
  if (!S.achv || typeof S.achv !== "object") S.achv = {};
  if (!S.daily || typeof S.daily !== "object") S.daily = { day: "", id: 0, prog: 0, done: false };
  for (const k of ["coins", "best", "xp", "lvl", "quest", "streak", "lastDayIdx", "maxLv", "bestCombo", "bombCnt", "swapCnt", "goldCnt"]) {
    if (typeof S[k] !== "number" || !isFinite(S[k])) S[k] = DEF[k];
  }
  if (!S.dRun || typeof S.dRun !== "object") S.dRun = JSON.parse(JSON.stringify(DEF.dRun));
  if (!S.cal || typeof S.cal !== "object") S.cal = JSON.parse(JSON.stringify(DEF.cal));
  if (!S.themes || typeof S.themes !== "object") S.themes = JSON.parse(JSON.stringify(DEF.themes));
  if (!S.themes.owned || typeof S.themes.owned !== "object") S.themes.owned = { classic: 1 };
  if (!THEME_BY_ID[S.themes.cur]) S.themes.cur = "classic";
  for (const k of ["best", "played", "claimed", "total"]) if (typeof S.dRun[k] !== "number") S.dRun[k] = 0;
  if (!S.lg || typeof S.lg !== "object") S.lg = JSON.parse(JSON.stringify(DEF.lg));
  for (const k of ["xp", "tier", "lastTier", "paid"]) if (typeof S.lg[k] !== "number" || !isFinite(S.lg[k])) S.lg[k] = 0;
  if (typeof S.lg.week !== "string") S.lg.week = "";
  if (!S.iap || typeof S.iap !== "object") S.iap = {};
  for (const k of ["noads", "dbl", "starter"]) if (typeof S.iap[k] !== "number") S.iap[k] = 0;
  if (typeof S.adN !== "number" || !isFinite(S.adN)) S.adN = 0;
  if (typeof S.adDay !== "string") S.adDay = "";
  if (typeof S.tut !== "number") S.tut = 0;
  if (typeof S.lastVisit !== "number") S.lastVisit = 0;
  if (typeof S.giftDay !== "string") S.giftDay = "";
  for (const k of ["last", "streak"]) if (typeof S.cal[k] !== "number") S.cal[k] = 0;
  if (typeof S.cal.claimDay !== "string") S.cal.claimDay = "";
}
function persist() { try { localStorage.setItem("fruitdrop_v2", JSON.stringify(S)); } catch (e) { } }
let saveCloudTimer = 0, persistTimer = 0;
/* merges call save() many times per second — coalesce localStorage writes so the game never stutters */
function save() {
  clearTimeout(saveCloudTimer); saveCloudTimer = setTimeout(cloudSave, 1200);
  if (!persistTimer) persistTimer = setTimeout(() => { persistTimer = 0; persist(); }, 700);
}
function flushSave() { if (persistTimer) { clearTimeout(persistTimer); persistTimer = 0; } persist(); }
function cloudSave() { if (player) { try { player.setData({ save: S }, true).catch(() => { }); } catch (e) { } } }

/* ---------------- audio (real MP3 from Mixkit) ---------------- */
const SND_DIR = "assets/sound/";
const SFXNAMES = ["drop", "merge", "bigmerge", "combo", "coin", "click", "over", "win", "levelup", "achv", "bomb", "warn", "revive", "bounce", "tick"];
const AU = {};
function preloadAudio() {
  for (const n of SFXNAMES) { AU[n] = []; for (let i = 0; i < 3; i++) { const a = new Audio(SND_DIR + n + ".mp3"); a.preload = "auto"; AU[n].push(a); } }
}
/* BGM is the heaviest file in the package: it is fetched only after the first user gesture,
   so the first frame and LoadingAPI.ready() stay fast */
function ensureBgm() {
  if (AU.__bgm) return true;
  try { AU.__bgm = new Audio(SND_DIR + "bgm.mp3"); AU.__bgm.loop = true; AU.__bgm.volume = 0.42; } catch (e) { return false; }
  return true;
}
let ai = {};
function sfx(name, vol = 1) {
  if (!S.sfx || !AU[name]) return;
  const arr = AU[name]; ai[name] = ((ai[name] || 0) + 1) % arr.length;
  const a = arr[ai[name]];
  try { a.currentTime = 0; a.volume = clamp(vol, 0, 1); a.play().catch(() => { }); } catch (e) { }
}
let bgmOn = false;
function musicStart() {
  if (!S.music || bgmOn || !ensureBgm()) return;
  bgmOn = true; AU.__bgm.play().catch(() => { bgmOn = false; });
}
function musicStop() { if (!AU.__bgm) return; bgmOn = false; try { AU.__bgm.pause(); } catch (e) { } }
/* stops BGM and every running SFX: used on ads and on focus loss (п. 1.3, 4.7) */
function muteAll() { musicStop(); for (const k in AU) { const a = AU[k]; if (!a) continue; if (Array.isArray(a)) { for (const x of a) { try { x.pause(); } catch (e) { } } } else { try { a.pause(); } catch (e) { } } } }
function musicDuck(v) { if (AU.__bgm) AU.__bgm.volume = v; }
function buzz(ms) { if (S.vib && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { } } }

/* ---------------- Yandex SDK ---------------- */
let ysdk = null, player = null, lead = null, leadName = null, leadNew = false, adsShown = 0, lastInter = -1e9;
const LB_NAME = "best";            /* technical name of the leaderboard in the developer console */
let sdkReadyDone = false;
/* LoadingAPI.ready() must fire only when the player can actually start playing (п. 1.19.2) */
function sdkReady() {
  if (sdkReadyDone) return; sdkReadyDone = true;
  try { ysdk && ysdk.features && ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready(); } catch (e) { }
}
async function initSDK() {
  if (!window.YaGames) return;
  try {
    ysdk = await window.YaGames.init();
    const l = ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang;
    if (!S.lang && l && I18N[l]) LANG = l;
    try { player = await ysdk.getPlayer({ permissions: false }); } catch (e) { }
    await syncFromCloud();
    await initLeaderboards();
    await initPayments();
  } catch (e) { console.warn("SDK", e); }
}
const isAuthed = () => !!(player && player.isAuthorized && player.isAuthorized());
async function syncFromCloud() {
  if (!player) return;
  try {
    const d = await player.getData();
    if (!d || !d.save) return;
    const r = d.save;
    if (!r || typeof r !== "object") return;
    const keep = Object.assign({}, DEF, r);
    // merge: keep the better of local/remote for every numeric counter
    for (const k of Object.keys(DEF)) {
      if (typeof DEF[k] === "number") keep[k] = Math.max(keep[k] || 0, S[k] || 0);
    }
    keep.achv = Object.assign({}, r.achv || {}, S.achv || {});
    keep.daily = (r.daily && (r.daily.prog || 0) > (S.daily.prog || 0)) ? r.daily : S.daily;
    keep.dRun = (r.dRun && (r.dRun.best || 0) > (S.dRun.best || 0)) ? r.dRun : S.dRun;
    keep.cal = (r.cal && (r.cal.streak || 0) > (S.cal.streak || 0)) ? r.cal : S.cal;
    const lgRemote = r.lg && (r.lg.xp || 0) > (S.lg.xp || 0) ? r.lg : S.lg;
    keep.lg = lgRemote;
    keep.themes = { cur: S.themes.cur, owned: Object.assign({}, (r.themes && r.themes.owned) || {}, S.themes.owned || {}) };
    keep.lang = S.lang || r.lang || null;
    keep.iap = {};
    for (const k of ["noads", "dbl", "starter"]) keep.iap[k] = Math.max((r.iap && r.iap[k]) || 0, (S.iap && S.iap[k]) || 0);
    keep.adDay = S.adDay; keep.adN = S.adN;
    S = keep; S.cal.claimDay = S.cal.claimDay || ""; persist();
  } catch (e) { }
}
/* sign-in is only triggered by an explicit button (п. 1.2.1), guest play keeps working (п. 1.2.2) */
async function doAuth() {
  if (!ysdk || !ysdk.auth || !ysdk.auth.openAuthDialog) { toast(T("authErr"), "", "gold"); return; }
  sfx("click", 0.4);
  try {
    await ysdk.auth.openAuthDialog();
    try { player = await ysdk.getPlayer(); } catch (e) { }
    await syncFromCloud();
    await initLeaderboards();
    await initPayments();
    refreshMenu(); refreshAuthUI();
    toast(T("authOn"), "", "mint"); sfx("coin", 0.6);
  } catch (e) { toast(T("authErr"), "", "gold"); }
}
function refreshAuthUI() {
  const btn = $("#btn-auth"), hint = $("#auth-hint");
  if (!btn) return;
  const hasSdk = !!(ysdk && ysdk.auth && ysdk.auth.openAuthDialog);
  const authed = isAuthed();
  btn.classList.toggle("hidden", !hasSdk || authed);
  if (hint) { hint.textContent = authed ? T("authOn") : T("authHint"); hint.classList.toggle("dim", !authed); }
  btn.textContent = T("authBtn");
  const lb = $("#lead-auth");
  if (lb) lb.classList.toggle("hidden", !hasSdk || authed);
}
/* leaderboards: new ysdk.leaderboards API (setScore(name, score)) with a legacy fallback */
async function initLeaderboards() {
  lead = null; leadName = null; leadNew = false;
  if (!ysdk) return;
  try {
    if (ysdk.leaderboards) {
      // new API: the leaderboard is addressed by its technical name from the console
      leadNew = true; lead = ysdk.leaderboards; leadName = LB_NAME;
      try { if (lead.getDescription) await lead.getDescription(LB_NAME); } catch (e) { leadName = LB_NAME; }
    } else if (ysdk.getLeaderboards) {
      lead = await ysdk.getLeaderboards(); leadNew = false;
    }
  } catch (e) { lead = null; }
}
function gameplayStart() { try { ysdk && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.start(); } catch (e) { } musicDuck(0.12); }
function gameplayStop() { try { ysdk && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.stop(); } catch (e) { } musicDuck(0.42); }
function showInterstitial() {
  if (!ysdk || !ysdk.adv) return;
  if (S.iap && S.iap.noads) return;
  const t = now(); if (t - lastInter < 70000) return; lastInter = t; adsShown++;
  try {
    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onClose: () => { musicDuck(0.42); }, onOpen: () => { muteAll(); },
        onError: () => { }, onRewarded: () => { }
      }
    });
  } catch (e) { }
}
function showRewarded(onOk, onFail) {
  if (!ysdk || !ysdk.adv || !ysdk.adv.showRewardedVideo) { if (onFail) onFail(); return; }
  toast(T("adWait"), "", "gold");
  try {
    ysdk.adv.showRewardedVideo({
      callbacks: {
        onRewarded: () => { onOk && onOk(); },
        onOpen: () => { muteAll(); },
        onClose: () => { musicDuck(0.42); },
        onError: () => { toast(T("adErr"), "", "gold"); onFail && onFail(); }
      }
    });
  } catch (e) { onFail && onFail(); }
}
function showSticky() { if (S.iap && S.iap.noads) return; try { ysdk && ysdk.adv && ysdk.adv.showStickyBannerAdv && ysdk.adv.showStickyBannerAdv(); } catch (e) { } }
function hideSticky() { try { ysdk && ysdk.adv && ysdk.adv.hideStickyBannerAdv && ysdk.adv.hideStickyBannerAdv(); } catch (e) { } }

/* ---------------- in-app purchases (Yandex Games payments) ----------------
   Item keys must match the goods created in the developer console.
   Entitlements are mirrored into the save (S.iap) and re-granted from
   player.getPurchases() so a reinstall does not lose a paid "no ads".      */
const IAP = [
  { id: "noads", ic: "ic-ad", def: 169, once: 1,
    t: { ru: "Отключить рекламу", en: "Remove ads" },
    d: { ru: "Ни роликов между партиями, ни баннера. Наградные видео остаются по желанию.",
         en: "No intermissions, no banners. Rewarded videos stay optional." } },
  { id: "dbl", ic: "ic-level", def: 199, once: 1,
    t: { ru: "Монеты ×2 навсегда", en: "Coins ×2 forever" },
    d: { ru: "Награда за каждую партию удваивается.", en: "Every run payout is doubled." } },
  { id: "starter", ic: "ic-gift", def: 99, once: 1,
    t: { ru: "Стартовый набор", en: "Starter pack" },
    d: { ru: "1200 монет · 3 бомбы · 2 замены · тема «Неон»", en: "1200 coins · 3 bombs · 2 swaps · Neon theme" } },
  { id: "coins_s", ic: "ic-coin", def: 79,
    t: { ru: "600 монет", en: "600 coins" }, d: { ru: "Быстрая подпитка", en: "A quick top-up" } },
  { id: "coins_m", ic: "ic-coin", def: 199,
    t: { ru: "2300 монет", en: "2300 coins" }, d: { ru: "2000 + 300 в подарок", en: "2000 plus 300 bonus" } },
  { id: "coins_l", ic: "ic-coin", def: 399,
    t: { ru: "6200 монет", en: "6200 coins" }, d: { ru: "5000 + 1200 в подарок", en: "5000 plus 1200 bonus" } },
  { id: "theme_neon", ic: "ic-palette", def: 129, once: 1,
    t: { ru: "Тема «Неон»", en: "Neon theme" }, d: { ru: "Эксклюзив: только за реальные деньги", en: "Exclusive: real money only" } },
  { id: "theme_night", ic: "ic-palette", def: 129, once: 1,
    t: { ru: "Тема «Ночь»", en: "Night theme" }, d: { ru: "Эксклюзив: только за реальные деньги", en: "Exclusive: real money only" } },
];
const IAP_BY_ID = {}; IAP.forEach((x) => (IAP_BY_ID[x.id] = x));
let payReady = false, payItems = null, payBusy = 0;
function iapOwned(id) {
  if (id === "noads") return !!(S.iap && S.iap.noads);
  if (id === "dbl") return !!(S.iap && S.iap.dbl);
  if (id === "starter") return !!(S.iap && S.iap.starter);
  if (id === "theme_neon") return !!(S.themes && S.themes.owned && S.themes.owned.neon);
  if (id === "theme_night") return !!(S.themes && S.themes.owned && S.themes.owned.night);
  return false;
}
function iapPrice(it) {
  const c = payItems && payItems[it.id];
  if (c) { const t = c.price || c.priceText || c.cost; if (t) return String(t); }
  return it.def + " ₽";
}
async function initPayments() {
  if (!ysdk || !ysdk.payments || !ysdk.payments.initCatalog) { payReady = false; return; }
  try { await ysdk.payments.initCatalog(); payReady = true; } catch (e) { payReady = false; }
  if (payReady && ysdk.payments.getCatalogItems) {
    try {
      const list = await ysdk.payments.getCatalogItems();
      payItems = {};
      (list || []).forEach((c) => { if (c && c.id) payItems[c.id] = c; });
    } catch (e) { payItems = null; }
  }
  await restorePurchases();
  if ($("#ov-shop") && !$("#ov-shop").classList.contains("hidden")) renderShop();
}
async function restorePurchases() {
  /* покупки восстанавливаем и через player.getPurchases(), и через payments.getPurchases() */
  let p = null;
  try { if (player && player.getPurchases) p = await player.getPurchases(); } catch (e) { }
  let arr = [];
  if (p) arr = Array.isArray(p) ? p : Object.keys(p).map(k => p[k]);
  if (!arr.length) {
    try {
      const pay = window.ysdk && window.ysdk.payments;
      if (pay && pay.getPurchases) {
        const r = await pay.getPurchases();
        arr = (r && (r.purchases || r.products)) || r || [];
        if (!Array.isArray(arr)) arr = Object.keys(arr).map(k => arr[k]);
      }
    } catch (e) { }
  }
  if (!arr.length) return;
  let got = 0;
  for (const it of arr) {
    if (!it) continue;
    const key = it.id || it.itemKey || it.item || it.productId;
    if (IAP_BY_ID[key] && !iapOwned(key)) { grantIap(key, 1); got++; }
  }
  if (got) { save(); refreshMenu(); }
}
function grantIap(id, quiet) {
  const it = IAP_BY_ID[id]; if (!it) return;
  S.iap = S.iap || {};
  S.themes = S.themes || { cur: "classic", owned: { classic: 1 } };
  S.themes.owned = S.themes.owned || {};
  if (id === "noads") S.iap.noads = 1;
  else if (id === "dbl") S.iap.dbl = 1;
  else if (id === "starter") { S.coins += 1200; S.bombCnt = (S.bombCnt || 0) + 3; S.swapCnt = (S.swapCnt || 0) + 2; S.themes.owned.neon = 1; S.iap.starter = 1; }
  else if (id === "coins_s") S.coins += 600;
  else if (id === "coins_m") S.coins += 2300;
  else if (id === "coins_l") S.coins += 6200;
  else if (id === "theme_neon") S.themes.owned.neon = 1;
  else if (id === "theme_night") S.themes.owned.night = 1;
  if (!quiet) { toast(T("payOk"), it.t[LANG] || it.t.en, "mint"); sfx("win"); miniConfetti(40); }
  save(); refreshMenu(); refreshPw();
  if ($("#ov-shop") && !$("#ov-shop").classList.contains("hidden")) renderShop();
}
async function buyIap(id) {
  const it = IAP_BY_ID[id]; if (!it || payBusy) return;
  if (iapOwned(id)) { toast(T("iapOwned"), "", "mint"); sfx("click", 0.3); return; }
  if (!payReady || !ysdk || !ysdk.payments) { toast(T("payOff"), "", "gold"); sfx("click", 0.3); return; }
  payBusy = 1;
  try {
    let item = payItems && payItems[id];
    if (!item && ysdk.payments.getItemById) item = await ysdk.payments.getItemById(id);
    if (!item) { payBusy = 0; toast(T("payOff"), "", "gold"); return; }
    await ysdk.payments.requestPurchase({ item: item });
    grantIap(id);
  } catch (e) {
    const code = (e && (e.code || e.error)) || "";
    toast(code === "PURCHASE_CANCELED" ? T("payCancel") : T("payErr"), "", "gold");
  }
  payBusy = 0;
}
/* rewarded coins are rationed per day: watch a video or play, but not both endlessly */
const AD_COIN_MAX = 5, AD_COIN_GAIN = 30, REVIVE_COST = 200;
function adSlot() { if (S.adDay !== todayKey()) { S.adDay = todayKey(); S.adN = 0; } return AD_COIN_MAX - (S.adN | 0); }
function adCoins(gain) {
  if (adSlot() <= 0) { toast(T("adLimit"), "", "gold"); return false; }
  S.adN = (S.adN | 0) + 1; S.coins += gain; save(); refreshMenu();
  toast("+" + gain, T("coins"), "mint"); sfx("coin", 0.6);
  return true;
}
let lbT = 0;
function lbSet(sc) {
  if (!lead || !isAuthed()) return;
  const t = now(); if (t - lbT < 1500) return; lbT = t;
  try {
    const pr = leadNew ? lead.setScore(leadName, Number(sc) || 0)
      : lead.setScore(Number(sc) || 0, { extraData: { lv: S.maxLv } });
    if (pr && pr.catch) pr.catch(() => { });
  } catch (e) { }
}
function lbGet(cb) {
  if (!lead) return cb(null);
  try {
    if (leadNew) {
      const p = lead.getEntries(leadName, { quantityTop: 20, includeUser: true });
      if (!p || !p.then) return cb(null);
      p.then((r) => {
        const ents = (r && r.entries) || [];
        const uid = player && player.getUniqueID ? player.getUniqueID() : null;
        const top = ents.map((e, i) => ({
          rank: e.rank || i + 1, name: (e.player && e.player.publicName) || "", score: Number(e.score) || 0,
          uid: e.player && e.player.uniqueID
        }));
        let me = null;
        const mine = uid ? top.find((x) => String(x.uid) === String(uid)) : null;
        if (mine) me = { rank: mine.rank, score: mine.score };
        else if (r && r.userRank) me = { rank: r.userRank, score: S.best };
        cb({ top, me });
      }).catch(() => cb(null));
      return;
    }
    const p = lead.getLeaderboards();
    if (!p || !p.then) return cb(null);
    p.then((lbs) => {
      if (!lbs || !lbs.length) return cb(null);
      const id = lbs[0].leaderboard.partners ? lbs[0].leaderboard.partners[0] : lbs[0].leaderboard.id;
      const uid = player && player.getID ? player.getID() : null;
      const a = lead.getTop(id, 20), b = uid ? lead.getUserScore(id, uid) : null;
      Promise.all([a, b]).then((r) => {
        const top = (r[0] || []).map((e, i) => ({ rank: i + 1, name: e.publicName || e.name || "", score: Number(e.score) || 0, uid: e.userId }));
        const me = r[1] ? { rank: r[1].rank, score: Number(r[1].score) || 0 } : null;
        cb({ top, me });
      }).catch(() => cb(null));
    }).catch(() => cb(null));
  } catch (e) { cb(null); }
}
function askRating() {
  try {
    if (!ysdk || !ysdk.feedback) return;
    const f = ysdk.feedback;
    if (f.canShowReviewPrompt && f.requestReviewPrompt) {
      f.canShowReviewPrompt().then((ok) => { if (ok) f.requestReviewPrompt(); }).catch(() => { });
    }
  } catch (e) { }
}

/* ---------------- content: quests / achievements / shop / daily ---------------- */
const QUESTS = [
  { t: "merge", n: 15, r: 8 }, { t: "fruit", n: 2, r: 10 }, { t: "score", n: 400, r: 12 },
  { t: "fruit", n: 4, r: 15 }, { t: "merge", n: 40, r: 18 }, { t: "score", n: 900, r: 20 },
  { t: "fruit", n: 6, r: 26 }, { t: "combo", n: 4, r: 30 }, { t: "score", n: 1800, r: 34 },
  { t: "fruit", n: 8, r: 40 }, { t: "score", n: 3200, r: 50 }, { t: "fruit", n: 10, r: 60 }
];
function questAt(i) {
  i = i | 0;
  if (i < QUESTS.length) return QUESTS[i];
  const k = i - QUESTS.length, ch = 2 + Math.floor(k / 4), m = k % 4;
  const g = (a, b) => a + (ch - 2) * b;
  return [
    { t: "merge", n: g(70, 45), r: g(35, 14) },
    { t: "score", n: g(2600, 1400), r: g(42, 17) },
    { t: "fruit", n: 4 + (k % 7), r: g(45, 18) },
    { t: "combo", n: 4 + (k % 4), r: g(38, 15) },
  ][m];
}
const CH_LEN = 4;
const chapterOf = (i) => (i < QUESTS.length ? 1 : 2 + Math.floor((i - QUESTS.length) / CH_LEN));
const inChapter = (i) => (i < QUESTS.length ? i + 1 : (i - QUESTS.length) % CH_LEN + 1);
const CH_TOTAL = (i) => (i < QUESTS.length ? QUESTS.length : CH_LEN);
function questText(q) {
  if (q.t === "merge") return (LANG === "ru" ? `Сделай ${q.n} слияний в одной игре` : `Make ${q.n} merges in one run`);
  if (q.t === "score") return (LANG === "ru" ? `Набери ${q.n} очков` : `Score ${q.n} points`);
  if (q.t === "fruit") return (LANG === "ru" ? `Собери фрукт: ${fruitName(q.n)}` : `Grow a ${fruitName(q.n)}`);
  if (q.t === "combo") return (LANG === "ru" ? `Собери комбо x${q.n}` : `Get a x${q.n} combo`);
  if (q.t === "drops") return (LANG === "ru" ? `Капни ${q.n} фруктов` : `Drop ${q.n} fruits`);
  return "";
}
const ACHV = [
  { id: "m1", ic: "ic-merge", t: { ru: "Первое слияние", en: "First merge" }, d: { ru: "Слей два фрукта", en: "Merge two fruits" }, f: () => S.totalMerges >= 1, p: () => [S.totalMerges, 1] },
  { id: "m100", ic: "ic-star", t: { ru: "100 слияний", en: "100 merges" }, d: { ru: "Всего за игру", en: "All time" }, f: () => S.totalMerges >= 100, p: () => [S.totalMerges, 100] },
  { id: "m1000", ic: "ic-star", t: { ru: "1000 слияний", en: "1000 merges" }, d: { ru: "Всего за игру", en: "All time" }, f: () => S.totalMerges >= 1000, p: () => [S.totalMerges, 1000] },
  { id: "apple", ic: "ic-drop", t: { ru: "Яблоко", en: "Apple" }, d: { ru: "Дорасти до яблока", en: "Grow an apple" }, f: () => S.maxLv >= 5, p: () => [S.maxLv, 5] },
  { id: "pine", ic: "ic-drop", t: { ru: "Ананас", en: "Pineapple" }, d: { ru: "Дорасти до ананаса", en: "Grow a pineapple" }, f: () => S.maxLv >= 8, p: () => [S.maxLv, 8] },
  { id: "melo", ic: "ic-trophy", t: { ru: "Арбуз!", en: "Watermelon!" }, d: { ru: "Самый большой фрукт", en: "The biggest fruit" }, f: () => S.maxLv >= 10, p: () => [S.maxLv, 10] },
  { id: "s1k", ic: "ic-coin", t: { ru: "1 000 очков", en: "1,000 points" }, d: { ru: "Лучший результат", en: "Best score" }, f: () => S.best >= 1000, p: () => [S.best, 1000] },
  { id: "s5k", ic: "ic-coin", t: { ru: "5 000 очков", en: "5,000 points" }, d: { ru: "Лучший результат", en: "Best score" }, f: () => S.best >= 5000, p: () => [S.best, 5000] },
  { id: "s20k", ic: "ic-award", t: { ru: "20 000 очков", en: "20,000 points" }, d: { ru: "Легенда", en: "Legend" }, f: () => S.best >= 20000, p: () => [S.best, 20000] },
  { id: "c5", ic: "ic-chain", t: { ru: "Комбо x5", en: "x5 combo" }, d: { ru: "Цепочка слияний", en: "Merge chain" }, f: () => (S.bestCombo || 0) >= 5, p: () => [S.bestCombo || 0, 5] },
  { id: "g10", ic: "ic-flag", t: { ru: "10 партий", en: "10 runs" }, d: { ru: "Сыграй 10 раз", en: "Play 10 times" }, f: () => S.games >= 10, p: () => [S.games, 10] },
  { id: "g50", ic: "ic-flag", t: { ru: "50 партий", en: "50 runs" }, d: { ru: "Сыграй 50 раз", en: "Play 50 times" }, f: () => S.games >= 50, p: () => [S.games, 50] },
  { id: "shop", ic: "ic-basket", t: { ru: "Покупка", en: "Shopper" }, d: { ru: "Купи усиление", en: "Buy a power-up" }, f: () => (S.bought || 0) >= 1, p: () => [S.bought || 0, 1] },
  { id: "q6", ic: "ic-check", t: { ru: "6 квестов", en: "6 quests" }, d: { ru: "Пройди 6 квестов", en: "Complete 6 quests" }, f: () => S.quest >= 6, p: () => [S.quest, 6] },
  { id: "qall", ic: "ic-award", t: { ru: "Все квесты", en: "All quests" }, d: { ru: "Пройди все квесты", en: "Finish every quest" }, f: () => S.quest >= QUESTS.length, p: () => [S.quest, QUESTS.length] },
  { id: "q20", ic: "ic-flag", t: { ru: "20 квестов", en: "20 quests" }, d: { ru: "Цели не кончаются", en: "Goals never end" }, f: () => S.quest >= 20, p: () => [S.quest, 20] },
  { id: "q40", ic: "ic-award", t: { ru: "40 квестов", en: "40 quests" }, d: { ru: "Марафон целей", en: "Goal marathon" }, f: () => S.quest >= 40, p: () => [S.quest, 40] },
  { id: "st3", ic: "ic-fire", t: { ru: "Серия 3 дня", en: "3-day streak" }, d: { ru: "Заходи 3 дня подряд", en: "Visit 3 days in a row" }, f: () => (S.streak || 0) >= 3, p: () => [S.streak || 0, 3] },
  { id: "st7", ic: "ic-trophy", t: { ru: "Неделя в игре", en: "7-day streak" }, d: { ru: "7 дней подряд", en: "7 days in a row" }, f: () => (S.streak || 0) >= 7, p: () => [S.streak || 0, 7] },
  { id: "d1", ic: "ic-cal", t: { ru: "Забег дня", en: "Daily run" }, d: { ru: "Сыграй забег дня", en: "Play the daily run" }, f: () => (S.dRun && S.dRun.played) >= 1, p: () => [S.dRun ? S.dRun.played : 0, 1] },
  { id: "d5", ic: "ic-cal", t: { ru: "5 забегов", en: "5 daily runs" }, d: { ru: "Пять забегов всего", en: "Five runs in total" }, f: () => (S.dRun && S.dRun.total) >= 5, p: () => [S.dRun ? S.dRun.total : 0, 5] },
  { id: "g25", ic: "ic-star", t: { ru: "25 золотых", en: "25 golden merges" }, d: { ru: "Сливай золотые фрукты", en: "Merge golden fruits" }, f: () => (S.goldCnt || 0) >= 25, p: () => [S.goldCnt || 0, 25] },
  { id: "th3", ic: "ic-palette", t: { ru: "3 темы", en: "3 themes" }, d: { ru: "Открой 3 темы поля", en: "Unlock 3 field themes" }, f: () => themeOwned() >= 3, p: () => [themeOwned(), 3] },
  { id: "m5k", ic: "ic-star", t: { ru: "5000 слияний", en: "5000 merges" }, d: { ru: "Всего за игру", en: "All time" }, f: () => S.totalMerges >= 5000, p: () => [S.totalMerges, 5000] }
];
const ACHV_R = { m1: 3, m100: 12, m1000: 35, apple: 10, pine: 25, melo: 75, s1k: 12, s5k: 30, s20k: 70,
  c5: 15, g10: 12, g50: 35, shop: 6, q6: 18, qall: 60, q20: 45, q40: 70, st3: 18, st7: 45,
  d1: 12, d5: 35, g25: 30, th3: 35, m5k: 70 };
const SHOP = [
  { id: "bomb", ic: "ic-bomb", price: 100, t: { ru: "Бомба", en: "Bomb" }, d: { ru: "Уничтожает любой фрукт", en: "Destroys any fruit" } },
  { id: "swap", ic: "ic-swap", price: 60, t: { ru: "Замена", en: "Swap" }, d: { ru: "Меняет фрукт в руке", en: "Rerolls your fruit" } },
  { id: "boost", ic: "ic-level", price: 200, t: { ru: "Старт с яблока", en: "Start with apple" }, d: { ru: "Начни игру с яблока", en: "Begin a run with an apple" } }
];
const DAILY = [
  { t: "score", n: 800, r: 15 }, { t: "merge", n: 40, r: 12 }, { t: "drops", n: 120, r: 10 },
  { t: "fruit", n: 6, r: 20 }, { t: "games", n: 3, r: 14 }, { t: "score", n: 1500, r: 22 }
];
function dailyTask() { const h = hash32(todayKey() + "fd"); return DAILY[h % DAILY.length]; }
function dailyText(d) {
  if (d.t === "score") return (LANG === "ru" ? `Набери ${d.n} очков` : `Score ${d.n}`);
  if (d.t === "merge") return (LANG === "ru" ? `Сделай ${d.n} слияний` : `${d.n} merges`);
  if (d.t === "drops") return (LANG === "ru" ? `Капни ${d.n} фруктов` : `Drop ${d.n} fruits`);
  if (d.t === "fruit") return (LANG === "ru" ? `Вырасти ${fruitName(d.n)}` : `Grow a ${fruitName(d.n)}`);
  if (d.t === "games") return (LANG === "ru" ? `Сыграй ${d.n} партий` : `Play ${d.n} runs`);
  return "";
}
function ensureDaily() {
  if (S.daily.day !== todayKey() || !(typeof S.daily.id === "number" && DAILY[S.daily.id])) S.daily = { day: todayKey(), id: hash32(todayKey() + "fd") % DAILY.length, prog: 0, done: false };
}
/* a cloud save from another device may carry an out-of-range task id — never crash on it */
function dailyDef() { const i = S.daily.id; return (typeof i === "number" && DAILY[i]) ? DAILY[i] : DAILY[0]; }
function ensureDRun() { if (!S.dRun || S.dRun.day !== todayKey()) S.dRun = { day: todayKey(), best: 0, played: 0, claimed: 0, total: (S.dRun && S.dRun.total) || 0 }; }
const DAILY_RUN_REWARD = 30;
/* 7-day login calendar */
const CAL = [10, 12, 18, 25, 35, 45, 90];
const CAL_PW = [null, "swap", null, "bomb", null, "swap", "bomb"];
const calOpen = () => S.cal.claimDay !== todayKey();
function renderCal() {
  const box = $("#cal-cells"); if (!box) return;
  const st = S.cal.streak || 0, pos = st % 7, open = calOpen();
  const nowIdx = open ? pos : (pos === 0 ? 6 : pos - 1);
  let html = "";
  for (let i = 0; i < 7; i++) {
    const done = i < pos || (!open && i === nowIdx);
    const isNow = i === nowIdx;
    const big = i === 6;
    html += '<div class="cal-c' + (done ? " done" : "") + (isNow ? " now" : "") + (big ? " big" : "") + (CAL_PW[i] ? " haspw" : "") + '">' +
      (done ? '<span class="ic ic-check"></span>' : big ? '<span class="ic ic-gift"></span>' : "<b>" + CAL[i] + "</b>") + "</div>";
  }
  box.innerHTML = html;
  const cal = $("#cal"); if (cal) cal.classList.toggle("claimed", !open);
  const lbl = $("#cal-lbl");
  if (lbl) {
    if (!open) lbl.textContent = T("claimed");
    else {
      const idx = (S.cal.streak || 0) % 7;
      lbl.textContent = T("claim") + " +" + CAL[idx] + (CAL_PW[idx] ? " · " + T(CAL_PW[idx] === "bomb" ? "pwBomb" : "pwSwap") : "");
    }
  }
  const btn = $("#btn-cal"); if (btn) btn.classList.toggle("off", !open);
  const sk = $("#streak"), skt = $("#streak-txt");
  if (sk) {
    sk.classList.toggle("on", st > 0);
    if (skt) skt.textContent = (LANG === "ru" ? "Серия: " + st + " дн." : "Streak: " + st + " d") +
      (open ? (LANG === "ru" ? " · завтра награда больше" : " · tomorrow is bigger") : (LANG === "ru" ? " · приходи завтра" : " · come back tomorrow"));
  }
}
function claimCal() {
  if (!calOpen()) { sfx("click", 0.3); return; }
  const di = dayIdx();
  const st = (S.cal.last === di - 1) ? (S.cal.streak || 0) + 1 : 1;
  S.cal.streak = st; S.cal.last = di; S.cal.claimDay = todayKey();
  S.streak = st; S.lastDayIdx = di;
  const idx = (st - 1) % 7, coins = CAL[idx];
  S.coins += coins;
  let extra = "";
  const pw = CAL_PW[idx];
  if (pw) { if (pw === "bomb") S.bombCnt = (S.bombCnt || 0) + 1; else S.swapCnt = (S.swapCnt || 0) + 1; extra = " · " + T(pw === "bomb" ? "pwBomb" : "pwSwap"); refreshPw(); }
  addXp(20);
  save(); refreshMenu(); checkAchv();
  toast((LANG === "ru" ? "Награда за вход +" : "Daily reward +") + coins + extra, (LANG === "ru" ? "Серия дней: " : "Streak: ") + st, "mint");
  sfx("coin", 0.7); buzz(20); miniConfetti(24);
}

/* ---------------- weekly league: long-term goal, resets every Monday ---------------- */
const LEAGUES = [
  { n: { ru: "Деревня", en: "Village" }, need: 0, r: 0 },
  { n: { ru: "Сад", en: "Orchard" }, need: 120, r: 20 },
  { n: { ru: "Оранжерея", en: "Greenhouse" }, need: 300, r: 30 },
  { n: { ru: "Джунгли", en: "Jungle" }, need: 600, r: 45 },
  { n: { ru: "Саванна", en: "Savanna" }, need: 1000, r: 60 },
  { n: { ru: "Риф", en: "Reef" }, need: 1500, r: 80 },
  { n: { ru: "Вершина", en: "Summit" }, need: 2200, r: 110 },
  { n: { ru: "Космос", en: "Cosmos" }, need: 3200, r: 140 },
  { n: { ru: "Легенда", en: "Legend" }, need: 4500, r: 200 },
];
function weekKey() {
  const d = new Date(); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate();
}
const lgName = (i) => (LEAGUES[i].n[LANG] || LEAGUES[i].n.en);
function ensureLeague() {
  const wk = weekKey();
  if (S.lg && S.lg.week === wk) return;
  const oldTier = (S.lg && S.lg.tier) || 0;
  S.lg = { week: wk, xp: 0, tier: 0, lastTier: oldTier, paid: 0 };
  save();
  if (oldTier > 0) {
    const prize = addCoins(LEAGUES[oldTier].r);
    setTimeout(() => { toast(T("lgWeek") + " · " + lgName(oldTier), "+" + prize + " " + T("coins"), "mint"); sfx("coin", 0.7); refreshMenu(); }, 900);
  }
}
function leagueTierFor(xp) { let t = 0; while (t + 1 < LEAGUES.length && xp >= LEAGUES[t + 1].need) t++; return t; }
function addLeagueXp(v) {
  ensureLeague();
  const before = S.lg.tier;
  S.lg.xp += v;
  const t = leagueTierFor(S.lg.xp);
  if (t > before) {
    S.lg.tier = t; const rw = addCoins(LEAGUES[t].r);
    toast(T("lgUp") + " · " + lgName(t), "+" + rw + " " + T("coins"), "gold");
    sfx("achv"); miniConfetti(30); save(); refreshMenu();
  }
}
function renderLeague() {
  const nm = $("#lg-name"), fill = $("#lg-fill"), tx = $("#lg-txt"), row = $("#lg-row");
  if (!nm || !fill) return;
  ensureLeague();
  const t = S.lg.tier, max = t >= LEAGUES.length - 1, hi = LEAGUES[Math.min(t + 1, LEAGUES.length - 1)].need;
  nm.textContent = lgName(t);
  fill.style.width = max ? "100%" : clamp((S.lg.xp - LEAGUES[t].need) / Math.max(1, hi - LEAGUES[t].need) * 100, 0, 100) + "%";
  tx.textContent = max ? String(S.lg.xp) : S.lg.xp + "/" + hi;
  if (row) row.classList.toggle("max", max);
}

/* ---------------- chapter chest: reward for clearing a chapter of goals ---------------- */
let chestQueue = 0, chestCh = 0, chestOpened = false, chestReward = null;
function queueChest(ch) {
  chestCh = ch; chestQueue = 1;
  setTimeout(() => { if (chestQueue) showChest(); }, 1500);
}
function showChest() {
  chestQueue = 0; chestOpened = false;
  chestReward = { coins: 25 + chestCh * 12, xp: 150 };
  if (running && !over) paused = true;
  hideOv();
  const ti = $("#ch-title"); if (ti) ti.textContent = T("chest") + " " + chestCh;
  const bd = $("#ch-body"); if (bd) bd.innerHTML = '<div class="ch-box"><span class="ic ic-gift"></span></div><p class="ch-hint">' + esc(T("chestHint")) + "</p>";
  const btn = $("#btn-chest"); if (btn) btn.innerHTML = '<span class="ic ic-gift"></span><span>' + esc(T("chestOpen")) + "</span>";
  showOv("ov-chest"); sfx("click", 0.5);
}
function openChest() {
  if (!chestReward) { hideOv(); return; }
  if (!chestOpened) {
    chestOpened = true;
    addCoins(chestReward.coins); addXp(chestReward.xp);
    S.bombCnt = (S.bombCnt || 0) + 1; S.swapCnt = (S.swapCnt || 0) + 1;
    save(); refreshMenu(); refreshPw(); checkAchv();
    const bd = $("#ch-body");
    if (bd) bd.innerHTML = '<div class="ch-items">' +
      '<div class="ch-it"><span class="ic ic-coin"></span><b>+' + chestReward.coins + "</b></div>" +
      '<div class="ch-it"><span class="ic ic-bomb"></span><b>+1</b></div>' +
      '<div class="ch-it"><span class="ic ic-swap"></span><b>+1</b></div>' +
      '<div class="ch-it"><span class="ic ic-level"></span><b>+' + chestReward.xp + "</b></div></div>";
    const btn = $("#btn-chest"); if (btn) btn.innerHTML = '<span class="ic ic-play"></span><span>' + esc(T("chestGo")) + "</span>";
    sfx("win"); miniConfetti(50); buzz(30);
    return;
  }
  hideOv();
  if (over) showOv("ov-over"); else { paused = false; musicDuck(0.42); }
}

/* ---------------- first-run tutorial ---------------- */
function tutShow(step) {
  const el = $("#tut"); if (!el) return;
  if (step >= 3) { el.classList.add("hidden"); return; }
  const tx = el.querySelector(".tut-tx"); if (tx) tx.textContent = T("tut" + (step + 1));
  el.classList.remove("hidden");
  el.classList.toggle("s2", step === 1);
  el.classList.toggle("s3", step === 2);
}
function tutAdvance(kind) {
  if (S.tut >= 3) return;
  if (kind === "drop" && S.tut === 0) { S.tut = 1; save(); tutShow(1); }
  else if (kind === "merge" && S.tut === 1) {
    S.tut = 2; save(); tutShow(2);
    setTimeout(() => { if (S.tut === 2) { S.tut = 3; save(); tutShow(3); } }, 5000);
  }
}

/* ---------------- runtime state ---------------- */
let pendingStart = null, pendingAd = false;
let mode = "classic";           // classic | quest | zen
let running = false, paused = false, over = false;
let score = 0, runMerges = 0, runDrops = 0, runMaxLv = 0, runBestCombo = 0, combo = 0, comboT = 0;
let runTime = 0, msRun = 0, recNudged = false, next2Lv = 0, lastTick = 0, runEarned = 0, x2Used = 0;
let dangerT = 0, startedAt = 0, reviveUsed = 0, lastDangerToast = -1e9;
let bodies = [], parts = [], floats = [], rings = [];
let curLv = 0, nextLv = 0, aimX = 0, armedBomb = false;
let dropCd = 0, hoverBob = 0, waitT = 0;
let dropHeat = 0, lastCapWarn = 0;
let runCoins = 0;
/* Anti-spam. Every tap used to put a fruit down: 4-5 taps a second filled the jar in ten
   seconds, the physics got heavy and the run ended on a pile nobody had actually played.
   Two guards, both scaled to the field instead of hard coded:
   1) a heat meter - every drop adds heat, heat decays with time, and the cooldown grows
      with it. Hammering the screen settles at about one fruit per second, while normal
      play (roughly one drop per 1.2 s) never feels the brake at all;
   2) a fill cap - the jar can never hold more fruit than fits into FILL of its playable
      area, plus a hard body count so weak devices never have to solve a 90-fruit pile.
      A blocked tap gets feedback, but throttled: the rejection itself must not spam
      sounds and toasts. */
const CD_BASE = 0.24, CD_MAX = 0.9, HEAT_MAX = 6, HEAT_DECAY = 1.15, FILL = 0.42;
function fieldArea() { return W * Math.max(160, H - OVER_Y()); }
function bodiesArea() { let a = 0; for (const b of bodies) if (!b.dead) a += b.r * b.r; return a * Math.PI; }
function maxBodies() { return clamp(Math.round(fieldArea() / 3400), 45, 90); }
function jarFull() { return bodies.length >= maxBodies() || bodiesArea() >= FILL * fieldArea(); }
/* Soft cap for one run: normal play should stay in the 100..400 coins band.
   Menu/IAP/calendar rewards are not capped because they are not "a run". */
function addCoins(v) {
  v = Math.max(0, Math.round(v || 0));
  if (!v) return 0;
  if (running && !over) {
    if (runCoins >= 420) v = Math.round(v * 0.08);
    else if (runCoins >= 320) v = Math.round(v * 0.35);
    else if (runCoins + v > 420) v = 420 - runCoins;
    runCoins += v;
  }
  S.coins += v;
  return v;
}
let curGold = false, nextGold = false, next2Gold = false, goldSince = 0, seed = 0, seedOn = false;
let finaleQueue = 0;

/* ---------------- adaptive quality: keeps 60 FPS on weak devices ---------------- */
const QTIER = [
  { dpr: 2, px: 1500000, step: 1 / 120, iters: 9, fx: 1, decor: true },
  { dpr: 1.5, px: 1000000, step: 1 / 110, iters: 8, fx: 0.6, decor: false },
  { dpr: 1, px: 620000, step: 1 / 100, iters: 7, fx: 0.35, decor: false },
  { dpr: 1, px: 380000, step: 1 / 90, iters: 6, fx: 0.2, decor: false },
];
let QT = 0, qCool = 0, fFrames = 0, fAcc = 0, fBad = 0, fpsNow = 60, qUp = 0, qFloor = 0, qWarm = 3, qSlow = 0, qGood = 0;
function setQuality(q, cool) {
  q = clamp(q | 0, 0, QTIER.length - 1);
  if (q === QT) return;
  QT = q; qCool = cool === undefined ? 2.4 : cool; qUp = 0;
  document.body.classList.toggle("q-low", QT >= 2);
  document.body.classList.toggle("q-mid", QT === 1);
  /* fitCanvas() rebuilds the cached background canvas: only do it when the pixel
     budget actually changed, otherwise a quality flip costs a full repaint for nothing */
  if (!$("#game").classList.contains("hidden")) {
    const Q = QTIER[QT];
    let nd = Math.min(window.devicePixelRatio || 1, Q.dpr);
    if (W * H * nd * nd > Q.px) nd = Math.max(1, Math.sqrt(Q.px / (W * H)));
    if (Math.abs(nd - dpr) > 0.01) fitCanvas();
  }
}
function watchFps(dt) {
  fFrames++; fAcc += dt;
  if (dt > 0.2) fBad = 1;
  if (fAcc < 1.1) return;
  fpsNow = fFrames / fAcc; fFrames = 0; fAcc = 0;
  if (qWarm > 0) { qWarm -= 1.1; return; }
  if (fBad) { fBad = 0; qSlow = 0; qGood = 0; return; }
  if (qCool > 0) { qCool -= 1.1; return; }
  /* one bad window (GC pause, an ad, a tab switch, a merge storm) used to drop the tier and
     lock it forever: qFloor was set to the tier we had just dropped to, so the game could
     never climb back. Now a drop needs two bad windows in a row (or <30 FPS), and after
     ~13 s of solid 60 FPS the floor is released and quality climbs back on its own. */
  if (fpsNow < 46 && QT < QTIER.length - 1) {
    qSlow++; qGood = 0;
    if (qSlow >= 2 || fpsNow < 30) { qSlow = 0; qFloor = QT + 1; setQuality(QT + 1, 2.4); }
    return;
  }
  qSlow = 0;
  if (fpsNow > 58 && QT > 0) {
    qGood++;
    if (QT > qFloor) { if (qGood >= 6) { qGood = 0; setQuality(QT - 1, 20); } }
    else if (qGood >= 12) { qGood = 0; qFloor = QT - 1; }
  } else qGood = 0;
}

/* ---------------- cached DOM refs ---------------- */
const EL = {};
function cacheEls() {
  for (const id of ["score", "best-score", "hud-coins", "combo", "combo-bar", "goal-box", "goal-txt", "goal-prog", "hint", "pw-bomb", "pw-swap", "cur-preview", "next-preview", "next2-preview"])
    EL[id.replace(/-/g, "_")] = $("#" + id);
  EL.goalBar = EL.goal_prog ? EL.goal_prog.querySelector("i") : null;
}

/* ---------------- canvas ---------------- */
let cv, ctx, W = 420, H = 600, SC = 1, dpr = 1, bgCan = null;
const OVER_Y = () => 74 * SC, HOVER_Y = () => 40 * SC;
let SHELF = 12;
function fitCanvas() {
  cv = cv || $("#cv"); if (!cv) return;
  const stage = $(".stage");
  let sw, sh;
  if (stage && stage.clientWidth > 60 && stage.clientHeight > 60) { sw = stage.clientWidth - 12; sh = stage.clientHeight - 12; }
  else {
    const land = window.innerWidth > window.innerHeight;
    sw = Math.min(window.innerWidth - (land ? 190 : 24), 620);
    sh = Math.max(200, window.innerHeight - (land ? 24 : 150));
  }
  sw = clamp(Math.round(sw), 200, 640); sh = clamp(Math.round(sh), 170, 1400);
  let w = sw, h = sh;
  if (w / h > 1.25) w = Math.round(h * 1.25);
  else if (w / h < 0.52) h = Math.round(w / 0.52);
  W = w; H = h;
  SC = clamp(Math.min(W / 420, H / 620), 0.5, 1.3);
  SHELF = Math.max(8, 16 * SC);
  const Q = QTIER[QT];
  dpr = Math.min(window.devicePixelRatio || 1, Q.dpr);
  if (W * H * dpr * dpr > Q.px) dpr = Math.max(1, Math.sqrt(Q.px / (W * H)));
  const hudEl = $(".hud"); if (hudEl) document.documentElement.style.setProperty("--hud-h", hudEl.offsetHeight + "px");
  setHoverH();
  qWarm = Math.max(qWarm, 1.6);
  cv.style.width = W + "px"; cv.style.height = H + "px";
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dgGrad = null; dgY = -1;
  buildBackground();
  for (const b of bodies) {
    b.r = FRUITS[b.lv].r * SC; b.m = b.r * b.r; b.im = 1 / (b.r * b.r); b.sleep = 0;
    b.x = clamp(b.x, b.r, W - b.r); b.y = clamp(b.y, b.r, Math.max(b.r + 1, H - b.r - SHELF));
  }
  aimX = clamp(aimX || W / 2, 18, W - 18);
}

/* vertical space the hover fruit + its glow take at the top of the field: in-game toasts
   must start below it, otherwise they cover the very fruit the player is about to drop */
function setHoverH() {
  const m = Math.max(curLv | 0, nextLv | 0, next2Lv | 0, 0);
  document.documentElement.style.setProperty("--hover-h", Math.round(HOVER_Y() + FRUITS[m].r * SC + 14) + "px");
}

/* ---------------- images ---------------- */
const IMG = []; let imgReady = 0, woodImg = null;
function loadImages(cb) {
  FRUITS.forEach((f, i) => { const im = new Image(); im.onload = () => { imgReady++; }; im.onerror = () => { imgReady++; }; im.src = f.img; IMG[i] = im; });
  const w = new Image(); w.onload = () => { woodImg = w; buildBackground(); }; w.onerror = () => { woodImg = null; }; w.src = "assets/bg/wood-pattern.png";
  let tries = 0;
  (function wait() { if (imgReady >= FRUITS.length || tries++ > 120) return cb(); setTimeout(wait, 50); })();
}
function buildBackground() {
  if (!W || !H) return;
  const bd = Math.max(1, dpr || 1);
  bgCan = document.createElement("canvas"); bgCan.width = Math.round(W * bd); bgCan.height = Math.round(H * bd);
  const g = bgCan.getContext("2d"); g.setTransform(bd, 0, 0, bd, 0, 0);
  const th = theme();
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, th.sky[0]); grd.addColorStop(0.4, th.sky[1]); grd.addColorStop(1, th.sky[2]);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  if (woodImg && woodImg.complete && woodImg.naturalWidth && !th.dark) {
    g.save(); g.globalAlpha = th.id === "forest" ? 0.4 : 0.75;
    const p = g.createPattern(woodImg, "repeat"); g.fillStyle = p; g.fillRect(0, 0, W, H); g.restore();
  }
  // soft light from top
  const rg = g.createRadialGradient(W / 2, -H * 0.1, 10, W / 2, H * 0.35, H * 0.8);
  rg.addColorStop(0, th.light); rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  if (th.dark) { // stars
    for (let i = 0; i < 70; i++) { const x = rnd(0, W), y = rnd(0, H), r = rnd(0.4, 1.6) * SC;
      g.fillStyle = `rgba(255,255,255,${rnd(0.15, 0.75)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  }
  // decorative faded fruits
  for (let i = 0; i < 6; i++) {
    const im = IMG[(i * 3 + 1) % IMG.length]; if (!im || !im.complete) continue;
    const r = rnd(24, 66) * SC, x = rnd(0, W), y = rnd(H * 0.3, H);
    g.save(); g.globalAlpha = 0.07; g.translate(x, y); g.rotate(rnd(-0.5, 0.5));
    g.drawImage(im, -r, -r, r * 2, r * 2); g.restore();
  }
  // bottom shade
  const bg2 = g.createLinearGradient(0, H * 0.7, 0, H);
  bg2.addColorStop(0, th.shade + "0)"); bg2.addColorStop(1, th.shade + ".18)");
  g.fillStyle = bg2; g.fillRect(0, 0, W, H);
  // wooden shelf band
  const sh = Math.max(10, 16 * SC);
  const sg = g.createLinearGradient(0, H - sh, 0, H);
  sg.addColorStop(0, th.shelf[0]); sg.addColorStop(0.35, th.shelf[1]); sg.addColorStop(1, th.shelf[2]);
  g.fillStyle = sg; g.fillRect(0, H - sh, W, sh);
  g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, H - sh, W, Math.max(1, 2 * SC));
  // inner vignette (jar walls)
  const vg = g.createLinearGradient(0, 0, W, 0);
  vg.addColorStop(0, th.wall + ".14)"); vg.addColorStop(0.08, th.wall + "0)");
  vg.addColorStop(0.92, th.wall + "0)"); vg.addColorStop(1, th.wall + ".14)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

/* ---------------- physics ---------------- */
let GT = 0, lastBounce = 0, achvDirty = 0, achvLast = 0, achvWait = 0, structT = -1e9;
const G = 2300, DAMP = 0.995, SLOP = 0.08, PCT = 0.7;
/* MERGE_PAD: contact slack that still counts as a merge. PARK_T: calm seconds before a
   body is parked (parked = skipped by the solver, but merges are still checked for it). */
const MERGE_PAD = 1.8, PARK_T = 0.45, MAGNET = 5, MAGNET_K = 0.6;
let bid = 1;
function makeBody(lv, x, y, vx, vy, gold) {
  const r = FRUITS[lv].r * SC;
  return { id: bid++, lv, x, y, px: x, py: y, vx: vx || 0, vy: vy || 0, r, m: r * r, im: 1 / (r * r), born: GT, pop: 1, rot: rnd(-0.2, 0.2), vrot: 0, sleep: 0, sup: -1, dead: false, gold: !!gold };
}
/* uniform grid broadphase. The "sort by x, then break" sweep it replaced looked cheap, but the
   order went stale as soon as the solver pushed a body past a neighbour, so real contacts —
   and with them merges — were silently skipped. The grid is order independent. */
let GHEAD = null, GNXT = null, GCW = 0, GCH = 0, GCS = 32;
const gcell = (v) => clamp((v / GCS | 0) + 1, 0, 1e9);
function gridBuild(maxR) {
  /* the cell must be wider than the widest pair the scans care about: two bodies touch at
     r1+r2 and still count as a merge a few px further. With GCS = 2*maxR exactly, two big
     fruits one cell apart were already outside the 3x3 scan and never merged at all. */
  GCS = Math.max(16, maxR * 2.3 + 8);
  GCW = Math.ceil(W / GCS) + 3; GCH = Math.ceil(H / GCS) + 3;
  const cells = GCW * GCH;
  if (!GHEAD || GHEAD.length !== cells) GHEAD = new Int32Array(cells);
  GHEAD.fill(-1);
  const n = bodies.length;
  if (!GNXT || GNXT.length < n) GNXT = new Int32Array(Math.max(64, n * 2));
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.dead) { GNXT[i] = -1; continue; }
    const c = gcell(b.y) * GCW + gcell(b.x);
    GNXT[i] = GHEAD[c]; GHEAD[c] = i;
  }
}
function wake(b) {
  /* only a parked body needs its PBD reference reset: for a moving one px/py must stay
     where they are, otherwise the impact velocity is thrown away and fruits land dead */
  if (b.sleep >= PARK_T) { b.px = b.x; b.py = b.y; }
  b.sleep = 0; structT = GT;
}
function wakeAround(b) {
  for (const o of bodies) {
    if (o === b || o.dead) continue;
    const dx = o.x - b.x, dy = o.y - b.y, rr = o.r + b.r + 8;
    if (dx * dx + dy * dy < rr * rr) wake(o);
  }
}
/* after a removal the support chain can be longer than one contact. Waking only the
   immediate neighbours used to leave parked bodies hanging above the hole when the pile
   was dense. */
function wakeAll() {
  for (const o of bodies) if (!o.dead) wake(o);
  structT = GT;
}
/* Wakes the fruits around a removal, not the whole jar. A plain ring wake (one contact)
   left the second row hanging over the hole; waking everything made the whole pile
   shuffle on every bomb. Distance-bounded keeps it correct and cheap. */
function wakeNear(x, y, rad) {
  const r2 = rad * rad;
  for (const o of bodies) {
    if (o.dead) continue;
    const dx = o.x - x, dy = o.y - y;
    if (dx * dx + dy * dy < r2) wake(o);
  }
  structT = GT;
}
/* Support is structural, not local. The old test asked every parked fruit "is anything
   touching me from below": a fruit leaning on the shoulder of a neighbour answered yes
   and hung over the hole until the end of the run. That is the "fruits freeze where they
   stand after I remove one from the bottom" bug - waking only the ring around the hole
   cannot help, the whole column above it has to notice at once.
   Support is now flooded from the floor up through the contact graph: a fruit is
   supported only if the fruit it rests on is supported too, and only if that contact is
   steep enough to carry weight. One flood per step, cost is O(contacts), and the
   collapse starts in the same frame the fruit disappears at any pile depth. */
const SUP_SLACK = 2.5, SUP_COS = 0.5, SUP_COS_WALL = 0.28;
let supStamp = 0;
function supportAudit() {
  supStamp++;
  const stack = [];
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]; b.sup = 0;
    if (!b.dead && b.y > H - b.r - SHELF - 2) { b.sup = supStamp; stack.push(b); }
  }
  for (let s = 0; s < stack.length; s++) {                 // BFS over contacts, no recursion
    const b = stack[s];
    const cx = gcell(b.x), cy = gcell(b.y);
    for (let oy = -1; oy <= 1; oy++) {
      const yy = cy + oy; if (yy < 0 || yy >= GCH) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const xx = cx + ox; if (xx < 0 || xx >= GCW) continue;
        let j = GHEAD[yy * GCW + xx];
        while (j >= 0) {
          const o = bodies[j];
          /* o rests on b: o is above b and the contact normal is close enough to
             vertical. A wall beside o lets a shallower contact hold (wall friction). */
          if (o !== b && !o.dead && o.sup !== supStamp && o.y < b.y) {
            const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
            const rr = o.r + b.r + SUP_SLACK;
            if (d2 > 0.0001 && d2 < rr * rr) {
              const cos = -dy / Math.sqrt(d2);
              const wall = o.x < o.r + 2 || o.x > W - o.r - 2;
              if (cos >= (wall ? SUP_COS_WALL : SUP_COS)) { o.sup = supStamp; stack.push(o); }
            }
          }
          j = GNXT[j];
        }
      }
    }
  }
}
function supported(b) { return b.sup === supStamp; }
function physics(dt) {
  GT += dt * 1000;
  /* achievements are polled, not walked per merge — the flush happens here, in game time,
     so a merge at the very end of a run can never be left unpaid (it must run even when the
     field has just been emptied by that last merge) */
  if (achvDirty && GT - achvLast > 150) { achvLast = GT; achvDirty = 0; achvWait = 0; checkAchv(); }
  if (!bodies.length) return;
  let maxR = 0, awake = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]; if (b.dead) continue;
    if (b.r > maxR) maxR = b.r;
    if (b.sleep < PARK_T) awake++;
  }
  const t0 = GT;
  let anyDead = false;
  /* merges. Always checked — even when the whole field is parked. Skipping the step as a
     whole whenever everything fell asleep is exactly why equal fruits sat side by side forever */
  gridBuild(maxR);
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (a.dead || a.lv >= MAXLV || t0 - a.born < 200) continue;
    const cx = gcell(a.x), cy = gcell(a.y);
    for (let oy = -1; oy <= 1 && !a.dead; oy++) {
      const yy = cy + oy; if (yy < 0 || yy >= GCH) continue;
      for (let ox = -1; ox <= 1 && !a.dead; ox++) {
        const xx = cx + ox; if (xx < 0 || xx >= GCW) continue;
        let j = GHEAD[yy * GCW + xx];
        while (j >= 0) {
          const b = bodies[j];
          if (j > i && !b.dead && b.lv === a.lv && t0 - b.born >= 200) {
            const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
            const min = a.r + b.r + MERGE_PAD;
            if (d2 < min * min) { doMerge(a, b); anyDead = true; break; }
            /* a rigid pile leaves 2..5 px gaps that nothing ever closes, and two equal
               fruits then sit next to each other to the end of the run. Slide them
               together (pure translation, so no fake velocity is invented). */
            const reach = a.r + b.r + MAGNET + 0.06 * (a.r + b.r);   // scales with fruit size
            if (d2 > 0.0001 && d2 < reach * reach) {
              const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ws = a.im + b.im;
              const ka = MAGNET_K * (a.im / ws), kb = MAGNET_K * (b.im / ws);
              a.x += nx * ka; a.px += nx * ka; a.y += ny * ka; a.py += ny * ka;
              b.x -= nx * kb; b.px -= nx * kb; b.y -= ny * kb; b.py -= ny * kb;
              if (a.sleep >= PARK_T || b.sleep >= PARK_T) { wake(a); wake(b); awake++; }
            }
          }
          j = GNXT[j];
        }
      }
    }
  }
  if (anyDead) {
    /* a merged fruit is bigger than the pair it came from, so the grid cell has to grow
       with it, otherwise its contacts fall outside the 3x3 scan and it stops merging */
    for (let i = 0; i < bodies.length; i++) { const b = bodies[i]; if (!b.dead && b.r > maxR) maxR = b.r; }
    gridBuild(maxR);
    structT = t0;
    /* doMerge/wakeAround reset sleep counters, but `awake` was counted before the merge,
       so recount it instead of forcing a solver pass: the forced pass shoved the pile
       around without ever waking the fruit that was actually stuck. */
    awake = 0;
    for (let i = 0; i < bodies.length; i++) { const b = bodies[i]; if (!b.dead && b.sleep < PARK_T) awake++; }
  }
  /* support audit runs every step: if it is gated by `awake`, a parked pile keeps a
     body hanging after the fruit under it was removed. */
  supportAudit();
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.dead || b.sleep < PARK_T) continue;
    if (!supported(b)) { wake(b); awake++; }
  }
  /* integrate. A parked body still does not get gravity, but the loop itself is not
     skipped: a body woken by the support audit must fall in the same step. */
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.dead || b.sleep >= PARK_T) continue;
    b.vy += G * dt;
    const lim = Math.max(b.r, 22) / dt;           // never travel further than one radius per step
    const sp2 = b.vx * b.vx + b.vy * b.vy;
    if (sp2 > lim * lim) { const k = lim / Math.sqrt(sp2); b.vx *= k; b.vy *= k; }
    b.px = b.x; b.py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.rot += b.vrot * dt; b.vrot *= 0.98;
  }
  // solve overlaps: always, otherwise a "sleeping" pile can keep an overlap/lost support
  {
    const IT = awake ? QTIER[QT].iters : 1;
    for (let it = 0; it < IT; it++) {
      gridBuild(maxR);
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]; if (a.dead) continue;
        const cx = gcell(a.x), cy = gcell(a.y);
        for (let oy = -1; oy <= 1; oy++) {
          const yy = cy + oy; if (yy < 0 || yy >= GCH) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const xx = cx + ox; if (xx < 0 || xx >= GCW) continue;
            let j = GHEAD[yy * GCW + xx];
            while (j >= 0) {
              const b = bodies[j];
              if (j > i && !b.dead) {
                let dx = b.x - a.x, dy = b.y - a.y;
                const min = a.r + b.r, d2 = dx * dx + dy * dy;
                if (d2 < min * min) {
                  let d = Math.sqrt(d2);
                  if (d < 0.0001) { dx = rnd(-1, 1); dy = rnd(-1, 1); d = Math.sqrt(dx * dx + dy * dy) || 1; }
                  const ux = dx / d, uy = dy / d, pen = min - d;
                  const pa = a.sleep >= PARK_T, pb = b.sleep >= PARK_T;
                  if (pa && pb) { if (pen > 0.6) { wake(a); wake(b); } }
                  else {
                    const wa = pa ? 0 : 1, wb = pb ? 0 : 1;
                    const ws = a.im * wa + b.im * wb;
                    if (ws > 0) {
                      const corr = Math.max(pen - SLOP, 0) * (pen > 4 ? 1 : PCT);
                      a.x -= ux * corr * (a.im * wa / ws); a.y -= uy * corr * (a.im * wa / ws);
                      b.x += ux * corr * (b.im * wb / ws); b.y += uy * corr * (b.im * wb / ws);
                    }
                    if (pen > 1.2) { wake(a); wake(b); }
                  }
                }
              }
              j = GNXT[j];
            }
          }
        }
      }
      // walls & floor
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.dead) continue;
        if (b.x < b.r) { b.x = b.r; if (b.vx < 0) b.vx = -b.vx * 0.25; }
        if (b.x > W - b.r) { b.x = W - b.r; if (b.vx > 0) b.vx = -b.vx * 0.25; }
        if (b.y > H - b.r - SHELF) {
          b.y = H - b.r - SHELF;
          if (b.vy > 0) {
            /* one bounce sound per 120 ms, not one per contact — audio nodes are the costly part */
            if (b.vy > 260 && t0 - lastBounce > 120) { lastBounce = t0; sfx("bounce", 0.25); }
            b.vy = -b.vy * 0.18; b.vx *= 0.86;
          }
        }
        if (b.y < -b.r * 3) b.y = -b.r * 3;
      }
    }
  }
  /* the solver has just moved things, so the support map from the top of the step is
     stale: refresh it before anything is allowed to park, otherwise a fruit that lost
     its base in this very step parks again in mid-air */
  if (awake) supportAudit();
  // derive velocity from displacement (PBD style) + parking
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.dead) continue;
    if (b.sleep >= PARK_T) { b.vx = 0; b.vy = 0; b.sleep += dt; continue; }
    b.vx = (b.x - b.px) / dt * DAMP; b.vy = (b.y - b.py) / dt * DAMP;
    const sp2 = b.vx * b.vx + b.vy * b.vy;
    if (sp2 > 1600) { b.sleep = 0; continue; }        // still rolling: never park it
    if (!supported(b)) { b.sleep = 0; continue; }     // lost support -> fall on
    b.sleep += dt;
    if (b.sleep >= PARK_T) { b.vx = 0; b.vy = 0; }
  }
  if (anyDead) {   // in-place compaction: no new array every merge
    let w = 0;
    for (let i = 0; i < bodies.length; i++) { const b = bodies[i]; if (!b.dead) bodies[w++] = b; }
    bodies.length = w;
  }
}
function doMerge(a, b) {
  a.dead = true; b.dead = true;
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, lv = a.lv + 1;
  const gold = a.gold || b.gold;
  const nb = makeBody(lv, x, y, (a.vx + b.vx) / 2, (a.vy + b.vy) / 2 - 40, gold && lv < MAXLV && rand() < 0.5);
  nb.pop = 1; nb.born = GT; structT = GT;
  wakeAround(nb);          // otherwise the new fruit is born buried in a frozen pile
  bodies.push(nb);
  // combo
  const t = GT;
  if (t - comboT < 1600) combo++; else combo = 1;
  comboT = t;
  runBestCombo = Math.max(runBestCombo, combo);
  if (runBestCombo > (S.bestCombo || 0)) S.bestCombo = runBestCombo;
  const mult = 1 + Math.min(combo - 1, 9) * 0.5;
  let gain = Math.round((lv + 1) * (lv + 2) * 2 * mult);
  if (gold) {
    gain *= 2;
    const c = addCoins(2 + (lv >> 1));
    S.goldCnt = (S.goldCnt || 0) + 1;
    if (EL.hud_coins) EL.hud_coins.textContent = S.coins;
    if (floats.length < 9) floats.push({ x, y: y - nb.r * 0.4 - 44 * SC, t: "+" + c + " " + T("coins"), life: 1.3, c: "#c98a1c", sz: 15 * SC });
    rings.push({ x, y, r: nb.r * 0.5, R: nb.r * 2.6, life: 1, c: "#ffcf5c" });
    miniConfetti(16); sfx("coin", 0.55);
  }
  score += gain; runMerges++; S.totalMerges++;
  addXp(1 + lv);
  while (msRun < MS.length && score >= MS[msRun]) {
    msRun++; const b = addCoins(6 + msRun * 3);
    if (EL.hud_coins) EL.hud_coins.textContent = S.coins;
    toast(T("ms") + " " + MS[msRun - 1], "+" + b + " " + T("coins"), "mint"); sfx("coin", 0.6); miniConfetti(34);
  }
  if (!recNudged && S.best > 80 && score >= S.best * 0.85) { recNudged = true; toast(T("nearRec"), "", "gold"); sfx("warn", 0.4); }
  if (lv > runMaxLv) runMaxLv = lv;
  if (lv > S.maxLv) { S.maxLv = lv; fruitToast(lv); }
  burst(x, y, FRUITS[lv].c, 12 + lv * 2);
  if (lv === MAXLV) confetti();
  rings.push({ x, y, r: nb.r * 0.6, R: nb.r * 1.9, life: 1, c: FRUITS[lv].c });
  floats.push({ x, y: y - nb.r * 0.4, t: "+" + gain, life: 1.1, c: "#7a4a2a", sz: (14 + Math.min(lv * 2, 12)) * SC });
  if (combo > 1) {
    showCombo(combo);
    if (combo >= 3 && floats.length < 9) floats.push({ x, y: y - nb.r * 0.4 - 26 * SC, t: T("combo") + " x" + combo, life: 1.2, c: "#e63a5b", sz: 17 * SC });
    sfx("combo", 0.5);
  }
  sfx(lv >= 6 ? "bigmerge" : "merge", clamp(0.35 + lv * 0.06, 0.3, 0.9));
  buzz(lv >= 6 ? 30 : 12);
  bumpScore();
  onProgress("merge", 1); tutAdvance("merge");
  if (lv > 0) onProgress("fruit", lv);
  achvDirty = 1;
}
function fruitToast(lv) {
  const box = $("#toasts"); if (!box) return;
  const el = document.createElement("div"); el.className = "toast gold";
  el.innerHTML = `<img src="${FRUITS[lv].img}" alt=""><div><b>${esc(fruitName(lv))}</b><span>${LANG === "ru" ? "Новый фрукт!" : "New fruit!"}</span></div>`;
  box.appendChild(el);
  while (box.children.length > 2) box.removeChild(box.firstChild);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 2000);
  sfx("levelup", 0.5);
}
function confetti() {
  const cols = ["#ff5c72", "#ffd166", "#8fe3c0", "#9b7bff", "#ff9f43", "#7ed957"];
  const n = Math.round(90 * QTIER[QT].fx);
  for (let i = 0; i < n; i++) parts.push({ x: rnd(0, W), y: rnd(-H * 0.3, 0), vx: rnd(-60, 60), vy: rnd(60, 260), r: rnd(3, 7), life: rnd(1.4, 2.6), c: cols[i % cols.length] });
  shake = 0.35; shakeMag = 7; sfx("win");
}
function showCombo(c) {
  const el = EL.combo; if (!el) return;
  el.textContent = T("combo") + " x" + c;
  el.style.fontSize = Math.round(34 * SC) + "px";
  el.classList.remove("show"); requestAnimationFrame(() => el.classList.add("show"));
}
function bumpScore() {
  const el = EL.score; if (!el) return;
  el.textContent = score;
  el.classList.remove("bump"); requestAnimationFrame(() => el.classList.add("bump"));
}
/* ---------------- progression: xp / levels / milestones ---------------- */
const MS = [500, 1000, 2000, 3500, 5500, 8000, 12000, 17000, 25000, 35000, 50000];
function xpNeed(l) { return 150 + (l || 1) * 120; }
function addXp(v) {
  S.xp = (S.xp || 0) + v;
  addLeagueXp(v);
  let up = false;
  while (S.xp >= xpNeed(S.lvl || 1)) { S.xp -= xpNeed(S.lvl || 1); S.lvl = (S.lvl || 1) + 1; up = true; }
  if (up) {
    const bonus = addCoins(10 + (S.lvl || 1) * 3);
    toast(T("lvlUp") + " " + S.lvl, "+" + bonus + " " + T("coins"), "gold");
    sfx("levelup", 0.7); miniConfetti(46); save(); refreshMenu();
  }
}
function fmtTime(s) { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m + ":" + String(s % 60).padStart(2, "0"); }
function statChips() {
  return `<span><i>${esc(T("time"))}</i><b>${fmtTime(runTime)}</b></span>
    <span><i>${esc(T("merges"))}</i><b>${runMerges}</b></span>
    <span><i>${esc(T("drops"))}</i><b>${runDrops}</b></span>
    <span><i>${esc(T("bestCombo"))}</i><b>x${Math.max(1, runBestCombo)}</b></span>`;
}
function miniConfetti(cnt) {
  const cols = ["#ff5c72", "#ffd166", "#8fe3c0", "#9b7bff", "#ff9f43", "#7ed957"];
  const n = Math.max(4, Math.round(cnt * QTIER[QT].fx));
  for (let i = 0; i < n; i++) parts.push({ x: rnd(0, W), y: rnd(-H * 0.25, 0), vx: rnd(-50, 50), vy: rnd(60, 220), r: rnd(2, 6), life: rnd(1.1, 2.1), c: cols[i % cols.length] });
}

/* particles */
function burst(x, y, c, cnt) {
  const n = Math.max(3, Math.round(cnt * QTIER[QT].fx));
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(60, 320);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, r: rnd(2, 6), life: 1, c });
  }
}
function stepFx(dt) {
  let w = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.life -= dt * 1.5;
    if (p.life > 0) parts[w++] = p;
  }
  parts.length = w;
  if (parts.length > 260) parts.splice(0, parts.length - 260);
  w = 0;
  for (let i = 0; i < floats.length; i++) {
    const f = floats[i]; f.y -= 34 * dt; f.life -= dt * 0.9;
    if (f.life > 0) floats[w++] = f;
  }
  floats.length = w;
  if (floats.length > 8) floats.splice(0, floats.length - 8);
  w = 0;
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i]; r.life -= dt * 2.2; r.r += (r.R - r.r) * dt * 9;
    if (r.life > 0) rings[w++] = r;
  }
  rings.length = w;
}

/* ---------------- render ---------------- */
let shake = 0, shakeMag = 0, tSec = 0, dgGrad = null, dgY = -1;
function draw(dt) {
  if (!ctx) return;
  tSec += dt;
  if (bgCan && bgCan.width === Math.round(W * dpr) && bgCan.height === Math.round(H * dpr)) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgCan, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else if (bgCan) { ctx.drawImage(bgCan, 0, 0, W, H); } else { ctx.clearRect(0, 0, W, H); }
  let ox = 0, oy = 0;
  if (shake > 0) { shake -= dt; ox = rnd(-1, 1) * shakeMag; oy = rnd(-1, 1) * shakeMag; shakeMag *= 0.9; }
  ctx.save(); ctx.translate(ox, oy);

  // drifting decor (living background)
  ctx.save(); ctx.globalAlpha = 0.05;
  for (let i = 0; QTIER[QT].decor && i < 4; i++) {
    const im = IMG[(i * 4 + 3) % IMG.length]; if (!im || !im.complete) continue;
    const r = (26 + i * 14) * SC;
    const x = W * (0.15 + i * 0.22) + Math.sin(tSec * 0.3 + i) * 18;
    const y = H * (0.35 + (i % 2) * 0.3) + Math.cos(tSec * 0.25 + i * 2) * 22;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(tSec * 0.2 + i) * 0.3); ctx.drawImage(im, -r, -r, r * 2, r * 2); ctx.restore();
  }
  ctx.restore();

  // danger line
  const oy2 = OVER_Y(), danger = dangerT > 0.15;
  ctx.save();
  ctx.setLineDash([10, 8]); ctx.lineDashOffset = -tSec * 26;
  ctx.lineWidth = 3;
  ctx.strokeStyle = danger ? `rgba(230,58,91,${0.55 + Math.sin(tSec * 9) * 0.3})` : "rgba(230,58,91,.35)";
  ctx.beginPath(); ctx.moveTo(6, oy2); ctx.lineTo(W - 6, oy2); ctx.stroke();
  ctx.restore();
  if (dangerT > 0.2) {
    const left = Math.max(0, 2.2 - dangerT);
    ctx.save(); ctx.globalAlpha = 0.9; ctx.textAlign = "center";
    const s = Math.ceil(left);
    const pulse = 1 + Math.sin(tSec * 10) * 0.08;
    ctx.font = `800 ${Math.round(34 * SC * pulse)}px Comfortaa, sans-serif`;
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineJoin = "round";
    ctx.strokeText(s, W / 2, oy2 - 12 * SC); ctx.fillStyle = "#e63a5b"; ctx.fillText(s, W / 2, oy2 - 12 * SC);
    ctx.font = `700 ${Math.round(11 * SC)}px Nunito, sans-serif`;
    ctx.strokeText(LANG === "ru" ? "ДО КОНЦА ИГРЫ" : "UNTIL GAME OVER", W / 2, oy2 - 12 * SC + 14 * SC);
    ctx.fillStyle = "#b8455c"; ctx.fillText(LANG === "ru" ? "ДО КОНЦА ИГРЫ" : "UNTIL GAME OVER", W / 2, oy2 - 12 * SC + 14 * SC);
    ctx.restore();
  }
  if (danger) {
    if (!dgGrad || dgY !== oy2) {
      dgGrad = ctx.createLinearGradient(0, 0, 0, oy2);
      dgGrad.addColorStop(0, "rgba(255,90,110,1)"); dgGrad.addColorStop(1, "rgba(255,90,110,0)");
      dgY = oy2;
    }
    ctx.globalAlpha = 0.16 + Math.sin(tSec * 8) * 0.07;
    ctx.fillStyle = dgGrad; ctx.fillRect(0, 0, W, oy2);
    ctx.globalAlpha = 1;
  }

  // aim guide
  if (running && !over) drawGuide();

  // bodies
  for (const b of bodies) drawBody(b);

  // fx
  ctx.lineWidth = 3;
  for (const r of rings) {
    ctx.globalAlpha = clamp(r.life, 0, 1) * 0.55; ctx.strokeStyle = r.c;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
  }
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * clamp(p.life, 0.2, 1), 0, 7); ctx.fill();
  }
  ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.85)";
  for (const f of floats) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = `800 ${f.sz}px Comfortaa, sans-serif`;
    ctx.strokeText(f.t, f.x, f.y); ctx.fillStyle = f.c; ctx.fillText(f.t, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // hover fruit
  if (running && !over && !paused) drawHover();
  ctx.restore();
}
let shCan = null;
function shadowSprite() {
  if (shCan) return shCan;
  const c = document.createElement("canvas"); c.width = 128; c.height = 64;
  const g = c.getContext("2d");
  g.setTransform(1, 0, 0, 0.5, 0, 0);
  const rg = g.createRadialGradient(64, 32, 4, 64, 32, 62);
  rg.addColorStop(0, "rgba(90,58,74,.34)"); rg.addColorStop(0.62, "rgba(90,58,74,.16)"); rg.addColorStop(1, "rgba(90,58,74,0)");
  g.fillStyle = rg; g.fillRect(0, 0, 128, 64);
  shCan = c; return c;
}
function drawBody(b) {
  const im = IMG[b.lv]; if (!im || !im.complete) return;
  let s = 1;
  if (b.pop > 0) { s = 1 + Math.sin((1 - b.pop) * Math.PI) * 0.22; b.pop = Math.max(0, b.pop - 0.09); }
  const r = b.r * s;
  if (b.gold) goldGlow(b.x, b.y, b.r, QT < 2);
  // shadow (pre-rendered blob: cheaper than an ellipse fill per body)
  const sw = b.r * 1.72, sy = Math.min(H - SHELF * 0.4, b.y + b.r * 0.92);
  ctx.drawImage(shadowSprite(), b.x - sw / 2, sy - b.r * 0.2, sw, b.r * 0.4);
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(b.rot * 0.35);
  ctx.drawImage(im, -r, -r, r * 2, r * 2);
  ctx.restore();
}
let glowCan = null;
function glowSprite() {
  if (glowCan) return glowCan;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const rg = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  rg.addColorStop(0, "rgba(255,226,130,.55)"); rg.addColorStop(0.6, "rgba(255,190,60,.24)"); rg.addColorStop(1, "rgba(255,180,40,0)");
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  glowCan = c; return c;
}
function goldGlow(x, y, r, ring) {
  const p = 0.75 + Math.sin(tSec * 4) * 0.25, R = r * 1.45;
  ctx.globalAlpha = p;
  ctx.drawImage(glowSprite(), x - R, y - R, R * 2, R * 2);
  if (ring) {
    ctx.globalAlpha = 0.9 * p; ctx.strokeStyle = "#ffcf5c"; ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]); ctx.lineDashOffset = -tSec * 30;
    ctx.beginPath(); ctx.arc(x, y, r * 1.16, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}
function drawHover() {
  const r = FRUITS[curLv].r * SC, im = IMG[curLv];
  const blocked = hoverBlocked();
  const y = HOVER_Y() + Math.sin(tSec * 3) * 3;
  if (waitT > 0) {
    /* the tap was swallowed by the anti-spam brake: say so instead of doing nothing */
    ctx.save();
    ctx.strokeStyle = "rgba(230,58,91,.8)"; ctx.lineWidth = Math.max(2, 3 * SC);
    const k = clamp(dropCd / CD_MAX, 0, 1);
    if (k > 0.02) { ctx.beginPath(); ctx.arc(aimX, y, r + 7 * SC, -Math.PI / 2, -Math.PI / 2 + 6.2832 * k, false); ctx.stroke(); }
    ctx.restore();
  }
  if (curGold) goldGlow(aimX, y, r, true);
  ctx.save(); ctx.globalAlpha = waitT > 0 ? 0.1 : 0.18; ctx.fillStyle = blocked ? "#e63a5b" : FRUITS[curLv].c;
  ctx.beginPath(); ctx.arc(aimX, y, r * 1.35, 0, 7); ctx.fill(); ctx.restore();
  if (im && im.complete) {
    ctx.save(); ctx.globalAlpha = blocked || waitT > 0 ? 0.45 : 1;
    ctx.translate(aimX, y); ctx.rotate(Math.sin(tSec * 2) * 0.06);
    ctx.drawImage(im, -r, -r, r * 2, r * 2); ctx.restore();
  }
}
function hoverBlocked() {
  const r = FRUITS[curLv].r * SC, y = HOVER_Y();
  for (const b of bodies) { const dx = b.x - aimX, dy = b.y - y, mr = b.r + r; if (dx * dx + dy * dy < mr * mr) return true; }
  return false;
}
function drawGuide() {
  const r = FRUITS[curLv].r * SC, y0 = HOVER_Y(), x = aimX;
  /* exact first contact along the drop ray: O(bodies) instead of O(220 * bodies) */
  let y = H - SHELF - r, hit = false;
  for (const b of bodies) {
    if (b.dead) continue;
    const dx = b.x - x, mr = b.r + r;
    if (dx > mr || dx < -mr) continue;
    const cy = b.y - Math.sqrt(Math.max(0, mr * mr - dx * dx));
    if (cy > y0 && cy < y) { y = cy; hit = true; }
  }
  ctx.save();
  ctx.setLineDash([3, 9]); ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.strokeStyle = hit ? "rgba(120,90,110,.35)" : "rgba(120,90,110,.22)";
  ctx.beginPath(); ctx.moveTo(aimX, y0 + r); ctx.lineTo(x, y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.5; ctx.strokeStyle = "rgba(120,90,110,.5)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  ctx.restore();
}

/* ---------------- progress: quests / daily / achievements ---------------- */
function onProgress(type, val) {
  // quest (endless: chapter 1 is hand-made, then procedural goals)
  {
    const q = questAt(S.quest);
    let done = false;
    if (q.t === "merge") done = runMerges >= q.n;
    else if (q.t === "score") done = score >= q.n;
    else if (q.t === "fruit") done = runMaxLv >= q.n;
    else if (q.t === "combo") done = runBestCombo >= q.n;
    else if (q.t === "drops") done = runDrops >= q.n;
    if (done) {
      S.quest++; const qr = addCoins(q.r); addXp(100);
      toast(T("questDone"), questText(q) + "  +" + qr, "gold"); sfx("win");
      updateGoalBox(); refreshMenu(); save();
      const doneIdx = S.quest - 1;
      if (S.quest >= QUESTS.length && !S.finaleShown) { S.finaleShown = 1; finaleQueue = 1; save(); setTimeout(maybeFinale, 1500); }
      else if (doneIdx >= QUESTS.length && (doneIdx - QUESTS.length + 1) % CH_LEN === 0) queueChest(chapterOf(doneIdx));
    }
  }
  // daily
  ensureDaily();
  const d = dailyDef();
  if (!S.daily.done) {
    let v = 0;
    if (d.t === "score") v = Math.max(S.daily.prog, score);
    else if (d.t === "merge") v = S.daily.prog + (type === "merge" ? val : 0);
    else if (d.t === "drops") v = S.daily.prog + (type === "drop" ? val : 0);
    else if (d.t === "fruit") v = (runMaxLv >= d.n) ? d.n : S.daily.prog;
    else if (d.t === "games") v = S.daily.prog + (type === "game" ? 1 : 0);
    S.daily.prog = v;
    if (v >= d.n) { S.daily.done = true; const dr = addCoins(d.r); toast(T("dailyDone"), "+" + dr, "mint"); sfx("achv"); }
    updateDaily(); save();
  }
}
function checkAchv() {
  let changed = false;
  for (const a of ACHV) {
    if (!S.achv[a.id] && a.f()) {
      S.achv[a.id] = 1; changed = true;
      const rw = addCoins(ACHV_R[a.id] || 20);
      toast((a.t[LANG] || a.t.en), (a.d[LANG] || a.d.en) + "  +" + rw + " " + T("coins"), "gold");
      sfx("achv"); miniConfetti(18);
      if (EL.hud_coins) EL.hud_coins.textContent = S.coins;
    }
  }
  if (changed) { save(); const ov = $("#ov-achv"); if (ov && !ov.classList.contains("hidden")) renderAchv(); }
}
function maybeFinale() {
  if (!finaleQueue) return;
  if (running && !over) showFinale();
  else { hideOv(); showFinale(); }
}
function showFinale() {
  finaleQueue = 0;
  if (running && !over) paused = true;
  hideOv();
  $("#lu-fruit").innerHTML = `<img src="${FRUITS[MAXLV].img}" alt="">`;
  $("#lu-title").textContent = LANG === "ru" ? "Все квесты пройдены!" : "All quests complete!";
  $("#lu-desc").textContent = LANG === "ru" ? "Кампания пройдена! Но цели не кончаются: впереди новые этапы квестов, забег дня и темы поля." : "Campaign done! But goals never end: new quest chapters, the daily run and field themes await.";
  showOv("ov-levelup");
}
function toast(title, sub, cls) {
  const box = $("#toasts"); if (!box) return;
  const el = document.createElement("div");
  el.className = "toast " + (cls || "");
  el.innerHTML = `<span class="ic ${cls === "mint" ? "ic-check" : cls === "gold" ? "ic-star" : "ic-heart"}"></span><div><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 2000);
  while (box.children.length > 2) box.removeChild(box.firstChild);
}
function updateGoalBox() {
  const box = EL.goal_box, txt = EL.goal_txt, bar = EL.goalBar;
  if (!box || !txt) return;
  const wasOff = box.classList.contains("off");
  let cur = 0, max = 1;
  if (mode === "quest") {
    box.classList.remove("off");
    const q = questAt(S.quest);
    txt.textContent = T("chapter") + " " + chapterOf(S.quest) + " · " + inChapter(S.quest) + "/" + CH_TOTAL(S.quest) + " · " + questText(q);
    cur = q.t === "merge" ? runMerges : q.t === "score" ? score : q.t === "combo" ? runBestCombo
      : q.t === "drops" ? runDrops : runMaxLv;
    max = q.n;
  } else if (mode === "daily") {
    box.classList.remove("off");
    ensureDRun();
    txt.textContent = T("dmode") + " · " + T("dBest") + " " + S.dRun.best;
    cur = score; max = Math.max(S.dRun.best, 600);
  } else if (mode === "classic" || mode === "zen") {
    box.classList.remove("off");
    ensureDaily();
    const d = dailyDef();
    txt.textContent = T("dailyShort") + ": " + dailyText(d) + (S.daily.done ? " ✓" : "");
    cur = S.daily.prog; max = d.n;
  } else box.classList.add("off");
  if (bar) bar.style.width = clamp(cur / Math.max(1, max) * 100, 0, 100) + "%";
  if (wasOff !== box.classList.contains("off")) { const h = $(".hud"); if (h) document.documentElement.style.setProperty("--hud-h", h.offsetHeight + "px"); }
}
let dailySig = "";
function updateDaily() {
  ensureDaily();
  const d = dailyDef();
  const sig = S.daily.day + "|" + S.daily.prog + "|" + (S.daily.done ? 1 : 0) + "|" + LANG;
  if (sig === dailySig) return;
  dailySig = sig;
  const el = $("#daily-desc"); if (el) el.textContent = dailyText(d) + " · +" + d.r;
  const p = $("#daily-prog i"); if (p) p.style.width = clamp(S.daily.prog / d.n * 100, 0, 100) + "%";
  const box = $("#daily"); if (box) box.classList.toggle("done", !!S.daily.done);
}

/* ---------------- game flow ---------------- */
function srand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const rand = () => (seedOn ? srand() : Math.random());
function spawnLevel() {
  const maxL = seedOn ? 4 : clamp(2 + Math.floor(runMaxLv / 2), 2, 5);
  const w = [];
  for (let i = 0; i <= maxL; i++) for (let k = 0; k < (maxL - i + 1); k++) w.push(i);
  return w[Math.min(w.length - 1, Math.floor(rand() * w.length))];
}
/* golden fruit: rare, guaranteed every ~18 drops */
function fillQueue() {
  curLv = nextLv = 0; curGold = nextGold = false;
  for (let i = 0; i < 3; i++) {
    const lv = spawnLevel();
    goldSince++;
    const g = lv >= 1 && lv <= 8 && (goldSince >= 18 || rand() < 0.05);
    if (g) goldSince = 0;
    if (i === 0) { curLv = lv; curGold = g; } else if (i === 1) { nextLv = lv; nextGold = g; } else { next2Lv = lv; next2Gold = g; }
  }
}
function advanceQueue() {
  curLv = nextLv; curGold = nextGold;
  nextLv = next2Lv; nextGold = next2Gold;
  const lv = spawnLevel();
  goldSince++;
  const g = lv >= 1 && lv <= 8 && (goldSince >= 18 || rand() < 0.05);
  if (g) goldSince = 0;
  next2Lv = lv; next2Gold = g;
}
function startGame(m) {
  mode = m || "classic";
  score = 0; runMerges = 0; runDrops = 0; runMaxLv = 0; runBestCombo = 0; combo = 0; comboT = 0;
  runTime = 0; msRun = 0; recNudged = false; lastTick = 0;
  dangerT = 0; bodies = []; parts = []; floats = []; rings = [];
  dropHeat = 0; lastCapWarn = 0; waitT = 0; runCoins = 0;
  over = false; paused = false; running = true; startedAt = now(); reviveUsed = 0; armedBomb = false;
  seedOn = m === "daily"; if (seedOn) { seed = hash32(todayKey() + "|daily|fd"); goldSince = 0; }
  finaleQueue = 0;
  showScreen("game"); hideOv();
  fitCanvas(); requestAnimationFrame(fitCanvas);
  aimX = W / 2;
  fillQueue();
  if (S.boost && mode !== "zen") { curLv = 5; curGold = false; S.boost = 0; save(); }
  dropCd = 0;
  if (EL.score) EL.score.textContent = "0"; if (EL.best_score) EL.best_score.textContent = S.best; if (EL.hud_coins) EL.hud_coins.textContent = S.coins;
  hudPreviews(); updateGoalBox(); refreshPw(); refreshMenu();
  const hb = $("#hint"); if (hb) hb.classList.remove("dim");
  if (S.tut < 3 && (m === "classic" || m === "quest")) { tutShow(S.tut); if (hb) hb.classList.add("dim"); } else tutShow(3);
  const pb = $("#pw-bomb"); if (pb) pb.classList.remove("armed");
  hideSticky(); gameplayStart(); musicStart();

}
/* the HUD chip shakes so the player understands the tap was eaten by the brake */
function pulsePreview() {
  const el = EL.cur_preview;
  if (!el || el.classList.contains("nope")) return;
  el.classList.add("nope");
  setTimeout(() => el.classList.remove("nope"), 340);
}
function drop() {
  if (!running || paused || over) return;
  if (dropCd > 0) { waitT = 0.3; pulsePreview(); return; }
  const r = FRUITS[curLv].r * SC;
  if (jarFull()) {
    shake = 0.18; shakeMag = 4; sfx("warn", 0.25);
    if (now() - lastCapWarn > 5000) {
      lastCapWarn = now();
      toast(LANG === "ru" ? "Банка полная" : "Jar is full",
            LANG === "ru" ? "Слей фрукты, чтобы капать дальше" : "Merge fruits to keep dropping", "gold");
    }
    return;
  }
  if (hoverBlocked()) { shake = 0.18; shakeMag = 4; sfx("warn", 0.25); return; }
  dropHeat = Math.min(HEAT_MAX, dropHeat + 1);
  const b = makeBody(curLv, clamp(aimX, r, W - r), HOVER_Y(), 0, 240, curGold);
  bodies.push(b);
  wakeAround(b);          // a parked pile has to make room for the newcomer
  if (curGold) { toast(T("gold"), T("goldHint"), "gold"); }
  runDrops++; S.totalDrops++;
  sfx("drop", 0.5); buzz(8);
  onProgress("drop", 1); tutAdvance("drop");
  advanceQueue();
  /* the brake comes from the heat, not from the size of the pile: a big pile was played,
     a hot one is being spammed */
  dropCd = Math.min(CD_MAX, CD_BASE + dropHeat * 0.11);
  if (runDrops === 5) { const hb = $("#hint"); if (hb) hb.classList.add("dim"); }
  hudPreviews(); updateGoalBox();
}
function checkDanger(dt) {
  let bad = false;
  for (const b of bodies) {
    if (b.sleep < 0.35) continue;
    if (b.y - b.r < OVER_Y() - 4) { bad = true; if (b.y - b.r < OVER_Y() - b.r * 0.55 && b.sleep > 1.2) dangerT = Math.max(dangerT, 2.15); }
  }
  if (bad) {
    if (dangerT <= 0.15) { sfx("warn", 0.35); if (GT - lastDangerToast > 9000) { lastDangerToast = GT; toast(T("danger"), "", "gold"); } }
    dangerT += dt;
    const step = Math.floor(dangerT / 0.5);
    if (step > lastTick) { lastTick = step; sfx("tick", 0.3); }
  } else { dangerT = Math.max(0, dangerT - dt * 1.6); lastTick = 0; }
  if (dangerT > 2.2 && mode !== "zen") gameOver();
  if (mode === "zen" && dangerT > 2.2) { // zen: auto-clear the top so you never lose
    zenClear(); dangerT = 0;
  }
}
function zenClear() {
  const top = bodies.slice().sort((a, b) => a.y - b.y).slice(0, 3);
  for (const b of top) { burst(b.x, b.y, FRUITS[b.lv].c, 14); b.dead = true; wakeNear(b.x, b.y, b.r + 150); }
  bodies = bodies.filter((b) => !b.dead);
  sfx("bomb", 0.5); shake = 0.25; shakeMag = 6;
}
function gameOver() {
  if (over) return;
  over = true; running = false; paused = false;
  gameplayStop();
  let earned = 25 + Math.floor(score / 500) + Math.max(0, runMaxLv - 2) + (S.best < score ? 5 : 0);
  if (S.iap && S.iap.dbl) earned *= 2;
  /* keep the whole run (in-run rewards + final payout) near the intended band */
  const capLeft = Math.max(0, 420 - runCoins);
  if (earned > capLeft) earned = capLeft;
  runEarned = earned; x2Used = 0;
  S.coins += earned; S.games++; S.plays++; S.totalScore += score;
  addXp(Math.floor(score / 40));
  onProgress("game", 1);
  let dReward = 0;
  if (mode === "daily") {
    ensureDRun(); S.dRun.played++; S.dRun.total = (S.dRun.total || 0) + 1;
    if (score > S.dRun.best) S.dRun.best = score;
    if (!S.dRun.claimed && score > 0) {
      S.dRun.claimed = 1;
      dReward = DAILY_RUN_REWARD + Math.min(30, Math.floor(score / 120));
      dReward = Math.max(0, Math.min(dReward, Math.max(0, 420 - runCoins - earned)));
      S.coins += dReward; addXp(120);
    }
  }
  const ost = $("#ov-stats"); if (ost) ost.innerHTML = statChips();
  fillOverGoal(dReward);
  const isRec = score > S.best;
  if (isRec) { S.best = score; }
  if (mode !== "zen") lbSet(S.best);
  save(); checkAchv();
  sfx("over");
  $("#ov-score").textContent = score;
  $("#ov-best").textContent = S.best;
  $("#ov-coins").textContent = "+" + earned;
  $("#ov-fruit").style.backgroundImage = `url("${FRUITS[runMaxLv].img}")`;
  $("#newrec").classList.toggle("hidden", !isRec);
  const rvb = $("#btn-revive");
  rvb.classList.toggle("hidden", reviveUsed >= 2 || mode === "zen");
  setReviveLabel();
  const x2b = $("#btn-x2");
  if (x2b) {
    const show = earned > 0 && mode !== "zen";
    x2b.classList.toggle("hidden", !show);
    if (show) $("#x2-lbl").textContent = T("x2") + " +" + earned;
  }
  const rvc = $("#btn-revive-coin");
  if (rvc) {
    const show = mode !== "zen" && reviveUsed < 3 && S.coins >= REVIVE_COST;
    rvc.classList.toggle("hidden", !show);
    if (show) {
      $("#revive-coin-lbl").textContent = T("reviveCoins")(REVIVE_COST);
      rvc.classList.toggle("cant", S.coins < REVIVE_COST);
    }
  }
  clearToasts();
  const ef = $("#ov-fruits"); ef.innerHTML = "";
  for (let i = Math.max(0, runMaxLv - 2); i <= runMaxLv; i++) { const im = document.createElement("img"); im.src = FRUITS[i].img; ef.appendChild(im); }
  showOv("ov-over");
  refreshMenu();
  pendingAd = (S.plays % 3 === 0 && mode !== "zen");
  if (!S.rated && S.plays >= 6 && S.games >= 6) { S.rated = 1; save(); setTimeout(askRating, 1500); }
}
function reviveFree() { return S.freeReviveDay !== todayKey(); }
function fillOverGoal(dReward) {
  const box = $("#ov-goal"); if (!box) return;
  ensureDaily(); ensureDRun();
  const d = dailyDef(), q = questAt(S.quest);
  let cur = 0, max = 1, label = "";
  if (mode === "quest") {
    cur = q.t === "merge" ? runMerges : q.t === "score" ? score : q.t === "combo" ? runBestCombo
      : q.t === "drops" ? runDrops : runMaxLv;
    max = q.n; label = T("chapter") + " " + chapterOf(S.quest) + " · " + questText(q);
  } else if (mode === "daily") {
    cur = score; max = Math.max(S.dRun.best, 600);
    label = T("dmode") + " · " + T("dBest") + " " + S.dRun.best;
  } else {
    cur = S.daily.prog; max = d.n; label = T("dailyShort") + ": " + dailyText(d);
  }
  $("#ov-goal-tx").textContent = label;
  $("#ov-goal-n").textContent = Math.min(cur, max) + "/" + max + (S.daily.done && mode !== "quest" && mode !== "daily" ? " ✓" : "");
  $("#ov-goal-bar").style.width = clamp(cur / Math.max(1, max) * 100, 0, 100) + "%";
  const gap = S.best - score;
  const sub = [];
  if (mode === "daily") {
    if (dReward) sub.push(T("dReward") + " +" + dReward + " " + T("coins"));
    else if (S.dRun.claimed) sub.push(T("dDone"));
    sub.push(gap > 0 ? (LANG === "ru" ? "До общего рекорда " + gap + " очков" : gap + " points to your record") : T("newrec"));
  } else {
    sub.push(gap > 0 ? (LANG === "ru" ? "До рекорда осталось " + gap + " очков" : gap + " points to your record") : T("newrec"));
    if (!S.dRun.claimed) sub.push(LANG === "ru" ? "Забег дня ещё свободен" : "Daily run still open");
  }
  if ((S.cal.streak || 0) > 0 && calOpen()) sub.push(LANG === "ru" ? "Забери награду за вход" : "Claim your daily reward");
  ensureLeague();
  if (S.lg.tier < LEAGUES.length - 1) {
    const need = LEAGUES[S.lg.tier + 1].need - S.lg.xp;
    sub.push((LANG === "ru" ? "Лига недели: ещё " : "Weekly league: ") + need + (LANG === "ru" ? " до «" + lgName(S.lg.tier + 1) + "»" : " to " + lgName(S.lg.tier + 1)));
  }
  $("#ov-goal-sub").textContent = sub.join(" · ");
  const cta = $("#btn-d-cta");
  if (cta) {
    const show = mode !== "daily" && !S.dRun.claimed;
    cta.classList.toggle("hidden", !show);
    if (show) $("#d-cta-lbl").textContent = T("dcta") + " · +" + DAILY_RUN_REWARD;
  }
}
function setReviveLabel() {
  const rvl = $("#revive-lbl"), rvi = $("#revive-ic");
  const free = reviveFree();
  if (rvl) rvl.textContent = free ? T("freeRevive") : T("adRevive");
  if (rvi) { rvi.classList.remove("ic-ad"); rvi.classList.add(free ? "ic-heart" : "ic-ad"); }
}
function reviveAct() {
  const top = bodies.slice().sort((a, b) => a.y - b.y).slice(0, 5);
  for (const b of top) { burst(b.x, b.y, FRUITS[b.lv].c, 16); b.dead = true; }
  bodies = bodies.filter((b) => !b.dead);
  wakeAll();
  dangerT = 0; reviveUsed++; over = false; running = true; paused = false; lastTick = 0;
  if (reviveUsed === 1 && reviveFree()) { S.freeReviveDay = todayKey(); }
  hideOv(); gameplayStart(); sfx("revive"); toast(T("reviveDone"), "", "mint");
  shake = 0.3; shakeMag = 8; save();
  setReviveLabel();
}
function revive() {
  if (reviveFree()) { reviveAct(); return; }
  showRewarded(reviveAct, () => { });
}
function reviveForCoins() {
  if (S.coins < REVIVE_COST) { toast(T("noCoins"), REVIVE_COST - S.coins + " " + T("coins"), "gold"); sfx("click", 0.3); return; }
  S.coins -= REVIVE_COST; save(); refreshMenu(); reviveAct();
}
/* powerups */
function useBomb() {
  if (!running || paused || over) return;
  if ((S.bombCnt || 0) <= 0) { buyPower("bomb"); return; }
  armedBomb = !armedBomb;
  $("#pw-bomb").classList.toggle("armed", armedBomb);
  if (armedBomb) toast(T("armed"), "", "gold");
}
function bombAt(x, y) {
  let best = null, bd = 1e9;
  for (const b of bodies) { const d = Math.hypot(b.x - x, b.y - y); if (d < b.r + 12 && d < bd) { bd = d; best = b; } }
  if (!best) return false;
  best.dead = true; bodies = bodies.filter((b) => !b.dead);
  wakeNear(best.x, best.y, best.r + 150);
  burst(best.x, best.y, FRUITS[best.lv].c, 26);
  rings.push({ x: best.x, y: best.y, r: best.r * 0.4, R: best.r * 2.4, life: 1, c: "#ffb347" });
  score += 10 * (best.lv + 1); bumpScore();
  S.bombCnt--; save(); refreshPw(); sfx("bomb"); shake = 0.3; shakeMag = 9; buzz(40);
  armedBomb = false; $("#pw-bomb").classList.remove("armed");
  return true;
}
function useSwap() {
  if (!running || paused || over) return;
  if ((S.swapCnt || 0) <= 0) { buyPower("swap"); return; }
  let l = curLv;
  for (let i = 0; i < 12; i++) { l = spawnLevel(); if (l !== curLv) break; }
  curLv = l; curGold = curLv >= 1 && rand() < 0.1; S.swapCnt--; save(); refreshPw(); hudPreviews(); sfx("combo", 0.5);
}
function buyPower(id, afterAd) {
  const it = SHOP.find((s) => s.id === id); if (!it) return;
  if (S.coins < it.price) {
    if (afterAd) { toast(T("noCoins"), it.price - S.coins + " " + T("coins"), "gold"); return; }
    showRewarded(() => { S.coins += 12; save(); refreshMenu(); toast("+12", T("coins"), "mint"); buyPower(id, 1); }, () => toast(T("noCoins"), "", "gold"));
    return;
  }
  S.coins -= it.price;
  if (id === "bomb") S.bombCnt = (S.bombCnt || 0) + 1; else S.swapCnt = (S.swapCnt || 0) + 1;
  S.bought = (S.bought || 0) + 1;
  save(); refreshPw(); refreshMenu(); sfx("coin"); toast(T("bought"), it.t[LANG] || it.t.en, "mint");
  checkAchv();
}
function refreshPw() {
  const b = $("#pw-bomb"), s = $("#pw-swap");
  if (b) { b.querySelector("b").textContent = S.bombCnt || 0; b.classList.toggle("zero", !(S.bombCnt > 0)); }
  if (s) { s.querySelector("b").textContent = S.swapCnt || 0; s.classList.toggle("zero", !(S.swapCnt > 0)); }
}
function hudPreviews() {
  setHoverH();
  const n = $("#next-preview"), n2 = $("#next2-preview");
  if (n) { n.style.backgroundImage = `url("${FRUITS[nextLv].img}")`; n.classList.toggle("gold", !!nextGold); }
  if (n2) { n2.style.backgroundImage = `url("${FRUITS[next2Lv].img}")`; n2.classList.toggle("gold", !!next2Gold); }
  const cur = $("#cur-preview");
  if (cur) { cur.style.backgroundImage = `url("${FRUITS[curLv].img}")`; cur.classList.toggle("gold", !!curGold); }
}

/* ---------------- input ---------------- */
let dragging = false, ptrStart = 0, ptrMoved = 0;
function cx(e) { const r = cv.getBoundingClientRect(); const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e; return (t.clientX - r.left) * (W / r.width); }
function cy(e) { const r = cv.getBoundingClientRect(); const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e; return (t.clientY - r.top) * (H / r.height); }
function setAim(e) { const r = FRUITS[curLv].r * SC; aimX = clamp(cx(e), r + 2, W - r - 2); }
function bindInput() {
  cv.addEventListener("pointerdown", (e) => {
    if (!running || paused || over) return;
    e.preventDefault();
    if (armedBomb) { if (bombAt(cx(e), cy(e))) return; }
    dragging = true; ptrStart = now(); ptrMoved = 0; setAim(e);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
  }, { passive: false });
  cv.addEventListener("pointermove", (e) => { if (!running || paused || over) return; if (dragging || e.pointerType === "mouse") { setAim(e); ptrMoved += Math.abs(e.movementX || 0); } }, { passive: true });
  cv.addEventListener("pointerup", (e) => {
    if (!running || paused || over) { dragging = false; return; }
    e.preventDefault();
    if (dragging) { setAim(e); drop(); }
    dragging = false;
  }, { passive: false });
  cv.addEventListener("pointercancel", () => { dragging = false; });
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("contextmenu", (e) => { if (!e.target || !e.target.closest || !e.target.closest("input,textarea")) e.preventDefault(); });
  document.addEventListener("selectstart", (e) => e.preventDefault());
  window.addEventListener("blur", () => { if (!document.hidden) muteAll(); });
  window.addEventListener("focus", () => { if (!document.hidden && S.music && !paused && !over) musicStart(); });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P" || e.key === "з") {
      const open = $$(".ov").filter((o) => !o.classList.contains("hidden"));
      if (open.length) {
        const id = open[open.length - 1].id;
        if (id === "ov-pause") togglePause(false);
        else if (id !== "ov-over" && id !== "ov-levelup" && id !== "ov-chest") closeOv(id);
        return;
      }
      if (!$("#game").classList.contains("hidden")) togglePause(true);
      return;
    }
    if (!running || paused || over) return;
    const ar = FRUITS[curLv].r * SC;
    if (e.key === "ArrowLeft") { aimX = clamp(aimX - 20 * SC, ar + 2, W - ar - 2); e.preventDefault(); }
    if (e.key === "ArrowRight") { aimX = clamp(aimX + 20 * SC, ar + 2, W - ar - 2); e.preventDefault(); }
    if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") { drop(); e.preventDefault(); }
  });
}

/* ---------------- loop ---------------- */
let last = 0, acc = 0, uiT = 0, gameEl = null, halfT = 0;
function loop(t) {
  const raw = (t - last) / 1000 || 0; last = t;
  const dt = Math.min(0.05, raw);
  if (!gameEl) gameEl = $("#game");
  const gameVisible = gameEl ? !gameEl.classList.contains("hidden") : false;
  watchFps(Math.min(0.25, raw));
  if (running && !paused && !over) {
    acc += dt;
    const st = QTIER[QT].step;
    let guard = 0;
    while (acc >= st && guard++ < 6) { physics(st); acc -= st; }
    if (acc > st * 6) acc = 0;          // never try to catch up after a stall
    if (dropCd > 0) dropCd -= dt;
    if (waitT > 0) waitT = Math.max(0, waitT - dt);
    if (dropHeat > 0) dropHeat = Math.max(0, dropHeat - dt * HEAT_DECAY);
    if (combo > 0 && GT - comboT > 1700) combo = 0;
    const cb = EL.combo_bar;
    if (cb) { const k = clamp(1 - (GT - comboT) / 1700, 0, 1); cb.classList.toggle("on", combo > 1); cb.firstElementChild.style.transform = "scaleX(" + k + ")"; }
    checkDanger(dt);
    runTime += dt; uiT += dt;
    if (uiT > 0.4) { uiT = 0; updateGoalBox(); if (EL.hud_coins) EL.hud_coins.textContent = S.coins; }
  }
  if (achvDirty) { achvWait += dt; if (achvWait > 0.3) { achvWait = 0; achvDirty = 0; checkAchv(); } }
  stepFx(dt);
  if (gameVisible) {
    /* pause / game-over screens are static: 30 fps there is enough and saves a lot of battery */
    if (paused || over) { halfT += dt; if (halfT >= 1 / 32) { draw(halfT); halfT = 0; } }
    else { draw(dt); halfT = 0; }
  }
  requestAnimationFrame(loop);
}

/* ---------------- screens & UI ---------------- */
function showScreen(n) {
  document.body.classList.toggle("in-game", n === "game");
  requestAnimationFrame(() => { const h = $(".hud"); if (h) document.documentElement.style.setProperty("--hud-h", h.offsetHeight + "px"); });
  $("#menu").classList.toggle("hidden", n !== "menu");
  $("#game").classList.toggle("hidden", n !== "game");
  if (n === "menu") { refreshMenu(); showSticky(); }
}
function showOv(id) { const e = $("#" + id); if (e) e.classList.remove("hidden"); document.body.classList.add("ov-open"); }
function clearToasts() { const box = $("#toasts"); if (box) box.innerHTML = ""; }
function closeOv(id) {
  hideOv();
  if (id === "ov-how" && pendingStart) { const m = pendingStart; pendingStart = null; startGame(m); }
}
function hideOv() { $$(".ov").forEach((o) => o.classList.add("hidden")); if (!$$(".ov:not(.hidden)").length) document.body.classList.remove("ov-open"); }
function togglePause(force) {
  if (over) return;
  if (!running && !paused) return;
  paused = (typeof force === "boolean") ? force : !paused;
  if (paused) { const rs = $("#run-stats"); if (rs) rs.innerHTML = statChips(); showOv("ov-pause"); musicDuck(0.1); try { ysdk && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.pause && ysdk.features.GameplayAPI.pause(); } catch (e) { } }
  else { hideOv(); musicDuck(0.42); }
}
function toMenu() {
  running = false; paused = false; over = false; bodies = [];
  if (achvDirty) { achvDirty = 0; achvWait = 0; checkAchv(); }
  gameplayStop(); hideOv(); showScreen("menu"); refreshMenu();
}
function refreshMenu() {
  const b = $("#m-best"), c = $("#m-coins"), l = $("#m-level"), qb = $("#quest-badge");
  if (b) b.textContent = S.best; if (c) c.textContent = S.coins;
  if (l) l.textContent = S.lvl || 1;
  const xf = $("#xp-fill"), xt = $("#xp-txt");
  const need = xpNeed(S.lvl || 1);
  if (xf) xf.style.width = clamp((S.xp || 0) / need * 100, 0, 100) + "%";
  if (xt) xt.textContent = (S.xp || 0) + "/" + need;
  if (qb) { qb.textContent = inChapter(S.quest) + "/" + CH_TOTAL(S.quest); qb.title = T("chapter") + " " + chapterOf(S.quest); }
  renderLeague();
  ensureDRun();
  const db = $("#daily-badge");
  if (db) { db.textContent = S.dRun.claimed ? "✓" : S.dRun.played ? "•" : "!"; db.classList.toggle("hot", !S.dRun.claimed); }
  renderCal();
  const ovS = $("#ov-shop"), ovA = $("#ov-achv");
  if (ovS && !ovS.classList.contains("hidden")) renderShop();
  if (ovA && !ovA.classList.contains("hidden")) renderAchv();
  updateDaily();
  const bs = $("#best-score"); if (bs) bs.textContent = S.best;
  if (EL.hud_coins) EL.hud_coins.textContent = S.coins;
  refreshPw();
}
function renderShop() {
  $("#shop-coins").textContent = S.coins;
  const box = $("#shop-list"); box.innerHTML = "";
  SHOP.forEach((it) => {
    const owned = it.id === "bomb" ? (S.bombCnt || 0) : it.id === "swap" ? (S.swapCnt || 0) : (S.boost ? 1 : 0);
    const row = document.createElement("div"); row.className = "shop-item";
    row.innerHTML = `<div class="si-ic"><span class="ic ${it.ic}"></span></div>
      <div class="si-tx"><b>${esc(it.t[LANG] || it.t.en)}</b><span>${esc(it.d[LANG] || it.d.en)}${owned ? ` · x${owned}` : ""}</span></div>
      <button class="buy" data-id="${it.id}"><span class="ic ic-coin" style="width:16px;height:16px"></span>${it.price}</button>`;
    box.appendChild(row);
  });
  renderThemes();
  renderIap();
  const adBtn = $("#btn-shop-ad"), adLbl = $("#shop-ad-lbl");
  const left = adSlot();
  if (adLbl) adLbl.textContent = "+" + AD_COIN_GAIN + " " + T("coins") + " · " + T("adLeft")(Math.max(0, left));
  if (adBtn) { adBtn.disabled = left <= 0; adBtn.classList.toggle("off", left <= 0); }
  box.querySelectorAll(".buy").forEach((btn) => btn.addEventListener("click", () => {
    const it = SHOP.find((s) => s.id === btn.dataset.id);
    if (it.id === "boost") {
      if (S.coins < it.price) { toast(T("noCoins"), "", "gold"); sfx("click"); return; }
      S.coins -= it.price; S.boost = 1; S.bought = (S.bought || 0) + 1; save(); renderShop(); refreshMenu(); sfx("coin"); toast(T("bought"), it.t[LANG] || it.t.en, "mint"); checkAchv();
    } else buyPower(it.id);
  }));
}
function renderIap() {
  const box = $("#iap-list"); if (!box) return;
  const hint = $("#iap-hint");
  if (hint) hint.textContent = payReady ? T("iapHint") : T("iapOff");
  box.innerHTML = "";
  IAP.forEach((it) => {
    const owned = iapOwned(it.id);
    const row = document.createElement("div");
    row.className = "shop-item iap" + (owned ? " owned" : "");
    row.innerHTML = `<div class="si-ic iap-ic"><span class="ic ${it.ic}"></span></div>
      <div class="si-tx"><b>${esc(it.t[LANG] || it.t.en)}</b><span>${esc(it.d[LANG] || it.d.en)}</span></div>
      <button class="buy" data-iap="${it.id}" ${owned ? "disabled" : ""}>${owned
        ? '<span class="ic ic-check" style="width:16px;height:16px"></span>'
        : esc(iapPrice(it))}</button>`;
    box.appendChild(row);
  });
  box.querySelectorAll("[data-iap]").forEach((b) => b.addEventListener("click", () => { if (!b.disabled) buyIap(b.dataset.iap); }));
}
function renderThemes() {
  const box = $("#theme-list"); if (!box) return;
  const hint = $("#theme-hint"); if (hint) hint.textContent = T("themeHint")(themeOwned(), THEMES.length);
  box.innerHTML = "";
  THEMES.forEach((t) => {
    const owned = !!(S.themes.owned && S.themes.owned[t.id]), cur = S.themes.cur === t.id;
    const el = document.createElement("div");
    el.className = "th" + (cur ? " on" : "");
    el.dataset.id = t.id;
    el.innerHTML = `<div class="th-sw" style="background:linear-gradient(180deg,${t.sky[0]},${t.sky[1]} 55%,${t.sky[2]})">
        <img src="${FRUITS[10].img}" alt=""><img src="${FRUITS[8].img}" alt=""><img src="${FRUITS[4].img}" alt=""></div>
      <div class="th-tx"><b>${esc(t.n[LANG] || t.n.en)}</b><span>${esc(t.d[LANG] || t.d.en)}</span></div>
      ${owned
        ? (cur ? `<span class="th-tag">${esc(T("themeOn"))}</span><button class="th-buy lock"><span class="ic ic-check"></span></button>`
               : `<button class="th-buy"><span class="ic ic-check"></span>${esc(T("themePick"))}</button>`)
        : (t.iap ? `<button class="th-buy iaph"><span class="ic ic-gift"></span>${esc(T("iapTag"))}</button>`
                 : `<button class="th-buy"><span class="ic ic-coin"></span>${t.price}</button>`)}`;
    box.appendChild(el);
  });
  box.querySelectorAll(".th").forEach((el) => el.addEventListener("click", () => {
    const t = THEME_BY_ID[el.dataset.id]; if (!t) return;
    if (S.themes.owned[t.id]) {
      if (S.themes.cur !== t.id) { S.themes.cur = t.id; save(); applyTheme(); renderThemes(); sfx("click", 0.4); }
      return;
    }
    if (t.iap) { buyIap(t.iap); return; }
    if (S.coins < t.price) { toast(T("noCoins"), t.price - S.coins + " " + T("coins"), "gold"); sfx("click", 0.3); return; }
    S.coins -= t.price; S.themes.owned[t.id] = 1; S.themes.cur = t.id; S.bought = (S.bought || 0) + 1;
    save(); applyTheme(); renderThemes(); renderShop(); refreshMenu(); checkAchv();
    sfx("coin"); toast(T("bought"), t.n[LANG] || t.n.en, "mint"); miniConfetti(20);
  }));
}
function applyTheme() {
  const th = theme();
  document.body.dataset.theme = (S.themes && S.themes.cur) || "classic";
  document.body.classList.toggle("dark", !!th.dark);
  buildBackground();
}
function renderAchv() {
  const box = $("#achv-list"); box.innerHTML = "";
  ACHV.forEach((a) => {
    const done = !!S.achv[a.id]; const p = a.p();
    const row = document.createElement("div"); row.className = "ach" + (done ? " done" : "");
    row.innerHTML = `<div class="a-ic"><span class="ic ${a.ic}"></span></div>
      <div class="a-tx"><b>${esc(a.t[LANG] || a.t.en)}</b><span>${esc(a.d[LANG] || a.d.en)} · +${ACHV_R[a.id] || 20} ${esc(T("coins"))}</span></div>
      ${done ? '<span class="ic ic-check" style="width:22px;height:22px;color:#3fa876"></span>' : `<div class="a-prog"><i style="width:${clamp(p[0] / p[1] * 100, 0, 100)}%"></i></div>`}`;
    box.appendChild(row);
  });
}
function renderLead() {
  const box = $("#lead-body");
  const authBtn = $("#lead-auth");
  if (authBtn) { authBtn.textContent = T("authLead"); authBtn.classList.toggle("hidden", isAuthed() || !(ysdk && ysdk.auth)); }
  box.innerHTML = `<div class="lead-row"><span class="nm">${esc(T("leadHint"))}</span></div>`;
  lbGet((res) => {
    if (!res) {
      box.innerHTML = `<div class="lead-row"><span class="nm">${esc(T("leadHint"))}</span></div>
        <div class="lead-row me"><span class="rk">#-</span><span class="nm">${esc(T("you"))}</span><span class="sc">${(Number(S.best) || 0).toLocaleString()}</span></div>`;
      return;
    }
    let html = "";
    (res.top || []).slice(0, 15).forEach((e) => {
      const isMe = res.me && res.me.rank === e.rank;
      html += `<div class="lead-row${isMe ? " me" : ""}"><span class="rk">#${e.rank}</span><span class="nm">${esc(e.name || "—")}</span><span class="sc">${(Number(e.score) || 0).toLocaleString()}</span></div>`;
    });
    if (res.me && !(res.top || []).some((e) => res.me.rank === e.rank)) {
      html += `<div class="lead-row me"><span class="rk">#${res.me.rank || "-"}</span><span class="nm">${esc(T("you"))}</span><span class="sc">${(Number(res.me.score) || 0).toLocaleString()}</span></div>`;
    }
    box.innerHTML = html || `<div class="lead-row"><span class="nm">${esc(T("leadHint"))}</span></div>`;
  });
}
function renderQuests() {
  const box = $("#quest-list"); box.innerHTML = "";
  const from = Math.max(0, S.quest - 2), to = S.quest + 6;
  const head = document.createElement("div");
  head.className = "qh";
  head.innerHTML = `<span class="ic ic-flag"></span><b>${esc(T("chapter"))} ${chapterOf(S.quest)}</b><i>${inChapter(S.quest)}/${CH_TOTAL(S.quest)}</i>`;
  box.appendChild(head);
  for (let i = from; i < to; i++) {
    const q = questAt(i);
    const done = i < S.quest, active = i === S.quest;
    const row = document.createElement("div");
    row.className = "ach" + (done ? " done" : "") + (active ? " active" : "");
    row.innerHTML = `<div class="a-ic"><span class="ic ${done ? "ic-check" : active ? "ic-flag" : "ic-lock"}"></span></div>
      <div class="a-tx"><b>${i + 1}. ${esc(questText(q))}</b><span>+${q.r} ${esc(T("coins"))}</span></div>
      ${active ? `<div class="a-prog"><i style="width:${clamp(questRunProg(q), 0, 100)}%"></i></div>` : ""}`;
    box.appendChild(row);
  }
}
function questRunProg(q) {
  if (!q) return 0;
  const cur = q.t === "merge" ? runMerges : q.t === "score" ? score : q.t === "combo" ? runBestCombo
    : q.t === "drops" ? runDrops : runMaxLv;
  return cur / Math.max(1, q.n) * 100;
}
function applyLang() {
  document.documentElement.lang = LANG;
  document.title = T("name");
  const la = $("#logo-a"), lb = $("#logo-b");
  if (la) la.textContent = T("logoA");
  if (lb) lb.textContent = T("logoB");
  $$("[data-i18n]").forEach((el) => { const k = el.getAttribute("data-i18n"); const v = T(k); if (typeof v === "string") el.textContent = v; });
  $$(".lang").forEach((b) => b.classList.toggle("on", b.dataset.lang === LANG));
  refreshMenu(); updateGoalBox();
  const chain = $("#chain"); if (chain) { chain.innerHTML = ""; FRUITS.forEach((f, i) => { const im = document.createElement("img"); im.src = f.img; im.title = fruitName(i); if (i > (S.maxLv | 0)) im.classList.add("locked"); chain.appendChild(im); }); }
  const bd = $("#bg-deco");
  if (bd && !bd.children.length) {
    for (let i = 0; i < 9; i++) {
      const im = document.createElement("img");
      im.src = FRUITS[rndi(0, MAXLV)].img;
      const s = rnd(46, 120);
      im.style.width = s + "px"; im.style.height = s + "px";
      im.style.left = rnd(-4, 90) + "%"; im.style.top = rnd(-4, 88) + "%";
      im.style.animationDuration = rnd(12, 26) + "s"; im.style.animationDelay = rnd(0, 6) + "s";
      bd.appendChild(im);
    }
  }
  const lf = $("#logo-fruits"); if (lf && !lf.children.length) { [10, 8, 6, 4, 2, 1, 0].forEach((i) => { const im = document.createElement("img"); im.src = FRUITS[i].img; lf.appendChild(im); }); }
}
function setToggles() {
  $("#tg-music").classList.toggle("on", !!S.music);
  $("#tg-sfx").classList.toggle("on", !!S.sfx);
  $("#tg-vib").classList.toggle("on", !!S.vib);
}

/* ---------------- wiring ---------------- */
function bindUI() {
  const click = (id, fn) => { const e = $("#" + id); if (e) e.addEventListener("click", (ev) => { ev.preventDefault(); sfx("click", 0.4); fn(ev); }); };
  click("btn-play", () => { if (!S.seen) { S.seen = 1; save(); pendingStart = "classic"; showOv("ov-how"); } else startGame("classic"); });
  click("btn-quest", () => { renderQuests(); showOv("ov-quest"); });
  click("btn-quest-go", () => { hideOv(); startGame("quest"); });
  click("btn-daily", () => startGame("daily"));
  click("btn-zen", () => startGame("zen"));
  click("btn-cal", () => claimCal());
  click("btn-shop", () => { renderShop(); showOv("ov-shop"); });
  click("btn-achv", () => { renderAchv(); showOv("ov-achv"); });
  click("btn-lead", () => { refreshAuthUI(); renderLead(); showOv("ov-lead"); });
  click("btn-how", () => showOv("ov-how"));
  click("btn-settings", () => { setToggles(); refreshAuthUI(); showOv("ov-set"); });
  click("btn-auth", () => doAuth());
  click("lead-auth", () => doAuth().then(renderLead));
  click("btn-resume", () => togglePause());
  click("btn-pause", () => togglePause());
  click("btn-p-restart", () => startGame(mode));
  click("btn-p-menu", () => toMenu());
  click("btn-retry", () => { if (pendingAd) { pendingAd = false; showInterstitial(); } startGame(mode); });
  click("btn-o-menu", () => { if (pendingAd) { pendingAd = false; showInterstitial(); } toMenu(); });
  click("btn-revive", () => revive());
  click("btn-revive-coin", () => reviveForCoins());
  click("btn-x2", () => {
    if (x2Used || runEarned <= 0) return;
    showRewarded(() => {
      x2Used = 1; S.coins += runEarned; save(); refreshMenu();
      const oc = $("#ov-coins"); if (oc) oc.textContent = "+" + (runEarned * 2);
      toast("+" + runEarned, T("coins"), "mint"); sfx("coin", 0.7); miniConfetti(30);
      const x2b = $("#btn-x2"); if (x2b) x2b.classList.add("hidden");
    }, () => toast(T("adErr"), "", "gold"));
  });
  click("btn-lu-next", () => { hideOv(); if (over) showOv("ov-over"); else { paused = false; } });
  click("btn-d-cta", () => startGame("daily"));
  click("btn-chest", () => openChest());
  click("btn-share", () => {
    try {
      const nm = T("name");
      if (ysdk && ysdk.share) ysdk.share({ title: nm + " — " + score + " " + T("score"), description: T("tag") });
      else if (navigator.share) navigator.share({ title: nm, text: nm + " — " + score });
    } catch (e) { }
  });
  click("pw-bomb", () => useBomb());
  click("pw-swap", () => useSwap());
  click("btn-shop-ad", () => showRewarded(() => { if (adCoins(AD_COIN_GAIN)) { renderShop(); refreshMenu(); } }, () => { }));
  $$(".ov").forEach((o) => o.addEventListener("click", (e) => { if (e.target === o && (o.id === "ov-shop" || o.id === "ov-achv" || o.id === "ov-lead" || o.id === "ov-how" || o.id === "ov-set" || o.id === "ov-quest")) closeOv(o.id); }));
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => closeOv(b.closest(".ov").id)));
  $("#tg-music").addEventListener("click", () => { S.music = !S.music; save(); setToggles(); if (S.music) musicStart(); else musicStop(); sfx("click", 0.4); });
  $("#tg-sfx").addEventListener("click", () => { S.sfx = !S.sfx; save(); setToggles(); sfx("click", 0.4); });
  $("#tg-vib").addEventListener("click", () => { S.vib = !S.vib; save(); setToggles(); buzz(20); });
  $$(".lang").forEach((b) => b.addEventListener("click", () => { LANG = b.dataset.lang; S.lang = LANG; save(); applyLang(); renderShop(); renderAchv(); sfx("click", 0.4); }));
  let resetArm = 0;
  $("#btn-reset").addEventListener("click", () => {
    if (now() - resetArm < 2500) { S = Object.assign({}, DEF); S.lang = LANG; save(); applyLang(); setToggles(); refreshMenu(); toast("✓", "", "mint"); resetArm = 0; }
    else { resetArm = now(); toast(LANG === "ru" ? "Нажми ещё раз" : "Tap again", "", "gold"); }
  });
  let rzT = 0;
  const onResize = () => { clearTimeout(rzT); rzT = setTimeout(() => { if (!$("#game").classList.contains("hidden")) fitCanvas(); }, 120); };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  window.addEventListener("pagehide", flushSave);
  window.addEventListener("beforeunload", flushSave);
  if (window.ResizeObserver && $(".stage")) { try { new ResizeObserver(onResize).observe($(".stage")); } catch (e) { } }
  // the HUD changes height on its own (goal box appears, coin chip grows, language switch):
  // --hud-h must follow it, otherwise in-game toasts land on top of the HUD
  if (window.ResizeObserver && $(".hud")) {
    try { new ResizeObserver(() => { const h = $(".hud"); if (h) document.documentElement.style.setProperty("--hud-h", h.offsetHeight + "px"); }).observe($(".hud")); } catch (e) { }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { flushSave(); muteAll(); if (running && !over && !paused) togglePause(true); }
    else if (S.music && !paused && !over) musicStart();
  });
  const unlock = () => { musicStart(); };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}

/* ---------------- boot ---------------- */
function boot() {
  loadSave(); ensureDaily(); cacheEls(); ensureLeague();
  // comeback gift: pays out once per day when the player was away 2+ days
  const diNow = dayIdx();
  if ((S.lastVisit | 0) !== 0 && diNow - S.lastVisit >= 2 && S.giftDay !== todayKey()) {
    const away = Math.min(diNow - S.lastVisit, 14), g = 6 + away * 3;
    S.coins += g; S.giftDay = todayKey(); save();
    setTimeout(() => { toast(T("giftBack"), "+" + g + " " + T("coins"), "mint"); sfx("coin", 0.6); refreshMenu(); }, 1200);
  }
  if (diNow !== (S.lastVisit | 0)) { S.lastVisit = diNow; save(); }
  if (S.lang && I18N[S.lang]) LANG = S.lang;
  // comeback / streak break notice (reward itself is claimed from the menu calendar)
  const di = dayIdx();
  if ((S.cal.last || 0) !== 0 && S.cal.last !== di && S.cal.last !== di - 1 && (S.cal.streak || 0) > 0) {
    S.cal.streak = 0; S.streak = 0; save();
    setTimeout(() => toast(T("missed"), "", "gold"), 700);
  } else if ((S.cal.streak || 0) > 0 && calOpen()) {
    setTimeout(() => toast(T("back"), (LANG === "ru" ? "Серия: " + S.cal.streak + " дн." : "Streak: " + S.cal.streak + " d"), "mint"), 700);
  }
  ensureDRun();
  preloadAudio();
  cv = $("#cv"); gameEl = $("#game");
  bindUI(); bindInput();
  applyLang(); setToggles(); applyTheme(); refreshMenu(); refreshPw(); updateDaily();
  fitCanvas();
  loadImages(() => {
    fitCanvas();
    const l = $("#loader"); if (l) { l.classList.add("hidden"); }
    sdkReady();
    requestAnimationFrame(loop);
  });
  initSDK().then(() => {
    if (!S.lang && ysdk && ysdk.environment && ysdk.environment.i18n && I18N[ysdk.environment.i18n.lang]) { LANG = ysdk.environment.i18n.lang; applyLang(); }
    refreshMenu(); updateDaily(); refreshAuthUI();
    // safety net: even if something hangs, the platform must be told the game is playable
    setTimeout(sdkReady, 4000);
  });
  window.dbg = {
    get state() { return { running, paused, over, mode, score, bodies: bodies.length, danger: +dangerT.toFixed(2), coins: S.coins, best: S.best, quest: S.quest, chapter: chapterOf(S.quest), maxLv: runMaxLv, combo, time: Math.round(runTime), lvl: S.lvl, xp: S.xp, streak: S.cal.streak, calOpen: calOpen(), daily: S.daily.prog, gold: curGold, goldCnt: S.goldCnt | 0, dRun: S.dRun.played + "/" + S.dRun.best + "/" + S.dRun.claimed, theme: S.themes.cur, fps: Math.round(fpsNow), qt: QT, lg: S.lg.tier + "/" + S.lg.xp, tut: S.tut, q: QT }; },
    queue: () => ({ cur: curLv, next: nextLv, next2: next2Lv, g: [curGold, nextGold, next2Gold] }),
    forceQuest: () => { runMaxLv = MAXLV; onProgress("fruit", MAXLV); },
    resetDaily: () => { S.dRun = { day: todayKey(), best: 0, played: 0, claimed: 0, total: 0 }; S.daily = { day: "", id: 0, prog: 0, done: false }; ensureDaily(); refreshMenu(); },
    lg: () => (ensureLeague(), { week: S.lg.week, xp: S.lg.xp, tier: S.lg.tier }), lgAdd: (v) => addLeagueXp(v),
    chest: (ch) => queueChest(ch), setTut: (v) => { S.tut = v; save(); }, setQ: (q) => setQuality(q),
    claim: claimCal, draw1: (dt) => draw(dt), buy: (id) => buyIap(id), iap: () => JSON.parse(JSON.stringify(S.iap || {})),
    pay: () => ({ ready: payReady, items: payItems ? Object.keys(payItems) : null, slots: adSlot() }),
    grant: (id) => grantIap(id), step: (dt) => physics(dt), adcoins: (g) => adCoins(g),
    fx: () => ({ parts: parts.length, floats: floats.length, rings: rings.length, bodies: bodies.length,
      dom: document.getElementsByTagName('*').length, toasts: (document.querySelector('#toasts') || {}).childElementCount | 0,
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1 }),
    econ: () => ({ quests: QUESTS.map((q) => q.r), achv: ACHV_R, shop: SHOP.map((s2) => [s2.id, s2.price]),
      themes: THEMES.map((t) => [t.id, t.price]), cal: CAL, daily: DAILY.map((d) => d.r), ms: MS }),
    theme: (id) => { S.themes = S.themes || { cur: 'classic', owned: {} }; S.themes.owned[id] = 1; S.themes.cur = id; applyTheme(); save(); refreshMenu(); },
    lang: (l) => { LANG = l; S.lang = l; save(); applyLang(); refreshPw(); updateDaily(); },
    q0: () => { QT = 0; qCool = 6; qFloor = 0; qWarm = 0; qSlow = 0; qGood = 0; document.body.classList.remove("q-low", "q-mid"); fitCanvas(); },
    clearToasts: () => clearToasts(),
    set: (o) => { Object.assign(S, o); ensureDaily(); ensureDRun(); ensureLeague(); refreshMenu(); refreshPw(); updateDaily(); renderCal(); return S; },
    qdone: () => { const q = questAt(S.quest); if (q.t === "merge") runMerges = q.n; else if (q.t === "score") score = q.n; else if (q.t === "combo") runBestCombo = q.n; else if (q.t === "drops") runDrops = q.n; else runMaxLv = Math.max(runMaxLv, q.n); onProgress(q.t, q.n); return { quest: S.quest, type: q.t, n: q.n }; }, sdk: () => ({ ysdk: !!ysdk, player: !!player, authed: isAuthed(), lead: !!lead, leadNew, leadName, ready: sdkReadyDone }),
    place: (lv, x, y) => { const b = makeBody(lv | 0, x, y, 0, 0, false); bodies.push(b); wakeAround(b); return b.id; },
    dropAt: (x) => { dropCd = 0; aimX = x; drop(); },
    spam: () => ({ heat: +dropHeat.toFixed(2), cd: +dropCd.toFixed(2), wait: +waitT.toFixed(2), bodies: bodies.length, cap: maxBodies(), fill: +(bodiesArea() / fieldArea()).toFixed(2), full: jarFull() }),
    tap: (x) => { aimX = x; drop(); return bodies.length; },
    kill: (x, y) => { let best = null, bd = 1e9; for (const b of bodies) { const d = Math.hypot(b.x - x, b.y - y); if (d < b.r + 14 && d < bd) { bd = d; best = b; } } if (!best) return false; best.dead = true; bodies = bodies.filter((b) => !b.dead); wakeAll(); return true; },
    setb: (id, x, y) => { const b = bodies.find((z) => !z.dead && z.id === id); if (b) { b.x = x; b.y = y; b.px = x; b.py = y; b.sleep = 0; wakeAround(b); } },
    wake: () => { for (const b of bodies) b.sleep = 0; },
    unsup: () => { gridBuild(bodies.reduce((m, b) => Math.max(m, b.r), 0)); supportAudit(); let bad = 0, park = 0, awake = 0; for (const b of bodies) { if (b.dead) continue; if (b.sleep >= PARK_T) { park++; if (!supported(b)) bad++; } else awake++; } return { park, awake, unsup: bad }; },
    hang: () => { let h = 0, list = []; for (const b of bodies) { if (b.dead || b.sleep < PARK_T) continue; const gap = H - SHELF - (b.y + b.r); if (gap <= 3) continue; let found = false; for (const o of bodies) { if (o === b || o.dead) continue; if (o.y + o.r < b.y + b.r - 2) continue; if (Math.abs(o.x - b.x) < b.r * 0.7 + o.r * 0.5) { found = true; break; } } if (!found) { h++; list.push({ lv: b.lv, x: +b.x.toFixed(0), y: +b.y.toFixed(0), r: +b.r.toFixed(0), gap: +gap.toFixed(0) }); } } return { h, list }; },
    clear: () => { bodies = []; parts = []; floats = []; rings = []; },
    float: () => { let n = 0, list = []; for (const b of bodies) { if (b.dead || b.sleep < PARK_T) continue; if (b.y > H - b.r - SHELF - 3) continue; let touch = false; for (const o of bodies) { if (o === b || o.dead) continue; if (Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r + 1.5) { touch = true; break; } } if (!touch) { n++; list.push({ lv: b.lv, x: +b.x.toFixed(0), y: +b.y.toFixed(0), gap: +(H - SHELF - b.y - b.r).toFixed(0) }); } } return { n, list }; },
    perf: (n) => { const t = performance.now(); for (let i = 0; i < n; i++) physics(1 / 120); return +((performance.now() - t) / n).toFixed(3); },
    stuck: () => { let miss = 0, worst = 0; for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) { const a = bodies[i], c = bodies[j]; if (a.lv !== c.lv || a.lv >= MAXLV) continue; const d = Math.hypot(a.x - c.x, a.y - c.y), pen = a.r + c.r - d; if (pen > -1.2) { miss++; worst = Math.max(worst, -pen); } } return { miss, gap: +worst.toFixed(1) }; },
    drop: (n) => { for (let i = 0; i < (n || 1); i++) { dropCd = 0; aimX = rnd(40, W - 40); drop(); for (let k = 0; k < 30; k++) physics(1 / 120); } },
    play: (n) => { for (let i = 0; i < n; i++) { dropCd = 0; aimX = rnd(30, W - 30); drop(); for (let k = 0; k < 110; k++) physics(1 / 120); checkDanger(1 / 120); } return window.dbg.inspect(); },
    start: startGame, end: gameOver, S: () => S,
    bodies: () => bodies.map((b) => ({ lv: b.lv, x: +b.x.toFixed(1), y: +b.y.toFixed(1), r: +b.r.toFixed(1), sl: +b.sleep.toFixed(2) })),
    inspect: () => {
      let oob = 0, nan = 0, worst = 0, pairs = 0;
      for (const b of bodies) { if (!isFinite(b.x) || !isFinite(b.y)) nan++; if (b.x < b.r - 1 || b.x > W - b.r + 1 || b.y > H - b.r + 1) oob++; }
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], c = bodies[j]; const d = Math.hypot(a.x - c.x, a.y - c.y); const pen = a.r + c.r - d;
        if (pen > 1.5) { pairs++; worst = Math.max(worst, pen); }
      }
      return { n: bodies.length, nan, oob, overlaps: pairs, worstPen: +worst.toFixed(1), W, H, SC: +SC.toFixed(2) };
    }
  };
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
