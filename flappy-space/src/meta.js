/* FLAPPY COSMOS — данные и логика меты: секторы, ресурсы, технологии, экспедиции, доход станции
   Art: Kenney (CC0) space kits · Sound: Kenney + "ObservingTheStar" (CC0)
   Порядок подключения: i18n → sdk → save → audio → assets → meta → game → ui */

/* ---------------- ships ---------------- */
const SHIPS = [
  { id:"craft_racer",    name:"Гонщик", nameEn:"Racer",     price:0,    thrust:1.00, grav:1.00, hit:0.78, magnet:0,  gem:1.00, shield:0, tag:"Лёгкий / манёвренный", tagEn:"Light / agile" },
  { id:"craft_speederC", name:"Спидер", nameEn:"Speeder",    price:150,  thrust:1.03, grav:0.98, hit:0.82, magnet:0,  gem:1.05, shield:0, tag:"Стабильный", tagEn:"Stable" },
  { id:"craft_speederA", name:"Сокол", nameEn:"Falcon",     price:350,  thrust:1.06, grav:0.96, hit:0.84, magnet:26, gem:1.10, shield:0, tag:"Магнит +26", tagEn:"Magnet +26" },
  { id:"craft_speederB", name:"Гадюка", nameEn:"Viper",    price:600,  thrust:1.09, grav:1.00, hit:0.80, magnet:0,  gem:1.15, shield:0, tag:"Скоростной", tagEn:"Speedy" },
  { id:"craft_speederD", name:"Титан", nameEn:"Titan",     price:950,  thrust:1.00, grav:1.04, hit:0.92, magnet:0,  gem:1.20, shield:1, tag:"Щит +1", tagEn:"Shield +1" },
  { id:"craft_miner",    name:"Добытчик", nameEn:"Harvester",  price:1400, thrust:0.98, grav:1.06, hit:0.95, magnet:70, gem:1.35, shield:0, tag:"Кристаллы +35%", tagEn:"Crystals +35%" },
  { id:"craft_cargoA",   name:"Фрахтовщик", nameEn:"Freighter",price:1900, thrust:0.96, grav:1.08, hit:1.00, magnet:45, gem:1.25, shield:1, tag:"Щит +1 · магнит", tagEn:"Shield +1 · magnet" },
  { id:"craft_cargoB",   name:"Дредноут", nameEn:"Dreadnought",  price:2600, thrust:0.95, grav:1.10, hit:1.05, magnet:90, gem:1.50, shield:2, tag:"Тяжёлый · всё максимум", tagEn:"Heavy · everything maxed" },
];
const shipById = id => SHIPS.find(s=>s.id===id) || SHIPS[0];
const shipOwned = id => save.ships.indexOf(id) >= 0;
/* a hull stays in the yard until its dock is built — the dock techs are the gate */
function shipGate(s){ const t = TECHS.find(x => x.ship === s.id); return (t && !hasTech(t.id)) ? t : null; }


/* ---------------- zones ---------------- */
const RES = {
  dust:  { ru:"Космическая пыль", en:"Stardust",    color:"#c9b8ff" },
  aether:{ ru:"Эфир",             en:"Aether",      color:"#5ad1ff" },
  ore:   { ru:"Руда",             en:"Ore",         color:"#f0a35e" },
  dark:  { ru:"Тёмная материя",   en:"Dark matter", color:"#9d7bff" },
  plasma:{ ru:"Плазма",           en:"Plasma",      color:"#63e6be" },
  ice:   { ru:"Лёд",              en:"Ice",         color:"#9fe8ff" },
  anti:  { ru:"Антиматерия",      en:"Antimatter",  color:"#ff7b9c" },
};
const resName = k => { const r = RES[k]; return r ? (lang === "ru" ? r.ru : r.en) : k; };
const resColor = k => (RES[k] && RES[k].color) || "#ffffff";
/* every sector carries a resource that exists nowhere else; sectors open up one by one */
const ZONES = [
  { sky:"sky_nebula", name:"ТУМАННОСТЬ",      en:"NEBULA",        res:"dust",   unlock:1, planets:[0,3], glow:"#b388ff" },
  { sky:"sky_galaxy", name:"ГАЛАКТИКА",       en:"GALAXY",        res:"aether", unlock:2, planets:[1,5], glow:"#40c4ff" },
  { sky:"sky_band",   name:"ПОЯС АСТЕРОИДОВ", en:"ASTEROID BELT", res:"ore",    unlock:3, planets:[6],   glow:"#ffa94d" },
  { sky:"sky_dark",   name:"ПУСТОТА",         en:"THE VOID",      res:"dark",   unlock:4, planets:[4],   glow:"#5c7cfa" },
  { sky:"sky_day",    name:"РАССВЕТ СИСТЕМЫ", en:"SYSTEM DAWN",   res:"plasma", unlock:5, planets:[2,7], glow:"#63e6be" },
  { sky:"sky_ice",    name:"ЛЕДЯНОЙ РАЗЛОМ",  en:"ICE RIFT",      res:"ice",    unlock:6, planets:[7,0], glow:"#8fe9ff" },
  { sky:"sky_core",   name:"ЯДРО СИСТЕМЫ",    en:"SYSTEM CORE",   res:"anti",   unlock:7, planets:[6,1], glow:"#ff8f6b" },
];
const zoneName = i => { const z = ZONES[i % ZONES.length]; return lang === "ru" ? z.name : (z.en || z.name); };
const ZONE_LEN = 420;

/* ---------------- tech tree: tiers open in a strict order, but INSIDE a tier the
   player chooses which branch to invest in — that is the strategic part ---------------- */
