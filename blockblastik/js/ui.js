/* ================= BlockBlastik UI ================= */
(function(){
const {G,S,PU_COST}=BB;
const HINT_COST=BB.HINT_COST||90;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const modals=$('#modals');
const IXRE=/\{([a-z][a-z0-9\-]*)\}/g;
const VER='3.7.3';
function ix(h){return String(h).replace(IXRE,(m,n)=>'<svg class="ic"><use href="#i-'+n+'"/></svg>')}
let openSheet=null, hubTab='rewards', adWas=false, reviewOk=null;

/* ---------- toasts ---------- */
function esc(x){return String(x==null?'':x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function toastAnchor(){
  let t=96;const h=document.getElementById('hud'),m=document.getElementById('modes');
  let wide=false;
  try{const L=window.BB&&BB.getLayout&&BB.getLayout();wide=!!(L&&L.wide)}catch(e){}
  if(wide){
    if(m){const r=m.getBoundingClientRect();if(r.bottom>40)t=Math.round(r.bottom+10)}
    try{const cv=document.getElementById('cv'),L=window.BB&&BB.getLayout&&BB.getLayout();
      if(cv&&L){const bt=cv.getBoundingClientRect().top+L.by;
        if(t+46>bt)t=Math.max(40,Math.round(bt-52));}}catch(e){}
  }else if(h){const r=h.getBoundingClientRect();
    if(r.bottom>60&&r.bottom<window.innerHeight*0.58)t=Math.round(r.bottom+8);}
  else if(m){const r=m.getBoundingClientRect();if(r.top>10&&r.top<window.innerHeight*0.5)t=Math.round(r.bottom+10)}
  const corner=!!(wide&&window.innerWidth>=640&&
    document.body.classList.contains('playing')&&!document.body.classList.contains('modal-open'));
  document.body.classList.toggle('toast-corner',corner);
  if(corner){
    const br=document.querySelector('#topbar .brand-txt')||document.querySelector('#topbar .logo'),rs=document.querySelector('#topbar .res');
    const a=br?br.getBoundingClientRect():{right:0},c=rs?rs.getBoundingClientRect():{left:window.innerWidth};
    const left=Math.round(a.right+8),right=Math.round(c.left-8);
    const w=Math.max(120,Math.min(206,right-left));
    document.documentElement.style.setProperty('--tcx',Math.round(left+(right-left)/2)+'px');
    document.documentElement.style.setProperty('--tw',w+'px');
  }
  document.documentElement.style.setProperty('--tt',t+'px');
}
window.addEventListener('resize',toastAnchor);
try{const __ro=new ResizeObserver(()=>toastAnchor());
  ['hud','modes','duelHud'].forEach(id=>{const e=document.getElementById(id);if(e)__ro.observe(e)});}catch(e){}
function toast(ic,title,sub,key){
  toastAnchor();
  const box=$('#toasts'); if(!box)return;
  const kk=String(key||title).replace(/[^a-z0-9_]/gi,'');
  const ex=box.querySelector('[data-k="'+kk+'"]');
  if(ex){const b=ex.querySelector('b');if(b)b.innerHTML=ix(title);
    const sp=ex.querySelector('span');if(sp&&sub)sp.innerHTML=ix(sub);
    ex.classList.remove('out');clearTimeout(ex._t);
    ex._t=setTimeout(()=>{ex.classList.add('out');setTimeout(()=>ex.remove(),320)},2400);return;}
  while(box.firstChild)box.firstChild.remove();
  if(document.body.classList.contains('modal-open'))document.body.classList.add('toast-top');
  const d=document.createElement('div');d.className='toast';
  d.dataset.k=kk;
  d.innerHTML=ix('<div class="ic">'+ic+'</div><div class="tx"><b>'+title+'</b>'+(sub?'<span>'+sub+'</span>':'')+'</div>');
  const _tb=box;_tb.appendChild(d);
  while(_tb.children.length>2)_tb.removeChild(_tb.firstChild);
  d._t=setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),320)},2400);
}

/* ---------- modal ---------- */
function nf(n){return (n||0).toLocaleString(I18N.lang==='ru'?'ru-RU':'en-US')}
function open(html,opts){
  opts=opts||{};
  closeSilent();
  const sc=document.createElement('div');sc.className='scrim';
  const sh=document.createElement('div');sh.className='sheet'+(opts.cls?' '+opts.cls:'');
  sh.innerHTML=(opts.noClose?'':'<button class="x" data-close>'+ix('{x}')+'</button>')+ix(html);
  sc.appendChild(sh);modals.appendChild(sc);openSheet=sc;openSheet._sticky=!!opts.sticky;document.body.classList.add('modal-open');
  sc.addEventListener('click',e=>{if(e.target===sc&&!opts.sticky&&opts.onResume)opts.onResume()});
  sc.addEventListener('click',e=>{if(e.target===sc&&!opts.sticky)close();});
  sh.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
  return sh;
}
function closeSilent(){if(openSheet){openSheet.remove();openSheet=null;
  if(!modals.querySelector('.scrim'))document.body.classList.remove('modal-open')}}
function close(){if(openSheet){openSheet.remove();openSheet=null;
  if(!modals.querySelector('.scrim')){document.body.classList.remove('modal-open');
    /* окно, открытое из главного меню, не должно «прятать» меню за собой */
    if(!document.body.classList.contains('playing')){
      if(WHEEL_FROM==='menu'){WHEEL_FROM=null;showMenu(true)}
      else if(SKINS_FROM==='menu'){SKINS_FROM=null;showMenu(true)}}}}}

/* ---------- hud ---------- */
function blastTap(){
  if(!G.running||G.over){AUDIO.ui('tap');return}
  if(BB.blast())return;
  AUDIO.ui('tap');
  const m=BB.blastMeter();
  if(m.turns>0)toast('{sparkles}',I18N.t('blast.x2'),'×'+m.turns,'blastx2');
  else toast('{sparkles}',I18N.t('blast.charge').replace('{a}',m.v).replace('{b}',m.max),I18N.t('blast.hint'),'blastcharge');
}
function syncHud(){
  if(duel&&duel.iv&&$('#duelLines'))duelHud();
  const _sn=$('#scoreNum');const _pv=parseInt(_sn.dataset.v||'0',10);
  _sn.textContent=G.score.toLocaleString(I18N.lang==='ru'?'ru-RU':'en-US');_sn.dataset.v=G.score;
  if(G.score>_pv){_sn.classList.remove('bump');void _sn.offsetWidth;_sn.classList.add('bump')}
  $('#bestNum').textContent=nf(S.best[G.mode]||0);
  $('#coinNum').textContent=nf(S.coins);
  $('#lvlNum').textContent=S.level;
  $('#xpFill').style.width=Math.min(100,Math.round(S.xp/xpNeed()*100))+'%';
  const cb=$('#comboBox');
  if(G.combo>=2){cb.classList.add('on');$('#comboNum').textContent='×'+G.combo}else cb.classList.remove('on');
  const bf=$('#blastFill');const pct=Math.round(G.blast/(G.blastMax||10)*100);
  bf.style.width=pct+'%';
  const bx=$('#blastBox');
  if(bx){bx.classList.toggle('full',G.blast>=(G.blastMax||10)||G.blastTurns>0);
    bx.classList.toggle('near',pct>=55&&G.blastTurns<=0);
    const bn=$('#blastN');
    if(bn)bn.textContent=G.blastTurns>0?('×'+G.blastTurns):'';}
  const bb=$('#btnBlast');
  if(bb){
    const rdy=!!(G.blastReady&&G.blastTurns<=0);
    const f2=$('#bbFill');if(f2)f2.style.width=Math.min(100,pct)+'%';
    bb.classList.toggle('ready',rdy);
    bb.classList.toggle('full',G.blastTurns>0);
    bb.classList.toggle('rescue',!!(G.rescue&&rdy));
    const rh=$('#rescueHint'); if(rh){rh.hidden=!(G.rescue&&rdy); if(!(G.rescue&&rdy))rh.removeAttribute('style');}
    const bn2=$('#bbN');
    if(bn2)bn2.textContent=G.blastTurns>0?('×2·'+G.blastTurns):(rdy?'×2':pct+'%');
    bb.setAttribute('aria-label',rdy?I18N.t('blast.ready'):I18N.t('blast.charge').replace('{a}',G.blast).replace('{b}',G.blastMax||10));
  }
  const bx3=$('#blastBox');if(bx3)bx3.classList.toggle('clickable',!!(G.blastReady&&G.blastTurns<=0));
  const sc2=$('#setupChip');
  if(sc2){$('#setupTxt').textContent=BB.G.N+'×'+BB.G.N;
    $('#setupDiff').textContent=I18N.t('diffs.'+(G.tier||1)).toUpperCase();
    sc2.classList.toggle('glow',!!S.seenUnlock);
    const tn=BB.tension?BB.tension():99;
    sc2.classList.toggle('danger',!!G.running&&tn>0&&tn<=3);}
  const hs=$('#hudStats');
  if(hs&&hs.offsetParent!==null){
    $('#hsLines').textContent=nf(G.linesThisGame||0);
    $('#hsCombo').textContent='×'+(G.maxComboThis||0);
    $('#hsBlasts').textContent=nf(G.blastsThisGame||0);
    $('#hsBest').textContent=nf(S.best[G.mode]||0);
    $('#hsLines2').textContent=nf(S.stats.lines||0);
    $('#hsGames').textContent=nf(S.stats.games||0);
    const q=S.rg;
    if(q){$('#hsGoalL').textContent=I18N.t('goal.'+q.id);
      $('#hsGoal').textContent=(q.id==='combo'?'×':'')+Math.min(q.prog,q.target)+(q.id==='combo'?'/×':'/')+q.target+(q.done?' ✓':'');}
  }
  duelHudVis();
  const tb=$('#timerBox');
  if(tb){const show=(G.mode==='sprint');tb.classList.toggle('on',show);
    if(show){$('#timerNum').textContent=Math.max(0,G.timeLeft);tb.classList.toggle('low',G.timeLeft<=10)}}
  const brow=$('#bonusRow');
  if(brow){const on=!!(G.bonus&&G.running&&!G.over);brow.hidden=!on;
    if(on){const pt=$('#bonusPill');if(pt)pt.textContent=I18N.t('bonus.hud')+' · '+Math.max(0,G.timeLeft);
      const ad=$('#bonusAd');
      if(ad){const can=G.bonusAd<1;ad.hidden=!can;
        if(can){const at=$('#bonusAdT');if(at)at.textContent=I18N.t('bonus.ad')}}}}
  const ms=$('#mstat');
  if(G.mode==='sprint'&&G.running)ms.textContent='';
  else if(G.mode==='daily'){
    const pl=(S.daily.date===today()&&S.daily.played);
    ms.innerHTML=pl?(ix('{check}')+' '+(S.daily.best||0)+' · '+ix('{clock}')+'<b id="dcd">'+fmtLeft(nextDailyMs())+'</b>'):('#'+dayNum(today()));
  }
  else ms.textContent='';
  ['hammer','swap','bomb'].forEach(k=>{
    const b=$('#pu'+k.charAt(0).toUpperCase()+k.slice(1));
    const ce=$('#c'+k.charAt(0).toUpperCase()+k.slice(1));
    const ad=S.coins<PU_COST[k]&&puAdLeft()>0&&G.running&&!G.over;
    if(ce)ce.innerHTML=ad?('<s>'+PU_COST[k]+'</s>AD'):(''+PU_COST[k]);
    b.classList.toggle('poor',S.coins<PU_COST[k]);
    b.classList.toggle('armed',BB.armed===k);
    b.classList.toggle('adfree',ad);
  });
  ['hammer','swap','bomb','hint'].forEach(k=>{
    const b=$('#pu'+k.charAt(0).toUpperCase()+k.slice(1));
    if(b)b.title=I18N.t('pu.'+k)+' · '+(k==='hint'?HINT_COST:PU_COST[k])+' {bolt}'.replace('{bolt}','');
  });
  const hb=$('#puHint');
  const had=S.coins<HINT_COST&&hintAdLeft()>0&&G.running&&!G.over;
  if(hb){hb.classList.toggle('poor',S.coins<HINT_COST);hb.classList.toggle('adfree',had);}
  const hce=$('#cHint'); if(hce)hce.innerHTML=had?('<s>'+HINT_COST+'</s>AD'):(''+HINT_COST);
  const chb=$('#btnChest'); if(chb)chb.classList.toggle('ready',chestReady());
  const dt=document.querySelector('.mtab[data-mode="daily"]');
  if(dt){const played=(S.daily.date===today()&&S.daily.played);
    let d=dt.querySelector('.dot');
    if(!played&&!d){d=document.createElement('i');d.className='dot';dt.appendChild(d)}
    if(played&&d)d.remove();}
}
function syncArmed(a){
  ['hammer','swap','bomb'].forEach(k=>{
    const b=$('#pu'+k.charAt(0).toUpperCase()+k.slice(1));
    b.classList.toggle('armed',a===k);
  });
}

/* ---------- skins ---------- */
function skinState(sk){
  if(sk.id===(S.skin||'neon'))return 'on';
  if((S.skins||[]).indexOf(sk.id)>=0)return 'own';
  if(sk.pass&&!S.golden)return 'pass';
  if(sk.lvl>0)return S.level>=sk.lvl?'free':'lvl';
  return 'buy';
}
function equipSkin(id){
  S.skin=id;S.trial={id:'',games:0};BB.applySkin();BB.save();AUDIO.click();
  toast('{palette}',I18N.t('skin.equipped'),I18N.t('skin.n.'+id));openSkins();
}
function buySkin(id){
  const sk=BB.skinById(id);
  if(S.golden&&sk.pass){S.skins=S.skins||[];S.skins.push(id);equipSkin(id);return}
  if(S.coins<sk.price){toast('{bolt}',I18N.t('toast.nocoin'));return}
  S.coins-=sk.price;S.skins=S.skins||[];S.skins.push(id);
  AUDIO.reward();toast('{sparkles}',I18N.t('skin.bought'),I18N.t('skin.n.'+id));
  P.track('skin_buy',{skin:id});equipSkin(id);
}
async function trySkin(id){
  const r=await P.rewarded('skin');
  if(!r.ok){toast('{bolt}',I18N.t('toast.adfail'));return}
  S.trial={id:id,games:3};BB.applySkin();BB.save();AUDIO.reward();
  toast('{sparkles}',I18N.t('skin.trialOn'),I18N.t('skin.n.'+id));
  openSkins();
}
function trialOver(){toast('{palette}',I18N.t('skin.trialEnd'))}
let SKINS_FROM=null;
function openSkins(from){
  if(from)SKINS_FROM=from;
  const tr=(S.trial&&S.trial.games>0)?S.trial:null;
  let h='{palette} <h2 style="display:inline">'+I18N.t('skin.title')+'</h2><div class="sub">'+I18N.t('skin.sub')+'</div>';
  if(tr)h+='<div class="card" style="margin-top:8px"><div class="kv"><span class="k">{sparkles} '+I18N.t('skin.trial')+
    ' · '+I18N.t('skin.n.'+tr.id)+'</span><span class="v" style="color:var(--lm)">'+I18N.t('skin.trialLeft',{n:tr.games})+'</span></div></div>';
  h+='<div class="skgrid">';
  BB.SKINS.forEach(sk=>{
    const st=skinState(sk);let act='';
    if(st==='on')act='<div class="pill cy">{check} '+I18N.t('skin.on')+'</div>';
    else if(st==='own')act='<button class="btn p sm" data-ske="'+sk.id+'">'+I18N.t('skin.equip')+'</button>';
    else if(st==='free')act='<button class="btn g sm" data-skg="'+sk.id+'">'+I18N.t('skin.get')+'</button>';
    else if(st==='buy')act='<button class="btn g sm" data-skb="'+sk.id+'">'+sk.price+' {bolt}</button>';
    else if(st==='lvl')act='<div class="pill">{lock} '+I18N.t('skin.lvl',{n:sk.lvl})+'</div>';
    else if(st==='pass')act='<div class="pill am">{crown} '+I18N.t('skin.pass')+'</div>';
    const tr2=(st==='lvl'||st==='pass'||st==='buy'||st==='free')
      ?'<button class="btn o sm" data-skt="'+sk.id+'">{player-play} '+I18N.t('skin.try')+'</button>':'';
    h+='<div class="skc'+(st==='on'?' on':'')+'"><canvas class="skpv" data-skp="'+sk.id+'"></canvas>'+
      '<b>'+I18N.t('skin.n.'+sk.id)+'</b><div class="skrow">'+act+tr2+'</div></div>';
  });
  h+='</div>';
  if((S.skins||[]).length<BB.SKINS.length-1)h+='<div class="card" style="margin-top:12px"><div class="kv"><div><b style="font-size:13.5px">{palette} '+I18N.t('shop.skinpack')+'</b>'+
    '<div style="font-size:11.5px;color:var(--ink3)">'+I18N.t('shop.skinpack.sub')+'</div></div>'+
    '<button class="btn g sm" data-buy="skinpack">'+ptxt('skinpack')+'</button></div></div>';
  const sh=open(h,{cls:'wide',onResume:()=>{if(SKINS_FROM==='menu'){SKINS_FROM=null;showMenu(true)}}});
  const _sxb=sh.querySelector('[data-close]');
  if(_sxb)_sxb.onclick=()=>{const back=SKINS_FROM==='menu';SKINS_FROM=null;close();if(back)showMenu(true)};
  sh.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
  sh.querySelectorAll('[data-skp]').forEach(cv=>BB.drawSkinPreview(cv,cv.dataset.skp));
  sh.querySelectorAll('[data-ske]').forEach(b=>b.onclick=()=>equipSkin(b.dataset.ske));
  sh.querySelectorAll('[data-skg]').forEach(b=>b.onclick=()=>{S.skins=S.skins||[];S.skins.push(b.dataset.skg);AUDIO.reward();equipSkin(b.dataset.skg)});
  sh.querySelectorAll('[data-skb]').forEach(b=>b.onclick=()=>buySkin(b.dataset.skb));
  sh.querySelectorAll('[data-skt]').forEach(b=>b.onclick=()=>trySkin(b.dataset.skt));
}
/* ---------- level ---------- */
function xpNeed(){return 400+(S.level-1)*260}
let lastLevelUp=0,lastLevelDur=1800;
function showLevelUp(lvl,unlocks){
  const old=document.getElementById('lvlup'); if(old)old.remove();
  const d=document.createElement('div'); d.id='lvlup';
  let conf='';
  for(let i=0;i<26;i++){
    const c=['#3FE3FF','#FF5BD4','#9BFF4D','#FFC13D','#8B6CFF'][i%5];
    conf+='<i style="left:'+(2+i*3.7).toFixed(1)+'%;top:'+(8+Math.random()*26).toFixed(1)+
      '%;width:'+(6+Math.round(Math.random()*5))+'px;height:'+(10+Math.round(Math.random()*9))+
      'px;background:'+c+';animation-delay:'+(Math.random()*0.35).toFixed(2)+
      's;--dx:'+Math.round(Math.random()*160-80)+'px;--dr:'+Math.round(Math.random()*520-260)+'deg"></i>';
  }
  d.innerHTML='<div class="lu-in"><div class="lu-lab">'+I18N.t('lvlup.level')+'</div><div class="lu-n">'+lvl+'</div>'+
    (unlocks.length?'<div class="lu-un">'+unlocks.slice(0,3).map(u=>'<span>'+ix(u[2])+' '+u[3]+'</span>').join('')+
      (unlocks.length>3?'<span class="lu-more">+'+(unlocks.length-3)+'</span>':'')+'</div>':'')+
    '</div>'+conf;
  document.body.appendChild(d);
  try{window.BG&&BG.pulse('255,193,61')}catch(e){}
  setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),500)},unlocks.length?2800:1800);
}
function checkLevel(){
  let up=false,newLvl=S.level;
  while(S.xp>=xpNeed()){S.xp-=xpNeed();S.level++;S.coins+=60+S.level*15;up=true;newLvl=S.level}
  if(!up)return;
  AUDIO.levelup();P.track('level_up',{level:S.level});pushStats(true);
  S.unlockedShown=S.unlockedShown||{};
  const U=BB.UNLOCK;
  const marks=[['grid9',BB.maxGrid()>=9&&S.level>=U.grid9,'{layout-grid}',I18N.t('unlock.grid',{g:I18N.t('grid.9')})],
               ['grid10',BB.maxGrid()>=10&&S.level>=U.grid10,'{layout-grid}',I18N.t('unlock.grid',{g:I18N.t('grid.10')})],
               ['diff2',S.level>=U.diff2,'{flame}',I18N.t('unlock.diff',{d:I18N.t('diff.2')})],
               ['diff3',S.level>=U.diff3,'{flame}',I18N.t('unlock.diff',{d:I18N.t('diff.3')})],
               ['diff4',S.level>=U.diff4,'{flame}',I18N.t('unlock.diff',{d:I18N.t('diff.4')})]];
  BB.SKINS.forEach(sk=>{if(sk.lvl>0&&S.level>=sk.lvl&&(S.skins||[]).indexOf(sk.id)<0&&S.skin!==sk.id){
      marks.push(['skin_'+sk.id,true,'{palette}',I18N.t('unlock.skin',{s:I18N.t('skin.n.'+sk.id)})])}});
  if([5,10,20,30].indexOf(S.level)>=0&&(S.freeze||0)<5){S.freeze=(S.freeze||0)+1;
    marks.push(['frz'+S.level,true,'{shield}',I18N.t('streak.got')]);}
  const got=[];
  marks.forEach(([k,ok,ic,txt])=>{
    if(ok&&!S.unlockedShown[k]){S.unlockedShown[k]=true;got.push([k,ok,ic,txt]);
      if(!S.seenUnlock)S.seenUnlock=true;
    }});
  lastLevelUp=Date.now();lastLevelDur=got.length?2800:1800;
  setTimeout(()=>{AUDIO.reward();showLevelUp(newLvl,got)},260);
  BB.save();
}
function openSetup(){
  const mg=BB.maxGrid(),mt=BB.maxTier();
  const gCur=BB.G.N, tCur=BB.G.tier||1;
  const gs=[8,9,10].filter(g=>g<=Math.max(8,mg));
  const html='<h2>'+I18N.t('setup.title')+'</h2><div class="sub">'+I18N.t('setup.hint')+'</div>'+
   '<div class="card"><div class="kv"><span class="k">'+I18N.t('setup.grid')+'</span><span class="v">'+I18N.t('grid.'+gCur)+'</span></div>'+
   '<div class="seg">'+[8,9,10].map(g=>{const lk=g>mg;
     return '<button data-g="'+g+'" class="'+(g===gCur?'on':'')+(lk?' lock':'')+'"><b>'+I18N.t('grid.'+g)+'</b>'+
       '<span>'+I18N.t('gridm.'+g)+'</span>'+(lk?'<i class="lk">{lock}'+(g===9?BB.UNLOCK.grid9:BB.UNLOCK.grid10)+'</i>':'')+'</button>';}).join('')+'</div></div>'+
   '<div class="card"><div class="kv"><span class="k">'+I18N.t('setup.diff')+'</span><span class="v">'+I18N.t('diff.'+tCur)+'</span></div>'+
   '<div class="seg">'+[1,2,3,4].map(t=>{const lk=t>mt;
     const need=t===2?BB.UNLOCK.diff2:(t===3?BB.UNLOCK.diff3:(t===4?BB.UNLOCK.diff4:1));
     return '<button data-t="'+t+'" class="'+(t===tCur?'on':'')+(lk?' lock':'')+'"><b>'+I18N.t('diff.'+t)+'</b>'+
       '<span>'+I18N.t('diffm.'+t)+'</span>'+(lk?'<i class="lk">{lock}'+need+'</i>':'')+'</button>';}).join('')+'</div></div>'+
   '<div class="row" style="margin-top:12px"><button class="btn p" id="stGo">'+I18N.t('setup.apply')+'</button></div>';
  const sh=open(html);
  let g=gCur,t=tCur;
  sh.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{if(b.classList.contains('lock'))return;
    g=+b.dataset.g;sh.querySelectorAll('[data-g]').forEach(x=>x.classList.toggle('on',x===b))});
  sh.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{if(b.classList.contains('lock'))return;
    t=+b.dataset.t;sh.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b))});
  sh.querySelector('#stGo').onclick=()=>{BB.setSetup(g,t);close();AUDIO.click();syncHud()};
}

