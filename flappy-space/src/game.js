/* FLAPPY COSMOS — canvas, состояние, спавн, физика, отрисовка, игровой цикл
   Art: Kenney (CC0) space kits · Sound: Kenney + "ObservingTheStar" (CC0)
   Порядок подключения: i18n → sdk → save → audio → assets → meta → game → ui */

/* ---------------- canvas ---------------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 0, H = 0, DPR = 1;
function resize(){
  const raw = window.devicePixelRatio || 1;
  const px = window.innerWidth * window.innerHeight;
  DPR = Math.min(raw, px > 1600000 ? 1.2 : (px > 800000 ? 1.5 : 2));   // GPU saver on big screens
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W*DPR); canvas.height = Math.floor(H*DPR);
  canvas.style.width = W+"px"; canvas.style.height = H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
  buildLayers();
}
/* ---- cached full-screen layers: sky is pre-scaled once, all gradients/vignette baked once ---- */
let OVERLAY = null, SKYCACHE = Object.create(null), skyDW = 0, skyDH = 0;
function buildLayers(){
  SKYCACHE = Object.create(null);
  skyDW = Math.max(900, Math.round(W*1.05)); skyDH = Math.max(1, Math.round(H));
  // vertical-only layers: safe to bake into the scrolling sky strip (the radial vignette lives in CSS)
  const c = document.createElement("canvas");
  c.width = skyDW; c.height = skyDH;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(5,8,20,0.34)"; x.fillRect(0,0,skyDW,skyDH);
  let g = x.createLinearGradient(0,0,0,skyDH*0.35);
  g.addColorStop(0,"rgba(255,255,255,0.05)"); g.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0,0,skyDW,skyDH*0.35);
  g = x.createLinearGradient(0,skyDH*0.4,0,skyDH);
  g.addColorStop(0,"rgba(4,6,16,0)"); g.addColorStop(1,"rgba(4,6,16,0.62)");
  x.fillStyle = g; x.fillRect(0,0,skyDW,skyDH);
  OVERLAY = c;
}
function skyLayer(key){
  const id = key + "@" + skyDW + "x" + skyDH;
  if (SKYCACHE[id] !== undefined) return SKYCACHE[id];
  const src = IMG[key];
  if (!src){ SKYCACHE[id] = null; return null; }
  const c = document.createElement("canvas"); c.width = skyDW; c.height = skyDH;
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0, skyDW, skyDH);
  if (OVERLAY) x.drawImage(OVERLAY, 0, 0);            // darken + gradients baked in: 1 blit per frame
  SKYCACHE[id] = c; return c;
}
/* pre-baked brightness variants of rocks (ctx.filter per draw is a GPU killer) */
const BAKED = Object.create(null);
function baked(key, tint){
  const b = Math.round(clamp(tint, 0.72, 1.24)/0.06)*0.06;
  const id = key + "|" + b.toFixed(2);
  if (BAKED[id] !== undefined) return BAKED[id];
  const src = IMG[key]; if (!src){ BAKED[id] = null; return null; }
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const x = c.getContext("2d"); x.drawImage(src,0,0);
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = b < 1 ? "rgba(0,0,0," + (1-b).toFixed(2) + ")"
                      : "rgba(255,255,255," + Math.min(0.35, b-1).toFixed(2) + ")";
  x.fillRect(0,0,c.width,c.height);
  BAKED[id] = c; return c;
}
let lastSeenTick = 0;
function touchSeen(){
  const now = Date.now();
  if (document.visibilityState !== "visible"){ if (save.lastSeen){ save.lastSeen = now; persist(); } return; }
  if (now - lastSeenTick > 1000){ lastSeenTick = now; save.lastSeen = now; }
}
setInterval(()=>{ touchSeen(); if (Date.now() % 10000 < 1100) persist(); }, 1000);
document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState === "hidden"){ save.lastSeen = Date.now(); persist(); } });
window.addEventListener("pagehide", ()=>{ save.lastSeen = Date.now(); try{ localStorage.setItem(KEY, JSON.stringify(save)); }catch(e){} });
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", ()=>setTimeout(resize, 120));
resize();
const R = (a,b)=> a + Math.random()*(b-a);
const RI = (a,b)=> Math.floor(R(a,b+1));
const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];


/* ---------------- state ---------------- */
const S = { MENU:"menu", READY:"ready", PLAY:"play", PAUSE:"pause", OVER:"over" };
let state = S.MENU;
let obstacles = [], pickups = [], parts = [], floats = [], planets = [], oldPlanets = [], dust = [];
let speed = 0, dist = 0, score = 0, runCoins = 0, runRescued = 0, runNear = 0, runBoosts = 0;
let spawnT = 0, pickT = 0, powerT = 0, flash = 0, deathT = 0;
let combo = 0, comboT = 0, mult = 1, lastMilestone = 0, zoneIdx = 0, prevZone = 0, zoneFade = 0, zoneBannerT = 0;
let readyT = 0, reviveUsed = false, doubledThisRun = false, invuln = 0, bgOff = 0, tNow = 0, wreck = null;
let eventKind = null, eventT = 0, nextEventAt = 420, showerT = 0;
/* п.12: «проба сектора» — 60 с полёта в закрытом секторе, награда — 3 ресурса сектора */
let trial = null;
let missionDelta = { crystals:0, dist:0, rescued:0, combo:0, near:0, boosts:0 };
/* what has already been written to save for THIS run — a revived run must not pay twice */
let committed = { coins:0, dist:0, rescued:0, boosts:0, near:0, runs:0 };

const player = { x:0, y:0, vy:0, w:110, h:44, r:26, angle:0, ship:SHIPS[0], shield:0, magnet:0, boost:0, trail:0,
  thrustMul:1, gravMul:1, gemMul:1, magnetBonus:0, comboTime:3 };