const TECHS = [
  // tier 1 — the first fork: handling, economy or defence
  { t:1, id:"thruster1",  ru:"Форсаж I",          en:"Thruster I",     dru:"Тяга +4%",                 den:"Thrust +4%",              cost:120,   res:null,                  secs:30 },
  { t:1, id:"magnet1",    ru:"Сборщик I",         en:"Collector I",    dru:"Притяжение кристаллов +30", den:"Crystal pull +30",        cost:150,   res:null,                  secs:45 },
  { t:1, id:"shield1",    ru:"Щит I",             en:"Shield I",       dru:"Стартовый щит +1",          den:"Starting shield +1",      cost:200,   res:null,                  secs:60 },
  // tier 2 — economy vs survivability
  { t:2, id:"drill1",     ru:"Добывающий станок", en:"Mining drill",   dru:"Кристаллы из полёта +10%",  den:"Run crystals +10%",       cost:450,   res:{dust:10},             secs:180 },
  { t:2, id:"reactor1",   ru:"Реактор I",         en:"Reactor I",      dru:"Доход станции +15%",        den:"Station income +15%",     cost:500,   res:{dust:8},              secs:200 },
  { t:2, id:"hull1",      ru:"Обшивка I",         en:"Hull I",         dru:"Хитбокс меньше на 6%",      den:"Hitbox -6%",              cost:550,   res:{dust:12},             secs:220 },
  // tier 3 — first new ship vs build stats
  { t:3, id:"thruster2",  ru:"Форсаж II",         en:"Thruster II",    dru:"Тяга +5%",                  den:"Thrust +5%",              cost:850,   res:{aether:12},           secs:300 },
  { t:3, id:"lab1",       ru:"Комбо-лаборатория", en:"Combo lab",      dru:"Комбо держится +1.0 с",     den:"Combo lasts +1.0 s",      cost:950,   res:{aether:8},            secs:340 },
  { t:3, id:"dock1",      ru:"Док I",             en:"Dock I",         dru:"Открывает «Сокол»",         den:"Unlocks the Sokol",       cost:900,   res:{aether:10},           secs:360, ship:"craft_speederA" },
  // tier 4 — the fabricator also OPENS AUTOMATION (docs/META.md п.13)
  { t:4, id:"magnet2",    ru:"Сборщик II",        en:"Collector II",   dru:"Притяжение +50",            den:"Crystal pull +50",        cost:1500,  res:{ore:20},              secs:480 },
  { t:4, id:"shield2",    ru:"Щит II",            en:"Shield II",      dru:"Стартовый щит +1",          den:"Starting shield +1",      cost:1600,  res:{ore:15},              secs:540 },
  { t:4, id:"fabricator", ru:"Фабрикатор",        en:"Fabricator",     dru:"Доход +20% и открывает автоматику", den:"Income +20% and opens automation", cost:1800, res:{ore:18}, secs:600, auto:true },
  // tier 5
  { t:5, id:"hull2",      ru:"Обшивка II",        en:"Hull II",        dru:"Хитбокс меньше на 6%",      den:"Hitbox -6%",              cost:2800,  res:{dark:18},             secs:840 },
  { t:5, id:"dock2",      ru:"Док II",            en:"Dock II",        dru:"Открывает «Добытчик»",      den:"Unlocks the Miner",       cost:3000,  res:{dark:14, ore:10},     secs:900, ship:"craft_miner" },
  { t:5, id:"reactor2",   ru:"Реактор II",        en:"Reactor II",     dru:"Доход станции +25%",        den:"Station income +25%",     cost:3200,  res:{dark:16},             secs:960 },
  // tier 6 — the workbench kills dead ends: 3 of one resource -> 1 of another (п.16.3)
  { t:6, id:"thruster3",  ru:"Форсаж III",        en:"Thruster III",   dru:"Тяга +6%",                  den:"Thrust +6%",              cost:4800,  res:{plasma:18},           secs:1200 },
  { t:6, id:"lab2",       ru:"Комбо-ядро",        en:"Combo core",     dru:"Комбо +1.2 с, цепочки +25%",den:"Combo +1.2 s, chains +25%",cost:5500, res:{plasma:20},           secs:1440 },
  { t:6, id:"hangar1",    ru:"Ангар-причал",      en:"Hangar dock",    dru:"Открывает «Фрахтовщик»",    den:"Unlocks the Freighter",   cost:5200,  res:{plasma:22},           secs:1320, ship:"craft_cargoA" },
  { t:6, id:"bench",      ru:"Верстак",           en:"Workbench",      dru:"Обмен ресурсов 3:1 на станции", den:"Station exchange 3:1", cost:5800,  res:{plasma:16},           secs:1380 },
  // tier 7
  { t:7, id:"shield3",    ru:"Щит III",           en:"Shield III",     dru:"Щит +1, хитбокс -5%",       den:"Shield +1, hitbox -5%",   cost:9500,  res:{ice:24},              secs:2040 },
  { t:7, id:"dock3",      ru:"Дредноут-док",      en:"Dreadnought dock",dru:"Открывает «Дредноут»",     den:"Unlocks the Dreadnought", cost:9000,  res:{ice:26},              secs:1920, ship:"craft_cargoB" },
  { t:7, id:"reactor3",   ru:"Реактор III",       en:"Reactor III",    dru:"Доход станции +30%",        den:"Station income +30%",     cost:10000, res:{ice:22, anti:10},     secs:2160 },
  // tier 8 — endgame
  { t:8, id:"core",       ru:"Ядро станции",      en:"Station core",   dru:"Тяга/кристаллы/доход +5%, хитбокс -5%", den:"Thrust/crystals/income +5%, hitbox -5%", cost:15000, res:{anti:30}, secs:2700 },
];
const techById = id => TECHS.find(t => t.id === id);
const MAX_TIER = 8;

/* ---------------- expeditions: the player picks the route, the route pays in one resource.
   Big routes are one-shot, side runs are repeatable farming — always with a prep cooldown. ---- */
const EXPS = [
  { id:"e1", ru:"КРАЙ ТУМАННОСТИ",  en:"EDGE OF THE NEBULA", lv:1, stages:[350],                 rew:{coins:300,  res:{dust:10}},  cd:180 },
  { id:"e2", ru:"РАЗЛОМ ЭФИРА",     en:"AETHER RIFT",        lv:2, stages:[500,700],             rew:{coins:600,  res:{aether:12}},cd:300 },
  { id:"e3", ru:"РУДНЫЙ ПОТОК",     en:"ORE CURRENT",        lv:3, stages:[750,950],             rew:{coins:900,  res:{ore:18}},   cd:480 },
  { id:"e4", ru:"ТЕНЬ ПУСТОТЫ",     en:"SHADOW OF THE VOID", lv:4, stages:[1000,1250],           rew:{coins:1300, res:{dark:14}},  cd:660 },
  { id:"e5", ru:"ПЛАЗМЕННЫЙ ФРОНТ", en:"PLASMA FRONT",       lv:5, stages:[1300,1550,1800],      rew:{coins:1900, res:{plasma:18}},cd:900 },
  { id:"e6", ru:"ЛЕДЯНОЙ ПОХОД",    en:"ICE MARCH",          lv:6, stages:[1850,2100,2400],      rew:{coins:2600, res:{ice:22}},   cd:1200 },
  { id:"e7", ru:"ЯДРО СИСТЕМЫ",     en:"SYSTEM CORE RUN",    lv:7, stages:[2450,2800,3200],      rew:{coins:3500, res:{anti:20}},  cd:1560 },
  { id:"e8", ru:"ВЕЛИКИЙ ПОЛЁТ",    en:"THE GREAT RUN",      lv:8, stages:[3200,3700,4200,5000], rew:{coins:5000, res:{anti:30}},  cd:2100 },
  { id:"s1", ru:"ПЫЛЕВАЯ РАЗВЕДКА", en:"DUST RECON",         lv:1, stages:[250],          rew:{coins:120, res:{dust:6}},   cd:120, rep:true },
  { id:"s2", ru:"ГОНКА ЗА ЭФИРОМ",  en:"AETHER CHASE",       lv:2, stages:[400],          rew:{coins:180, res:{aether:6}}, cd:150, rep:true },
  { id:"s3", ru:"ОБЛАСТИ РУДЫ",     en:"ORE FIELDS",         lv:3, stages:[600],          rew:{coins:260, res:{ore:8}},    cd:200, rep:true },
];
/* ---- п.15.2: сезон = 30 дней, своя таблица наград.
   Сезонные маршруты повторяемы, но живут только внутри сезона: они платят сезонными
   жетонами, а жетоны меняются на награды отдельной таблицы. Новый сезон — чистый лист. ---- */