/* ---------- streak / chest ---------- */
function today(){return BB.today()}
function chainPos(n){return ((Math.max(1,n|0)-1)%7)+1}
function streakReward(n){return [0,40,60,90,120,160,220,500][Math.max(0,Math.min(7,n|0))]}
function streakPending(){const p=S.streak&&S.streak.pending;return (p&&p.day===today())?p:null}
function touchStreak(){
  const t=today(),last=S.streak.last;
  if(last===t)return;
  const gap=dayNum(t)-dayNum(last||t);
  let broke=false,saved=false;
  if(last&&gap===1){S.streak.n++;}
  else if(last&&gap>1){
    if(gap===2&&(S.freeze||0)>0){S.freeze--;S.streak.n++;saved=true;}
    else{broke=(S.streak.n>=3);
      if(S.streak.n>=3){S.rescue={day:t,n:S.streak.n}}
      S.streak.n=1;}
  }
  else S.streak.n=1;
  S.streak.last=t;
  const pos=chainPos(S.streak.n);
  S.streak.pending={day:t,n:S.streak.n,pos:pos,amt:streakReward(pos),gift:pos===7?1:0};
  BB.save();
  setTimeout(()=>{
    if(!streakPending())return;
    AUDIO.reward();
    if(saved){AUDIO.levelup();toast('{shield}',I18N.t('streak.saved'),I18N.t('streak.left')+' '+(S.freeze||0));}
    else if(broke)toast('{flame}',I18N.t('comeback.title'),I18N.t('comeback.sub'));
    else toast('{gift}',I18N.t('chain.ready'),I18N.t('streak.day')+' '+pos);
    syncMenu(); if(openSheet)renderHub();
  },900);
}
function claimStreak(){
  const p=streakPending();
  if(!p){toast('{flame}',I18N.t('chain.claimed'));return false}
  S.coins+=p.amt; S.streak.pending=null;
  let sub=I18N.t('streak.day')+' '+p.pos;
  if(p.gift){
    S.freeze=Math.min(5,(S.freeze||0)+2);
    const w=wheelState(); w.free=(w.free||0)+1;
    sub=I18N.t('chain.giftGot');
    celebrate(I18N.t('chain.big'),I18N.t('chain.bigSub'),
      '<span>{shield} +2</span><span>{refresh} +1</span><span>{bolt} +'+p.amt+'</span>');
  }
  BB.save(); AUDIO.reward(); try{P.track('streak_claim',{n:p.n,pos:p.pos})}catch(e){}
  toast('{flame}','+'+p.amt+' {bolt}',sub);
  syncMenu(); if(openSheet)renderHub();
  return true;
}
function rescueStrip(){
  if(!rescueReady())return '';
  return '<div class="card rp" style="margin-top:10px"><div class="kv"><span class="k">{flame} '+I18N.t('streak.rescue')+'</span>'+
   '<span class="v" style="color:var(--mg)">'+S.rescue.n+'</span></div>'+
   '<div class="sub" style="margin-top:6px;margin-bottom:0">'+I18N.t('streak.rescueSub',{n:S.rescue.n})+'</div>'+
   '<button class="btn m" style="margin-top:10px;width:100%" data-resc="1">{gift} '+I18N.t('streak.rescueBtn')+'</button></div>';
}
async function doRescue(btn){
  AUDIO.click();
  const r=await P.rewarded('rescue');
  if(r.ok){S.streak.n=S.rescue.n;S.rescue={day:'',n:0};BB.save();AUDIO.levelup();
    toast('{flame}',I18N.t('streak.rescued'),I18N.t('streak.day')+' '+S.streak.n);
    if(btn){const c=btn.closest('.card');if(c)c.remove()}
    if(openSheet)renderHub();}
  else toast('{alert-triangle}',I18N.t('toast.watchad'));
}
function rescueReady(){return !!(S.rescue&&S.rescue.day===today()&&S.rescue.n>0&&S.streak.n<S.rescue.n)}
const BOOST_MAX=2;
function boostState(){S.boost=S.boost||{date:'',n:0,arm:0};
  if(S.boost.date!==today()){S.boost.date=today();S.boost.n=0;S.boost.arm=0}
  return S.boost}
function boostReady(){const b=boostState();return b.n<BOOST_MAX&&!b.arm}
function boostLeft(){return BOOST_MAX-boostState().n}
async function doBoost(src){
  const b=boostState();
  if(b.arm){toast('{sparkles}',I18N.t('boost.on'));return}
  if(b.n>=BOOST_MAX){toast('{bolt}',I18N.t('boost.used'));return}
  const r=await P.rewarded('boost');
  if(!r.ok){toast('{alert-triangle}',I18N.t('toast.watchad'));return}
  b.n++;b.arm=1;BB.save();AUDIO.reward();P.track('ad_reward',{reason:'boost',from:src||''});
  toast('{sparkles}',I18N.t('boost.got'),I18N.t('boost.on'));
  syncMenu(); if(document.getElementById('hBody'))renderHub();
}
function chestReady(){return (S.chest.next||0)<=Date.now()}
function openChest(){
  if(!chestReady())return;
  const base=80+Math.floor(Math.random()*90);
  const sh=open('<h2>'+I18N.t('hub.chest')+'</h2><div class="sub">'+I18N.t('hub.sub')+'</div>'+
    '<div class="bigscore">+'+base+' {bolt}</div>'+
    '<div class="row" style="margin-top:14px"><button class="btn g" id="cGet">'+I18N.t('btn.claim')+'</button>'+
    '<button class="btn m" id="cAd">'+I18N.t('btn.watch')+' ×2</button></div>');
  AUDIO.reward();
  sh.querySelector('#cGet').onclick=()=>{S.coins+=base;S.chest.next=Date.now()+3*3600e3;BB.save();close();syncHud();toast('{bolt}','+'+base,I18N.t('chest.again'))};
  sh.querySelector('#cAd').onclick=async()=>{
    const r=await P.rewarded('chest_x2');
    if(r.ok){S.coins+=base*2;S.chest.next=Date.now()+3*3600e3;BB.save();close();syncHud();
      toast('{bolt}','+'+(base*2),I18N.t('chest.again'))}
    else toast('{alert-triangle}',I18N.t('toast.watchad'));
  };
}

/* ---------- quests ---------- */
const QPOOL=[
 {id:'lines',n:[10,18,30],rw:120},{id:'score',n:[300,500,800],rw:140},
 {id:'place',n:[20,35,55],rw:100},{id:'game',n:[2,3,5],rw:90},
 {id:'combo',n:[3,4,5],rw:150},{id:'pu',n:[2,3,4],rw:110},
 {id:'blast',n:[1,1,2],rw:180},{id:'sprint',n:[1,1,2],rw:100},
 {id:'daily',n:[1,1,1],rw:160}
];
function qText(q){return I18N.t('quest.'+(q.id==='game'?'games':q.id),{n:q.target})}
function genQuests(){
  const t=today();
  if(S.quests.date===t&&S.quests.list.length)return;
  const d=dayNum(t),rng=BB.G?null:null;
  const idx=[0,1,2].map(i=>(d*7+i*13)%QPOOL.length);
  const seen=new Set(); const list=[];
  for(const i of idx){ if(seen.has(QPOOL[i].id))continue; seen.add(QPOOL[i].id);
    const q=QPOOL[i]; const tier=Math.min(2,Math.floor((S.level-1)/3));
    list.push({id:q.id,target:q.n[tier],prog:0,done:false,claimed:false,rw:q.rw+ (tier*40)});
  }
  S.quests={date:t,list}; BB.save();
}
/* ---------- weekly quests ---------- */
const WPOOL=[
 {id:'lines', n:[70,130,210],  rw:[900,1500,2200]},
 {id:'score', n:[6000,12000,20000], rw:[800,1400,2000]},
 {id:'game',  n:[8,14,22],     rw:[700,1200,1800]},
 {id:'blast', n:[2,4,7],       rw:[900,1500,2200]},
 {id:'combo', n:[7,9,11],      rw:[800,1300,1900]},
 {id:'pu',    n:[6,10,16],     rw:[600,1000,1500]},
 {id:'place', n:[90,160,260],  rw:[600,1000,1500]},
 {id:'daily', n:[2,3,5],       rw:[1000,1600,2300]},
 {id:'sprint',n:[2,4,6],       rw:[700,1200,1800]}
];
function weekStart(){const d=new Date();const off=(d.getDay()+6)%7;
  return new Date(d.getFullYear(),d.getMonth(),d.getDate()-off,0,0,0);}
