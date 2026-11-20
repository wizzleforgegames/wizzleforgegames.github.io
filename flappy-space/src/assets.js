/* FLAPPY COSMOS — загрузка ассетов + тонировка спрайтов
   Art: Kenney (CC0) space kits · Sound: Kenney + "ObservingTheStar" (CC0)
   Порядок подключения: i18n → sdk → save → audio → assets → meta → game → ui */

/* ---------------- assets ---------------- */
const IMG = {};
function loadImg(key, src){ return new Promise(res=>{ const im = new Image();
  im.onload = ()=>{ IMG[key]=im; res(true); }; im.onerror = ()=>{ console.warn("img fail", src); res(false); };
  im.src = src; }); }
const MANIFEST = {
  sky:   ["nebula","galaxy","dark","band","day","ice","core"].map(n=>["sky_"+n, "assets/img/bg/sky_"+n+".jpg"]),
  planet:[0,1,2,3,4,5,6,7].map(i=>["planet"+i, "assets/img/planets/p"+i+".png"]),
  ship:  ["craft_racer","craft_speederC","craft_speederA","craft_speederB","craft_speederD",
          "craft_cargoA","craft_miner","craft_cargoB"].map(n=>[n, "assets/img/ship/"+n+".png"]),
  obs:   ["meteor","meteor_detailed","meteor_half","rock_largeA","rock_largeB","rocks_smallA",
          "rock_crystals","rock_crystalsLargeA","rock_crystalsLargeB"].map(n=>["obs_"+n,"assets/img/obs/"+n+".png"]),
  decor: ["satelliteDish_large","satelliteDish","turret_single","turret_double","structure_detailed",
          "hangar_roundGlass","rover","machine_generatorLarge","corridor_detailed","barrel","bones",
          "craterLarge"].map(n=>["decor_"+n,"assets/img/decor/"+n+".png"]),
  char:  ["astronautA","astronautB","alien"].map(n=>["char_"+n,"assets/img/char/"+n+".png"]),
  ui:    ["star","trophy","medal1","home","pause","gear","audioOn","audioOff","exit","shoppingBasket",
          "leaderboardsSimple","locked","unlocked","checkmark","plus","cross","warning","target",
          "power","return","fastForward","buttonStart","information","signal2"].map(n=>["ui_"+n,"assets/img/ui/"+n+".png"]),
  fx:    ["light0","light1","light2","light3","light4","light5"].map(n=>[n,"assets/img/fx/"+n+".png"]),
};
const LOADERS = [];
Object.keys(MANIFEST).forEach(()=>{});
for (const group in MANIFEST) for (const [k, p] of MANIFEST[group]) LOADERS.push(loadImg(k, p));

/* runtime tint of glow sprites (Kenney light*.png) */
const TINT = {};
function tinted(key, color){
  const id = key + "|" + color;
  if (TINT[id]) return TINT[id];
  const src = IMG[key]; if (!src) return null;
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  TINT[id] = c; return c;
}