const SEASON_MS = 30*86400*1000;
const SEASON_RUN_CAP = 2;                    // у каждого сезонного маршрута — 2 захода в сутки
const SEASON_ROUTES = [
  { id:"q1", ru:"РАЗЛОМ СЕЗОНА", en:"SEASON RIFT",  lv:2, stages:[600],           rew:{coins:400,  res:{}}, cd:240, rep:true, sea:true, tok:1 },
  { id:"q2", ru:"КОЛЬЦО СЕЗОНА", en:"SEASON RING",  lv:4, stages:[900,1200],      rew:{coins:900,  res:{}}, cd:300, rep:true, sea:true, tok:2 },
  { id:"q3", ru:"ЯДРО СЕЗОНА",   en:"SEASON CORE",  lv:6, stages:[1500,1900],     rew:{coins:1600, res:{}}, cd:360, rep:true, sea:true, tok:3 },
];
const SEASON_REWARDS = [
  { n:2,  ru:"Ящик кристаллов",  en:"Crystal crate",  rew:{coins:800} },
  { n:4,  ru:"Груз плазмы",      en:"Plasma cargo",   rew:{res:{plasma:12}} },
  { n:6,  ru:"Руда и эфир",      en:"Ore and aether", rew:{res:{ore:14, aether:10}} },
  { n:9,  ru:"Пропуск стройки",  en:"Build skip",     rew:{coins:1500, skips:1} },
  { n:12, ru:"Сезонное ядро",    en:"Season core",    rew:{coins:3000, boost:true} },
];
const ALL_ROUTES = EXPS.concat(SEASON_ROUTES);
const expById = id => ALL_ROUTES.find(e => e.id === id);

/* ================= META LAYER =================
   Everything is gated: no tech -> no next tier; no station level -> no sector, route or ship.
   Timers keep running while the game is closed, so there is always something to come back to. */
const hasTech = id => Array.isArray(save.tech) && save.tech.indexOf(id) >= 0;
const stationLevel = () => 1 + (Array.isArray(save.tech) ? save.tech.length : 0);
/* the whole curve is capped on purpose (docs/META.md п.3 и п.14.5):
   thrust <= +16% (forks) / +22% with the core, income <= x1.87 (+trophies), hitbox >= -20%,
   crystals <= +15%, magnet +80, combo +2.2 s. Upgrades buy COMFORT, never a new difficulty. */
const techModsKey = () => (save.tech||[]).join(",") + "|" + (save.trophies||0) + "|" + (iapOn("pass")?1:0);
let _mods = null, _modsKey = "";
function techMods(){
  const key = techModsKey();
  if (_mods && _modsKey === key) return _mods;
  const m = { thrust:1, magnet:0, shield:0, hit:1, gem:1, combo:0, inc:1, chain:1 };
  for (const id of (save.tech||[])){
    if (id==="thruster1") m.thrust *= 1.04;
    else if (id==="thruster2") m.thrust *= 1.05;
    else if (id==="thruster3") m.thrust *= 1.06;
    else if (id==="magnet1") m.magnet += 30;
    else if (id==="magnet2") m.magnet += 50;
    else if (id==="shield1" || id==="shield2") m.shield += 1;
    else if (id==="shield3"){ m.shield += 1; m.hit *= 0.95; }
    else if (id==="hull1" || id==="hull2") m.hit *= 0.94;
    else if (id==="drill1") m.gem *= 1.10;
    else if (id==="lab1") m.combo += 1.0;
    else if (id==="lab2"){ m.combo += 1.2; m.chain *= 1.25; }
    else if (id==="reactor1") m.inc *= 1.15;
    else if (id==="reactor2") m.inc *= 1.25;
    else if (id==="reactor3") m.inc *= 1.30;
    else if (id==="fabricator") m.inc *= 1.20;
    else if (id==="core"){ m.thrust *= 1.05; m.gem *= 1.04; m.inc *= 1.05; m.hit *= 0.95; }
  }
  m.inc *= 1 + 0.03*(save.trophies||0);
  if (iapOn("pass")) m.inc *= 1.5;            // п.12: station year pass
  _mods = m; _modsKey = key; return m;
}
/* sectors open one by one with the station level */
let _seq = null, _seqLv = -1;
function sectorSeq(){
  const lv = stationLevel();
  if (_seq && _seqLv === lv) return _seq;
  const a = []; for (let i=0;i<ZONES.length;i++) if (ZONES[i].unlock <= lv) a.push(i);
  _seq = a.length ? a : [0]; _seqLv = lv; return _seq;
}
/* ---- passive station income: always filling, capped, so the player comes back ---- */
const INCOME_CAP_S = 4*3600;          // bank cap, in "online-equivalent" seconds
const OFFLINE_WINDOW_S = 3600;        // after leaving the game: only 1 hour keeps paying
const OFFLINE_RATE = 0.5;             // ...and it pays at half rate (collector limit)
let sessionStart = Date.now();
function incomePerMin(){
  // п.15.1 ядро пересборки и п.15.2 сезонное ядро — вечный/сезонный множитель дохода
  return (1.5 + 1.15*stationLevel()) * techMods().inc * prestigeBonus() * (seasonBoostOn() ? 1.10 : 1);
}
/* the drone (IAP) widens the offline window but never removes it — п.13 */
function offWindow(){ return iapOn("drone") ? 3*3600 : OFFLINE_WINDOW_S; }
function offRate(){ return iapOn("drone") ? 0.75 : OFFLINE_RATE; }
function bootIncome(){
  const now = Date.now();
  if (save.lastSeen){
    const gap = Math.max(0, (now - save.lastSeen)/1000);
    save.offlineS = (save.offlineS||0) + Math.min(gap, offWindow()) * offRate();
  }
  save.lastSeen = now; sessionStart = now;
}
function incomeSeconds(){ return Math.min(INCOME_CAP_S, (save.offlineS||0) + (Date.now()-sessionStart)/1000); }
function incomeAccrued(){ return Math.floor(incomeSeconds()/60 * incomePerMin()); }
function incomePct(){ return Math.min(1, incomeSeconds()/INCOME_CAP_S); }
function incomeOfflineLeft(){
  if (!save.lastSeen) return 0;
  return Math.max(0, OFFLINE_WINDOW_S - Math.max(0,(Date.now()-save.lastSeen)/1000));
}
function claimIncome(){
  const a = incomeAccrued(); if (a <= 0){ save.offlineS = 0; sessionStart = Date.now(); save.lastSeen = Date.now(); return 0; }
  save.wallet += a; save.offlineS = 0; sessionStart = Date.now(); save.lastSeen = Date.now();
  persist(); sendEvent("income", a); return a;
}
/* ---- research: tiers open in strict order, inside a tier the player chooses; one job at a time ---- */
function tierOpen(t){ return t.t <= 1 || TECHS.some(x => x.t === t.t-1 && hasTech(x.id)); }
function techAvailable(t){ return !hasTech(t.id) && tierOpen(t); }
function availableTechs(){ return TECHS.filter(techAvailable); }
function nextTech(){ return availableTechs()[0] || null; }
function techResOk(t){ if (!t.res) return true; for (const k in t.res) if ((save.res[k]||0) < t.res[k]) return false; return true; }
function techResStr(t){ if (!t.res) return ""; return Object.keys(t.res).map(k =>
  ((save.res[k]||0) >= t.res[k] ? "✓ " : "") + t.res[k] + " " + resName(k)).join(" · "); }