function weekNum(){const m=weekStart();return dayNum(m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0')+'-'+String(m.getDate()).padStart(2,'0'));}
function weekEndMs(){const m=weekStart();return new Date(m.getFullYear(),m.getMonth(),m.getDate()+7,0,0,0)-Date.now();}
function genWQuests(){
  const w=weekNum();
  if(S.wquests&&S.wquests.week===w&&S.wquests.list&&S.wquests.list.length)return;
  const idx=[0,1,2].map(i=>(w*5+i*4)%WPOOL.length);
  const seen=new Set(),list=[];
  for(const i of idx){const q=WPOOL[i];if(seen.has(q.id))continue;seen.add(q.id);
    const tier=Math.min(2,Math.floor((S.level-1)/3));
    list.push({id:q.id,target:q.n[tier],prog:0,done:false,claimed:false,rw:q.rw[tier]});}
  S.wquests={week:w,list};BB.save();
}
function wqClaimable(){return (S.wquests&&S.wquests.list||[]).some(q=>q.done&&!q.claimed)}
const RG={
  lines:{t:[8,13,18],r:[80,130,190]},
  combo:{t:[3,4,6],r:[90,150,240]},
  score:{t:[900,1900,3200],r:[70,120,200]},
  blast:{t:[1,2,3],r:[170,300,430]},
  place:{t:[25,40,55],r:[50,80,110]},
  perfect:{t:[1,1,2],r:[230,340,470]}
};
function rgTier(){return S.level>=12?2:(S.level>=5?1:0)}
function newRunGoal(){
  const t=rgTier(),pool=['lines','combo','score','place','blast'];
  if(S.level>=6)pool.push('perfect');
  const id=pool[Math.floor(Math.random()*pool.length)];
  const g=RG[id];
  const ti=Math.min(t,g.t.length-1);
  S.rg={id:id,target:g.t[ti],prog:0,done:false,rw:g.r[ti]};
  BB.save();syncGoal();
}
function syncGoal(){
  const el=$('#goalBox'); if(!el)return;
  const q=S.rg;
  if(q&&(!q.target||!q.id||!RG[q.id])){newRunGoal();return}
  if(!q||!G.running){el.classList.remove('on');return}
  el.classList.add('on');el.classList.toggle('done',!!q.done);
  $('#goalTxt').textContent=q.done?I18N.t('goal.done'):goalLabel(q);
  $('#goalFill').style.width=Math.max(3,Math.min(100,Math.round(q.prog/q.target*100)))+'%';
}
function goalLabel(q){
  const x=I18N.t('goal.'+q.id);
  return q.id==='combo'?(x+' ×'+Math.min(q.prog,q.target)+'/×'+q.target):(x+' '+Math.min(q.prog,q.target)+'/'+q.target);
}
function goalProgress(id,v){
  const q=S.rg;
  if(!q||q.done||!G.running||q.id!==id)return;
  q.prog=(id==='score'||id==='combo')?Math.max(q.prog,v):q.prog+v;
  if(q.prog>=q.target){
    q.done=true;q.prog=q.target;S.coins+=q.rw;BB.save();
    setTimeout(()=>{AUDIO.reward();toast('{target}',I18N.t('goal.done'),I18N.t('goal.reward')+' +'+q.rw+' {bolt}');
      try{window.BG&&BG.pulse(PALCY)}catch(e){}},260);
    P.track('goal',{id:q.id});
  }
  syncGoal();
}
const PALCY='255,193,61';
function goalChip(){
  const q=S.rg; if(!q||q.done||!q.target||!RG[q.id])return '';
  const p=Math.min(100,Math.round(q.prog/Math.max(1,q.target)*100));
  const v=q.id==='combo'?('×'+Math.min(q.prog,q.target)+'/×'+q.target):(Math.min(q.prog,q.target)+'/'+q.target);
  return '<span class="nxchip">{target} '+I18N.t('goal.'+q.id)+' <b>'+v+'</b></span>';
}
function quest(id,v){
  if(BB.G.demo)return;
  goalProgress(id,v);
  genQuests();
  if(TUT.on){
    if(id==='place')tutStep(2);
    else if(id==='lines'&&TUT.on<=2)tutStep(3);
    else if(id==='combo'&&v>=2)tutStep(4);
    else if(id==='blast')tutStep(4);
  }
  genWQuests();
  let changed=false; const wdone=[];
  S.wquests.list.forEach(q=>{
    if(q.claimed||q.done)return;
    if(q.id==='score'||q.id==='combo'){q.prog=Math.max(q.prog,v)}
    else{q.prog+=v}
    if(q.prog>=q.target){q.done=true;changed=true;wdone.push(q)}
  });
  S.quests.list.forEach(q=>{
    if(q.claimed||q.done)return;
    if(q.id==='score'){q.prog=Math.max(q.prog,v)}
    else if(q.id==='combo'){q.prog=Math.max(q.prog,v)}
    else {q.prog+=v}
    if(q.prog>=q.target){q.done=true;changed=true}
  });
  if(changed){AUDIO.coin();BB.save()}
  if(wdone.length)setTimeout(()=>{
    if(wdone.length===1)toast('{calendar}',I18N.t('tasks.done'),qText(wdone[0]),'wq'+wdone[0].id);
    else toast('{calendar}',I18N.t('tasks.doneN').replace('{n}',wdone.length),'','wqmulti');
  },600);
  syncHud();
}

/* ---------- achievements ---------- */
const ACH=[
 {id:'first',rw:50,f:()=>S.stats.games>=1,p:()=>[S.stats.games,1]},
 {id:'score100',rw:60,f:()=>Math.max(S.best.classic,S.best.daily)>=100,p:()=>[Math.max(S.best.classic,S.best.daily),100]},
 {id:'score500',rw:120,f:()=>Math.max(S.best.classic,S.best.daily)>=500,p:()=>[Math.max(S.best.classic,S.best.daily),500]},
 {id:'score1000',rw:260,f:()=>S.best.classic>=1000,p:()=>[S.best.classic,1000]},
 {id:'lines50',rw:70,f:()=>S.stats.lines>=50,p:()=>[S.stats.lines,50]},
 {id:'lines250',rw:180,f:()=>S.stats.lines>=250,p:()=>[S.stats.lines,250]},
 {id:'combo5',rw:120,f:()=>S.stats.maxCombo>=5,p:()=>[S.stats.maxCombo,5]},
 {id:'combo8',rw:240,f:()=>S.stats.maxCombo>=8,p:()=>[S.stats.maxCombo,8]},
 {id:'streak3',rw:120,f:()=>S.streak.n>=3,p:()=>[S.streak.n,3]},
 {id:'streak7',rw:300,f:()=>S.streak.n>=7,p:()=>[S.streak.n,7]},
 {id:'lvl5',rw:120,f:()=>S.level>=5,p:()=>[S.level,5]},
 {id:'lvl10',rw:300,f:()=>S.level>=10,p:()=>[S.level,10]},
 {id:'blast3',rw:150,f:()=>S.stats.blasts>=3,p:()=>[S.stats.blasts,3]},
 {id:'perfect',rw:200,f:()=>S.stats.perfects>=1,p:()=>[S.stats.perfects,1]},
 {id:'pu20',rw:140,f:()=>S.stats.pu>=20,p:()=>[S.stats.pu,20]},
 {id:'games25',rw:180,f:()=>S.stats.games>=25,p:()=>[S.stats.games,25]},
 {id:'daily',rw:100,f:()=>!!(S.daily&&S.daily.played),p:()=>[(S.daily&&S.daily.played)?1:0,1]},
 {id:'sprint500',rw:160,f:()=>(S.stats.sprintBest||0)>=500,p:()=>[S.stats.sprintBest||0,500]}
];
function achNext(){
  let best=null;
  ACH.forEach(a=>{if(S.ach[a.id]||a.f())return;const c=a.p();if(c[0]<=0)return;
    const r=Math.min(0.99,c[0]/c[1]);if(!best||r>best.r)best={a:a,c:c,r:r}});
  return best;
}
function achTeaser(){
  if((S.stats.games||0)<=3)return '';           /* в онбординге и так слишком много карточек */
  const n=achNext();if(!n)return '';
  const pc=Math.round(n.r*100);
  return '<div class="card achteaser"><div class="kv"><span class="k">{medal} '+I18N.t('ach.next')+'</span>'+
    '<span class="v" style="font-size:11.5px">'+Math.min(n.c[0],n.c[1])+' / '+n.c[1]+'</span></div>'+
    '<b style="display:block;margin:6px 0 6px;font-size:13px">'+I18N.t('ach.'+n.a.id)+'</b>'+
    '<div class="bar"><i style="width:'+pc+'%"></i></div>'+
    '<div class="sub" style="margin-top:5px;margin-bottom:0">+'+n.a.rw+' {bolt}</div></div>';
}
function checkAch(){
  let got=0;
  ACH.forEach(a=>{ if(!S.ach[a.id]&&a.f()){S.ach[a.id]=true;S.coins+=a.rw;got+=a.rw;
    toast('{medal}',I18N.t('ach.'+a.id),'+'+a.rw+' {bolt}');AUDIO.reward();
    try{ P.achSet(a.id,a.p()[1]) }catch(e){} }});
  if(got){BB.save();syncHud()}
}
/* ---------- Yandex platform achievements bridge ----------
   Only ids configured in the Yandex developer dashboard are pushed; when the
   dashboard has no achievements every call is a cheap no-op. */
async function yaAchInit(){
  try{
    await P.achInit();
    if(!P.achCount()) return false;
    const prog=await P.achProgress();
    let grant=0;
    ACH.forEach(a=>{ const r=prog&&prog[a.id];
      if(r&&r.done&&!S.ach[a.id]){ S.ach[a.id]=true; S.coins+=a.rw; grant+=a.rw } });
    if(grant){ BB.save(); syncHud();
      if(!openSheet) toast('{medal}',I18N.t('ach.synced'),'+'+grant+' {bolt}') }
    let n=0;
    for(const a of ACH){ if(n++>=8) break;
      const c=a.p(); if(c[0]<=0) continue;
      P.achSet(a.id,S.ach[a.id]?c[1]:Math.min(c[0],c[1]-1));
    }
    return true;
  }catch(e){ return false }
}
let achPushAt=0;
function yaAchPush(){
  if(!P.achCount()) return;
  const now=Date.now(); if(now-achPushAt<20000) return; achPushAt=now;
  let n=0;
  for(const a of ACH){ if(n++>=4) break; const c=a.p(); if(c[0]<=0) continue;
    P.achSet(a.id,S.ach[a.id]?c[1]:Math.min(c[0],c[1]-1)); }
}

/* ---------- season ---------- */
const SEASON_LEN=30, SEASON_STEP=260;
function seasonRewards(i){
  const t=i+1;
  if(t===8)return{k:'skin',v:'glass'};
  if(t===18)return{k:'skin',v:'arcade'};
  if(t%10===0)return{k:'coins',v:900};
  if(t%5===0)return{k:'coins',v:400};
  if(t%3===0)return{k:'pu',v:1};
  return{k:'coins',v:120+t*10};
}
function seasonTier(){return Math.min(SEASON_LEN,Math.floor((S.season.xp||0)/SEASON_STEP))}

/* ---------- ads pacing (конфиг: легко тюнить без переписывания логики) ---------- */
const ADCFG={interGames:3,interGap:150000,afterReward:35000,maxPerHour:6};
let gamesSinceInter=0,lastInter=0,interLog=[];
let duel=null;
let bootAt=0,roundsSeen=0;
function maybeInterstitial(){
  if(P.noAds)return;
  gamesSinceInter++;
  if(!S.first)return;
  if(roundsSeen<3||Date.now()-bootAt<90000)return;
  const now=Date.now();
  interLog=interLog.filter(t=>now-t<3600000);
  if(interLog.length>=ADCFG.maxPerHour)return;
  const lastRw=(P.lastRewardAt||0);
  if(now-lastRw<ADCFG.afterReward)return;      // сразу после вознаграждаемой рекламы не прерываем
  if(gamesSinceInter>=ADCFG.interGames&&now-lastInter>ADCFG.interGap){
    gamesSinceInter=0;lastInter=now;interLog.push(now);P.interstitial();
  }
}

/* ---------- duel 1v1: реальные соперники из лидерборда ---------- */
function duelCost(){return 100}
let rivals=null,rivalsAt=0,lastRival=null;
async function loadRivals(){
  if(rivals&&Date.now()-rivalsAt<180000)return rivals;
  let rows=[];
  try{ rows=await P.lbTop(50,'sprint_best') }catch(e){ rows=[] }
  rivals=(rows||[]).filter(r=>r&&r.score>0&&!r.me)
    .map(r=>({name:String(r.name||'').slice(0,18),photo:r.photo||'',score:Math.round(r.score)}));
  rivalsAt=Date.now();
  return rivals;
}
function mySprint(){return Math.max(S.stats.sprintBest||0,S.best.sprint||0,0)}
function pickRival(){
  const pool=rivals||[],mine=mySprint();
  let cand=mine>0?pool.filter(r=>r.score>=mine*0.55&&r.score<=mine*1.9):pool.slice();
  if(!cand.length)cand=pool.slice();
  if(cand.length)return cand[Math.floor(Math.random()*cand.length)];
  return {name:'',photo:'',score:Math.round(Math.max(600,Math.min(4200,700+(S.level||1)*110))),bot:true};
}
async function startDuel(same){
  const cost=duelCost();
  if((S.coins||0)<cost){toast('{bolt}',I18N.t('duel.cost').replace('{n}',cost));return}
  await loadRivals();
  const rv=(same&&lastRival)?lastRival:pickRival();
  S.coins-=cost;BB.save();syncHud();
  try{ P.track('duel_start',{cost:cost,rival:rv.bot?'bot':'lb'}); P.trackOnce('first_duel') }catch(e){}
  lastRival=rv;
  duel={rival:rv,goal:rv.score,t:60,t0:Date.now(),iv:null,done:false};
  close();showMenu(false);
  BB.startGame('sprint');
  let ov=document.getElementById('duelGo');
  if(!ov){ov=document.createElement('div');ov.id='duelGo';ov.className='duel-go show';document.body.appendChild(ov)}
  else{ov.classList.add('show');ov.classList.remove('go')}
  const who=rv.bot?I18N.t('duel.botName'):rv.name;
  ov.innerHTML='<span>3</span><i class="goSub">'+I18N.t('duel.vs').replace('{n}',esc(who))+' \u00b7 '+nf(rv.score)+'</i>';
  AUDIO.click();
  let k=3;
  const iv=setInterval(()=>{
    k--;
    if(k>0){ov.innerHTML='<span>'+k+'</span><i class="goSub">'+I18N.t('duel.vs').replace('{n}',esc(who))+' \u00b7 '+nf(rv.score)+'</i>';AUDIO.click()}
    else{clearInterval(iv);ov.innerHTML='<span class="goTxt">'+I18N.t('duel.go')+'</span>';ov.classList.add('go');AUDIO.reward();
      setTimeout(()=>{ov.remove()},700)}
  },700);
  if(duel.iv)clearInterval(duel.iv);
  duel.iv=setInterval(()=>{
    if(!duel||duel.done)return;
    if(G.over){endDuel();return}
    duel.t=Math.max(0,60-Math.floor((Date.now()-duel.t0)/1000));
    if(duel.t<=0){endDuel();return}
    duelHud();
  },1000);
  duelHudVis();
}
function duelHudVis(){
  document.body.classList.toggle('duelon',!!duel);
  const dh=$('#duelHud'); if(!dh)return;
  const on=!!duel;
  if(dh.classList.contains('on')!==on){dh.classList.toggle('on',on);try{BB.resize()}catch(e){}}
  if(on)duelHud();
}
function duelHud(){
  const b=$('#duelLines'); if(!b||!duel)return;
  const goal=Math.max(1,duel.goal),me=Math.max(0,G.score||0);
  const scale=Math.max(goal*1.08,me*1.04,1);
  const mp=Math.min(100,Math.round(me/scale*100)),gp=Math.min(100,Math.round(goal/scale*100));
  const rv=duel.rival;
  const rname=rv.bot?I18N.t('duel.botName'):esc(rv.name||I18N.t('duel.rival'));
  const av=rv.photo?'<img class="duel-av" src="'+esc(rv.photo)+'" alt="">':'<span class="duel-av duel-avx">{users}</span>';
  b.innerHTML=ix('<div class="duel-side duel-you"><div class="duel-lbl"><span class="duel-av duel-av-me">{bolt}</span><b>'+I18N.t('duel.you')+'</b></div>'+
    '<div class="duel-bar"><i style="width:'+mp+'%"></i></div><span class="duel-num">'+nf(me)+(me<goal?' <em>+'+nf(goal-me)+'</em>':'')+'</span></div>'+
    '<div class="duel-clock'+(duel.t<=10?' danger':'')+'">'+duel.t+'</div>'+
    '<div class="duel-side duel-riv"><div class="duel-lbl">'+av+'<b>'+rname+'</b></div>'+
    '<div class="duel-bar"><i style="width:'+gp+'%"></i></div><span class="duel-num">'+nf(goal)+'</span></div>');
}
async function endDuel(reason){
  if(!duel||duel.done)return; duel.done=true;
  if(duel.iv){clearInterval(duel.iv);duel.iv=null}
  const me=Math.max(0,G.score||0),up=duel.goal,rv=duel.rival;
  const win=reason==='flee'?false:(me>up), draw=!win&&me===up&&reason!=='flee';
  S.duelStreak=win?(S.duelStreak||0)+1:0;
  const sb=win?Math.min(200,40*Math.max(0,(S.duelStreak||0)-1)):0;
  const reward=(win?240:(draw?120:50))+sb;
  S.coins+=reward; S.duels=(S.duels||0)+1; if(win)S.duelWins=(S.duelWins||0)+1; BB.save();
  const ov=document.getElementById('duelGo'); if(ov)ov.remove();
  const body=reason==='flee'?I18N.t('duel.flee'):(win?I18N.t('duel.win'):(draw?I18N.t('duel.draw'):I18N.t('duel.lose')));
  const who=rv.bot?I18N.t('duel.botName'):esc(rv.name||I18N.t('duel.rival'));
  const av=rv.photo?'<img class="duel-av big" src="'+esc(rv.photo)+'" alt="">':'<span class="duel-av big duel-avx">{users}</span>';
  open('<h2>'+I18N.t('duel.title')+'</h2>'+
    '<div class="sub">'+body+'</div>'+
    '<div class="bigscore">'+nf(me)+' : '+nf(up)+'</div>'+
    '<div class="card"><div class="kv"><span class="k">'+av+' '+who+(rv.bot?'':' \u00b7 '+I18N.t('duel.real'))+'</span>'+
      '<span class="v" style="color:var(--ink2)">'+nf(up)+' \u00b7 '+I18N.t('duel.sprintTag')+'</span></div>'+
    '<div class="kv"><span class="k">'+I18N.t('duel.reward')+'</span><span class="v" style="color:var(--am)">+'+reward+' {bolt}</span></div>'+
    (win&&S.duelStreak>1?'<div class="kv"><span class="k">{flame} '+I18N.t('duel.streak')+'</span><span class="v" style="color:var(--mg)">'+S.duelStreak+'</span></div>':'')+
    '</div>'+
    '<div class="row" style="margin-top:12px"><button class="btn p" id="duAg">{sword} '+I18N.t('duel.rematch')+' \u00b7 '+duelCost()+' {bolt}</button>'+
    '<button class="btn o" id="duAn">{users} '+I18N.t('duel.newrival')+'</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn m" id="duSh">{arrow-up-right} '+I18N.t('share.btn')+'</button>'+
    '<button class="btn m" id="duOk">'+I18N.t('btn.close')+'</button></div>');
  const ag=$('#duAg'); if(ag)ag.onclick=()=>{close();startDuel(true)};
  const an=$('#duAn'); if(an)an.onclick=()=>{close();lastRival=null;startDuel(false)};
  const sb2=$('#duSh'); if(sb2)sb2.onclick=()=>doShare(I18N.t('share.duel').replace('{a}',nf(me)).replace('{b}',nf(up)));
  const ok=$('#duOk'); if(ok)ok.onclick=()=>{close();showMenu(true)};
  try{ P.track('duel_end',{win:win,me:me,goal:up,bot:!!rv.bot}) }catch(e){}
  duel=null;duelHudVis();
}

/* ---------- game over ---------- */
/* ---------- offline / welcome back bonus ---------- */
function offlineBonus(){
  const now=Date.now(),last=S.lastSeen||0;
  if(!last)return null;
  const hrs=(now-last)/36e5;
  if(hrs<10)return null;
  const coins=Math.max(60,Math.min(900,Math.round(30+hrs*16)));
  const pu=hrs>=36?['hammer','bomb','swap'][Math.floor(Math.random()*3)]:null;
  return {hrs:hrs,coins:coins,pu:pu};
}
function openWelcome(){
  const b=offlineBonus(); if(!b)return false;
  const puIc={hammer:'hammer',bomb:'bomb',swap:'refresh'}[b.pu||'hammer'];
  const sh=open('<h2>{flame} '+I18N.t('wb.title')+'</h2>'+
    '<div class="sub">'+I18N.t('wb.sub').replace('{n}',fmtLeft(Math.round(b.hrs*36e5)))+'</div>'+
    '<div class="bigscore">+'+b.coins+' {bolt}</div>'+
    (b.pu?'<div class="pill cy" style="margin:8px auto 0">{'+puIc+'} '+I18N.t('wb.pu')+'</div>':'')+
    '<div class="sub" style="margin-top:10px;font-size:11.5px">'+I18N.t('wb.hint')+'</div>'+
    '<div class="row" style="margin-top:12px"><button class="btn m" id="wb2">×2 · {bolt} · '+I18N.t('btn.watch')+'</button>'+
    '<button class="btn p" id="wb1">'+I18N.t('wb.claim')+'</button></div>',{sticky:true});
  let got=false;
  const give=(m)=>{ if(got)return; got=true;
    S.coins+=b.coins*m; if(b.pu)BB.freePower(b.pu);
    AUDIO.reward(); BB.save(); syncHud(); close();
    toast('{bolt}','+'+(b.coins*m));
    P.track('welcome_back',{hrs:Math.round(b.hrs),m:m});
  };
  sh.querySelector('#wb1').onclick=()=>give(1);
  sh.querySelector('#wb2').onclick=async()=>{
    const r=await P.rewarded('welcome_x2');
    if(r.ok){give(2)} else if(!r.skipped)toast('{alert-triangle}',I18N.t('toast.watchad'));
  };
  P.track('welcome_show',{hrs:Math.round(b.hrs)});
  return true;
}
/* ---------- reminders / favourites (VK retention) ---------- */
async function enableReminders(src){
  if(S.notif)return false;
  let ok=false;
  try{ const r=await P.subscribe(); ok=!!(r&&r.ok); }catch(e){}
  S.notif=true; const bonus=!S.notifBonus; if(bonus){S.notifBonus=true;S.coins+=150;}
  BB.save(); AUDIO.reward(); syncHud(); if(openSheet)renderHub();
  toast('{bell}',I18N.t('notif.off'),bonus?'+150 {bolt}':'');
  P.track('reminders_on',{src:src||'',ok:ok?1:0});
  return true;
}
async function enableFav(src){
  if(S.fav)return false;
  const r=await P.fav();
  S.fav=true; if(!S.favBonus){S.favBonus=true;S.coins+=100;}
  BB.save(); AUDIO.reward(); syncHud();
  toast('{star}',I18N.t(r&&r.ok?'fav.done':'fav.na'),S.favBonus?'+100 {bolt}':'');
  P.track('favourites',{src:src||'',ok:(r&&r.ok)?1:0});
  return true;
}
function rateCard(){
  if(S.rated||!P.supportsReview()||reviewOk===false)return '';
  if((S.stats.games||0)<3||S.level<3)return '';
  if(S.rateSkip&&(Date.now()-S.rateSkip)<14*864e5)return '';
  return '<div class="card rp" style="margin-top:10px;border-color:rgba(255,193,61,.34)"><div class="kv"><div>'+
   '<b style="font-size:13.5px">{star} '+I18N.t('rate.title')+'</b>'+
   '<div style="font-size:11.5px;color:var(--ink3);margin-top:2px">'+I18N.t('rate.sub')+'</div></div></div>'+
   '<div class="row" style="margin-top:10px"><button class="btn g sm" id="rtYes">{star} '+I18N.t('rate.btn')+' +150</button>'+
   '<button class="btn o sm" id="rtNo">'+I18N.t('shop.later')+'</button></div></div>';
}
async function doRate(){
  const r=await P.review();
  if(r&&!r.ok){reviewOk=false;S.rateSkip=Date.now();BB.save();if(openSheet)renderHub();toast('{star}',I18N.t('rate.na'));return}
  S.rated=true; if(!S.rateBonus){S.rateBonus=true;S.coins+=150}
  BB.save();AUDIO.reward();syncHud();
  toast('{star}',I18N.t('rate.done'),S.rateBonus?'+150 {bolt}':'');
  P.track('rate',{ok:1});
}
function rpCard(){
  if(S.notif&&S.fav)return '';
  if((S.stats.games||0)<2)return '';
  if(S.rpSkip&&(Date.now()-S.rpSkip)<6*864e5)return '';
  const one=S.notif||S.fav, sc=!P.supportsReminders();
  return '<div class="card rp" style="margin-top:10px"><div class="kv"><div><b style="font-size:13.5px">'+(sc?'{device-desktop}':'{bell}')+' '+I18N.t(sc?'rp.scTitle':'rp.title')+'</b>'+
   '<div style="font-size:11.5px;color:var(--ink3);margin-top:2px">'+I18N.t(sc?'rp.scSub':'rp.sub')+'</div></div></div>'+
   '<div class="row" style="margin-top:10px">'+
   (S.notif||sc?'':'<button class="btn g sm" id="rpYes">{bell} '+I18N.t('rp.yes')+'</button>')+
   (S.fav||!P.supportsShortcut()?'':'<button class="btn '+(sc?'g':'o')+' sm" id="rpFav">{device-desktop} '+I18N.t(sc?'rp.scYes':'rp.fav')+'</button>')+
   (one?'':'<button class="btn o sm" id="rpNo">'+I18N.t('shop.later')+'</button>')+'</div></div>';
}
async function doInvite(){
  AUDIO.click(); S.invites=(S.invites||0)+1; BB.save();
  try{ if(await P.invite())return true }catch(e){}
  return await P.share('BlockBlastik',I18N.t('invite.msg'));
}
function ovStats(r){
  const it=[['{layout-grid}',r.lines||0,I18N.t('over.lines')],['{flame}','×'+(r.combo||0),I18N.t('over.combo')],
            ['{bolt}',r.blasts||0,I18N.t('over.blasts')]];
  if(r.perfects)it.push(['{star}',r.perfects,I18N.t('over.perfect')]);
  return '<div class="ovstats">'+it.map(([ic,v,lb])=>'<div class="ovs"><svg class="ic"><use href="#i-'+ic.slice(1,-1)+
    '"/></svg><b>'+v+'</b><span>'+lb+'</span></div>').join('')+'</div>';
}
function nextStrip(r){
  const need=xpNeed(), p=Math.max(0,Math.min(1,(S.xp||0)/need));
  const qs=S.quests.list||[], qd=qs.filter(q=>q.done).length, qc=qs.filter(q=>q.done&&!q.claimed).length;
  const cr=chestReady(), chest=cr?I18N.t('hub.chestReady'):fmtLeft((S.chest.next||0)-Date.now());
  return '<div class="card nx"><div class="kv"><span class="k">{trophy} '+I18N.t('over.next.xp').replace('{n}',S.level+1)+
    '</span><span class="v" style="color:var(--cy)">'+(S.xp||0)+'/'+need+' XP</span></div>'+
    '<div class="nxbar"><i style="width:'+(p*100).toFixed(1)+'%"></i></div>'+
    '<div class="nxrow">'+nxChips(r,cr,chest,qc,qd,qs.length)+'</div></div>';
}
/* чипы «что дальше»: максимум 4 по приоритету + счётчик скрытых */
function nxChips(r,cr,chest,qc,qd,qlen){
  const list=[];
  if(streakPending())list.push('<button class="nxchip hot act" data-chainov="1">{gift} '+I18N.t('chain.ready')+' <b>+'+streakPending().amt+'</b></button>');
  if(BB.bonusReady()&&!(r&&r.isBonus))list.push('<button class="nxchip hot act" data-bonusov="1">{rocket} '+I18N.t('bonus.title')+' <b>\u00d73</b></button>');
  if(boostState().n<BOOST_MAX)list.push('<button class="nxchip hot act" data-boostov="1">{sparkles} '+I18N.t('boost.title')+' <b>\u00d7'+boostLeft()+'</b></button>');
  if(!S.firstBuy)list.push('<button class="nxchip act" data-shopov="1">{wallet} '+I18N.t('over.next.shop')+' <b>\u00d72</b></button>');
  list.push('<span class="nxchip'+(cr?' hot':'')+'">{gift} '+I18N.t('over.next.chest')+' <b>'+chest+'</b></span>');
  list.push('<span class="nxchip'+(qc?' hot':'')+'">{list} '+I18N.t('over.next.quests')+' <b>'+qd+'/'+qlen+'</b></span>');
  const gc=goalChip(); if(gc)list.push(gc);
  const top=list.slice(0,4),rest=list.length-top.length;
  let h=top.join('');
  if(rest>0)h+='<button class="nxchip more act" data-hubov="1">+'+rest+' {arrow-up-right}</button>';
  return h;
}
/* разовое предложение стартового пакета в окне финала */
function starterOffer(){
  if(S.starterBought||(S.stats.games||0)<2)return '';
  const x2=!S.firstBuy;
  return '<div class="soffer"><i class="sotag">{flame} '+I18N.t('soffer.tag')+'</i>'+
    '<div class="sol"><b class="ttl">{gift} '+I18N.t('shop.starter')+'</b>'+
    '<div class="sosub">'+I18N.t('soffer.sub')+(x2?' \u00b7 \u00d72':'')+'</div></div>'+
    '<button class="btn p sm sob" data-sobuy="1">'+(hasSku('starter')&&P.ya?'':'<s>99 \u20bd</s> ')+
      ptxt('starter')+'</button></div>';
}

/* ---------- онбординг: подсказка следующего шага в окне финала ---------- */
function onboardCard(){
  const g=S.stats.games||0;
  if(g<1||g>3||(S.ob||0)>=g)return '';
  if(g===2&&S.daily&&S.daily.date===today())return '';
  const t=I18N.t('ob.'+g+'t'),su=I18N.t('ob.'+g+'s'),bt=I18N.t('ob.'+g+'b');
  return '<div class="card ob"><div class="kv"><span class="k">{target} '+t+'</span>'+
    '<span class="v" style="font-size:11px;color:var(--ink3)">'+g+'/3</span></div>'+
    '<div class="sub" style="margin-top:6px;margin-bottom:0">'+su+'</div>'+
    '<button class="btn p sm" id="obGo" style="margin-top:10px;width:100%">'+bt+'</button></div>';
}

let _stT=0;
function pushStats(force){
  const n=Date.now(); if(!force&&n-_stT<20000)return; _stT=n;
  try{ P.stats({level:S.level||1,games:(S.stats&&S.stats.games)||0,
    best:Math.max(S.best.classic||0,S.best.sprint||0,S.best.daily||0)}) }catch(e){}
}
function onGameOver(r){roundsSeen++;try{yaAchPush()}catch(e){}P.gameplay(false);pushStats(true);document.body.classList.remove('playing');
  requestAnimationFrame(()=>{try{BB.resize()}catch(e){}});
  if(duel){return}
  const dbl=r.coins;
  maybeDeal();
  const dcost=duelCost();
  let wr=null;try{wr=WEEK.add(r)}catch(e){}
  const rpHtml=rpCard();
  const dline=(S.coins>=dcost)?'1':'';
  const luEl=document.getElementById('lvlup')||(Date.now()-lastLevelUp<900?1:null);
  const showOver=()=>{
  const sh=open('<h2>'+(r.isBonus?I18N.t('bonus.title'):I18N.t('over.title'))+'</h2>'+
    (r.isNew?'<div class="newbest">{star} '+I18N.t('over.newbest')+'</div>':'<div class="sub">'+I18N.t('hud.best')+': '+r.best.toLocaleString(I18N.lang==='ru'?'ru-RU':'en-US')+'</div>')+
    '<div class="bigscore">'+nf(r.score)+'</div>'+
    '<div class="card"><div class="kv"><span class="k">'+I18N.t('over.earned')+'</span><span class="v" style="color:var(--am)">+'+r.coins+' {bolt}</span></div>'+
    '<div class="kv"><span class="k">'+I18N.t('over.xp')+'</span><span class="v" style="color:var(--cy)">+'+r.xp+' XP</span></div>'+
    (r.dbonus?'<div class="kv"><span class="k">{calendar} '+I18N.t('daily.bonus')+'</span><span class="v" style="color:var(--mg)">+'+r.dbonus+' {bolt}</span></div>':'')+
    (r.bonus?'<div class="kv"><span class="k">{rocket} '+I18N.t('bonus.reward')+'</span><span class="v" style="color:var(--mg)">+'+r.bonus+' {bolt}</span></div>':'')+
    (wr&&wr.got>0?'<div class="kv"><span class="k">{flag-2} '+I18N.t('week.row')+'</span><span class="v" style="color:var(--cy)">+'+wr.got+'</span></div>':
     (wr?'<div class="kv"><span class="k">{flag-2} '+I18N.t('week.row')+'</span><span class="v" style="color:var(--ink3)">'+I18N.t('week.daycap')+'</span></div>':''))+'</div>'+
    '<div class="row" style="margin-top:14px"><button class="btn p" id="ovAgain">{player-play} '+I18N.t('over.again')+'</button></div>'+
    '<div class="row" style="margin-top:8px">'+(dbl>0?'<button class="btn m" id="ov2">×2 · +'+dbl+' {bolt}</button>':'')+
    (G.revives<3?'<button class="btn g" id="ovRev">'+I18N.t('over.revive')+' · '+BB.reviveCost()+' {bolt}</button>':'')+'</div>'+
    '<div class="row" style="margin-top:8px"><button class="btn o" id="ovShare">{arrow-up-right} '+I18N.t('btn.share')+'</button>'+
    (dline?'<button class="btn o" id="ovDuel2">{sword} '+I18N.t('duel.btn').replace('{n}',dcost)+'</button>':'')+'</div>'+
    starterOffer()+
    ovStats(r)+nextStrip(r)+ix(onboardCard())+ix(rescueStrip())+achTeaser()+
    '<div class="row" style="margin-top:8px"><button class="btn o" id="ovHub">'+I18N.t('nav.tasks')+'</button><button class="btn o" id="ovShop">'+I18N.t('nav.shop')+'</button></div>'+
    rpHtml+(rpHtml?'':rateCard())+
    dealStrip());
  let doubled=false;
  const ov2=sh.querySelector('#ov2');
  if(ov2)ov2.onclick=async e=>{
    if(doubled)return;
    const r2=await P.rewarded('double');
    if(r2.ok){doubled=true;S.coins+=dbl;BB.save();syncHud();P.track('ad_reward',{reason:'double'});
      e.target.outerHTML='<div class="pill am" style="height:46px;display:flex;padding:0 14px">+'+dbl+' {bolt} {check}</div>';
      AUDIO.reward();}
    else toast('{alert-triangle}',I18N.t('toast.watchad'));
  };
  sh.querySelector('#ovAgain').onclick=()=>{close();maybeInterstitial();BB.startGame(G.mode)};
  sh.querySelector('#ovShare').onclick=()=>doShare(shareText(r));
  const rv=sh.querySelector('#ovRev');
  if(rv)rv.onclick=async()=>{
    const cost=BB.reviveCost();
    if(S.coins>=cost){S.coins-=cost;BB.save();close();BB.revive('coins');syncHud();}
    else{const r3=await P.rewarded('revive');if(r3.ok){close();BB.revive('ad');syncHud()}else toast('{bolt}',I18N.t('toast.nocoin'))}
  };
  ['#ovDuel','#ovDuel2'].forEach(id=>{const dv=sh.querySelector(id);if(dv)dv.onclick=()=>{close();startDuel()}});
  bindDeal(sh);
  const sob=sh.querySelector('[data-sobuy]');
  if(sob)sob.onclick=async()=>{sob.disabled=true;sob.innerHTML='{refresh}';await buy('starter');
    const c=sh.querySelector('.soffer'); if(c)c.remove();};
  const ors=sh.querySelector('[data-resc]'); if(ors)ors.onclick=()=>doRescue(ors);
  sh.querySelector('#ovHub').onclick=()=>{openHub('tasks')};
  sh.querySelector('#ovShop').onclick=()=>{openHub('shop')};
  const rpy=sh.querySelector('#rpYes'); if(rpy)rpy.onclick=async()=>{await enableReminders('over');const c=sh.querySelector('.rp');if(c)c.remove()};
  const rpf=sh.querySelector('#rpFav'); if(rpf)rpf.onclick=async()=>{await enableFav('over');const c=sh.querySelector('.rp');if(c)c.remove()};
  const bo=sh.querySelector('[data-boostov]'); if(bo)bo.onclick=()=>{AUDIO.click();close();openHub('rewards')};
  sh.querySelectorAll('[data-shopov]').forEach(so=>so.onclick=()=>{AUDIO.click();close();openHub('shop')});
  const hu=sh.querySelector('[data-hubov]'); if(hu)hu.onclick=()=>{AUDIO.click();close();openHub('rewards')};
  const bno=sh.querySelector('[data-bonusov]'); if(bno)bno.onclick=()=>{AUDIO.click();close();BB.startGame('sprint',false,{bonus:true})};
  const chn=sh.querySelector('[data-chainov]'); if(chn)chn.onclick=()=>{AUDIO.click();claimStreak();chn.remove()};
  const obg=sh.querySelector('#obGo'); if(obg)obg.onclick=()=>{AUDIO.click();S.ob=(S.ob||0)+1;BB.save();
    if(S.stats.games===2){close();BB.startGame('daily')}else{close();openHub('rewards')}};
  const rpn=sh.querySelector('#rpNo'); if(rpn)rpn.onclick=()=>{S.rpSkip=Date.now();BB.save();const c=sh.querySelector('.rp');if(c)c.remove()};
  const rty=sh.querySelector('#rtYes'); if(rty)rty.onclick=async()=>{await doRate();const c=sh.querySelector('#rtYes');if(c&&c.closest('.card'))c.closest('.card').remove()};
  const rtn=sh.querySelector('#rtNo'); if(rtn)rtn.onclick=()=>{S.rateSkip=Date.now();BB.save();const c=rtn.closest('.card');if(c)c.remove()};
  };
  if(luEl){setTimeout(showOver,Math.max(600,Math.min(1500,lastLevelDur-1200)))}else{showOver()}
  checkAch();syncHud();
  P.track('game_over',{score:r.score,mode:G.mode,lines:r.lines});
  try{ P.trackOnce('first_game'); if(r.isBonus)P.trackOnce('bonus_round');
       if(G.mode==='daily')P.trackOnce('daily_play'); if(r.isNew)P.trackOnce('new_record') }catch(e){}
  if(P.supportsLb()&&!r.isBonus){try{P.lbSet(r.score)}catch(e){}
    if(G.mode==='sprint'){try{P.lbSet(r.score,'sprint_best')}catch(e){}}}
}
function shareText(r){
  if(r&&r.blastRecord)return I18N.t('share.blast').replace('{n}',r.score);
  if(r&&r.isNew)return I18N.t('share.earned').replace('{n}',r.score);
  return I18N.t('share.generic');
}
async function doShare(text){
  AUDIO.click();
  const ok=await P.share('BlockBlastik',text);
  toast(ok?'{check}':'{alert-triangle}',ok?I18N.t('share.done'):I18N.t('share.fail'));
}
function onGameStart(m){close();P.banner(false);P.gameplay(true);P.track('game_start',{mode:m});
  document.body.classList.add('playing');
  requestAnimationFrame(()=>{try{BB.resize()}catch(e){}});
  if(G.bonus){toast('{rocket}',I18N.t('bonus.started'),I18N.t('bonus.sub'));AUDIO.reward()}
  newRunGoal();
  $$('.mtab').forEach(x=>x.classList.toggle('active',x.dataset.mode===m));
  $$('#menuModes button').forEach(x=>x.classList.toggle('on',x.dataset.mode===m));}

/* ---------- hub ---------- */
function openHub(tab){
  hubTab=tab||hubTab; P.banner(true);
  const sh=open('<h2>'+I18N.t('hub.title')+'</h2><div class="sub">'+I18N.t('hub.sub')+'</div>'+
   '<div class="tabs" id="hTabs">'+
   ['rewards','tasks','shop','top','set'].map(t=>'<button data-t="'+t+'" class="'+(t===hubTab?'on':'')+'">'+
     ((t==='tasks'&&(questsClaimable()||wqClaimable()))?'<i class="tdot"></i>':
      (t==='top'&&WEEK.claimable()>0?'<i class="tdot"></i>':''))+
     ({rewards:I18N.t('tab.rewards'),tasks:I18N.t('tab.tasks'),shop:I18N.t('tab.shop'),top:I18N.t('tab.top'),set:I18N.t('tab.set')})[t]+'</button>').join('')+
   '</div><div id="hBody"></div>',{cls:'wide'});
  sh.querySelector('#hTabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;hubTab=b.dataset.t;
    $$('#hTabs button').forEach(x=>x.classList.toggle('on',x===b));renderHub()};
  renderHub();
}
function renderHub(){
  const b=$('#hBody');if(!b)return;
  if(hubTab==='rewards')b.innerHTML=htmlRewards();
  if(hubTab==='tasks')b.innerHTML=htmlTasks();
  if(hubTab==='shop')b.innerHTML=htmlShop();
  if(hubTab==='top')b.innerHTML=htmlTop();
  if(hubTab==='top'){setTimeout(()=>{try{fillLb()}catch(e){}},0)}
  if(hubTab==='set')b.innerHTML=htmlSet();
  b.innerHTML=ix(b.innerHTML);
  try{WEEK.bind(b)}catch(e){}
  bindHub();
}
function ringSvg(pct,color,size){
  const r=(size-6)/2,c=2*Math.PI*r,off=c*(1-Math.max(0,Math.min(1,pct)));
  return '<svg class="ring" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+
    '<circle class="rbg" cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'"/>'+
    '<circle class="rfg" cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" stroke="'+color+
    '" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg>';
}
/* ---------- Yandex platform bonuses (auto-hidden when the dashboard has none) ----------
   Dashboard bonus ids understood by the game:
   bb_coins250 bb_coins1000 bb_xp300 bb_boost bb_hammer bb_bomb bb_swap bb_freeze
   Anything else falls back to price*100 blasts. */
let YB=[];
async function refreshBonuses(){ try{ YB=await P.bonuses()||[] }catch(e){ YB=[] }
  try{ if(openSheet&&hubTab==='rewards')renderHub() }catch(e){} }
function bonusReward(b){
  const id=String(b.id||'').toLowerCase();
  if(id==='bb_coins250')return{k:'coins',v:250};
  if(id==='bb_coins1000')return{k:'coins',v:1000};
  if(id==='bb_xp300')return{k:'xp',v:300};
  if(id==='bb_boost')return{k:'boost',v:1};
  if(id==='bb_hammer'||id==='bb_bomb'||id==='bb_swap')return{k:'pu',v:id.slice(3)};
  if(id==='bb_freeze')return{k:'freeze',v:1};
  return{k:'coins',v:Math.max(100,Math.round((Number(b.price)||1)*100))};
}
function htmlBonuses(){
  if(!YB.length)return '';
  return '<div class="hsec">{gift} '+I18N.t('ya.bon')+'<em>'+I18N.t('ya.bonSub')+'</em></div>'+
    '<div class="card ybon">'+YB.map(b=>{
      const r=bonusReward(b);
      const rw=r.k==='coins'?'+'+r.v+' {bolt}':r.k==='xp'?'+'+r.v+' XP':r.k==='pu'?I18N.t('pu.'+r.v):r.k==='boost'?I18N.t('boost.title'):I18N.t('streak.freeze');
      const ic=r.k==='coins'?'bolt':r.k==='xp'?'trophy':r.k==='pu'?r.v:r.k==='boost'?'sparkles':'shield';
      return '<div class="ybonr"><div class="ybon-i"><svg class="ic"><use href="#i-'+ic+'"/></svg></div>'+
        '<div class="htx"><b>'+esc(b.title||I18N.t('ya.bon'))+'</b>'+
        '<span>'+esc(b.description||'')+(b.description?' · ':'')+rw+'</span></div>'+
        '<button class="btn g sm" data-ybon="'+esc(b.id)+'">{gift} '+I18N.t('ya.bonGet')+'</button></div>';
    }).join('')+'</div>';
}
async function fillDuelCard(){
  const el=$('#hDuelSub'); if(!el)return;
  await loadRivals();
  if(!el.isConnected)return;
  const rv=pickRival();
  el.innerHTML=rv.bot?I18N.t('duel.hubbot'):I18N.t('duel.hubvs').replace('{n}',esc(rv.name)).replace('{s}',nf(rv.score));
}
async function claimBonus(id){
  const b=YB.filter(x=>String(x.id)===String(id))[0]; if(!b)return;
  const r=await P.bonusConsume(b.ownId||b.id);
  if(!r||!r.ok){ toast('{alert-triangle}',I18N.t('ya.bonEmpty')); return }
  const rw=bonusReward(b);
  if(rw.k==='coins'){S.coins+=rw.v}
  else if(rw.k==='xp'){S.xp+=rw.v;checkLevel()}
  else if(rw.k==='freeze'){S.freeze=Math.min(5,(S.freeze||0)+1)}
  else if(rw.k==='boost'){boostState().arm=1}
  else {BB.freePower(rw.v)}
  BB.save();syncHud();AUDIO.reward();
  toast('{gift}',I18N.t('ya.bonDone'),rw.k==='coins'?'+'+rw.v+' {bolt}':rw.k==='xp'?'+'+rw.v+' XP':'');
  try{ P.track('bonus_consume',{id:String(id)}); P.trackOnce('first_bonus') }catch(e){}
  refreshBonuses();
}
function htmlRewards(){
  const t=today();
  const cur=S.streak.last===t?S.streak.n:0;
  const cpos=chainPos(cur||1),cpend=streakPending();
  let d7='';
  for(let i=1;i<=7;i++){
    const got=(i<cpos||(i===cpos&&!cpend))?'got':(i===cpos?'next':'');
    d7+='<div class="d7 '+got+'"><b>'+(i===7?'{gift}':streakReward(i))+'</b></div>';
  }
  const cr=chestReady();
  const st=Math.floor(S.xp/xpNeed()*100);
  const tier=seasonTier();
  const b=boostState();
  const chestMs=S.chest.next-Date.now();
  const chestPct=cr?1:Math.max(0,Math.min(1,1-chestMs/(3*3600e3)));
  const dMs=nextDailyMs(), dPct=Math.max(0,Math.min(1,1-dMs/(24*3600e3)));
  const hero='<div class="hhero"><div class="hh-lv"><svg class="ic"><use href="#i-trophy"/></svg><b>'+S.level+'</b>'+
    '<span>'+I18N.t('hub.level')+'</span></div><div class="hh-m">'+
    '<div class="hh-t">'+I18N.t('aw.season')+' · '+I18N.t('aw.tier')+' '+tier+'/'+SEASON_LEN+'</div>'+
    '<div class="bar"><i style="width:'+Math.floor(((S.season.xp||0)%SEASON_STEP)/SEASON_STEP*100)+'%"></i></div>'+
    '<div class="hh-s">'+S.xp+' / '+xpNeed()+' XP · '+I18N.t('hub.to')+'</div>'+
    '<button class="btn o sm" id="hSeason" style="align-self:flex-start">{crown} '+I18N.t('hub.season.open')+'</button>'+
    '</div></div>';
  let h=hero;
  h+='<div class="hsec">{flame} '+I18N.t('hub.sec.daily')+'</div>';
  h+='<div class="card'+(cpend?' hotcard':'')+'"><div class="kv"><span class="k">'+I18N.t('hub.streak')+'</span>'+
    '<span class="v">{flame} '+cur+'</span></div><div class="grid7" style="margin-top:10px">'+d7+'</div>'+
    '<div class="sub" style="margin-top:8px;margin-bottom:0">'+(cpend?('+'+cpend.amt+' {bolt}'+(cpend.gift?' · {gift} '+I18N.t('chain.gift'):I18N.t('chain.daySub'))):I18N.t('chain.tomorrow'))+'</div>'+
    (cpend?'<button class="btn g" id="hStreak" style="margin-top:10px;width:100%">{gift} '+I18N.t('chain.get')+' · +'+cpend.amt+'</button>':'')+'</div>';
  h+='<div class="card hrow'+(cr?' hotcard':'')+'"><div class="hring">'+ringSvg(chestPct,cr?'#9BFF4D':'#3FE3FF',54)+
    (cr?'<svg class="hic"><use href="#i-gift"/></svg>':'<em>'+fmtLeft(chestMs)+'</em>')+'</div>'+
    '<div class="htx"><b>'+(cr?I18N.t('hub.chestReady'):I18N.t('hub.chest'))+'</b>'+
    (cr?'<span>'+I18N.t('chest.again')+'</span>':'<span>'+I18N.t('chest.in')+'</span>')+'</div>'+
    (cr?'<button class="btn g sm" id="hChest">{gift} '+I18N.t('chest.open')+'</button>':'')+'</div>';
  h+=htmlBonuses();
  h+='<div class="card hrow"><div class="hring">'+ringSvg(dPct,'#FF5BD4',54)+'<em>'+fmtLeft(dMs)+'</em></div>'+
    '<div class="htx"><b>'+I18N.t('daily.next')+'</b><span>'+I18N.t('daily.hint')+' \u00b7 +'+Math.min(420,120+10*(S.level||1))+' {bolt} '+I18N.t('daily.bonusHint')+'</span></div></div>';
  const bready=BB.bonusReady();
  h+='<div class="card hrow bonuscard'+(bready?' hotcard':'')+'"><div class="bic bon"><svg class="ic"><use href="#i-rocket"/></svg></div>'+
    '<div class="htx"><b>'+I18N.t('bonus.hub')+'</b><span>'+(bready?I18N.t('bonus.hubsub'):I18N.t('bonus.next')+' <b class="bncd">'+fmtLeft(nextDailyMs())+'</b>')+'</span></div>'+
    (bready?'<button class="btn m sm" data-bonus="1">{rocket} '+I18N.t('bonus.go')+'</button>'
           :'<div class="pill">{check} '+I18N.t('bonus.done')+'</div>')+'</div>';
  const dcost=duelCost();
  h+='<div class="card hrow duelcard"><div class="bic duelbic"><svg class="ic"><use href="#i-sword"/></svg></div>'+
    '<div class="htx"><b>'+I18N.t('duel.hub')+'</b><span id="hDuelSub">'+I18N.t('duel.hubsub')+'</span></div>'+
    '<button class="btn m sm" id="hDuelGo">{sword} '+I18N.t('duel.btn').replace('{n}',dcost)+'</button></div>';
  h+='<div class="card boost hrow"><div class="bic"><svg class="ic"><use href="#i-sparkles"/></svg></div>'+
    '<div class="htx"><b>'+I18N.t('boost.title')+(b.n<BOOST_MAX?' · '+I18N.t('boost.left').replace('{n}',boostLeft()):'')+'</b><span>'+
    (b.arm?I18N.t('boost.on'):(b.n>=BOOST_MAX?I18N.t('boost.used'):I18N.t('boost.sub')))+'</span></div>'+
    (b.arm?'<div class="pill am">{check} '+I18N.t('boost.on')+'</div>'
          :'<button class="btn m sm" data-boost="1"'+(b.n>=BOOST_MAX?' disabled':'')+'>{bolt} '+I18N.t('boost.btn')+'</button>')+'</div>';
  h+='<div class="card hrow"><div class="hring wheelmini"><svg class="ic"><use href="#i-refresh"/></svg></div>'+
    '<div class="htx"><b>'+I18N.t('wheel.title')+'</b><span>'+
    (wheelReady()?I18N.t('wheel.badge'):I18N.t('wheel.noSpins'))+'</span></div>'+
    '<button class="btn '+(wheelReady()?'g':'o')+' sm" id="hWheel">{refresh} '+I18N.t('wheel.spin')+'</button></div>';
  h+='<div class="card"><div class="kv"><span class="k">{gift} '+I18N.t('free.title')+'</span>'+
    '<span class="v" style="font-size:11.5px;color:var(--ink3)">'+I18N.t('free.sub')+'</span></div>'+
    '<div class="row freeRow" style="margin-top:10px">'+['hammer','swap','bomb'].map(k=>{
      const got=(S.free&&S.free[today()]&&S.free[today()][k]);
      return '<button class="btn '+(got?'o':'m')+'" style="height:40px" '+(got?'disabled':'')+' data-free="'+k+'">'+
        (k==='hammer'?'{hammer}':k==='swap'?'{refresh}':'{bomb}')+' '+(got?'{check}':'+1')+'</button>';}).join('')+'</div></div>';
  if(rescueReady())h+='<div class="card rp"><div class="kv"><span class="k">{flame} '+I18N.t('streak.rescue')+'</span>'+
    '<span class="v" style="color:var(--mg)">'+(S.rescue.n)+'</span></div>'+
    '<div class="sub" style="margin-top:6px;margin-bottom:0">'+I18N.t('streak.rescueSub',{n:S.rescue.n})+'</div>'+
    '<button class="btn m" style="margin-top:10px;width:100%" data-resc="1">{gift} '+I18N.t('streak.rescueBtn')+'</button></div>';
  h+='<div class="card"><div class="kv"><span class="k">{shield} '+I18N.t('streak.freeze')+'</span>'+
    '<span class="v" style="color:'+((S.freeze||0)>0?'var(--cy)':'var(--ink3)')+'">'+(S.freeze||0)+'/5</span></div>'+
    '<div class="sub" style="margin-top:6px;margin-bottom:0">'+I18N.t('streak.freezeSub')+'</div>'+
    '<div class="row" style="margin-top:10px"><button class="btn m" data-frz="ad">{gift} '+I18N.t('streak.ad')+'</button>'+
    '<button class="btn g" data-frz="buy">{bolt} '+PRICES.freeze+' \u20bd</button></div></div>';
  h+='<div class="row" style="margin-top:12px"><button class="btn p" id="hPlay">{player-play} '+I18N.t('hub.play')+'</button>'+
    '<button class="btn o" id="hInvite">{users} '+I18N.t('invite.btn')+'</button></div>';
  return h;
}
function htmlTasks(){
  genQuests();
  let q='<div class="hsec">{list} '+I18N.t('tasks.daily')+'<em>'+today()+'</em></div><div class="list">';
  S.quests.list.forEach((x,i)=>{
    q+='<div class="card q '+(x.claimed?'done':'')+'"><div class="ic">'+qIcon(x.id)+'</div><div class="tx"><b>'+qText(x)+'</b>'+
      '<span>'+Math.min(x.prog,x.target)+' / '+x.target+'</span>'+
      '<div class="bar"><i style="width:'+Math.min(100,Math.round(x.prog/x.target*100))+'%"></i></div></div>'+
      (x.claimed?'<div class="rw">{check}</div>':x.done?'<button class="btn g sm" data-q="'+i+'">'+I18N.t('btn.claim')+'</button>'
      :'<div class="rw">'+x.rw+' {bolt}</div>')+'</div>';
  });
  q+='</div>';
  genWQuests();
  q+='<div class="hsec">{calendar} '+I18N.t('tasks.week')+'<em>'+fmtLeft(weekEndMs())+'</em></div>'+
    '<div class="hsub">'+I18N.t('tasks.weekSub')+'</div><div class="list">';
  S.wquests.list.forEach((x,i)=>{
    q+='<div class="card q '+(x.claimed?'done':'')+'"><div class="ic">'+qIcon(x.id)+'</div><div class="tx"><b>'+qText(x)+'</b>'+
      '<span>'+Math.min(x.prog,x.target)+' / '+x.target+'</span>'+
      '<div class="bar"><i style="width:'+Math.min(100,Math.round(x.prog/x.target*100))+'%"></i></div></div>'+
      (x.claimed?'<div class="rw">{check}</div>':x.done?'<button class="btn g sm" data-wq="'+i+'">'+I18N.t('btn.claim')+'</button>'
      :'<div class="rw">'+x.rw+' {bolt}</div>')+'</div>';
  });
  q+='</div><div class="hsec">{medal} '+I18N.t('tasks.ach')+'<em>'+Object.keys(S.ach).length+'/'+ACH.length+'</em></div><div class="list">';
  ACH.forEach(a=>{const got=!!S.ach[a.id];
    const c=a.p(),pc=Math.min(100,Math.round(c[0]/c[1]*100));
    q+='<div class="card q '+(got?'done':'')+'"><div class="ic">'+(got?'{medal}':'{lock}')+'</div><div class="tx"><b>'+I18N.t('ach.'+a.id)+'</b>'+
      (got?'':'<span>'+Math.min(c[0],c[1])+' / '+c[1]+'</span><div class="bar"><i style="width:'+pc+'%"></i></div>')+
      '</div><div class="rw">'+a.rw+' {bolt}</div></div>';});
  return q+'</div>';
}
function qIcon(id){return {lines:'{ruler}',score:'{target}',place:'{puzzle}',game:'{device-gamepad-2}',combo:'{flame}',pu:'{tools}',blast:'{sparkles}',sprint:'{rocket}',daily:'{calendar}'}[id]||'{star}'}
function htmlShop(){
  const fa=freeAdState();
  const CN='<circle cx="12" cy="12" r="10.4" fill="url(#gCoinB)" stroke="none"/><circle cx="12" cy="12" r="8.5" fill="url(#gCoinA)" stroke="none"/>'+
    '<path d="M13.5 5.3L7.4 13.2h3.6l-1.3 5.5 6.1-7.9h-3.6z" fill="#8A4A00" stroke="none"/>'+
    '<path d="M6.5 8.4a8.5 8.5 0 0 1 6.3-3.5" stroke="rgba(255,255,255,.85)" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
  const cn=s=>'<svg class="coin" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" aria-hidden="true">'+CN+'</svg>';
  let g='';
  if(dealActive())g+='<div class="dealinh">'+dealStrip()+'</div>';
  /* free blasts for an ad */
  g+='<div class="card freead"><div class="fic">{coins}</div><div class="ftx"><b>'+I18N.t('shop.free')+'</b>'+
    '<i>'+I18N.t('shop.freeSub',{n:fa.amt})+'</i>'+
    '<div class="dots">'+[0,1,2].map(i=>'<i class="'+(i<fa.n?'on':'')+'"></i>').join('')+'</div></div>'+
    (fa.left>0?'<button class="btn c sm" data-freead>{bolt} +'+fa.amt+'</button>'
              :'<div class="pill cy">{check} '+I18N.t('shop.freeDone')+'</div>')+'</div>';
  /* coin packs */
  if(!S.firstBuy)g+='<div class="x2bar"><span class="x2">×2</span><span>'+I18N.t('shop.x2')+'</span></div>';
  const packs=[{n:250,p:250,t:''},{n:800,p:74,t:'pop'},{n:2000,p:179,t:''},{n:5000,p:399,t:'best'}];
  const BON=['','+18%','+33%','+66%'];
  g+='<div class="shopgrid">';
  packs.forEach((p,i)=>{
    g+='<div class="pack'+(p.t?' '+p.t:'')+'">'+(p.t?'<div class="tag '+p.t+'">'+I18N.t('shop.tag.'+p.t)+'</div>':'')+
      '<div class="coins">'+[0,1,2,3].slice(0,i+1).map(k=>cn(20+k*5)).join('')+'</div>'+
      '<div class="nm">'+nf(p.n)+' '+cn(14)+'</div>'+
      (BON[i]?'<div class="pbon">'+BON[i]+'</div>':'')+
      '<div class="val">'+I18N.t('shop.val',{v:(()=>{const x=p.n/pnum(String(i));return Math.abs(x-Math.round(x))<0.05?String(Math.round(x)):x.toFixed(1)})(),c:pcur(String(i))})+'</div>'+
      '<div class="pr" data-buy="'+i+'">'+ptxt(String(i))+'</div></div>';
  });
  g+='</div>';
  /* one-time starter pack */
  if(!S.starterBought){
    g+='<div class="card starter"><i class="stag">'+I18N.t('shop.starterTag')+'</i><div class="kv">'+
      '<div class="stx"><b class="ttl">{gift} '+I18N.t('shop.starter')+'</b>'+
      '<div class="slist"><span>'+nf(1500)+' '+cn(13)+'</span><span>+300 XP</span><span>{sparkles} '+I18N.t('boost.title')+'</span></div></div>'+
      '<div class="spb">'+(hasSku('starter')&&P.ya?'':'<s>99 ₽</s>')+'<button class="btn p sm" data-buy="starter">'+ptxt('starter')+'</button></div></div></div>';
  }
  /* remove ads */
  g+='<div class="card feat"><div class="kv"><div><b class="ttl">{ban} '+I18N.t('shop.noads')+'</b>'+
    (S.noAds?'<div class="pill cy" style="margin-top:8px">{check} '+I18N.t('shop.noadsOn')+'</div>'
            :'<ul class="fchk"><li>{check} '+I18N.t('shop.noads.f1')+'</li><li>{check} '+I18N.t('shop.noads.f2')+'</li><li>{check} '+I18N.t('shop.noads.f3')+'</li></ul>')+
    '</div>'+(S.noAds?'':'<button class="btn m sm" data-buy="noads">'+ptxt('noads')+'</button>')+'</div></div>';
  /* golden pass */
  const gr=[7,9,17].map(i=>seasonRewards(i));
  g+='<div class="card feat"><div class="kv"><div><b class="ttl">{crown} '+I18N.t('shop.season')+'</b>'+
    '<div class="slist">'+gr.map(r=>'<span>'+(r.k==='skin'?'{palette} '+I18N.t('skin.n.'+r.v):'+'+nf(r.v)+' '+cn(12))+'</span>').join('')+'</div></div>'+
    (S.golden?'<div class="pill am">{check} '+I18N.t('shop.seasonOn')+'</div>'
             :'<button class="btn g sm" data-buy="golden">'+ptxt('golden')+'</button>')+'</div></div>';
  /* skins */
  const allSk=(S.skins||[]).length>=BB.SKINS.length-1;
  g+='<div class="card feat"><div class="kv"><div><b class="ttl">{palette} '+I18N.t('shop.skins')+'</b>'+
    '<div class="swrow">'+BB.SKINS.map(s=>'<canvas class="sw" data-sk="'+s.id+'"></canvas>').join('')+'</div></div>'+
    (allSk?'<button class="btn o sm" data-skins>'+I18N.t('btn.open')+'</button>'
          :'<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn o sm" data-skins>'+I18N.t('btn.open')+'</button>'+
           '<button class="btn g sm" data-buy="skinpack">'+ptxt('skinpack')+'</button></div>')+'</div></div>';
  g+='<div class="restore"><button data-restore>{refresh} '+I18N.t('shop.restore')+'</button></div>';
  return g;
}
function htmlTop(){
  let h=WEEK.card();
  h+='<div class="card" style="margin-top:12px"><div class="kv"><span class="k">{trophy} '+I18N.t('top.records')+'</span></div>'+
     '<div class="reclist">'+[['classic','grid-dots'],['sprint','clock'],['daily','calendar']].map(function(p){
       return '<div class="rc"><svg class="ic"><use href="#i-'+p[1]+'"/></svg><span>'+I18N.t('mode.'+p[0])+'</span><b>'+nf(S.best[p[0]]||0)+'</b></div>';}).join('')+
     '</div></div>';
  const stt=S.stats||{};
  const cells=[['{gamepad}','top.st.games',nf(stt.games||0)],['{layout-grid}','top.st.lines',nf(stt.lines||0)],
    ['{flame}','top.st.combo','\u00d7'+(stt.maxCombo||0)],['{bolt}','top.st.blasts',nf(stt.blasts||0)],
    ['{star}','top.st.perfect',nf(stt.perfects||0)],['{tools}','top.st.pu',nf(stt.pu||0)]];
  h+='<div class="card" style="margin-top:10px"><div class="kv"><span class="k">{chart-bar} '+I18N.t('top.stats')+'</span></div>'+
     '<div class="statgrid">'+cells.map(function(c){return '<div class="stc">'+c[0]+'<b>'+c[2]+'</b><span>'+I18N.t(c[1])+'</span></div>'}).join('')+'</div></div>';
  h+='<div class="card" style="margin-top:10px"><div class="kv"><div><b style="font-size:13.5px">{users} '+I18N.t('invite.title')+'</b>'+
     '<div style="font-size:11.5px;color:var(--ink3)">'+I18N.t('invite.sub')+'</div></div>'+
     '<button class="btn p sm" id="tInvite">{arrow-up-right} '+I18N.t('invite.btn')+'</button></div></div>';
  h+='<div class="lbtabs" id="lbTabs">'+
     '<button class="lbt on" data-lb="best_score">{trophy} '+I18N.t('top.lb.best')+'</button>'+
     '<button class="lbt" data-lb="sprint_best">{rocket} '+I18N.t('top.lb.sprint')+'</button>'+
     '<button class="lbt" data-lb="weekly_race">{flag-2} '+I18N.t('week.lb')+'</button></div>';
  h+='<div class="lbpos" id="lbPos"></div>';
  h+='<div class="lb" id="vkLb" style="margin-top:10px"><div class="lb-empty">'+I18N.t('common.loading')+'</div></div>';
  if(P.kind==='vk')h+='<button class="lb-inv" id="lbInvite"><b>'+I18N.t('top.invite')+'</b><span>'+I18N.t('share.hint')+'</span><em>'+I18N.t('invite.btn')+'</em></button>';
  return h;
}
let lbTab='best_score';
async function fillLb(){
  const box=$('#vkLb'); if(!box)return;
  const tg=$('#lbTabs');
  if(tg&&!tg.dataset.bound){tg.dataset.bound='1';tg.querySelectorAll('[data-lb]').forEach(b=>b.onclick=()=>{
    AUDIO.click();lbTab=b.dataset.lb;tg.querySelectorAll('[data-lb]').forEach(x=>x.classList.toggle('on',x===b));fillLb()})}
  if(tg)tg.querySelectorAll('[data-lb]').forEach(x=>x.classList.toggle('on',x.dataset.lb===lbTab));
  const pos=$('#lbPos'); if(pos)pos.innerHTML='';
  let rows=[];
  if(P.supportsLb()){try{rows=await P.lbTop(20,lbTab)}catch(e){}}
  let note='';
  if(!box.isConnected)return;
  if(lbTab==='weekly_race'){
    const mine=WEEK.pts();
    if(!rows.length){rows=WEEK.bots();note='<div class="lb-note">'+I18N.t('week.bots')+'</div>'}
    rows=rows.slice(0,20);
    let me=rows.find(r=>r.me);
    if(!me){me={name:(P.user&&P.user.name)||I18N.t('week.you'),score:mine,me:true,photo:''};rows.push(me)}
    rows.sort((a,b)=>(b.score||0)-(a.score||0));rows.forEach((r,i)=>r.rank=i+1);
    WEEK.setRank(rows.find(r=>r.me).rank);
  }
  if(pos&&rows.some(r=>r.me))pos.innerHTML=ix(WEEK.pos(rows));
  if(!rows.length){box.innerHTML='<div class="lb-empty">'+I18N.t('top.empty')+'</div>';return}
  box.innerHTML=note+rows.map(r=>'<div class="lbr'+(r.me?' me':'')+'"><div class="rk">'+(r.rank||'\u2014')+'</div>'+
    '<div class="nm">'+(r.photo?'<img class="av" src="'+esc(r.photo)+'" alt="">':'')+'<span>'+esc(r.name)+'</span></div>'+
    '<div class="sc">'+nf(r.score)+'</div></div>').join('');
}
function htmlSet(){
  const row=(k,v)=>'<div class="setrow"><span class="k">'+k+'</span>'+v+'</div>';
  const sw=(id,on,ic)=>row(ic+' '+I18N.t('set.'+id),'<div class="sw '+(on?'on':'')+'" data-sw="'+id+'"><i></i></div>');
  let h='';
  h+='<div class="hsec">{settings} '+I18N.t('set.sec.game')+'</div>';
  h+='<div class="card setcard">'+
    row('{grid-dots} '+I18N.t('setup.title'),'<button class="btn o sm" id="sSetup">'+BB.G.N+'\u00d7'+BB.G.N+' \u00b7 '+I18N.t('diff.'+(G.tier||1))+'</button>')+
    row('{palette} '+I18N.t('skin.title'),'<button class="btn o sm" id="sSkins">'+I18N.t('skin.n.'+(S.skin||'neon'))+'</button>')+
    row('{language} '+I18N.t('set.lang'),'<button class="btn o sm" id="sLang">'+(I18N.lang==='ru'?'EN':'RU')+'</button>')+
    '</div>';
  h+='<div class="hsec">{sun} '+I18N.t('set.sec.style')+'</div>';
  h+='<div class="card setcard">'+
    row('{palette} '+I18N.t('theme.title'),'')+
    '<div class="setrow setth"><div class="tset">'+THEMES.map(t=>'<button class="tsw'+(S.theme===t.id?' on':'')+'" data-th="'+t.id+'" title="'+t.n+'" style="background:linear-gradient(135deg,'+t.c[0]+','+t.c[1]+' 55%,'+t.c[2]+')"></button>').join('')+'</div></div>'+
    '</div>';
  h+='<div class="hsec">{volume} '+I18N.t('set.sec.snd')+'</div>';
  h+='<div class="card setcard">'+
    sw('sound',!!S.set.sound,'{volume}')+
    sw('music',S.set.music!==false,'{volume-3}')+
    sw('vib',!!S.set.vib,'{bolt}')+
    '</div>';
  h+='<div class="hsec">{bell} '+I18N.t('set.sec.prog')+'</div>';
  h+='<div class="card setcard">'+
    (P.supportsReminders()?row('{bell} '+I18N.t('notif.on'),S.notif?'<div class="pill cy">{check} '+I18N.t('notif.off')+'</div>':'<button class="btn o sm" id="sNotif">'+I18N.t('notif.btn')+'</button>'):'')+
    (P.supportsShortcut()?row('{device-desktop} '+I18N.t(P.ya?'fav.scTitle':'fav.title'),S.fav?'<div class="pill cy">{check} '+I18N.t('fav.done')+'</div>':'<button class="btn o sm" id="sFav">'+I18N.t('fav.btn')+'</button>'):'')+
    (S.rated||!P.supportsReview()||reviewOk===false?'':row('{star-half} '+I18N.t('rate.title'),'<button class="btn o sm" id="sRate">'+I18N.t('rate.btn')+'</button>'))+
    row('{trash} '+I18N.t('set.reset'),'<button style="color:var(--rd)" class="btn o sm" id="sReset">'+I18N.t('set.yes')+'</button>')+
    '</div>';
  h+='<div class="card setfoot"><div class="kv"><span class="k">BlockBlastik</span>'+
     '<span class="v" style="font-size:12px;color:var(--ink3)">'+ (P.ya?'Yandex Games':P.kind==='vk'?'VK Games':'Dev build') +' \u00b7 v'+VER+'</span></div></div>';
  return h;
}
function bindHub(){
  const c=$('#hChest'); if(c)c.onclick=openChest;
  const dg=$('#hDuelGo'); if(dg)dg.onclick=()=>{AUDIO.click();startDuel()};
  if($('#hDuelSub'))fillDuelCard();
  $$('[data-ybon]').forEach(x=>x.onclick=async()=>{AUDIO.click();await claimBonus(x.dataset.ybon)});
  const hst=$('#hStreak'); if(hst)hst.onclick=()=>{AUDIO.click();claimStreak()};
  const p=$('#hPlay'); if(p)p.onclick=()=>{close();showMenu(false);BB.startGame(menuMode)};
  const iv=$('#hInvite'); if(iv)iv.onclick=async()=>{await doInvite()};
  const tiv=$('#tInvite'); if(tiv)tiv.onclick=async()=>{await doInvite()};
  const lbi=$('#lbInvite'); if(lbi)lbi.onclick=async()=>{await doInvite()};
  const lbx=$('#lbBox'); if(lbx)lbx.onclick=async()=>{AUDIO.click();const b=Math.max(S.best.classic||0,S.best.sprint||0,S.best.daily||0);const ok=await P.lbBox(b);if(!ok)toast('{alert-triangle}',I18N.t('share.fail'))};
  fillLb();
  const skb=$('[data-skins]'); if(skb)skb.onclick=()=>{AUDIO.click();openSkins()};
  const ssk=$('#sSkins'); if(ssk)ssk.onclick=()=>{AUDIO.click();openSkins()};
  const srt=$('#sRate'); if(srt)srt.onclick=async()=>{AUDIO.click();await doRate();renderHub()};
  const se=$('#hSeason'); if(se)se.onclick=openSeason;
  $$('[data-boost]').forEach(b=>b.onclick=async()=>{AUDIO.click();await doBoost('hub')});
  $$('[data-bonus]').forEach(b=>b.onclick=()=>{AUDIO.click();close();showMenu(false);BB.startGame('sprint',false,{bonus:true})});
  const wh=$('#hWheel'); if(wh)wh.onclick=()=>{AUDIO.click();openWheel()};
  document.querySelectorAll('[data-resc]').forEach(b=>b.onclick=()=>doRescue(b));
  document.querySelectorAll('[data-frz]').forEach(b=>b.onclick=async()=>{
    AUDIO.click();
    if((S.freeze||0)>=5){toast('{shield}',I18N.t('streak.max'));return}
    if(b.dataset.frz==='buy'){
      if((S.coins||0)<PRICES.freeze){toast('{alert-triangle}',I18N.t('toast.nocoin'));return}
      S.coins-=PRICES.freeze;S.freeze=(S.freeze||0)+1;BB.save();AUDIO.reward();
      toast('{shield}',I18N.t('streak.got'),(S.freeze)+'/5');renderHub();
    }else{
      if(S.freezeDay===today()){toast('{shield}',I18N.t('streak.adUsed'));return}
      const r=await P.rewarded('freeze');
      if(r.ok){S.freezeDay=today();S.freeze=(S.freeze||0)+1;BB.save();AUDIO.reward();
        toast('{shield}',I18N.t('streak.got'),(S.freeze)+'/5');renderHub();}
      else toast('{alert-triangle}',I18N.t('toast.watchad'));
    }});
  const ss=$('#sSetup'); if(ss)ss.onclick=()=>{AUDIO.click();close();openSetup()};
  $$('[data-free]').forEach(b=>b.onclick=async()=>{
    const k=b.dataset.free; S.free=S.free||{}; const d=today(); S.free[d]=S.free[d]||{};
    if(S.free[d][k])return;
    const r=await P.rewarded('free_'+k);
    if(r.ok){S.free[d][k]=true;S.coins+=0;BB.freePower(k);AUDIO.reward();BB.save();renderHub();syncHud();
      toast(k==='hammer'?'{hammer}':k==='swap'?'{refresh}':'{bomb}',I18N.t('toast.pu'+k.charAt(0).toUpperCase()+k.slice(1)));}
    else toast('{alert-triangle}',I18N.t('toast.watchad'));
  });
  $$('[data-q]').forEach(b=>b.onclick=async()=>{
    const q=S.quests.list[+b.dataset.q]; if(!q||!q.done||q.claimed)return;
    const sh2=open('<h2>'+I18N.t('btn.claim')+'</h2><div class="bigscore">+'+q.rw+' {bolt}</div>'+
      '<div class="row" style="margin-top:12px"><button class="btn g" id="q1">'+I18N.t('btn.claim')+'</button>'+
      '<button class="btn m" id="q2">×2 · '+I18N.t('btn.watch')+'</button></div>');
    sh2.querySelector('#q1').onclick=()=>{q.claimed=true;S.coins+=q.rw;AUDIO.reward();BB.save();close();renderHub();syncHud()};
    sh2.querySelector('#q2').onclick=async()=>{const r=await P.rewarded('quest_x2');
      if(r.ok){q.claimed=true;S.coins+=q.rw*2;AUDIO.reward();BB.save();close();renderHub();syncHud()}
      else toast('{alert-triangle}',I18N.t('toast.watchad'))};
  });
  $$('[data-wq]').forEach(b=>b.onclick=async()=>{
    const q=S.wquests.list[+b.dataset.wq]; if(!q||!q.done||q.claimed)return;
    const sh2=open('<h2>'+I18N.t('tasks.week')+'</h2><div class="bigscore">+'+q.rw+' {bolt}</div>'+
      '<div class="sub">'+qText(q)+'</div>'+
      '<div class="row" style="margin-top:12px"><button class="btn g" id="w1">'+I18N.t('btn.claim')+'</button>'+
      '<button class="btn m" id="w2">×2 · '+I18N.t('btn.watch')+'</button></div>');
    sh2.querySelector('#w1').onclick=()=>{q.claimed=true;S.coins+=q.rw;AUDIO.reward();BB.save();close();renderHub();syncHud()};
    sh2.querySelector('#w2').onclick=async()=>{const r=await P.rewarded('wquest_x2');
      if(r.ok){q.claimed=true;S.coins+=q.rw*2;AUDIO.reward();BB.save();close();renderHub();syncHud()}
      else toast('{alert-triangle}',I18N.t('toast.watchad'))};
  });
  $$('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
  const fad=$('[data-freead]'); if(fad)fad.onclick=doFreeAd;
  const rst=$('[data-restore]'); if(rst)rst.onclick=restorePurchases;
  $$('#hBody .sw').forEach(c=>{try{BB.drawSkinPreview(c,c.dataset.sk)}catch(e){}});
  bindDeal(document.getElementById('hBody')||document);
  $$('[data-sw]').forEach(b=>b.onclick=()=>{const k=b.dataset.sw;S.set[k]=!S.set[k];
    b.classList.toggle('on',S.set[k]);AUDIO.setMuted(!S.set.sound);AUDIO.click();BB.save()});
  const l=$('#sLang'); if(l)l.onclick=()=>{I18N.set(I18N.lang==='ru'?'en':'ru');$('#btnLang').textContent=I18N.lang==='ru'?'EN':'RU';renderHub()};
  const nt=$('#sNotif'); if(nt)nt.onclick=async()=>{await enableReminders('settings')};
  const fv=$('#sFav'); if(fv)fv.onclick=async()=>{await enableFav('settings')};
  const rs=$('#sReset'); if(rs)rs.onclick=()=>{
    const sh2=open('<h2>'+I18N.t('set.resetQ')+'</h2><div class="row" style="margin-top:14px">'+
      '<button class="btn o" id="r0">'+I18N.t('set.no')+'</button><button class="btn m" id="r1">'+I18N.t('set.yes')+'</button></div>');
    sh2.querySelector('#r1').onclick=()=>{localStorage.removeItem('bb_save_v1');location.reload()};
  };
}
async function buy(k){
  const prices=PRICES;
  const amount=prices[k]||49;
  P.track('iap_click',{item:k,price:amount});
  if(P.inPlatform){
    if(!hasSku(k)){toast('{wallet}',I18N.t('shop.later'));P.track('iap_nosku',{item:k});return}
    const r=await P.pay(psku(k),amount);
    if(!r.ok){toast('{wallet}',I18N.t('shop.later'));return}
    P.track('iap_ok',{item:k,price:amount});
  }
  if(k==='noads'){S.noAds=true;P.setNoAds(true);AUDIO.reward();toast('{ban}',I18N.t('shop.noadsOn'));BB.save();renderHub();return}
  if(k==='golden'){S.golden=true;AUDIO.reward();toast('{crown}',I18N.t('shop.seasonOn'));BB.save();renderHub();return}
  if(k==='skinpack'){S.skins=BB.SKINS.map(s=>s.id);S.trial={id:'',games:0};BB.applySkin();AUDIO.reward();
    toast('{palette}',I18N.t('shop.skinsOn'));P.track('skinpack');BB.save();renderHub();if(openSheet&&openSheet.querySelector('.skgrid'))openSkins();return}
  const map={'0':250,'1':800,'2':2000,'3':5000,starter:1500,deal:DEAL_COINS};
  let v=map[k]||300;
  if(k==='deal'){S.deal={id:(S.deal&&S.deal.id)||0,until:0};}
  if(k==='starter'&&!S.starterBought){S.starterBought=true;S.boost=S.boost||{date:'',n:0,arm:false};S.boost.arm=true;S.xp+=300;checkLevel();}
  if(['0','1','2','3','starter'].indexOf(k)>=0&&!S.firstBuy){S.firstBuy=true;v*=2;}
  S.coins+=v;AUDIO.reward();toast('{bolt}','+'+v,I18N.t('shop.thanks'));BB.save();syncHud();renderHub();
}
function openSeason(){
  const tier=seasonTier(), need=SEASON_STEP-((S.season.xp||0)%SEASON_STEP);
  const pct=Math.floor(((S.season.xp||0)%SEASON_STEP)/SEASON_STEP*100);
  let h='<h2>{crown} '+I18N.t('season.title')+'</h2><div class="sub">'+I18N.t('season.sub')+'</div>';
  h+='<div class="seasead"><div class="seqq"><div class="slvl">'+I18N.t('aw.tier')+' <b>'+tier+'</b>/'+SEASON_LEN+'</div>'+
     '<div class="bar"><i style="width:'+pct+'%"></i></div>'+
     '<div class="sneed">'+I18N.t('season.next')+' <b>'+need+' XP</b></div></div>'+
     (S.golden?'<div class="pill am">{check} '+I18N.t('shop.seasonOn')+'</div>'
              :'<button class="btn g sm" id="sBuy">{crown} '+I18N.t('shop.season')+' \u00b7 '+ptxt('golden')+'</button>')+'</div>';
  h+='<div class="strack">';
  for(let i=0;i<SEASON_LEN;i++){
    const r=seasonRewards(i),got=(S.season.claimed||[]).includes(i),can=i<tier;
    const ic=r.k==='coins'?'{bolt}':(r.k==='skin'?'{palette}':'{tools}');
    const val=r.k==='skin'?I18N.t('skin.n.'+r.v):(S.golden?r.v*2:r.v);
    h+='<div class="scard '+(got?'got':(can?'can':'lock'))+(i%3===2?' gold':'')+'">'+
      '<div class="sn">'+(i+1)+'</div>'+
      '<div class="si">'+ic+'<b>'+val+'</b>'+((S.golden&&r.k!=='skin')?'<em>\u00d72</em>':'')+'</div>'+
      (got?'<div class="st">{check}</div>':can?'<button class="btn g sm" data-st="'+i+'">'+I18N.t('aw.claim')+'</button>'
       :'<div class="lk">{lock}</div>')+'</div>';
  }
  h+='</div><div class="shint">'+I18N.t('season.hint')+'</div>';
  const sh=open(h,{cls:'wide'});
  const bb=sh.querySelector('#sBuy');
  if(bb)bb.onclick=()=>{AUDIO.click();buy('golden')};
  sh.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.st;S.season.claimed=S.season.claimed||[];S.season.claimed.push(i);
    const r=seasonRewards(i);
    if(r.k==='coins')S.coins+=r.v*(S.golden?2:1);
    else if(r.k==='skin'){S.skins=S.skins||[];if(S.skins.indexOf(r.v)<0)S.skins.push(r.v);
      AUDIO.reward();toast('{palette}',I18N.t('skin.bought'),I18N.t('skin.n.'+r.v))}
    else S.coins+=200;
    AUDIO.reward();BB.save();openSeason();syncHud();
  });
  const tr=sh.querySelector('.strack');
  if(tr)requestAnimationFrame(()=>{const i=Math.max(0,Math.min(tier,SEASON_LEN-1));const c=tr.children[i];
    if(c)tr.scrollLeft=Math.max(0,Math.round(c.offsetLeft-(tr.clientWidth-c.offsetWidth)/2));});
}

/* ---------- pause / menu ---------- */
function openMenu(){
  if(G.running)G.running=false; P.banner(true);
  const resume=()=>{if(!G.over)G.running=true;syncHud()};
  const html='<h2>'+(G.over?I18N.t('over.title'):I18N.t('pause.title'))+'</h2>'+
    '<div class="sub">'+I18N.t('mode.'+G.mode)+' · '+nf(G.score)+'</div>'+
    '<div class="row"><button class="btn p" id="mRes">'+I18N.t('btn.continue')+'</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn o" id="mHub">'+I18N.t('nav.awards')+'</button>'+
    '<button class="btn o" id="mShop">'+I18N.t('nav.shop')+'</button>'+
    '<button class="btn o" id="mRestart">{rotate-clockwise} '+I18N.t('btn.restart')+'</button></div>'+
    '<div class="modesw-l">'+I18N.t('pause.mode')+'</div>'+
    '<div class="modesw" id="mModes">'+['classic','sprint','daily'].map(m=>'<button data-m="'+m+'" class="'+(m===G.mode?'on':'')+'">'+I18N.t('mode.'+m)+'</button>').join('')+'</div>'+
    '<div class="row" style="margin-top:8px"><button class="btn o" id="mMenu">{rocket} '+I18N.t('menu.back')+'</button>'+
    '<button class="btn o" id="mSet">'+I18N.t('set.title')+'</button>'+
    '<button class="btn o" id="mLang">'+(I18N.lang==='ru'?'English':'Русский')+'</button></div>';
  const sh=open(html,{onResume:resume});
  sh.querySelector('[data-close]').onclick=()=>{close();resume()};
  sh.querySelector('#mRes').onclick=()=>{close();resume()};
  sh.querySelector('#mHub').onclick=()=>openHub('rewards');
  sh.querySelector('#mShop').onclick=()=>openHub('shop');
  sh.querySelector('#mRestart').onclick=()=>{close();AUDIO.click();BB.startGame(G.mode)};
  const msw=sh.querySelector('#mModes');
  if(msw)msw.onclick=e=>{const b=e.target.closest('button');if(!b)return;AUDIO.click();
    if(b.dataset.m===G.mode&&!G.over){close();resume();return}
    close();BB.startGame(b.dataset.m)};
  sh.querySelector('#mSet').onclick=()=>openHub('set');
  sh.querySelector('#mMenu').onclick=()=>{close();if(duel){endDuel('flee')}else showMenu(true)};
  sh.querySelector('#mLang').onclick=()=>{I18N.set(I18N.lang==='ru'?'en':'ru');$('#btnLang').textContent=I18N.lang==='ru'?'EN':'RU';close();resume()};
}


/* ---------- attract mode: фон главного меню играет сам ---------- */
const ATTR={on:0,timer:0,wait:0};
function attractStop(){if(!ATTR.on)return;ATTR.on=0;clearInterval(ATTR.timer);ATTR.timer=0;
  try{AUDIO.setQuiet(false)}catch(e){}}
function attractRestart(){BB.startGame('classic',true);ATTR.wait=performance.now()+1100}
function attractStart(){
  if(ATTR.on)return;
  ATTR.on=1;
  try{AUDIO.setQuiet(true)}catch(e){}
  attractRestart();
  ATTR.timer=setInterval(()=>{
    if(!ATTR.on)return;
    const m=document.getElementById('menu');
    if(!m||!m.classList.contains('on')){attractStop();return}
    const now=performance.now();
    if(now<ATTR.wait)return;
    if(!BB.G.demo){attractStop();return}
    if(BB.G.over||!BB.G.running){attractRestart();return}
    if(!BB.demoBot()){ATTR.wait=now+900;return}
    ATTR.wait=now+380+Math.random()*560;
  },120);
}

/* ---------- ready rewards (агрегатор «есть что забрать») ---------- */
function readyCount(){
  let n=0;
  if(streakPending())n++;
  if(chestReady())n++;
  if(wheelReady())n++;
  if(questsClaimable())n++;
  if(wqClaimable())n++;
  if(!S.daily||S.daily.date!==today())n++;
  if(boostReady())n++;
  const d=today();
  if(!S.free||!S.free[d]||!S.free[d].hammer||!S.free[d].swap||!S.free[d].bomb)n++;
  return n;
}

/* ---------- пауэр-ап за рекламу, если не хватает бластов ---------- */
const HINTAD_MAX=3,PUAD_MAX=2;
function hintAdState(){const d=today();if(!S.hintAd||S.hintAd.date!==d)S.hintAd={date:d,n:0};return S.hintAd}
function hintAdLeft(){return HINTAD_MAX-hintAdState().n}
function puAdState(){const d=today();if(!S.puAd||S.puAd.date!==d)S.puAd={date:d,n:0};return S.puAd}
function puAdLeft(){return PUAD_MAX-puAdState().n}
async function offerPuAd(k){
  const left=puAdLeft();
  if(left<=0){toast('{bolt}',I18N.t('pu.adOut'));return false}
  const nm=I18N.t('pu.'+k);
  const sh=open('<h2>{bolt} '+I18N.t('pu.adTitle')+'</h2>'+
    '<div class="sub">'+I18N.t('pu.adSub',{n:nm,left:left})+'</div>'+
    '<div class="row" style="margin-top:14px"><button class="btn m" id="paGo">{player-play} '+I18N.t('btn.watch')+'</button>'+
    '<button class="btn o" id="paNo">'+I18N.t('btn.close')+'</button></div>');
  sh.querySelector('#paGo').onclick=async()=>{
    const r=await P.rewarded('pu_ad_'+k);
    if(!r.ok){toast('{alert-triangle}',I18N.t('toast.adfail'));return}
    puAdState().n++;BB.save();close();AUDIO.reward();
    try{P.track('ad_reward',{reason:'pu_'+k})}catch(e){}
    BB.freePower(k);
    toast(k==='hammer'?'{hammer}':k==='bomb'?'{bomb}':'{refresh}',I18N.t('pu.adGot',{n:nm}),I18N.t('pu.adLeft')+': '+(puAdLeft()));
    syncHud();
  };
  return true;
}

/* ---------- празднование большого приза ---------- */
function celebrate(title,sub,chips){
  const old=document.getElementById('celeb'); if(old)old.remove();
  const cols=['#3FE3FF','#FF5BD4','#9BFF4D','#FFC13D','#8B6CFF'];
  let cf='';
  for(let i=0;i<46;i++){
    cf+='<i style="left:'+(Math.random()*100).toFixed(1)+'%;background:'+cols[i%5]+
      ';animation-delay:'+(Math.random()*1.5).toFixed(2)+'s;animation-duration:'+(2.1+Math.random()*1.9).toFixed(2)+
      's;width:'+(6+Math.random()*8).toFixed(0)+'px;height:'+(10+Math.random()*12).toFixed(0)+'px"></i>';
  }
  const d=document.createElement('div'); d.id='celeb';
  d.innerHTML='<div class="cl-cf">'+cf+'</div><div class="cl-in"><div class="cl-ic">{gift}</div>'+
    '<h3>'+title+'</h3><div class="cl-sub">'+sub+'</div><div class="cl-chips">'+chips+'</div>'+
    '<button class="btn p" id="clOk">'+I18N.t('btn.ok')+'</button></div>';
  d.innerHTML=ix(d.innerHTML);
  document.body.appendChild(d);
  requestAnimationFrame(()=>d.classList.add('on'));
  AUDIO.levelup(); try{P.taptic('heavy')}catch(e){}
  let done=false;
  const fin=()=>{if(done)return;done=true;d.classList.add('out');setTimeout(()=>{d.parentNode&&d.remove()},480)};
  d.querySelector('#clOk').onclick=fin;
  d.addEventListener('click',e=>{if(e.target===d)fin()});
  setTimeout(fin,7500);
}
/* ---------- first run ---------- */
function firstRun(){
  if(!S.first)return;
  const sh=open('<h2>'+I18N.t('first.title')+'</h2><div class="sub">'+I18N.t('first.sub',{N:S.gridN})+'</div>'+
    '<div class="card"><div class="q"><div class="ic">{hand-finger}</div><div class="tx"><b>'+I18N.t('tutorial.1')+'</b></div></div>'+
    '<div class="q" style="margin-top:8px"><div class="ic">{sparkles}</div><div class="tx"><b>'+I18N.t('tutorial.2')+'</b></div></div>'+
    '<div class="q" style="margin-top:8px"><div class="ic">{flame}</div><div class="tx"><b>'+I18N.t('tutorial.3')+'</b></div></div></div>'+
    '<div class="row" style="margin-top:14px"><button class="btn p" id="fGo">'+I18N.t('first.go')+'</button></div>',{sticky:true,noClose:true,cls:'first-run'});
  sh.querySelector('#fGo').onclick=()=>{S.first=false;BB.save();close();showMenu(false);
    BB.startGame(menuMode);setTimeout(startTut,800)};
}
function fmtLeft(ms){
  if(ms<=0)return I18N.t('hub.chestReady');
  const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
  if(d)return d+I18N.t('time.d')+(h?' '+h+I18N.t('time.h'):'');
  if(h)return h+I18N.t('time.h')+' '+m+I18N.t('time.m');
  if(m)return m+I18N.t('time.m')+' '+s+I18N.t('time.s');
  return s+I18N.t('time.s');
}
const dayNum=BB.dayNum;

/* ---------- wire ---------- */
function wire(){
  const g=()=>{AUDIO.unlock();
    if(S.set.music!==false)AUDIO.music(true); else AUDIO.music(false);
    document.removeEventListener('pointerdown',g);document.removeEventListener('keydown',g)};
  document.addEventListener('pointerdown',g);document.addEventListener('keydown',g);
  $('#btnLang').textContent=I18N.lang==='ru'?'EN':'RU';
  $('#btnLang').onclick=()=>{I18N.set(I18N.lang==='ru'?'en':'ru');$('#btnLang').textContent=I18N.lang==='ru'?'EN':'RU';syncHud()};
  const fb=$('#btnFull');
  if(fb){
    const touch=('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches;
    if(P.fsSupported()&&!touch){ fb.hidden=false;
      fb.onclick=async()=>{ const ok=await P.fsToggle();
        if(!ok){toast('{alert-triangle}',I18N.t('fs.err'));return}
        await new Promise(r=>setTimeout(r,260)); syncFs(); };
      P.fsWatch(()=>syncFs());
    }
  }
  function syncFs(){ const fb=$('#btnFull'); if(!fb)return;
    const on=P.fsIsOn(); fb.innerHTML=ix(on?'{arrows-minimize}':'{arrows-maximize}');
    fb.setAttribute('aria-label',I18N.t(on?'fs.off':'fs.on')); fb.classList.toggle('on',on);
    requestAnimationFrame(()=>{try{BB.resize()}catch(e){}}) }
  $('#btnSound').onclick=()=>{S.set.sound=!S.set.sound;AUDIO.setMuted(!S.set.sound);
    AUDIO.music(S.set.sound&&S.set.music!==false);
    $('#btnSound').innerHTML=ix(S.set.sound?'{volume}':'{volume-off}');BB.save()};
  $('#btnSettings').onclick=openMenu;
  $('#setupChip').onclick=()=>{AUDIO.click();S.seenUnlock=false;BB.save();openSetup()};
  $('#btnChest').onclick=()=>{AUDIO.click();
    if(chestReady())openChest(); else openHub('rewards');};
  $('#btnPause').onclick=openMenu;
  const _bb=$('#btnBlast'); if(_bb)_bb.onclick=()=>{AUDIO.click();blastTap()};
  const _bx=$('#blastBox'); if(_bx)_bx.onclick=()=>{AUDIO.click();blastTap()};
  /* Esc закрывает открытую модалку (кроме «липких»: первый запуск, колесо) */
  window.addEventListener('keydown',e=>{
    if(e.key!=='Escape'&&e.key!=='Esc')return;
    if(!openSheet||openSheet._sticky)return;
    const xb=openSheet.querySelector('[data-close]');
    if(xb){e.preventDefault();xb.click()}else{e.preventDefault();close()}
  });
  window.addEventListener('keydown',e=>{
    if(!G.running||G.over||G.demo)return;
    if(document.querySelector('.scrim'))return;
    const mn=document.getElementById('menu'); if(mn&&mn.classList.contains('on'))return;
    if(e.code==='Space'||e.code==='KeyB'){e.preventDefault();blastTap()}
  });
  const bad=$('#bonusAd');
  if(bad)bad.onclick=async()=>{AUDIO.click();
    const r=await P.rewarded('bonus');
    if(r.ok){if(BB.addBonusTime()){toast('{clock}',I18N.t('bonus.added'),'+'+BB.BONUS_ADD+'s');AUDIO.reward()}}
    else toast('{alert-triangle}',I18N.t('toast.watchad'))};
  $$('.mtab').forEach(b=>b.onclick=()=>{
    $$('.mtab').forEach(x=>x.classList.toggle('active',x===b));
    const m=b.dataset.mode; AUDIO.click();
    if(m==='daily'&&S.daily.date===today()&&S.daily.played){
      toast('{calendar}',I18N.t('daily.replay')+(S.daily.best||0));
    }
    BB.startGame(m);
  });
  const puTap=k=>{AUDIO.click();if(!BB.buyPower(k))offerPuAd(k)};
  $('#puHammer').onclick=()=>puTap('hammer');
  $('#puSwap').onclick=()=>puTap('swap');
  $('#puBomb').onclick=()=>puTap('bomb');
  $('#puHint').onclick=async()=>{
    AUDIO.click();
    if(S.coins>=HINT_COST){S.coins-=HINT_COST;BB.hint();AUDIO.power();BB.save();syncHud();return}
    if(hintAdLeft()<=0){toast('{bolt}',I18N.t('hint.adOut'));return}
    const r=await P.rewarded('hint');
    if(r.ok){hintAdState().n++;BB.save();BB.hint();AUDIO.power();
      toast('{bulb}',I18N.t('toast.hint'),I18N.t('hint.left')+': '+hintAdLeft())}
    else toast('{bolt}',I18N.t('toast.nocoin'));
  };
  document.addEventListener('bb:lang',()=>{if(openSheet)renderHub()});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){AUDIO.setMuted(true);S.lastSeen=Date.now();BB.save();BB.pushCloud()}
    else{AUDIO.setMuted(!S.set.sound)}
  });
  document.addEventListener('contextmenu',e=>{ if(e.target&&e.target.id==='cv')e.preventDefault(); });
  window.addEventListener('pagehide',()=>{S.lastSeen=Date.now();try{localStorage.setItem('bb_save_v1',JSON.stringify(S));P.cloudFlush()}catch(e){}});
  P.onVisibility((vis)=>{if(!vis&&G.running){G.running=false;P.pageHide()}});
  setInterval(()=>{if(!document.hidden){S.lastSeen=Date.now()}},45000);
  setInterval(()=>{const e=$('#hBody');if(e&&hubTab==='rewards')renderHub();},1000);
  setInterval(()=>{const d=$('#dcd');if(d)d.textContent=fmtLeft(nextDailyMs());},1000);
}
window.UI={syncHud,blastTap,celebrate,offerPuAd,puAdLeft,hintAdLeft,syncArmed,toast,quest,syncMenu,claimStreak,streakPending,chainPos,attractStart,attractStop,readyCount,openSkins,trialOver,equipSkin,checkAch,checkLevel,onGameOver,onGameStart,openHub,openMenu,close,openChest,renderHub,showMenu,
  onAdInterstitial:maybeInterstitial,openWheel,wheelReady,startDuel,endDuel,duelOn:()=>!!duel,duelRival:()=>duel?duel.rival:null,duelState:()=>duel,resetRivals:()=>{rivals=null;rivalsAt=0},rivalsCache:()=>rivals,doShare,
  enableReminders,enableFav,doInvite,openWelcome,offlineBonus,doRate,syncPurchases,ADCFG};