function resetRun(keepProgress){
  obstacles.length = 0; pickups.length = 0; parts.length = 0; floats.length = 0;
  dist = 0; score = 0; runCoins = 0; runRescued = 0; runNear = 0; runBoosts = 0;
  speed = baseSpeed(); spawnT = 0.9; pickT = 0.6; powerT = 9; flash = 0; deathT = 0;
  combo = 0; comboT = 0; mult = 1; lastMilestone = 0; zoneIdx = 0; prevZone = 0; zoneFade = 0;
  trial = null;
  invuln = 1.2; reviveUsed = false; bgOff = 0;
  missionDelta = { crystals:0, dist:0, rescued:0, combo:0, near:0, boosts:0 };
  committed = { coins:0, dist:0, rescued:0, boosts:0, near:0, runs:0 };
  doubledThisRun = false;
  player.ship = shipById(save.ship);
  player.w = clamp(Math.min(W*0.115, H*0.22), 62, 118);
  const sim = IMG[player.ship.id];
  player.h = sim ? Math.round(player.w * sim.height / sim.width) : Math.round(player.w*0.42);
  const tm = techMods();
  player.r = Math.round(player.w * 0.30 * player.ship.hit * tm.hit);
  player.x = Math.max(80, W*0.24); player.y = H*0.5; player.vy = 0; player.angle = 0;
  player.shield = player.ship.shield + tm.shield; player.magnet = 0; player.boost = 0;
  player.thrustMul = player.ship.thrust * tm.thrust;
  player.gravMul = player.ship.grav;
  player.gemMul = player.ship.gem * tm.gem;
  player.magnetBonus = tm.magnet;
  player.comboTime = 3 + tm.combo;
  initBackdrop();
  syncHUD();
}
function baseSpeed(){ return clamp(W*0.20, 170, 240); }
function difficulty(){ return 1 + dist / 1900 + zoneIdx * 0.05; }

/* backdrop layers */
function initBackdrop(keepOld){
  if (keepOld) oldPlanets = planets.slice();      // keep the old set for the cross-dissolve
  planets.length = 0;
  const z = ZONES[zoneIdx % ZONES.length];
  for (let i=0;i<3;i++){
    const pi = z.planets[i % z.planets.length];
    const size = R(0.14, 0.30) * Math.min(W, H*1.5);
    planets.push({ img:"planet"+pi, x:R(0.2,1.2)*W, y:R(-0.1,0.75)*H, s:size, depth:R(0.10,0.26), rot:R(0,6.28), spin:R(-0.02,0.02) });
  }
  dust.length = 0;
  const dn = Math.round(clamp(W*H/22000, 22, 54));
  for (let i=0;i<dn;i++) dust.push({ x:R(0,W), y:R(0,H), z:R(0.25,1), s:R(0.6,2.2), tw:R(0,6.28) });
}

/* ---------------- spawning ----------------
   Every obstacle group is generated around a guaranteed free corridor
   [cy - gh/2, cy + gh/2] so a run is always passable. */
function Hs(){ return clamp(H/600, 0.55, 1.15); }
function corridorHeight(){
  const base = clamp(H*0.46, 165, 300);
  let g = Math.max(168*Hs(), base - (difficulty()-1)*13*Hs());
  if (eventKind) g = Math.max(g, 190*Hs());       // the belt keeps a way through
  return g;
}
function cyRange(gh){ const lo = gh/2 + 24, hi = H - gh/2 - 24;
  return hi > lo ? [lo, hi] : [H*0.5 - 10, H*0.5 + 10]; }
