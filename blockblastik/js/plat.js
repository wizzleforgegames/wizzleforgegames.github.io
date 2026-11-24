(function(){
/* ============================================================
   Platform facade: Yandex Games (primary) / VK Play / dev-sim.
   Exposes window.P with a single generic API. window.VK kept
   as a low-level VK provider for backwards compatibility.
   ============================================================ */
const YA_HOST=/(^|\.)(yandex\.[a-z]{2,3}(\.[a-z]{2})?|games\.yandex\.dev|yandexgames\.ru)$/i;
let kind='dev', ysdk=null, yplayer=null, yproducts=[], ypurch=[], sup={}, lastRewardAt=0, noAds=false;
let adHooks=[], flags={}, payReady=false, reviewed=false;
const CONSUMABLE=['coins_small','coins_medium','coins_large','coins_xl','hot_deal'];
const now=()=>Date.now();

/* ---------- detection ---------- */
function looksYandex(){
  try{ if(YA_HOST.test(location.hostname)) return true; }catch(e){}
  try{ if(/[?&](yandex|ysdk)=1/.test(location.search)) return true; }catch(e){}
  return !!window.YaGames;
}
function loadScript(u,ms){
  return new Promise(res=>{
    const s=document.createElement('script'); s.src=u; s.async=true;
    s.onload=()=>res(!!window.YaGames); s.onerror=()=>{s.remove();res(false)};
    document.head.appendChild(s);
    setTimeout(()=>res(!!window.YaGames),ms||4000);
  });
}
async function yaInit(){
  if(!window.YaGames&&looksYandex()){
    for(const u of ['https://yandex.ru/games/sdk/v2','https://cdn.yandex.ru/games/sdk/v2']){
      if(await loadScript(u,4000))break;
    }
  }
  if(!window.YaGames) return false;
  try{
    ysdk=await Promise.race([
      window.YaGames.init({signed:false}),
      new Promise((_,rj)=>setTimeout(()=>rj('timeout'),5000))
    ]);
  }catch(e){ ysdk=null; }
  if(!ysdk) return false;
  try{
    yplayer=await Promise.race([ysdk.getPlayer(),new Promise((_,rj)=>setTimeout(()=>rj('t'),4000))]);
  }catch(e){ yplayer=null; }
  /* cloud save / setStats / leaderboards require an authorized player:
     ask for the mini-app scope once (silent when the user is already logged in). */
  try{
    if(yplayer&&!yplayer.isAuthorized()){
      const p2=await Promise.race([ysdk.getPlayer({scopes:'mini-app'}),new Promise((_,rj)=>setTimeout(()=>rj('t'),4500))]);
      if(p2&&p2.isAuthorized&&p2.isAuthorized()) yplayer=p2;
    }
  }catch(e){}
  try{ ysdk.getPayments&&await ysdk.getPayments(); }catch(e){}
  return true;
}

/* ---------- Yandex providers ---------- */
const YA={
  rewarded(reason){
    return new Promise(res=>{
      let got=false,done=false;
      const fin=(o)=>{if(!done){done=true;res(o)}};
      const to=setTimeout(()=>fin({ok:got,why:'timeout'}),120000);
      try{
        ysdk.adv.showRewardedVideo({callbacks:{
          onOpen:()=>{adHooks.forEach(f=>{try{f(true,'rewarded')}catch(e){}})},
          onRewarded:()=>{got=true},
          onClose:(was)=>{clearTimeout(to);adHooks.forEach(f=>{try{f(false,'rewarded')}catch(e){}});fin({ok:got,shown:was!==false})},
          onError:(e)=>{clearTimeout(to);adHooks.forEach(f=>{try{f(false,'rewarded')}catch(e){}});fin({ok:false,err:String(e&&e.message||e)})}
        }});
      }catch(e){clearTimeout(to);fin({ok:false,err:String(e)})}
    });
  },
  hasRewarded(){ return Promise.resolve(true) },
  interstitial(){
    return new Promise(res=>{
      let shown=false,done=false;
      const fin=(o)=>{if(!done){done=true;res(o)}};
      const to=setTimeout(()=>fin({ok:shown,why:'timeout'}),60000);
      try{
        ysdk.adv.showFullscreenAdv({callbacks:{
          onOpen:()=>{shown=true;adHooks.forEach(f=>{try{f(true,'inter')}catch(e){}})},
          onClose:(was)=>{clearTimeout(to);shown=shown||!!was;adHooks.forEach(f=>{try{f(false,'inter')}catch(e){}});fin({ok:shown})},
          onError:()=>{clearTimeout(to);adHooks.forEach(f=>{try{f(false,'inter')}catch(e){}});fin({ok:false})}
        }});
      }catch(e){clearTimeout(to);fin({ok:false,err:String(e)})}
    });
  },
  async banner(show){
    try{
      if(show){ if(ysdk.adv.showBannerAdv)ysdk.adv.showBannerAdv(); }
      else { if(ysdk.adv.hideBannerAdv)ysdk.adv.hideBannerAdv(); }
      return true;
    }catch(e){ return false }
  },
  async products(){
    try{
      const pm=ysdk.payments;
      let ps=null;
      const ok=x=>!!(x&&((x.products&&x.products.length)||x.length));
      if(pm.getPrices) { try{ ps=await pm.getPrices() }catch(e){ ps=null } }
      if(!ok(ps)&&pm.getCatalog) { try{ ps=await pm.getCatalog() }catch(e){} }
      if(!ok(ps)&&pm.getProducts) { try{ ps=await pm.getProducts() }catch(e){} }
      if(!ok(ps)&&pm.getCatalogItems) { try{ ps=await pm.getCatalogItems() }catch(e){} }
      yproducts=(ps&&ps.products)||ps||[];
      return yproducts;
    }catch(e){ return [] }
  },
  async purchase(id){
    try{
      const pm=ysdk.payments; let p=null;
      if(pm.requestPurchase){ try{ const r=await pm.requestPurchase({item:{id:String(id)}}); p=(r&&r.purchase)||r }catch(e){ p=null } }
      if(!p||!(p.purchaseToken||p.productID)){ try{ p=await pm.purchase({id:String(id)}) }catch(e){ p=null } }
      if(!p) return {ok:false,err:'no purchase'};
      const tok=p&&p.purchaseToken;
      if(CONSUMABLE.indexOf(String(id))>=0&&tok){ try{ await ysdk.payments.consumePurchase(tok) }catch(e){} }
      return {ok:true,data:{productID:p&&p.productID||id,token:tok}};
    }catch(e){ return {ok:false,err:String(e&&e.message||e)} }
  },
  async purchases(){
    try{ const r=await ysdk.payments.getPurchases(); const l=(r&&r.purchases)||r||[];
      return (l||[]).map(p=>({id:p.productID||p.id,token:p.purchaseToken})); }
    catch(e){ return [] }
  },
  async cloudGet(){
    if(!yplayer) return null;
    try{ const d=await Promise.race([yplayer.getData(['bb_save']),new Promise((_,rj)=>setTimeout(()=>rj('t'),5000))]);
      const v=d&&(d.bb_save!==undefined?d.bb_save:d);
      if(!v) return null;
      return (typeof v==='string')?JSON.parse(v):v;
    }catch(e){ return null }
  },
  cloudSet(obj){
    if(!yplayer||!obj) return false;
    try{ yplayer.setData({bb_save:obj},false).catch(()=>{}); return true }catch(e){ return false }
  },
  cloudFlush(){
    if(!yplayer) return;
    try{ yplayer.setData({bb_save:P._snapshot()},true).catch(()=>{}) }catch(e){}
  },
  async lbSet(score,lb){
    try{ await ysdk.leaderboards.setScore(lb||'best_score',Math.max(0,Math.round(score))); return true }catch(e){ return false }
  },
  async lbTop(n,lb){
    try{
      const r=await ysdk.leaderboards.getEntries({leaderboardName:lb||'best_score',includeUser:true,quantity:n||20});
      const es=(r&&r.entries)||[]; const out=[];
      es.forEach((e,i)=>out.push({rank:e.rank||i+1,name:(e.player&&e.player.name)||('IGR'+((e.player&&e.player.uniqueID)||i)),
        photo:e.player&&e.player.photo,score:e.score||0,me:!!(r.userEntryInfo&&e.player&&r.userEntryInfo.player&&e.player.uniqueID===r.userEntryInfo.player.uniqueID)}));
      if(r&&r.userEntryInfo&&!out.some(o=>o.me)){
        const u=r.userEntryInfo;
        out.push({rank:u.rank||0,name:(u.player&&u.player.name)||'—',photo:u.player&&u.player.photo,score:u.score||0,me:true});
      }
      return out;
    }catch(e){ return [] }
  },
  async review(){
    try{
      const c=await ysdk.feedback.canReview();
      if(!c||c.value!==true) return {ok:false,why:(c&&c.reason)||'no'};
      const r=await ysdk.feedback.requestReview();
      return {ok:true,sent:!!(r&&(r.feedbackSent||r.sentFeedback))};
    }catch(e){ return {ok:false,err:String(e)} }
  },
  async shortcut(){
    try{
      const c=await ysdk.shortcut.canShowPrompt();
      if(!c||!c.canShow) return {ok:false,why:'noshow'};
      const r=await ysdk.shortcut.showPrompt();
      return {ok:!!(r&&(r.outcome==='accepted'||r.promptShown)),outcome:r&&r.outcome};
    }catch(e){ return {ok:false,err:String(e)} }
  },
  shortcutAvail(){
    return ysdk.shortcut.canShowPrompt().then(c=>!!(c&&c.canShow)).catch(()=>false);
  },
  lang(){ try{ return (ysdk.environment&&ysdk.environment.i18n&&ysdk.environment.i18n.lang)||'' }catch(e){ return '' } },
  appId(){ try{ return String((ysdk.environment&&ysdk.environment.app&&ysdk.environment.app.id)||'') }catch(e){ return '' } },
  async flags(def){ try{ const f=await ysdk.getFlags({defaultFlags:def}); return f||def }catch(e){ return def } },
  ready(){ try{ ysdk.features&&ysdk.features.LoadingAPI&&ysdk.features.LoadingAPI.ready() }catch(e){} },
  gameplay(on){ try{ const g=ysdk.features&&ysdk.features.GameplayAPI; if(!g)return; if(on)g.start(); else g.stop() }catch(e){} },
  async stats(o){
    if(!yplayer) return false;
    try{ const st={}; for(const k in o){ const v=o[k]; if(v!==undefined&&v!==null) st[k]=String(v) }
      await yplayer.setStats(st); return true }catch(e){ return false }
  },
  user(){ try{ if(!yplayer||!yplayer.isAuthorized())return null;
      return {id:yplayer.getUniqueID&&yplayer.getUniqueID(),name:(yplayer.getName&&yplayer.getName())||'',photo:(yplayer.getPhoto&&yplayer.getPhoto())||''} }
    catch(e){ return null } },
  authorized(){ try{ return !!(yplayer&&yplayer.isAuthorized()) }catch(e){ return false } },
  async auth(){ try{ await ysdk.auth.openAuthDialog(); yplayer=await ysdk.getPlayer(); return true }catch(e){ return false } },
  paying(){ try{ return yplayer&&yplayer.getPayingStatus?yplayer.getPayingStatus():null }catch(e){ return null } },
  /* ---- Yandex platform achievements (dashboard-configured; safe when absent) ---- */
  async achList(){
    try{ const r=await Promise.race([ysdk.achievements.getList(),new Promise((_,rj)=>setTimeout(()=>rj('t'),4000))]);
      const l=(r&&(r.achievements||r.items||r))||[]; const m={};
      (Array.isArray(l)?l:[]).forEach(a=>{ const id=String(a.uniqueId||a.id||'').toLowerCase(); if(id) m[id]=a });
      return m;
    }catch(e){ return {} }
  },
  async achProgress(){
    try{ const r=await Promise.race([ysdk.achievements.getProgress(),new Promise((_,rj)=>setTimeout(()=>rj('t'),4000))]);
      const l=(r&&(r.items||r.progress||r))||[]; const out={};
      (Array.isArray(l)?l:[]).forEach(a=>{ const id=String(a.uniqueId||a.id||'').toLowerCase(); if(id)
        out[id]={value:Number(a.value)||0,done:!!(a.completed||a.done)} });
      return out;
    }catch(e){ return {} }
  },
  async achSet(id,val){
    try{ await ysdk.achievements.setProgress({uniqueId:String(id),value:Number(val)||0}); return true }
    catch(e){ return false }
  },
  /* ---- Yandex platform bonuses (dashboard-configured; safe when absent) ---- */
  async bonusCatalog(){
    try{ const r=await Promise.race([ysdk.bonuses.getCatalog(),new Promise((_,rj)=>setTimeout(()=>rj('t'),4000))]);
      const l=(r&&(r.items||r.catalog||r))||[]; return Array.isArray(l)?l:[] }catch(e){ return [] }
  },
  async bonusMine(){
    try{ const r=await Promise.race([ysdk.bonuses.getPlayerBonuses(),new Promise((_,rj)=>setTimeout(()=>rj('t'),4000))]);
      const l=(r&&(r.items||r.bonuses||r))||[]; return Array.isArray(l)?l:[] }catch(e){ return [] }
  },
  async bonusConsume(id){
    try{ const r=await ysdk.bonuses.consume({id:String(id)}); return {ok:!!(r&&(r.success!==false))} }
    catch(e){ return {ok:false,err:String(e&&e.message||e)} }
  },
  /* ---- Yandex fullscreen (recommended on desktop) ---- */
  fsStatus(){ try{ return ysdk.screen&&ysdk.screen.fullscreen?ysdk.screen.fullscreen.status:'off' }catch(e){ return 'off' } },
  async fsToggle(){
    try{ const f=ysdk.screen&&ysdk.screen.fullscreen; if(!f) return false;
      if(f.status==='on'){ if(f.exit)await f.exit(); } else { if(f.request)await f.request(); else if(f.toggle)await f.toggle(); }
      return true;
    }catch(e){ return false }
  },
  fsWatch(cb){ try{ const f=ysdk.screen&&ysdk.screen.fullscreen; if(!f||!f.onMessage)return;
      f.onMessage((m)=>{ if(m&&(m.type==='fullscreenModeChanged'||m.type==='fullscreen')) cb(!!(m.data&&m.data.isFullscreen)) }) }catch(e){} },
  taptic(){ /* platform haptics: use browser API */ },
  share(){ return false }
};

/* ---------- Yandex analytics (funnel for the developer dashboard) ---------- */
const EVRE=/[^a-z0-9_]/gi;
function evName(e){ return ('bb_'+String(e).replace(EVRE,'_')).toLowerCase().slice(0,48) }
let uniq=null;
function uniqSet(){ if(uniq===null){ try{ uniq=new Set(JSON.parse(localStorage.getItem('bb_uniq')||'[]')) }catch(e){ uniq=new Set() } } return uniq }
function yaTrack(e,p,once){
  try{
    if(!ysdk||!ysdk.analytics) return false;
    const n=evName(e);
    if(once){ const u=uniqSet(); if(u.has(n)) return false; u.add(n);
      try{ localStorage.setItem('bb_uniq',JSON.stringify(Array.from(u).slice(-120))) }catch(err){}
      ysdk.analytics.writeUniqueEvent(n); return true }
    const v=(p&&typeof p.v==='number'&&isFinite(p.v))?Math.round(p.v):null;
    if(v!==null) ysdk.analytics.writeEvent(n,v); else ysdk.analytics.writeEvent(n);
    return true
  }catch(err){ return false }
}

/* ---------- VK provider (thin delegate) ---------- */
const VKP={
  rewarded:(r)=>window.VK.rewarded(r),
  hasRewarded:()=>window.VK.hasRewarded(),
  interstitial:()=>window.VK.interstitial(),
  banner:(s)=>window.VK.banner(s),
  products:()=>Promise.resolve([]),
  purchase:async(id,amt)=>{ const r=await window.VK.pay(id,amt); return r&&r.ok?{ok:true,data:{productID:id}}:{ok:false,err:r&&r.err} },
  purchases:async()=>{ const r=await window.VK.purchases(); const l=(r&&r.data&&(r.data.items||r.data.list))||[];
    return (l||[]).map(p=>({id:p.item||p.item_id||p.id,token:p.purchase_id||''})) },
  cloudGet:()=>window.VK.cloudGet(),
  cloudSet:(o)=>window.VK.cloudSet(o),
  cloudFlush:()=>window.VK.cloudSet(P._snapshot()),
  lbSet:(s)=>window.VK.setLeaderScore(s),
  lbTop:(n)=>window.VK.topFriends(n),
  review:async()=>{ const r=await window.VK.recommend(); return {ok:!!(r&&r.ok)} },
  shortcut:async()=>{ const r=await window.VK.a2hs(); return {ok:!!(r&&r.ok)} },
  shortcutAvail(){ return window.VK.a2hsInfo().then(r=>!!(r&&r.ok&&r.data&&r.data.isAdded===false)).catch(()=>false) },
  lang:()=>'', appId:()=>String(window.VK.appId||''),
  flags:(d)=>d,
  ready(){}, gameplay(){}, stats:()=>Promise.resolve(false),
  user(){ const u=window.VK.user; return u?{id:u.id,name:u.first_name||'',photo:u.photo_100||u.photo_200||''}:null },
  authorized(){ return !!window.VK.user },
  auth:async()=>false, paying:()=>null,
  taptic:(k)=>window.VK.taptic(k),
  share:(t,x)=>window.VK.share(t,x),
  achList:()=>Promise.resolve({}), achProgress:()=>Promise.resolve({}), achSet:()=>Promise.resolve(false),
  bonusCatalog:()=>Promise.resolve([]), bonusMine:()=>Promise.resolve([]), bonusConsume:()=>Promise.resolve({ok:false}),
  fsStatus:()=>'off', fsToggle:()=>Promise.resolve(false), fsWatch(){}
};

/* ---------- dev / browser sim ---------- */
function simAd(ms){
  return new Promise(res=>{
    const d=document.createElement('div'); d.className='adsim';
    d.innerHTML='<div class="in"><div class="ad">AD</div><div class="tm">'+ms+'</div></div>';
    document.body.appendChild(d);
    let t=ms; adHooks.forEach(f=>{try{f(true,'sim')}catch(e){}});
    const iv=setInterval(()=>{t--; const e=d.querySelector('.tm'); if(e)e.textContent=t;
      if(t<=0){clearInterval(iv);d.remove();adHooks.forEach(f=>{try{f(false,'sim')}catch(e){}});res({ok:true,sim:true})}},1000);
  });
}
const DEV={
  rewarded:()=>simAd(5), hasRewarded:()=>Promise.resolve(true), interstitial:()=>Promise.resolve({ok:false}),
  banner:()=>Promise.resolve(false), products:()=>Promise.resolve([]),
  purchase:()=>Promise.resolve({ok:false,why:'dev'}), purchases:()=>Promise.resolve([]),
  cloudGet:()=>Promise.resolve(null), cloudSet:()=>false, cloudFlush(){},
  lbSet:()=>false, lbTop:()=>Promise.resolve([]),
  review:()=>Promise.resolve({ok:false,why:'dev'}), shortcut:()=>Promise.resolve({ok:false,why:'dev'}),
  shortcutAvail:()=>Promise.resolve(false), lang:()=>'', appId:()=>'', flags:(d)=>d,
  ready(){}, gameplay(){}, stats:()=>Promise.resolve(false), user:()=>null, authorized:()=>false, auth:async()=>false, paying:()=>null,
  taptic(){}, share:()=>false,
  achList:()=>Promise.resolve({}), achProgress:()=>Promise.resolve({}), achSet:()=>Promise.resolve(false),
  bonusCatalog:()=>Promise.resolve([]), bonusMine:()=>Promise.resolve([]), bonusConsume:()=>Promise.resolve({ok:false}),
  fsStatus:()=>'off', fsToggle:()=>Promise.resolve(false), fsWatch(){}
};

let A=DEV;
function haptic(kind){
  try{ if(!P._gest) return; if(navigator.vibrate){ navigator.vibrate(kind==='heavy'?[24,12,20]:(kind==='light'?[8,6,8]:[14])) } }catch(e){}
  if(A===VKP) A.taptic(kind);
}

const P={
  get kind(){return kind}, get inPlatform(){return kind!=='dev'}, get ya(){return kind==='ya'},
  get appId(){return A.appId()}, get lang(){return A.lang()},
  get user(){return A.user()}, get products(){return yproducts},
  get noAds(){return noAds}, setNoAds(v){noAds=!!v}, get lastRewardAt(){return lastRewardAt},
  onAdShow(cb){ if(typeof cb==='function')adHooks.push(cb) },
  _snapshot(){ try{ return (window.BB&&BB.S)||{} }catch(e){ return {} } },
  async init(){
    if(await yaInit()){ kind='ya'; A=YA }
    else if(window.VK&&window.VK.inVK){ kind='vk'; A=VKP }
    else if(window.VK){ const ok=await window.VK.init(); if(ok){kind='vk';A=VKP} }
    try{ flags=await A.flags({inter_games:'3',inter_gap_ms:'150000',after_reward_ms:'35000',inter_per_hour:'6',
      sticky_hub:'1',inter_after_over:'1',reward_daily_limit:'0'}) }catch(e){}
    if(!flags||typeof flags!=='object')flags={};
    try{ const l=A.lang(); if(l&&window.I18N&&!localStorage.getItem('bb_lang')) I18N.set(l.indexOf('ru')===0?'ru':'en') }catch(e){}
    return kind;
  },
  ready(){ A.ready() },
  gameplay(on){ A.gameplay(on) },
  stats(o){ try{ return A.stats(o) }catch(e){ return Promise.resolve(false) } },
  flags(){ return flags },
  flag(k,d){ const v=flags[k]; return v===undefined?d:isNaN(+v)?v:+v },
  /* ---- ads ---- */
  async rewarded(reason){
    if(noAds) return {ok:true,skipped:true};
    const out=await A.rewarded(reason);
    if(out&&out.ok){ lastRewardAt=now();
      try{ yaTrack('ad_reward',null,false); yaTrack('first_ad_reward',null,true) }catch(e){} }
    try{ if(window.BB&&out&&out.ok) BB.logAd&&BB.logAd(reason) }catch(e){}
    return out;
  },
  hasRewarded(){ return A.hasRewarded() },
  interstitial(){ if(noAds) return Promise.resolve({ok:false,skipped:true}); return A.interstitial() },
  banner(show){ return A.banner(show) },
  /* ---- platform achievements: only push ids that are configured in the dashboard ---- */
  achCfg:{},
  async achInit(){
    if(kind!=='ya'){ this.achCfg={}; return this.achCfg }
    try{ this.achCfg=await A.achList()||{} }catch(e){ this.achCfg={} }
    return this.achCfg;
  },
  achHas(id){ return !!this.achCfg[String(id).toLowerCase()] },
  achCount(){ return Object.keys(this.achCfg).length },
  achProgress(){ return A.achProgress() },
  achSet(id,val){ if(!this.achHas(id)) return Promise.resolve(false); return A.achSet(id,val) },
  /* ---- platform bonuses (auto-hidden when the dashboard has none) ---- */
  async bonuses(){
    if(kind!=='ya') return [];
    try{
      const cat=await A.bonusCatalog(), mine=await A.bonusMine();
      const owned={}; (mine||[]).forEach(b=>{ owned[String(b.id||b.bonusId||'')]=b });
      const out=[];
      (cat||[]).forEach(c=>{ const id=String(c.id||''); if(!id) return;
        out.push({id:id,title:c.title||'',description:c.description||'',price:Number(c.price)||0,
          owned:!!owned[id],ownId:(owned[id]&&(owned[id].id||owned[id].bonusId))||null,raw:c}) });
      return out;
    }catch(e){ return [] }
  },
  bonusConsume(id){ if(kind!=='ya') return Promise.resolve({ok:false}); return A.bonusConsume(id) },
  /* ---- fullscreen (Yandex-managed when available, native otherwise) ---- */
  fsSupported(){
    if(kind==='ya') return true;
    try{ return !!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen) }catch(e){ return false }
  },
  async fsToggle(){
    if(kind==='ya'){ try{ if(await A.fsToggle()) return true }catch(e){} }
    try{
      if(document.fullscreenElement||document.webkitFullscreenElement){
        if(document.exitFullscreen) await document.exitFullscreen(); else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        const el=document.documentElement;
        if(el.requestFullscreen) await el.requestFullscreen({navigationUI:'hide'});
        else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else return false;
      }
      return true;
    }catch(e){ return false }
  },
  fsIsOn(){ try{ return !!(document.fullscreenElement||document.webkitFullscreenElement) }catch(e){ return false } },
  fsWatch(cb){ try{ if(kind==='ya'&&A.fsWatch) A.fsWatch(cb) }catch(e){}
    try{ document.addEventListener('fullscreenchange',()=>cb(!!document.fullscreenElement)) }catch(e){} },
  /* ---- payments ---- */
  async loadProducts(){ try{ yproducts=await A.products()||[] }catch(e){ yproducts=[] } return yproducts },
  product(id){ return (yproducts||[]).find(p=>p&&p.id===id)||null },
  priceText(id,fallback){ const p=P.product(id);
    if(!p) return fallback!=null?fallback+' ₽':'';
    const v=p.priceValue||p.price||''; let ic='';
    try{ if(p.getPriceCurrencyImage){ let u=String(p.getPriceCurrencyImage('small')||'');
      if(u) ic='<img class="cur" alt="" src="'+u.replace(/"/g,'%22').replace(/'/g,'%27')+'">' } }catch(e){}
    if(ic) return ic+v;
    return v+((p.priceCurrencyCode&&v.indexOf(p.priceCurrencyCode)<0)?(' '+p.priceCurrencyCode):'') },
  async pay(id,amount){
    if(kind==='dev') return {ok:false,why:'dev'};
    const r=await A.purchase(id,amount);
    if(r&&r.ok){ P.track('iap_ok',{item:id,price:amount||0});
      try{ yaTrack('first_purchase',null,true); yaTrack('iap_'+String(id).replace(EVRE,'_').toLowerCase(),{v:amount||0}) }catch(e){} }
    else P.track('iap_fail',{item:id,why:(r&&(r.err||r.why))||''});
    return r;
  },
  purchases(){ return A.purchases() },
  /* ---- cloud ---- */
  cloudGet(){ return A.cloudGet() },
  cloudSet(o){ return A.cloudSet(o) },
  cloudFlush(){ A.cloudFlush() },
  /* ---- leaderboard ---- */
  lbSet(s,lb){ return A.lbSet(s,lb) },
  lbTop(n,lb){ return A.lbTop(n,lb) },
  /* ---- retention ---- */
  async review(){ const r=await A.review(); if(r&&r.ok)reviewed=true; return r },
  supportsReview(){ return kind==='ya'||kind==='vk' },
  async canReview(){ if(kind==='vk')return true; if(kind==='ya'){try{const c=await ysdk.feedback.canReview();return !!(c&&c.value===true)}catch(e){return false}} return false },
  async shortcut(){ const r=await A.shortcut(); return r },
  shortcutAvail(){ return A.shortcutAvail() },
  supportsShortcut(){ return kind==='ya'||kind==='vk' },
  supportsReminders(){ return kind==='vk' },
  supportsLb(){ return kind==='ya'||kind==='vk' },
  async subscribe(){
    if(kind==='vk'){
      const r=await window.VK.allowMessages(window.VK.groupId,'bb');
      if(r&&r.ok) return {ok:true,kind:'msg'};
      const n=await window.VK.notify(); return {ok:!!(n&&n.ok),kind:'notify'};
    }
    if(kind==='ya'){ const r=await A.shortcut(); return {ok:!!(r&&r.ok),kind:'shortcut'} }
    return {ok:false,why:'dev'};
  },
  async fav(){
    if(kind==='vk'){ const r=await window.VK.fav(); return {ok:!!(r&&r.ok)} }
    if(kind==='ya'){ const r=await A.shortcut(); return {ok:!!(r&&r.ok)} }
    return {ok:false,why:'dev'};
  },
  async invite(){
    if(kind==='vk'){ const r=await window.VK.invite(); if(r&&r.ok) return true }
    return false;
  },
  share(t,x){ if(kind==='dev') return Promise.resolve(false); return A.share(t,x) },
  async lbBox(score){
    if(kind==='vk'){ return window.VK.lbBox(score) }
    return false;
  },
  /* ---- misc ---- */
  taptic(k){ haptic(k) },
  track(e,p){ try{ if(kind==='vk') window.VK.track(e,p) }catch(e){}
    try{ if(kind==='ya') yaTrack(e,p,false) }catch(e){}
    try{ window.__bblog=window.__bblog||[]; if(window.__bblog.length<400)window.__bblog.push([e,now(),p||0]) }catch(e){} },
  trackOnce(e){ try{ if(kind==='ya') return yaTrack(e,null,true) }catch(err){} return false },
  funnel(){ try{ if(kind==='ya'){ yaTrack('session',null,false); yaTrack('first_open',null,true) } }catch(e){} },
  conversionHit(e){ try{ if(kind==='vk') window.VK.conversionHit(e) }catch(e){} },
  /* visibility: pause gameplay when the page/tab is hidden */
  onVisibility(cb){
    try{
      document.addEventListener('visibilitychange',()=>cb(!document.hidden));
      if(kind==='ya'&&ysdk&&ysdk.visibility){
        if(ysdk.visibility.onHide)ysdk.visibility.onHide(()=>cb(false));
        if(ysdk.visibility.onShow)ysdk.visibility.onShow(()=>cb(true));
      }
    }catch(e){}
  },
  pageHide(){ try{ A.cloudFlush() }catch(e){} }
};
/* Outside the Yandex iframe the SDK throws "No parent to post message" from
   internal async calls; swallow only that noise so the console stays clean. */
window.addEventListener('unhandledrejection',ev=>{
  try{ const m=String((ev.reason&&(ev.reason.message||ev.reason))||'');
    if(/no parent to post message|postToParent|NotReadableError/i.test(m)){ ev.preventDefault(); }
  }catch(e){}
},true);

/* вибрация разрешена браузером только после первого жеста пользователя */
P._gest=false;
try{window.addEventListener('pointerdown',()=>{P._gest=true},{once:true,passive:true});
    window.addEventListener('keydown',()=>{P._gest=true},{once:true})}catch(e){}

window.P=P; window.YSDK=()=>ysdk;
})();