/* ---------- темы ---------- */
const THEMES=[
 {id:'neon',n:'Neon',c:['#3FE3FF','#FF5BD4','#9BFF4D']},
 {id:'midnight',n:'Midnight',c:['#6FA8FF','#A78BFF','#4FD1C5']},
 {id:'sunset',n:'Sunset',c:['#FF8A5B','#FF4D8D','#FFC13D']},
 {id:'mint',n:'Mint',c:['#34E39A','#B6FF6E','#00D6C0']},
 {id:'cyber',n:'Cyber',c:['#FF2E97','#00E5FF','#B026FF']}
];
function applyTheme(id,quiet){
  S.theme=id;document.documentElement.setAttribute('data-theme',id);
  BB.setThemePal(id);
  try{if(window.BG&&BG.setTheme)BG.setTheme(id)}catch(e){}
  if(!quiet){AUDIO.click();toast('{sparkles}',I18N.t('theme.applied')+' · '+id)}
  BB.save();paintThemes();
}
function paintThemes(){
  const box=$('#menuThemes');
  if(box)box.innerHTML='<button class="mprev" id="menuPrevBtn" title="'+I18N.t('skin.title')+'">'+
      '<canvas id="menuPrev"></canvas><i class="mpv-l">'+I18N.t('theme.skin')+'</i></button>'+
    '<span class="tl">'+I18N.t('theme.title')+'</span>'+
    THEMES.map(t=>'<button class="tsw'+(S.theme===t.id?' on':'')+'" data-th="'+t.id+'" title="'+t.n+'">'+
      '<canvas class="tswc"></canvas></button>').join('');
  $$('[data-th]').forEach(b=>b.onclick=()=>applyTheme(b.dataset.th));
  $$('#menuThemes .tswc').forEach((c,i)=>{try{BB.drawThemeSwatch(c,THEMES[i].id)}catch(e){}});
  const pb=$('#menuPrevBtn'); if(pb)pb.onclick=()=>{AUDIO.click();showMenu(false);openSkins('menu')};
  drawMenuPrev(Date.now());
}
/* live skin preview in the main menu */
const PREV={t:0};
function drawMenuPrev(ts){
  const c=document.getElementById('menuPrev'); if(!c)return;
  try{ BB.drawSkinPreview(c,BB.effSkin(),ts) }catch(e){}
}
function prevStart(){ if(PREV.t)return;
  PREV.t=setInterval(()=>{ if(document.hidden)return; drawMenuPrev(Date.now()) },55); }