function spawnObstacle(){
  const d = difficulty();
  const gh = corridorHeight();
  const [cyLo, cyHi] = cyRange(gh);
  const cy = R(cyLo, cyHi);
  const k = Hs();
  const x = W + 140;
  const kind = weightedKind();

  if (kind === "arch"){
    // a "barrier" rebuilt out of asteroids: two rows that close the screen except the corridor
    const r0 = R(26, 38)*k, cols = d > 2 ? RI(1,2) : 1;
    for (let c=0;c<cols;c++){
      const cx = x + c*R(36, 54);
      let y = cy - gh/2 - 6;
      for (let i=0;i<14;i++){
        const r = Math.max(13, r0*R(0.72,1.05)*(1 - i*0.05));
        y -= r*0.92; if (y < -r) break;
        obstacles.push(meteorEnt(cx + R(-7,7), y, r, d, 1, 0));
      }
      y = cy + gh/2 + 6;
      for (let i=0;i<14;i++){
        const r = Math.max(13, r0*R(0.72,1.05)*(1 - i*0.05));
        y += r*0.92; if (y > H + r) break;
        obstacles.push(meteorEnt(cx + R(-7,7), y, r, d, 1, 0));
      }
    }
  } else if (kind === "cluster"){
    const above = RI(1,2), below = RI(1,2);
    let y = cy - gh/2 - 12;
    for (let i=0;i<above;i++){
      const r = R(22, 40)*k; y -= r;
      obstacles.push(meteorEnt(x + R(-16,16), y, r, d, 0, (y - cy) * 0.05));
      y -= r*1.55;
      if (y < -r) break;
    }
    y = cy + gh/2 + 12;
    for (let i=0;i<below;i++){
      const r = R(22, 40)*k; y += r;
      obstacles.push(meteorEnt(x + R(-16,16), y, r, d, 0, (y - cy) * 0.05));
      y += r*1.55;
      if (y > H + r) break;
    }
  } else if (kind === "wall"){
    const r = R(28, 46)*k;
    const side = cy > H*0.5 ? -1 : 1;
    const y = clamp(cy + side*(gh/2 + r + 8), r + 10, H - r - 10);
    obstacles.push(meteorEnt(x, y, r, d, 0, 0));
    const r2 = R(24, 36)*k;
    const y2 = clamp(cy - side*(gh/2 + r2 + 8), r2 + 10, H - r2 - 10);
    obstacles.push(meteorEnt(x + R(-18,18), y2, r2, d, 0, 0));
  } else {
    const r = R(22, 40)*k;
    const side = Math.random() < 0.5 ? -1 : 1;
    const y = clamp(cy + side*(gh/2 + r + R(10, 90)), r + 12, H - r - 12);
    obstacles.push(meteorEnt(x, y, r, d, 0, R(-30, 30)));
    if (d > 1.8 && Math.random() < 0.5){
      const r2 = R(18, 30)*k;
      const y2 = clamp(cy - side*(gh/2 + r2 + R(10, 70)), r2 + 12, H - r2 - 12);
      obstacles.push(meteorEnt(x + R(-30, 30), y2, r2, d, 0, R(-30,30)));
    }
  }
  spawnT_last = cy;
}
let spawnT_last = 0;
function startEvent(){
  eventKind = "shower"; eventT = 8; showerT = 0;
  const b = el("zoneBanner");
  el("zoneName").textContent = lang==="ru" ? "⚠ МЕТЕОРНЫЙ ДОЖДЬ" : "⚠ METEOR SHOWER";
  b.classList.remove("hidden"); b.style.animation="none"; void b.offsetWidth; b.style.animation="";
  zoneBannerT = 2.4; AU.play("warning" in SFX ? "warning" : "milestone", .6);
  sendEvent("event_shower", Math.floor(dist));
}
function weightedKind(){
  const d = difficulty();
  if (dist < 150) return pick(["single","single","cluster"]);
  const bag = ["single","single","cluster","cluster","wall","arch"];
  if (d > 1.6) bag.push("cluster","arch","wall");
  if (d > 2.3) bag.push("wall","cluster","arch");
  return pick(bag);
}
function meteorEnt(x, y, r, d, big, vy){
  const imgs = r < 26 ? ["obs_meteor_half","obs_meteor"] : ["obs_meteor","obs_meteor_detailed","obs_meteor"];
  return { t:"rock", x, y, r, img: pick(imgs), tint: R(0.78, 1.12), spin: R(0,6.28), vs: R(-1.4,1.4),
           vy: (vy ?? 0) * Math.min(1.6, d*0.6), near:false, wob:R(0,6.28), y0:y, amp: Math.abs(vy ?? 0) > 0 ? R(10,26) : 0 };
}
function spawnPickups(){
  const gh = corridorHeight();
  const [lo,hi] = cyRange(gh);
  const cy = R(lo,hi);
  const k = Hs();
  const x = W + 110;
  const pat = pick(["arc","line","zig","cluster","single"]);
  const arr = [];
  if (pat === "arc"){ const n = RI(4,6); for (let i=0;i<n;i++) arr.push({ x:x+i*44, y:clamp(cy - Math.sin(i/(n-1)*Math.PI)*Math.min(70, gh*0.35), 40, H-40) }); }
  else if (pat === "line"){ const n = RI(3,5); for (let i=0;i<n;i++) arr.push({ x:x+i*46, y:cy }); }
  else if (pat === "zig"){ const n = RI(4,6); for (let i=0;i<n;i++) arr.push({ x:x+i*44, y:clamp(cy + (i%2? -gh*0.22 : gh*0.22), 40, H-40) }); }
  else if (pat === "cluster"){ for (let i=0;i<4;i++) arr.push({ x:x + (i%2)*40, y:clamp(cy - 20 + Math.floor(i/2)*40, 40, H-40) }); }
  else arr.push({ x, y:cy });
  const chain = { left:arr.length, done:false };
  for (const a of arr) pickups.push({ t:"gem", chain, x:a.x, y:a.y, r:21*k, img: pick(["obs_rock_crystalsLargeA","obs_rock_crystalsLargeB","obs_rock_crystals"]), ph:R(0,6.28), got:false });
}
function spawnPowerup(){
  const kind = pick(["shield","magnet","boost"]);
  const gh = corridorHeight(); const [lo,hi] = cyRange(gh); const k = Hs();
  const x = W + 110, y = R(lo,hi);
  pickups.push({ t:kind, x, y, r:26*k, ph:R(0,6.28), got:false });
}
function spawnRescuer(){
  const img = pick(["char_astronautA","char_astronautB","char_alien"]);
  const gh = corridorHeight(); const [lo,hi] = cyRange(gh);
  pickups.push({ t:"rescue", x:W+110, y:R(lo,hi), r:26*Hs(), img, ph:R(0,6.28), got:false });
}

