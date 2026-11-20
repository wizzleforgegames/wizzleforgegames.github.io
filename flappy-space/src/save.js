/* FLAPPY COSMOS — сейвы: localStorage + облако SDK
   Art: Kenney (CC0) space kits · Sound: Kenney + "ObservingTheStar" (CC0)
   Порядок подключения: i18n → sdk → save → audio → assets → meta → game → ui */

/* ---------------- storage ---------------- */
const KEY = "cosmoraid_v1";
const DEF = { best:0, wallet:0, musicOn:true, sfxOn:true, lang:null, ships:["craft_racer"],
  ship:"craft_racer", lastDaily:0, streak:0, missions:null, stats:{runs:0,crystals:0,rescued:0,dist:0,boosts:0,near:0},
  seenAds:0,
  tech:[], building:null, lastClaim:0, lastSeen:0, offlineS:0, res:{}, trophies:0,
  exped:{ done:[], stage:0, active:null, until:0, auto:null },
  // п.16.3/п.13: правило верстака для «оператора» и ветка для «пускового бота»
  bench:{ src:null, dst:null, until:0 }, botBranch:null,
  // iap: автоматика и пропуски покупаются за РЕАЛЬНЫЕ деньги (docs/META.md п.13)
  iap:{ drone:false, droneUntil:0, noAds:false, skips:0, cds:0,
        bot:false, operator:false, dispatcher:false, pass:false, starter:false },
  limits:null, lastInter:0, interRuns:0, pendingInter:null, coach:0,
  // п.15.1 престиж «Пересборка станции»: вечные ядра (+25% дохода каждое)
  cores:0,
  // п.15.2 сезон (30 дней): жетоны, выкупленные награды, сезонное ядро
  season:null,
  // п.15.3 экипаж (7 дней): вклад игрока, состав, выкупленные ступени
  crew:null };
let save = Object.assign({}, DEF);
/* технологии старых сохранений: сингулярность стала «Реактором III» (п.3) */
const TECH_ALIAS = { singularity:"reactor3" };
function loadLocal(){ try{ const d = JSON.parse(localStorage.getItem(KEY)||"{}");
  save = Object.assign({}, DEF, d); save.stats = Object.assign({}, DEF.stats, d.stats||{});
  save.ships = Array.isArray(d.ships)&&d.ships.length ? d.ships : ["craft_racer"];
  save.tech = Array.isArray(d.tech)
    ? d.tech.map(id => TECH_ALIAS[id] || id).filter(id => !!techById(id)) : [];
  save.res = (d.res && typeof d.res === "object") ? d.res : {};
  save.exped = Object.assign({}, DEF.exped, d.exped||{});
  if (!Array.isArray(save.exped.done)) save.exped.done = [];
  if (typeof save.exped.active !== "string") save.exped.active = null;
  if (typeof save.exped.auto !== "string") save.exped.auto = null;
  save.bench = Object.assign({}, DEF.bench, d.bench||{});
  save.botBranch = typeof d.botBranch === "string" ? d.botBranch : null;
  save.exped.stage = Math.max(0, save.exped.stage|0);
  const bId = d.building ? (TECH_ALIAS[d.building.id] || d.building.id) : null;
  save.building = (d.building && techById(bId)) ? { id:bId, until:d.building.until } : null;
  save.iap = Object.assign({}, DEF.iap, d.iap||{});
  save.limits = (d.limits && typeof d.limits === "object") ? d.limits : null;
  save.lastInter = save.lastInter|0; save.interRuns = save.interRuns|0; save.coach = save.coach|0;
  save.cores = d.cores|0;
  save.season = (d.season && typeof d.season === "object") ? d.season : null;
  if (save.season){ if (!Array.isArray(save.season.claimed)) save.season.claimed = [];
    if (!save.season.runs || typeof save.season.runs !== "object") save.season.runs = {}; }
  save.crew = (d.crew && typeof d.crew === "object") ? d.crew : null;
  if (save.crew){ if (!Array.isArray(save.crew.claimed)) save.crew.claimed = [];
    if (save.crew.roster !== null && !Array.isArray(save.crew.roster)) save.crew.roster = null; }
  if (!save.lastClaim) save.lastClaim = Date.now();
  save.offlineS = 0; save.lastSeen = save.lastSeen || 0;
  // a build that finished while the game was closed is granted on boot
  if (save.building && Date.now() >= save.building.until){
    save.tech.push(save.building.id); save.building = null; save.pendingTech = true; }
  }catch(e){} }
function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(save)); }catch(e){}
  if (sdkPlayer){ try{ sdkPlayer.setData(save); }catch(e){} } }
async function loadCloud(){
  if (!sdkPlayer) return;
  try { const d = await sdkPlayer.getData(); if (d && typeof d === "object"){
    const merged = Object.assign({}, save, d);
    merged.stats = Object.assign({}, save.stats, d.stats||{});
    if (Array.isArray(d.ships) && d.ships.length) merged.ships = d.ships;
    save = merged; } } catch(e){}
}