function prevStop(){ if(!PREV.t)return; clearInterval(PREV.t); PREV.t=0 }
/* ---------- главное меню ---------- */
let menuMode='classic';
function syncMenu(){
  $('#menuBest').textContent=nf(S.best[menuMode]||0);
  $('#menuStreak').textContent=(S.streak&&S.streak.n)||0;
  $('#menuCoins').textContent=nf(S.coins);
  $('#menuLang').textContent=I18N.lang==='ru'?'EN':'RU';
  $('#menuVer').textContent='v'+VER;
  const fz=$('#menuFz');
  if(fz){const n=S.freeze||0;fz.style.display=n>0?'':'none';fz.querySelector('b').textContent=n;}
  $$('#menuModes button').forEach(b=>b.classList.toggle('on',b.dataset.mode===menuMode));
  const rc=readyCount();
  const al=$('#menuHub'); if(al){al.classList.toggle('alert',rc>0);
    const bd=al.querySelector('.mbdg'); if(bd){bd.textContent=rc>9?'9+':String(rc);bd.classList.toggle('on',rc>0)}}
  const mc=$('#menuChain');
  if(mc){
    const pos=chainPos((S.streak&&S.streak.n)||1),p=streakPending();
    mc.classList.toggle('claim',!!p);
    const tt=mc.querySelector('#mchT'),ss=mc.querySelector('#mchS'),go=mc.querySelector('#mchGo'),dd=mc.querySelector('#mchD');
    if(tt)tt.textContent=I18N.t(p?'chain.ready':'chain.title');
    if(ss)ss.textContent=I18N.t('streak.day')+' '+pos+' · '+(p?('+'+p.amt):I18N.t('chain.claimed'));
    if(go)go.textContent=p?I18N.t('chain.get'):'';
    if(dd){let h='';for(let i=1;i<=7;i++){
      const done=(i<pos||(i===pos&&!p))?'done':'',now=(i===pos)?' now':'';
      h+='<i class="mch-d '+done+now+'">'+(i===7?'<svg class="ic"><use href="#i-gift"/></svg>':streakReward(i))+'</i>';}
      dd.innerHTML=h;}
  }
  const mw=$('#menuWheel'); if(mw)mw.classList.toggle('alert',wheelReady());
  const msp=$('#menuShop'); if(msp)msp.classList.toggle('alert',dealActive()||!S.firstBuy);
  const mbn=$('#menuBonus');
  if(mbn){const ready=BB.bonusReady();
    mbn.classList.toggle('played',!ready);
    const t=mbn.querySelector('#mbnT'),u=mbn.querySelector('#mbnS'),g=mbn.querySelector('#mbnGo');
    if(t)t.textContent=I18N.t('bonus.title');
    if(u)u.textContent=ready?I18N.t('bonus.sub'):I18N.t('bonus.next')+' '+fmtLeft(nextDailyMs());
    if(g)g.innerHTML=ready?('<svg class="ic"><use href="#i-player-play"/></svg><b class="mbn">'+I18N.t('bonus.go')+'</b>')
      :('<svg class="ic"><use href="#i-clock"/></svg>');
    mbn.classList.toggle('off',false);}
  try{WEEK.menu()}catch(e){}
  const mb=$('#menuBoost');
  if(mb){const bs=boostState(),on=bs.n<BOOST_MAX;
    mb.classList.toggle('off',!on);mb.classList.toggle('armed',!!bs.arm);
    const l=mb.querySelector('.mbn'); if(l)l.textContent=bs.arm?'':'×'+(BOOST_MAX-bs.n);
    const ic=mb.querySelector('.mbgo use'); if(ic)ic.setAttribute('href',bs.arm?'#i-check':'#i-bolt');
    const t=mb.querySelector('.mbtx b'); if(t)t.textContent=I18N.t('boost.title');
    const u=mb.querySelector('.mbtx span'); if(u)u.textContent=bs.arm?I18N.t('boost.on'):I18N.t('boost.sub');}
}
function questsClaimable(){return (S.quests.list||[]).some(q=>q.done&&!q.claimed)}
function showMenu(on){
  const m=$('#menu'); if(!m)return;
  if(on){G.running=false;BB.banner('');document.body.classList.remove('playing');
    requestAnimationFrame(()=>{try{BB.resize()}catch(e){}});syncMenu();m.classList.add('on');m.setAttribute('aria-hidden','false');
    document.body.classList.add('menu-on');P.banner(true);attractStart();prevStart()}
  else{m.classList.remove('on');m.setAttribute('aria-hidden','true');
    document.body.classList.remove('menu-on');P.banner(false);attractStop();prevStop()}
}
function wireMenu(){
  $$('#menuModes button').forEach(b=>b.onclick=()=>{menuMode=b.dataset.mode;AUDIO.click();syncMenu()});
  $('#menuPlay').onclick=()=>{AUDIO.click();close();showMenu(false);BB.startGame(menuMode);
    if(S.first){S.first=false;BB.save();setTimeout(startTut,700)}};
  $('#menuHub').onclick=()=>{AUDIO.click();openHub('rewards')};
  $('#menuShop').onclick=()=>{AUDIO.click();openHub('shop')};
  $('#menuTop').onclick=()=>{AUDIO.click();openHub('top')};
  const mw=$('#menuWeek'); if(mw)mw.onclick=()=>{AUDIO.click();openHub('top')};
  $('#menuSkins').onclick=()=>{AUDIO.click();showMenu(false);openSkins('menu')};
  $('#menuSet').onclick=()=>{AUDIO.click();openHub('set')};
  $('#menuWheel').onclick=()=>{AUDIO.click();showMenu(false);openWheel('menu')};
  $('#menuBoost').onclick=async()=>{AUDIO.click();await doBoost('menu')};
  const mbn=$('#menuBonus'); if(mbn)mbn.onclick=()=>{AUDIO.click();
    if(BB.bonusReady()){close();showMenu(false);BB.startGame('sprint',false,{bonus:true})}
    else toast('{clock}',I18N.t('bonus.played'))};
  $('#menuLang').onclick=()=>{I18N.set(I18N.lang==='ru'?'en':'ru');$('#btnLang').textContent=I18N.lang==='ru'?'EN':'RU';syncMenu();paintThemes()};
  const mch=$('#menuChain'); if(mch)mch.onclick=()=>{AUDIO.click();if(streakPending())claimStreak();else openHub('rewards')};
}
/* ---------- обучение ---------- */
const TUT={on:0,el:null};
function startTut(){if(S.tut>=4)return;TUT.on=1;showTut()}
function showTut(){
  if(!TUT.on)return;
  const stage=$('#stage');
  let ring=document.getElementById('coach'), tip=document.getElementById('coachTip');
  if(!ring){ring=document.createElement('div');ring.id='coach';stage.appendChild(ring)}
  if(!tip){tip=document.createElement('div');tip.id='coachTip';stage.appendChild(tip)}
  const L=BB.getLayout();
  const steps=[
    {x:L.slots[0].x+L.slots[0].w/2,y:L.slots[0].y+L.slots[0].h/2,ic:'hand-finger',t:I18N.t('tut.1'),below:false},
    {x:L.bx+L.bs/2,y:L.by+L.bs*0.55,ic:'layout-grid',t:I18N.t('tut.2'),below:true},
    {x:L.bx+L.bs/2,y:L.by+L.bs*0.55,ic:'flame',t:I18N.t('tut.3'),below:true},
    (()=>{const L2=BB.getLayout();return {x:L2.bx+L2.bs/2,y:L2.by+L2.bs+10,ic:'sparkles',t:I18N.t('tut.4'),below:false}})()
  ];
  const st=steps[Math.min(TUT.on-1,3)];
  const sw=stage.clientWidth, sh=stage.clientHeight;
  ring.className='c'+TUT.on;
  ring.style.left=Math.round(Math.max(20,Math.min(st.x,sw-20)))+'px';
  ring.style.top=Math.round(Math.max(20,Math.min(st.y,sh-20)))+'px';
  tip.className='c'+TUT.on;
  tip.innerHTML='<svg class="ic"><use href="#i-'+st.ic+'"/></svg><b>'+st.t+'</b>'+
    '<span class="coach-n">'+TUT.on+' / 4 <button class="nxt" id="tutNext">'+I18N.t('tut.next')+'</button></span>';
  requestAnimationFrame(()=>{
    const tw=tip.offsetWidth,th=tip.offsetHeight;
    const s0=L.slots[0]||{x:0,w:0}, s2=L.slots[2]||s0;
    const trayL=s0.x, trayR=s2.x+s2.w, trayCx=(trayL+trayR)/2;
    const boardR={l:L.bx,t:L.by,r:L.bx+L.bs,b:L.by+L.bs};
    const trayR2={l:trayL,t:L.trayY,r:trayR,b:L.trayY+L.trayH};
    const ov=(a,b)=>Math.max(0,Math.min(a.r,b.r)-Math.max(a.l,b.l))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.t,b.t));
    const rectOf=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=stage.getBoundingClientRect();
      if(r.width<2||r.height<2||getComputedStyle(e).display==='none'||getComputedStyle(e).visibility==='hidden')return null;
      if(+getComputedStyle(e).opacity<0.06)return null;
      return {l:r.left-s.left,t:r.top-s.top,r:r.right-s.left,b:r.bottom-s.top}};
    const obs=[rectOf($('#hud')),rectOf($('#hudStats')),rectOf($('#duelHud'))].filter(Boolean);
    const boxOf=rs=>rs.length?rs.reduce((a,b)=>({l:Math.min(a.l,b.l),t:Math.min(a.t,b.t),r:Math.max(a.r,b.r),b:Math.max(a.b,b.b)})):null;
    const hudBox=boxOf(obs.slice(0,2));
    const cands=[
      [(sw-tw)/2, L.by-th-16],
      [trayCx-tw/2, L.trayY-th-12],
      [trayL-tw-14, L.trayY+(L.trayH-th)/2],
      [trayR+14, L.trayY+(L.trayH-th)/2],
      [L.bx-tw-12, L.by+(L.bs-th)/2],
      [L.bx+L.bs+14, L.by+(L.bs-th)/2],
      [L.bx+L.bs+14, L.by+8],
      [sw-tw-12, L.by+8],
      [(sw-tw)/2, L.trayY+L.trayH+12],
      [(sw-tw)/2, sh-th-14],
      [(sw-tw)/2, 12]
    ].concat(hudBox?[[hudBox.l,hudBox.b+12],[hudBox.l,hudBox.t-th-12],[hudBox.r+12,hudBox.t],[hudBox.r+12,hudBox.b-th-12]]:[])
     .map(c=>({x:Math.round(c[0]),y:Math.round(c[1])}))
     .filter(c=>c.x>=10&&c.x+tw<=sw-10&&c.y>=10&&c.y+th<=sh-10);
    let best=null,bs=1e18,bi=-1;
    cands.forEach((c,ci)=>{c._i=ci});
    for(const c of cands){
      const r={l:c.x,t:c.y,r:c.x+tw,b:c.y+th};
      const d=Math.hypot(c.x+tw/2-st.x,c.y+th/2-st.y);
      let sc=ov(r,boardR)*1000+ov(r,trayR2)*400+d;
      obs.forEach(o=>{sc+=ov(r,o)*700});
      if(sc<bs){bs=sc;best=c;bi=c._i}
    }
    if(!best)best={x:Math.round(Math.max(10,Math.min((sw-tw)/2,sw-tw-10))),
                   y:Math.round(Math.max(10,Math.min(st.y+54,sh-th-10)))};
    tip.dataset.cand=bi;tip.dataset.cands=JSON.stringify(cands.map(c=>[c.x,c.y]));
    tip.style.left=best.x+'px'; tip.style.top=best.y+'px';
  });
  const nx=tip.querySelector('#tutNext'); if(nx)nx.onclick=()=>tutStep(TUT.on+1);
}
function tutStep(n){if(!TUT.on)return;S.tut=n;BB.save();
  try{ if(n>=4) P.trackOnce('tutorial_done') }catch(e){}
  if(n>=4){TUT.on=0;['#coach','#coachTip'].forEach(q=>{const e=$(q);if(e)e.remove()});return}
  TUT.on=n;showTut()}