function canResearch(t){ return t && !save.building && techAvailable(t) && save.wallet >= t.cost && techResOk(t); }
function startResearch(id){
  const t = id ? techById(id) : nextTech(); if (!t) return null;
  if (!techAvailable(t)) return { err:"tier" };
  if (save.building) return { err:"busy" };
  if (save.wallet < t.cost) return { err:"coins" };
  if (!techResOk(t)) return { err:"res" };
  save.wallet -= t.cost;
  if (t.res) for (const k in t.res) save.res[k] = (save.res[k]||0) - t.res[k];
  save.building = { id:t.id, until: Date.now() + t.secs*1000 };
  persist(); sendEvent("tech_start", t.id);
  return { ok:t };
}
function researchLeft(){ return save.building ? Math.max(0, (save.building.until - Date.now())/1000) : 0; }
function tickResearch(announce){
  if (!save.building) return false;
  if (Date.now() < save.building.until) return false;
  const t = techById(save.building.id);
  save.tech.push(t.id); save.building = null; _seqLv = -1; persist();
  if (announce){
    toast((lang==="ru"?"Изучено: ":"Researched: ") + (lang==="ru"?t.ru:t.en));
    AU.play("levelup", .7);
    if (t.ship) setTimeout(()=>toast(lang==="ru"?"Открыт новый корабль в ангаре!":"A new ship is waiting in the hangar!"), 1400);
    queueInter("tier");           // shown later, between screens — never inside a run
  }
  sendEvent("tech_done", t.id);
  return true;
}
/* ---- expeditions: pick your own route, then wait out the prep time ---- */
function curExp(){ return save.exped.active ? expById(save.exped.active) : null; }
function expDone(id){ return (save.exped.done||[]).indexOf(id) >= 0; }
function availableExps(){ return ALL_ROUTES.filter(e => e.lv <= stationLevel() && (e.rep === true || !expDone(e.id))); }
function expPhase(){
  if (save.exped.active) return { phase:"run", e:curExp() };
  if (Date.now() < save.exped.until) return { phase:"wait", e:null };
  return { phase:"ready", e:null };
}
function expTarget(){ const e = curExp(); return e ? (e.stages[save.exped.stage] || 0) : 0; }
function startExp(id){
  if (expPhase().phase !== "ready") return false;
  const e = expById(id); if (!e || e.lv > stationLevel() || (!e.rep && expDone(e.id))) return false;
  if (e.sea && seasonRunLeft(e) <= 0) return false;      // п.15.2: у сезонного маршрута 2 захода в сутки
  save.exped.active = id; save.exped.stage = 0; persist();
  sendEvent("exp_start", e.id); return true;
}
function expCheck(){
  if (!save.exped.active) return;
  const e = curExp(); if (!e){ save.exped.active = null; return; }
  const need = e.stages[save.exped.stage];
  if (dist < need) return;
  save.exped.stage++;
  if (save.exped.stage >= e.stages.length){
    save.exped.active = null; save.exped.stage = 0;
    if (!e.rep && save.exped.done.indexOf(e.id) < 0) save.exped.done.push(e.id);
    save.exped.until = Date.now() + e.cd*1000;
    save.wallet += e.rew.coins;
    if (!e.rep) save.trophies = (save.trophies||0) + 1;   // п.4: трофей — только за большой маршрут
    for (const k in e.rew.res) save.res[k] = (save.res[k]||0) + e.rew.res[k];
    const tok = e.sea ? seasonFinish(e) : 0;
    persist(); AU.play("levelup", .85);
    toast((lang==="ru"?"Экспедиция завершена! +":"Expedition complete! +") + e.rew.coins + "\u2605" +
          (tok ? " \u00b7 +" + tok + " " + tr("sea_tok") : ""));
    floats.push({ x:player.x+120, y:player.y-110, text:(lang==="ru"?"ЭКСПЕДИЦИЯ! +":"EXPEDITION! +") + e.rew.coins + "★",
                  color:"#ffd166", life:2.2, vy:-26, size:24 });
    sendEvent("exp_done", e.id); queueInter("exp");
  } else {
    persist(); AU.play("milestone", .6);
    floats.push({ x:player.x+110, y:player.y-100, text:(lang==="ru"?"ЭТАП ":"STAGE ")+save.exped.stage+"/"+e.stages.length,
                  color:"#7ef9ff", life:1.6, vy:-28, size:20 });
  }
}
function grantRes(k, n){ save.res[k] = (save.res[k]||0) + n; }
/* ---- п.15.1: престиж «Пересборка станции» — второй месяц игры.
   Сбрасывает техдерево, секторы и маршруты, но оставляет кристаллы, корабли, рекорды,
   трофеи и покупки, а в награду даёт вечное ядро: +25% к доходу станции навсегда. ---- */