/* ---------------- update ---------------- */
const GRAV = 980, THRUST = -340;
function update(dt){
  tNow += dt;
  if (state === S.READY){
    readyT -= dt;
    player.y = H*0.5 + Math.sin(tNow*3)*10;
    player.angle = Math.sin(tNow*3)*0.06;
    engineTrail(dt, 0.5);
    if (readyT <= 0){ state = S.PLAY; }
    updateParts(dt);
    return;
  }
  if (state !== S.PLAY) { updateParts(dt); return; }

  const d = difficulty();
  const boostMul = player.boost > 0 ? 1.35 : 1;
  speed = Math.min(clamp(W*0.62, 380, 560), speed + 4.6*dt);
  const vx = speed * boostMul;
  dist += vx*dt*0.06;
  score += vx*dt*0.06*1.0;
  bgOff += vx*dt;

  // zones
  const seq = sectorSeq();
  let zi;
  if (trial){
    trial.left -= dt;
    if (trial.left <= 0){                       // trial over: pay out and go back to the open loop
      const g = trialReward(trial.z); trial = null;
      toast((lang==="ru" ? "Проба сектора: +" : "Sector trial: +") + g.n + " " + resName(g.res));
      floats.push({ x:player.x+120, y:player.y-100, text:"+"+g.n+" "+resName(g.res),
                    color:resColor(g.res), life:1.8, vy:-30, size:20 });
    } else zi = trial.z;
  }
  if (zi === undefined) zi = seq[Math.floor(dist / ZONE_LEN) % seq.length];
  if (zi !== zoneIdx){ prevZone = zoneIdx; zoneIdx = zi; zoneFade = 1; zoneBannerT = 2.2; showZoneBanner(); AU.play("levelup", .6);
    score += 60; initBackdrop(true);
    floats.push({ x:player.x+140, y:player.y-90, text:"+60 · " + tr("zone"), color:"#ffd166", life:1.4, vy:-30, size:20 }); }
  if (zoneFade > 0) zoneFade = Math.max(0, zoneFade - dt*0.34);   // ~3 s cross-dissolve
  if (zoneBannerT > 0){ zoneBannerT -= dt; if (zoneBannerT <= 0) el("zoneBanner").classList.add("hidden"); }

  // physics
  player.vy += GRAV * player.gravMul * dt;
  player.vy = clamp(player.vy, -700, 820);
  player.y += player.vy*dt;
  player.angle = clamp(player.vy/900, -0.45, 0.75);
  const ceil = Math.max(player.h*0.55, Math.min(58, H*0.09));
  if (player.y < ceil){ player.y = ceil; player.vy = Math.max(0, player.vy); }
  const floor = H - player.h*0.5 - 2;                 // soft, non-lethal bottom limit
  if (player.y > floor){
    player.y = floor;
    if (player.vy > 0){
      if (player.vy > 260 && Math.random() < 0.6)     // sparks on the hull, not a death
        parts.push({ x:player.x + R(-player.w*0.3, player.w*0.3), y:H-2, vx:R(-160,-40), vy:R(-120,-30),
                     life:R(0.2,0.45), max:0.45, size:R(2,4), color:"#ffb703", glow:false, gy:120 });
      player.vy = -player.vy*0.18;
    }
  }

  if (invuln > 0) invuln -= dt;
  if (player.magnet > 0) player.magnet = Math.max(0, player.magnet - dt);
  if (player.boost > 0){ player.boost = Math.max(0, player.boost - dt); }
  if (comboT > 0){ comboT -= dt; if (comboT <= 0){ combo = 0; mult = 1; } }
  if (flash > 0) flash = Math.max(0, flash - dt*2.5);

  // events
  if (!eventKind && dist >= nextEventAt){ startEvent(); }
  if (eventKind === "shower"){
    eventT -= dt; showerT -= dt;
    if (showerT <= 0){ showerT = R(0.36, 0.68);
      const r = R(10, 20)*Hs();
      let y = R(40, H-40);
      // leave a readable lane next to the ship, otherwise the belt is simply impassable
      if (Math.abs(y - player.y) < 100 && Math.random() < 0.72)
        y = player.y + (Math.random() < 0.5 ? -1 : 1) * R(115, 200);
      y = clamp(y, 40, H-40);
      const o = meteorEnt(W + 90, y, r, difficulty(), 0, R(-40,40));
      o.spd = R(1.15, 1.5); o.vs = R(-3,3);
      obstacles.push(o);
    }
    if (eventT <= 0){ eventKind = null; nextEventAt = dist + R(520, 820);
      score += 150; AU.play("levelup", .6);
      floats.push({ x:player.x+120, y:player.y-80, text:"+150 · " + (lang==="ru"?"ВЫЖИЛ!":"SURVIVED!"), color:"#4ade80", life:1.6, vy:-30, size:22 }); }
  }

  // spawn
  spawnT -= dt;
  if (spawnT <= 0){
    if (obstacles.length < 22){ spawnObstacle(); }
    // during an event the normal traffic thins out, so both never pile up into a wall
    spawnT = Math.max(0.72, (1.70 - d*0.11)) * R(0.85,1.15) * (eventKind ? 1.85 : 1);
  }
  pickT -= dt;
  if (pickT <= 0){ spawnPickups(); pickT = R(1.4, 2.6); }
  powerT -= dt;
  if (powerT <= 0){ spawnPowerup(); powerT = R(11, 18); }
  if (Math.random() < dt*0.16) spawnRescuer();

  // obstacles
  for (const o of obstacles){
    o.x -= vx*dt;
    if (o.t === "rock"){ o.x -= vx*dt*((o.spd||1)-1); o.spin += o.vs*dt;
      if (o.amp){ o.y = o.y0 + Math.sin(tNow*1.3 + o.wob)*o.amp; }
      o.y = clamp(o.y, o.r, H-o.r); }
    collide(o, vx);
  }
  obstacles = obstacles.filter(o => o.x + (o.w||o.r*2) > -120);

  // pickups
  const magR = player.ship.magnet + player.magnetBonus + (player.magnet > 0 ? 150 : 0) + (player.boost>0?120:0);
  for (const p of pickups){
    p.x -= vx*dt; p.ph += dt*3;
    const dx = player.x - p.x, dy = player.y - p.y, dd = Math.hypot(dx,dy);
    if (p.t !== "gem" || magR > 0){
      if (dd < magR + 40 && dd > 1){ const pull = (1 - dd/(magR+40)) * 620 * dt; p.x += dx/dd*pull; p.y += dy/dd*pull; }
    }
    if (p.t === "rescue") p.y += Math.sin(tNow*2 + p.ph)*14*dt;
    if (dd < p.r + player.r){ grab(p); }
  }
  pickups = pickups.filter(p => p.x > -60 && !p.got);

  engineTrail(dt, 1);
  updateParts(dt);

  expCheck();

  // milestones
  const mile = Math.floor(dist/250)*250;
  if (mile > lastMilestone && mile > 0){ lastMilestone = mile; AU.play("milestone", .5);
    floats.push({ x:player.x+120, y:player.y-70, text:"+"+mile+" м", color:"#35c6ff", life:1.4, vy:-26, size:20 }); }

  syncHUD();
}
function engineTrail(dt, mul){
  if (parts.length > 170) return;
  if (Math.random() < 0.9*mul*quality){
    const bx = player.x - Math.cos(player.angle)*player.w*0.42;
    const by = player.y - Math.sin(player.angle)*player.w*0.42;
    parts.push({ x:bx, y:by, vx:-speed*0.45 - R(30,120), vy:R(-26,26), life:R(0.22,0.5), max:0.5,
      size:R(4,9), color: player.boost>0 ? "#ffb703" : "#5ad1ff", glow:true, gy:0 });
  }
}
function updateParts(dt){
  if (wreck){ wreck.x += wreck.vx*dt; wreck.y += wreck.vy*dt; wreck.vy += 500*dt;
    wreck.rot += wreck.vr*dt; wreck.life -= dt; if (wreck.life <= 0) wreck = null; }
  for (const p of parts){ p.x += p.vx*dt; p.y += p.vy*dt; p.vy += (p.gy ?? 60)*dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const f of floats){ f.y += f.vy*dt; f.life -= dt; }
  floats = floats.filter(f => f.life > 0);
  for (const pl of oldPlanets){ pl.x -= (speed*pl.depth + 6)*dt * (state===S.PLAY?1:0.35); pl.rot += pl.spin*dt; }
  if (oldPlanets.length && zoneFade <= 0) oldPlanets.length = 0;
  for (const pl of planets){ pl.x -= (speed*pl.depth + 6)*dt * (state===S.PLAY?1:0.35); pl.rot += pl.spin*dt;
    if (pl.x + pl.s*0.6 < 0){ const z = ZONES[zoneIdx % ZONES.length];
      pl.img = "planet"+pick(z.planets); pl.x = W + pl.s*0.7 + R(0, W*0.5); pl.y = R(-0.1,0.75)*H; pl.s = R(0.18,0.42)*Math.min(W,H*1.6); } }
  for (const s of dust){ s.x -= (speed*s.z*0.35 + 8)*dt*(state===S.PLAY?1:0.3); s.tw += dt*3;
    if (s.x < -4){ s.x = W+4; s.y = R(0,H); } }
}
function collide(o, vx){
  const pr = player.r;
  if (o.t === "rock"){
    const dx = o.x - player.x, dy = o.y - player.y, dd = Math.hypot(dx,dy);
    const rr = o.r*0.74 + pr;
    if (dd < rr){ hitPlayer(o); return; }
    if (!o.near && dd < rr + 26 && Math.abs(dx) < 30){ o.near = true; nearMiss(o.x, o.y); }
  } else if (o.t === "gate"){
    const inset = 10;
    const top = { x:o.x+inset, y:0, w:o.w-inset*2, h:o.h0-inset };
    const bot = { x:o.x+inset, y:o.y1+inset, w:o.w-inset*2, h:o.h1-inset*2 };
    for (const r of [top, bot]){
      if (player.x+pr > r.x && player.x-pr < r.x+r.w && player.y+pr > r.y && player.y-pr < r.y+r.h){ hitPlayer(o); return; }
    }
    if (!o.near && Math.abs((o.x + o.w/2) - player.x) < 30){
      const gapMid = o.h0 + (o.y1-o.h0)/2;
      if (Math.abs(player.y - gapMid) < (o.y1-o.h0)/2 + 34){ o.near = true; nearMiss(o.x+o.w/2, player.y); }
    }
  }
}
function nearMiss(x,y){
  runNear++; missionDelta.near++;
  score += 5*mult;
  floats.push({ x, y:y-30, text:"+"+(5*mult), color:"#9ff2ff", life:0.7, vy:-40, size:15 });
  AU.play("nearmiss", .25);
}
function grab(p){
  p.got = true;
  if (p.t === "gem" && p.chain){ p.chain.left--; if (p.chain.left <= 0 && !p.chain.done){ p.chain.done = true;
    const bonus = Math.round(20 * mult * techMods().chain); score += bonus;
    floats.push({ x:player.x, y:player.y-64, text:(lang==="ru"?"ЦЕПЬ +":"CHAIN +") + bonus, color:"#7ef9ff", life:1.2, vy:-40, size:19 });
    AU.play("levelup", .5); } }
  combo++; comboT = player.comboTime; mult = Math.min(5, 1 + Math.floor(combo/4));
  if (mult > missionDelta.combo) missionDelta.combo = mult;
  if (p.t === "gem"){
    const val = Math.max(1, Math.round(1 * player.gemMul));
    runCoins += val; score += 12*mult;
    missionDelta.crystals += val;
    burst(p.x, p.y, "#7ef9ff", 10, 3);
    floats.push({ x:p.x, y:p.y-24, text:"+"+val+"★", color:"#7ef9ff", life:0.9, vy:-46, size:17 });
    AU.play("crystal", .5);
    // local resource: exists only in this sector, spent only on its techs
    const zz = ZONES[zoneIdx % ZONES.length];
    if (zz.res && Math.random() < 0.3){
      grantRes(zz.res, 1);
      floats.push({ x:p.x, y:p.y-46, text:"+1 " + resName(zz.res), color: resColor(zz.res), life:1, vy:-34, size:14 });
    }
  } else if (p.t === "rescue"){
    runRescued++; score += 80*mult; runCoins += 3;
    const zr = ZONES[zoneIdx % ZONES.length];
    if (zr.res){ grantRes(zr.res, 2);
      floats.push({ x:p.x, y:p.y-52, text:"+2 " + resName(zr.res), color: resColor(zr.res), life:1.1, vy:-34, size:15 }); }
    missionDelta.rescued++;
    burst(p.x, p.y, "#ffe066", 16, 4);
    floats.push({ x:p.x, y:p.y-30, text:"+"+(80*mult), color:"#ffe066", life:1.1, vy:-46, size:20 });
    AU.play("rescue", .6);
  } else {
    runBoosts++; missionDelta.boosts++;
    if (p.t === "shield"){ player.shield = Math.min(3, player.shield + 1); AU.play("shield", .6); }
    if (p.t === "magnet"){ player.magnet = 10; AU.play("magnet", .6); }
    if (p.t === "boost"){ player.boost = 6; AU.play("powerup", .7); }
    score += 25*mult;
    burst(p.x, p.y, p.t==="shield"?"#4ade80":(p.t==="magnet"?"#35c6ff":"#f5a623"), 18, 5);
  }
}
function hitPlayer(o){
  window.__death = { why:"hit", t:o.t, x:Math.round(o.x), y:Math.round(o.y), r:Math.round(o.r||0), w:o.w, h0:o.h0, y1:o.y1,
                     px:Math.round(player.x), py:Math.round(player.y), pr:player.r, dist:Math.round(dist) };
  if (invuln > 0 || player.boost > 0) { if (player.boost>0 && o.t==="rock") destroyRock(o); return; }
  if (player.shield > 0){
    player.shield--; invuln = 1.6; flash = 0.5; vibe(40);
    burst(player.x, player.y, "#4ade80", 22, 5);
    floats.push({ x:player.x, y:player.y-40, text:(lang==="ru"?"ЩИТ!":"SHIELD!"), color:"#4ade80", life:1, vy:-40, size:20 });
    AU.play("hit", .7);
    if (o.t === "rock") destroyRock(o);
    syncHUD();
    return;
  }
  killPlayer();
}
function destroyRock(o){
  if (o.t !== "rock") return;
  burst(o.x, o.y, "#ffb703", 16, 5);
  burst(o.x, o.y, "#e8e8ef", 8, 3);
  floats.push({ x:o.x, y:o.y, text:"+"+(10*mult), color:"#ffb703", life:0.8, vy:-40, size:16 });
  o.x = -9999; o.r = 0;
  score += 10 * mult;
}
function killPlayer(){
  if (state !== S.PLAY) return;
  state = S.OVER; deathT = 0;
  loopStop(); AU.musicStop(); AU.play("gameover", .8);
  flash = 0.9; vibe(90);
  wreck = { x:player.x, y:player.y, vy:player.vy, vx:-120, rot:player.angle, vr:R(-4,4), life:1.6, img:player.ship.id };
  burst(player.x, player.y, "#ff7b54", 34, 6);
  burst(player.x, player.y, "#ffd166", 22, 4);
  const dC = runCoins - committed.coins, dD = Math.floor(dist) - committed.dist,
        dR = runRescued - committed.rescued, dB = runBoosts - committed.boosts,
        dN = runNear - committed.near;
  save.stats.crystals += dC; save.stats.rescued += dR; save.stats.dist += dD;
  // п.15.3: дистанция забега идёт в копилку экипажа (суточный вклад ограничен)
  const crewIn = crewAdd(dD);
  if (crewIn > 0) floats.push({ x:player.x+120, y:player.y-92,
    text:tr("crew_add").replace("{n}", crewIn), color:"#ff8f6b", life:1.5, vy:-28, size:18 });
  save.stats.boosts += dB; save.stats.near += dN; save.wallet += dC;
  if (!committed.runs){ save.stats.runs++; committed.runs = 1; }
  committed.coins = runCoins; committed.dist = Math.floor(dist); committed.rescued = runRescued;
  committed.boosts = runBoosts; committed.near = runNear;
  const isRec = Math.floor(score) > save.best;
  if (isRec) save.best = Math.floor(score);
  applyMissions();
  persist();
  pushLeaderboard(Math.floor(score));
  sendEvent("run_over", Math.floor(score)); maybeRate();
  setTimeout(()=>showGameOver(isRec), 650);
}
function vibe(ms){ try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e){} }
function burst(x, y, color, n, size){
  n = Math.max(3, Math.round(n*quality));
  if (parts.length + n > 240) n = Math.max(3, 240 - parts.length);
  for (let i=0;i<n;i++){ const a = R(0,6.283), s = R(60, 320);
    parts.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:R(0.3,0.8), max:0.8,
      size:R(2, size+3), color, glow:Math.random()<0.5 }); }
}

