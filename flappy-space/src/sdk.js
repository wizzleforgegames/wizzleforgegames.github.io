/* FLAPPY COSMOS — обёртка Yandex Games SDK 2.0 (все вызовы в try/catch)
   Art: Kenney (CC0) space kits · Sound: Kenney + "ObservingTheStar" (CC0)
   Порядок подключения: i18n → sdk → save → audio → assets → meta → game → ui */

/* ---------------- SDK ---------------- */
let ysdk = null, sdkPlayer = null, loopActive = false, sdkPayments = false, iapCatalog = {};
async function initSDK(){
  const factory = window.YaGames || window.YandexGamesSDK || null;
  if (!factory) return;
  try {
    const inst = await Promise.race([
      Promise.resolve(factory.init()),
      new Promise(r=>setTimeout(()=>r(null), 12000))
    ]);
    ysdk = (inst && (inst.adv || inst.features || inst.player || inst.leaderboards || inst.payments)) ? inst : null;
  } catch(e){ ysdk = null; }
  if (!ysdk) return;
  try { if (ysdk.getPlayer) sdkPlayer = await ysdk.getPlayer(); } catch(e){}
  try { const l = ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang;
       if (l && !save.lang) lang = (String(l).toLowerCase().indexOf("ru") === 0) ? "ru" : "en"; } catch(e){}
  try {
    const pay = (typeof ysdk.getPayments === "function") ? await ysdk.getPayments() : ysdk.payments;
    if (pay){ if (typeof pay.init === "function") await pay.init(); sdkPayments = true; }
  } catch(e){ sdkPayments = false; }
  try { if (ysdk.on) { ysdk.on("game_api_pause", ()=>{ if(state===S.PLAY) pauseGame(); });
                        ysdk.on("game_api_resume", ()=>{ if(state===S.PAUSE) resumeGame(); }); } } catch(e){}
}
function loopStart(){ if(!ysdk) return;
  try { if (ysdk.features?.GameplayAPI && !loopActive) { ysdk.features.GameplayAPI.start(); loopActive = true; } } catch(e){}
  try { if (ysdk.features?.Loop) ysdk.features.Loop.gameplay("start"); } catch(e){} }
function loopStop(){ if(!ysdk) return;
  try { if (ysdk.features?.GameplayAPI && loopActive) { ysdk.features.GameplayAPI.stop(); loopActive = false; } } catch(e){}
  try { if (ysdk.features?.Loop) ysdk.features.Loop.gameplay("stop"); } catch(e){} }
function loadingReady(){
  try { if (ysdk?.features?.LoadingAPI?.ready) ysdk.features.LoadingAPI.ready(); } catch(e){}
  try { if (typeof ysdk?.loading?.ready === "function") ysdk.loading.ready(); } catch(e){}
}
function sendEvent(n, l){
  try { const a = ysdk && ysdk.analytics; if (!a) return;
    if (typeof a.sendEvent === "function") a.sendEvent(n, String(l ?? ""));
    else if (typeof a.event === "function") a.event(n, String(l ?? ""));
  } catch(e){}
}
function maybeRate(){
  try { if (save.stats.runs > 0 && save.stats.runs % 4 === 0 && !save.rated && ysdk && ysdk.feedback){
    const f = ysdk.feedback, m = f.requestRate || f.requestReview;
    if (typeof m === "function"){ m.call(f); save.rated = true; persist(); } } } catch(e){}
}
/* п.4.7: на время рекламы игра ставится на паузу и замолкает */
function adMute(){ try { AU.suspendAll(); } catch(e){} }
function adUnmute(){ try { AU.resumeMusic(); } catch(e){} }