const CORE_BONUS = 0.25;
const cores = () => (save.cores|0);
const prestigeBonus = () => 1 + CORE_BONUS*cores();
const techAll = () => TECHS.every(t => hasTech(t.id));
const prestigeReady = () => techAll() && !save.building;
function doPrestige(){
  if (!techAll()) return { err:"tier" };
  if (save.building) return { err:"busy" };
  save.cores = cores() + 1;
  save.tech = []; save.building = null; save.res = {};
  save.exped = { done:[], stage:0, active:null, until:0, auto:null };
  save.bench = Object.assign({}, DEF.bench); save.botBranch = null;
  save.offlineS = 0; save.lastSeen = Date.now(); sessionStart = Date.now();
  _seq = null; _seqLv = -1; _mods = null; _modsKey = "";
  persist(); sendEvent("prestige", save.cores);
  return { ok:true, cores:save.cores };
}
/* ---- п.15.2: сезон живёт 30 дней; жетоны и награды обнуляются с новым сезоном ---- */
const seasonId = () => Math.floor(Date.now()/SEASON_MS);
function season(){
  const id = seasonId();
  if (!save.season || save.season.id !== id) save.season = { id:id, tokens:0, claimed:[], boost:false, day:"", runs:{} };
  const d = todayKey();
  if (save.season.day !== d){ save.season.day = d; save.season.runs = {}; }
  return save.season;
}
function seasonLeftMs(){ return (seasonId()+1)*SEASON_MS - Date.now(); }
function seasonTokens(){ return season().tokens|0; }
function seasonRunLeft(e){ return Math.max(0, SEASON_RUN_CAP - (season().runs[e.id]|0)); }
function seasonBoostOn(){ return !!season().boost; }
function seasonFinish(e){ const s = season(); s.tokens = (s.tokens|0) + e.tok; s.runs[e.id] = (s.runs[e.id]|0) + 1; return e.tok; }
function seasonNextClaim(){ const s = season();
  for (let i=0;i<SEASON_REWARDS.length;i++) if (s.tokens >= SEASON_REWARDS[i].n && s.claimed.indexOf(i) < 0) return i;
  return -1; }
function seasonClaim(i){
  const s = season(), r = SEASON_REWARDS[i];
  if (!r) return { err:"none" };
  if (s.claimed.indexOf(i) >= 0) return { err:"done" };
  if (s.tokens < r.n) return { err:"limit" };
  s.claimed.push(i);
  save.wallet += r.rew.coins||0;
  for (const k in (r.rew.res||{})) grantRes(k, r.rew.res[k]);
  if (r.rew.skips) save.iap = Object.assign({}, DEF.iap, save.iap||{}), save.iap.skips = iapTokens("skips") + r.rew.skips;
  if (r.rew.boost) s.boost = true;
  persist(); sendEvent("season_claim", i); return { ok:true, rew:r.rew };
}
/* сезонный отсчёт читаем по-человечески: «12 дн 04 ч», а не «300 часов» */
function fmtSeason(ms){
  const d = Math.floor(ms/86400000), h = Math.floor((ms % 86400000)/3600000);
  if (d <= 0) return fmtLeft(Math.max(0, ms/1000));
  return d + (lang === "ru" ? " дн " : "d ") + h + (lang === "ru" ? " ч" : "h");
}
/* ---- п.15.3: экипаж (гильдия/друзья). Соц-графа в Яндекс Играх нет, поэтому «друзья» —
   реальные игроки лидерборда: их имена берутся из getLeaderboardEntries один раз за неделю,
   а без SDK работает устойчивый локальный состав (тот же на всю неделю).
   Это НЕ соревнование, а совместный полёт: общая дистанция за неделю и три награды-ступени.
   П.14 не нарушается: экипаж не даёт силы, реклама и покупки его не ускоряют. ---- */
const CREW_MS = 7*86400*1000;
const CREW_SIZE = 5;
const CREW_LV = 3;                    // экипаж включается вместе с третьим сектором
const CREW_DAY_CAP = 2500;            // суточный вклад игрока: ежедневный ритуал, а не гринд
const CREW_GOALS = [
  { m:4000,  rew:{ coins:900,  res:12 } },
  { m:12000, rew:{ coins:1800, res:16 } },
  { m:22000, rew:{ coins:3000, res:20, skips:1 } },
];
const CREW_POOL = {
  ru:["Ион","Веста","Титан","Церера","Юнона","Паллада","Нерей","Протей","Гелиос","Кибела",
      "Аврора","Оберон","Фобос","Дафна","Каллисто","Тритон"],
  en:["Ion","Vesta","Titan","Ceres","Juno","Pallas","Nereus","Proteus","Helios","Cybele",
      "Aurora","Oberon","Phobos","Daphne","Callisto","Triton"],
};
const crewId = () => Math.floor(Date.now()/CREW_MS);
function crew(){
  const id = crewId();
  if (!save.crew || save.crew.id !== id)
    save.crew = { id:id, mine:0, day:"", dayDist:0, claimed:[], roster:null, fetched:0 };
  const c = save.crew;
  if (!Array.isArray(c.claimed)) c.claimed = [];
  if (c.roster !== null && !Array.isArray(c.roster)) c.roster = null;
  const d = todayKey();
  if (c.day !== d){ c.day = d; c.dayDist = 0; }
  return c;
}
const crewReady = () => stationLevel() >= CREW_LV;
function crewLeftMs(){ return (crewId()+1)*CREW_MS - Date.now(); }
function crewElapsedMs(){ return Math.max(0, Math.min(Date.now() - crewId()*CREW_MS, CREW_MS)); }
function crewRoster(){
  const c = crew();
  if (!c.roster || !c.roster.length){
    const pool = CREW_POOL[lang === "ru" ? "ru" : "en"], start = (c.id*5) % pool.length;
    c.roster = []; for (let i=0;i<CREW_SIZE;i++) c.roster.push(pool[(start + i*5) % pool.length]);
  }
  return c.roster.slice(0, CREW_SIZE);
}
/* names of real players from the leaderboard — once per week, then the roster is stable */
function crewSetRoster(names){
  const list = (names||[]).map(n => String(n).replace(/\s+/g," ").slice(0,14)).filter(Boolean);
  if (!list.length) return false;
  crew().roster = list.slice(0, CREW_SIZE); return true;
}
function crewHash(s){ let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = (h*16777619)>>>0; } return h; }
/* every mate flies on his own while you are away: 350-709 m a day, fixed for the week */
function crewRate(name){ return 350 + crewHash(crewId() + "|" + name) % 360; }
function crewMateDist(name){ return crewRate(name) * crewElapsedMs()/86400000; }
function crewMatesDist(){ let s = 0; for (const n of crewRoster()) s += crewMateDist(n); return s; }
function crewDist(){ return (crew().mine|0) + crewMatesDist(); }
/* the player pays with the distance of his runs, but only CREW_DAY_CAP a day */
function crewAdd(d){
  if (!crewReady()) return 0;
  const c = crew(); d = Math.max(0, Math.floor(d||0));
  const add = Math.min(d, Math.max(0, CREW_DAY_CAP - (c.dayDist|0)));
  if (!add) return 0;
  c.mine = (c.mine|0) + add; c.dayDist = (c.dayDist|0) + add;
  return add;
}
/* the resource is always the one of the deepest sector you have opened */
function crewResKey(){ const open = ZONES.filter(z => z.unlock <= stationLevel());
  return (open.length ? open[open.length-1] : ZONES[0]).res; }
