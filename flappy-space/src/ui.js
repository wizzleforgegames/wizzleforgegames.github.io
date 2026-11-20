/* FLAPPY COSMOS — весь DOM: экраны, меню, станция, экспедиции, магазин, задания, кнопки, boot()
   Art: Kenney (CC0) space kits · Sound: Kenney + "ObservingTheStar" (CC0)
   Порядок подключения: i18n → sdk → save → audio → assets → meta → game → ui */

/* ---------------- DOM / UI ---------------- */
function el(id){ return document.getElementById(id); }
const screens = ["menu","station","expedition","store","howto","shop","missions","daily","leaderboard","settings","pause","gameover"];
/* п.17: functional glyphs are inline SVG (one thin contour), content icons are Kenney sprites */
function setGlyph(node, id){ const u = node && node.querySelector("use"); if (!u) return;
  u.setAttribute("href", "#" + id);
  try { u.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + id); } catch(e){} }
function showScreen(id){ screens.forEach(s=>{ const n = el(s); if(!n) return; s===id ? n.classList.remove("hidden") : n.classList.add("hidden"); }); }
function hideAllScreens(){ screens.forEach(s=>{ const n = el(s); if(n) n.classList.add("hidden"); }); }
let toastTimer = null;
function toast(msg){ const t = el("toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.add("hidden"), 2200); }

const HUDC = {};
function hud(id){ return HUDC[id] || (HUDC[id] = el(id)); }
const HUDLAST = { score:-1, dist:-1, coins:-1, shield:-1, mult:-1, sector:-1, fill:-1, combo:-1, exp:"", trial:-99 };
function syncHUD(){
  const sc = Math.floor(score);
  if (sc !== HUDLAST.score){ HUDLAST.score = sc; hud("scoreVal").textContent = sc; }
  const ds = Math.floor(dist);
  if (ds !== HUDLAST.dist){ HUDLAST.dist = ds; hud("distVal").textContent = ds + " м"; }
  if (runCoins !== HUDLAST.coins){ HUDLAST.coins = runCoins; hud("coinVal").textContent = runCoins; }
  if (player.shield !== HUDLAST.shield){ HUDLAST.shield = player.shield;
    const chip = hud("shieldChip");
    if (player.shield > 0){ chip.classList.remove("hidden"); hud("shieldVal").textContent = player.shield; }
    else chip.classList.add("hidden"); }
  const on = (mult > 1 && comboT > 0) ? 1 : 0;
  if (on !== HUDLAST.mult){ HUDLAST.mult = on; hud("comboBox").classList.toggle("hidden", !on); }
  if (on){
    if (mult !== HUDLAST.combo){ HUDLAST.combo = mult; hud("comboVal").textContent = "x" + mult; }
    const bar = hud("comboBar"); if (bar){ const w = (clamp(comboT/Math.max(1,player.comboTime),0,1)*100).toFixed(0);
      if (w !== bar.dataset.w){ bar.dataset.w = w; bar.style.width = w + "%"; } }
  }
  if (zoneIdx !== HUDLAST.sector){ HUDLAST.sector = zoneIdx; hud("sectorName").textContent = zoneName(zoneIdx); }
  // active expedition: the HUD shows how far the next stage is
  const ec = hud("expChip");
  if (ec){
    const ph = expPhase();
    if (ph.phase === "run" && ph.e){
      const need = expTarget(), v = Math.min(Math.floor(dist), need) + "/" + need;
      ec.classList.remove("hidden");
      if (v !== HUDLAST.exp){ HUDLAST.exp = v; hud("expVal").textContent = v; }
    } else if (!ec.classList.contains("hidden") || HUDLAST.exp !== ""){
      ec.classList.add("hidden"); HUDLAST.exp = "";
    }
  }
  // п.12: «проба сектора» — HUD always shows how much of the trial is left
  const tc = hud("trialChip");
  if (tc){
    if (trial){ tc.classList.remove("hidden"); const v = Math.ceil(trial.left);
      if (v !== HUDLAST.trial){ HUDLAST.trial = v;
        hud("trialVal").textContent = v + (lang === "ru" ? " с" : "s"); } }
    else if (!tc.classList.contains("hidden") || HUDLAST.trial !== -99){
      tc.classList.add("hidden"); HUDLAST.trial = -99; }
  }
  const sf = hud("sectorFill");
  if (sf){ const w = ((dist % ZONE_LEN)/ZONE_LEN*100).toFixed(1);
    if (w !== sf.dataset.w){ sf.dataset.w = w; sf.style.width = w + "%"; } }
  // power timers
  const box = hud("powerTimers");
  const sig = (player.magnet>0?1:0) + "" + (player.boost>0?2:0) + ":" + Math.ceil(player.magnet) + ":" + Math.ceil(player.boost);
  if (sig !== lastPowerSig){ lastPowerSig = sig;
  const act = [];
  if (player.magnet > 0) act.push(["magnet", player.magnet, 10, "#35c6ff"]);
  if (player.boost > 0) act.push(["boost", player.boost, 6, "#f5a623"]);
  let html = "";
  for (const [k,v,mx,c] of act){
    html += `<div class="ptimer" style="border-color:${c}"><span style="color:${c}">${tr(k+"On")}</span><span class="bar"><i style="width:${(v/mx*100).toFixed(0)}%;background:${c}"></i></span></div>`;
  }
  box.innerHTML = html; }
}
let lastPowerSig = "";
function showZoneBanner(){
  const b = el("zoneBanner");
  el("zoneName").textContent = tr("zone") + " · " + zoneName(zoneIdx);
  b.classList.remove("hidden");
  b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
}

/* ---------------- flow ---------------- */
function startPlay(){
  AU.init();
  resetRun();
  readyT = 2.2; state = S.READY;
  hideAllScreens(); el("hud").classList.remove("hidden");
  loopStart(); AU.musicStart();
  sendEvent("play", 1);
}
function pauseGame(){ if (state !== S.PLAY && state !== S.READY) return; state = S.PAUSE; loopStop(); AU.musicStop();
  try { el("pauseScore").textContent = Math.floor(score) + " · " + Math.floor(dist) + " м"; } catch(e){}
  showScreen("pause"); AU.play("pause" in SFX ? "pause" : "back", .5); }
function resumeGame(){ if (state !== S.PAUSE) return; state = S.PLAY; lastFrame = performance.now();
  loopStart(); hideAllScreens(); el("hud").classList.remove("hidden"); AU.musicStart(); }
function toMenu(){
  state = S.MENU; loopStop(); AU.musicStop();
  el("hud").classList.add("hidden");
  showScreen("menu"); refreshMenu();
}
function showGameOver(isRec){
  el("goScore").textContent = Math.floor(score);
  el("goDist").textContent = Math.floor(dist) + " м";
  el("goCoins").textContent = runCoins;
  el("goRescued").textContent = runRescued;
  el("goBest").textContent = save.best;
  el("goRecord").classList.toggle("hidden", !isRec);
  const rb = el("reviveBtn");
  rb.style.display = reviveUsed ? "none" : "flex";
  const db = el("doubleBtn");
  db.style.display = runCoins > 0 && !doubledThisRun ? "flex" : "none";
  const done = missionsJustDone();
  const cc = crewReady() ? crewNextClaim() : -1;
  el("goMission").textContent = (done ? tr("missionDone") + " · " + tr("claimAll") : "") +
    (cc >= 0 ? (done ? " · " : "") + tr("goal_crew") : "");
  el("hud").classList.add("hidden");
  showScreen("gameover");
  save.seenAds = (save.seenAds||0) + 1; save.interRuns = (save.interRuns||0) + 1;
  refreshMenu(); coachTips();
  // interstitial only between screens: after a finished expedition/tier, or every 3rd run
  if (save.pendingInter) maybeInterstitial(save.pendingInter);
  else if (save.interRuns >= INTER_RUNS) maybeInterstitial("over");
}

/* ---------------- input ---------------- */
function flap(){
  if (state === S.PLAY || state === S.READY){
    player.vy = THRUST * player.thrustMul;
    AU.play("flap", .35);
    for (let i=0;i<4;i++) parts.push({ x:player.x - player.w*0.4, y:player.y + R(-6,6),
      vx:R(-160,-60), vy:R(-40,40), life:R(0.15,0.3), max:0.3, size:R(2,4), color:"#8fd8ff", glow:false });
  }
}
canvas.addEventListener("pointerdown", e => { e.preventDefault(); AU.init(); AU.musicStart(); flap(); }, { passive:false });
canvas.addEventListener("touchstart", e => { e.preventDefault(); }, { passive:false });
/* открыт любой служебный экран (станция, экспедиции, магазин, ангар...) —
   там пробел/стрелки не должны начинать забег: иначе «Экспедиции» -> сразу «попытка 1» */
function overlayOpen(){
  return screens.some(s => { const n = el(s);
    return n && !n.classList.contains("hidden") && s !== "menu" && s !== "gameover"; });
}
function closeOverlay(){
  for (const id of ["station","expedition","store","shop","missions","daily","leaderboard","settings","howto"]){
    const n = el(id); if (n && !n.classList.contains("hidden")){
      const b = el(id + "CloseBtn") || el(id.replace("expedition","exp") + "CloseBtn");
      AU.play("back",.5);
      if (b) b.click(); else { showScreen("menu"); refreshMenu(); }
      return true;
    }
  }
  return false;
}
window.addEventListener("keydown", e => {
  if (e.code === "Escape" || e.code === "KeyP"){
    if (state === S.PLAY) pauseGame();
    else if (state === S.PAUSE) resumeGame();
    else if (state === S.MENU || state === S.OVER) closeOverlay();
    return;
  }
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW"){
    e.preventDefault(); AU.init();
    if (overlayOpen()){ const a = document.activeElement;
      if (a && a.blur) a.blur(); return; }              // на экране цеха/магазина — не стартуем
    if (state === S.MENU) { AU.musicStart(); startPlay(); }
    else if (state === S.OVER) startPlay();
    else flap();
  }
});
/* п.1.3: при потере фокуса звук игры останавливается, забег уходит в паузу */
function onFocusLost(){ if (state === S.PLAY || state === S.READY) pauseGame(); else AU.suspendAll(); }
function onFocusGain(){ if (state !== S.PAUSE) AU.resumeMusic(); }
document.addEventListener("visibilitychange", ()=>{ if (document.hidden) onFocusLost(); else onFocusGain(); });
window.addEventListener("blur", onFocusLost);
window.addEventListener("focus", onFocusGain);
/* п.1.6.1.8 / 1.6.2.7: лонгтап и выделение не должны открывать контекстное меню */
["contextmenu","selectstart","dragstart"].forEach(ev =>
  document.addEventListener(ev, e => { const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return; e.preventDefault(); }));

/* ---------------- missions ---------------- */
const MISSION_POOL = [
  { t:"crystals", vals:[25,50,80],  rew:[25,40,60], txt:n=> lang==="ru" ? `Собери ${n} кристаллов` : `Collect ${n} crystals` },
  { t:"dist",     vals:[400,900,1500], rew:[30,45,70], txt:n=> lang==="ru" ? `Пролети ${n} м за забег` : `Fly ${n} m in one run` },
  { t:"rescued",  vals:[3,5,8],     rew:[25,40,60], txt:n=> lang==="ru" ? `Спаси ${n} космонавтов` : `Rescue ${n} spacers` },
  { t:"combo",    vals:[3,4,5],     rew:[30,50,80], txt:n=> lang==="ru" ? `Достигни комбо x${n}` : `Reach combo x${n}` },
  { t:"near",     vals:[10,20,35],  rew:[25,40,60], txt:n=> lang==="ru" ? `Сделай ${n} близких проходов` : `Make ${n} near misses` },
  { t:"boosts",   vals:[2,4,6],     rew:[25,40,60], txt:n=> lang==="ru" ? `Возьми ${n} буста` : `Grab ${n} boosts` },
];
function todayKey(){ const d = new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
function seededRand(seed){ let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
function ensureMissions(){
  const key = todayKey();
  if (save.missions && save.missions.date === key && Array.isArray(save.missions.list) && save.missions.list.length === 3) return;
  const seed = key.split("-").reduce((a,b)=>a*31 + parseInt(b,10), 7);
  const rnd = seededRand(seed);
  const pool = MISSION_POOL.slice();
  const list = [];
  for (let i=0;i<3;i++){
    const idx = Math.floor(rnd()*pool.length);
    const m = pool.splice(idx,1)[0];
    const tier = Math.min(2, Math.floor(rnd()*3));
    list.push({ t:m.t, target:m.vals[tier], prog:0, rew:m.rew[tier], done:false, claimed:false });
  }
  save.missions = { date:key, list };
  persist();
}
function applyMissions(){
  ensureMissions(); newlyDone = 0;
  for (const m of save.missions.list){
    if (m.done) continue;
    if (m.t === "dist") m.prog = Math.max(m.prog, Math.floor(dist));
    else if (m.t === "combo") m.prog = Math.max(m.prog, missionDelta.combo);
    else if (m.t === "crystals") m.prog += missionDelta.crystals;
    else if (m.t === "rescued") m.prog += missionDelta.rescued;
    else if (m.t === "near") m.prog += missionDelta.near;
    else if (m.t === "boosts") m.prog += missionDelta.boosts;
    if (m.prog >= m.target && !m.done){ m.done = true; newlyDone += m.rew; }
  }
  // additive counters are consumed, so a second death in the same (revived) run cannot double them
  missionDelta.crystals = missionDelta.rescued = missionDelta.near = missionDelta.boosts = 0;
  persist();
}
let newlyDone = 0;
function missionsJustDone(){ return newlyDone; }
function renderMissions(){
  ensureMissions();
  const box = el("missionList"); box.innerHTML = "";
  for (const m of save.missions.list){
    const def = MISSION_POOL.find(p=>p.t===m.t);
    const row = document.createElement("div");
    row.className = "mission" + (m.done ? " done" : "");
    const pct = clamp(m.prog/m.target*100, 0, 100);
    row.innerHTML = `<div class="mission-top"><span class="mtitle">${def.txt(m.target)}</span><b>${m.claimed ? "✓" : m.prog+"/"+m.target}</b></div>
      <div class="mbar"><i style="width:${pct}%"></i></div>`;
    if (m.done && !m.claimed){
      const b = document.createElement("button");
      b.className = "btn btn-daily"; b.style.marginTop = "8px";
      b.innerHTML = `<img class="ico" src="assets/img/icons/ic_crystal.png" alt=""><span>${tr("claimAll")} +${m.rew}★</span>`;
      b.onclick = ()=>{ m.claimed = true; save.wallet += m.rew; persist(); AU.play("levelup",.6);
        toast("+" + m.rew + "★"); renderMissions(); refreshMenu(); };
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  missionBadge(save.missions.list.filter(m=>m.done && !m.claimed).length);
}

/* ---------------- daily ---------------- */
const DAILY_REWARDS = [10,15,20,30,40,60,100];
function dailyAvailable(){ return save.lastDaily !== todayKey(); }
function renderDaily(){
  const g = el("dailyGrid"); g.innerHTML = "";
  const cur = clamp(save.streak, 0, 6);
  for (let i=0;i<7;i++){
    const d = document.createElement("div");
    d.className = "day" + (i < save.streak ? " got" : (i === cur && dailyAvailable() ? " cur" : ""));
    d.innerHTML = `<span>${i+1}</span><b>${DAILY_REWARDS[i]}★</b>`;
    g.appendChild(d);
  }
  const b = el("dailyClaimBtn");
  b.disabled = !dailyAvailable();
  b.querySelector("span").textContent = dailyAvailable() ? tr("claim") : tr("dailyGot");
}
async function claimDaily(){
  if (!dailyAvailable()) return;
  await showInterstitial();
  const idx = clamp(save.streak, 0, 6);
  const rew = DAILY_REWARDS[idx];
  save.wallet += rew; save.streak = Math.min(7, save.streak + 1); save.lastDaily = todayKey();
  persist(); AU.play("levelup",.7); toast("+" + rew + "★");
  renderDaily(); refreshMenu();
}

/* ---------------- shop ---------------- */
function renderShop(){
  el("shopWallet").textContent = save.wallet;
  const box = el("shipList"); box.innerHTML = "";
  for (const s of SHIPS){
    const owned = shipOwned(s.id);
    const gate = owned ? null : shipGate(s);
    const sel = save.ship === s.id;
    const c = document.createElement("div");
    c.className = "ship-card" + (owned ? " owned" : " locked") + (sel ? " selected" : "");
    c.innerHTML = `<img class="ship-img" src="assets/img/ship/${s.id}.png" alt="">
      <div class="ship-name">${lang==="ru" ? s.name : (s.nameEn || s.name)}</div>
      <div class="ship-tag">${lang==="ru" ? s.tag : (s.tagEn || s.tag)}</div>
      <div class="ship-stats"><span>⚡${(s.thrust*100|0)}</span><span>◈${(s.gem*100|0)}%</span><span>⭕${(s.hit*100|0)}%</span></div>
      ${gate ? `<div class="ship-lock"><svg class="gl"><use href="#g-lock"/></svg>${tr("shipDock")} ${lang==="ru"?gate.ru:gate.en}</div>`
             : `<div class="ship-cost ${owned?"owned":""}">${sel ? "✓ " + tr("equipped") : (owned ? tr("owned") : s.price + "★")}</div>`}`;
    c.onclick = ()=>{
      AU.play("click", .5);
      if (!owned){
        if (gate){ toast(tr("shipDock") + " " + (lang==="ru"?gate.ru:gate.en)); AU.play("back", .5); return; }
        if (save.wallet < s.price){ toast(tr("needCoins")); AU.play("back", .5); return; }
        save.wallet -= s.price; save.ships.push(s.id); AU.play("levelup",.7); toast(tr("unlockedShip"));
      }
      save.ship = s.id; persist(); renderShop(); refreshMenu();
    };
    box.appendChild(c);
  }
}

/* ---------------- leaderboard ---------------- */
async function pushLeaderboard(v){
  if (!sdkPlayer || v <= 0) return;
  const p = sdkPlayer; if (!p) return;
  try {
    if (typeof p.setLeaderboardScore === "function") await p.setLeaderboardScore("cosmoraid", v);
    else if (typeof p.setScore === "function") await p.setScore({ leaderboardName:"cosmoraid", value:v });
  } catch(e){ try { if (typeof p.setScore === "function") await p.setScore(v); } catch(e2){} }
}
function renderLB(entries){
  const box = el("leaderboardList"); box.innerHTML = "";
  entries.forEach((e,i)=>{
    const row = document.createElement("div");
    row.className = "lb-row" + (e.me ? " me" : "");
    const medal = i===0 ? "🥇" : i===1 ? "🥈" : i===2 ? "🥉" : (i+1);
    row.innerHTML = `<span class="lb-rank">${medal}</span><span class="lb-name">${esc(e.name)}</span><span class="lb-score">${e.value}</span>`;
    box.appendChild(row);
  });
}
function esc(t){ return String(t).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
async function openLeaderboard(){
  let list = [];
  if (sdkPlayer){
    try {
      const api = (ysdk && ysdk.leaderboards) || sdkPlayer;
      const res = api && typeof api.getLeaderboardEntries === "function"
        ? await api.getLeaderboardEntries("cosmoraid", { quantityTop:10, includePlayer:true }) : null;
      const ent = res && res.entries ? res.entries : [];
      const myId = (sdkPlayer && sdkPlayer.getUniquePublicInfo) ? ((sdkPlayer.getUniquePublicInfo()||{}).uniqueId || null) : null;
      list = ent.map(e=>({ name: e.player && e.player.publicName ? e.player.publicName : tr("you"),
                           value: Number(e.updateScore != null ? e.updateScore : e.score) || 0,
                           me: !!myId && e.player && e.player.uniqueId === myId }));
    } catch(e){ list = []; }
  }
  if (!list.length){
    const names = lang==="ru" ? ["Астра","Нова","Комета","Луна","Орион","Вега","Рекс","Ирис","Зед"] : ["Astra","Nova","Comet","Luna","Orion","Vega","Rex","Iris","Zed"];
    const base = Math.max(save.best, 30);
    list = names.map((n,i)=>({ name:n, value: Math.max(5, base - i*(7+ (i*3))) }));
    list.push({ name: tr("you"), value: save.best, me:true });
    list.sort((a,b)=> b.value - a.value);
    list = list.slice(0,10);
  }
  renderLB(list);
  const back = state === S.PAUSE ? "pause" : (state === S.OVER ? "gameover" : "menu");
  el("leaderboardCloseBtn").onclick = ()=>{ hideAllScreens(); showScreen(back); if (back==="menu") refreshMenu(); };
  showScreen("leaderboard");
}

/* ---------------- station: income, research, resources ---------------- */
const TECH_ICON = { thruster:"ic_tech", magnet:"ic_magnet", shield:"ic_shield", drill:"ic_drill",
  reactor:"ic_reactor", hull:"ic_hull", lab:"ic_lab", dock:"ic_dock", hangar:"ic_dock",
  fabricator:"ic_station", bench:"ic_bench", core:"ic_core" };
function techIcon(t){ for (const k in TECH_ICON) if (t.id.indexOf(k) === 0) return TECH_ICON[k]; return "ic_tech"; }
const tName = t => lang === "ru" ? t.ru : t.en;
const tDesc = t => lang === "ru" ? t.dru : t.den;
function openStation(){ AU.play("click", .5); renderStation(); showScreen("station"); }
function openExpeditions(){ AU.play("click", .5); renderExpeditions(); showScreen("expedition");
  if (crewReady()) crewFetch(); }

function renderStation(){
  el("stLevel").textContent = tr("lvlShort") + " " + stationLevel();
  el("stRate").textContent = incomePerMin().toFixed(1);
  el("stBar").style.width = (incomePct()*100).toFixed(1) + "%";
  const acc = incomeAccrued();
  el("claimTxt").textContent = acc > 0 ? "+" + acc + "\u2605" : tr("st_wait");
  el("claimBtn").classList.toggle("off", acc <= 0);
  // п.12: rewarded 2x of the bank — an optional speed-up, never a replacement of the loop
  const b2 = el("bank2Btn");
  if (b2){
    b2.classList.toggle("hidden", acc <= 0);
    b2.classList.toggle("off", adLeft("bank") <= 0);
    const sp = b2.querySelector("span"); if (sp) sp.textContent = "2× · " + adLeft("bank");
  }
  // п.13: the UI always shows what works automatically
  const dl = el("droneLine");
  if (dl){
    const on = iapOn("drone");
    dl.classList.toggle("hidden", !on);
    if (on) dl.innerHTML = '<svg class="gl"><use href="#g-drone"/></svg><span>' + esc(tr("drone_line")) +
      '</span><b>' + (limits().drone|0) + "/" + AD_LIMITS.drone + '</b><span class="lbl">' +
      (offWindow()/3600) + " h · " + offRate() + "×</span>";
  }
  const bb = el("buildBox");
  if (save.building){
    const t = techById(save.building.id);
    bb.classList.remove("hidden");
    bb.innerHTML = '<span>' + esc(tName(t)) + '</span><b>' + fmtLeft(researchLeft()) + '</b>';
    if (adLeft("speed") > 0) bb.appendChild(miniBtn("btn-ghost", "ic_tech", tr("ad_speed") + " · " + adLeft("speed"), onAdSpeedBuild));
    if (iapTokens("skips") > 0) bb.appendChild(miniBtn("btn-daily", "ic_core", tr("skip_build") + " · " + iapTokens("skips"), onSkipBuild));
  } else bb.classList.add("hidden");
  renderBotLine();
  renderStationNext();
  const av = availableTechs();
  const tier = av.length ? av[0].t : MAX_TIER + 1;
  el("tierNum").textContent = tier > MAX_TIER ? "\u2713" : String(tier);
  const list = el("techList"); list.innerHTML = "";
  for (const t of TECHS.filter(x => x.t === Math.min(tier, MAX_TIER))){
    const done = hasTech(t.id), busy = !!save.building;
    const c = document.createElement("button");
    c.type = "button";
    c.className = "tech-card" + (done ? " done" : "") + (!done && !tierOpen(t) ? " locked" : "") +
      (!done && !busy && !canResearch(t) ? " cant" : "");
    const res = t.res ? Object.keys(t.res).map(k =>
      '<span class="' + ((save.res[k]||0) >= t.res[k] ? "ok" : "no") + '">' + t.res[k] + " " + esc(resName(k)) + "</span>").join("") : "";
    const side = done ? '<span class="lvl max">\u2713 ' + esc(tr("st_done")) + "</span>"
      : (save.building && save.building.id === t.id) ? '<span class="lvl">' + esc(tr("st_busy")) + "</span>"
      : '<span class="tech-cost"><img class="ico" src="assets/img/icons/ic_crystal.png" alt="">' + t.cost + "</span>";
    c.innerHTML = '<img class="tech-ico" src="assets/img/icons/' + techIcon(t) + '.png" alt="">' +
      '<span class="tech-body"><span class="tech-name">' + esc(tName(t)) + "</span>" +
      '<span class="tech-desc">' + esc(tDesc(t)) + "</span>" +
      (res ? '<span class="tech-res">' + res + "</span>" : "") + "</span>" +
      '<span class="tech-side">' + side + "</span>";
    c.onclick = ()=>{
      AU.play("click", .5);
      if (done) return;
      const r = startResearch(t.id);
      if (!r) return;
      if (r.err === "coins"){ toast(tr("needCoins")); AU.play("back", .5); return; }
      if (r.err === "res"){ toast(tr("needRes")); AU.play("back", .5); return; }
      if (r.err === "busy"){ toast(tr("st_busy2")); AU.play("back", .5); return; }
      if (r.err === "tier"){ toast(tr("st_locked")); AU.play("back", .5); return; }
      AU.play("levelup", .6); renderStation(); refreshMenu();
    };
    list.appendChild(c);
  }
  renderBench();
  renderPrestige();
  const rs = el("resStrip"); rs.innerHTML = "";
  let any = false;
  for (const k in RES){
    const n = save.res[k] || 0; if (!n) continue; any = true;
    const c = document.createElement("span");
    c.className = "res-chip"; c.style.borderColor = resColor(k) + "66";
    c.innerHTML = '<img class="ico" src="assets/img/icons/ic_res_' + k + '.png" alt="">' +
      '<b style="color:' + resColor(k) + '">' + n + "</b><span>" + esc(resName(k)) + "</span>";
    rs.appendChild(c);
  }
  if (!any) rs.innerHTML = '<span class="res-none">' + esc(tr("res_hint")) + "</span>";
}
function claimStation(){
  const a = claimIncome();
  if (a <= 0){ AU.play("back", .5); return; }
  AU.play("levelup", .7); toast("+" + a + "\u2605");
  renderStation(); refreshMenu();
}

/* ---- п.13: пусковой бот — его всегда видно, и ветку выбирает игрок ---- */
function renderBotLine(){
  const bl = el("botLine"); if (!bl) return;
  const on = iapOn("bot") && autoReady();
  bl.classList.toggle("hidden", !on);
  if (!on) return;
  bl.innerHTML = "";
  const head = document.createElement("span");
  head.innerHTML = '<svg class="gl"><use href="#g-bot"/></svg><span>' + esc(tr("bot_line")) + "</span>";
  bl.appendChild(head);
  const cur = document.createElement("b");
  cur.textContent = save.botBranch ? branchName(save.botBranch) : tr("bot_pick");
  bl.appendChild(cur);
  const wrap = document.createElement("span"); wrap.className = "bot-branch";
  for (const k of branchList()){
    const b = document.createElement("button");
    b.type = "button"; b.className = save.botBranch === k ? "on" : "";
    b.textContent = branchName(k);
    b.onclick = ()=>{ AU.play("click",.5); setBotBranch(save.botBranch === k ? null : k); renderStation(); };
    wrap.appendChild(b);
  }
  bl.appendChild(wrap);
}
/* ---- п.16.3: верстак — обмен 3:1, чтобы не было тупика с ресурсами ---- */
function renderBench(){
  const box = el("benchBox"); if (!box) return;
  if (!benchOpen() && !hasTech("fabricator")){ box.classList.add("hidden"); return; }
  box.classList.remove("hidden"); box.innerHTML = "";
  const head = document.createElement("div"); head.className = "bench-head";
  head.innerHTML = '<img class="ico" src="assets/img/icons/ic_bench.png" alt=""><span>' + esc(tr("bench_title")) + "</span>" +
    (benchOpen() ? "<b>" + EXCH_RATIO + " → 1</b>" : '<span class="lbl">' + esc(tr("bench_locked")) + "</span>");
  box.appendChild(head);
  if (!benchOpen()) return;
  const keys = openResKeys(), r = benchRule();
  const row = (kind, sel) => {
    const rw = document.createElement("div"); rw.className = "bench-row";
    const lb = document.createElement("span"); lb.className = "lbl";
    lb.textContent = tr(kind === "src" ? "bench_from" : "bench_to"); rw.appendChild(lb);
    for (const k of keys){
      const b = document.createElement("button");
      b.type = "button"; b.className = "res-chip pick" + (sel === k ? " on" : "");
      b.innerHTML = '<img class="ico" src="assets/img/icons/ic_res_' + k + '.png" alt="">' +
        '<b style="color:' + resColor(k) + '">' + (save.res[k]||0) + "</b>";
      b.onclick = ()=>{ AU.play("click",.5);
        if (kind === "src") setBenchRule(k, r.dst === k ? null : r.dst);
        else setBenchRule(r.src, k === r.src ? null : k);
        renderStation(); };
      rw.appendChild(b);
    }
    return rw;
  };
  box.appendChild(row("src", r.src)); box.appendChild(row("dst", r.dst));
  const act = document.createElement("div"); act.className = "bench-act";
  const go = document.createElement("button");
  go.type = "button"; go.className = "btn btn-daily mini";
  go.innerHTML = '<svg class="gl"><use href="#g-swap"/></svg><span>' + esc(tr("bench_go")) + "</span>";
  go.onclick = onExchange; act.appendChild(go);
  if (iapOn("operator") && autoReady()){
    const lb = document.createElement("span"); lb.className = "lbl";
    const left = operatorLeft();
    lb.textContent = left > 0 ? tr("bench_auto") + " " + fmtLeft(left) : tr("bench_auto_now");
    act.appendChild(lb);
  }
  box.appendChild(act);
}
function onExchange(){
  const r = benchRule();
  const out = exchangeRes(r.src, r.dst);
  if (out.err){
    toast(tr(out.err === "coins" ? "bench_need" : out.err === "pick" ? "bench_pick" : "bench_locked"));
    AU.play("back",.5); return;
  }
  AU.play("levelup",.6);
  toast("3 " + resName(out.from) + " \u2192 1 " + resName(out.to));
  renderStation(); refreshMenu();
}
/* ---- п.15.1: престиж «Пересборка станции» — витрина второго месяца ---- */
let prArm = 0;
function renderPrestige(){
  const bx = el("prestigeBox"); if (!bx) return;
  if (!techAll() && cores() === 0){ bx.classList.add("hidden"); bx.innerHTML = ""; return; }
  bx.classList.remove("hidden");
  const armed = prArm && (Date.now() - prArm) < 8000;
  const cur = prestigeBonus(), nxt = prestigeBonus() + CORE_BONUS;
  bx.innerHTML = '<img class="ico" src="assets/img/icons/ic_core.png" alt="">' +
    '<span class="pr-body"><span class="pr-name">' + esc(tr("pr_title")) + "</span>" +
    '<span class="pr-desc">' + esc(tr("pr_desc")) + "</span>" +
    '<span class="pr-nums"><span class="lbl">' + esc(tr("pr_cores")) + "</span><b>" + cores() + "</b>" +
    '<span class="lbl">' + esc(tr("pr_now")) + "</span><b>\u00d7" + cur.toFixed(2) + "</b>" +
    (techAll() ? '<span class="lbl">' + esc(tr("pr_next")) + '</span><b class="up">\u00d7' + nxt.toFixed(2) + "</b>" : "") +
    "</span></span>" +
    (techAll()
      ? '<button type="button" class="mini ' + (armed ? "btn-daily" : "btn-ghost") + '"><img class="ico" src="assets/img/icons/ic_station.png" alt=""><span>' +
        esc(tr(armed ? "pr_sure" : "pr_go")) + "</span></button>"
      : '<span class="lvl">' + esc(tr("pr_need")) + " \u00b7 " + save.tech.length + "/" + TECHS.length + "</span>");
  const b = bx.querySelector("button");
  if (b) b.onclick = onPrestige;
}
function onPrestige(){
  if (!prestigeReady()){ toast(tr(save.building ? "st_busy2" : "pr_need")); AU.play("back",.5); return; }
  if (!prArm || (Date.now() - prArm) >= 8000){ prArm = Date.now(); AU.play("click",.5); renderPrestige(); return; }
  prArm = 0;
  const r = doPrestige();
  if (r.err){ toast(tr(r.err === "busy" ? "st_busy2" : "st_locked")); AU.play("back",.5); return; }
  AU.play("levelup",.9); toast(tr("pr_done") + " \u00d7" + prestigeBonus().toFixed(2));
  _stSig = ""; _expSig = "";
  renderStation(); refreshMenu();
}
/* ---- п.12: проба сектора — 60 секунд полёта в ещё закрытом секторе ---- */
async function onAdTrial(){
  const off = trialOffer();
  if (off.err){ toast(tr(off.err === "limit" ? "ad_limit" : "trial_none")); AU.play("back",.5); return; }
  if (!await adGate("trial")) return;
  startPlay();
  trial = { z:off.zone, left:TRIAL_SECS };
  HUDLAST.trial = -99; HUDLAST.sector = -1;
  toast(tr("trial_go") + " " + zoneName(off.zone)); AU.play("levelup",.6);
}
/* ---------------- expeditions: pick a route, it runs inside your flights ---------------- */

function renderExpeditions(){
  renderSeason();
  renderCrew();
  const ph = expPhase(), st = el("expState");
  if (ph.phase === "run" && ph.e){
    const e = ph.e, total = e.stages.length, cur = Math.min(save.exped.stage, total);
    st.innerHTML = '<span>' + esc(tName(e)) + '</span><span class="mbar"><i style="width:' +
      (cur/total*100).toFixed(0) + '%"></i></span><b>' + cur + "/" + total + "</b>";
  } else if (ph.phase === "wait"){
    st.innerHTML = '<span>' + esc(tr("exp_wait")) + '</span><b>' + fmtLeft((save.exped.until - Date.now())/1000) + "</b>";
    if (adLeft("dock") > 0) st.appendChild(miniBtn("btn-ghost", "ic_expedition", tr("ad_dock") + " · " + adLeft("dock"), onAdSpeedDock));
    if (iapTokens("cds") > 0) st.appendChild(miniBtn("btn-daily", "ic_core", tr("skip_dock") + " · " + iapTokens("cds"), onSkipDock));
  } else {
    st.innerHTML = '<span>' + esc(tr("exp_ready")) + "</span>";
  }
  const list = el("expList"); list.innerHTML = "";
  for (const e of ALL_ROUTES){
    const lvOk = e.lv <= stationLevel(), once = !e.rep && expDone(e.id);
    const runs = e.sea ? seasonRunLeft(e) : -1;
    const active = save.exped.active === e.id;
    const rew = '<img class="ico" src="assets/img/icons/ic_crystal.png" alt=""><b>' + e.rew.coins + "</b>" +
      Object.keys(e.rew.res).map(k => '<span class="plus">+</span>' +
        '<img class="ico" src="assets/img/icons/ic_res_' + k + '.png" alt="">' +
        '<b style="color:' + resColor(k) + '">' + e.rew.res[k] + "</b>").join("") +
      (e.sea ? '<span class="plus">+</span><img class="ico" src="assets/img/icons/ic_flag.png" alt="">' +
        '<b class="sea-tok">' + e.tok + " " + esc(tr("sea_tok")) + "</b>" +
        (runs >= 0 ? '<span class="lbl lbl-sm">' + runs + " " + esc(tr("sea_runs")) + "</span>" : "") : "");
    const side = active ? '<span class="lvl">' + esc(tr("exp_run")) + "</span>"
      : once ? '<span class="lvl max">\u2713</span>'
      : !lvOk ? '<span class="lvl">' + esc(tr("exp_lv")) + " " + e.lv + "</span>"
      : e.sea && runs <= 0 ? '<span class="lvl">' + esc(tr("sea_none")) + "</span>"
      : '<span class="exp-time">' + esc(tr(e.sea ? "sea_go" : "exp_go")) + "</span>";
    const c = document.createElement("button");
    c.type = "button";
    c.className = "exp-card" + (!lvOk || once ? " locked" : "") + (active ? " active" : "");
    c.innerHTML = '<span class="exp-body"><span class="exp-name">' + esc(tName(e)) +
      (e.sea ? ' <i class="exp-tag">' + esc(tr("sea_tag")) + "</i>" : "") + "</span>" +
      '<span class="exp-desc">' + esc(tr("exp_stages")) + ": " + e.stages.map(x => x + "\u043c").join(" \u2192 ") + "</span>" +
      '<span class="exp-rewards">' + rew + "</span></span>" +
      '<span class="exp-side">' + side + "</span>";
    if (e.rep && !e.sea && iapOn("dispatcher") && autoReady()){
      const t = document.createElement("button");
      t.type = "button"; t.className = "exp-auto" + (save.exped.auto === e.id ? " on" : "");
      t.innerHTML = '<svg class="gl"><use href="#g-bot"/></svg><span>' + esc(tr("exp_auto")) + "</span>";
      t.onclick = ev => { if (ev && ev.stopPropagation) ev.stopPropagation();
        AU.play("click",.5); setAutoRoute(save.exped.auto === e.id ? null : e.id);
        renderExpeditions(); refreshMenu(); };
      const side = c.querySelector(".exp-side"); if (side) side.appendChild(t);
    }
    c.onclick = ()=>{
      AU.play("click", .5);
      if (once) return;
      if (!lvOk){ toast(tr("exp_needlv")); AU.play("back", .5); return; }
      if (e.sea && seasonRunLeft(e) <= 0){ toast(tr("sea_none")); AU.play("back", .5); return; }
      const now = expPhase();
      if (now.phase === "run"){ toast(tr("exp_run2")); AU.play("back", .5); return; }
      if (now.phase === "wait"){ toast(tr("exp_wait2")); AU.play("back", .5); return; }
      if (startExp(e.id)){ AU.play("levelup", .6); toast(tr("exp_started") + " " + tName(e)); renderExpeditions(); refreshMenu(); }
    };
    list.appendChild(c);
  }
}

/* ---- п.15.2: сезон = 30 дней, своя таблица наград за сезонные маршруты ---- */
function seasonRewHtml(rw){
  let h = "";
  if (rw.coins) h += '<img class="ico" src="assets/img/icons/ic_crystal.png" alt=""><b>' + rw.coins + "</b>";
  for (const k in (rw.res||{})) h += '<img class="ico" src="assets/img/icons/ic_res_' + k + '.png" alt="">' +
    '<b style="color:' + resColor(k) + '">' + rw.res[k] + "</b>";
  if (rw.skips) h += '<img class="ico" src="assets/img/icons/ic_core.png" alt=""><b>' + rw.skips + " " + esc(tr("sea_skip")) + "</b>";
  if (rw.boost) h += '<b class="up">+10% ' + esc(tr("sea_boost")) + "</b>";
  return h;
}
function renderSeason(){
  const bx = el("seasonBox"); if (!bx) return;
  if (!SEASON_ROUTES.some(e => e.lv <= stationLevel())){ bx.classList.add("hidden"); bx.innerHTML = ""; return; }
  const s = season();
  bx.classList.remove("hidden");
  bx.innerHTML = '<div class="season-head"><img class="ico" src="assets/img/icons/ic_flag.png" alt="">' +
    '<span class="s-lbl">' + esc(tr("sea_title")) + "</span>" +
    '<b>' + seasonTokens() + '</b><span class="lbl">' + esc(tr("sea_tok")) + "</span>" +
    '<span class="lbl s-left">' + esc(tr("sea_left")) + " " + esc(fmtSeason(seasonLeftMs())) + "</span></div>" +
    '<div class="season-rows"></div>';
  const rows = bx.querySelector(".season-rows");
  SEASON_REWARDS.forEach((r,i)=>{
    const got = s.claimed.indexOf(i) >= 0, can = !got && s.tokens >= r.n;
    const b = document.createElement("button");
    b.type = "button"; b.className = "season-row" + (got ? " done" : "") + (can ? " can" : "");
    b.innerHTML = '<b class="s-need">' + r.n + "</b>" +
      '<span class="s-name">' + esc(lang === "ru" ? r.ru : r.en) + "</span>" +
      '<span class="s-rew">' + seasonRewHtml(r.rew) + "</span>" +
      '<span class="s-act">' + (got ? "\u2713" : can ? esc(tr("claim")) : "") + "</span>";
    b.onclick = ()=>{
      const res = seasonClaim(i);
      if (res.err){ toast(tr(res.err === "done" ? "sea_all" : "ad_limit")); AU.play("back",.5); return; }
      AU.play("levelup",.7); toast(tr("sea_done") + " \u00b7 " + esc(lang === "ru" ? r.ru : r.en));
      _expSig = ""; renderExpeditions(); refreshMenu();
    };
    rows.appendChild(b);
  });
}
/* ---- п.15.3: экипаж — недельный совместный полёт с соседями по лидерборду.
   Соц-графа в Яндекс Играх нет, поэтому «друзья» берутся из лидерборда (реальные игроки),
   а без SDK — из устойчивого локального состава на неделю. Реклама и покупки не ускоряют. ---- */
function renderCrew(){
  const bx = el("crewBox"); if (!bx) return;
  if (!crewReady()){ bx.classList.add("hidden"); bx.innerHTML = ""; return; }
  const c = crew(), dist = crewDist(), top = CREW_GOALS[CREW_GOALS.length-1].m;
  bx.classList.remove("hidden");
  bx.innerHTML = '<div class="crew-head"><img class="ico" src="assets/img/icons/ic_crew.png" alt="">' +
    '<span class="s-lbl">' + esc(tr("crew_title")) + "</span>" +
    '<b>' + Math.round(dist) + '</b><span class="lbl">\u043c / ' + top + '</span>' +
    '<span class="lbl s-left">' + esc(tr("crew_left")) + " " + esc(fmtSeason(crewLeftMs())) + "</span></div>" +
    '<div class="mbar wide"><i style="width:' + Math.min(100, dist/top*100).toFixed(1) + '%"></i></div>' +
    '<div class="crew-mates"></div>' +
    '<div class="crew-note">' + esc(tr("crew_note")) + "</div>" +
    '<div class="season-rows"></div>';
  const mates = bx.querySelector(".crew-mates");
  const you = document.createElement("span");
  you.className = "crew-mate you";
  you.innerHTML = '<b>' + esc(tr("crew_you")) + '</b><i>' + (c.mine|0) + ' \u043c</i>' +
    '<span class="lbl">' + esc(tr("crew_day")) + " " + (c.dayDist|0) + "/" + CREW_DAY_CAP + "</span>";
  mates.appendChild(you);
  crewRoster().forEach(n=>{
    const m = document.createElement("span");
    m.className = "crew-mate";
    m.innerHTML = '<b>' + esc(n) + '</b><i>' + Math.round(crewMateDist(n)) + ' \u043c</i>';
    mates.appendChild(m);
  });
  const rows = bx.querySelector(".season-rows");
  CREW_GOALS.forEach((g,i)=>{
    const got = c.claimed.indexOf(i) >= 0, can = !got && dist >= g.m;
    const b = document.createElement("button");
    b.type = "button"; b.className = "season-row" + (got ? " done" : "") + (can ? " can" : "");
    b.innerHTML = '<b class="s-need">' + (g.m/1000).toFixed(g.m % 1000 ? 1 : 0) + "\u043a</b>" +
      '<span class="s-name">' + esc(tr("crew_goal")) + " " + (i+1) + "</span>" +
      '<span class="s-rew">' + seasonRewHtml(crewReward(i)) + "</span>" +
      '<span class="s-act">' + (got ? "\u2713" : can ? esc(tr("claim")) : "") + "</span>";
    b.onclick = ()=>{
      const r = crewClaim(i);
      if (r.err){ toast(tr(r.err === "done" ? "sea_all" : "ad_limit")); AU.play("back",.5); return; }
      AU.play("levelup",.7); toast(tr("crew_done"));
      _expSig = ""; renderExpeditions(); refreshMenu();
    };
    rows.appendChild(b);
  });
}
/* one roster per week: real players from the leaderboard, nobody is invented by the game */
async function crewFetch(){
  const c = crew();
  if (c.fetched === c.id) return;
  c.fetched = c.id;
  const api = (ysdk && ysdk.leaderboards) || sdkPlayer;
  if (!api || typeof api.getLeaderboardEntries !== "function"){ persist(); return; }
  try {
    const res = await api.getLeaderboardEntries("cosmoraid", { quantityTop:20, includePlayer:true });
    const ent = res && Array.isArray(res.entries) ? res.entries : [];
    if (crewSetRoster(ent.map(e => e && e.player && e.player.displayName))) persist();
  } catch(e){}
  persist();
}
/* small action buttons inside the station / dock panels */
function miniBtn(cls, icon, label, fn){
  const b = document.createElement("button");
  b.type = "button"; b.className = "mini " + cls;
  b.innerHTML = '<img class="ico" src="assets/img/icons/' + icon + '.png" alt=""><span>' + esc(label) + "</span>";
  b.onclick = fn; return b;
}
async function adGate(kind){
  if (adLeft(kind) <= 0){ toast(tr("ad_limit")); AU.play("back",.5); return false; }
  const ok = await rewarded();
  if (!ok){ toast(tr("ad_fail")); AU.play("back",.5); return false; }
  return true;
}
async function onAdSpeedBuild(){ if (!await adGate("speed")) return; const r = speedBuild();
  if (r.err){ toast(tr(r.err === "limit" ? "ad_limit" : "ad_fail")); return; }
  AU.play("levelup",.6); toast(tr("ad_done") + " −" + fmtLeft(r.cut)); renderStation(); refreshMenu(); }
async function onAdSpeedDock(){ if (!await adGate("dock")) return; const r = speedDock();
  if (r.err){ toast(tr(r.err === "limit" ? "ad_limit" : "ad_fail")); return; }
  AU.play("levelup",.6); toast(tr("ad_done") + " −" + fmtLeft(r.cut)); renderExpeditions(); refreshMenu(); }
async function onAdBank2(){ if (!await adGate("bank")) return; const r = bankDouble();
  if (r.err){ toast(tr(r.err === "limit" ? "ad_limit" : "ad_fail")); return; }
  AU.play("levelup",.7); toast("+" + r.got + "\u2605"); renderStation(); refreshMenu(); }
async function onAdCrate(){ if (!await adGate("crate")) return; const r = openCrate();
  if (r.err){ toast(tr(r.err === "limit" ? "ad_limit" : "ad_fail")); return; }
  AU.play("levelup",.7); toast("+" + r.n + " " + resName(r.res)); renderStore(); renderDaily(); refreshMenu(); }
function onSkipBuild(){ const r = useSkip();
  if (r.err){ toast(tr(r.err === "token" ? "skip_none" : "ad_fail")); AU.play("back",.5); return; }
  tickResearch(true); AU.play("levelup",.8); renderStation(); refreshMenu(); }
function onSkipDock(){ const r = useDockSkip();
  if (r.err){ toast(tr(r.err === "token" ? "skip_none" : "ad_fail")); AU.play("back",.5); return; }
  AU.play("levelup",.7); toast(tr("ad_done")); renderExpeditions(); refreshMenu(); }
/* п.16.2: the station always shows the next visible goal, with tier progress */
function renderStationNext(){
  const nx = el("stNext"); if (!nx) return;
  const tp = tierProgress(), nu = nextUnlock();
  const bits = [];
  if (nu.sector) bits.push(tr("next_sector") + " \u00ab" + (lang==="ru" ? nu.sector.name : nu.sector.en) + "\u00bb \u00b7 " + tr("next_res") + " " + resName(nu.sector.res));
  if (nu.ship) bits.push((lang==="ru" ? tName(nu.ship) : nu.ship.en) + " \u2192 " + (shipById(nu.ship.ship) || {}).name);
  nx.classList.remove("hidden");
  nx.innerHTML = '<svg class="gl"><use href="#g-flag"/></svg><span class="ng-lbl">' + esc(tr("next_tier")) + "</span>" +
    (tp.tier > MAX_TIER ? '<b class="ng-max">' + esc(techAll() ? tr("goal_prestige") : tr("next_none")) + "</b>"
      : '<b>' + esc(tr("tier")) + " " + tp.tier + '</b><span class="ng-prog">' + tp.done + " / " + tp.total + "</span>" +
        (bits.length ? '<span class="ng-bits">' + esc(bits.join(" \u00b7 ")) + "</span>" : ""));
}
/* п.12-13: one screen for rewarded speed-ups and real-money automation */
function openStore(){ AU.play("click", .5); renderStore(); showScreen("store"); }
function storeSig(){ return [lang, hasPayments(), adLeft("speed"), adLeft("dock"), adLeft("bank"), adLeft("crate"),
  adLeft("trial"), iapTokens("skips"), iapTokens("cds"), iapOn("drone"), iapOn("noAds"), iapOn("bot"),
  iapOn("operator"), iapOn("dispatcher"), iapOn("pass"), iapOn("starter"), autoReady()?1:0,
  save.building?1:0, expPhase().phase].join("|"); }
/* п.1.13.2/1.13.4: цифра цены + иконка портальной валюты из каталога SDK */
function priceSide(it){
  const p = (typeof iapPriceLabel === "function") ? iapPriceLabel(it.id) : null;
  const cur = p && p.img ? '<img class="cur-ico" src="' + p.img + '" alt="">' : "";
  const price = p && p.text ? esc(p.text) : esc(tr("iap_buy"));
  const stock = (it.once || iapTokens(it.kind) <= 0) ? ""
    : '<span class="lbl">' + esc(tr("iap_" + it.kind + "N")) + " " + iapTokens(it.kind) + "</span>";
  return '<span class="tech-cost price">' + cur + price + "</span>" + stock;
}
function renderStore(){
  const ad = el("adList"); ad.innerHTML = "";
  const rows = [
    ["speed", "ic_tech",       "ad_speed", "ad_speedD", onAdSpeedBuild, !save.building],
    ["dock",  "ic_expedition", "ad_dock",  "ad_dockD",  onAdSpeedDock,  expPhase().phase !== "wait"],
    ["bank",  "ic_crystal",    "ad_bank",  "ad_bankD",  onAdBank2,      incomeAccrued() <= 0],
    ["crate", "ic_crate",      "ad_crate", "ad_crateD", onAdCrate,      false],
    ["trial", "ic_sector",     "ad_trial", "ad_trialD", onAdTrial,      false],
  ];
  for (const [kind, icon, kt, kd, fn, dim] of rows){
    const left = adLeft(kind);
    const c = document.createElement("button");
    c.type = "button"; c.className = "iap-card" + (left <= 0 ? " locked" : "") + (dim ? " dim" : "");
    c.innerHTML = '<img class="tech-ico" src="assets/img/icons/' + icon + '.png" alt="">' +
      '<span class="exp-body"><span class="exp-name">' + esc(tr(kt)) + '</span>' +
      '<span class="exp-desc">' + esc(tr(kd)) + "</span></span>" +
      '<span class="exp-side"><span class="adtag">' + esc(tr("ad_go")) + "</span>" +
      '<span class="exp-time">' + esc(tr("ad_left")) + " " + left + "/" + AD_LIMITS[kind] + "</span></span>";
    c.onclick = fn; ad.appendChild(c);
  }
  const list = el("iapList"); list.innerHTML = "";
  const IAP_ICON = { drone:"ic_magnet", noads:"ic_shield", skips:"ic_core", cds:"ic_core",
    bot:"ic_bot", operator:"ic_operator", dispatcher:"ic_dispatcher", pass:"ic_pass", starter:"ic_crate" };
  const AUTO_KIND = ["drone","bot","operator","dispatcher"];
  for (const it of IAPS){
    const owned = it.once && iapOn(it.kind);
    // п.13: автоматика открывается только после Фабрикатора — сначала весь цикл проходит руками
    const gated = AUTO_KIND.indexOf(it.kind) >= 0 && !autoReady();
    const c = document.createElement("button");
    c.type = "button"; c.className = "iap-card" + (owned ? " done" : "") + (gated ? " gate" : "");
    const side = owned ? '<span class="lvl max">\u2713 ' + esc(tr("iap_have")) + "</span>"
      : gated ? '<span class="gate-lbl">' + esc(tr("auto_gate")) + "</span>"
      : priceSide(it);
    c.innerHTML = '<img class="tech-ico" src="assets/img/icons/' + (IAP_ICON[it.kind] || "ic_core") + '.png" alt="">' +
      '<span class="exp-body"><span class="exp-name">' + esc(lang==="ru"?it.ru:it.en) + "</span>" +
      '<span class="exp-desc">' + esc(lang==="ru"?it.dru:it.den) + "</span></span>" +
      '<span class="exp-side">' + side + "</span>";
    c.onclick = async ()=>{
      AU.play("click", .5);
      if (owned) return;
      if (gated){ toast(tr("auto_gate")); AU.play("back",.5); return; }
      if (!hasPayments()){ toast(tr("pay_off")); AU.play("back",.5); return; }
      const r = await buyProduct(it.id);
      if (r && r.err){ toast(tr("buy_fail")); AU.play("back",.5); return; }
      // п.1.13.1: сначала начислили и сохранили, потом консумируем расходуемый товар
      await grantAndConsume(it.id, r && r.token); AU.play("levelup",.8); toast(tr("bought"));
      renderStore(); renderStation(); renderExpeditions(); refreshMenu();
    };
    list.appendChild(c);
  }
  el("iapNote").textContent = hasPayments() ? "" : tr("iap_note");
  el("iapNote").classList.toggle("hidden", hasPayments());
}
/* п.16.2 / ОСТАЛОСЬ 3: the menu always names the nearest goal and opens it in one tap */
function renderNextHint(){
  const n = el("nextHint"); if (!n) return;
  const g = nextGoal();
  n.classList.remove("hidden");
  n.innerHTML = '<img class="ico" src="assets/img/icons/' + g.icon + '.png" alt="">' +
    '<span class="nh-lbl">' + esc(tr("next_label")) + "</span>" +
    '<span class="nh-txt">' + esc(g.txt) + "</span>" +
    (g.sub ? '<b class="nh-sub">' + esc(g.sub) + "</b>" : "");
  if (g.screen){
    const b = document.createElement("button");
    b.type = "button"; b.className = "nh-go"; b.textContent = tr("open");
    b.onclick = ()=>{ AU.play("click",.5);
      g.screen === "station" ? openStation() : g.screen === "expedition" ? openExpeditions() : openStore(); };
    n.appendChild(b);
  }
}
/* the first three minutes: the game says what to do next (ОСТАЛОСЬ 3) */
function coachTips(){
  const c = save.coach|0;
  if (c === 0 && save.stats.runs >= 1 && !save.tech.length && !save.building){ toast(tr("coach1")); save.coach = 1; }
  else if (c === 1 && save.tech.length && expPhase().phase === "ready" && availableExps().length){ toast(tr("coach2")); save.coach = 2; }
  else if (c === 2 && incomePct() > 0.95){ toast(tr("coach3")); save.coach = 3; }
  persist();
}
function missionBadge(n){
  const b = el("missionBadge"); if (!b) return;
  b.classList.toggle("hidden", n <= 0); b.textContent = n > 0 ? String(n) : "";
}
/* ---------------- menu badges: always show where there is something to do ---------------- */
function updateBadges(){
  const sb = el("stationBadge"), eb = el("expBadge");
  if (sb){
    const ready = incomeAccrued() > 0 || prestigeReady() ||
      (!save.building && availableTechs().some(t => canResearch(t)));
    sb.classList.toggle("hidden", !ready); sb.textContent = ready ? "!" : "";
  }
  if (eb){
    const ready = (expPhase().phase === "ready" && availableExps().length > 0) ||
      seasonNextClaim() >= 0 || crewNextClaim() >= 0;
    eb.classList.toggle("hidden", !ready); eb.textContent = ready ? "!" : "";
  }
}
/* research and income keep ticking while the player is in menus or between runs */
/* research and income keep ticking while the player is in menus or between runs.
   Cards are rebuilt ONLY when the state really changed; the 1 s tick rewrites just
   the countdowns, so the panels never rebuild the whole card list. */
let _stSig = "", _expSig = "", _storeSig = "";
function stationSig(){ return [lang, stationLevel(), save.tech.join(","), save.building ? save.building.id : "",
  save.wallet, JSON.stringify(save.res), incomeAccrued(), (incomePct()*100).toFixed(0),
  iapTokens("skips"), iapOn("drone"), iapOn("bot"), iapOn("operator"), save.botBranch,
  JSON.stringify(save.bench), adLeft("speed"), adLeft("bank"), cores(), techAll(), prArm].join("|"); }
function expSig(){ const s = season(); return [lang, stationLevel(), save.exped.active, save.exped.stage, save.exped.done.join(","),
  save.exped.until, save.exped.auto, iapTokens("cds"), adLeft("dock"), iapOn("dispatcher"), save.wallet,
  s.id, s.tokens, s.claimed.join(","), JSON.stringify(s.runs), s.boost,
  crewReady(), crew().id, crew().mine, crew().claimed.join(","), crewRoster().join(",")].join("|"); }
function tickStationTimers(){
  if (save.building){ const b = el("buildBox").querySelector("b"); if (b) b.textContent = fmtLeft(researchLeft()); }
  el("stBar").style.width = (incomePct()*100).toFixed(1) + "%";
  const acc = incomeAccrued();
  el("claimTxt").textContent = acc > 0 ? "+" + acc + "\u2605" : tr("st_wait");
  el("claimBtn").classList.toggle("off", acc <= 0);
}
function tickExpTimers(){
  if (expPhase().phase === "wait"){ const b = el("expState").querySelector("b");
    if (b) b.textContent = fmtLeft((save.exped.until - Date.now())/1000); }
  const sl = el("seasonBox") && el("seasonBox").querySelector(".s-left");
  if (sl) sl.textContent = tr("sea_left") + " " + fmtSeason(seasonLeftMs());
  const cb = el("crewBox");
  if (cb && !cb.classList.contains("hidden")){
    const cl = cb.querySelector(".s-left");
    if (cl) cl.textContent = tr("crew_left") + " " + fmtSeason(crewLeftMs());
    const bar = cb.querySelector(".mbar > i"), top = CREW_GOALS[CREW_GOALS.length-1].m;
    if (bar) bar.style.width = Math.min(100, crewDist()/top*100).toFixed(1) + "%";
    const hv = cb.querySelector(".crew-head b");
    if (hv) hv.textContent = String(Math.round(crewDist()));
  }
}
setInterval(()=>{
  const done = tickResearch(true);
  if (done){ toast(tr("st_newtier")); refreshMenu(); }
  const stOpen = !el("station").classList.contains("hidden");
  const exOpen = !el("expedition").classList.contains("hidden");
  if (stOpen){ const sig = stationSig(); if (sig !== _stSig){ _stSig = sig; renderStation(); } else tickStationTimers(); }
  else _stSig = "";
  if (exOpen){ const sig = expSig(); if (sig !== _expSig){ _expSig = sig; renderExpeditions(); } else tickExpTimers(); }
  else _expSig = "";
  if (!el("store").classList.contains("hidden")){ const sig = storeSig(); if (sig !== _storeSig){ _storeSig = sig; renderStore(); } }
  else _storeSig = "";
  const got = droneTick();
  if (got > 0){ toast((lang==="ru"?"\u0414\u0440\u043e\u043d \u0441\u043e\u0431\u0440\u0430\u043b \u043a\u043e\u043f\u0438\u043b\u043a\u0443: ":"Drone collected: ") + "+" + got + "\u2605"); refreshMenu(); }
  // п.13: автоматика работает сама, но в UI всегда видно, что именно и когда
  if (operatorTick() > 0){ const r = benchRule();
    toast(tr("bench_title") + ": 3 " + resName(r.src) + " \u2192 1 " + resName(r.dst)); refreshMenu(); }
  if (dispatcherTick() > 0){ const e = curExp();
    if (e) toast(tr("exp_started") + " " + (lang==="ru"?e.ru:e.en) + " \u00b7 " + tr("exp_auto")); refreshMenu(); }
  if (botTick() > 0 && save.building){ const t = techById(save.building.id);
    if (t) toast(tr("goal_research") + " " + (lang==="ru"?t.ru:t.en) + " \u00b7 " + tr("bot_line")); refreshMenu(); }
  updateBadges();
}, 1000);

/* ---------------- menu refresh / i18n ---------------- */
function refreshMenu(){
  el("menuBest").textContent = save.best;
  el("menuLevel").textContent = stationLevel();
  updateBadges();
  el("menuCoins").textContent = save.wallet;
  ensureMissions();
  missionBadge(save.missions.list.filter(m=>m.done && !m.claimed).length);
  const mm = el("menuMissions");
  if (mm) mm.textContent = save.missions.list.filter(m=>m.done && !m.claimed).length + "/" + save.missions.list.length;
  el("previewShip").src = "assets/img/ship/" + save.ship + ".png";
  renderNextHint();
  const db = el("dailyBtn");
  db.style.opacity = dailyAvailable() ? "1" : ".55";
  const t = el("menuTotals");
  if (t) t.textContent = (lang==="ru"
      ? `Полётов: ${save.stats.runs} · Кристаллов собрано: ${save.stats.crystals} · Спасено: ${save.stats.rescued}`
      : `Runs: ${save.stats.runs} · Crystals: ${save.stats.crystals} · Rescued: ${save.stats.rescued}`);
}
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(n=>{
    const k = n.getAttribute("data-i18n");
    const t = tr(k);
    if (t) n.textContent = t;
  });
  el("musicToggleBtn").querySelector("span").textContent = tr("music") + ": " + (save.musicOn ? tr("on") : tr("off"));
  el("sfxToggleBtn").querySelector("span").textContent = tr("sfx") + ": " + (save.sfxOn ? tr("on") : tr("off"));
  setGlyph(el("musicToggleBtn"), save.musicOn ? "g-sound" : "g-mute");
  setGlyph(el("sfxToggleBtn"), save.sfxOn ? "g-sound" : "g-mute");
  renderNextHint();
  refreshMenu();
  if (!el("missions").classList.contains("hidden")) renderMissions();
  if (!el("shop").classList.contains("hidden")) renderShop();
  if (!el("station").classList.contains("hidden")) renderStation();
  if (!el("expedition").classList.contains("hidden")) renderExpeditions();
  if (!el("daily").classList.contains("hidden")) renderDaily();
}

/* ---------------- buttons ---------------- */
function bindUI(){
  el("playBtn").onclick = ()=>{ AU.init(); AU.play("select",.6); startPlay(); };
  el("howBtn").onclick = ()=>{ AU.play("click",.5); showScreen("howto"); };
  el("howCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); };
  el("howBackBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); };
  el("shopBtn").onclick = ()=>{ AU.play("click",.5); renderShop(); showScreen("shop"); };
  el("shopCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); };
  el("stationBtn").onclick = openStation;
  el("stationCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); refreshMenu(); };
  el("claimBtn").onclick = claimStation;
  el("bank2Btn").onclick = onAdBank2;
  el("storeBtn").onclick = openStore;
  el("storeCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); refreshMenu(); };
  el("expBtn").onclick = openExpeditions;
  el("expCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); refreshMenu(); };
  el("missionsBtn").onclick = ()=>{ AU.play("click",.5); renderMissions(); showScreen("missions"); };
  el("missionsCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); };
  el("dailyBtn").onclick = ()=>{ AU.play("click",.5); renderDaily(); showScreen("daily"); };
  el("dailyCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); };
  el("dailyClaimBtn").onclick = claimDaily;
  el("leaderboardBtn").onclick = ()=>{ AU.play("click",.5); openLeaderboard(); };
  el("settingsBtn").onclick = ()=>{ AU.play("click",.5); showScreen("settings"); };
  el("settingsCloseBtn").onclick = ()=>{ AU.play("back",.5); showScreen("menu"); };
  el("musicToggleBtn").onclick = ()=>{ save.musicOn = !save.musicOn; persist(); applyLang(); AU.init();
    if (save.musicOn) AU.musicStart(); else AU.musicStop(); AU.play("toggle",.5); };
  el("sfxToggleBtn").onclick = ()=>{ save.sfxOn = !save.sfxOn; persist(); applyLang(); AU.play("toggle",.5); };
  el("langBtn").onclick = ()=>{ lang = lang === "ru" ? "en" : "ru"; save.lang = lang; persist(); applyLang(); AU.play("click",.5); };
  el("resetBtn").onclick = async ()=>{
    if (!confirm(lang==="ru" ? "Сбросить весь прогресс?" : "Reset all progress?")) return;
    localStorage.removeItem(KEY); save = Object.assign({}, DEF);
    save.ships = ["craft_racer"]; save.ship = "craft_racer";
    save.tech = []; save.building = null; save.res = {}; save.trophies = 0;
    save.exped = { done:[], stage:0, active:null, until:0 };
    save.missions = null; save.lastDaily = 0; save.streak = 0; save.offlineS = 0;
  save.iap = Object.assign({}, DEF.iap); save.limits = null; save.lastInter = 0;
  save.bench = Object.assign({}, DEF.bench); save.botBranch = null; save.exped.auto = null;
  save.interRuns = 0; save.pendingInter = null; save.coach = 0;
  save.cores = 0; save.season = null; save.crew = null; prArm = 0;
    persist(); applyLang(); toast(tr("resetDone"));
  };
  el("pauseBtn").onclick = ()=>{ AU.play("click",.5); pauseGame(); };
  el("resumeBtn").onclick = ()=>{ AU.play("select",.6); resumeGame(); };
  el("pauseMenuBtn").onclick = ()=>{ AU.play("back",.5); toMenu(); };
  el("pauseLeaderboardBtn").onclick = ()=>{ AU.play("click",.5); openLeaderboard(); };
  el("retryBtn").onclick = ()=>{ AU.play("select",.6); startPlay(); };
  el("menuBtn").onclick = ()=>{ AU.play("back",.5); toMenu(); };
  el("overLeaderboardBtn").onclick = ()=>{ AU.play("click",.5); openLeaderboard(); };
  el("reviveBtn").onclick = async ()=>{
    if (reviveUsed) return;
    const ok = await rewarded();
    if (!ok){ toast(lang==="ru" ? "Реклама недоступна" : "Ad unavailable"); return; }
    reviveUsed = true; doubledThisRun = false;
    // clear nearby hazards, restore a shield, resume
    obstacles = obstacles.filter(o => o.x > player.x + 220 || o.x < player.x - 120);
    player.shield = Math.max(player.shield, 1);
    player.y = H*0.5; player.vy = 0; invuln = 2.0;
    state = S.PLAY; lastFrame = performance.now();
    hideAllScreens(); el("hud").classList.remove("hidden"); loopStart(); AU.musicStart();
    toast(tr("revived")); AU.play("powerup",.7);
  };
  el("doubleBtn").onclick = async ()=>{
    if (doubledThisRun || runCoins <= 0) return;
    const ok = await rewarded();
    if (!ok) return;
    doubledThisRun = true;
    save.wallet += runCoins; runCoins *= 2;
    persist(); el("goCoins").textContent = runCoins;
    toast(tr("doubled")); AU.play("levelup",.7);
    el("doubleBtn").style.display = "none";
  };
}

/* ---------------- boot ---------------- */
(async function boot(){
  loadLocal();
  lang = save.lang || (detectLang() ? "ru" : "en");
  await Promise.all(LOADERS);
  await initSDK();
  await loadCloud();
  try { await restorePurchases(); } catch(e){}
  try { await loadCatalog(); } catch(e){}
  if (save.lang) lang = save.lang;
  ensureMissions();
  bootIncome();
  if (save.pendingTech){ save.pendingTech = false; toast(lang==="ru"?"Технология достроена, пока вас не было!":"Your tech finished while you were away!"); }
  bindUI();
  applyLang();
  player.ship = shipById(save.ship);
  resetRun();
  state = S.MENU;
  el("loading").classList.add("gone");
  loadingReady();
  requestAnimationFrame(frame);
})();
function detectLang(){
  try { const n = (navigator.language || "en").toLowerCase(); return n.indexOf("ru") === 0; } catch(e){ return true; }
}