function endTut(){if(!TUT.on)return;tutStep(4)}



function nextDailyMs(){const d=new Date();const n=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0,0);
  return Math.max(0,n.getTime()-d.getTime());}
/* ---------- hot deal ---------- */
/* ---------- v2.6: free blasts for ads + restore purchases ---------- */
const FREE_AD_MAX=3;
function freeAdAmt(){return Math.min(300,120+(S.level||1)*12)}
function freeAdState(){
  const d=today();
  if(!S.freeAd||S.freeAd.date!==d)S.freeAd={date:d,n:0};
  const n=S.freeAd.n||0;
  return {n:n,max:FREE_AD_MAX,left:Math.max(0,FREE_AD_MAX-n),amt:freeAdAmt()};
}
async function doFreeAd(){
  AUDIO.click();
  const st=freeAdState();
  if(st.left<=0){toast('{clock}',I18N.t('shop.freeDone'));return}
  const r=await P.rewarded('free_coins');
  if(!r.ok){toast('{alert-triangle}',I18N.t('toast.watchad'));return}
  S.freeAd={date:today(),n:st.n+1};S.coins+=st.amt;BB.save();AUDIO.reward();
  toast('{coin}','+'+st.amt);renderHub();syncHud();
}
async function syncPurchases(silent){
  let list=[];
  try{ const r=await P.purchases();
    if(Array.isArray(r))list=r; else if(r&&r.ok&&r.data)list=r.data.purchases||r.data.items||[] }catch(e){ return false }
  if(!list.length)return false;
  let changed=false;
  list.forEach(p=>{let it=String((p&&(p.item||p.id))||'');
    for(const kk in SKU){if(SKU[kk]===it)it=kk}
    if(it==='noads'){if(!S.noAds){S.noAds=true;P.setNoAds(true);changed=true}}
    else if(it==='golden'){if(!S.golden){S.golden=true;changed=true}}
    else if(it==='skinpack'){if((S.skins||[]).length<BB.SKINS.length){S.skins=BB.SKINS.map(x=>x.id);changed=true}}
    else if(it==='starter'){if(!S.starterBought){S.starterBought=true;changed=true}}});
  if(changed&&!silent){BB.save();syncHud();if(openSheet)renderHub();toast('{circle-check}',I18N.t('shop.restored'))}
  else if(changed){BB.save()}
  return changed;
}
async function restorePurchases(){
  AUDIO.click();
  let ok=false;
  try{
    let r=await P.purchases(); let list=[];
    if(Array.isArray(r))list=r;
    else if(r&&r.ok&&r.data)list=r.data.purchases||r.data.items||[];
    if(list.length){
      list.forEach(p=>{let it=String((p&&(p.item||p.id))||'');
        for(const kk in SKU){if(SKU[kk]===it)it=kk}
        if(it==='noads'){S.noAds=true;P.setNoAds(true)}
        else if(it==='golden')S.golden=true;
        else if(it==='skinpack')S.skins=BB.SKINS.map(x=>x.id);
        else if(it==='starter')S.starterBought=true;});
      ok=true;
    }
  }catch(e){}
  if(!ok){try{const c=await P.cloudGet();if(c&&(c.updatedAt||0)>(S.updatedAt||0)&&BB.adoptRemote(c))ok=true}catch(e){}}
  if(ok){BB.save();syncHud();renderHub();toast('{circle-check}',I18N.t('shop.restored'))}
  else toast('{alert-triangle}',I18N.t('shop.restoreFail'));
}
const DEAL_MS=20*60*1000, DEAL_ITEM='deal', DEAL_PRICE=25, DEAL_COINS=2400;
const PRICES={noads:99,golden:149,starter:49,skinpack:149,freeze:300,'0':25,'1':74,'2':179,'3':399,deal:DEAL_PRICE};
const SKU={'0':'coins_small','1':'coins_medium','2':'coins_large','3':'coins_xl',starter:'starter_pack',noads:'no_ads',golden:'season_pass',skinpack:'skin_pack',deal:'hot_deal'};
function psku(k){return SKU[k]||k}
function ptxt(k){return P.priceText(psku(k),PRICES[k])}
const CUR={RUB:'₽',USD:'$',EUR:'€',TRY:'₺',UAH:'₴',KZT:'₸',BYN:'Br',ILS:'₪',GEL:'₾',AMD:'֏',AED:'AED',SAR:'SAR',CNY:'¥',INR:'₹',BRL:'R$',KRW:'₩',JPY:'¥',VND:'₫',IDR:'Rp',MYR:'RM',PHP:'₱',THB:'฿',NGN:'₦',EGP:'E£',TND:'DT',MAD:'DH',AZN:'₼',TJS:'TJS',TKM:'TMT',UZS:'UZS',MDL:'L',RSD:'din',MKD:'din',ALL:'L',ALL_:'L'};
function pnum(k){const p=P.product(psku(k));const v=p&&p.priceValue?parseFloat(p.priceValue):NaN;return isNaN(v)||!v?PRICES[k]:v}
function pcur(k){const p=P.product(psku(k));const c=(p&&p.priceCurrencyCode)||'RUB';return CUR[c]||c}
function hasSku(k){return !P.ya||!!P.product(psku(k))}
function dealActive(){return !!(S.deal&&S.deal.until>Date.now())}
function maybeDeal(){
  const d=dayNum(today());
  if(S.deal&&S.deal.id===d)return false;
  if((S.stats.games||0)<2)return false;
  S.deal={id:d,until:Date.now()+DEAL_MS};BB.save();return true;
}
function dealLeft(ms){const m=Math.floor(ms/60000),sec=Math.floor((ms%60000)/1000);
  return m+':'+String(sec).padStart(2,'0');}