function crewReward(i){ const g = CREW_GOALS[i]; if (!g) return null;
  const res = {}; res[crewResKey()] = g.rew.res;
  return { coins:g.rew.coins, res:res, skips:g.rew.skips||0 }; }
function crewNextClaim(){ const c = crew(), d = crewDist();
  for (let i=0;i<CREW_GOALS.length;i++) if (d >= CREW_GOALS[i].m && c.claimed.indexOf(i) < 0) return i;
  return -1; }
function crewClaim(i){
  const c = crew(), g = CREW_GOALS[i];
  if (!g) return { err:"none" };
  if (c.claimed.indexOf(i) >= 0) return { err:"done" };
  if (crewDist() < g.m) return { err:"limit" };
  const rw = crewReward(i);
  c.claimed.push(i);
  save.wallet += rw.coins;
  for (const k in rw.res) grantRes(k, rw.res[k]);
  if (rw.skips){ save.iap = Object.assign({}, DEF.iap, save.iap||{}); save.iap.skips = iapTokens("skips") + rw.skips; }
  persist(); sendEvent("crew_claim", i);
  return { ok:true, rew:rw, dist:Math.round(crewDist()) };
}

function fmtLeft(sec){
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return sec + "s";
  if (sec < 3600) return Math.floor(sec/60) + "m" + (sec%60 ? " " + (sec%60) + "s" : "");
  return Math.floor(sec/3600) + "h " + Math.floor((sec%3600)/60) + "m";
}
/* ================= MONETISATION LAYER (docs/META.md п.12-14) =================
   Rewarded ads only SPEED THE LOOP UP (timers, bank, crate) and are always optional.
   Automation (drone, skips) is bought with real money only — п.13. */
const AD_LIMITS = { speed:3, dock:3, bank:2, crate:1, trial:2, drone:3 };
/* п.12: годовой пропуск даёт +1 ревард в день, но НЕ трогает лимит дрона (п.13) */
function adCap(kind){ return (AD_LIMITS[kind]||0) + (kind !== "drone" && iapOn("pass") ? 1 : 0); }
const SPEED_MAX_S = 600;                 // one speed-up never removes more than 10 minutes
function limits(){
  const k = todayKey();
  if (!save.limits || save.limits.date !== k) save.limits = { date:k, speed:0, dock:0, bank:0, crate:0, trial:0, drone:0 };
  return save.limits;
}
function adLeft(kind){ const L = limits(); return Math.max(0, adCap(kind) - (L[kind]||0)); }
function adUse(kind){ const L = limits(); L[kind] = (L[kind]||0) + 1; persist(); }
/* ---- rewarded speed-ups ---- */
function speedBuild(){
  if (!save.building) return { err:"none" };
  const left = researchLeft(); if (left <= 0) return { err:"none" };
  if (adLeft("speed") <= 0) return { err:"limit" };
  const cut = Math.min(left*0.25, SPEED_MAX_S);
  save.building.until = Math.max(Date.now(), save.building.until - cut*1000);
  adUse("speed"); persist(); sendEvent("ad_speed", cut|0); return { ok:true, cut:cut };
}
function speedDock(){
  if (expPhase().phase !== "wait") return { err:"none" };
  if (adLeft("dock") <= 0) return { err:"limit" };
  const left = (save.exped.until - Date.now())/1000;
  const cut = Math.min(left*0.5, SPEED_MAX_S);
  save.exped.until = Math.max(Date.now(), save.exped.until - cut*1000);
  adUse("dock"); persist(); sendEvent("ad_dock", cut|0); return { ok:true, cut:cut };
}
function bankDouble(){
  const a = incomeAccrued(); if (a <= 0) return { err:"empty" };
  if (adLeft("bank") <= 0) return { err:"limit" };
  save.wallet += a; adUse("bank"); persist(); sendEvent("ad_bank", a); return { ok:true, got:a };
}
function openCrate(){
  if (adLeft("crate") <= 0) return { err:"limit" };
  const pool = ZONES.filter(z => z.unlock <= stationLevel()).map(z => z.res);
  if (!pool.length) return { err:"none" };
  const k = pool[Math.floor(Math.random()*pool.length)];
  const n = 1 + Math.floor(Math.random()*3);
  grantRes(k, n); adUse("crate"); persist(); sendEvent("ad_crate", k); return { ok:true, res:k, n:n };
}
/* ---- п.12: «проба сектора» — 60 секунд полёта в ещё закрытом секторе ---- */
const TRIAL_SECS = 60, TRIAL_RES = 3;
function trialZone(){
  const lv = stationLevel(); let best = -1;
  ZONES.forEach((z,i)=>{ if (z.unlock > lv && (best < 0 || z.unlock < ZONES[best].unlock)) best = i; });
  return best < 0 ? null : { i:best, z:ZONES[best] };
}
function trialOffer(){
  if (adLeft("trial") <= 0) return { err:"limit" };
  const t = trialZone();
  return t ? { ok:true, zone:t.i, res:t.z.res } : { err:"none" };
}
function trialReward(i){
  const z = ZONES[i % ZONES.length]; grantRes(z.res, TRIAL_RES); adUse("trial"); persist();
  sendEvent("ad_trial", z.res); return { res:z.res, n:TRIAL_RES };
}
/* ---- п.16.3: нет тупика. Верстак меняет 3 ресурса одного типа на 1 другого ---- */
const EXCH_RATIO = 3;
const benchOpen = () => hasTech("bench");
function openResKeys(){ return ZONES.filter(z => z.unlock <= stationLevel()).map(z => z.res); }
function exchangeRes(from, to){
  if (!benchOpen()) return { err:"bench" };
  if (!from || !to || from === to) return { err:"pick" };
  const open = openResKeys();
  if (open.indexOf(from) < 0 || open.indexOf(to) < 0) return { err:"pick" };
  if ((save.res[from]||0) < EXCH_RATIO) return { err:"coins" };
  save.res[from] = (save.res[from]||0) - EXCH_RATIO; grantRes(to, 1); persist();
  sendEvent("exchange", from + ">" + to); return { ok:true, from:from, to:to };
}
/* п.13: «оператор верстака» (реальные деньги) делает тот же обмен сам — 1 раз в 2 часа,
   и никогда не выгребает склад в ноль: нужен запас ещё на один обмен. */