function showInterstitial(){
  return new Promise(res=>{
    const adv = ysdk && ysdk.adv; if (!adv) return res(false);
    const m = adv.showFullscreenAdv || adv.showInterstitial;
    if (typeof m !== "function") return res(false);
    let done = false; const finish = v => { if(!done){ done = true; adUnmute(); res(v); } };
    adMute();
    try {
      m.call(adv, { callbacks:{ onOpened(){}, onClose:()=>finish(true), onClosed:()=>finish(true),
                                onHidden:()=>finish(true), onError:()=>finish(false), onFailed:()=>finish(false) } });
    } catch(e){ finish(false); }
    setTimeout(()=>finish(true), 60000);
  });
}
/* ревард начисляется ТОЛЬКО если SDK подтвердил награду (onRewarded) */
function rewarded(){
  return new Promise(res=>{
    const adv = ysdk && ysdk.adv;
    if (!adv) return res(true);
    const m = adv.showRewardedVideo || adv.showRewardVideo;
    if (typeof m !== "function") return res(true);
    let done = false, got = false;
    const finish = v => { if(!done){ done = true; adUnmute(); res(v); } };
    adMute();
    try {
      m.call(adv, { callbacks:{
        onOpened(){}, onAdShown(){},
        onRewarded(){ got = true; }, onReward(){ got = true; },
        onClose:()=>finish(got), onClosed:()=>finish(got),
        onError:()=>finish(false), onFailed:()=>finish(false) } });
    } catch(e){ finish(false); }
    setTimeout(()=>finish(got), 45000);
  });
}
/* ---- IAP (docs/META.md п.12-13): only real money buys automation and skips ---- */
function hasPayments(){ return !!(sdkPayments && ysdk && ysdk.payments); }
function payObj(){ return (ysdk && ysdk.payments) || null; }
function isConsumable(id){ try { const it = (typeof iapById === "function") ? iapById(id) : null;
  return !!it && it.once === false; } catch(e){ return false; } }
function purchaseId(p){ return String((p && (p.productID || p.id || (p.productDescription && p.productDescription.id))) || ""); }
function purchaseToken(p){ return String((p && (p.purchaseToken || p.token)) || ""); }

async function getPurchases(){
  const pay = payObj(); if (!hasPayments() || !pay || typeof pay.getPurchases !== "function") return [];
  try { const r = await pay.getPurchases();
    const items = r && Array.isArray(r.items) ? r.items : (Array.isArray(r) ? r : []);
    return items.map(i => ({ id: purchaseId(i), token: purchaseToken(i) })).filter(x => x.id);
  } catch(e){ return []; }
}
async function buyProduct(id){
  const pay = payObj(); if (!hasPayments() || !pay) return { err:"off" };
  try {
    if (typeof pay.requestPurchase === "function") {
      const r = await pay.requestPurchase({ item: { id: String(id) } });
      const pr = (r && r.purchase) || r;
      if (pr && (purchaseToken(pr) || purchaseId(pr))) return { ok:true, token: purchaseToken(pr) };
    }
  } catch(e){}
  const fn = (typeof pay.purchase === "function") ? pay.purchase : pay.purchaseItem;
  if (typeof fn !== "function") return { err:"off" };
  try { const r = await fn.call(pay, { id:id });
    return { ok:true, token: purchaseToken(r) };
  } catch(e){ return { err:"fail" }; }
}
/* п.13.1 из требований: расходуемые товары обязательно консумируются */
async function consumePurchase(token){
  const pay = payObj(); if (!hasPayments() || !pay || !token) return false;
  const fn = pay.consumePurchase; if (typeof fn !== "function") return false;
  try { await fn.call(pay, token); return true; } catch(e){ return false; }
}
async function grantAndConsume(id, token){
  let it = null; try { it = grantIap(id); } catch(e){}
  persist();
  if (token && isConsumable(id)) await consumePurchase(token);
  return it;
}
/* п.1.13.2 / 1.13.4: цена и иконка портальной валюты берутся из каталога SDK */
async function loadCatalog(){
  const pay = payObj(); if (!hasPayments() || !pay) return {};
  let list = null;
  const ok = x => Array.isArray(x) && x.length > 0;
  for (const m of ["getPrices","getCatalogItems","getCatalog","getProducts"]) {
    if (typeof pay[m] !== "function") continue;
    try { const r = await pay[m](); const l = (r && Array.isArray(r.products)) ? r.products : r;
      if (ok(l)) { list = l; break; } } catch(e){}
  }
  if (!list) return {};
  {
    (Array.isArray(list) ? list : []).forEach(p => {
      const id = purchaseId(p); if (!id) return;
      let img = "";
      try { img = (typeof p.getPriceCurrencyImage === "function") ? p.getPriceCurrencyImage("small") : ""; } catch(e){}
      iapCatalog[id] = { price: String(p.price || p.priceValue || ""), value: String(p.priceValue || ""),
                         code: String(p.priceCurrencyCode || ""), img: img || "" };
    });
  }
  return iapCatalog;
}
function iapPriceLabel(id){
  const c = iapCatalog && iapCatalog[id];
  if (!c || (!c.price && !c.img)) return null;
  return { text: c.price || c.value, img: c.img, code: c.code };
}
async function restorePurchases(){
  const list = await getPurchases(); if (!list.length) return [];
  for (const p of list){ await grantAndConsume(p.id, p.token); }
  return list.map(p => p.id);
}