/* ---------------- render ---------------- */
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  drawSky();
  drawPlanets();
  drawDust();
  drawStreaks();
  drawPickups();
  drawObstacles();
  drawParts();
  if (state !== S.MENU) drawPlayer();
  if (wreck) drawWreck();
  drawFloats();

  if (flash > 0){ ctx.fillStyle = "rgba(255,120,80," + (flash*0.35) + ")"; ctx.fillRect(0,0,W,H); }
  if (state === S.READY) drawReady();
}
function drawSky(){
  const z = ZONES[zoneIdx % ZONES.length];
  const dw = skyDW, off = -((bgOff*0.06) % dw);
  const cur = skyLayer(z.sky);
  if (cur){
    // exactly one screen of pixels: both copies are clipped to what is really visible
    ctx.drawImage(cur, -off, 0, dw + off, skyDH, 0, 0, dw + off, skyDH);
    const x1 = off + dw;
    if (x1 < W) ctx.drawImage(cur, 0, 0, W - x1, skyDH, x1, 0, W - x1, skyDH);
  } else { const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#0a1030"); g.addColorStop(1,"#05070f"); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  if (zoneFade > 0){ const pz = skyLayer(ZONES[prevZone % ZONES.length].sky);
    if (pz){ ctx.globalAlpha = zoneFade*0.9;
      ctx.drawImage(pz, -off, 0, dw + off, skyDH, 0, 0, dw + off, skyDH);
      const x1 = off + dw;
      if (x1 < W) ctx.drawImage(pz, 0, 0, W - x1, skyDH, x1, 0, W - x1, skyDH);
      ctx.globalAlpha = 1; } }
}
function drawPlanets(){
  const f = zoneFade > 0 ? 1 - zoneFade : 1;
  for (const set of (zoneFade > 0 ? [oldPlanets, planets] : [planets])){
  for (const pl of set){
    const img = IMG[pl.img]; if (!img) continue;
    if (quality < 0.5 && pl.depth < 0.18) continue;
    ctx.save(); ctx.translate(pl.x, pl.y); ctx.rotate(pl.rot);
    ctx.globalAlpha = (0.30 + pl.depth*0.9) * (set === planets ? f : zoneFade);
    ctx.drawImage(img, -pl.s/2, -pl.s/2, pl.s, pl.s);
    ctx.restore();
    if (quality > 0.7){ const glow = tinted("fx_light0", ZONES[zoneIdx % ZONES.length].glow);
      if (glow){ ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.10 * (set === planets ? f : zoneFade);
        ctx.drawImage(glow, pl.x - pl.s*0.7, pl.y - pl.s*0.7, pl.s*1.4, pl.s*1.4); ctx.restore(); } }
  }
  }
}
function drawDust(){
  for (const s of dust){
    const a = 0.25 + (Math.sin(s.tw)*0.5+0.5)*0.55;
    ctx.globalAlpha = a * s.z;
    ctx.fillStyle = s.z > 0.8 ? "#ffffff" : "#9fc0ff";
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}
function drawStreaks(){
  const v = (state === S.PLAY ? speed : 0) * (player.boost > 0 ? 1.35 : 1);
  if (v < 300 || quality < 0.6) return;
  const a = clamp((v - 300)/300, 0, 1) * 0.35;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#cfe8ff"; ctx.lineWidth = 1.6;
  for (let i=0;i<14;i++){
    const y = ((i*137 + (bgOff*1.6) % H) % H);
    const len = 40 + (i%5)*26;
    const x = W - ((bgOff*2.2 + i*211) % (W + 200));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawObstacles(){
  for (const o of obstacles){
    if (o.t === "rock"){
      const img = baked(o.img, o.tint || 1) || IMG[o.img]; if (!img) continue;
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.spin);
      const s = o.r*2.35/Math.max(img.width, img.height);
      ctx.drawImage(img, -img.width*s/2, -img.height*s/2, img.width*s, img.height*s);
      ctx.restore();
    } else if (o.t === "gate"){
      // the pillar is CLIPPED to its hitbox column, so what you see is exactly what kills you
      const img = IMG[o.img] || IMG["decor_satelliteDish_large"]; if (!img) continue;
      const part = (h, top) => {
        if (h <= 2) return;
        const y0 = top ? 0 : H - h;
        ctx.save();
        ctx.beginPath(); ctx.rect(o.x, y0, o.w, h); ctx.clip();
        ctx.fillStyle = "#242c47"; ctx.fillRect(o.x, y0, o.w, h);
        const s = Math.max(o.w/img.width, h/img.height);
        const dw = img.width*s, dh = img.height*s, dx = o.x + (o.w-dw)/2;
        if (top) ctx.drawImage(img, dx, h-dh, dw, dh);
        else { ctx.translate(o.x + o.w/2, y0); ctx.scale(1,-1); ctx.drawImage(img, -dw/2, -dh, dw, dh); }
        ctx.restore();
        ctx.fillStyle = "rgba(245,166,35,.55)";
        ctx.fillRect(o.x+3, top ? h-3 : y0, o.w-6, 3);
      };
      part(o.h0, true); part(o.h1, false);
    }
  }
}
function drawPickups(){
  for (const p of pickups){
    const bob = Math.sin(p.ph)*5;
    const x = p.x, y = p.y + bob;
    if (p.t === "gem"){
      const img = IMG[p.img]; if (!img) continue;
      if (quality > 0.5){ const glow = tinted("fx_light1", "#39d0ff");
        if (glow){ ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha = 0.8 + Math.sin(p.ph*2)*0.2;
          const gs = p.r*4.2; ctx.drawImage(glow, x-gs/2, y-gs/2, gs, gs); ctx.restore(); } }
      ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = "#7ef9ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, p.r*1.25 + Math.sin(p.ph*2)*1.5, 0, 6.283); ctx.stroke(); ctx.restore();
      const s = p.r*2.9/Math.max(img.width, img.height);
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(p.ph*0.6)*0.18);
      ctx.drawImage(img, -img.width*s/2, -img.height*s/2, img.width*s, img.height*s);
      ctx.restore();
    } else if (p.t === "rescue"){
      const img = IMG[p.img]; if (!img) continue;
      const glow = tinted("fx_light0", "#ffd166");
      if (glow){ ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.5;
        const gs = p.r*4.4; ctx.drawImage(glow, x-gs/2, y-gs/2, gs, gs); ctx.restore(); }
      const s = p.r*2.4/Math.max(img.width, img.height);
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(tNow*1.6 + p.ph)*0.25);
      ctx.drawImage(img, -img.width*s/2, -img.height*s/2, img.width*s, img.height*s);
      ctx.restore();
    } else {
      const col = p.t==="shield" ? "#4ade80" : (p.t==="magnet" ? "#35c6ff" : "#f5a623");
      const glow = tinted("fx_light0", col);
      if (glow){ ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.75;
        const gs = p.r*4.6; ctx.drawImage(glow, x-gs/2, y-gs/2, gs, gs); ctx.restore(); }
      ctx.save(); ctx.translate(x,y);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(0,0,p.r + Math.sin(p.ph*2)*2, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
      const icon = p.t==="magnet" ? IMG["ui_target"] : (p.t==="boost" ? IMG["ui_fastForward"] : null);
      if (icon){ const s = p.r*1.5/Math.max(icon.width, icon.height);
        ctx.drawImage(icon, -icon.width*s/2, -icon.height*s/2, icon.width*s, icon.height*s); }
      else { ctx.fillStyle = "rgba(120,255,190,0.22)";
        ctx.beginPath(); ctx.arc(0,0,p.r*0.62,0,6.283); ctx.fill();
        ctx.strokeStyle = "#c8ffe0"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0,0,p.r*0.62,0,6.283); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.beginPath(); ctx.arc(-p.r*0.12,-p.r*0.14,p.r*0.34, Math.PI*0.9, Math.PI*1.6); ctx.stroke(); }
      ctx.restore();
    }
  }
}
function drawParts(){
  ctx.save();
  for (const p of parts){
    const a = clamp(p.life/(p.max||0.5), 0, 1);
    ctx.globalAlpha = a;
    if (p.glow && quality > 0.8 && p.size > 3){ const g = tinted("fx_light2", p.color);
      if (g){ ctx.globalCompositeOperation = "lighter"; ctx.drawImage(g, p.x-p.size*3, p.y-p.size*3, p.size*6, p.size*6);
        ctx.globalCompositeOperation = "source-over"; } }
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size*0.6, 0, 6.283); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawFloats(){
  ctx.save();
  for (const f of floats){
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = "800 " + (f.size||18) + "px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.55)";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawPlayer(){
  const img = IMG[player.ship.id];
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
  const blink = invuln > 0 && Math.floor(tNow*14)%2 === 0;
  ctx.globalAlpha = blink ? 0.45 : 1;
  if (player.boost > 0){
    const g = tinted("fx_light4", "#ffb703");
    if (g){ ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.8;
      const gs = player.w*1.5; ctx.drawImage(g, -player.w*0.7-gs/2, -gs/2, gs, gs); ctx.restore(); }
  }
  if (img){
    const w = player.w, h = w * (img.height/img.width);
    ctx.drawImage(img, -w/2, -h/2, w, h);
  } else { ctx.fillStyle="#f5a623"; ctx.beginPath(); ctx.arc(0,0,player.r,0,6.283); ctx.fill(); }
  ctx.restore();
  // shield bubble
  if (player.shield > 0){
    ctx.save(); ctx.translate(player.x, player.y);
    const rr = player.r*1.9 + Math.sin(tNow*4)*2;
    const g = tinted("fx_light0", "#4ade80");
    if (g){ ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.35;
      ctx.drawImage(g, -rr*1.6, -rr*1.6, rr*3.2, rr*3.2); ctx.globalCompositeOperation="source-over"; }
    ctx.globalAlpha = 0.85; ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0,0,rr,0,6.283); ctx.stroke();
    ctx.globalAlpha = 0.12; ctx.fillStyle = "#4ade80";
    ctx.beginPath(); ctx.arc(0,0,rr,0,6.283); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // magnet aura
  if (player.magnet > 0){
    ctx.save(); ctx.translate(player.x, player.y);
    ctx.globalAlpha = 0.18 + Math.sin(tNow*5)*0.05; ctx.strokeStyle = "#35c6ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0,0, player.ship.magnet + 150, 0, 6.283); ctx.stroke(); ctx.restore();
    ctx.globalAlpha = 1;
  }
}
function drawWreck(){
  const img = IMG[wreck.img]; if (!img) return;
  ctx.save(); ctx.globalAlpha = clamp(wreck.life/1.6, 0, 1);
  ctx.translate(wreck.x, wreck.y); ctx.rotate(wreck.rot);
  const w = player.w, h = w*(img.height/img.width);
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawReady(){
  ctx.save();
  ctx.textAlign = "center";
  const n = Math.ceil(readyT);
  const label = n > 0 ? String(n) : tr("go");
  const sc = 1 + (1 - (readyT % 1)) * 0.15;
  ctx.translate(W/2, H*0.34);
  ctx.scale(sc, sc);
  ctx.font = "900 " + Math.min(110, W*0.16) + "px Segoe UI, Arial";
  ctx.lineWidth = 8; ctx.strokeStyle = "rgba(0,0,0,.6)";
  ctx.strokeText(label, 0, 0);
  ctx.fillStyle = "#ffd166"; ctx.fillText(label, 0, 0);
  ctx.restore();
  ctx.save(); ctx.textAlign="center";
  ctx.font = "700 " + Math.min(22, W*0.04) + "px Segoe UI, Arial";
  ctx.fillStyle = "rgba(230,240,255,.85)";
  ctx.fillText(tr("tapToFly"), W/2, H*0.42);
  ctx.restore();
}
function frame(now){
  const dt = Math.min(0.05, (now - lastFrame)/1000) || 0.016;
  lastFrame = now;
  const fps = 1/Math.max(0.0005, dt);
  fpsAvg = fpsAvg*0.92 + fps*0.08;
  if (fpsAvg < 46) quality = Math.max(0.35, quality - 0.02);
  else if (fpsAvg > 57) quality = Math.min(1, quality + 0.01);
  try { update(dt); draw(); } catch(e){ console.error("frame", e); }
  window.__game = { state, dist, score, runCoins, runRescued, mult, zoneIdx, speed, player, obstacles, pickups, parts, save, lang,
                    spawn: typeof spawnObstacle==="function"?spawnObstacle:null,
                    spawnPick: typeof spawnPickups==="function"?spawnPickups:null,
                    spawnPower: typeof spawnPowerup==="function"?spawnPowerup:null,
                    spawnResc: typeof spawnRescuer==="function"?spawnRescuer:null,
                    kill: typeof killPlayer==="function"?killPlayer:null,
                    pause: typeof pauseGame==="function"?pauseGame:null,
                    resume: typeof resumeGame==="function"?resumeGame:null,
                    toMenu: typeof toMenu==="function"?toMenu:null,
                    god: ()=>{ invuln = 9999; player.shield = 3; },
                    setDist: v => { dist = Math.max(0, v|0); },
                    setZone: v => { zoneIdx = Math.max(0, v|0); },
                    trial: ()=>trial,
                    setTrial: (z, secs) => { trial = { z:Math.max(0,z|0), left:secs||TRIAL_SECS }; },
                    start: typeof startPlay==="function"?startPlay:null };
  requestAnimationFrame(frame);
}
let lastFrame = performance.now();
let fpsAvg = 60, quality = 1;