const OPERATOR_S = 2*3600;
function benchRule(){ return save.bench || (save.bench = { src:null, dst:null, until:0 }); }
function setBenchRule(src, dst){
  const r = benchRule(); const open = openResKeys();
  if (src && dst && src !== dst && open.indexOf(src) >= 0 && open.indexOf(dst) >= 0){ r.src = src; r.dst = dst; }
  else { r.src = null; r.dst = null; }
  persist(); return r;
}
function operatorLeft(){ const r = benchRule(); return Math.max(0, ((r.until||0) - Date.now())/1000); }
function operatorTick(){
  if (!iapOn("operator") || !autoReady()) return 0;
  const r = benchRule(); if (!r.src || !r.dst) return 0;
  if (Date.now() < (r.until||0)) return 0;
  if ((save.res[r.src]||0) < EXCH_RATIO*2) return 0;
  const out = exchangeRes(r.src, r.dst); if (!out.ok) return 0;
  r.until = Date.now() + OPERATOR_S*1000; persist(); sendEvent("operator", r.dst); return 1;
}
/* ---- п.13: автоматика покупается за реальные деньги и открывается только после
   Фабрикатора (тир 4): сначала весь цикл проходит руками ---- */
const autoReady = () => hasTech("fabricator");
/* диспетчер маршрутов: только повторяемые маршруты, маршрут один раз выбирает игрок */
function setAutoRoute(id){
  const e = id ? expById(id) : null;
  save.exped.auto = (e && e.rep && !e.sea && e.lv <= stationLevel()) ? e.id : null;   // п.13: только повторяемые s1-s3
  persist(); return save.exped.auto;
}
function dispatcherTick(){
  if (!iapOn("dispatcher") || !autoReady()) return 0;
  if (expPhase().phase !== "ready") return 0;
  const id = save.exped.auto; if (!id) return 0;
  const e = expById(id); if (!e || !e.rep || e.lv > stationLevel()) return 0;
  if (!startExp(id)) return 0;
  sendEvent("dispatcher", id); return 1;
}
/* пусковой бот: продолжает ВЕТКУ, которую выбрал игрок, — развилку в тире он не решает */
const branchKey = t => String(t && t.id ? t.id : t).replace(/[0-9]+$/,"");
function branchHead(k){ let head = null;
  for (const t of TECHS){ if (branchKey(t) !== k) continue;
    if (!head || t.t < head.t) head = t; } return head; }
function branchList(){ const a = []; for (const t of TECHS){ const k = branchKey(t);
  if (a.indexOf(k) < 0) a.push(k); } return a; }
function branchName(k){ const h = branchHead(k); if (!h) return k;
  const n = lang === "ru" ? h.ru : h.en; return n.replace(/\s+(I|II|III)$/,""); }
function setBotBranch(k){ save.botBranch = (k && branchHead(k)) ? k : null; persist(); return save.botBranch; }
function botTick(){
  if (!iapOn("bot") || !autoReady()) return 0;
  if (save.building) return 0;
  const k = save.botBranch; if (!k) return 0;
  const t = availableTechs().filter(x => branchKey(x) === k).sort((a,b)=>a.t-b.t)[0];
  if (!t || save.wallet < t.cost || !techResOk(t)) return 0;
  const r = startResearch(t.id); if (!r || !r.ok) return 0;
  sendEvent("bot", t.id); return 1;
}
/* ---- IAP catalogue (цены задаёт витрина Яндекса, своих у нас нет) ---- */
const IAPS = [
  { id:"cr_cosmoraid_drone", kind:"drone", once:true,  ru:"Дрон-сборщик",     en:"Collector drone",   dru:"сам забирает полную копилку, до 3 раз в сутки", den:"claims a full bank, up to 3 times a day" },
  { id:"cr_cosmoraid_noads", kind:"noads", once:true,  ru:"Без интерстишей",  en:"No interstitials",  dru:"реварды остаются — они ускоряют цикл",          den:"rewarded ads stay — they speed the loop up" },
  { id:"cr_cosmoraid_skips", kind:"skips", once:false, ru:"3 пропуска стройки",en:"3 build skips",     dru:"мгновенное завершение технологии",             den:"finish a technology instantly" },
  { id:"cr_cosmoraid_cds",   kind:"cds",   once:false, ru:"3 пропуска стыковки",en:"3 dock skips",     dru:"мгновенное окончание кулдауна узла",           den:"end the dock cooldown instantly" },
  // п.13: автоматика — только за реальные деньги и только после Фабрикатора (тир 4)
  { id:"cr_cosmoraid_bot",        kind:"bot",        once:true, ru:"Пусковой бот",        en:"Build bot",        dru:"сам начинает следующую стройку в выбранной тобой ветке", den:"starts the next build in the branch you picked" },
  { id:"cr_cosmoraid_operator",   kind:"operator",   once:true, ru:"Оператор верстака",   en:"Bench operator",   dru:"авто-обмен 3:1 по твоему правилу, 1 раз в 2 часа",     den:"auto 3:1 exchange by your rule, once per 2 h" },
  { id:"cr_cosmoraid_dispatcher", kind:"dispatcher", once:true, ru:"Диспетчер маршрутов", en:"Route dispatcher", dru:"сам запускает повторяемые маршруты после стыковки",    den:"relaunches repeatable routes after docking" },
  // п.12: пакеты
  { id:"cr_cosmoraid_pass",       kind:"pass",       once:true, ru:"Годовой пропуск станции", en:"Station year pass", dru:"×1.5 доход, +1 лимит ревардов, без интерстишей", den:"x1.5 income, +1 reward limit, no interstitials" },
  { id:"cr_cosmoraid_starter",    kind:"starter",    once:true, ru:"Стартовый пакет",     en:"Starter pack",     dru:"300★ + технология тира 1 сразу + дрон на 3 дня",       den:"300 crystals + one tier-1 tech at once + drone for 3 days" },
];
const iapById = id => IAPS.find(x => x.id === id);
function iapOn(k){
  if (!save.iap) return false;
  // стартовый пакет арендует дрон на 3 дня, сама покупка остаётся разовой
  if (k === "drone") return !!save.iap.drone || (save.iap.droneUntil||0) > Date.now();
  return !!save.iap[k];
}
function iapTokens(k){ return (save.iap && save.iap[k]) | 0; }
function grantIap(id){
  const it = iapById(id); if (!it) return null;
  if (it.once && iapOn(it.kind)) return it;            // restorePurchases не платит дважды
  save.iap = Object.assign({}, DEF.iap, save.iap||{});
  if (it.once) save.iap[it.kind] = true;
  else save.iap[it.kind] = iapTokens(it.kind) + 3;
  if (it.kind === "starter") starterPack();
  persist(); return it;
}
/* п.12: стартовый пакет = кристаллы + ОДНА технология тира 1 сразу + дрон на 3 дня.
   п.14.1: покупка снимает максимум один таймер. */
