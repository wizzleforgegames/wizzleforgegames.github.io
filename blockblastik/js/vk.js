(function(){
/* VK Bridge adapter (v3 browser build) with safe fallbacks — works outside VK too */
const BRIDGE_URLS=[
  'https://unpkg.com/@vkontakte/vk-bridge@3.0.2/dist/browser.min.js',
  'https://cdn.jsdelivr.net/npm/@vkontakte/vk-bridge@3.0.2/dist/browser.min.js',
  'https://unpkg.com/@vkontakte/vk-bridge/dist/sdk.min.js'
];
let bridge=null, inVK=false, user=null, noAds=false, appId=0, groupId=0, sup={};
function detect(){
  try{
    const p=new URLSearchParams(location.search);
    appId=parseInt(p.get('vk_app_id')||p.get('app_id')||String(window.VK_PLAY_APP_ID||'0'),10)||0;
    groupId=parseInt(p.get('group_id')||'0',10)||0;
    const ref=(document.referrer||''), host=location.hostname||'';
    const vkHost=/(vkplay\.ru|play\.vk\.com|game\.mail\.ru|odnoklassniki\.ru|(^|\.)vk\.com)$/i;
    inVK = !!(appId||window.__vkit||vkHost.test(ref)||vkHost.test(host)||/[?&](vk|vkplay)=1/.test(location.search)||/VKApp|vkWebView|MyGamesApp|VKPlay/i.test(navigator.userAgent));
  }catch(e){}
}
function loadOne(u){
  return new Promise(res=>{
    const s=document.createElement('script'); s.src=u; s.async=true; s.crossOrigin='anonymous';
    s.onload=()=>res(!!(window.vkBridge||window.vkConnect));
    s.onerror=()=>{ s.remove(); res(false); };
    document.head.appendChild(s);
    setTimeout(()=>res(!!(window.vkBridge||window.vkConnect)),4000);
  });
}
async function loadBridge(){
  for(const u of BRIDGE_URLS){
    if(await loadOne(u)){ bridge=window.vkBridge||window.vkConnect||null; if(bridge)return true; }
  }
  return false;
}
async function send(m,p,ms){
  if(!bridge||!inVK)return {ok:false,why:'off'};
  try{
    const pr=bridge.send(m,p||{}).then(d=>({ok:true,data:d}),e=>({ok:false,err:(e&&(e.error_reason||e.error_msg))||String(e)}));
    const to=new Promise(r=>setTimeout(()=>r({ok:false,why:'timeout'}),ms||10000));
    return await Promise.race([pr,to]);
  }catch(e){ return {ok:false,err:String(e)}; }
}
async function supports(m){
  if(!bridge)return false;
  if(m in sup)return sup[m];
  try{ if(bridge.supportsAsync){ sup[m]=await bridge.supportsAsync(m); return sup[m]; } }catch(e){}
  try{ if(bridge.supports){ sup[m]=!!bridge.supports(m); return sup[m]; } }catch(e){}
  sup[m]=true; return true;
}
let lastRewardAt=0;
/* --- simulated ad for dev / non-VK --- */
function simAd(kind){
  return new Promise(res=>{
    const d=document.createElement('div'); d.className='adsim';
    d.innerHTML='<div class="in"><div class="ad">'+(kind==='rewarded'?'AD · 5s':'AD')+'</div><div class="tm">'+(kind==='rewarded'?'5':'3')+'</div></div>';
    document.body.appendChild(d);
    let t=(kind==='rewarded'?5:3);
    const iv=setInterval(()=>{t--; const e=d.querySelector('.tm'); if(e)e.textContent=t;
      if(t<=0){clearInterval(iv);d.remove();res({ok:true,sim:true});}},1000);
  });
}
const VK={
  get inVK(){return inVK}, get user(){return user}, get appId(){return appId}, get groupId(){return groupId},
  get noAds(){return noAds}, setNoAds(v){noAds=!!v},
  async init(){
    detect();
    /* outside VK we do not load a third-party bridge at all (Yandex / dev) */
    let vkHost=false; try{ vkHost=/(^|\.)(vk\.com|vkplay\.ru|vk\.me)$/i.test(location.hostname) }catch(e){}
    if(!inVK && !vkHost) return false;
    const ok=await loadBridge();
    if(!ok||!bridge)return false;
    const i=await send('VKWebAppInit',{},4000);
    inVK = inVK || !!i.ok;
    if(inVK){
      const r=await send('VKWebAppGetUserInfo',{},6000);
      if(r.ok&&r.data)user=r.data;
      if(!appId){ const lp=await send('VKWebAppGetLaunchParams',{},4000);
        if(lp.ok&&lp.data)appId=parseInt(lp.data.appId||lp.data.app_id||'0',10)||0; }
    }
    return inVK;
  },
  /* ---------- REWARDED ---------- */
  async rewarded(reason){
    const out=await VK._rewarded(reason);
    if(out&&out.ok)lastRewardAt=Date.now();
    return out;
  },
  get lastRewardAt(){return lastRewardAt},
  async _rewarded(reason){
    if(noAds)return {ok:true,skipped:true};
    if(inVK&&bridge){
      if(await supports('VKWebAppShowNativeAds')){
        const r=await send('VKWebAppShowNativeAds',{ad_format:'reward'},90000);
        if(r.ok)return {ok:true};
        if(r.why==='timeout')return {ok:false,why:'timeout'};
      }
      const r2=await send('VKWebAppShowRewarded',{},90000);
      if(r2.ok)return {ok:true};
      return {ok:false,err:r2.err||r2.why};
    }
    return simAd('rewarded');
  },
  async hasRewarded(){
    if(noAds)return true;
    if(!inVK||!bridge)return true;
    const r=await send('VKWebAppCheckNativeAds',{ad_format:'reward'},5000);
    if(r.ok)return !!(r.data&&r.data.result!==false);
    return true;
  },
  /* ---------- INTERSTITIAL ---------- */
  async interstitial(){
    if(noAds||!inVK||!bridge)return {ok:false};
    const r=await send('VKWebAppShowNativeAds',{ad_format:'interstitial'},60000);
    return r.ok?{ok:true}:{ok:false,err:r.err||r.why};
  },
  /* ---------- BANNER ---------- */
  async banner(show){
    if(!inVK||!bridge)return;
    if(show){
      let r=await send('VKWebAppShowBannerShow',{banner_style:'promobanner',location:'bottom'},5000);
      if(!r.ok) r=await send('VKWebAppShowBannerAd',{banner_location:'bottom',banner_align:'center',height_type:'compact',can_close:false},5000);
      return r.ok;
    }
    let r=await send('VKWebAppShowBannerHide',{},5000);
    if(!r.ok) r=await send('VKWebAppHideBannerAd',{},5000);
    return r.ok;
  },
  /* ---------- SHARE ---------- */
  async share(title,text,image,link){
    if(inVK&&bridge){
      const r=await send('VKWebAppShowWallPostBox',{message:(title?title+'\n':'')+(text||''),attach:undefined},20000);
      if(r.ok)return true;
      const r2=await send('VKWebAppShare',{link:link||location.href},20000);
      if(r2.ok)return true;
    }
    try{ if(navigator.share){await navigator.share({title,text,url:link||location.href});return true;} }catch(e){}
    try{ await navigator.clipboard.writeText(link||location.href); }catch(e){}
    return false;
  },
  /* ---------- RETENTION ---------- */
  async fav(){ return send('VKWebAppAddToFavorites',{},10000); },
  async a2hsInfo(){ return send('VKWebAppAddToHomeScreenInfo',{},6000); },
  async a2hs(){ return send('VKWebAppAddToHomeScreen',{},10000); },
  async allowMessages(gid,key){
    if(!gid)gid=groupId||0;
    if(!gid)return {ok:false,why:'nogroup'};
    const j=await send('VKWebAppJoinGroup',{group_id:gid},10000);
    const a=await send('VKWebAppAllowMessagesFromGroup',{group_id:gid,key:key||'bb'},10000);
    return {ok:!!(a.ok||j.ok)};
  },
  async notify(){ return send('VKWebAppAllowNotifications',{},10000); },
  async invite(){ return send('VKWebAppShowInviteBox',{},20000); },
  async lbBox(userResult){
    if(!inVK||!bridge)return false;
    const r=await send('VKWebAppShowLeaderBoardBox',{user_result:Math.max(0,Math.round(userResult||0))},20000);
    return !!r.ok;
  },
  async recommend(){ return send('VKWebAppRecommend',{},10000); },
  taptic(kind){
    if(!inVK||!bridge)return;
    if(kind==='heavy')send('VKWebAppTapticImpactOccurred',{style:'heavy'},2000);
    else if(kind==='light')send('VKWebAppTapticImpactOccurred',{style:'light'},2000);
    else if(kind==='success')send('VKWebAppTapticNotificationOccurred',{type:'success'},2000);
    else if(kind==='warning')send('VKWebAppTapticNotificationOccurred',{type:'warning'},2000);
    else send('VKWebAppTapticSelectionChanged',{},2000);
  },
  /* ---------- ANALYTICS ---------- */
  track(event,payload){
    if(!inVK||!bridge)return;
    send('VKWebAppTrackEvent',{event_name:String(event),event_params:payload||{}},4000);
    try{ window.__bblog=window.__bblog||[]; if(window.__bblog.length<400)window.__bblog.push([event,Date.now(),payload||0]); }catch(e){}
  },
  conversionHit(event){ if(inVK&&bridge)send('VKWebAppConversionHit',{event:String(event)},4000).catch(()=>{}); },
  /* ---------- CLOUD SAVE (VK Play storage) ---------- */
  async cloudGet(){
    if(!inVK||!bridge)return null;
    const r=await send('VKWebAppStorageGet',{keys:['bb_save']},8000);
    if(!r.ok)return null;
    const items=(r.data&&(r.data.items||r.data.list))||[];
    const it=items.find(x=>x&&x.key==='bb_save');
    if(!it||!it.value)return null;
    try{const o=JSON.parse(it.value);return (o&&typeof o==='object')?o:null}catch(e){return null}
  },
  cloudSet(obj){
    if(!inVK||!bridge||!obj)return false;
    let v='';try{v=JSON.stringify(obj)}catch(e){return false}
    if(v.length>60000)return false;
    send('VKWebAppStorageSet',{key:'bb_save',value:v},8000);
    return true;
  },
  /* ---------- PAYMENTS ---------- */
  async pay(item,amount){
    /* VK Play: сначала нормальный платёжный фрейм площадки (paymentFrame из
       mailru.core.js, его ставит js/vk-adapter.js), потом старый VK Games путь */
    try{
      if(window.VK_PLAY&&window.VK_PLAY.pay&&typeof window.VK_PLAY.pay.buy==='function'){
        const r=await window.VK_PLAY.pay.buy({id:String(item),amount:Number(amount)||0,title:String(item)});
        if(r&&r.success)return {ok:true,data:r};
        if(r&&r.canceled)return {ok:false,canceled:true};
      }
    }catch(e){console.warn('[VK] paymentFrame:',e)}
    if(!inVK||!bridge)return {ok:false};
    const r=await send('VKWebAppShowOrderBox',{type:'item',item:String(item)},60000);
    if(r.ok&&r.data&&r.data.status&&r.data.status!=='cancelled')return {ok:true,data:r.data};
    if(r.ok&&!r.data)return {ok:true,data:{}};
    const p=await send('VKWebAppOpenPayForm',{app_id:appId,action:'buy_item',
      params:{item:String(item),amount:String(amount),force_payment_type:'votes'}},60000);
    return p.ok?{ok:true,data:p.data}:{ok:false,err:p.err||p.why};
  },
  async purchases(){ if(!inVK||!bridge)return {ok:false}; return send('VKWebAppGetPurchases',{},8000); },
  openApp(){ if(inVK&&bridge&&appId)send('VKWebAppOpenApp',{app_id:appId,location:'app'}); },
  async setLeaderScore(score){
    if(!inVK||!bridge)return false;
    const r=await send('VKWebAppSetLeaderScore',{score:String(Math.max(0,Math.round(score))),public:true},8000);
    return !!r.ok;
  },
  async topFriends(count){
    if(!inVK||!bridge)return [];
    let r=await send('VKWebAppGetLeaderboard',{type:'friends',count:count||20,extended:true},12000);
    if(!r.ok) r=await send('VKWebAppGetLeaderboard',{type:'total',count:count||20,extended:true},12000);
    if(!r.ok)return [];
    const d=r.data||{}; const items=d.items||d.users||[]; const out=[];
    items.forEach((it,i)=>{
      const u=it.user||(it.user_id&&{id:it.user_id})||{};
      out.push({rank:it.rank||i+1,name:u.first_name||(u.id?'VK'+u.id:'—'),id:u.id,score:it.score||0,me:!!(u.id&&user&&u.id===user.id)});
    });
    if(user&&!out.some(o=>o.me))out.push({rank:0,name:(user.first_name||'Вы'),id:user.id,score:0,me:true});
    return out;
  },
  async getFriends(count){
    if(!inVK||!bridge)return [];
    const r=await send('VKWebAppGetFriends',{count:count||8,fields:'first_name,photo_100'},30000);
    if(!r.ok)return [];
    const list=(r.data&&(r.data.items||r.data.users))||[];
    return list.map(u=>({id:u.id,name:u.first_name||'друг'}));
  },
};
window.VK=VK;
})();