function dealStrip(){
  if(!dealActive())return '';
  return '<div class="deal"><div class="deal-l"><div class="dt">{flame} '+I18N.t('deal.title')+'</div>'+
    '<div class="dd">'+I18N.t('deal.sub')+'</div>'+
    '<div class="dd">'+I18N.t('deal.left')+' <b class="dtime">'+dealLeft(S.deal.until-Date.now())+'</b>'+
    ' <em class="dtage">'+I18N.t('deal.tag')+'</em></div></div>'+
    '<button class="btn m dealb" id="dealBuy">{bolt} '+DEAL_COINS+'<i class="psmall">'+(P.ya?'':('<s>'+(DEAL_PRICE*3)+' ₽</s> '))+ptxt('deal')+'</i></button></div>';
}
function bindDeal(root){
  if(!root)return;
  const b=root.querySelector?root.querySelector('#dealBuy'):null;
  if(b)b.onclick=()=>{AUDIO.click();buy(DEAL_ITEM)};
  const t=root.querySelector?root.querySelector('.dtime'):null;
  if(t){const iv=setInterval(()=>{
    if(!document.body.contains(t)){clearInterval(iv);return}
    const left=(S.deal&&S.deal.until||0)-Date.now();
    if(left<=0){const w=t.closest('.deal');if(w)w.remove();clearInterval(iv);return}
    t.textContent=dealLeft(left);},1000);}
}
/* ---------- lucky wheel ---------- */
const WSEG=[
  {t:'coins',v:60,ic:'bolt',w:20},
  {t:'pu',k:'hammer',ic:'hammer',w:11},
  {t:'coins',v:150,ic:'bolt',w:15},
  {t:'xp',v:150,ic:'trophy',w:11},
  {t:'coins',v:30,ic:'bolt',w:18},
  {t:'pu',k:'bomb',ic:'bomb',w:9},
  {t:'coins',v:500,ic:'bolt',w:6},
  {t:'pu',k:'swap',ic:'refresh',w:10}
];
const WST={rot:-Math.PI/8,spinning:false,conf:[],imgs:{},tick:0,labels:[]};
function wLabel(i){const s=WSEG[i];
  if(s.t==='coins')return '+'+s.v;
  if(s.t==='xp')return '+'+s.v+' XP';
  return I18N.t('pu.'+s.k);}