function starterPack(){
  save.wallet += 300;
  save.iap.droneUntil = Math.max(save.iap.droneUntil||0, Date.now() + 3*86400*1000);
  if (save.building) save.building.until = Date.now();
  else {
    const t = availableTechs().filter(x => x.t === 1).sort((a,b)=>a.cost-b.cost)[0]
           || availableTechs().sort((a,b)=>a.cost-b.cost)[0];
    if (t) save.building = { id:t.id, until:Date.now() };
  }
  return true;
}
/* п.14: one purchase removes at most ONE timer */
function useSkip(){
  if (!save.building) return { err:"none" };
  if (iapTokens("skips") <= 0) return { err:"token" };
  save.iap.skips = iapTokens("skips") - 1;
  save.building.until = Date.now(); persist();
  sendEvent("iap_skip", save.building.id); return { ok:true };
}
function useDockSkip(){
  if (expPhase().phase !== "wait") return { err:"none" };
  if (iapTokens("cds") <= 0) return { err:"token" };
  save.iap.cds = iapTokens("cds") - 1;
  save.exped.until = Date.now(); persist();
  sendEvent("iap_dockskip", 1); return { ok:true };
}
/* drone: only a FULL bank, max 3 times a day, and it never opens gates (п.13) */
function droneTick(){
  if (!iapOn("drone")) return 0;
  if (adLeft("drone") <= 0) return 0;
  if (incomePct() < 1) return 0;
  const a = claimIncome(); if (a <= 0) return 0;
  limits().drone = (limits().drone|0) + 1; persist();
  sendEvent("drone", a); return a;
}
/* ---- interstitials: between screens only, never more than once per 3 runs / 2 min ---- */
const INTER_GAP_S = 120, INTER_RUNS = 3;
const noInter = () => iapOn("noads") || iapOn("noAds") || iapOn("pass");
function queueInter(tag){ if (!noInter()) save.pendingInter = tag; }
function interOk(){
  if (noInter()) return false;
  return (Date.now() - (save.lastInter||0))/1000 >= INTER_GAP_S;
}
async function maybeInterstitial(tag){
  if (!interOk()) return false;
  save.lastInter = Date.now(); save.interRuns = 0; save.pendingInter = null; persist();
  return await showInterstitial();
}
/* ---- "what do I do next": the game always points at the nearest goal (п.16.2) ---- */
function tierProgress(){
  const av = availableTechs(); const tier = av.length ? av[0].t : MAX_TIER + 1;
  const inTier = TECHS.filter(x => x.t === Math.min(tier, MAX_TIER));
  return { tier:tier, done:inTier.filter(t => hasTech(t.id)).length, total:inTier.length };
}
function nextUnlock(){
  const lv = stationLevel();
  const z = ZONES.filter(z => z.unlock > lv).sort((a,b)=>a.unlock-b.unlock)[0] || null;
  const s = SHIPS.filter(x => !shipOwned(x.id)).map(x => shipGate(x)).filter(Boolean)
                 .sort((a,b)=>a.t-b.t)[0] || null;
  return { sector:z, ship:s };
}
function nextGoal(){
  if (save.building){ const t = techById(save.building.id);
    return { kind:"build", icon:"ic_tech", screen:"station", txt:tr("goal_build") + " " + (lang==="ru"?t.ru:t.en), sub:fmtLeft(researchLeft()) }; }
  const ready = availableTechs().filter(t => canResearch(t));
  if (ready.length){ const t = ready[0];
    return { kind:"research", icon:techIcon(t), screen:"station", txt:tr("goal_research") + " " + (lang==="ru"?t.ru:t.en), sub:t.cost + "\u2605" + (t.res ? " \u00b7 " + techResStr(t) : "") }; }
  if (incomeAccrued() > 0) return { kind:"bank", icon:"ic_crystal", screen:"station", txt:tr("goal_bank"), sub:"+" + incomeAccrued() + "\u2605" };
  // п.15.2: сезонную награду тоже всегда видно
  const sc = seasonNextClaim();
  if (sc >= 0) return { kind:"season", icon:"ic_flag", screen:"expedition", txt:tr("goal_season"), sub:seasonTokens() + " / " + SEASON_REWARDS[sc].n + " " + tr("sea_tok") };
  const cc = crewNextClaim();
  if (cc >= 0) return { kind:"crew", icon:"ic_crew", screen:"expedition", txt:tr("goal_crew"),
    sub:Math.round(crewDist()) + " / " + CREW_GOALS[cc].m + "\u043c" };
  const ph = expPhase();
  if (ph.phase === "run" && ph.e) return { kind:"exp", icon:"ic_expedition", screen:null, txt:(lang==="ru"?ph.e.ru:ph.e.en), sub:expTarget() + "\u043c" };
  const ex = availableExps();
  if (ph.phase === "ready" && ex.length){ const e = ex[ex.length-1];
    return { kind:"exp", icon:"ic_expedition", screen:"expedition", txt:tr("goal_exp") + " " + (lang==="ru"?e.ru:e.en), sub:e.stages[e.stages.length-1] + "\u043c" }; }
  if (ph.phase === "wait") return { kind:"dock", icon:"ic_expedition", screen:"expedition", txt:tr("goal_dock"), sub:fmtLeft((save.exped.until - Date.now())/1000) };
  const need = availableTechs().filter(t => !techResOk(t));
  if (need.length){
    // п.12: если ресурса нет — можно взять его из пробы закрытого сектора (или повторить маршрут)
    const pr = trialOffer();
    if (pr.ok) return { kind:"trial", icon:"ic_sector", screen:"store",
      txt:tr("goal_trial") + " \u00ab" + zoneName(pr.zone) + "\u00bb", sub:"+" + TRIAL_RES + " " + resName(pr.res) };
    return { kind:"farm", icon:"ic_res_" + (Object.keys(need[0].res||{dust:1})[0]), screen:"expedition", txt:tr("goal_farm"), sub:(lang==="ru"?need[0].ru:need[0].en) };
  }
  // п.15.1: 100% техдерева -> следующий шаг это пересборка станции
  if (techAll()) return { kind:"prestige", icon:"ic_core", screen:"station", txt:tr("goal_prestige"),
    sub:"\u00d7" + prestigeBonus().toFixed(2) + " \u2192 \u00d7" + (prestigeBonus()+CORE_BONUS).toFixed(2) };
  if (iapOn("drone") === false && incomePct() > 0.9) return { kind:"bank", icon:"ic_crystal", screen:"station", txt:tr("goal_bank"), sub:"" };
  return { kind:"done", icon:"ic_rank", screen:null, txt:tr("next_none"), sub:"" };
}