function wLabels(){WST.labels=WSEG.map((_,i)=>wLabel(i))}
function wIcon(name,color){const k=name+'|'+color;
  if(WST.imgs[k])return WST.imgs[k];
  const sym=document.getElementById('i-'+name); if(!sym)return null;
  const vb=sym.getAttribute('viewBox')||'0 0 24 24';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb+'" fill="none" stroke="'+color+
    '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+sym.innerHTML+'</svg>';
  const img=new Image(); img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  WST.imgs[k]=img; return img;
}
function wheelState(){const t=today();
  if(!S.wheel||S.wheel.date!==t)S.wheel={date:t,free:1,ads:0,coins:0};
  return S.wheel;}
function wheelCoinCost(){const w=wheelState();return 250+w.coins*150;}
function wheelReady(){const w=wheelState();return w.free>0||w.ads<3;}
function pickSeg(){let tot=0;WSEG.forEach(s=>tot+=s.w);let r=Math.random()*tot;
  for(let i=0;i<WSEG.length;i++){r-=WSEG[i].w;if(r<=0)return i}return 0;}
function drawWheel(){
  const cv=document.getElementById('wheelCv'); if(!cv)return;
  const css=cv.clientWidth||300; if(css<40)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(cv.width!==Math.round(css*dpr)){cv.width=cv.height=Math.round(css*dpr)}
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  const cx=css/2,cy=css/2,R=css/2-4,seg=Math.PI*2/8,rot=WST.rot,pal=BB.PAL;
  c.clearRect(0,0,css,css);
  // glow ring
  c.save();c.shadowColor='rgba(63,227,255,.45)';c.shadowBlur=R*0.14;
  c.beginPath();c.arc(cx,cy,R*0.965,0,6.283);c.lineWidth=R*0.07;
  c.strokeStyle='rgba(12,18,36,.92)';c.stroke();c.restore();
  c.beginPath();c.arc(cx,cy,R*0.965,0,6.283);c.lineWidth=R*0.07;
  c.strokeStyle='rgba(255,255,255,.09)';c.stroke();
  // segments
  for(let i=0;i<8;i++){
    const a0=rot+i*seg,a1=a0+seg,p=pal[i%pal.length];
    c.save();
    c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,R*0.925,a0,a1);c.closePath();
    const g=c.createRadialGradient(cx,cy,R*0.10,cx,cy,R*0.925);
    g.addColorStop(0,p.b);g.addColorStop(.72,p.b);g.addColorStop(1,p.a);
    c.fillStyle=g;c.fill();
    c.strokeStyle='rgba(6,10,20,.55)';c.lineWidth=2;c.stroke();
    c.restore();
    const mid=a0+seg/2;
    /* keep labels upright: flip the text on the left half of the wheel */
    const flip=Math.cos(mid)<0;
    c.save();c.translate(cx,cy);c.rotate(mid+(flip?Math.PI:0));
    c.textAlign=flip?'left':'right';c.textBaseline='middle';
    c.font='800 '+Math.max(10,Math.round(R*0.115))+'px Rubik, sans-serif';
    const tx=R*0.83, dir=flip?-1:1;
    c.fillStyle='rgba(0,0,0,.45)';c.fillText(WST.labels[i]||'',tx*dir,R*0.012);
    c.fillStyle='#fff';c.fillText(WST.labels[i]||'',tx*dir,0);
    const img=wIcon(WSEG[i].ic,'#ffffff');
    if(img&&img.complete&&img.naturalWidth){const sz=R*0.155;c.drawImage(img,dir>0?R*0.855:(-R*0.855-sz),-sz/2,sz,sz)}
    c.restore();
  }
  // bulbs
  const now=performance.now();
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8+rot*0.5;
    const on=(i+Math.floor(now/140))%3===0;
    c.save();c.beginPath();c.arc(cx+Math.cos(a)*R*0.965,cy+Math.sin(a)*R*0.965,R*0.028,0,6.283);
    c.fillStyle=on?'#fff':'rgba(255,255,255,.22)';
    if(on){c.shadowColor='rgba(255,255,255,.9)';c.shadowBlur=R*0.09}
    c.fill();c.restore();
  }
  // hub disc
  c.save();c.beginPath();c.arc(cx,cy,R*0.30,0,6.283);
  const hg=c.createLinearGradient(cx,cy-R*0.3,cx,cy+R*0.3);
  hg.addColorStop(0,'#0d1730');hg.addColorStop(1,'#060a16');
  c.fillStyle=hg;c.fill();c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=2;c.stroke();c.restore();
  // confetti
  for(let i=WST.conf.length-1;i>=0;i--){const q=WST.conf[i];
    q.life-=0.014; if(q.life<=0){WST.conf.splice(i,1);continue}
    q.x+=q.vx;q.y+=q.vy;q.vy+=0.22;q.vx*=0.99;q.a+=q.va;
    c.save();c.globalAlpha=Math.max(0,q.life);c.translate(q.x,q.y);c.rotate(q.a);
    c.fillStyle=q.c;c.fillRect(-q.s/2,-q.s/2,q.s,q.s*0.5);c.restore();
  }
}
function wheelConfetti(){
  const cv=document.getElementById('wheelCv'); if(!cv)return;
  const css=cv.clientWidth||300,cx=css/2,cy=css/2;
  const pal=BB.PAL;
  for(let i=0;i<90;i++){const a=Math.random()*6.283,sp=2+Math.random()*6;
    WST.conf.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,a:Math.random()*6.283,va:(Math.random()-.5)*.4,
      s:4+Math.random()*7,life:1,c:pal[i%pal.length].a});}
}
let wLoopOn=false;
function wheelLoop(){ if(!document.getElementById('wheelCv')){wLoopOn=false;return} drawWheel(); requestAnimationFrame(wheelLoop); }
function wheelMeta(){
  const w=wheelState(),cost=wheelCoinCost();
  return '<div class="wmeta"><span>'+I18N.t('wheel.free')+': <b>'+w.free+'</b></span>'+
    '<span>'+I18N.t('wheel.adSpin')+': <b>'+(3-w.ads)+'/3</b></span>'+
    '<span>'+I18N.t('wheel.coinSpin')+': <b>'+cost+' {bolt}</b></span></div>';
}
function wheelButtons(sh){
  const w=wheelState(),cost=wheelCoinCost();
  const m=sh.querySelector('#wMeta'); if(m)m.innerHTML=ix(wheelMeta());
  const hub=sh.querySelector('#wHub');
  if(hub){
    hub.disabled=WST.spinning;
    hub.innerHTML=ix('<b>'+I18N.t('wheel.spin')+'</b><em>'+(w.free>0?I18N.t('wheel.free')+' '+w.free:I18N.t('wheel.adSpin'))+'</em>');
    hub.onclick=()=>{ if(WST.spinning)return;
      if(wheelState().free>0)spinWheel('free');
      else if(w.ads<3)spinWheel('ad');
      else spinWheel('coin'); };
  }
  const ad=sh.querySelector('#wAd');
  if(ad){ad.innerHTML=ix('{player-play} '+I18N.t('wheel.adSpin')+' ('+(3-w.ads)+'/3)');
    ad.disabled=WST.spinning||w.ads>=3; ad.onclick=()=>spinWheel('ad');}
  const cn=sh.querySelector('#wCoin');
  if(cn){cn.innerHTML=ix('{bolt} '+cost);
    cn.disabled=WST.spinning||S.coins<cost; cn.onclick=()=>spinWheel('coin');}
}
async function spinWheel(kind){
  if(WST.spinning)return;
  const w=wheelState();
  if(kind==='free'){ if(w.free<=0){kind= w.ads<3?'ad':'coin';} else w.free--; }
  if(kind==='ad'){
    if(w.ads>=3){toast('{alert-triangle}',I18N.t('wheel.noSpins'));return}
    const r=await P.rewarded('wheel_ad');
    if(!r.ok){toast('{alert-triangle}',I18N.t('toast.watchad'));return}
    w.ads++;
  }
  if(kind==='coin'){
    const cost=wheelCoinCost();
    if(S.coins<cost){toast('{bolt}',I18N.t('toast.nocoin'));return}
    S.coins-=cost;w.coins++;
  }
  BB.save();
  try{ P.track('wheel_spin',{kind:kind}); P.trackOnce('first_wheel') }catch(e){}
  const sh=openSheet; if(!sh)return;
  wheelButtons(sh);
  const idx=pickSeg();
  WST.spinning=true;
  const seg=Math.PI*2/8;
  const target=-Math.PI/2-(idx*seg+seg/2)+(Math.random()*0.5-0.25)*seg;
  const cur=WST.rot; let delta=target-cur;
  while(delta<0)delta+=Math.PI*2;
  delta+=Math.PI*2*(4+Math.floor(Math.random()*3));
  const t0=performance.now(),dur=4200; WST.tick=Math.floor(((cur%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/seg);
  (function anim(now){
    const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,4.2);
    WST.rot=cur+delta*e;
    const ti=Math.floor((((WST.rot%(Math.PI*2))+Math.PI*2)%(Math.PI*2))/seg);
    if(ti!==WST.tick){WST.tick=ti;AUDIO.tick();}
    drawWheel();
    if(p<1)requestAnimationFrame(anim);
    else{WST.spinning=false;wheelWin(idx);}
  })(t0);
}
function wheelWin(idx){
  const s=WSEG[idx];
  AUDIO.reward();wheelConfetti();
  setTimeout(()=>wheelResult(s,idx,false),700);
}
function wheelResult(s,idx,dbl){
  const sh=openSheet?openSheet.querySelector('.sheet'):null; if(!sh)return;
  let txt,ic;
  if(s.t==='coins'){txt='+'+(s.v*(dbl?2:1))+' {bolt}';ic='bolt'}
  else if(s.t==='xp'){txt='+'+(s.v*(dbl?2:1))+' XP';ic='trophy'}
  else {txt=I18N.t('pu.'+s.k);ic=s.k}
  sh.innerHTML=ix('<h2>{sparkles} '+I18N.t('wheel.title')+'</h2>'+
    '<div class="sub">'+I18N.t('wheel.win')+'</div>'+
    '<div class="wresult r'+idx+'"><svg class="ic"><use href="#i-'+ic+'"/></svg><b>'+txt+'</b></div>'+
    (dbl||s.t!=='pu'?'':'<div class="sub" style="margin-top:6px">'+I18N.t('wheel.rBlast')+'</div>')+
    '<div class="row" style="margin-top:14px">'+
      (dbl?'':'<button class="btn m" id="w2">{player-play} '+I18N.t('wheel.double')+'</button>')+
      '<button class="btn g" id="wTake">'+I18N.t('wheel.take')+'</button></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn o" id="wAgain">{refresh} '+I18N.t('wheel.again')+'</button></div>');
  sh.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
  const take=sh.querySelector('#wTake');
  take.onclick=()=>{const pu=(s.t==='pu');const from=WHEEL_FROM;WHEEL_FROM=null;
    grantWheel(s,dbl);close();
    if(pu&&from==='menu'){showMenu(false);BB.startGame(menuMode)}
    else if(from==='menu'){showMenu(true)}
    renderHub();syncHud()};
  const d2=sh.querySelector('#w2');
  if(d2)d2.onclick=async()=>{const r=await P.rewarded('wheel_x2');
    if(r.ok){AUDIO.reward();wheelResult(s,idx,true)}else toast('{alert-triangle}',I18N.t('toast.watchad'))};
  const ag=sh.querySelector('#wAgain');
  const w=wheelState();
  if(!(w.free>0||w.ads<3||S.coins>=wheelCoinCost()))ag.style.display='none';
  ag.onclick=()=>{openWheel(WHEEL_FROM)};
}
function grantWheel(s,dbl){
  const m=dbl?2:1;
  if(s.t==='coins'){S.coins+=s.v*m;AUDIO.reward();}
  else if(s.t==='xp'){S.xp+=s.v*m;checkLevel();}
  else {if(dbl)S.wheelBoost=1;BB.save();syncHud();BB.freePower(s.k);return;}
  BB.save();syncHud();
  toast(s.t==='coins'?'{bolt}':'{trophy}',I18N.t('wheel.win'),txt0(s,dbl));
}
function txt0(s,dbl){const m=dbl?2:1;
  return s.t==='coins'?'+'+(s.v*m)+' {bolt}':'+'+(s.v*m)+' XP'}
let WHEEL_FROM=null;
function wheelBack(){ if(WHEEL_FROM==='menu'){WHEEL_FROM=null;showMenu(true)} }
function wheelChances(){
  let tot=0;WSEG.forEach(s=>tot+=s.w);
  return '<div class="wch">'+WSEG.map((s,i)=>{
    const p=Math.round(s.w/tot*100);
    const ic=s.t==='coins'?'bolt':(s.t==='xp'?'trophy':s.k);
    const lab=s.t==='coins'?s.v:(s.t==='xp'?s.v+' XP':I18N.t('pu.'+s.k));
    const col=(BB.PAL&&BB.PAL[i%BB.PAL.length]&&BB.PAL[i%BB.PAL.length].a)||'#3FE3FF';
    return '<span class="wchip" style="--wc:'+col+'"><svg class="ic"><use href="#i-'+ic+'"/></svg>'+lab+'<b>'+p+'%</b></span>';
  }).join('')+'</div>';
}
function openWheel(from){
  WHEEL_FROM=from||WHEEL_FROM||null;
  wLabels();WST.conf.length=0;
  const html='<h2>{sparkles} '+I18N.t('wheel.title')+'</h2><div class="sub">'+I18N.t('wheel.sub')+'</div>'+
   '<div class="wheelwrap"><canvas id="wheelCv"></canvas><div class="wheelptr"></div>'+
   '<button class="wheelhub" id="wHub"></button></div>'+
   '<div id="wMeta"></div>'+
   '<div class="row" style="margin-top:10px"><button class="btn m" id="wAd"></button>'+
   '<button class="btn o" id="wCoin"></button></div>'+
   '<div class="wchwrap" id="wCh"></div>';
  const sh=open(html,{sticky:true});
  const xb=sh.querySelector('[data-close]'); if(xb)xb.onclick=()=>{close();wheelBack()};
  if(!wLoopOn){wLoopOn=true;requestAnimationFrame(wheelLoop)}
  requestAnimationFrame(()=>{drawWheel();wheelButtons(sh);const wc=sh.querySelector('#wCh');if(wc)wc.innerHTML=ix(wheelChances())});
}

/* ---------- boot ---------- */
async function boot(){
  bootAt=Date.now();
  I18N.load();toastAnchor();setTimeout(toastAnchor,300);
  $('#btnSound').innerHTML=ix(S.set.sound?'{volume}':'{volume-off}');
  const fill=$('#bootFill'); let p=0;
  const step=(v)=>{p=v;fill.style.width=p+'%'};
  step(18);
  await AUDIO.load(); step(52);
  AUDIO.setMuted(!S.set.sound);
    try{ await P.init(); }catch(e){}
    try{ reviewOk=await P.canReview() }catch(e){ reviewOk=false }
    /* remote-tunable, but hard-clamped to stay inside the Yandex Games ad policy */
    const cl=(v,a,z,d)=>{v=Number(v);if(!isFinite(v))return d;return Math.max(a,Math.min(z,v))};
    ADCFG.interGames  =cl(P.flag('inter_games',ADCFG.interGames),2,10,3);
    ADCFG.interGap    =cl(P.flag('inter_gap_ms',ADCFG.interGap),120000,900000,150000);
    ADCFG.afterReward =cl(P.flag('after_reward_ms',ADCFG.afterReward),20000,180000,35000);
    ADCFG.maxPerHour  =cl(P.flag('inter_per_hour',ADCFG.maxPerHour),1,6,6);
  step(72);
  // cloud save: pull remote progress if it is newer, otherwise seed the cloud copy
  try{
    const remote=await Promise.race([P.cloudGet(),new Promise(r=>setTimeout(()=>r(null),3500))]);
    if(remote&&(Number(remote.updatedAt)||0)>BB.localUpdatedAt()){
      if(BB.adoptRemote(remote)){if(S.noAds)P.setNoAds(true);syncHud();paintThemes();}
    } else P.cloudSet(S);
  }catch(e){}
  if(P.noAds||S.noAds)P.setNoAds(!!S.noAds);
  try{ await syncPurchases(true) }catch(e){}
  genQuests(); touchStreak();
  try{WEEK.ensure()}catch(e){}
  setTimeout(()=>{try{refreshBonuses()}catch(e){}},1500);
  if(!S.chest.next)S.chest.next=Date.now()+2*3600e3;
  BB.startGame('classic');
  step(92);
  BB.resize();
  syncHud(); wire();
  await new Promise(r=>setTimeout(r,260));
  step(100);
  $('#boot').classList.add('gone');
  setTimeout(()=>{$('#boot').style.display='none'},600);
  applyTheme(S.theme||'neon',true);
  BB.applySkin();
  wireMenu();paintThemes();
  P.ready();
  try{ P.funnel() }catch(e){}
  setTimeout(()=>{try{yaAchInit()}catch(e){}},900);
  P.onAdShow((open)=>{ if(open){adWas=G.running;G.running=false;AUDIO.setMuted(true)}
    else{if(adWas){G.running=true;adWas=false} AUDIO.setMuted(!S.set.sound)} });
  P.loadProducts().then(()=>{if(openSheet&&hubTab==='shop')renderHub()});
  showMenu(true);
  setTimeout(()=>{if(!S.first)openWelcome()},1000);
  if(S.first)firstRun();
  if(chestReady())setTimeout(()=>{if(!openSheet)openChest()},1400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
