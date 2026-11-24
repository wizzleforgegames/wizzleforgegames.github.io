/* Cosmic Station Idle — UI слой. v3 */
(function(root){
'use strict';
var G=root.Game; if(!G){console.error('game.js not loaded');return;}
var YSDK=root.YSDK||null;
var LS='cosmic_station_idle_v2', LSSET='cosmic_station_settings_v2';
var IC=function(c){return 'assets/img/icons/'+c+'.png';};
var PLANETS=['0','1','2','3','4','5','6','7','8','9'];

var state=G.defaultState();
var settings={sound:true,music:true,vib:true};
var streakTO=null;
var lastSig='';
var modsAll=false;
var buyQty=1, activeTab='modules', boostUntil=0, streak=0, lastClick=0, moreSec='prog';
var MSEC=[{id:'prog',n:'Прогресс',ic:'1f3c6'},{id:'sci',n:'Наука',ic:'1f52c'},{id:'fleet',n:'Флот',ic:'1f6a2'},
          {id:'wheel',n:'Колесо',ic:'1f3b5'},{id:'col',n:'Коллекции',ic:'1f48e'},{id:'set',n:'Настройки',ic:'2699'}];
function msecOpen(id){ return '<div class="msec'+(moreSec===id?' on':'')+'" data-sec="'+id+'">'; }
var soonAcc=0, soonSig='', soonAt={comet:0,raid:0,boss:0}, cometTimer=null, saveAcc=0, cloudAcc=0, autoAcc=0, lastFrame=0, sigAcc=0, sellAcc=0, expAcc=0;
var raidAutoImmune=false;
var nudgeAcc=0, lastActAt=Date.now(), nudgeUntil=0, nudgeBtnAt=0, objLast=null, hlTimer=null, pressAt=0;
var tapAcc=0, autoTapN=0, prodAcc=0, flareSig='', moreAcc=0, swarmN=-1, ringN=-1;
var ptAcc=0, portAcc=0, portN=-1;
var resAcc=0, chAcc=0, rtAcc=0, raidAcc=0, raidHit=null, rpAcc=0;
var cloudChecked=false, cloudWarned=false;

/* ---------- звук: синтезированный движок Web Audio (без аудиофайлов) ---------- */
var AC=null, ACBAD=false, MASTER=null, SFXG=null, NBUF=null, VOICES=0, AMBV=null, lastClickAt=0;
function audioCtx(){
  if(AC)return AC;
  if(ACBAD)return null;
  try{
    var C=window.AudioContext||window.webkitAudioContext;
    if(!C){ ACBAD=true; return null; }
    AC=new C();
    MASTER=AC.createGain(); MASTER.gain.value=0.55; MASTER.connect(AC.destination);
    SFXG=AC.createGain(); SFXG.gain.value=0.9; SFXG.connect(MASTER);
  }catch(e){ ACBAD=true; AC=null; }
  return AC;
}
function noiseBuf(ac){
  if(NBUF)return NBUF;
  var n=Math.floor(ac.sampleRate*1.5), b=ac.createBuffer(1,n,ac.sampleRate), d=b.getChannelData(0);
  for(var i=0;i<n;i++)d[i]=Math.random()*2-1;
  NBUF=b; return b;
}
function tone(c){
  var ac=audioCtx(); if(!ac||VOICES>16)return;
  var dur=Math.max(0.02,c.dur||0.2), t0=ac.currentTime+(c.delay||0);
  try{
    var o=ac.createOscillator(); o.type=c.type||'sine';
    o.frequency.setValueAtTime(Math.max(20,c.f0),t0);
    if(c.f1)o.frequency.exponentialRampToValueAtTime(Math.max(20,c.f1),t0+dur);
    var g=ac.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0006,c.g||0.15),t0+(c.atk||0.012));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    var node=g;
    if(c.lp){
      var f=ac.createBiquadFilter(); f.type='lowpass'; f.Q.value=c.q||0.7;
      f.frequency.setValueAtTime(Math.max(60,c.lp),t0);
      if(c.lp1)f.frequency.exponentialRampToValueAtTime(Math.max(60,c.lp1),t0+dur);
      g.connect(f); node=f;
    }
    o.connect(g); node.connect(SFXG);
    VOICES++;
    o.onended=function(){ VOICES--; try{o.disconnect();g.disconnect(); if(node!==g)node.disconnect();}catch(e){} };
    o.start(t0); o.stop(t0+dur+0.04);
  }catch(e){}
}
function nz(c){
  var ac=audioCtx(); if(!ac||VOICES>16)return;
  var dur=Math.max(0.02,c.dur||0.2), t0=ac.currentTime+(c.delay||0);
  try{
    var s=ac.createBufferSource(); s.buffer=noiseBuf(ac);
    var f=ac.createBiquadFilter(); f.type=c.ft||'bandpass'; f.Q.value=c.q||1.2;
    f.frequency.setValueAtTime(Math.max(40,c.f0||800),t0);
    if(c.f1)f.frequency.exponentialRampToValueAtTime(Math.max(40,c.f1),t0+dur);
    var g=ac.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0006,c.g||0.1),t0+(c.atk||0.015));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    s.connect(f); f.connect(g); g.connect(SFXG);
    VOICES++;
    s.onended=function(){ VOICES--; try{s.disconnect();f.disconnect();g.disconnect();}catch(e){} };
    s.start(t0); s.stop(t0+dur+0.04);
  }catch(e){}
}
var SFX={
  click:function(v){ tone({type:'triangle',f0:720+Math.random()*70,f1:480,dur:.07,g:.11*v,lp:2600}); },
  buy:function(v){ tone({type:'sine',f0:520,f1:760,dur:.13,g:.16*v,lp:3200});
                   tone({type:'sine',f0:780,f1:1040,dur:.13,g:.09*v,delay:.06,lp:3600});
                   nz({ft:'lowpass',f0:900,f1:220,dur:.09,g:.05*v}); },
  tab:function(v){ tone({type:'sine',f0:430,f1:380,dur:.05,g:.07*v,lp:1800}); },
  upgrade:function(v){ tone({type:'triangle',f0:659,dur:.22,g:.13*v,lp:4200});
                       tone({type:'sine',f0:880,dur:.22,g:.11*v,delay:.07,lp:4200});
                       tone({type:'sine',f0:1318,dur:.3,g:.09*v,delay:.14,lp:5200}); },
  warp:function(v){ tone({type:'sawtooth',f0:760,f1:90,dur:.7,g:.15*v,lp:2400,lp1:420});
                    nz({ft:'bandpass',q:.8,f0:2600,f1:300,dur:.7,g:.09*v});
                    tone({type:'sine',f0:120,f1:60,dur:.5,delay:.3,g:.12*v,lp:600}); },
  fail:function(v){ tone({type:'square',f0:190,f1:120,dur:.18,g:.09*v,lp:820});
                    tone({type:'sine',f0:150,f1:100,dur:.2,g:.06*v,lp:600}); },
  boost:function(v){ tone({type:'sine',f0:330,f1:990,dur:.35,g:.15*v,lp:4200});
                     tone({type:'triangle',f0:1320,dur:.25,g:.07*v,delay:.2,lp:5200}); },
  shield:function(v){ nz({ft:'bandpass',q:1.1,f0:700,f1:2600,dur:.26,g:.12*v});
                      tone({type:'sine',f0:300,f1:520,dur:.2,g:.07*v,lp:2200}); },
  chest:function(v){ tone({type:'sine',f0:1046,dur:.18,g:.12*v,lp:6000});
                     tone({type:'sine',f0:1318,dur:.18,g:.11*v,delay:.05,lp:6000});
                     tone({type:'sine',f0:1568,dur:.24,g:.1*v,delay:.1,lp:6000});
                     tone({type:'triangle',f0:2093,dur:.2,g:.05*v,delay:.16,lp:7000}); },
  flare:function(v){ tone({type:'sawtooth',f0:110,f1:330,dur:.5,g:.13*v,lp:500,lp1:1900,atk:.12});
                     nz({ft:'bandpass',q:.7,f0:400,f1:1800,dur:.5,g:.07*v,atk:.15}); },
  research:function(v){ tone({type:'sine',f0:587,f1:880,dur:.3,g:.13*v,lp:4200});
                        tone({type:'sine',f0:1174,dur:.26,g:.06*v,delay:.12,lp:6000}); },
  route:function(v){ tone({type:'triangle',f0:494,dur:.16,g:.11*v,lp:3000});
                     tone({type:'sine',f0:740,dur:.2,g:.1*v,delay:.09,lp:3600}); },
  boss:function(v){ tone({type:'sawtooth',f0:95,f1:58,dur:.55,g:.17*v,lp:700,atk:.05});
                    nz({ft:'lowpass',f0:1200,f1:260,dur:.5,g:.08*v}); },
  victory:function(v){ var n=[523,659,784,1046];
                       for(var i=0;i<n.length;i++)tone({type:'triangle',f0:n[i],dur:.3,g:.13*v,delay:i*.09,lp:4600});
                       tone({type:'sine',f0:1568,dur:.4,g:.06*v,delay:.36,lp:6000}); },
  port:function(v){ tone({type:'sine',f0:294,dur:.38,g:.11*v,lp:1600,atk:.06});
                    tone({type:'triangle',f0:392,dur:.38,g:.07*v,delay:.04,lp:1600,atk:.08}); },
  dock:function(v){ nz({ft:'bandpass',q:9,f0:1500,dur:.14,g:.14*v});
                    tone({type:'sine',f0:1880,dur:.07,g:.05*v,lp:7000});
                    tone({type:'sine',f0:150,dur:.12,g:.08*v,lp:700}); }
};
function initSounds(){ audioCtx(); }
function snd(n,vol){
  if(!settings.sound)return;
  var f=SFX[n]; if(!f)return;
  var ac=audioCtx(); if(!ac)return;
  try{
    try{ if(ac.state==='suspended'&&ac.resume)ac.resume(); }catch(e){}
    if(n==='click'){ var now=Date.now(); if(now-lastClickAt<45)return; lastClickAt=now; }
    f(vol==null?1:Math.max(0,Math.min(1.2,vol)));
  }catch(e){}
}
function ambStart(){
  if(!settings.music||AMBV)return;
  var ac=audioCtx(); if(!ac)return;
  try{
    try{ if(ac.state==='suspended'&&ac.resume)ac.resume(); }catch(e){}
    var g=ac.createGain(); g.gain.value=0.0001; g.connect(MASTER);
    var lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=560; lp.Q.value=0.5; lp.connect(g);
    var nodes=[];
    [[110,'sine',1],[110.7,'sine',.85],[164.8,'triangle',.3],[220.4,'sine',.22]].forEach(function(sp){
      var o=ac.createOscillator(); o.type=sp[1]; o.frequency.value=sp[0];
      var og=ac.createGain(); og.gain.value=sp[2];
      o.connect(og); og.connect(lp); o.start(); nodes.push(o);
    });
    var s=ac.createBufferSource(); s.buffer=noiseBuf(ac); s.loop=true;
    var nf=ac.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=950; nf.Q.value=0.6;
    var ng=ac.createGain(); ng.gain.value=0.05;
    s.connect(nf); nf.connect(ng); ng.connect(g); s.start(); nodes.push(s);
    var lfo=ac.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.055;
    var lg=ac.createGain(); lg.gain.value=0.045;
    lfo.connect(lg); lg.connect(g.gain); lfo.start(); nodes.push(lfo);
    g.gain.linearRampToValueAtTime(0.14,ac.currentTime+3.5);
    AMBV={g:g,nodes:nodes};
  }catch(e){}
}
function ambStop(){
  if(!AMBV)return;
  var ac=audioCtx(), ref=AMBV; AMBV=null;
  try{
    var t=ac?ac.currentTime:0;
    ref.g.gain.cancelScheduledValues(t);
    ref.g.gain.setValueAtTime(Math.max(0.0001,ref.g.gain.value),t);
    ref.g.gain.linearRampToValueAtTime(0.0001,t+0.7);
    setTimeout(function(){
      ref.nodes.forEach(function(o){ try{o.stop();o.disconnect();}catch(e){} });
      try{ref.g.disconnect();}catch(e){}
    },900);
  }catch(e){}
}


/* ---------- helpers ---------- */
function $(s){return document.querySelector(s);}
function el(t,c,h){var e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e;}
function img(src,cls,alt){var i=document.createElement('img'); i.src=src; if(cls)i.className=cls; i.alt=alt||''; i.draggable=false; return i;}
function ic(code,cls){return img(IC(code),cls);}
function rwName(k){return G.RES_META[k]?G.RES_META[k].name:'сундук находок';}
function rwIc(k){return G.RES_META[k]?G.RES_META[k].ic:'1f4e6';}
function resTag(k,v){return '<span class="tag"><img src="'+IC(rwIc(k))+'" alt="">'+G.fmt(v)+'</span>';}
function costTags(cost){return Object.keys(cost).map(function(k){return resTag(k,cost[k]);}).join('');}
function afford(cost){ return Object.keys(cost).every(function(k){return (state.resources[k]||0)>=cost[k];}); }
/* «сколько ждать» — главная подсказка idle-игры: игрок всегда видит, когда цель будет его */
/* ---------- сроки: один раз показал — ведём ровно ----------
   Оценка «сколько ждать» пересчитывается каждую секунду и сама по себе шумная.
   Правило: срок может уменьшиться (игрок реально приблизил цель) и может
   отодвинуться, только если ушёл далеко (потратил ресурс, провалил миссию).
   Всё остальное — просто тикающий обратный отсчёт, без скачков. */
var etaMemo={};
function etaSmooth(key,raw){
  var now=Date.now(),m=etaMemo[key],left=m?(m.at-now)/1000:null;
  if(raw!==raw)raw=Infinity;
  var out;
  if(left===null||left<=0)out=raw;
  else if(!isFinite(raw))out=isFinite(m.raw)?Math.max(30,left):Infinity;
  else if(raw<left)out=raw;
  else if(raw>left*1.6+60)out=raw;
  else out=left;
  etaMemo[key]={at:now+(isFinite(out)?Math.max(0,out):864000)*1000,raw:raw};
  return out;
}
function etaEl(key,raw){
  var v=etaSmooth(key,raw);
  if(!isFinite(v))return '<b class="eta wait" data-etainf="1">нужен рост производства</b>';
  return '<b class="eta'+(v>0?' wait':'')+'" data-etaat="'+(Date.now()+Math.round(v*1000))+'">'+G.etaText(v)+'</b>';
}
function etaChip(cost){
  var t=G.costTime(state,cost);
    var parts=Object.keys(cost).map(function(k){return '&quot;'+k+'&quot;:'+Math.round(+cost[k]||0);}).join(',');
  return '<span class="tag eta'+(t>0?' wait':'')+'" data-etacost="{'+parts+'}">⏳ '+G.etaText(t)+'</span>';
}
function etaChipRes(res,amount){
  var t=G.timeTo(state,res,amount);
  return '<span class="tag eta'+(t>0?' wait':'')+'" data-etacost="{&quot;'+res+'&quot;:'+Math.round(amount)+'"}">⏳ '+G.etaText(t)+'</span>';
}
var STAT_LAB={totalClicks:'тапов',totalExpeditions:'экспедиций',expSuccess:'успешных экспедиций',
 totalMinerals:'руды накоплено',totalEnergy:'энергии накоплено',totalCredits:'кредитов накоплено',
 cometsCaught:'пойманных комет',bulkBuys:'покупок пачкой x10/МАКС',contractsDone:'контрактов порта',
 boardings:'пережитых абордажей',chestsOpened:'открытых сундуков',flares:'солнечных вспышек',
 routes:'этапов звёздного маршрута',urgentDone:'срочных чартеров',peakDeals:'пиковых сделок',
 questsDone:'заданий цепочки',research:'узлов науки',repairs:'починенных кораблей',
 caravans:'караванов',dealsDone:'больших сделок',hunters:'сбитых охотников',dailyClaims:'ежедневных наград'};
/* текст требования зашит в функцию-условие: достаём его из исходника функции */
var REQ_RE=[
  [/(?:s\.modules\.(\w+)|\(s\.modules\[['"](\w+)['"]\]\|\|0\))\s*>=\s*(\d+)/g, function(m){return G.MODULES[m[1]||m[2]]?G.MODULES[m[1]||m[2]].name+' ур. '+m[3]:'';}],
  [/stationLevel\((?:s|state)\)\s*>=\s*(\d+)/g, function(m){return 'уровень станции '+m[1];}],
  [/s\.achievements\[['"](\w+)['"]\]/g, function(m){var a=null;G.ACH.forEach(function(x){if(x.id===m[1])a=x;});return 'награда «'+(a?a.n:m[1])+'»';}],
  [/G?\.?resHas\((?:s|state),['"](\w+)['"]\)/g, function(m){var r=null;G.RESEARCH.forEach(function(x){if(x.id===m[1])r=x;});return 'узел «'+(r?r.n:m[1])+'»';}],
  [/shipOwned\((?:s|state)\)\s*>=\s*(\d+)/g, function(m){return 'кораблей верфи — '+m[1];}],
  [/s\.stats\.(\w+)(?:\|\|0\))?\s*>=\s*(\d+)/g, function(m){return (STAT_LAB[m[1]]||m[1])+' — '+m[2];}],
  [/G\.resOwned\((?:s|state)\)\s*>=\s*(\d+)/g, function(m){return 'узлов науки — '+m[1];}],
  [/setCount\(s\)\s*>=\s*(\d+)/g, function(m){return 'бонус-сетов флота — '+m[1];}]
];
function upReqText(u){
  var t='';
  try{ t=(u.req&&u.req.toString)?u.req.toString():''; }catch(e){ return ''; }
  var out=[],i,mm,re;
  for(i=0;i<REQ_RE.length;i++){
    re=new RegExp(REQ_RE[i][0].source,'g');
    while((mm=re.exec(t))!==null){
      var txt=REQ_RE[i][1](mm);
      if(txt&&out.indexOf(txt)<0)out.push(txt);
      if(mm.index===re.lastIndex)re.lastIndex++;
    }
  }
  if(u.chain!=null&&(state.chain||0)<u.chain)out.unshift('шаг цепи капитана '+u.chain);
  return out.length?('нужно '+out.join(' + ')):'';
}
function fmtTime(s){var h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+'ч '+m+'м':m+'м '+(Math.floor(s%60))+'с';}

/* ---------- toasts ---------- */
var toastBox, lastToast='', lastToastT=0;
function toast(msg,kind){
  if(!toastBox)return;
  var now=Date.now();
  if(msg===lastToast && now-lastToastT<1500) return;
  lastToast=msg; lastToastT=now;
  while(toastBox.children.length>=2) toastBox.removeChild(toastBox.firstChild);
  var t=el('div','toast '+(kind||'ok'),msg);
  toastBox.appendChild(t);
  setTimeout(function(){ if(t.parentNode){ t.classList.add('out'); setTimeout(function(){ if(t.parentNode)t.parentNode.removeChild(t); },300);} },2200);
}

/* ---------- modal ---------- */
var modal,mIcon,mTitle,mBody,mActions;
function openModal(icon,title,body,actions,onClose){
  mIcon.src=IC(icon); mTitle.textContent=title; mBody.innerHTML=body;
  mActions.innerHTML='';
  (actions||[{l:'Понятно',k:'p'}]).forEach(function(a){
    var b=el('button','btn '+(a.k||''),(a.ic?'<img src="'+IC(a.ic)+'" alt="">':'')+a.l);
    b.onclick=function(){ var keep=a.fn&&a.fn()===false; if(!keep)closeModal(); };
    mActions.appendChild(b);
  });
  modal.classList.remove('hidden');
  modal._onClose=onClose||null;
}
function closeModal(){ modal.classList.add('hidden'); var f=modal._onClose; modal._onClose=null; if(f)try{f();}catch(e){} }

/* ---------- resbar ---------- */
function renderResBar(){
  var box=$('#resbar'); box.innerHTML='';
  G.RES.forEach(function(k){
    if(k!=='energy'&&!G.gateOpen(state,'res:'+k))return;
    var d=el('div','res'); d.id='res-'+k;
    d.appendChild(ic(G.RES_META[k].ic));
    var s=el('span',null,'0'); s.id='resv-'+k; d.appendChild(s);
    box.appendChild(d);
  });
  refreshResBar();
}
var prevRes={};
function refreshResBar(){
  G.RES.forEach(function(k){
    var v=$('#resv-'+k); if(!v)return;
    v.textContent=G.fmt(state.resources[k]||0);
    var d=$('#res-'+k);
    if(d){ var cur=Math.floor(state.resources[k]||0);
      if(prevRes[k]!==undefined && cur>prevRes[k]+1){ d.classList.add('up'); setTimeout(function(){d.classList.remove('up');},500); }
      prevRes[k]=cur; }
  });
}

/* ---------- tabs ---------- */
var TABS=[
 {id:'modules', n:'Модули',   s:'Модули',  ic:'1f3d7'},
 {id:'upgrades',n:'Улучшения',s:'Апгрейд', ic:'1f527'},
 {id:'explore', n:'Экспедиции',s:'Рейды',  ic:'1fa90'},
 {id:'quests',  n:'Задания',  s:'Квесты',  ic:'1f4cb'},
 {id:'achieve', n:'Награды',  s:'Награды', ic:'1f3c6'},
 {id:'more',    n:'Ещё',      s:'Ещё',     ic:'2699'}
];
function renderTabs(){
  var box=$('#tabs'); box.innerHTML='';
  TABS.forEach(function(t){
    if(!G.gateOpen(state,'tab:'+t.id))return;
    var b=el('button','tab'+(t.id===activeTab?' active':''));
    b.setAttribute('data-tab',t.id);
        var narrow=window.innerWidth<=390 && window.innerHeight>420;
    b.innerHTML='<img src="'+IC(t.ic)+'" alt="">'+(narrow?t.s:t.n)+'<span class="dot"></span>';
    b.onclick=function(){ if(activeTab!==t.id)snd('tab'); switchTab(t.id); };
    box.appendChild(b);
  });
}
function switchTab(id){
  activeTab=id; lastSig='';
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.toggle('active',t.getAttribute('data-tab')===id); });
  document.querySelectorAll('.panel').forEach(function(p){ p.style.display=p.getAttribute('data-panel')===id?'block':'none'; });
  renderPanel(id);
  var box=$('#panels'); if(box)box.scrollTop=0;
  markAlerts();
}
function renderPanel(id){
  if(id==='modules')renderModules();
  else if(id==='upgrades')renderUpgrades();
  else if(id==='explore')renderExplore();
  else if(id==='quests')renderQuests();
  else if(id==='achieve')renderAch();
  else renderMore();
}
function markAlerts(){
  var up=0, q=0;
  var dd=G.gateOpen(state,'daily')?G.rollDQ(state,Date.now()):{list:[]}; dd.list.forEach(function(x){ if(x.st==='claim')q++; });
  var portOn=G.gateOpen(state,'port');
  var chN=(G.gateOpen(state,'chest')?(state.chests||[]).length:0)+(G.gateOpen(state,'route')&&G.routeState(state).claim?1:0);
  ((portOn&&state.port&&state.port.list)||[]).forEach(function(c){ if(G.portCan(state,c))chN++; });
  var carRisk=0;
  ((portOn&&state.port&&state.port.list)||[]).forEach(function(c){
    if(c.car&&c.exp-Date.now()<6*60000)carRisk++;
  });
  if(carRisk)chN+=carRisk;
  if(G.gateOpen(state,'market')&&G.peakDealState(state,Date.now()).can)chN++;
  setDot('explore', chN>0 || (G.marketLevel(state,Date.now()).good && (state.resources.minerals||0)>200), chN);
  G.UPGRADES.forEach(function(u){ if(!state.upgrades[u.id]&&u.req(state)&&afford(u.cost))up++; });
  G.QUESTS.forEach(function(x){ if(state.quests[x.id]==='claim')q++; });
  if(G.chainState(state).ready)q++;
  setDot('quests',q>0,q); setDot('upgrades',up>0,up);
  var ash=G.artifactShop(state,Date.now());
  var resN=0; if(G.gateOpen(state,'lab'))G.researchList(state).forEach(function(x){ if(x.can)resN++; });
  var shipN=0; if(G.gateOpen(state,'yard'))G.SHIPS.forEach(function(b){ if(!(state.ships&&state.ships[b.id])&&Object.keys(b.cost).every(function(k){return (state.resources[k]||0)>=b.cost[k];}))shipN++; });
  var pierN=(!state.pier&&G.gateOpen(state,'pier')&&(state.resources.antimatter||0)>=G.PIER_COST)?1:0;
  var dockN=G.gateOpen(state,'dock')?(G.dockCount(state)+(G.emgState(state,Date.now()).can?1:0)):0;
  var sqN=G.gateOpen(state,'season')?G.seasonQuests(state,Date.now()).filter(function(x){return x.done&&!x.claimed;}).length:0;
  var moreN=(G.gateOpen(state,'daily')&&G.dailyState(state,Date.now()).ready?1:0)+
            (G.gateOpen(state,'wheel')&&G.wheelState(state,Date.now()).ready?1:0)+shipN+pierN+dockN+sqN+
            (G.prestigeGain(state)>=1?1:0)+resN+
            ((G.gateOpen(state,'col')&&ash.ready&&ash.left>0&&state.resources.antimatter>=ash.cost)?1:0)+
            (G.gateOpen(state,'victory')&&G.victoryState(state).done&&!state.victory?1:0)+
            (G.gateOpen(state,'season')?G.seasonInfo(state,Date.now()).tiers.filter(function(t){return t.done&&!t.claimed;}).length:0);
  setDot('more', moreN>0, moreN>1?moreN:0);
}
function setDot(id,on,n){
  var t=document.querySelector('.tab[data-tab="'+id+'"]'); if(!t)return;
  t.classList.toggle('alert',!!on);
  var d=t.querySelector('.dot'); if(!d)return;
  var v=(on&&n)?String(n):'';
  if(d.textContent!==v)d.textContent=v;
  d.classList.toggle('num',!!v);
}

/* ---- карточка «Копим на»: одна конкретная стройка, которой ждут ---- */
function goalCardHtml(){
  var g=G.goalBuild(state,Date.now());
  if(!g)return '';
  var pct=Math.max(0,Math.min(100,g.cost?g.have/g.cost*100:100));
  return '<div class="card goal" data-jump="modules">'+
    '<div class="crow"><div class="cicon"><img src="'+IC(g.ic)+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">\u{1f4d0} Копим на: '+g.name+
      (g.n>1?(' ур. '+(g.from+1)+'\u2026'+g.to):(' ур. '+(g.from+1)))+
      ' <span class="tag">'+(g.chain?'нужно для шага цепи':'ближайшая большая стройка')+'</span></div>'+
    '<div class="csub">'+(g.ready?'Хватает на '+G.pl(g.n,'копию','копии','копий')+' прямо сейчас — стройте, и цель тут же отодвинется':
      'До цели не хватает <b>'+G.fmt(g.need)+'</b> '+G.RES_META[g.res].g+' спокойного дохода · срок: '+G.etaText(g.eta))+
      '. После стройки: <b>'+g.gain+'</b>, плюс '+g.unlock+
      '. Цель держится на 2,5\u201325 минут, а цена корпуса привязана к доходу станции: всегда есть чего подождать, '
      +'но никогда нет стены на сутки.</div>'+
    '<div class="bar '+(pct>60?'g':'y')+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
    '<div class="csub">'+G.fmt(g.have)+' / '+G.fmt(g.cost)+' '+G.RES_META[g.res].name.toLowerCase()+
      ' <button class="btn ghost sm" data-goalgo="'+g.key+'">ГДЕ ЭТО</button></div>'+
    '</div></div></div>';
}
/* ---------- modules ---------- */
function renderModules(){
  var box=$('#modulesList'); if(!box)return;
  var h='<div class="sect">Модули станции</div>'+nextUnlockLine()+goalCardHtml()+
   '<div class="hint">Модули работают сами — даже когда ты закрыл игру. Выбирай объём покупки: <b>x1 / x10 / Макс</b>. '
     +'Цена корпуса привязана к доходности станции: следующая копия всегда стоит несколько минут спокойного дохода, '
     +'поэтому стройка идёт лесенкой — ни бесплатных копий, ни стен на сутки.</div>'+
   '<div class="qty" id="qtySel" style="width:max-content;margin:0 auto 10px">'+
   [1,10,100].map(function(q){return '<button data-q="'+q+'" class="'+(buyQty===q?'on':'')+'">'+(q===100?'МАКС':'x'+q)+'</button>';}).join('')+'</div>';
  var teaser=0, hiddenLocked=[];
  var _g=G.goalBuild(state,Date.now()), goalMod=_g?_g.key:'';
  G.MORDER.forEach(function(k){
    var m=G.MODULES[k], lvl=state.modules[k]||0, un=G.modUnlocked(m,state);
    if(!un){ if(!teaser||modsAll)teaser=1; else { hiddenLocked.push(k); return; } }
    var n=(buyQty===100?Math.max(1,G.maxBuy(state,k)):buyQty);
    var pr=G.payRes(m), cost=G.bulkCost(m,lvl,n,state), can=un&&state.resources[pr]>=cost;
    var mi=G.mileInfo(state,k);
    var inst=G.installInfo(state,k,Date.now());
    var rate=(m.rate?G.fmt(m.rate*lvl*G.upgMult(state,'mod',k)*G.productionMult(state)*G.installFactor(state,k))+' '+G.RES_META[m.res].name.toLowerCase()+'/сек':'');
    if(m.stat==='defense')rate='щит: −'+Math.min(90,Math.round(G.defense(state)*1.5))+'% потерь в экспедициях';
    if(m.stat==='scan')rate='шанс экспедиций +'+(G.scanBonus(state)*0.4).toFixed(1)+'%';
    if(m.stat==='crew')rate='весь доход +'+(2*(state.modules.habitat||0))+'%';
    var req=!un?(G.modGate(state,m).req||''):'';
    h+='<div class="card '+(un?(can?'ok':''):'locked')+'" data-mod="'+k+'">'+
      '<div class="crow"><div class="cicon"><img src="'+IC(m.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">'+m.name+' <span class="lvl">ур. '+lvl+'</span>'+
        (k===goalMod?' <span class="tag">\u{1f3af} на него копим</span>':'')+'</div>'+
      '<div class="csub">'+(un?m.desc:'🔒 '+req)+'</div></div></div>'+
      (un?'<div class="cdesc">'+rate+(m.rate?' <span class="plus">+'+G.fmt(m.rate*G.upgMult(state,'mod',k)*G.productionMult(state)*G.installFactor(state,k))+' с этого модуля</span>':'')+'</div>':'')+
      (un&&inst&&!inst.done?'<div class="mile"><span class="mbar"><i style="width:'+inst.pct.toFixed(0)+'%"></i></span>'+
        '<em>монтаж корпуса: ещё '+fmtLeft(inst.left)+' · сейчас модуль даёт '+Math.round(G.installFactor(state,k)*100)+'% выпуска</em></div>':'')+
      (un&&mi.next?'<div class="mile"><span class="mbar"><i style="width:'+mi.next.pct.toFixed(0)+'%"></i></span>'+
        '<em>веха ур. '+mi.next.at+' → выпуск ×'+mi.next.mult.toFixed(2)+
        (mi.next.left<=1?' · ещё один модуль':' · ещё '+mi.next.left)+'</em>'+
        (mi.have>0?'<b>сейчас ×'+mi.bonus.toFixed(2)+'</b>':'')+'</div>':'')+
      '<div class="cmeta">'+artModTag(k)+'<span class="tag cost"><img src="'+IC(G.RES_META[pr].ic)+'" alt="">'+G.fmt(cost)+
      (n>1?' <small>×'+n+'</small>':'')+'</span>'+
      (un?'<span class="tag">≈ '+G.durTxt(cost/Math.max(1e-9,G.payIncome(state,pr,Date.now())))+' дохода</span>':'')+
      (un&&!can?etaChip((function(){var o={};o[pr]=cost;return o;})()):'')+
      '<button class="btn" data-buy="'+k+'" '+(can?'':'disabled')+'>'+(un?'ПОСТРОИТЬ':'🔒 ЗАПЕРТО')+'</button></div></div>';
  });
  if(hiddenLocked.length){
    var nm=G.MODULES[hiddenLocked[0]], gg=G.modGate(state,nm);
    h+='<div class="sect">Дальше по станции ('+hiddenLocked.length+')</div>'+
       '<div class="hint">Заперто. Отпирается ровно один модуль за один шаг цепи капитана; ближайший — «'+
       nm.name+'» ('+(gg.req||'')+').</div><button class="btn ghost sm" id="modsMore">ПОКАЗАТЬ ВСЕ</button>';
  }
  box.innerHTML=h;
  var mm=box.querySelector('#modsMore'); if(mm)mm.onclick=function(){ modsAll=true; renderModules(); };
  box.querySelectorAll('#qtySel button').forEach(function(b){ b.onclick=function(){ buyQty=+b.getAttribute('data-q'); snd('tab'); renderModules(); }; });
  box.querySelectorAll('[data-buy]').forEach(function(b){ b.onclick=function(){ doBuy(b.getAttribute('data-buy')); }; });
  box.querySelectorAll('[data-goalgo]').forEach(function(b){
    b.onclick=function(e){ e.stopPropagation(); showGoalModule(b.getAttribute('data-goalgo')); }; });
  bindJumps(box);
}
/* подсветить модуль, на который сейчас копят */
function showGoalModule(k){
  if(!document.querySelector('[data-mod="'+k+'"]')){ modsAll=true; renderModules(); }
  var c=document.querySelector('[data-mod="'+k+'"]'); if(!c)return;
  try{ c.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){ c.scrollIntoView(); }
  c.classList.add('flash'); setTimeout(function(){ c.classList.remove('flash'); },1500);
  var bb=c.querySelector('[data-buy]');
  if(bb&&!bb.disabled){ bb.classList.add('pulse'); setTimeout(function(){ bb.classList.remove('pulse'); },1500); }
  snd('tab');
}
function doBuy(id){
  var n=(buyQty===100?Math.max(1,G.maxBuy(state,id)):buyQty);
  var r=n>1?G.buyN(state,id,n):G.buyModule(state,id);
  if(r.ok){ snd('buy'); popAtCard('[data-mod="'+id+'"]','ур. '+state.modules[id],'gold');
    if(r.mile){ snd('upgrade'); toast('Веха '+r.mile.at+': выпуск модуля ×'+r.mile.mult.toFixed(2)+' навсегда','gold');
      var cc=document.querySelector('[data-mod="'+id+'"]');
      if(cc){ var q=cc.getBoundingClientRect(); confettiAt(q.left+q.width/2,q.top+q.height/2,18); } }
    renderModules(); coachDone(2); }
  else if(r.msg) toast(r.msg,'err');
  refreshResBar(); markAlerts();
}
function popAtCard(sel,txt,cls){
  var c=document.querySelector(sel); if(!c)return;
  var r=c.getBoundingClientRect();
  pop(r.left+r.width/2, r.top+20, txt, cls);
}
function pop(x,y,txt,cls){
  var fx=$('#fx'); if(!fx)return;
  var p=el('div','pop '+(cls||''),txt); p.style.left=x+'px'; p.style.top=y+'px';
  fx.appendChild(p); setTimeout(function(){ if(p.parentNode)p.parentNode.removeChild(p); },1200);
}
function sparks(x,y,n){
  var fx=$('#fx'); if(!fx)return;
  for(var i=0;i<(n||8);i++){
    var s=el('div','spark'); s.style.left=x+'px'; s.style.top=y+'px';
    var a=Math.random()*Math.PI*2, d=30+Math.random()*50;
    s.style.setProperty('--dx',(Math.cos(a)*d)+'px'); s.style.setProperty('--dy',(Math.sin(a)*d)+'px');
    fx.appendChild(s); (function(e){setTimeout(function(){if(e.parentNode)e.parentNode.removeChild(e);},750);})(s);
  }
}

/* ---------- upgrades ---------- */
function renderUpgrades(){
  var box=$('#upgradesList'); if(!box)return;
  var avail=[],locked=[],owned=[];
  G.UPGRADES.forEach(function(u){
    if(state.upgrades[u.id])owned.push(u);
    else if(u.req(state))avail.push(u);
    else locked.push(u);
  });
  var h='<div class="sect">Улучшения · установлены '+owned.length+'/'+G.UPGRADES.length+'</div>';
  if(avail.length){
    h+='<div class="hint">Доступно сейчас — покупай сразу, эффект постоянный.</div>';
    h+=avail.map(function(u){
      var can=afford(u.cost);
      return '<div class="card '+(can?'ok':'')+'" data-up="'+u.id+'">'+
       '<div class="crow"><div class="cicon"><img src="'+IC(u.ic)+'" alt=""></div>'+
       '<div class="cmain"><div class="ctitle">'+u.name+'</div>'+
       '<div class="csub">'+upDesc(u)+'</div></div></div>'+
       '<div class="cmeta">'+costTags(u.cost)+(can?'':etaChip(u.cost))+
       '<button class="btn" data-upb="'+u.id+'" '+(can?'':'disabled')+'>КУПИТЬ</button></div></div>';
    }).join('');
  }
  if(locked.length){
    locked.sort(function(a,b){ return (a.chain||0)-(b.chain||0); });
    h+='<div class="sect">Откроется позже ('+locked.length+')</div><div class="hint">У каждого улучшения свой шаг цепи. Показаны три ближайших: остальные появятся сами, когда придёт их время.</div>';
    h+=locked.slice(0,3).map(function(u){
      return '<div class="card locked"><div class="crow"><div class="cicon dim"><img src="'+IC(u.ic)+'" alt=""></div>'+
       '<div class="cmain"><div class="ctitle">'+u.name+'</div><div class="csub">'+upDesc(u)+
       '<br><span class="risk">🔒 '+(upReqText(u)||'станция должна подрасти')+'</span></div></div></div>'+
       '<div class="cmeta">'+costTags(u.cost)+'<span class="btn" disabled>РАНО</span></div></div>';
    }).join('');
  }
  if(owned.length){
    h+='<div class="sect">Установлено ('+owned.length+')</div>';
    h+=owned.map(function(u){
      return '<div class="card done"><div class="crow"><div class="cicon"><img src="'+IC(u.ic)+'" alt=""></div>'+
       '<div class="cmain"><div class="ctitle">'+u.name+'</div><div class="csub">'+upDesc(u)+'</div></div></div>'+
       '<div class="cmeta"><span class="tag g">✓ РАБОТАЕТ</span></div></div>';
    }).join('');
  }
  box.innerHTML=h;
  box.querySelectorAll('[data-upb]').forEach(function(b){ b.onclick=function(){ doUpg(b.getAttribute('data-upb')); }; });
}
function upDesc(u){
  if(u.eff==='click')return 'Сила тапа ×'+u.v;
  if(u.eff==='mod')return G.MODULES[u.tgt].name+' ×'+u.v;
  if(u.eff==='all')return 'Весь доход станции ×'+u.v;
  if(u.eff==='offline')return 'Оффлайн-доход ×'+u.v;
  if(u.eff==='scan')return 'Сканнеры в 2 раза эффективнее';
  if(u.eff==='luck')return 'Шанс успеха экспедиций +'+Math.round(u.v*100)+'%';
  if(u.eff==='sell')return 'Цена руды на бирже ×'+u.v;
  if(u.eff==='comet')return 'Награда за кометы ×'+u.v;
  if(u.eff==='auto')return 'Док сам строит самый дешёвый доступный модуль каждые 4 секунды';
  if(u.eff==='autosell')return 'Станция сама продаёт лишнюю руду на бирже каждые 5 секунд';
    if(u.eff==='autoexp')return 'Экспедиции отправляются автоматически, когда готовы и по карману';
  if(u.eff==='tapauto')return 'Рой дронов тапает станцию сам: +'+u.v+' тапов/сек (суммируется с другими роями)';
  if(u.eff==='flare')return 'Солнечная вспышка даёт ×6 ко всей продукции вместо ×3';
  if(u.eff==='chest')return 'Сундуки находок падают в 1.8 раза чаще';
  if(u.eff==='autores')return 'ИИ сам покупает самый дешёвый доступный узел лаборатории каждые 6 секунд';
  if(u.eff==='autochest')return 'Найденные сундуки вскрываются сами, без окна наград';
  if(u.eff==='autoroute')return 'Награды звёздного маршрута забираются автоматически';
  if(u.eff==='autoport')return 'Контракты звёздного порта выполняются сами, как только на складе хватает груза';
  if(u.eff==='port')return 'Награда за каждый контракт порта ×'+u.v+(u.id==='ford2'?', а корабли в порт приходят на 10% чаще':'');
  if(u.eff==='patrol')return 'Патруль флота по пиратам ×'+u.v+' (сейчас '+G.fmt(G.fleetDps(state))+' урона/сек)';
  if(u.eff==='peak')return 'Пиковая сделка биржи даёт ещё ×'+u.v;
  if(u.eff==='docksafe')return 'Корабли абордируют вдвое реже';
  if(u.eff==='autorepair')return 'Ремонтная бригада сама чинит абордированные корабли за кредиты';
  return '';
}
function doUpg(id){
  var r=G.buyUpgrade(state,id);
  if(r.ok){ snd('upgrade'); toast(r.msg,'ok'); renderUpgrades(); refreshResBar(); markAlerts(); }
  else toast(r.msg,'err');
}

/* ---------- explore ---------- */
function expUnlocked(i){ return G.expGate(state,i).ok; }
var expSig={port:'',mkt:'',list:''};
function exploreShell(){
  var box=$('#exploreList'); if(!box)return null;
  if(!box.querySelector('#expPort')){ box.innerHTML='<div id="expPort"></div><div id="expMkt"></div><div id="expList"></div>'; expSig={port:'',mkt:'',list:''}; }
  return box;
}
function bindExplore(scope){
  if(!scope)return;
  scope.querySelectorAll('[data-exp]').forEach(function(b){ b.onclick=function(){ doExplore(b.getAttribute('data-exp')); }; });
  scope.querySelectorAll('[data-sell]').forEach(function(b){ b.onclick=function(){ doSell(b.getAttribute('data-sell')); }; });
  scope.querySelectorAll('[data-peak]').forEach(function(b){ b.onclick=function(){ doPeak(); }; });
  scope.querySelectorAll('[data-chest]').forEach(function(b){ b.onclick=function(){ openChestUi(+b.getAttribute('data-chest')); }; });
  scope.querySelectorAll('[data-portgo]').forEach(function(b){ b.onclick=function(){ doPort(b.getAttribute('data-portgo')); }; });
  scope.querySelectorAll('[data-portrr]').forEach(function(b){ b.onclick=function(){ doPortReroll(b.getAttribute('data-portrr')); }; });
  var rb=scope.querySelector('#btn-route'); if(rb)rb.onclick=routeClaimUi;
}
function mktHtml(){
  var mk=G.marketLevel(state,Date.now());
  var spark='';
  for(var q=0;q<14;q++){
    var wv=G.marketWave(Date.now()-(13-q)*9000);
    var hh=Math.max(10,Math.min(100,Math.round((wv-0.6)/0.9*100)));
    spark+='<i class="'+(wv>=1.12?'up':(wv<0.9?'dn':''))+'" style="height:'+hh+'%"></i>';
  }
  return '<div class="sect">Биржа руды</div>'+
   '<div class="card '+(mk.good?'gold':'')+'"><div class="crow"><div class="cicon"><img src="'+IC('1f4b0')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Космическая биржа <span class="lvl">'+mk.label+'</span></div>'+
   '<div class="csub">1 руда → <b class="'+(mk.good?'good':'bad')+'">'+G.sellRate(state,Date.now()).toFixed(1)+'</b> кредитов. На складе: <b data-minstock>'+G.fmt(state.resources.minerals||0)+'</b> руды. Курс дышит — продавай на пике.</div></div></div>'+
   '<div class="mktspark">'+spark+'</div>'+
   '<div class="buyrow">'+[100,1000,10000].map(function(q){return '<button class="btn sm" data-sell="'+q+'">×'+G.fmt(q)+'</button>';}).join('')+
   '<button class="btn sm y" data-sell="all">ПРОДАТЬ ВСЁ</button></div>'+peakHtml()+'</div>';
}
function expListHtml(){
  var h='<div class="sect">Экспедиции · слоты <b id="expSlotsN">'+G.expActive(state)+'/'+G.expSlots(state)+'</b>'+expPips()+'</div>'+
   '<div class="hint">Экспедиция — долгий поход: снаряжение оплачивается сразу, экипаж идёт от <b>10 минут</b> до нескольких часов, а груз приходит на станцию сам, даже если ты закрыл игру. Число слотов растёт с уровнем станции: отправляй сразу несколько кораблей. Дроны-сканнеры повышают шанс, энергощит снижает потери при провале.</div>';
  return h;
}
function renderExplore(force){
  var box=exploreShell(); if(!box)return;
  var mk=G.marketLevel(state,Date.now());
  var spark='';
  for(var q=0;q<14;q++){
    var wv=G.marketWave(Date.now()-(13-q)*9000);
    var hh=Math.max(10,Math.min(100,Math.round((wv-0.6)/0.9*100)));
    spark+='<i class="'+(wv>=1.12?'up':(wv<0.9?'dn':''))+'" style="height:'+hh+'%"></i>';
  }
  var nowS=Date.now(), _rs=G.routeState(state), _pl=(state.port&&state.port.list)||[];
  var sigPort=[_pl.map(function(c){return c.id+(G.portCan(state,c)?1:0);}).join('|'),_pl.length,(state.port&&state.port.nextAt)||0,
    (state.port&&state.port.carAt)||0,(state.chests||[]).length,_rs.n+'/'+_rs.stage+'/'+(_rs.claim?1:0),state.pier||0,
    G.shipOwned(state),G.dockCount(state),G.emgState(state,nowS).can?1:0,G.pierCost||0].join(';');
  if(force||sigPort!==expSig.port){ expSig.port=sigPort; var pb=box.querySelector('#expPort');
    var ph='';
    if(G.gateOpen(state,'port'))ph+=portSectionHtml();
    if(G.gateOpen(state,'chest'))ph+=chestSectionHtml();
    if(G.gateOpen(state,'route'))ph+=routeCardHtml();
    pb.innerHTML=ph; bindExplore(pb); }
  var sigMkt=Math.floor(nowS/4000)+'|'+(G.peakDealState(state,nowS).ready?1:0)+'|'+(G.peakDealState(state,nowS).hot?1:0);
  if(force||sigMkt!==expSig.mkt){ expSig.mkt=sigMkt; var mb=box.querySelector('#expMkt');
    mb.innerHTML=G.gateOpen(state,'market')?mktHtml():''; bindExplore(mb); }
  var sigList=G.EXPLORE.map(function(x){return (state.exploreCooldown[x.key]>0?1:0)+(G.expGet(state,x.key)?1:0);}).join('')+
    ':'+G.expActive(state)+'/'+G.expSlots(state)+':'+(state.stats.totalExpeditions||0);
  var rebuildList=force||sigList!==expSig.list;
  if(rebuildList)expSig.list=sigList;
  if(!rebuildList)return;
  var h=expListHtml();
  var nowT=Date.now(), act=G.expActive(state), slots=G.expSlots(state);
  G.EXPLORE.forEach(function(e,i){
    var inf=G.expInfo(state,e,nowT), run=inf.run;
    var ch=Math.round(inf.ch*100);
    var realCh=run?run.ch:inf.ch;
    var artCh=Math.round(G.expArtChance(state,e,realCh)*100);
    var chestCh=Math.round(G.expChestChance(state,e,realCh)*100);
    var lossCh=Math.round(G.expLoss(state,e)*100);
    var gate=G.expGate(state,i), ok=gate.ok;
    var can=inf.ready&&afford(inf.cost)&&ok&&act<slots;
    var prog=run?Math.max(0,Math.min(100,(nowT-(run.end-e.dur*60000))/(e.dur*60000)*100)):0;
    h+='<div class="card expcard '+(run?'run':(inf.left>0?'':(can?'ok':'')))+(ok?'':' locked')+'">'+
      '<div class="crow"><img class="planetshot" src="assets/img/planets/planet'+PLANETS[i%10]+'.png" alt="">'+
      '<div class="cmain"><div class="ctitle">'+e.n+' <span class="lvl">'+ch+'%</span>'+
        (run?' <span class="tag y">🛰 в пути · <b data-expeta="'+run.end+'">'+fmtTime((run.end-nowT)/1000)+'</b></span>':'')+
        '</div>'+
      '<div class="csub">'+(ok?(
        (run?'Везёт груз: ':'Идёт <b>'+expDurTxt(e.dur)+'</b> · Награда: ')+Object.keys(inf.rw).map(function(k){return '+'+G.fmt(inf.rw[k])+' '+G.RES_META[k].name;}).join(', ')+
        (run?' · <span class="good">груз зафиксирован при отправке</span>'
             :' · <span class="risk">Риск: -'+lossCh+'% снаряжения</span>')):
        ('🔒 Нужно '+gate.need+' экспедиций (сейчас '+gate.cur+') · '+G.etaText(G.expGateEta(state,i))))+'</div></div></div>'+
      (run?'<div class="bar g"><i data-expprog="'+run.end+'" data-expst="'+(run.st||run.end-e.dur*60000)+'" style="width:'+prog+'%"></i></div>'
          :'<div class="bar '+(ch>=70?'g':(ch>=50?'y':'r'))+'"><i style="width:'+ch+'%"></i></div>')+
      '<div class="cmeta"><span class="tags" data-exptags="'+e.key+'"><span class="tag artc" title="Шанс привести артефакт за этот поход">🔎 '+artCh+'%</span>'+
      '<span class="tag" title="Шанс привести сундук находок за этот поход">📦 '+chestCh+'%</span>'+
      (run?'<span class="tag">⏳ вернётся через <b data-expeta="'+run.end+'">'+fmtTime((run.end-nowT)/1000)+'</b></span>'
          :(costTags(inf.cost)+(afford(inf.cost)?'':etaChip(inf.cost))+(inf.left>0?'<span class="cool" data-expcd="'+inf.left+'">⟳ экипаж отдыхает '+fmtTime(inf.left/1000)+'</span>':'')))+
      '</span><button class="btn p" data-exp="'+e.key+'" '+(can?'':'disabled')+'>'+(run?'В ПУТИ':(ok?(inf.left>0?'⟳ ОТДЫХ':'ОТПРАВИТЬ'):'🔒'))+'</button></div></div>';
  });
  var lb=box.querySelector('#expList');
  lb.innerHTML=h; bindExplore(lb);
}

/* ---------- звёздный порт: контракты ---------- */
function portRewardTxt(rw){
  return Object.keys(rw).map(function(k){
    if(k==='chests')return '+сундук находок';
    if(k==='antimatter')return '+'+G.fmt(rw[k])+' антиматерии';
    return '+'+G.fmt(rw[k])+' '+G.RES_META[k].name;
  }).join(', ');
}
function portNeedTags(c){
  return Object.keys(c.need).map(function(k){
    var have=state.resources[k]||0, need=c.need[k], ok=have>=need;
    var pct=Math.max(0,Math.min(100,need?have/need*100:0));
    return '<span class="tag'+(ok?' g':' bad')+'" title="'+G.RES_META[k].name+': '+G.fmt(have)+' / '+G.fmt(need)+'">'+
      '<img src="'+IC(G.RES_META[k].ic)+'" alt="">'+G.fmt(need)+
      '<em class="mini"><i style="width:'+pct.toFixed(0)+'%"></i></em></span>';
  }).join('');
}
function portNeedTxt(c){
  return Object.keys(c.need).map(function(k){return G.fmt(c.need[k])+' '+G.RES_META[k].name;}).join(' + ');
}
function portSectionHtml(){
  var ps=G.portState(state,Date.now()), rp=ps.rep;
  var repHtml='<div class="rep">'+
    '<div class="rep-l"><img src="'+IC('1f3c6')+'" alt=""><div><b>Репутация порта: '+rp.cfg.n+'</b>'+
    '<span>'+(rp.next?('Следующий ранг — «'+rp.next.n+'» через '+G.fmt(Math.max(0,rp.next.need-rp.done))+' сделок. Награды ×'+rp.mult.toFixed(2)+', новые корабли каждые '+Math.round(rp.gap*G.PORT_NEW_MS/60000)+' мин.')
                   :('Максимальный ранг. Награды ×'+rp.mult.toFixed(2)+', корабли швартуются каждые '+Math.round(rp.gap*G.PORT_NEW_MS/60000)+' мин.'))+'</span></div></div>'+
    '<div class="bar '+(rp.lv>=3?'g':'y')+'"><i style="width:'+rp.pct.toFixed(0)+'%"></i></div>'+
    '<div class="reppips">'+G.PORT_REP.map(function(x,i){return '<span class="pip'+(i<=rp.lv?' on':'')+'">'+(i+1)+'</span>';}).join('')+
      (rp.tail>0?('<span class="pip on tail" title="Почётные узлы идут один за другим без потолка">+'+rp.tail+'</span>'):'')+'</div>'+
  '</div>';
  var carBanner='';
  if(ps.car>0){
    var done=Math.max(0,G.CARAVAN_LEN-ps.car);
    carBanner='<div class="carbanner"><div class="cb-l"><img src="'+IC('1f6a2')+'" alt="">'+
      '<div><b>Караван у стенки · закрыто '+done+'/'+G.CARAVAN_LEN+'</b>'+
      '<span>Цепочка из '+G.CARAVAN_LEN+' связанных контрактов одного конвоя. Сдашь все — бонус маршрута: '+
      G.caravanTxt(state)+'. Следующий контракт встаёт к стенке сразу после сдачи предыдущего.</span></div></div>'+
      '<div class="carpips">'+[0,1,2].map(function(i){
        var step=G.CARAVAN_LEN-ps.car-ps.carQ; return '<span class="cpip'+(i<step?' on':'')+'">'+(i+1)+'</span>';}).join('')+
      '</div></div>';
  } else if(ps.carReady){
    carBanner='<div class="carbanner wait"><div class="cb-l"><img src="'+IC('1f6a2')+'" alt="">'+
      '<div><b>Караван на подходе</b><span>Цепочка из '+G.CARAVAN_LEN+' связанных контрактов с общим бонусом маршрута. '+
      'Готовь груз: '+G.caravanTxt(state)+'.</span></div></div>'+
      '<span class="tag y" data-carin="'+(Date.now()+ps.carIn)+'">⏳ '+fmtTime(ps.carIn/1000)+'</span></div>';
  }
  var cards=ps.list.map(function(c){
    var cfg=G.portCfg(c.k), can=G.portCan(state,c);
    var left=Math.max(0,c.exp-Date.now());
    var rw=G.portReward(state,c);
    var ttl=c.big?(c.t+20*3600*1000-c.t):(c.urgent?G.PORT_URG_TTL:G.PORT_TTL);
    var pct=Math.max(0,Math.min(100,left/ttl*100));
    return '<div class="card portcard'+(can?' ok':'')+(c.big?' gold':'')+(c.urgent?' urg':'')+(c.car?' car':'')+'">'+
      '<div class="crow"><div class="cicon big"><img src="'+IC(cfg.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">'+cfg.n+
        (c.urgent?' <span class="ubadge">СРОЧНО ×'+G.PORT_URG_MULT+'</span>':'')+
        (c.car?' <span class="carbadge">КАРАВАН '+c.car.step+'/'+c.car.n+'</span>':'')+
        ' <span class="lvl" data-portleft="'+c.exp+'">⏳ '+fmtTime(left/1000)+'</span></div>'+
      '<div class="csub">Груз для корабля: <b>'+portNeedTxt(c)+'</b> · Награда: <span class="good">'+portRewardTxt(rw)+'</span></div></div></div>'+
      '<div class="bar '+(pct>50?'g':(pct>20?'y':'r'))+'"><i style="width:'+pct+'%"></i></div>'+
      '<div class="cmeta">'+portNeedTags(c)+
      ((c.big||c.car)?(c.car?'<span class="tag y">цепочка · замена нельзя</span>':''):'<button class="btn sm ghost" data-portrr="'+c.id+'" '+(state.resources.credits>=G.portRerollCost(state,c)?'':'disabled')+'>ЗАМЕНИТЬ · '+G.fmt(G.portRerollCost(state,c))+'</button>')+
      '<button class="btn '+(can?'y':'')+'" data-portgo="'+c.id+'" '+(can?'':'disabled')+'>'+(can?(c.big?'ЗАКРЫТЬ СДЕЛКУ':'ОТПРАВИТЬ ГРУЗ'):'НЕТ ГРУЗА')+'</button></div></div>';
  }).join('');
  return '<div class="sect">Звёздный порт · сделок: '+(state.stats.contractsDone||0)+
    ' · швартвок: '+ps.slots+(state.stats.urgentDone?' · срочных: '+state.stats.urgentDone:'')+
    (state.stats.caravans?' · караванов: '+state.stats.caravans:'')+
    (state.stats.contractsMissed?' · сорвано '+state.stats.contractsMissed:'')+'</div>'+
    repHtml+carBanner+
    '<div class="hint">Кораблям на стоянке нужен груз. У каждого контракта есть срок — не успеешь, корабль уйдёт. Репутация растёт от сделок: награды множатся, корабли приходят чаще, открываются редкие типы контрактов.</div>'+
    '<div class="card nextship"><div class="crow"><div class="cicon"><img src="'+IC('1f6a2')+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">Расписание порта</div>'+
      '<div class="csub">'+(ps.list.length>=ps.slots?'Все швартвки заняты. ':'')+
      'Следующий корабль встанет к стенке через <b data-portnext="'+(Date.now()+ps.nextIn)+'">'+fmtTime(ps.nextIn/1000)+'</b>'+
      (ps.carReady?(' · караван с '+G.CARAVAN_LEN+' связанными контрактами подойдёт через <b data-carin="'+(Date.now()+ps.carIn)+'">'+fmtTime(ps.carIn/1000)+'</b>'):'')+
      ' · свободных мест: '+(ps.slots-ps.list.length)+' из '+ps.slots+'.</div></div></div></div>'+
    (cards||'');
}
function portFly(kind){
  var area=$('#clickArea'); if(!area)return;
  var w=area.clientWidth||240,h=area.clientHeight||240;
  var d=el('div','portship '+(kind==='in'?'in':'out'));
  var im=el('img'); im.src='assets/img/space/'+(kind==='in'?'ship_E':'ship_H')+'.png'; im.alt='';
  d.appendChild(im);
  /* свой флот выходит провожать караван */
  if(kind==='out'){
    var own=G.SHIPS.filter(function(b){return !!(state.ships&&state.ships[b.id])&&!G.shipDmg(state,b.id);});
    for(var e=0;e<Math.min(2,own.length);e++){
      var es=el('img','escort t'+(own.length>1?e:0));
      es.src='assets/img/'+own[e].img; es.alt=''; d.appendChild(es);
    }
  }
  area.appendChild(d);
  d.style.setProperty('--sx',(w*0.06)+'px'); d.style.setProperty('--sy',(h*0.72)+'px');
  setTimeout(function(){ try{d.remove();}catch(e){} },2100);
}
function doPortReroll(id){
  var r=G.portReroll(state,id,Date.now());
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('tab'); toast('🔁 Новый заказ: '+G.portCfg(r.c.k).n,'ok');
  if(activeTab==='explore')renderExplore();
  refreshResBar(); markAlerts();
}
function doPort(id){
  var r=G.portDeliver(state,id);
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('port'); buzz(25); portFly('out');
  var cx=window.innerWidth/2, cy=window.innerHeight*0.4;
  confettiAt(cx,cy,20); sparks(cx,cy,12);
  toast((r.urgent?'⚡ Срочный чартер закрыт · ':'🚀 '+r.cfg.n+': груз доставлен · ')+portRewardTxt(r.rw),'gold');
  if(r.carStep&&r.carStep<G.CARAVAN_LEN){
    toast('🚢 Караван: '+r.carStep+' из '+r.carN+' закрыто, следующий контракт уже у стенки','ok');
    confettiAt(cx,cy,10);
  }
  if(r.car){
    snd('victory'); buzz([25,25,25,80]);
    confettiAt(cx,cy,46); sparks(cx,cy,26);
    toast('🚢 КАРАВАН ПРОВЕДЁН ЦЕЛИКОМ · +'+G.fmt(r.car.credits)+' кредитов, +'+r.car.antimatter+'✦ и сундук находок','gold');
  }
  G.logAdd(state,(r.big?'💰 Большая сделка закрыта · ':(r.urgent?'⚡ Срочный чартер · ':'🚀 '+r.cfg.n+' · '))+portRewardTxt(r.rw),'gold');
  if(activeTab==='explore')renderExplore();
  refreshResBar(); markAlerts(); updatePortBtn(); renderObjective(true);
}
function updatePortBtn(){
  var area=$('#clickArea'); if(!area)return;
  var n=0;
  ((state.port&&state.port.list)||[]).forEach(function(c){ if(G.portCan(state,c))n++; });
  var b=area.querySelector('.portbtn');
  if(!n){ if(b)b.remove(); return; }
  if(!b){ b=el('button','portbtn','<img src="'+IC('1f6a2')+'" alt=""><span>'+n+'</span>'); area.appendChild(b);
    b.onclick=function(e){ e.stopPropagation(); switchTab('explore'); }; }
  else { var sp=b.querySelector('span'); if(sp&&sp.textContent!==String(n))sp.textContent=n; }
}
function autoPort(){
  var c=G.portCheapest(state); if(!c)return;
  var r=G.portDeliver(state,c.id);
  if(r.ok){ if(Math.random()<0.3)toast('🚀 Порт: «'+r.cfg.n+'» выполнен автоматически','gold'); updatePortBtn(); }
}
var RAR=['','Обычный','Редкий','Эпический','Легендарный'];
function artStars(a){var s='';for(var i=0;i<a.r;i++)s+='★';return s;}
function expDurTxt(min){return min>=60?Math.floor(min/60)+' ч '+(min%60)+' мин':min+' мин';}
function expPips(){var a=G.expActive(state),n=G.expSlots(state),o='';for(var i=0;i<n;i++)o+='<i class="pip'+(i<a?' on':'')+'"></i>';return '<span class="pips">'+o+'</span>';}
function doExplore(key){
  var r=G.explore(state,key);
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('port');
  toast('🛰 Экспедиция отправлена: вернётся через '+expDurTxt(Math.round(r.dur/60000))+
    (r.rw?(' · груз: '+Object.keys(r.rw).map(function(k){return '+'+G.fmt(r.rw[k])+' '+G.RES_META[k].name;}).join(', ')):''),
    'ok');
  renderExplore(); refreshResBar(); markAlerts(); coachDone(3);
}
/* возврат экипажей: считается ядром, здесь только реакция интерфейса */
function onExpBack(list){
  list.forEach(function(r){
    if(r.success){
      snd('upgrade');
      var t=Object.keys(r.reward).map(function(k){return '+'+G.fmt(r.reward[k])+' '+G.RES_META[k].name;}).join(' · ');
      toast('📡 «'+r.name+'» вернулась: '+t,'gold');
    }else{
      snd('fail');
      var ls=(r.lost?Object.keys(r.lost).filter(function(k){return r.lost[k]>0;}).map(function(k){return '-'+G.fmt(r.lost[k])+' '+G.RES_META[k].name;}).join(', '):'');
      toast('⚠ «'+r.name+'» провалена'+(ls?(': '+ls):''),'err');
    }
    if(r.chest){ toast('Найдён сундук находок! Открой его ниже','gold'); snd('boost'); }
    if(r.art)G.logAdd(state,'🔎 Находка: '+r.art.n,'gold');
    if(r.art){
    var a=r.art;
    setTimeout(function(){
      snd('warp'); confettiAt(window.innerWidth/2,window.innerHeight*0.42,34);
      openModal(a.ic,'Находка: '+a.n,
        '<p><b>'+RAR[a.r]+' артефакт</b> '+artStars(a)+'</p><p>'+a.d+'</p>'+
        '<p style="color:#93a0cf">Артефакты остаются навсегда — даже после варп-прыжка. Собирай коллекцию во вкладке «Ещё».</p>',
        [{l:'ЗАБРАТЬ В КОЛЛЕКЦИЮ',k:'y',ic:'1f4e6'}]);
    },260);
    }
  });
  renderExplore(); refreshResBar(); markAlerts();
}
function artModTag(k){
  var h='';
  G.ART.forEach(function(a){
    if(state.art&&state.art[a.id]&&a.eff&&a.eff.mod===k)
      h+='<span class="tag artc" title="'+a.n+'">🔎+'+Math.round((a.eff.v-1)*100)+'%</span>';
  });
  return h;
}
function artShopCard(){
  var st=G.artifactShop(state);
  if(st.left<=0)return '<div class="card done"><div class="crow"><div class="cicon"><img src="'+IC('2696')+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">Лавка древностей</div><div class="csub">Коллекция собрана полностью — торговцу больше нечего тебе продать.</div></div></div></div>';
  var cd=st.leftMs>0, can=!cd&&state.resources.antimatter>=st.cost;
  return '<div class="card '+(can?'ok':'')+'"><div class="crow"><div class="cicon"><img src="'+IC('2696')+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">Лавка древностей</div>'+
    '<div class="csub">Торговец привозит <b>один случайный недостающий артефакт</b>. Товар обновляется раз в '+Math.round(G.ART_SHOP_CD/3600000)+' часов.</div></div></div>'+
    '<div class="cmeta"><span class="tag y"><img src="'+IC('2728')+'" alt="">'+st.cost+'</span>'+
        (cd?'<span class="cool" data-cd="'+(state.artShopCd||0)+'">⟳ '+fmtTime(st.leftMs/1000)+'</span>':'')+
    '<button class="btn y" id="btn-artshop" '+(can?'':'disabled')+'>'+(cd?'ЖДём поставку':'КУПИТЬ')+'</button></div></div>';
}
function buyArtifactUi(){
  var r=G.buyArtifact(state);
  if(!r.ok){ toast(r.msg,'err'); return; }
  var a=r.art;
  snd('warp'); confettiAt(window.innerWidth/2,window.innerHeight*0.42,30);
  openModal(a.ic,'Покупка: '+a.n,
    '<p><b>'+RAR[a.r]+' артефакт</b> '+artStars(a)+'</p><p>'+a.d+'</p>'+
    '<p style="color:#93a0cf">За '+G.fmt(r.cost)+' антиматерии. Следующая поставка — через '+Math.round(G.ART_SHOP_CD/3600000)+' ч.</p>',
    [{l:'ЗАБРАТЬ',k:'y',ic:'1f4e6'}]);
  renderMore(); refreshResBar(); markAlerts();
}
function artGridHtml(){
  var own=G.artOwned(state);
  var h='<div class="sect">Коллекция артефактов '+own+'/'+G.ART.length+'</div>'+
    artShopCard()+
    '<div class="hint">Падают из экспедиций (чем дальше — тем редче) или покупаются у торговца. Каждый артефакт даёт постоянный бонус и не сгорает при варп-прыжке.</div>'+
    '<div class="skgrid">'+G.ART.map(function(a){
      var has=!!(state.art&&state.art[a.id]);
      return '<div class="sk art'+(has?'':' lock')+' r'+a.r+'">'+
        (has?'<span class="badge">'+artStars(a)+'</span>':'')+
        '<img class="skthumb" src="'+IC(a.ic)+'" alt="">'+
        '<div class="n">'+(has?a.n:'???')+'</div>'+
        '<div class="p">'+(has?a.d:'не найден')+'</div></div>';
    }).join('')+'</div>';
  return h;
}
/* ---------- лаборатория (исследования за антиматерию) ---------- */
var SEASON_WORDS=['Туманностей','Плазменных штормов','Кометных хвостов','Кротовых нор','Кварсаров','Пульсаров','Колец Сатурна','Гравипушек'];
function seasonName(id){ return SEASON_WORDS[id%SEASON_WORDS.length]; }
function fmtLeft(ms){ if(ms<0)ms=0; var d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5); return d>0?d+'д '+h+'ч':(h>0?h+'ч '+Math.floor(ms%36e5/6e4)+'м':Math.floor(ms/1e3)+'с'); }
function submitSeasonScore(){
  try{ if(YSDK&&YSDK.submitScoreNamed)YSDK.submitScoreNamed('Сезон',Math.round(G.seasonInfo(state,Date.now()).score),function(){}); window.WzShop&&WzShop.unlock('week'); }catch(e){}
}
function showSeasonBoard(){
  if(!(YSDK&&YSDK.sdk)){ toast('Таблицы рекордов работают только на Яндекс Играх','err'); return; }
  YSDK.showLeaderboardNamed('Сезон',function(sh){ if(!sh)toast('Сезонная таблица ещё не настроена в консоли разработчика','err'); });
}
function seasonHtml(si){
  var top=si.tiers[si.tiers.length-1].need, pct=Math.min(100,si.score/top*100);
  return '<div class="card gold"><div class="crow"><div class="cicon big"><img src="'+IC('1f3c6')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Счёт сезона: <b>'+G.fmt(si.score)+'</b></div>'+
   '<div class="csub">Энергия, добытая за 7 дней. Награды дают энергию и антиматерию, а счёт уходит в общий зачёт.</div></div></div>'+
   '<div class="cmeta"><span class="tag"><img src="'+IC('1f3c5')+'" alt="">счёт: '+G.fmt(si.score)+'⚡</span>'+
   '<button class="btn sm" id="btn-lb-season">РЕКОРДЫ СЕЗОНА</button></div>'+
   '<div class="bar"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
   '<div class="stiers">'+si.tiers.map(function(t){
     return '<div class="stier'+(t.claimed?' done':'')+(t.done&&!t.claimed?' avail':'')+'" data-season="'+t.i+'">'+
       '<span class="ic">'+(t.claimed?'✅':'🏆')+'</span>'+
       '<span class="n">'+t.name+'</span>'+
       '<span class="v">'+G.fmt(t.need)+'⚡</span>'+
       '<span class="rw">+'+G.fmt(t.e)+'⚡ +'+G.fmt(t.a)+'✦</span>'+
       '<span class="go">'+(t.claimed?'забрано':(t.done?'ЗАБРАТЬ':'закрыто'))+'</span></div>';
   }).join('')+'</div>'+sqHtml()+'</div>';
}
function sqHtml(){
  var list=G.seasonQuests(state,Date.now());
  if(!list.length)return '';
  return '<div class="sect2">Задания сезона · 3 цели недели</div><div class="stiers">'+list.map(function(q){
     return '<div class="stier'+(q.claimed?' done':'')+(q.done&&!q.claimed?' avail':'')+'" data-sq="'+q.i+'">'+
       '<span class="ic"><img src="'+IC(q.ic)+'" alt=""></span>'+
       '<span class="n">'+q.n+'</span>'+
       '<span class="v" data-sqn="'+q.i+'">'+G.fmt(q.cur)+'/'+G.fmt(q.need)+'</span>'+
       '<span class="rw">+'+G.fmt(q.rw.antimatter)+'✦</span>'+
       '<span class="go">'+(q.claimed?'забрано':(q.done?'ЗАБРАТЬ':'в процессе'))+'</span></div>';
   }).join('')+'</div>';
}
function sqClaimUi(i){
  var r=G.seasonQuestClaim(state,i,Date.now());
  if(!r.ok){ toast(r.msg,'err'); snd('fail'); return; }
  snd('route'); buzz([20,20,60]); confettiAt(window.innerWidth/2,window.innerHeight*0.4,30);
  toast('📌 Сезон: «'+r.q.n+'» — +'+G.fmt(r.q.rw.antimatter)+'✦ и +'+G.fmt(r.q.rw.credits)+' кредитов','gold');
  G.logAdd(state,'📌 Сезонное задание: '+r.q.n,'gold');
  renderMore(); refreshResBar(); markAlerts();
}
function seasonClaimUi(i){
  var t=G.seasonClaim(state,i,Date.now());
  if(!t){ toast('Этапа сезона ещё нет','err'); return; }
  snd('route'); buzz([20,20,60]); confettiAt(window.innerWidth/2,window.innerHeight*0.4,34);
  toast('🏆 Сезон: «'+t.name+'» — +'+G.fmt(t.e)+'⚡ +'+G.fmt(t.a)+'✦','gold');
  submitSeasonScore();
  renderMore(); markAlerts();
}
function researchHtml(){
  var list=G.researchList(state), run=G.resRunInfo(state,Date.now());
  var h='<div class="hint">Узлы покупаются за <b>антиматерию</b> и остаются навсегда — даже после варп-прыжка. '
     +'Цепочка открывается последовательно, а лаборатория держит в работе <b>только один узел</b>: '
     +'сначала платишь антиматерию, потом ждёшь — время идёт даже когда игры нет.</div>';
  if(run){
    h+='<div class="card gold labrun"><div class="crow"><div class="cicon big"><img src="'+IC(run.cfg.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">Лаборатория · исследуется '+run.cfg.n+'</div>'+
      '<div class="csub">Осталось <b data-resleft="'+run.end+'">'+expDurTxt(Math.ceil(run.left/60000))+'</b> · узел «'+run.cfg.d+'»</div></div></div>'+
      '<div class="bar y"><i data-resprog="'+run.end+'" style="width:'+run.pct.toFixed(1)+'%"></i></div>'+
      '<div class="cmeta"><button class="btn sm" data-resx="1">ОТМЕНИТЬ · вернёт '+Math.max(1,Math.floor(run.cfg.cost*0.5))+' антиматерии</button></div></div>';
  } else {
    h+='<div class="card"><div class="crow"><div class="cicon big"><img src="'+IC('1f52c')+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">Лаборатория свободна</div>'+
      '<div class="csub">Выбери узел ниже — он уйдёт в работу и займёт от 5 минут до нескольких часов.</div></div></div></div>';
  }
  /* вечная решётка может тянуться далеко: показываем изученное, доступное и
     три следующих замка — остальное сворачиваем в строку-анонс */
  var shown=[],locks=0;
  list.forEach(function(x){
    if(x.has||x.avail||x.run){ shown.push(x); return; }
    if(locks<3){ shown.push(x); locks++; }
  });
  var hidden=list.length-shown.length;
  shown.forEach(function(x){
    var r=x.r, lock=!x.avail&&!x.has;
    h+='<div class="card '+(x.has?'done':(lock?'locked':(x.can?'ok':'')))+'">'+
      '<div class="crow"><div class="cicon'+(x.has?'':' dim')+'"><img src="'+IC(r.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">'+r.n+' <span class="lvl">'+(x.has?'✓':(lock?'🔒':'узел'))+'</span></div>'+
      '<div class="csub">'+r.d+(r.req&&lock?' · нужен узел «'+G.RESEARCH.filter(function(q){return q.id===r.req;})[0].n+'»':'')+
        (r.et&&!state.eternal?' · <b>только в Вечном режиме</b>':(r.et?' · вечный узел':''))+'</div></div></div>'+
      '<div class="cmeta"><span class="tag y"><img src="'+IC('2728')+'" alt="">'+r.cost+'</span>'+
      '<span class="tag">⏳ '+expDurTxt(Math.round((r.t||30)/5)*5)+'</span>'+
      (!x.has&&!x.run&&!lock?etaChipRes('antimatter',r.cost):'')+
      (x.has?'<span class="tag g">изучено</span>'
            :(x.run?'<button class="btn sm" data-resx="1">ОТМЕНИТЬ · вернёт '+Math.max(1,Math.floor(r.cost*0.5))+' ✦</button>'
                   :'<button class="btn y" data-res="'+r.id+'" '+(x.can?'':'disabled')+'>'+(lock?(r.et?'🔒 ВЕЧНЫЙ РЕЖИМ':'🔒 ЦЕПОЧКА'):'В РАБОТУ')+'</button>'))+
      '</div></div>';
  });
  if(hidden>0)h+='<div class="hint">Ещё '+hidden+' '+G.pl(hidden,'узел','узла','узлов')
    +' лаборатории откроются, когда ты изучишь предыдущие. Вечные ярусы не кончаются.</div>';
  return h;
}
function buyResearchUi(id){
  var r=G.buyResearch(state,id);
  if(!r.ok){ toast(r.msg,'err'); snd('fail'); return; }
  snd('research'); buzz([20,30,20]);
  toast('🔬 Лаборатория взяла узел «'+r.r.n+'» — '+expDurTxt(Math.round(r.left/60000)),'gold');
  renderMore(); refreshResBar(); markAlerts();
}
function cancelResUi(){
  var r=G.cancelResearch(state,Date.now());
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('tab'); toast('Исследование остановлено, возвращено '+r.back+' антиматерии','ok');
  renderMore(); refreshResBar(); markAlerts();
}
/* лаборатория дошла до конца — выдаём эффект */
function onResDone(r){
  if(!r)return;
  snd('victory'); buzz([30,40,30,40]);
  confettiAt(window.innerWidth/2,window.innerHeight*0.42,26);
  toast('✨ Узел изучен: '+r.n+' — '+r.d,'gold');
  if(activeTab==='more')renderMore();
  refreshResBar(); markAlerts();
}
/* ---------- финал и вечный режим ---------- */
function victoryHtml(){
  if(!G.gateOpen(state,'victory'))return '';
  var v=G.victoryState(state);
  if(v.won){
    return '<div class="sect">Финал · Вечный режим</div>'+
     '<div class="card gold"><div class="crow"><div class="cicon big"><img src="'+IC('1f31f')+'" alt=""></div>'+
     '<div class="cmain"><div class="ctitle">Галактическое ядро активировано</div>'+
     '<div class="csub">Станция прошла финал. Вечный режим даёт <b>+'+Math.round((G.eternalBonus(state)-1)*100)+'%</b> ко всему доходу навсегда. Каждый варп-прыжок добавляет Эпоху (+5%).</div></div></div>'+
     '<div class="cmeta"><span class="tag y"><img src="'+IC('231b')+'" alt="">Эпоха '+(state.epochs||0)+'</span>'+
     '<span class="tag g">сейчас ×'+G.eternalBonus(state).toFixed(2)+'</span></div></div>';
  }
  var done=0;
  v.parts.forEach(function(x){ if(x.cur>=x.need)done++; });
  var rows=v.parts.map(function(x){
    var pct=Math.max(0,Math.min(100,x.need?x.cur/x.need*100:0));
    return '<div class="vrow"><span class="vk">'+(x.cur>=x.need?'✅ ':'')+x.n+'</span>'+
      '<div class="bar '+(x.cur>=x.need?'g':'y')+'"><i style="width:'+pct+'%"></i></div>'+
      '<span class="vn">'+G.fmt(x.cur)+'/'+G.fmt(x.need)+'</span></div>';
  }).join('');
  return '<div class="sect">Финал станции · '+done+'/'+v.parts.length+'</div>'+
   '<div class="card '+(v.done?'gold':'vcard')+'"><div class="crow"><div class="cicon big"><img src="'+IC('1f31f')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Галактическое ядро</div>'+
   '<div class="csub">Выполни все четыре условия — и станция перейдёт в <b>Вечный режим</b>: +25% ко всему доходу навсегда, счётчик Эпох и конец основной истории.</div></div></div>'+
   rows+
   '<div class="cmeta"><span class="tag y"><img src="'+IC('1f31f')+'" alt="">финал</span>'+
   '<button class="btn y" id="btn-victory" '+(v.done?'':'disabled')+'>'+(v.done?'ЗАВЕРШИТЬ':'🔒 НЕ ГОТОВО')+'</button></div></div>';
}
function doVictory(){
  var r=G.claimVictory(state);
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('victory'); shake(); buzz([40,40,80,40,140]);
  confettiAt(window.innerWidth/2,window.innerHeight*0.4,90);
  openModal('1f31f','Галактическое ядро',
    '<p>Станция собрана полностью: все миры изучены, все артефакты в музее, наука прошла все этапы.</p>'+
    '<p><b>Основная история пройдена.</b> Открыт <b>Вечный режим</b>: +25% ко всему доходу навсегда, а каждый варп-прыжок добавляет Эпоху (+5% сверх).</p>'+
    '<p style="color:#93a0cf">Дальше можно строить бесконечно: новые Эпохи, все облики, все награды.</p>',
    [{l:'ПРОДОЛЖИТЬ В ВЕЧНОМ РЕЖИМЕ',k:'y',ic:'1f30c'}]);
  renderAll();
}
/* ---------- звёздный маршрут ---------- */
function routeCardHtml(){
  var st=G.routeState(state);
  var pct=Math.max(0,Math.min(100,st.need?st.n/st.need*100:0));
  var rw=Object.keys(st.rw).map(function(k){return '+'+G.fmt(st.rw[k])+' '+G.RES_META[k].name;}).join(', ');
  return '<div class="sect">Звёздный маршрут · этап '+(st.stage+1)+'/'+G.ROUTE.length+(st.cycles?' · цикл '+(st.cycles+1):'')+'</div>'+
   '<div class="card '+(st.claim?'gold':'')+'"><div class="crow"><div class="cicon big"><img src="'+IC('1f9ed')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Караван идёт</div>'+
   '<div class="csub">Успешные экспедиции складываются в маршрут. Награда этапа: <b>'+rw+'</b>. Провал откатывает этап на один успех.</div></div></div>'+
   '<div class="bar '+(st.claim?'y':'g')+'"><i style="width:'+pct+'%"></i></div>'+
   '<div class="cmeta"><span class="tag"><img src="'+IC('1fa90')+'" alt="">'+st.n+'/'+st.need+' успехов</span>'+
   '<button class="btn y" id="btn-route" '+(st.claim?'':'disabled')+'>'+(st.claim?'ЗАБРАТЬ НАГРАДУ':'В ПУТИ')+'</button></div></div>';
}
function routeClaimUi(){
  var r=G.routeClaim(state);
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('route'); buzz([25,25,50]);
  confettiAt(window.innerWidth/2,window.innerHeight*0.42,30);
  var t=Object.keys(r.rw).map(function(k){return '+'+G.fmt(r.rw[k])+' '+G.RES_META[k].name;}).join(', ');
  toast('🛰 Маршрут пройден: '+t+(r.cycle?' — круг замкнулся, награды выросли!':''),'gold');
  renderExplore(); refreshResBar(); markAlerts();
}
function chestSectionHtml(){
  var list=state.chests||[];
  if(!list.length)return '';
  var cells=list.map(function(c,i){
    var cfg=G.CHEST_BY_R[c.r]||G.CHESTS[0];
    return '<div class="chest r'+c.r+'" data-chest="'+i+'"><img src="'+IC(cfg.ic)+'" alt=""><b>'+cfg.n+'</b>'+
      '<button class="btn y sm">ОТКРЫТЬ</button></div>';
  }).join('');
  return '<div class="sect">Сундуки находок · '+list.length+'</div>'+
    '<div class="hint">Падают из экспедиций и с комет. Открываются тапом: ресурсы, буст, редкая антиматерия и шанс артефакта.</div>'+
    '<div class="chestrow">'+cells+'</div>';
}
function openChestUi(idx){
  var r=G.openChest(state,idx);
  if(!r.ok){ toast(r.msg,'err'); return; }
    snd('chest'); buzz(40);
  var cx=window.innerWidth/2, cy=window.innerHeight*0.42;
  confettiAt(cx,cy,r.chest.r>=3?40:(r.chest.r===2?28:18)); sparks(cx,cy,14);
  if(r.boost){ setBoost(20000); snd('boost'); }
  var txt=Object.keys(r.rw).map(function(k){return '+'+G.fmt(r.rw[k])+' '+G.RES_META[k].name;}).join('<br>');
  var extra='';
  if(r.boost)extra+='<p style="color:#ffd76a">Плюс буст ×7 на 20 секунд!</p>';
  if(r.art)extra+='<p style="color:#c58cff">И артефакт: <b>'+r.art.n+'</b> — '+r.art.d+'</p>';
  G.logAdd(state,'📦 Вскрыт '+r.cfg.n+(r.art?' · находка: '+r.art.n:''),'gold');
  openModal(r.cfg.ic,'Открыт: '+r.cfg.n,'<p>'+txt+'</p>'+extra,[{l:'ЗАБРАТЬ',k:'y',ic:'1f4e6'}]);
  if(activeTab==='explore')renderExplore();
  refreshResBar(); markAlerts(); updateChestBtn();
}
function updateChestBtn(){
  var area=$('#clickArea'); if(!area)return;
  var n=(state.chests||[]).length;
  var b=area.querySelector('.chestbtn');
  if(!n){ if(b)b.remove(); return; }
  if(!b){ b=el('button','chestbtn','<img src="'+IC('1f4e6')+'" alt=""><span>'+n+'</span>'); area.appendChild(b);
    b.onclick=function(e){ e.stopPropagation(); var best=0,bi=0;
      (state.chests||[]).forEach(function(c,i){ if(c.r>best){best=c.r;bi=i;} });
      openChestUi(bi); }; }
  else { b.querySelector('span').textContent=n; }
}
function peakHtml(){
  var p=G.peakDealState(state,Date.now());
  var txt=p.ready?(p.hot?('ПИК ×'+p.bonus.toFixed(2)):'ЖДИ ПИКА'):'⟳ '+fmtTime(p.cd/1000);
  var sub=p.ready?(p.hot?('Курс на максимуме: вся руда ('+G.fmt(p.qty)+') ×'+p.bonus.toFixed(2)+' → +'+G.fmt(p.credits)+' кредитов')
        :'Курс ещё не на пике — жди зелёную волну на графике')
        :'Сделка уже была: перезарядка '+fmtTime(p.cd/1000);
  return '<div class="peakrow'+(p.hot?' hot':'')+(p.can?' can':'')+'">'+
    '<div class="pl"><img src="'+IC('1f4c8')+'" alt=""><div><b>Пиковая сделка</b><span>'+sub+'</span></div></div>'+
    '<button class="btn sm '+(p.can?'y':'')+'" data-peak '+(p.can?'':'disabled')+
      (p.ready?'':' data-peakcd="'+(state.peakAt||0)+'"')+'>'+txt+'</button></div>';
}
function doPeak(){
  var r=G.peakDeal(state,Date.now());
  if(!r.ok){ toast(r.msg,'err'); snd('fail'); return; }
  snd('buy'); buzz([20,20,40]);
  var q=document.querySelector('.mktspark'); if(q){ var b=q.getBoundingClientRect(); confettiAt(b.left+b.width/2,b.top+b.height/2,26); }
  toast('📈 Пиковая сделка: '+G.fmt(r.qty)+' руды ×'+r.bonus.toFixed(2)+' → +'+G.fmt(r.credits)+' кредитов','gold');
  G.logAdd(state,'📈 Пиковая сделка: +'+G.fmt(r.credits)+' кредитов','gold');
  renderExplore(); refreshResBar(); markAlerts();
}
function doSell(q){
  var n=(q==='all')?Math.floor(state.resources.minerals||0):parseInt(q,10);
  var r=G.sellMinerals(state,n);
  if(r.ok){ snd('buy'); toast('Продано: +'+G.fmt(r.credits)+' кредитов','ok'); renderExplore(); refreshResBar(); }
  else toast(r.msg,'err');
}

/* ---------- quests + daily ---------- */
function dailyCardHtml(){
  var d=G.dailyState(state,Date.now());
  var cells='';
  for(var i=1;i<=7;i++){
    var cfg=G.DAILY[i-1];
        var done=(i<=d.streak);
    var now=(d.ready && i===d.next);
    cells+='<div class="dcell '+(done?'done':'')+(now?' now':'')+(i===7?' last':'')+'">'+
      '<img src="'+IC(cfg.ic)+'" alt=""><b>'+cfg.t+'</b><span>'+resMini(G.dailyReward(state,cfg))+'</span></div>';
  }
  var btn=d.ready?'<button class="btn y wide" id="btn-daily">ЗАБРАТЬ НАГРАДУ ДНЯ</button>'
                 :'<div class="cdesc">Следующая награда — завтра. Серия: <b>'+state.daily.streak+'</b> дн.</div>';
  return '<div class="card '+(d.ready?'gold':'')+'"><div class="crow"><div class="cicon big"><img src="'+IC('1f4c5')+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">Награда дня <span class="lvl">серия '+state.daily.streak+'</span></div>'+
    '<div class="csub">Заходи каждый день — на 7-й день даётся антиматерия.</div></div></div>'+
    '<div class="daily">'+cells+'</div>'+btn+'</div>';
}
function dqCardHtml(){
  var d=G.rollDQ(state,Date.now()), got=0;
  d.list.forEach(function(x){ if(x.st==='done')got++; });
  var h='<div class="hint">Три задания на сегодня — обновляются каждый день. Награда растёт вместе со станцией.</div>';
  d.list.forEach(function(x){
    var cfg=G.dqCfg(x.id), st=G.dqState(state,x);
    if(!cfg)return;
    var pct=Math.max(0,Math.min(100,st.need?st.cur/st.need*100:0));
    var rw=cfg.rw(state);
    h+='<div class="card '+(x.st==='done'?'done':(x.st==='claim'?'gold':''))+'">'+
      '<div class="crow"><div class="cicon"><img src="'+IC(cfg.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">'+cfg.n+(x.st==='done'?' <span class="tag g">✓</span>':'')+'</div>'+
      '<div class="csub">'+st.txt+'</div></div></div>'+
      (x.st==='done'?'':'<div class="bar '+(x.st==='claim'?'y':'g')+'"><i style="width:'+pct+'%"></i></div>'+
       '<div class="cmeta"><span class="tag">Награда: '+costTags(rw)+'</span>'+
       (x.st==='claim'?'<button class="btn y" data-dq="'+x.id+'">ЗАБРАТЬ</button>':'<span class="tag">'+G.fmt(st.cur)+' / '+G.fmt(st.need)+'</span>')+
       '</div>')+'</div>';
  });
  return h;
}
function claimDqUi(id){
  objSig='';
  var r=G.claimDq(state,id);
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('upgrade');
  var t=Object.keys(r.rw).map(function(k){return '+'+G.fmt(r.rw[k])+' '+G.RES_META[k].name;}).join(' · ');
  toast('Задание дня: '+r.cfg.n+' — '+t,'gold');
  confettiAt(window.innerWidth/2,window.innerHeight*0.4,20);
  renderQuests(); refreshResBar(); markAlerts();
}
function resMini(rw){return Object.keys(rw).map(function(k){return '+'+G.fmt(rw[k]);}).join(' / ');}
function renderQuests(){
  var box=$('#questsList'); if(!box)return;
  var done=0,claim=0;
  G.QUESTS.forEach(function(q){ if(state.quests[q.id]==='done')done++; if(state.quests[q.id]==='claim')claim++; });
  var h=chainCardHtml()+
   (G.gateOpen(state,'daily')?('<div class="sect">Ежедневная награда</div>'+dailyCardHtml()+
   '<div class="sect">Задания дня</div>'+dqCardHtml()):'')+
   '<div class="sect">Цепочка заданий · выполнено '+done+'/'+G.QUESTS.length+(claim?(' · ждут выдачи '+claim):'')+'</div>'+
   '<div class="hint">Выполняй задания по цепочке — они ведут от первого киловатта до Галактического узла и дают ресурсы и антиматерию.</div>';
  var nextShown=false;
  G.QUESTS.forEach(function(q){
    var st=state.quests[q.id], qs=G.questState(state,q);
    var isNext=!st&&!nextShown; if(isNext)nextShown=true;
    if(st==='done'){
      h+='<div class="card done"><div class="crow"><div class="cicon"><img src="'+IC(q.ic)+'" alt=""></div>'+
        '<div class="cmain"><div class="ctitle">'+q.n+'</div><div class="csub">'+q.d+'</div></div>'+
        '<span class="tag g">✓</span></div></div>';
    } else if(!st || isNext || qs.cur>0){
      var pct=Math.max(0,Math.min(100,qs.need?qs.cur/qs.need*100:0));
      h+='<div class="card '+(st==='claim'?'gold':(isNext?'ok':'locked'))+'">'+
        '<div class="crow"><div class="cicon"><img src="'+IC(q.ic)+'" alt=""></div>'+
        '<div class="cmain"><div class="ctitle">'+q.n+'</div><div class="csub">'+q.d+'</div></div></div>'+
        '<div class="bar '+(st==='claim'?'y':'g')+'"><i style="width:'+pct+'%"></i></div>'+
        '<div class="cmeta"><span class="tag">Награда: '+costTags(q.rw)+'</span>'+
        (st==='claim'?'<button class="btn y" data-claim="'+q.id+'">ЗАБРАТЬ</button>':'<span class="tag">'+G.fmt(qs.cur)+' / '+G.fmt(qs.need)+'</span>')+
        '</div></div>';
    }
  });
  box.innerHTML=h;
  box.querySelectorAll('[data-claim]').forEach(function(b){ b.onclick=function(){ claimQ(b.getAttribute('data-claim')); }; });
  box.querySelectorAll('[data-dq]').forEach(function(b){ b.onclick=function(){ claimDqUi(b.getAttribute('data-dq')); }; });
  var bd=$('#btn-daily'); if(bd)bd.onclick=function(){ claimDailyUi(false); };
  box.querySelectorAll('[data-chain]').forEach(function(x){ x.onclick=chainClaimUi; });
}
function claimQ(id){
  objSig='';
  var r=G.claimQuest(state,id);
  if(r.ok){ snd('upgrade'); toast('Задание выполнено: '+r.q.n,'gold'); renderQuests(); refreshResBar(); markAlerts(); }
  else toast(r.msg,'err');
}
function claimDailyUi(triple){
  var r=G.claimDaily(state,Date.now());
  if(!r.ok){ toast(r.msg,'err'); return; }
  if(triple){ for(var k in r.rw) state.resources[k]=(state.resources[k]||0)+r.rw[k]; }
  snd('upgrade');
  var t=Object.keys(r.rw).map(function(k){return '+'+G.fmt(r.rw[k]*(triple?2:1))+' '+G.RES_META[k].name;}).join(' · ');
  toast('Награда дня ('+r.streak+' день): '+t,'gold');
  var fx=$('#fx'); if(fx){ var r2=fx.getBoundingClientRect(); confettiAt(window.innerWidth/2, window.innerHeight*0.4, 26); }
  refreshResBar(); markAlerts();
  if(activeTab==='quests')renderQuests();
}
function tryDaily(n){
  var m=$('#modal');
  if(m && !m.classList.contains('hidden')){ if(n>0) setTimeout(function(){ tryDaily(n-1); },1200); return; }
  /* новичку награда дня приходит не сразу: сначала он строит первую панель и осваивается */
  if(!state.stats.totalClicks0){ state.stats.totalClicks0=state.stats.totalClicks; }
  var fresh=G.totalModules(state)<1&&(state.stats.playSeconds||0)<150;
  if(fresh&&n>0){ setTimeout(function(){ tryDaily(n-1); },2500); return; }
  if(G.dailyState(state,Date.now()).ready) showDailyModal();
}
function showDailyModal(){
  var d=G.dailyState(state,Date.now());
  if(!d.ready)return;
  var cfg=G.DAILY[d.next-1];
  var cells='';
  for(var i=1;i<=7;i++){
    var c=G.DAILY[i-1];
    var done=i<=d.streak, now=i===d.next;
    cells+='<div class="dcell '+(done?'done':'')+(now?' now':'')+(i===7?' last':'')+'"><img src="'+IC(c.ic)+'" alt=""><b>'+c.t+'</b><span>'+resMini(G.dailyReward(state,c))+'</span></div>';
  }
  openModal('1f4c5','Награда дня · серия '+d.streak,
    '<p>Заходи каждый день. На <b>7-й день</b> — антиматерия.</p><div class="daily">'+cells+'</div>'+
    '<p style="margin-top:10px">Сегодня: <b>'+cfg.t+'</b> — '+Object.keys(G.dailyReward(state,cfg)).map(function(k){return G.fmt(G.dailyReward(state,cfg)[k])+' '+G.RES_META[k].name;}).join(', ')+'</p>',
    [{l:'ЗАБРАТЬ',k:'y',ic:'1f381',fn:function(){ claimDailyUi(false); }},
     {l:'×3 ЗА РЕКЛАМУ',k:'p',ic:'1f3ac',fn:function(){
        var run=function(){ claimDailyUi(true); toast('Утроено!','gold'); };
        if(YSDK&&YSDK.sdk&&YSDK.isPlayable&&YSDK.isPlayable()){ YSDK.showAds(function(sh){ if(sh){state.stats.adsWatched++;try{window.WzShop&&state.stats.adsWatched>=5&&WzShop.unlock('ads5')}catch(e){}run();} else toast('Реклама недоступна','err'); }); }
        else run();
        return false;
     }}]);
}

/* ---------- achievements ---------- */
function renderAch(){
  var box=$('#achieveList'); if(!box)return;
  var got=0,bonus=0;
  G.ACH.forEach(function(a){ if(state.achievements[a.id]){got++;bonus+=a.r;} });
    var done=[],act=[];
  G.ACH.forEach(function(a){ var st=G.achState(state,a);
    if(state.achievements[a.id])done.push([a,st]); else act.push([a,st]); });
  act.sort(function(x,y){ return (y[1].cur/y[1].need)-(x[1].cur/x[1].need); });
  function card(a,st){
    var pct=Math.max(0,Math.min(100,st.need?st.cur/st.need*100:0));
    return '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC(a.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">'+a.n+'</div><div class="csub">'+a.d+'</div></div>'+
      '<span class="tag y">+'+Math.round(a.r*100)+'%</span></div>'+
      '<div class="bar g"><i style="width:'+pct+'%"></i></div>'+
      '<div class="cmeta"><span class="tag">'+G.fmt(st.cur)+' / '+G.fmt(st.need)+'</span>'+
      '<span class="tag">'+Math.round(pct)+'%</span></div></div>';
  }
  function cardDone(a){
    return '<div class="card done"><div class="crow"><div class="cicon"><img src="'+IC(a.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">'+a.n+'</div><div class="csub">'+a.d+'</div></div>'+
      '<span class="tag g">+'+Math.round(a.r*100)+'%</span></div></div>';
  }
  var h='<div class="sect">Награды '+got+'/'+G.ACH.length+'</div>'+
    '<div class="hint">Каждая награда даёт постоянный бонус ко всей продукции станции. Сейчас: <b>+'+Math.round(bonus*100)+'%</b>. Ближайшие показаны первыми — это те, что почти готовы.</div>';
  if(act.length)h+='<div class="sect">Почти готовые ('+act.length+')</div>'+act.slice(0,12).map(function(x){return card(x[0],x[1]);}).join('');
  if(act.length>12)h+='<div class="sect">Остальные цели ('+(act.length-12)+')</div>'+act.slice(12).map(function(x){return card(x[0],x[1]);}).join('');
  if(done.length)h+='<div class="sect">Получено ('+done.length+')</div>'+done.map(function(x){return cardDone(x[0]);}).join('');
  box.innerHTML=h;
}

/* ---------- журнал капитана: история станции ---------- */
function storyHtml(){
  var n=state.chain||0, out=[], i;
  for(i=n-1;i>=0&&out.length<4;i--){
    var c=G.chainCfg(state,i);
    if(c&&c.st)out.push('<div class="story"><div class="st-h">Запись '+(i+1)+' · '+c.n+'</div><p>'+c.st+'</p></div>');
  }
  var nx=G.chainCfg(state,n);
  var locked=(nx&&nx.st)?('<div class="story lock"><div class="st-h">Запись '+(n+1)+' · '+nx.n+'</div>'+
      '<p>Текст появится, когда капитан закончит отчёт по шагу «'+nx.n+'».</p></div>'):'';
  var more=(n>out.length)?('<div class="hint">В журнале уже '+G.pl(n,'запись','записи','записей')+
      '. Каждая запись — это пройденный шаг цепи капитана; пропущенных не бывает.</div>'):'';
  return '<div class="sect">Журнал капитана · записей: '+n+'</div>'+more+out.join('')+locked;
}
/* ---------- урок капитана: объяснение на каждом шаге ---------- */
function lessonGo(ls){
  if(!ls)return;
  var tab=ls.tab||'modules';
  if(tab==='more'){ switchTab('more'); openSec(ls.sec||'prog'); }
  else switchTab(tab);
  var bx=$('#panels'); if(bx)bx.scrollTop=0;
}
function lessonModal(i,prev,force){
  var c=G.chainCfg(state,i); if(!c||!c.ls)return false;
  if(modalOpen()&&!force)return false;   /* не перекрываем оффлайн-награду, сундук и т.п. */
  if(!state.lessonSeen)state.lessonSeen={};
  if(state.lessonSeen[i]&&!force)return false;
  state.lessonSeen[i]=1;
  var st=(prev&&prev.st)?('<div class="story"><div class="st-h">Запись '+i+' · '+prev.n+'</div><p>'+prev.st+'</p></div>'):'';
  var body=st+
    '<div class="lesson"><div class="ls-h">'+c.ls.t+'</div><div class="ls-d">'+c.ls.d+'</div></div>'+
    '<div class="lsgoal">Шаг '+(i+1)+' · '+c.n+'<br>'+c.d+
      '<br><span class="good">Награда: '+G.chainRwTxt(c.rw)+'</span>'+
      (c.nx?('<br><span class="risk">Откроется после: '+c.nx+'</span>'):'')+'</div>';
  openModal(c.ic,'Урок капитана · '+(i+1),body,
    [{l:'ПОКАЖИ, ГДЕ ЭТО',k:'y',fn:function(){ lessonGo(c.ls); }},{l:'ПОНЯТНО'}]);
  snd('upgrade');
  return true;
}
/* ---------- объявление новых замков ---------- */
var gateSeenInit=false, lastChain=-1;
function gateWatch(){
  if(!gateSeenInit){ gateSeenInit=true; G.newGates(state); lastChain=state.chain||0; return; }
  var ng=G.newGates(state);
  if(ng.length){
    ng.forEach(function(k){
      var nm=G.gateName(k);
      toast('🔓 Открылось: '+nm,'gold');
      G.logAdd(state,'🔓 Открылось: '+nm,'gold');
      var tb=G.gateTab(k);
      if(tb&&tb!=='more'){ var t=document.querySelector('.tab[data-tab="'+tb+'"]');
        if(t){ t.classList.add('newtab'); setTimeout(function(){t.classList.remove('newtab');},9000); } }
      renderTabs();
    });
    renderResBar(); renderTabs(); markAlerts();
    if(activeTab==='more')renderMore(); else renderPanel(activeTab);
  }
  var ch=state.chain||0;
  if(ch!==lastChain){
    lastChain=ch;
    var prev=G.chainCfg(state,ch-1);
    setTimeout(function(){ if(!modalOpen())lessonModal(ch,prev); },900);
  }
}
/* ---------- more ---------- */
/* ---------- лесенка: что откроется следующим и сколько ждать ---------- */
function chainCardHtml(){
  var st=G.chainState(state), c=st.cfg, act=G.chainAct(st.i);
  var head=act.n+' · '+(st.endless?('вечный шаг '+(st.i+1)+' (цепь не кончается)'):('шаг '+(st.i+1)+' из '+G.chainLen()));
  var eta=G.chainEta(state,st);
  return '<div class="sect">'+head+'</div>'+
    '<div class="card chain'+(st.ready?' gold':'')+'">'+
    '<div class="crow"><div class="cicon big"><img src="'+IC(c.ic)+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">'+c.n+' <span class="lvl">'+G.fmt(Math.min(st.cur,st.need))+'/'+G.fmt(st.need)+'</span></div>'+
    '<div class="csub">'+c.d+' · Награда: <span class="good">'+G.chainRwTxt(c.rw)+'</span>'+
    (c.nx?(' · после этого откроется: <b>'+c.nx+'</b>'):'')+'</div></div></div>'+
    '<div class="bar '+(st.pct>60?'g':'y')+'"><i style="width:'+st.pct.toFixed(0)+'%"></i></div>'+
    (st.work&&st.wait>0?('<div class="bar g"><i style="width:'+
        Math.max(0,Math.min(100,(st.dwell-st.wait)/st.dwell*100)).toFixed(0)+'%"></i></div>'+
      '<div class="csub">Задача выполнена — отчёт капитана обрабатывается, награда будет через <b>'+
        fmtLeft(st.wait)+'</b>. Дальше по лесенке это обычно дороже и дольше, но ближе уже сейчас: '+
        'копи и строй, не торопясь.</div>'):'')+
    '<div class="cmeta">'+(st.ready?'<span class="tag g">шаг выполнен</span>'
        :(st.work?'<span class="tag g">задача закрыта</span>'
                 :'<span class="tag">срок: '+etaEl('chain:'+st.i+':'+c.id,eta)+'</span>'))+
      '<button class="btn '+(st.ready?'y':'')+'" data-chain="go" '+(st.ready?'':'disabled')+'>'+
      (st.ready?'ЗАБРАТЬ НАГРАДУ':(st.work?'ОТЧЁТ ОБРАБАТЫВАЕТСЯ':'В ПРОЦЕССЕ'))+'</button></div>'+
    (function(){ if(!st.half||!st.half.on)return '';
        return '<div class="chparts">'+(st.half.got
          ?'\u{1f4e9} Предотчёт на середине шага уже получен — награда за весь шаг придёт сверху'
          :'\u{1f4e9} На середине шага («'+st.half.at+' из '+st.half.need+'») капитан пришлёт предотвчёт с малой наградой')+'</div>'; })()+
    chainPartsHtml(st)+
    (function(){var nx=G.chainCfg(state,st.i+1);
      return nx?('<div class="csub chainnx">Дальше по цепи: <b>'+nx.n+'</b> — '+nx.d+
        (nx.nx?(' · затем: '+nx.nx):'')+'</div>'):'';})()+
    '</div>';
}
function chainPartsHtml(st){
  var c=st.cfg,h='';
  if(c.id==='ch21'){
    h+='<div class="chparts">Из чего состоит финал:</div>';
    G.victoryParts(state).forEach(function(p){
      var pc=Math.max(0,Math.min(100,p.cur/p.need*100));
      h+='<div class="chpart"><span>'+p.n+'</span><b>'+G.fmt(p.cur)+'/'+G.fmt(p.need)+'</b>'+
         '<div class="bar '+(pc>=100?'g':'y')+'"><i style="width:'+pc.toFixed(0)+'%"></i></div></div>';
    });
  }
  if(c.id==='ch19'||c.id==='ch23'){
    h+='<div class="chparts">Лаборатория: изучено '+G.resBase(state)+' базовых узлов и '+G.resEternal(state)+
       ' вечных · следующий узел можно поставить в работу прямо сейчас</div>';
  }
  if(c.id==='ch18'||c.kind==='coll'){
    var sh=G.artifactShop(state);
    h+='<div class="chparts">Лавка древностей: '+(sh.ready?'товар готов — покупай за '+sh.cost+' антиматерии'
       :'следующая поставка через '+fmtLeft(sh.leftMs))+' · артефакты также падают в дальних миссиях ('+
       G.artOwned(state)+' из '+G.ART.length+')</div>';
  }
  return h;
}
function chainClaimUi(){
  var r=G.chainClaim(state,Date.now());
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('victory'); buzz([25,25,60]);
  var cx=window.innerWidth/2, cy=window.innerHeight*0.4;
  confettiAt(cx,cy,40); sparks(cx,cy,20);
  toast('🎖 Цепь капитана: '+r.cfg.n+' · '+G.chainRwTxt(r.rw),'gold');
  if(r.next)toast('Следующий шаг цепи: '+r.next.n+' — '+r.next.d,'ok');
  lastChain=state.chain||0;
  setTimeout(function(){ lessonModal(state.chain||0,r.cfg); },1200);
  if(activeTab==='more')renderMore();
  if(activeTab==='quests')renderQuests();
  refreshResBar(); markAlerts(); renderObjective(true); updateSoon();
}
function resonanceHtml(){
  var ri=G.resonanceInfo(state);
  if(ri.n<=0)return '';
  var per=Math.round((G.RESON-1)*10000)/100, mt=(ri.mult<1000)?ri.mult.toFixed(2):G.fmt(ri.mult);
  return '<div class="sect">Резонанс станции · ×'+mt+'</div>'+
    '<div class="card"><div class="crow"><div class="cicon big"><img src="'+IC('26a1')+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">Резонанс ×'+mt+'</div>'+    '<div class="csub">Каждый построенный уровень модуля усиливает <b>всю</b> продукцию станции на '+
    per+'%. Сейчас сыграно <b>'+G.fmt(ri.n)+'</b> уровней модулей. Варп-прыжок сбрасывает резонанс — '+
    'это настоящая цена прыжка, зато антиматерия остаётся навсегда.</div></div></div></div>';
}
function ladderHtml(){
  var L=G.ladder(state,Date.now());
  if(!L.length)return '';
  var act=G.chainAct(G.chainState(state).i);
  var h='<div class="sect">Ближайшие открытия · '+act.n+'</div>'+
    '<div class="hint">'+act.d+'. Всё в станции выстроено в одну очередь: копите, стройте, отправляйте — и следующее откроется само.</div><div class="ladder">';
  L.forEach(function(x,i){
    var pct=(x.need>1)?Math.max(0,Math.min(100,x.cur/x.need*100)):100;
    var jump=x.tab==='more'?(x.sec||'prog'):x.tab;
    h+='<div class="lad'+(i===0?' hot':'')+'" data-jump="'+jump+'">'+
      '<div class="lad-ic"><img src="'+IC(x.ic)+'" alt=""></div>'+
      '<div class="lad-b"><div class="lad-t">'+x.n+' <span class="tag">'+x.kind+'</span></div>'+
      '<div class="lad-r">'+x.req+' · '+etaEl('lad:'+x.kind+':'+x.n, x.eta)+'</div>'+
      (x.need>1?'<div class="bar '+(pct>60?'g':'y')+'"><i style="width:'+pct+'%"></i></div>':'')+
      '<div class="lad-rw">даёт: '+x.rw+'</div></div>'+
      '<button class="btn sm ghost">→</button></div>';
  });
  return h+'</div>';
}
function nextUnlockLine(){
  var L=G.ladder(state,Date.now());
  if(!L.length)return '';
  /* вехи модулей, «стройку» и цель-накопление показываются отдельной карточкой
   «Копим на»: здесь нужно настоящее открытие — модуль, уровень, верфь, замок или шаг цепи */
  var skip={'Веха':1,'Заказ':1,'Стройка':1,'Событие':1,'Флот':1};
  var x=L[0];
  for(var q=0;q<L.length;q++){ if(!skip[L[q].kind]){ x=L[q]; break; } }
  return '<div class="card nextun" data-jump="'+(x.tab==='more'?(x.sec||'prog'):x.tab)+'">'+
    '<div class="crow"><div class="cicon"><img src="'+IC(x.ic)+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">🔒 Следующее открытие: '+x.n+'</div>'+
    '<div class="csub">'+x.req+' · '+etaEl('un:'+x.n, x.eta)+' · даёт: '+x.rw+'</div></div></div></div>';
}
function bindJumps(box){
  (box||document).querySelectorAll('[data-jump]').forEach(function(n){
    n.onclick=function(e){
      if(e.target&&e.target.closest&&e.target.closest('button')&&n.tagName!=='DIV')return;
      var id=n.getAttribute('data-jump');
      if(id==='prog'||id==='sci'||id==='fleet'||id==='wheel'||id==='col'||id==='set'){ switchTab('more'); openSec(id); }
      else switchTab(id);
    };
  });
}
function renderMore(){
  var box=$('#moreList'); if(!box)return;
  var r=G.rates(state), pg=G.prestigeGain(state);
  var si=G.seasonInfo(state,Date.now());
  if(!G.gateOpen(state,'sec:'+moreSec))moreSec='prog';
  var h='<div class="mchips">'+MSEC.filter(function(m){return G.gateOpen(state,'sec:'+m.id);}).map(function(m){return '<button class="btn sm mchip'+(moreSec===m.id?' on':'')+'" data-msec="'+m.id+'"><img src="'+IC(m.ic)+'" alt="">'+m.n+'</button>';}).join('')+'</div>'+
   msecOpen('prog')+storyHtml()+victoryHtml()+chainCardHtml()+resonanceHtml()+ladderHtml()+
   (G.gateOpen(state,'career')?careerHtml():'')+
   (G.gateOpen(state,'prestige')?('<div class="sect">Престиж · Варп-прыжок</div>'+
   '<div class="card gold"><div class="crow"><div class="cicon big"><img src="'+IC('1f680')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Гиперпрыжок</div>'+
   '<div class="csub">Сброс модулей и ресурсов ради антиматерии. Каждая антиматерия даёт <b>+12%</b> ко всему доходу навсегда.</div></div></div>'+
   (function(){
      var need=G.prestigeNeed(state), bank=Math.max(0,(state.stats.totalEnergy||0)-(state.prestigeThreshold||0));
      var pct=Math.max(0,Math.min(100,bank/Math.max(1,need)*100));
      var eta=G.timeToR(bank,G.ratesCalm(state).energy||0,need);
      return '<div class="bar '+(pct>=100?'g':'y')+'"><i style="width:'+pct.toFixed(0)+'%"></i></div>'+
        '<div class="csub">Нужно добыть <b>'+G.fmt(need)+'</b> энергии с прошлого прыжка · добыто '+G.fmt(bank)+
        ' · '+etaEl('prest:need',eta)+'</div>';
    })()+
   (function(){ var cool=G.prestigeCool(state,Date.now());
      return '<div class="cmeta"><span class="tag y"><img src="'+IC('2728')+'" alt="">+'+G.fmt(pg)+' антиматерии</span>'+
      '<button class="btn y" id="btn-prest" '+((pg<1||!cool.ready)?'disabled':'')+'>'+
      (cool.ready?'ПРЫЖОК':'ОСТЫВАЕТ · '+Math.ceil(cool.left/60000)+' мин')+'</button></div>'+
      (cool.ready?'':'<div class="csub">Гипердвигателю нужно остыть после прыжка: ещё <b>'+
        Math.ceil(cool.left/60000)+' мин</b>. Прыжок сжигает резонанс станции, торопиться с ним незачем.</div>')+
      '</div>';})()):'')+
   (G.gateOpen(state,'season')?('<div class="sect">Сезон «'+seasonName(si.id)+'» · осталось <b data-sqleft="'+si.end+'">'+fmtLeft(si.end-Date.now())+'</b></div>'+seasonHtml(si)):'')+
   '</div>'+msecOpen('sci')+'<div class="sect">Лаборатория · '+G.resBase(state)+' из '+G.RESEARCH.filter(function(r){return !r.et;}).length+
   ' базовых'+(state.eternal?(' + вечные ярусы: '+G.resEternal(state)):'')+'</div>'+researchHtml()+
   '</div>'+msecOpen('fleet')+'<div class="sect">Верфь · кораблей в строю: '+G.shipOwned(state)+'/'+G.SHIPS.length+'</div>'+radarHtml()+shipyardHtml()+
   '</div>'+msecOpen('wheel')+'<div class="sect">Колесо фортуны</div>'+wheelCardHtml()+
   '</div>'+msecOpen('col')+artGridHtml()+
   '<div class="sect">Облики станции</div>'+
   '<div class="hint">Открываются за антиматерию и навсегда остаются с тобой. Сейчас: <b>'+G.fmt(state.resources.antimatter)+'</b> антиматерии.</div>'+
   '<div class="skgrid">'+G.SKINS.map(function(sk){
      var own=!!state.skins[sk.id], on=state.skin===sk.id;
      return '<div class="sk '+(on?'on':'')+(own?'':' lock')+'" data-skin="'+sk.id+'">'+
        (on?'<span class="badge">НАДЕТ</span>':(own?'<span class="badge">ВЫБРАТЬ</span>':''))+
        '<img class="skthumb" src="assets/img/'+sk.img+'" alt="">'+
        '<div class="n">'+sk.n+'</div>'+
        '<div class="p">'+(own?(on?'надет':'открыт'):'🔒 '+sk.cost+' ✦')+'</div></div>';
   }).join('')+'</div>'+
   '</div>'+msecOpen('set')+'<div class="sect">Статистика</div><div class="grid2">'+
   stat('Энергии/сек',G.fmt(r.energy))+stat('Сила тапа',G.fmt(G.clickPower(state)))+
   stat('Всего энергии',G.fmt(state.stats.totalEnergy))+stat('Всего руды',G.fmt(state.stats.totalMinerals))+
   stat('Всего кредитов',G.fmt(state.stats.totalCredits))+stat('Антиматерия',G.fmt(state.resources.antimatter),'y')+
   stat('Тапов',G.fmt(state.stats.totalClicks))+stat('Экспедиций',G.fmt(state.stats.totalExpeditions))+
   stat('Успешных',G.fmt(state.stats.expSuccess))+stat('Комет поймано',G.fmt(state.stats.cometsCaught))+
   stat('Заданий',G.fmt(state.stats.questsDone))+stat('Престижей',G.fmt(state.prestigeCount),'p')+
   stat('Множитель','×'+G.fmt(G.productionMult(state)),'p')+stat('Уровень станции',G.stationLevel(state))+
   stat('Время в игре',fmtTime(state.stats.playSeconds))+stat('Серия дней',state.daily.streak,'y')+
   stat('Заданий дня',G.fmt(state.stats.dqDone||0))+stat('Спинов колеса',G.fmt(state.stats.wheelSpins||0))+
      stat('Артефактов',G.fmt(G.artOwned(state)),'y')+
   stat('Вспышек',G.fmt(state.stats.flares||0))+stat('Сундуков открыто',G.fmt(state.stats.chestsOpened||0))+
      stat('Авто-тапов',G.fmt(state.stats.autoTaps||0))+
   stat('Пиратов бито',G.fmt(state.stats.raids||0))+stat('Налётов упущено',G.fmt(state.stats.raidsLost||0))+stat('Сундуков ждёт',G.fmt((state.chests||[]).length),'y')+
   stat('Узлов науки',G.fmt(G.resBase(state))+' базовых + '+G.fmt(G.resEternal(state))+' вечных','p')+stat('Этапов маршрута',G.fmt(state.stats.routes||0))+
   stat('Флагманов бито',G.fmt(state.bosses||0),'p')+
   stat('Контрактов порта',G.fmt(state.stats.contractsDone||0),'y')+stat('Сорвано контрактов',G.fmt(state.stats.contractsMissed||0))+
   stat('Ранг порта',G.portRep(state).cfg.n,'p')+stat('Больших сделок',G.fmt(state.stats.dealsDone||0),'y')+
   stat('Срочных чартеров',G.fmt(state.stats.urgentDone||0),'y')+stat('Бонус-сетов флота',G.setCount(state)+'/'+G.SHIP_SETS.length,'p')+
   stat('Пирс порта',(state.pier?'расширенный (4)':'обычный (3)'),'')+      stat('Патруль флота',G.fmt(G.fleetDps(state))+'/с','')+   stat('Замен заказов',G.fmt(state.stats.rerolls||0))+stat('Кораблей верфи',G.shipOwned(state)+'/'+G.SHIPS.length,'p')+stat('Уровень флота',G.shipLvSum(state)+' (апгрейдов '+G.fmt(state.stats.shipUps||0)+')','y')+
      stat('Абордажей пережито',G.fmt(state.stats.boardings||0))+stat('Кораблей починено',G.fmt(state.stats.repairs||0),'y')+
      stat('В доке сейчас',G.dockCount(state)+(G.dockCount(state)?'':''),'')+stat('Охотников сбито',G.fmt(state.stats.hunters||0),'p')+
      stat('Сезонных заданий',G.fmt(state.stats.sqDone||0),'y')+stat('Вечных узлов',G.resEternal(state)+'/4','p')+
      stat('Пиковых сделок',G.fmt(state.stats.peakDeals||0),'y')+
      stat('Караванов проведено',G.fmt(state.stats.caravans||0),'p')+
   (state.victory?stat('Вечный режим','Эпоха '+(state.epochs||0),'y'):stat('Финал','не пройден'))+
   '</div>'+
   '<div class="sect">Настройки</div>'+
   '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC('1f50a')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Звук эффектов</div><div class="csub">Клики, стройка, биржа, варп</div></div>'+
   '<button class="btn" id="btn-sound">'+(settings.sound?'ВКЛ':'ВЫКЛ')+'</button></div></div>'+
   '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC('1f3b5')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Эмбиент станции</div><div class="csub">Тихий гул отсеков на фоне</div></div>'+
   '<button class="btn" id="btn-music">'+(settings.music?'ВКЛ':'ВЫКЛ')+'</button></div></div>'+
      '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC('1f4f3')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Вибрация</div><div class="csub">Отклик телефона на серии кликов, варп и находки</div></div>'+
   '<button class="btn" id="btn-vib">'+(settings.vib?'ВКЛ':'ВЫКЛ')+'</button></div></div>'+
   '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC('1f320')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Бонус за рекламу</div><div class="csub">Мгновенный заряд энергии и буст ×7 на 30 секунд</div></div>'+
   '<button class="btn y" id="btn-ad">СМОТРЕТЬ</button></div></div>'+
   '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC('1f9c5')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Таблица рекордов</div><div class="csub">Отправить накопленную энергию в общий зачёт</div></div>'+
   '<button class="btn" id="btn-lb">РЕКОРДЫ</button></div></div>'+
   '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC('1f4be')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Сохранение</div><div class="csub">Автосейв каждые 5 секунд + облачное сохранение</div></div>'+
   '<button class="btn" id="btn-save">СОХРАНИТЬ</button></div></div>'+
   '<div class="card"><div class="crow"><div class="cicon"><img src="'+IC('26a0')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Сброс прогресса</div><div class="csub">Полностью удалить сохранение</div></div>'+
   '<button class="btn" id="btn-reset">СБРОСИТЬ</button></div></div>'+
      '<div class="sect">Журнал станции</div>'+logHtml()+
      '<div class="hint" style="text-align:center;margin-top:14px">Cosmic Station Idle</div></div>';
  box.innerHTML=h;
  var b;
  if((b=$('#btn-prest')))b.onclick=doPrestige;
  box.querySelectorAll('[data-chain]').forEach(function(x){ x.onclick=chainClaimUi; });
  if((b=$('#btn-pier')))b.onclick=buyPierUi;
  box.querySelectorAll('[data-msec]').forEach(function(x){ x.onclick=function(){
    var id=x.getAttribute('data-msec'); if(id===moreSec)return;
    moreSec=id; snd('tab'); renderMore(); var bx=$('#panels'); if(bx)bx.scrollTop=0;
  }; });
  box.querySelectorAll('[data-season]').forEach(function(x){ x.onclick=function(){ seasonClaimUi(+x.getAttribute('data-season')); }; });
  box.querySelectorAll('[data-sq]').forEach(function(x){ x.onclick=function(){ sqClaimUi(+x.getAttribute('data-sq')); }; });
  box.querySelectorAll('[data-repair]').forEach(function(x){ x.onclick=function(){ repairUi(x.getAttribute('data-repair')); }; });
  box.querySelectorAll('[data-emg]').forEach(function(x){ x.onclick=function(){ doEmergency(); }; });
  box.querySelectorAll('[data-career]').forEach(function(x){ x.onclick=function(){ careerOpen=!careerOpen; if(careerOpen)careerModal(); else renderMore(); }; });
  if((b=$('#btn-victory')))b.onclick=doVictory;
  box.querySelectorAll('[data-res]').forEach(function(x){ x.onclick=function(){ buyResearchUi(x.getAttribute('data-res')); }; });
  box.querySelectorAll('[data-resx]').forEach(function(x){ x.onclick=function(){ cancelResUi(); }; });
  if((b=$('#btn-artshop')))b.onclick=buyArtifactUi;
  box.querySelectorAll('[data-ship]').forEach(function(d){ d.onclick=function(){ buyShipUi(d.getAttribute('data-ship')); }; });
  box.querySelectorAll('[data-shipup]').forEach(function(d){ d.onclick=function(e){ e.stopPropagation(); shipUpUi(d.getAttribute('data-shipup')); }; });
  if((b=$('#btn-sound')))b.onclick=function(){settings.sound=!settings.sound;saveSettings();if(settings.sound)snd('tab');renderMore();};
    if((b=$('#btn-music')))b.onclick=function(){settings.music=!settings.music;saveSettings();if(settings.music)ambStart();else ambStop();renderMore();};
  if((b=$('#btn-vib')))b.onclick=function(){settings.vib=!settings.vib;saveSettings();if(settings.vib)buzz(30);renderMore();};
  if((b=$('#btn-ad')))b.onclick=watchAd;
  if((b=$('#btn-lb')))b.onclick=showLeaderboard;
  if((b=$('#btn-lb-season')))b.onclick=showSeasonBoard;
  if((b=$('#btn-passport')))b.onclick=passportModal;
  if((b=$('#btn-wheel')))b.onclick=function(){ openWheel(false); };
  if((b=$('#btn-wheel-ad')))b.onclick=function(){
    var onPlatform=YSDK&&YSDK.sdk&&YSDK.isPlayable&&YSDK.isPlayable();
        var run=function(){ state.stats.adsWatched++; openWheelAd(); };
    if(onPlatform){ YSDK.showAds(function(sh){ if(sh)run(); else toast('Реклама недоступна','err'); }); }
    else run();
  };
  if((b=$('#btn-save')))b.onclick=function(){saveNow();saveCloud(true);toast('Сохранено','ok');};
  if((b=$('#btn-reset')))b.onclick=doReset;
  box.querySelectorAll('[data-skin]').forEach(function(d){ d.onclick=function(){ pickSkin(d.getAttribute('data-skin')); }; });
  bindJumps(box);
}
var careerOpen=false;
var CRANKS=[{p:0,n:'Матрос'},{p:25,n:'Боцман'},{p:70,n:'Старпом'},{p:150,n:'Капитан'},
            {p:300,n:'Коммодор'},{p:600,n:'Контр-адмирал'},{p:1000,n:'Адмирал'},{p:1800,n:'Маршал флотов'}];
function rankFor(p){var r=CRANKS[0];CRANKS.forEach(function(x){if(p>=x.p)r=x;});return r;}
function careerRows(s){
  var st=s.stats||{};
  return [
    {ic:'1f3d7',n:'Строитель',v:G.totalModules(s),p:Math.floor(G.totalModules(s)/4)},
    {ic:'1f52c',n:'Учёный',v:G.resOwned(s),p:G.resOwned(s)*3},
    {ic:'1f91d',n:'Дипломат порта',v:st.contractsDone||0,p:(st.contractsDone||0)*2},
    {ic:'1f6e1',n:'Вояка',v:(st.raids||0)+(st.hunters||0)+(st.boardings||0),p:((st.raids||0)+(st.hunters||0)+(st.boardings||0))*2},
    {ic:'1f4bc',n:'Исследователь',v:st.totalExpeditions||0,p:Math.floor((st.totalExpeditions||0)/2)},
    {ic:'2696',n:'Коллекционер',v:G.artOwned(s),p:G.artOwned(s)*4},
    {ic:'1f4b0',n:'Торговец',v:(st.sells||0)+(st.peakDeals||0),p:Math.floor(((st.sells||0)+(st.peakDeals||0))/2)},
    {ic:'1f9e0',n:'Капитан варпа',v:(s.prestigeCount||0)+(s.epochs||0)*3,p:(s.prestigeCount||0)*6+(s.epochs||0)*20}
  ];
}
function careerTotal(s){return careerRows(s).reduce(function(a,x){return a+x.p;},0);}
function passportText(){
  var tot=careerTotal(state), me=rankFor(tot), st=state.stats||{};
  var rows=careerRows(state).map(function(x){ return ' · '+x.n+': '+rankFor(x.p).n; }).join('\n');
  return 'Звёздная Станция — Cosmic Station Idle\n'+
    G.stationTitle(state)+' · уровень '+G.stationLevel(state)+'\n'+
    'Звание капитана: '+me.n+' (опыт '+G.fmt(tot)+')\n'+rows+'\n'+
    'Рекорды: модулей '+G.fmt(G.totalModules(state))+', варп-прыжков '+G.fmt(state.prestigeCount)+
    ', вечных эпох '+G.fmt(state.epochs||0)+', артефактов '+G.artOwned(state)+'/'+G.ART.length+
    ', кораблей '+G.shipOwned(state)+'/'+G.SHIPS.length+' (уровень флота '+G.shipLvSum(state)+'), контрактов '+G.fmt(st.contractsDone||0)+
    ', караванов '+G.fmt(st.caravans||0);
}
function copyFallback(t){
  var done=false;
  try{ var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.left='-9999px';
    ta.style.opacity='0'; document.body.appendChild(ta); ta.select();
    done=document.execCommand&&document.execCommand('copy'); if(ta.remove)ta.remove(); else ta.parentNode.removeChild(ta);
  }catch(e){}
  return done;
}
function copyText(t){
  var say=function(ok){ toast(ok?'📋 Паспорт скопирован в буфер обмена':'Скопировать не удалось — выдели текст вручную',ok?'ok':'err'); };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    try{
      var pr=navigator.clipboard.writeText(t);
      if(pr&&pr.then){ pr.then(function(){ say(true); },function(){ say(copyFallback(t)); }); return; }
      say(true); return;
    }catch(e){}
  }
  say(copyFallback(t));
}
function sharePassport(){
  var t=passportText();
  try{
    if(navigator.share&&navigator.canShare&&navigator.canShare({title:'Звёздная Станция',text:t})){
      navigator.share({title:'Звёздная Станция — Cosmic Station Idle',text:t}); return;
    }
  }catch(e){}
  copyText(t);
}
function posterHtml(){
  var tot=careerTotal(state), me=rankFor(tot), sk=G.skinById(state.skin), st=state.stats||{};
  var rows=careerRows(state).map(function(x){
    return '<div class="prow"><img src="'+IC(x.ic)+'" alt=""><span>'+x.n+'</span><b>'+rankFor(x.p).n+'</b></div>';
  }).join('');
  return '<div class="poster"><div class="postart"><img src="assets/img/'+sk.img+'" alt="">'+
    '<div class="pbg"></div></div>'+
    '<div class="phead"><div class="pt">'+G.stationTitle(state)+'</div>'+
    '<div class="ps">уровень '+G.stationLevel(state)+' · '+sk.n+'</div></div>'+
    '<div class="prank"><img src="'+IC('1f3af')+'" alt="">'+me.n+'</div>'+
    '<div class="pgrid">'+
      '<div><span>модулей</span><b>'+G.fmt(G.totalModules(state))+'</b></div>'+
      '<div><span>варп-прыжков</span><b>'+G.fmt(state.prestigeCount)+'</b></div>'+
      '<div><span>вечных эпох</span><b>'+G.fmt(state.epochs||0)+'</b></div>'+
      '<div><span>караванов</span><b>'+G.fmt(st.caravans||0)+'</b></div>'+
      '<div><span>артефактов</span><b>'+G.artOwned(state)+'/'+G.ART.length+'</b></div>'+
      '<div><span>кораблей верфи</span><b>'+G.shipOwned(state)+'/'+G.SHIPS.length+' · ур. '+G.shipLvSum(state)+'</b></div>'+
    '</div>'+
    '<div class="pdir">'+rows+'</div>'+
    '<div class="pfoot">Cosmic Station Idle</div></div>';
}
function passportModal(){
  openModal('1f4c8','Паспорт станции',posterHtml(),
    [{l:'СКОПИРОВАТЬ',k:'y',ic:'1f4cb',fn:function(){ copyText(passportText()); return false; }},
     {l:'ПОДЕЛИТЬСЯ',k:'p',ic:'1f91d',fn:function(){ sharePassport(); return false; }},
     {l:'Закрыть',k:'ghost'}]);
}
function careerModal(){
  var tot=careerTotal(state), me=rankFor(tot);
  var rows=careerRows(state).map(function(x){
    var r=rankFor(x.p);
    return '<div class="crow"><div class="cicon"><img src="'+IC(x.ic)+'" alt=""></div>'+
      '<div class="cmain"><div class="ctitle">'+x.n+'</div><div class="csub">показатель: '+G.fmt(x.v)+'</div></div>'+
      '<div class="cmeta"><span class="tag y">'+r.n+'</span></div></div>';
  }).join('');
  var nx=CRANKS.filter(function(x){return x.p>tot;})[0];
  openModal('1f3af','Карьера капитана',
    '<div class="hint">Общий опыт капитана: <b>'+G.fmt(tot)+'</b>. Звание: <b>'+me.n+'</b>'+
    (nx?' · до «'+nx.n+'» ещё '+G.fmt(nx.p-tot):' · максимум достигнут')+'</div>'+
    '<div class="sect">Звания по направлениям</div>'+rows+
    '<div class="hint">Звания не сгорают после варп-прыжка и Вечного режима — это память о пути станции.</div>',
    [{l:'ПАСПОРТ-ПОСТЕР',k:'y',ic:'1f4c8',fn:function(){ setTimeout(passportModal,60); return false; }},
     {l:'Закрыть',k:'p'}]);
}
function careerHtml(){
  var lv=G.stationLevel(state), t=G.stationTitle(state), v=G.victoryState(state);
  return '<div class="sect">Паспорт станции</div>'+
   '<div class="card gold"><div class="crow"><div class="cicon big"><img src="'+IC('1f3c6')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">'+t+'</div>'+
   '<div class="csub">Путь станции: от ремонтного дока до '+
     (v.won?'Вечного режима и за его пределы':'звёздных врат и варп-прыжков')+
     '. Корабли, наука и артефакты остаются с тобой навсегда.</div></div></div>'+
   '<div class="grid2">'+
     stat('Модулей построено',G.fmt(G.totalModules(state)))+
     stat('Уровень станции',lv)+
     stat('Варп-прыжков',G.fmt(state.prestigeCount),'p')+
     stat('Вечных эпох',G.fmt(state.epochs||0),'y')+
     stat('Артефактов',G.artOwned(state)+'/'+G.ART.length,'y')+
     stat('Узлов науки',G.resBase(state)+' базовых + '+G.resEternal(state)+' вечных')+
     stat('Кораблей верфи',G.shipOwned(state)+'/'+G.SHIPS.length)+
     stat('Ранг порта',G.portRep(state).cfg.n,'p')+
     stat('Экспедиций',G.fmt(state.stats.totalExpeditions))+
     stat('Контрактов порта',G.fmt(state.stats.contractsDone||0))+
     stat('Сбито пиратов и охотников',G.fmt((state.stats.raids||0)+(state.stats.hunters||0)))+
     stat('Время в игре',fmtTime(state.stats.playSeconds))+
   '</div>'+
   '<div class="crow" style="margin-top:8px"><button class="btn ghost sm" data-career>'+
   (careerOpen?'Скрыть звания':'Карьера капитана')+'</button>'+
   '<button class="btn sm y" id="btn-passport"><img src="'+IC('1f4c8')+'" alt="">Паспорт-постер</button></div>'+
   '</div>';
}
function wheelCardHtml(){
  var w=G.wheelState(state,Date.now());
  return '<div class="card '+(w.ready?'gold':'')+'"><div class="crow"><div class="cicon big"><img src="'+IC('1f3b5')+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">Колесо фортуны</div>'+
        '<div class="csub">Бесплатный спин раз в 3 часа. Призы: энергия, руда, кредиты, буст ×7, сундук находок и редкая антиматерия.</div></div></div>'+
    '<div class="cmeta">'+(w.ready?'<button class="btn y" id="btn-wheel">КРУТИТЬ</button>'
            :'<span class="tag y" data-cd="'+((state.wheel.last||0)+G.WHEEL_CD)+'">⟳ перезарядка '+fmtTime(w.left/1000)+'</span>'+
       '<button class="btn p" id="btn-wheel-ad">СПИН ЗА РЕКЛАМУ</button>')+'</div></div>';
}
var wheelBusy=false;
function openWheel(byAd){
  if(wheelBusy)return;
  if(!byAd){ var st0=G.wheelState(state,Date.now()); if(!st0.ready){toast('Колесо перезаряжается','err');return;} }
  var res=G.wheelSpin(state,Date.now());
  if(!res.ok){ toast(res.msg,'err'); return; }
  wheelBusy=true;
  snd('warp');
  var segs=G.WHEEL.length, step=360/segs;
  var target=360*4+(segs-res.idx)*step - step/2;
  openModal('1f3b5','Колесо фортуны', wheelHtml(), [{l:'ЗАКРЫТЬ',k:'y'}]);
  wheelSpinAnim(res.idx);
  setTimeout(function(){
    wheelBusy=false;
    var r=document.getElementById('wheelRes');
        var txt=(res.cfg.k==='none'||!res.rw)?'Пусто — в другой раз повезёт!':(res.cfg.k==='boost'?'Буст ×7 на 30 секунд!':(res.cfg.k==='chest'?'Сундук находок! Открой его во вкладке «Экспедиции»':(res.cfg.t+': '+Object.keys(res.rw).filter(function(k){return !!G.RES_META[k];}).map(function(k){return '+'+G.fmt(res.rw[k])+' '+G.RES_META[k].name;}).join(', '))));
    if(r){ r.innerHTML='<b style="color:'+(res.cfg.k==='none'?'#93a0cf':'#ffd76a')+'">'+txt+'</b>'; }
        if(res.cfg.k==='boost'){ setBoost(30000); snd('boost'); }
    else if(res.cfg.k==='chest'){ snd('chest'); }
    else if(res.cfg.k!=='none'){ snd('upgrade'); }
    if(res.cfg.k!=='none'){ confettiAt(window.innerWidth/2,window.innerHeight*0.42,26); toast('Колесо: '+txt,'gold'); }
    else snd('fail');
    refreshResBar(); markAlerts();
  },3400);
}
function openWheelAd(){
  if(wheelBusy)return;
  var segs=G.WHEEL.length, step=360/segs;
  var tw=0; G.WHEEL.forEach(function(x){tw+=x.w;});
  var r=Math.random()*tw,idx=0,acc=0;
  for(var i=0;i<G.WHEEL.length;i++){acc+=G.WHEEL[i].w;if(r<acc){idx=i;break;}}
  var cfg=G.WHEEL[idx],rw=null;
  if(cfg.k==='energy'){var v=Math.max(300,Math.floor(G.rates(state).energy*900*cfg.m+900));state.resources.energy+=v;state.stats.totalEnergy+=v;rw={energy:v};}
  else if(cfg.k==='minerals'){var v2=Math.max(150,Math.floor(G.rates(state).minerals*900*cfg.m+300));state.resources.minerals+=v2;state.stats.totalMinerals+=v2;rw={minerals:v2};}
  else if(cfg.k==='credits'){var v3=Math.max(300,Math.floor(G.rates(state).credits*900*cfg.m+500));state.resources.credits+=v3;state.stats.totalCredits+=v3;rw={credits:v3};}
    else if(cfg.k==='anti'){var v4=2+Math.floor(G.stationLevel(state)/10);state.resources.antimatter+=v4;rw={antimatter:v4};}
  else if(cfg.k==='chest'){G.pushChest(state,Math.random()<0.45?2:1);rw={chests:1};}
  state.wheel.spins=(state.wheel.spins||0)+1; state.stats.wheelSpins=(state.stats.wheelSpins||0)+1;
  var res={ok:true,idx:idx,cfg:cfg,rw:rw};
  wheelBusy=true; snd('warp');
  openModal('1f3b5','Колесо фортуны · за рекламу', wheelHtml(), [{l:'ЗАКРЫТЬ',k:'y'}]);
  wheelSpinAnim(idx);
  setTimeout(function(){
    wheelBusy=false;
    var rr=document.getElementById('wheelRes');
        var txt=(cfg.k==='none'||!rw)?'Пусто — в другой раз повезёт!':(cfg.k==='boost'?'Буст ×7 на 30 секунд!':(cfg.k==='chest'?'Сундук находок! Открой его во вкладке «Экспедиции»':(cfg.t+': '+Object.keys(rw).filter(function(k){return !!G.RES_META[k];}).map(function(k){return '+'+G.fmt(rw[k])+' '+G.RES_META[k].name;}).join(', '))));
    if(rr)rr.innerHTML='<b style="color:'+(cfg.k==='none'?'#93a0cf':'#ffd76a')+'">'+txt+'</b>';
        if(cfg.k==='boost'){ setBoost(30000); snd('boost'); } else if(cfg.k==='chest') snd('chest'); else if(cfg.k!=='none') snd('upgrade'); else snd('fail');
    if(cfg.k!=='none'){ confettiAt(window.innerWidth/2,window.innerHeight*0.42,26); toast('Колесо: '+txt,'gold'); }
    refreshResBar(); markAlerts();
  },3400);
}
function wheelHtml(){
  var size=(window.innerHeight<470)?168:((window.innerWidth<400)?200:232);
  var R=Math.round(size/2-20), segs=G.WHEEL.length, step=360/segs;
  return '<div class="wheel-wrap" style="width:'+size+'px;height:'+size+'px">'+
    '<div class="wheel-pointer"></div>'+
    '<div class="wheel" id="wheelEl" style="background:'+wheelGrad()+'">'+
    G.WHEEL.map(function(x,i){return '<div class="wl" style="transform:rotate('+(i*step+step/2)+'deg) translate(0,-'+R+'px)"><img src="'+IC(x.ic)+'" alt=""></div>';}).join('')+
    '<div class="wheel-hub"><img src="'+IC('1f300')+'" alt=""></div></div></div>'+
    '<p id="wheelRes" style="text-align:center;min-height:22px;color:#93a0cf">Крутим…</p>';
}
function wheelSpinAnim(idx){
  var segs=G.WHEEL.length, step=360/segs;
  var target=360*4+(segs-idx)*step - step/2;
  var w=document.getElementById('wheelEl');
  if(w){ w.style.transform='rotate(0deg)'; setTimeout(function(){ w.style.transform='rotate('+target+'deg)'; },60); }
}
function wheelGrad(){
    var cols=['#2a3f7a','#3a2a6e','#1f5a6b','#6b3a2a','#2a3f7a','#4a2a5a','#1f5a6b','#6b2a55','#3a5a2a'];
  var step=360/cols.length,out=[],acc=0;
  cols.forEach(function(c,i){ out.push(c+' '+acc+'deg '+(acc+step)+'deg'); acc+=step; });
  return 'conic-gradient('+out.join(',')+')';
}
function slipHtml(){
  var list=G.shipInstallList(state,Date.now());
  if(!list.length)return '';
  return '<div class="sect2">Стапель · корпус на стапеле: '+list.length+'</div>'+
   '<div class="dockgrid">'+list.map(function(it){
     var b=G.shipById(it.id); if(!b)return '';
     return '<div class="dockcard"><div class="dship"><img class="t'+G.SHIPS.indexOf(b)+'" src="assets/img/'+b.img+'" alt=""></div>'+
       '<div class="dmain"><div class="n">'+b.n+'</div>'+
       '<div class="d2">Корпус спускают с верфи: бонусы и патруль включатся, когда он выйдет на орбиту — '+
       '<b data-slipl="'+it.end+'" data-slipid="'+it.id+'">'+fmtTime(it.left/1000)+'</b>. До спуска это та же '+
       'большая стройка, которой стоит ждать, а не щелчок.</div>'+
       '<div class="bar y"><i style="width:'+Math.round(it.pct)+'%"></i></div></div></div>';
   }).join('')+'</div>';
}
function shipyardHtml(){ /* radarHtml() вставляется в раздел «Флот» */
  var own=G.shipOwned(state);
  return dockHtml()+slipHtml()+'<div class="hint">Корабли спускаются с верфи один раз и остаются навсегда — даже после варп-прыжка. '+
   'Каждый даёт постоянный бонус, летает вокруг станции и прикрывает её в рейдах: <b>патруль '+G.fmt(G.fleetDps(state))+' урона/сек</b>. '+
   'Качай <b>уровень корабля</b> за антиматерию: каждый уровень усиливает его бонус на 15%, а на 3/6/10/15 уровнях корабль даёт флоту вечный перк.</div>'+
   '<div class="shipgrid">'+G.SHIPS.map(function(b,i){
     var have=!!(state.ships&&state.ships[b.id]);
     var dmg=have&&G.shipDmg(state,b.id);
     var slip=have?G.shipInstallInfo(state,b.id,Date.now()):null;
     var lock=!have&&!G.shipUnlocked(state,b.id);
     var can=!have&&!lock&&Object.keys(b.cost).every(function(k){return (state.resources[k]||0)>=b.cost[k];});
     var cost=Object.keys(b.cost).filter(function(k){return b.cost[k]>0;}).map(function(k){return resTag(k,b.cost[k]);}).join('');
     var lv=have?G.shipLv(state,b.id):0, upc=have?G.shipUpCost(state,b.id):0;
     var canup=have&&(state.resources.antimatter||0)>=upc;
     var pk=have?G.shipNextPerk(state,b.id):null;
     return '<div class="ship t'+i+(have?' own':'')+(can?' can':'')+(lock?' locked':'')+'" data-ship="'+b.id+'">'+
       '<img src="assets/img/'+b.img+'" alt="">'+
       '<div class="n">'+b.n+(have?' <span class="slv">ур. '+lv+'</span>':'')+'</div>'+
       '<div class="d">'+b.d+(have?' <b class="up">+ '+Math.round(15*(lv-1))+'%</b>':'')+'</div>'+
       '<div class="p">'+(slip?('<span class="tag">стапель \u00b7 '+fmtLeft(slip.left)+'</span>'):(dmg?'<span class="tag bad">в ремонтном доке</span>':(have?('<span class="tag"><img src="'+IC('2728')+'" alt="">'+G.fmt(upc)+'</span>'+
            (canup?'':'<span class="tag eta" data-etacost="{&quot;antimatter&quot;:'+upc+'}">\u23f3</span>')+
            '<span class="tag g">в строю</span>'):(lock?'<span class="tag">ур. станции '+G.SHIP_LV[G.SHIPS.indexOf(b)]+'</span>':cost+etaChip(b.cost)))))+'</div>'+
       (slip?'<button class="btn sm" disabled>НА СТАПЕЛЕ \u00b7 '+fmtLeft(slip.left)+'</button>':
        (have?'<button class="btn sm '+(canup?'y':'')+'" data-shipup="'+b.id+'" '+(canup?'':'disabled')+'>УЛУЧШИТЬ</button>':
        (lock?'':'<button class="btn sm '+(can?'y':'')+'" '+(can?'':'disabled')+'>СОЙТИ С ВЕРФИ</button>')))+
       (have?'<div class="perk">'+(pk?('перк «'+pk.t+'» на ур. '+pk.lv):'все перки открыты')+'</div>':'')+
     '</div>';
   }).join('')+'</div>'+setsHtml()+pierHtml();
}
/* ---- ремонтный док: абордаж пиратов снимает корабль с линии ---- */
function dockHtml(){
  var list=G.dockList(state);
  if(!list.length)return '';
  return '<div class="sect2">Ремонтный док · '+list.length+' корабл'+(list.length===1?'ь':'и')+' на ремонте</div>'+
   '<div class="dockgrid">'+list.map(function(b){
     var d=G.dockState(state,b.id,Date.now()); if(!d)return '';
     return '<div class="dockcard'+(d.can?' can':'')+'">'+
       '<div class="dship"><img class="t'+G.SHIPS.indexOf(b)+'" src="assets/img/'+b.img+'" alt=""></div>'+
       '<div class="dmain"><div class="n">'+b.n+'</div>'+
       '<div class="d2">Корабль абордирован: его бонусы и патруль не работают. '+
       'Док восстановит его сам через <b data-dockleft="'+d.until+'">'+fmtTime(d.left/1000)+'</b>.</div></div>'+
       '<div class="cmeta">'+resTag('credits',d.cost)+
       '<button class="btn y sm" data-repair="'+b.id+'" '+(d.can?'':'disabled')+'>РЕМОНТ</button>'+
       emgBtnHtml()+'</div></div>';
   }).join('')+'</div>';
}
function emgBtnHtml(){
  var e=G.emgState(state,Date.now());
  if(e.has<=0)return '';
  return '<button class="btn sm'+(e.can?' p':'')+'" data-emg '+(e.ready?'':'disabled data-emgcd="'+(state.emgAt||0)+'"')+'>'+
    (e.ready?'АВАРИЙНЫЙ РЕМОНТ':fmtTime(e.cd/1000))+'</button>';
}
function doEmergency(){
  var r=G.emergencyRepair(state,Date.now());
  if(!r.ok){ toast(r.msg,'err'); snd('fail'); return; }
  snd('dock'); buzz([20,20,40]);
  toast('🚑 Аварийная команда: '+r.b.n+' снова в строю','gold');
  updateFleet(); markAlerts();
  if(activeTab==='more'&&moreSec==='fleet')renderMore();
}
function openRepair(id){
  var d=G.dockState(state,id,Date.now()); if(!d)return;
  openModal('1f527','Ремонтный док: '+d.b.n,
    '<p>Корабль абордирован пиратами и стоит в доке. Пока он в ремонте — <b>его бонусы и патруль не работают</b>.</p>'+
    '<p>Док починит корабль сам через <b>'+fmtTime(d.left/1000)+'</b>, а можно ускорить за кредиты.</p>',
    [{l:'РЕМОНТ · '+G.fmt(d.cost)+' кредитов',k:'y',ic:'1f4b0',fn:function(){ repairUi(id); }},
     {l:'ПОДОЖДАТЬ',k:'',ic:'23f3'}]);
}
function repairUi(id){
  var r=G.repairShip(state,id,Date.now());
  if(!r.ok){ toast(r.msg,'err'); snd('fail'); return; }
  snd('dock'); buzz([20,20,40]);
  toast('🔧 '+r.b.n+' снова в строю','gold');
  updateFleet(); refreshResBar(); markAlerts();
  if(activeTab==='more')renderMore();
  if(!modal.classList.contains('hidden'))closeModal();
}
/* ---- бонус-сеты флота ---- */
function setsHtml(){
  var got=G.setCount(state);
  return '<div class="sect2">Бонус-сеты флота · собрано '+got+'/'+G.SHIP_SETS.length+'</div>'+
   '<div class="setgrid">'+G.SHIP_SETS.map(function(st,i){
     var pr=G.setParts(state,st.id), full=pr.have>=pr.need;
     return '<div class="setcard'+(full?' own':'')+'" style="--hue:'+(i*40)+'">'+
       '<div class="shead"><img src="'+IC(st.ic)+'" alt=""><b>'+st.n+'</b>'+(full?'<span class="tag g">собран</span>':'<span class="tag">'+pr.have+'/'+pr.need+'</span>')+'</div>'+
       '<div class="d">'+st.d+'</div>'+
       '<div class="bar '+(full?'g':'y')+'"><i style="width:'+(pr.have/pr.need*100).toFixed(0)+'%"></i></div>'+
       '<div class="sparts">'+pr.names.map(function(nm,j){
          var k=st.need[j], have=!!(state.ships&&state.ships[k]);
          return '<span class="'+(have?'on':'')+'">'+(have?'✔ ':'· ')+nm+'</span>';}).join('')+'</div>'+
     '</div>';
   }).join('')+'</div>';
}
/* ---- расширенный пирс: 4-я швартровка ---- */
function pierHtml(){
  var have=!!state.pier, can=!have&&(state.resources.antimatter||0)>=G.PIER_COST;
  return '<div class="card '+(have?'gold':'')+'"><div class="crow"><div class="cicon big"><img src="'+IC('1f6a4')+'" alt=""></div>'+
   '<div class="cmain"><div class="ctitle">Расширенный пирс</div>'+
   '<div class="csub">Четвёртая швартровка звёздного порта: корабли приходят чаще и в порт влезает больше заказов. Строится один раз и не сгорает при варп-прыжке.</div></div></div>'+
   '<div class="cmeta">'+(have?'<span class="tag g">пирс построен · швартвок 4</span>':resTag('antimatter',G.PIER_COST)+
     '<button class="btn '+(can?'y':'')+'" id="btn-pier" '+(can?'':'disabled')+'>ПОСТРОИТЬ ПИРС</button>')+'</div></div>';
}
function buyPierUi(){
  var r=G.buyPier(state);
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('warp'); buzz([30,30,60]);
  var cx=window.innerWidth/2, cy=window.innerHeight*0.4; confettiAt(cx,cy,26);
  toast('⚓ Пирс расширен: в порт встаёт 4 корабля','gold');
  G.logAdd(state,'⚓ Построен расширенный пирс порта','gold');
  renderMore(); markAlerts();
}
function autoShip(){
  var next=null,cc=Infinity;
  G.SHIPS.forEach(function(b){
    if(state.ships&&state.ships[b.id])return;
    if(!G.shipUnlocked(state,b.id))return;
    if(state.resources.credits<b.cost.credits*4)return;   /* верфь не должна тормозить развитие */
    if(b.cost.credits<cc){cc=b.cost.credits;next=b;}
  });
  if(next){ var r=G.buyShip(state,next.id); if(r.ok)G.logAdd(state,'⚙ Верфь: '+next.n+' спущен на воду','gold'); }
}
function logHtml(){
  var l=state.log||[];
  if(!l.length)return '';
  return '<div class="log">'+l.map(function(e){
    var d=new Date(e.t);
    return '<div class="li'+(e.k?' '+e.k:'')+'"><span class="t">'+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+'</span><span>'+e.x+'</span></div>';
  }).join('')+'</div>';
}
function buyShipUi(id){
  var r=G.buyShip(state,id);
  if(!r.ok){ toast(r.msg,'err'); return; }
  snd('warp'); buzz(40);
  var cx=window.innerWidth/2, cy=window.innerHeight*0.4;
  confettiAt(cx,cy,30); sparks(cx,cy,16);
  toast('🚢 '+r.b.n+' на стапеле: корпус спускают '+
    (r.install?('ещё '+fmtLeft(r.install.left)):'несколько минут')+' — бонусы включатся после спуска','gold');
  G.logAdd(state,'🚢 Верфь: '+r.b.n+' поставлен на стапель','gold');
  renderMore(); markAlerts();
}
function shipUpUi(id){
  var r=G.upShip(state,id);
  if(!r.ok){ toast(r.msg,'err'); return; }
  var b=G.shipById(id);
  snd('upgrade'); buzz(20);
  popAtCard('[data-ship="'+id+'"]','ур. '+r.lv,'gold');
  toast('⚙ '+b.n+' — уровень '+r.lv+', бонус усилен','ok');
  if(r.perk){ snd('victory'); confettiAt(window.innerWidth/2,window.innerHeight*0.45,26);
    toast('✦ Открыт перк флота: '+r.perk.t,'gold'); }
  renderMore(); refreshResBar(); markAlerts(); renderObjective(true); updateSoon();
}
function stat(k,v,c){return '<div class="stat"><div class="k">'+k+'</div><div class="v '+(c||'')+'">'+v+'</div></div>';}
function pickSkin(id){
  var sk=G.skinById(id);
  if(state.skins[id]){ if(G.setSkin(state,id)){ snd('upgrade'); applySkin(); toast('Облик: '+sk.n,'ok'); renderMore(); } return; }
  if((state.resources.antimatter||0)<sk.cost){ toast('Нужно '+sk.cost+' антиматерии','err'); return; }
  openModal('1f3a8','Открыть облик?',
    '<p><b>'+sk.n+'</b> — '+sk.d+'</p><p>Цена: <b>'+sk.cost+' антиматерии</b>. Облик остаётся навсегда, даже после варп-прыжка.</p>',
    [{l:'Отмена',k:''},{l:'ОТКРЫТЬ',k:'y',ic:'2728',fn:function(){
      var r=G.buySkin(state,id);
      if(r.ok){ G.setSkin(state,id); applySkin(); snd('warp'); toast('Облик открыт: '+sk.n,'gold'); renderMore(); refreshResBar(); markAlerts(); }
      else toast(r.msg,'err');
    }}]);
}
function applySkin(){
  var sk=G.skinById(state.skin), im=$('#stationImg');
  if(im)im.src='assets/img/'+sk.img;
}
function doPrestige(){
  var g=G.prestigeGain(state);
  if(g<1){toast('Нужно больше энергии','err');return;}
  var cool=G.prestigeCool(state,Date.now());
  if(!cool.ready){toast('Двигатель остывает: ещё '+Math.ceil(cool.left/60000)+' мин','err');return;}
  openModal('1f680','Варп-прыжок?',
   '<p>Модули, энергия, руда и кредиты обнулятся.</p>'+
   '<p>Ты получишь <b>'+G.fmt(g)+' антиматерии</b> — это <b>+'+Math.round(g*12)+'%</b> ко всему доходу навсегда.</p>'+
   '<p>Улучшения, награды, задания и облики останутся с тобой.</p>',
   [{l:'Отмена',k:''},{l:'ПРЫЖОК',k:'y',ic:'2728',fn:function(){
     var r=G.prestige(state);
     if(r.ok){ boostUntil=0; snd('warp'); buzz([60,40,120]); toast('Варп! +'+G.fmt(r.gain)+' антиматерии','gold'); renderAll(); shake();
       confettiAt(window.innerWidth/2, window.innerHeight*0.4, 40);
       try{window.WzShop&&WzShop.unlock('prestige1')}catch(e){}
       if(state.prestigeCount===2&&YSDK)YSDK.rateGame();
       if(state.prestigeCount%3===0&&YSDK&&YSDK.sdk)YSDK.interstitial(); }
     else toast(r.msg,'err');
   }}]);
}
try{window.WzShop&&G.buildings&&Object.keys(state.b||{}).length&&WzShop.unlock('first')}catch(e){}
function doReset(){
  openModal('26a0','Сбросить всё?','<p>Весь прогресс будет удалён без возможности возврата.</p>',
   [{l:'Отмена',k:''},{l:'СБРОСИТЬ',k:'y',fn:function(){
     try{localStorage.removeItem(LS);}catch(e){}
     state=G.defaultState(); boostUntil=0; lastLvl=0; applySkin(); renderAll(); saveNow(); toast('Прогресс сброшен','ok');
   }}]);
}
function showLeaderboard(){
  if(!YSDK||!YSDK.sdk){ toast('Таблицы рекордов доступны на Яндекс Играх','err'); return; }
  try{window.WzShop&&(WzShop.score(Math.floor(state.stats.totalEnergy)),state.stats.totalEnergy>=1000000&&WzShop.unlock('e1m'))}catch(e){}
  YSDK.submitScore(Math.floor(state.stats.totalEnergy), function(ok){
    if(!ok){ toast('Не удалось отправить счёт','err'); return; }
    YSDK.showLeaderboards(function(sh){ if(!sh)toast('Таблица рекордов недоступна','err'); });
  });
}

/* ---------- ads ---------- */
function watchAd(){
  var give=function(){
    var bonus=Math.max(300,Math.floor((state.resources.energy||0)*0.35+G.rates(state).energy*180));
    state.resources.energy+=bonus; state.stats.totalEnergy+=bonus;
    setBoost(30000); state.stats.adsWatched++;
    snd('boost'); toast('Бонус! +'+G.fmt(bonus)+' энергии и буст ×7','gold'); refreshResBar();
    confettiAt(window.innerWidth/2, window.innerHeight*0.35, 22);
  };
  var onPlatform = YSDK && YSDK.sdk && YSDK.isPlayable && YSDK.isPlayable();
  if(onPlatform){
    YSDK.showAds(function(shown){ if(shown){ give(); } else { toast('Реклама сейчас недоступна','err'); } });
  } else { give(); toast('Бонус выдан (локальный режим)','ok'); }
}
function setBoost(ms){ boostUntil=Date.now()+ms; state.boostUntil=boostUntil; }

function modalOpen(){ return !modal.classList.contains('hidden'); }
function refreshMoreTimers(){
  var now=Date.now(), ready=false;
  document.querySelectorAll('#moreList [data-cd]').forEach(function(e){
    var left=(+e.getAttribute('data-cd'))-now;
    if(left<=0){ ready=true; return; }
    e.textContent='⟳ '+fmtTime(left/1000);
  });
  document.querySelectorAll('#moreList [data-dockleft]').forEach(function(e){
    var left=(+e.getAttribute('data-dockleft'))-now;
    if(left<=0){ ready=true; return; }
    e.textContent=fmtTime(left/1000);
  });
  document.querySelectorAll('#moreList [data-slipl]').forEach(function(e){
    var left=(+e.getAttribute('data-slipl'))-now;
    if(left<=0){ ready=true; return; }
    e.textContent=fmtTime(left/1000);
    var it=G.shipInstallInfo(state,e.getAttribute('data-slipid'),now);
    var card=e.closest?e.closest('.dockcard'):null;
    if(it&&card){ var bi=card.querySelector('.bar>i'); if(bi)bi.style.width=Math.round(it.pct)+'%'; }
  });
  document.querySelectorAll('#moreList [data-emgcd]').forEach(function(e){
    var left=(+e.getAttribute('data-emgcd'))-now;
    if(left<=0){ ready=true; return; }
    e.textContent=fmtTime(left/1000);
  });
  document.querySelectorAll('#moreList [data-sqleft]').forEach(function(e){
    var left=(+e.getAttribute('data-sqleft'))-now;
    e.textContent=fmtLeft(left);
  });
  var run=G.resRunInfo(state,now);
  document.querySelectorAll('#moreList [data-resleft]').forEach(function(e){
    var left=(+e.getAttribute('data-resleft'))-now;
    if(left<=0){ ready=true; return; }
    e.textContent=expDurTxt(Math.ceil(left/60000));
  });
  document.querySelectorAll('#moreList [data-resprog]').forEach(function(e){
    if(!run)return;
    e.style.width=Math.max(1,Math.min(100,run.pct)).toFixed(1)+'%';
  });
  if(ready)renderMore();
}
/* ---------- авто-тап ---------- */
function autoTap(){
  var g=G.clickPower(state);
  state.resources.energy+=g; state.stats.totalEnergy+=g; state.stats.totalClicks++;
  state.stats.autoTaps=(state.stats.autoTaps||0)+1; autoTapN++;
  if(autoTapN%4===0){ var a=$('#clickArea'); if(a){ var q=a.getBoundingClientRect();
    pop(q.left+q.width/2+(Math.random()*60-30), q.top+q.height*0.30, '+'+G.fmt(g), 'soft'); } }
  if(state.stats.totalClicks>=3)coachDone(1);
}
/* ---------- всплывающая продукция над станцией ---------- */
function prodPop(){
  var area=$('#clickArea'); if(!area||document.hidden)return;
  var r=G.rates(state), best=null, bv=0;
  G.RES.forEach(function(k){ if(r[k]>bv){ bv=r[k]; best=k; } });
  if(!best||bv<=0)return;
  var q=area.getBoundingClientRect();
  pop(q.left+q.width/2+(Math.random()*70-35), q.top+q.height*0.66,
      '+'+G.fmt(bv*1.6)+' '+G.RES_META[best].name.toLowerCase(), 'soft');
}
/* ---------- солнечная вспышка ---------- */
function onFlare(fl){
  snd('flare'); buzz([40,30,40]); shake();
  toast('Солнечная вспышка! ×'+fl.mult+' ко всей продукции на '+Math.round(fl.ms/1000)+' с','gold');
  confettiAt(window.innerWidth/2,window.innerHeight*0.3,26);
}
function updateFlare(){
  var bb=$('#flareBar'); if(!bb)return;
  var f=G.flareInfo(state,Date.now()), st=$('#stage');
    if(!f.active){
    if(f.nextIn>0&&f.nextIn<20000){
      bb.classList.remove('hidden'); bb.classList.add('soon');
      if(st)st.classList.remove('flaring');
            var tinyF=(window.innerHeight<440||window.innerWidth<360);
      var sg='s'+(tinyF?'t':'f')+Math.ceil(f.nextIn/1000);
      if(sg!==flareSig){ flareSig=sg; bb.innerHTML='<img src="'+IC('1f31e')+'" alt=""><span id="flTxt"></span>'; }
      var t0=document.getElementById('flTxt');
      if(t0)t0.textContent=(tinyF?'ВСПЫШКА ЧЕРЕЗ ':'СОЛНЕЧНАЯ ВСПЫШКА ЧЕРЕЗ ')+Math.ceil(f.nextIn/1000)+'с';
      return;
    }
    if(!bb.classList.contains('hidden'))bb.classList.add('hidden');
    if(st)st.classList.remove('flaring'); flareSig=''; return; }
  if(st)st.classList.add('flaring');
    bb.classList.remove('hidden','soon');
    var tinyF=(window.innerHeight<440||window.innerWidth<360);
  var sig=((f.ext<2)?'e':'x')+(tinyF?'t':'f');
  if(sig!==flareSig){
    flareSig=sig;
    bb.innerHTML='<img src="'+IC('1f31e')+'" alt=""><span id="flTxt"></span>'+
      (sig==='e'?'<button class="fb" id="fbExt">×2 ВРЕМЕНИ</button>':'<span class="fd">продлено</span>');
    var b=document.getElementById('fbExt');
    if(b)b.onclick=function(e){ e.stopPropagation();
      var run=function(){ var r=G.extendFlare(state,25000);
        if(r.ok){ snd('boost'); toast('Вспышка продлена ещё на 25 секунд','gold'); } else toast(r.msg,'err'); };
      var onPlatform=YSDK&&YSDK.sdk&&YSDK.isPlayable&&YSDK.isPlayable();
      if(onPlatform){ YSDK.showAds(function(sh){ if(sh){ state.stats.adsWatched++; try{window.WzShop&&state.stats.adsWatched>=5&&WzShop.unlock('ads5')}catch(e){} run(); } else toast('Реклама недоступна','err'); }); }
      else run();
    };
  }
    var t=document.getElementById('flTxt');
  if(t)t.textContent=(tinyF?'ВСПЫШКА ×':'СОЛНЕЧНАЯ ВСПЫШКА ×')+f.mult+' · '+Math.ceil(f.left/1000)+'с';
}
/* ---------- сцена: орбита застройки, кольцо уровня, рой дронов ---------- */
var ringSig='';
function updateModRing(){
  var area=$('#clickArea'); if(!area)return;
  var list=[];
  G.MORDER.forEach(function(k){ if((state.modules[k]||0)>0) list.push([k,state.modules[k]]); });
  list.sort(function(a,b){return b[1]-a[1];});
  var want=Math.min(10,list.length);
  var sig=list.slice(0,want).map(function(x){return x[0]+':'+Math.min(60,x[1]);}).join(',');
  if(sig===ringSig)return; ringSig=sig;
  area.querySelectorAll('.modring').forEach(function(o){o.remove();});
  if(!want)return;
  var mr=el('div','modring'); area.appendChild(mr);
  var R=Math.round(area.clientWidth*0.455);
  list.slice(0,want).forEach(function(x,i){
    var m=G.MODULES[x[0]], ang=i*(360/want)-90, rad=ang*Math.PI/180;
    var d=el('div','modslot');
    d.style.transform='translate('+(Math.cos(rad)*R).toFixed(1)+'px,'+(Math.sin(rad)*R).toFixed(1)+'px)';
    var sz=Math.round(15+Math.min(11,Math.log(x[1]+1)*2.4));
    d.style.width=sz+'px'; d.style.height=sz+'px'; d.style.margin=(-sz/2)+'px 0 0 '+(-sz/2)+'px';
    var im=el('img'); im.src=IC(m.ic); im.alt=''; d.appendChild(im);
    mr.appendChild(d);
  });
}
function updateLvlRing(){
  var area=$('#clickArea'); if(!area)return;
  var l=G.stationLevel(state), cur=G.totalModules(state), base=(l-1)*6, span=Math.max(1,l*6-base);
  var pct=Math.max(0,Math.min(100,(cur-base)/span*100));
  area.style.setProperty('--lp',pct.toFixed(1)+'%');
}
var shieldOn=-1;
function updateShield(){
  var area=$('#clickArea'); if(!area)return;
  var lvl=state.modules.shield||0;
  var want=lvl>0?Math.min(3,1+Math.floor(lvl/6)):0;
  if(want===shieldOn)return; shieldOn=want;
  area.querySelectorAll('.shieldfx').forEach(function(o){o.remove();});
  if(!want)return;
  for(var i=0;i<want;i++){
    var d=el('div','shieldfx'+(i?' i'+i:''));
    d.style.animationDuration=(9+i*4)+'s';
    d.style.opacity=(0.5-i*0.12).toFixed(2);
    area.appendChild(d);
  }
}
/* вспышка абордажа в сцене: красный импульс там, где летает флот */
function boardFx(sh){
  var area=$('#clickArea'); if(!area)return;
  var q=area.getBoundingClientRect(), cx=q.left+q.width/2, cy=q.top+q.height*0.5;
  var fx=$('#fx'); if(!fx)return;
  var d=el('div','boardfx'); d.style.position='fixed'; d.style.left=cx+'px'; d.style.top=cy+'px';
  d.innerHTML='<span>⚠ АБОРДАЖ</span>'; fx.appendChild(d);
  setTimeout(function(){ try{d.remove();}catch(e){} },2200);
  sparks(cx,cy,22);
  pop(cx,cy-40,sh?sh.n:'','err big');
}
var fleetSig='';
function updateFleet(){
  var area=$('#clickArea'); if(!area)return;
  var list=G.SHIPS.filter(function(b){return !!(state.ships&&state.ships[b.id]);});
  var sig=list.map(function(b){return b.id+(G.shipDmg(state,b.id)?'!':'');}).join(',')+'|'+((state.upgrades&&state.upgrades['ford1'])?'c':'');
  if(sig===fleetSig)return; fleetSig=sig;
  area.querySelectorAll('.fleetsys').forEach(function(o){o.remove();});
  if(!list.length)return;
  var W=area.clientWidth||260, n=list.length;
  var sys=el('div','fleetsys'+((state.upgrades&&state.upgrades['ford1'])?' combat':'')); area.appendChild(sys);
  list.forEach(function(b,i){
    var dur=26+i*7;
    var o=el('div','fleet f'+i);
    o.style.animationDuration=dur+'s';
    o.style.animationDirection=(i%2?'reverse':'normal');
    o.style.animationDelay=(-(dur*i/n))+'s';
    o.style.setProperty('--r',(-(W*(0.40+i*0.028))).toFixed(1)+'px');
    var im=el('img'); im.src='assets/img/'+b.img; im.alt=b.n; im.title=b.n;
    o.appendChild(im);
    if(G.shipDmg(state,b.id)){
      o.classList.add('dmg'); o.title=b.n+' — в ремонтном доке, тапни чтобы починить';
      o.style.pointerEvents='auto';
      o.appendChild(el('span','dmgdot','⚠'));
      o.onclick=function(ev){ ev.stopPropagation(); ev.preventDefault(); openRepair(b.id); };
    }
    sys.appendChild(o);
  });
}
function updateSwarm(){
  var area=$('#clickArea'); if(!area)return;
  var rate=G.autoTapRate(state);
  var want=rate<=0?0:Math.min(6,1+Math.floor(rate));
  if(swarmN===want)return; swarmN=want;
  area.querySelectorAll('.swarm').forEach(function(o){o.remove();});
  var kinds=['satellite_A','satellite_B','satellite_C','satellite_D'];
  for(var i=0;i<want;i++){
    var o=el('div','swarm');
    o.style.animationDuration=(6.5+i*1.9)+'s';
    o.style.animationDirection=(i%2?'reverse':'normal');
    o.style.transform='rotate('+(i*(360/want))+'deg)';
    var im=el('img'); im.src='assets/img/space/'+kinds[i%4]+'.png'; im.alt='';
    im.style.width='15px'; im.style.height='15px'; im.style.marginLeft='-7.5px';
    o.appendChild(im); area.appendChild(o);
  }
}
/* ---------- пиратский налёт ---------- */
var raidTimer=null, bossTimer=null, huntTimer=null, raidActive=false;
function scheduleRaid(first){
  clearTimeout(raidTimer);
  var d=first?(95000+Math.random()*70000):(360000+Math.random()*300000);
  soonAt.raid=Date.now()+d;
  raidTimer=setTimeout(function(){ spawnRaid(); scheduleRaid(false); },d);
}
/* флагман прилетает реже, но он жирнее и кликабельнее */
var huntQueue=0;
function launchHunter(){
  if(huntQueue<=0)return false;
  if(raidActive||document.hidden||G.shipFit(state)<=0)return false;
  huntQueue--; spawnRaid({hunter:true});
  return true;
}
/* радар: за 30 секунд до прилёта охотника станция получает предупреждение */
var HUNT_WARN_MS=30000, radarAt=0, radarTimer=null;
function showRadar(){
  var area=$('#clickArea'); if(!area)return;
  radarAt=Date.now()+HUNT_WARN_MS;
  var r=area.querySelector('.radar');
  if(!r){ r=el('div','radar'); area.appendChild(r); }
  r.innerHTML='<div class="rsw"></div><div class="rtxt"><b>⚠ РАДАР</b>'+
    '<span>Охотник за кораблями на подлёте</span>'+
    '<span class="rcnt" data-radar>'+Math.round(HUNT_WARN_MS/1000)+' с</span></div>';
  r.classList.add('on');
  snd('shield'); buzz([30,40,30]);
  toast('📡 Радар: через 30 секунд прилетит охотник за кораблями. Держи флот в строю','err');
  clearInterval(radarTimer);
  radarTimer=setInterval(function(){
    var left=radarAt-Date.now();
    var e=document.querySelector('#clickArea [data-radar]');
    if(left<=0){
      clearInterval(radarTimer); radarTimer=null;
      var rr=document.querySelector('#clickArea .radar'); if(rr)rr.remove();
      if(!launchHunter()){ hideRadar(); scheduleHunter(); }
      else if(huntQueue>0) setTimeout(function(){ launchHunter(); },2500);
      return;
    }
    if(e)e.textContent=Math.ceil(left/1000)+' с';
  },250);
}
function hideRadar(){
  clearInterval(radarTimer); radarTimer=null; radarAt=0;
  var rr=document.querySelector('#clickArea .radar'); if(rr)rr.remove();
}
function radarHtml(){
  if(radarAt<=Date.now())return '';
  return '<div class="card urg-line"><div class="crow"><div class="cicon"><img src="'+IC('1f4e1')+'" alt=""></div>'+
    '<div class="cmain"><div class="ctitle">Радар: охотник на подлёте</div>'+
    '<div class="csub">Через <b>'+Math.ceil((radarAt-Date.now())/1000)+'</b> с он начнёт абордаж. '+
    'Тапай по нему в сцене — патруль флота тоже бьёт.</div></div></div></div>';
}
function scheduleHunter(){
  clearTimeout(huntTimer);
  var d=4*60000+Math.random()*6*60000;
  huntTimer=setTimeout(function(){
    if(raidActive||document.hidden||G.shipFit(state)<=0){ scheduleHunter(); return; }
    huntQueue=(G.shipOwned(state)>=4)?2:1;
    showRadar(); scheduleHunter();
  },d);
}
function scheduleBoss(first){
  clearTimeout(bossTimer);
  var d=first?(150000+Math.random()*90000):(560000+Math.random()*280000);
  soonAt.boss=Date.now()+d;
  bossTimer=setTimeout(function(){
    if(raidActive||document.hidden){ scheduleBoss(false); return; }
    spawnRaid({boss:true}); scheduleBoss(false);
  },d);
}
function spawnRaid(opts){
  var fx=$('#fx'); if(!fx||document.hidden||raidActive)return;
  var boss=!!(opts&&opts.boss), hunt=!!(opts&&opts.hunter);
  raidActive=true; raidAutoImmune=hunt;
  var max=boss?G.bossHp(state):hunt?G.hunterHp(state):G.raidHp(state), hp=max;
  var kinds=boss?['flagship']:hunt?['hunter']:['pirate_a','pirate_b','pirate_c'];
  var r=el('div','raider');
  var im=el('img'); im.src='assets/img/space/'+kinds[Math.floor(Math.random()*kinds.length)]+'.png'; im.alt='';
  r.appendChild(im);
  r.appendChild(el('b','rlbl'+(boss?' boss':(hunt?' hunt':'')),boss?'ФЛАГМАН · ТАПАЙ':(hunt?'ОХОТНИК · ТАПАЙ':'ПИРАТЫ · ТАПАЙ')));
  if(boss){ r.classList.add('boss'); toast('🏴 Пиратский флагман идёт! Тапай по кораблю, пока он не ушёл','err'); snd('boss'); }
  if(hunt){ r.classList.add('hunt'); toast('🎯 Охотник за кораблями! Если уйдёт — абордирует один из твоих кораблей','err'); snd('boss'); }
  var bar=el('div','rbar'); var fill=el('i'); bar.appendChild(fill); r.appendChild(bar);
  fx.appendChild(r);
  var w=window.innerWidth,h=window.innerHeight;
  var narrow=w<430;
  var fromLeft=(opts&&typeof opts.fromLeft==='boolean')?opts.fromLeft:Math.random()<0.5, size=boss?(narrow?152:178):(hunt?(narrow?134:158):(narrow?116:136));
  r.style.width=size+'px'; r.style.height=size+'px';
  var ar=(function(){var a=$('#clickArea'); if(!a)return null; var q=a.getBoundingClientRect();
    return (q.height>120)?{top:q.top,bottom:q.bottom}:null;})();
  var yTop=ar?Math.max(60,ar.top+8):Math.max(70,h*0.18);
  var yBot=ar?Math.max(yTop+40,ar.bottom-24):Math.max(yTop+60,h*0.46);
  var y0=yTop+Math.random()*Math.max(20,(yBot-yTop)*0.75);
  var x0=fromLeft?-size-20:w+20, x1=fromLeft?w+20:-size-20;
  if(!fromLeft)im.style.transform='scaleX(-1)';
  var dur=boss?Math.min(34000,Math.max(24000,max*1500)):(hunt?Math.min(34000,Math.max(22000,max*1400)):Math.min(30000,Math.max(18000,max*2000)));
  if(narrow)dur=Math.round(dur*1.15);
  var t0=Date.now(),dead=false;
  (function step(){
    if(dead)return;
    var k=(Date.now()-t0)/dur;
    if(k>=1){ escape(); return; }
    r.style.left=(x0+(x1-x0)*k)+'px';
    r.style.top=(y0+Math.sin(k*6.28)*(narrow?9:18))+'px';
    requestAnimationFrame(step);
  })();
  function end(){ raidActive=false; raidAutoImmune=false; raidHit=null; if(huntQueue>0){ setTimeout(launchHunter,2600); } }
  function escape(){
    dead=true; r.remove(); end();
    state.stats.raidsLost=(state.stats.raidsLost||0)+1;
    var loss=Math.floor(G.rates(state).credits*(boss?260:120));
    toast((boss?'Флагман ушёл с трофеями: −':'Пираты ушли с грузом: −')+G.fmt(loss)+' кредитов','err');
    state.resources.credits=Math.max(0,(state.resources.credits||0)-loss);
    snd('fail');
    if(hunt){ var loss2=Math.floor(G.rates(state).credits*(boss?260:150));
      state.resources.credits=Math.max(0,(state.resources.credits||0)-loss2); }
    if(Math.random()<((hunt?1:(boss?0.55:0.30))*G.dockSafe(state))){
      var sh=G.boardRandom(state);
      if(sh){
        toast('🏴 Абордаж! '+sh.n+' встал в ремонтный док — почини в «Ещё → Флот»','err');
        buzz([60,40,60]); snd('fail'); boardFx(sh); updateFleet(); markAlerts();
        if(activeTab==='more'&&moreSec==='fleet')renderMore();
      }
    }
  }
  function hit(n,manual){
    if(dead)return false;
    hp-=n;
    var q=r.getBoundingClientRect(), cx=q.left+q.width/2, cy=q.top+q.height/2;
    if(manual){ sparks(cx,cy,6); snd('shield'); } else sparks(cx,cy,2);
    r.classList.add('hit'); setTimeout(function(){r.classList.remove('hit');},110);
    fill.style.width=Math.max(0,hp/max*100)+'%';
    pop(cx,cy-10,'−1','');
    if(hp<=0){
      dead=true; r.remove();
      var rw=boss?G.bossReward(state):(hunt?G.hunterReward(state):G.raidReward(state));
      state.resources.credits+=rw.credits; state.stats.totalCredits+=rw.credits;
      state.resources.energy+=rw.energy;   state.stats.totalEnergy+=rw.energy;
      state.resources.minerals+=rw.minerals; state.stats.totalMinerals+=rw.minerals;
      state.stats.raids=(state.stats.raids||0)+1;
      if(boss){ state.bosses=(state.bosses||0)+1; state.resources.antimatter+=rw.antimatter||1;
        if(state.stats.bosses===undefined)state.stats.bosses=0; state.stats.bosses++; }
      var c=G.pushChest(state,(boss||hunt)?3:2);
      if(hunt){ state.stats.hunters=(state.stats.hunters||0)+1; state.resources.antimatter+=rw.antimatter||2;
        G.logAdd(state,'🎯 Охотник сбит: +'+(rw.antimatter||2)+' антиматерии','gold'); }
      var bart=((boss||hunt)&&Math.random()<(hunt?0.45:0.3))?G.rollArtifact(state,2):null;
      if(bart){ setTimeout(function(){ snd('warp'); openModal(bart.ic,'Находка: '+bart.n,
        '<p><b>'+RAR[bart.r]+' артефакт</b> '+artStars(bart)+'</p><p>'+bart.d+'</p>'+
        '<p style="color:#93a0cf">Трофей с флагмана — остаётся навсегда.</p>',[{l:'ЗАБРАТЬ В КОЛЛЕКЦИЮ',k:'y',ic:'1f4e6'}]);
        refreshResBar(); markAlerts(); },320); }
      snd(boss?'boss':'warp'); buzz([30,30,60]); confettiAt(cx,cy,(boss?52:(hunt?44:34))); sparks(cx,cy,(boss?30:(hunt?26:20)));
      toast((boss?'🏴 Флагман уничтожен! ':(hunt?'🎯 Охотник сбит! ':'Пираты разбиты! '))+G.fmt(rw.credits)+' кредитов, +'+G.fmt(rw.energy)+' энергии'+
        (boss?' и '+(rw.antimatter||1)+' антиматерии':'')+(c?' и сундук':''),'gold');
      pop(cx,cy,'+ '+G.fmt(rw.credits),'gold big');
      refreshResBar(); markAlerts(); updateChestBtn();
      end();
    }
    return true;
  }
  r.addEventListener('pointerdown',function(e){ e.preventDefault(); e.stopPropagation(); hit(1,true); });
  raidHit=function(n){ hit(n,false); };
}
/* ---------- comet ---------- */
function scheduleComet(){
  clearTimeout(cometTimer);
  var d=40000+Math.random()*60000;
  soonAt.comet=Date.now()+d;
  cometTimer=setTimeout(spawnComet,d);
}
function spawnComet(){
  if(document.hidden){ scheduleComet(); return; }
  var fx=$('#fx'); if(!fx){scheduleComet();return;}
  var c=el('div','comet','<img src="assets/img/icons/1f320.png" alt="">');
  var w=window.innerWidth,h=window.innerHeight;
  var fromLeft=Math.random()<0.5;
  c.style.top=(60+Math.random()*Math.max(100,h*0.4))+'px';
  c.style.left=(fromLeft?-110:w+10)+'px';
  fx.appendChild(c);
  var dur=9000, t0=Date.now(), dead=false;
  var x0=fromLeft?-110:w+10, x1=fromLeft?w+10:-110;
  (function step(){
    if(dead)return;
    var k=(Date.now()-t0)/dur;
    if(k>=1){ if(c.parentNode)c.parentNode.removeChild(c); scheduleComet(); return; }
    c.style.left=(x0+(x1-x0)*k)+'px';
    c.style.transform='rotate('+(fromLeft?20:-20)+'deg) scale('+(0.9+0.15*Math.sin(k*8))+')';
    requestAnimationFrame(step);
  })();
  var to=setTimeout(function(){ dead=true; if(c.parentNode)c.parentNode.removeChild(c); scheduleComet(); },dur);
  c.onclick=function(){
    dead=true; clearTimeout(to);
    var r=c.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
        state.stats.cometsCaught++;
    if(Math.random()<0.26*G.chestMult(state)){ var cc=G.pushChest(state,Math.random()<0.3?2:1); if(cc)toast('Комета притащила сундук находок!','gold'); }
    if(Math.random()<0.45){ setBoost(30000); snd('boost'); pop(cx,cy,'🔥 БУСТ ×7 / 30с','gold big'); sparks(cx,cy,18);
      toast('Комета! Буст ×7 на 30 секунд','gold'); }
    else {
      var mm=G.cometMult(state);
      var bE=Math.max(200,Math.floor(G.rates(state).energy*90*mm+state.stats.totalEnergy*0.01*mm));
      var bC=Math.max(100,Math.floor(G.rates(state).credits*70*mm+100*mm));
      state.resources.energy+=bE; state.stats.totalEnergy+=bE;
      state.resources.credits+=bC; state.stats.totalCredits+=bC;
      snd('boost'); pop(cx,cy,'+'+G.fmt(bE)+' энергии','gold big'); sparks(cx,cy,18);
      toast('Комета поймана! +'+G.fmt(bE)+' энергии · +'+G.fmt(bC)+' кредитов','gold');
    }
    if(c.parentNode)c.parentNode.removeChild(c);
    refreshResBar(); markAlerts(); scheduleComet();
  };
  scheduleComet();
}

/* ---------- click ---------- */
function doClick(x,y){
  var g=G.clickPower(state);
  state.resources.energy+=g; state.stats.totalEnergy+=g; state.stats.totalClicks++;
  var now=Date.now();
  streak=(now-lastClick<1100)?streak+1:1; lastClick=now;
  pop(x,y,'+'+G.fmt(g),'');
  sparks(x,y,5);
  snd('click');
  if(streak>0&&streak%25===0){
    var b=Math.max(50,Math.floor(g*Math.min(12,streak/20)));
    state.resources.energy+=b; state.stats.totalEnergy+=b;
    pop(x,y-26,'🔥 СЕРИЯ ×'+streak+'  +'+G.fmt(b),'gold big'); shake(); buzz(35);
  }
  var st=$('#streak');
  if(st)st.textContent=streak>=10?('🔥 серия ×'+streak):'';
  clearTimeout(streakTO); streakTO=setTimeout(function(){ streak=0; if(st)st.textContent=''; },1600);
  var cp=$('#clickPower'); if(cp)cp.textContent=G.fmt(g);
  var hv=$('#btn-harvest'); if(hv)hv.textContent='ГЕНЕРИРОВАТЬ +'+G.fmt(g);
  refreshResBar();
  if(state.stats.totalClicks>=3)coachDone(1);
}
function buzz(ms){ if(!settings.vib)return; try{ if(navigator.vibrate)navigator.vibrate(ms); }catch(e){} }
function shake(){
  var s=$('#stage'); if(!s||!s.animate)return;
  s.animate([{transform:'translate(0,0)'},{transform:'translate(-5px,3px)'},{transform:'translate(4px,-3px)'},{transform:'translate(0,0)'}],{duration:180,easing:'ease-out'});
}

/* ---------- offline ---------- */
var offDoubled=false;
function doubleOffline(off){
  if(offDoubled)return; offDoubled=true;
  var t=[],map={energy:'totalEnergy',minerals:'totalMinerals',credits:'totalCredits'};
  Object.keys(off.earned).forEach(function(k){
    var v=off.earned[k]; if(!(v>0))return;
    state.resources[k]=(state.resources[k]||0)+v;
    if(map[k])state.stats[map[k]]+=v;
    t.push('+'+G.fmt(v)+' '+G.RES_META[k].name);
  });
  if(!t.length){ toast('Удваивать нечего','err'); return; }
  snd('boost'); confettiAt(window.innerWidth/2,window.innerHeight*0.4,26);
  toast('Доход удвоен: '+t.join(' · '),'gold');
  refreshResBar();
}
/* ближайшая цель: лесенка, отсортированная по сроку (рукопожатие «вот что даёт возврат») */
function nextGoalNow(){
  var L=[];
  try{ L=(G.ladder(state,Date.now())||[]).filter(function(x){return x&&isFinite(x.eta)&&x.eta>=0;}); }catch(e){ L=[]; }
  L.sort(function(a,b){return a.eta-b.eta;});
  return L[0]||null;
}
function goalJump(g){
  if(!g)return;
  if(g.sec){ switchTab('more'); openSec(g.sec); }
  else if(g.tab==='scene'){ var a=$('#clickArea'); if(a){a.classList.add('pulse');setTimeout(function(){a.classList.remove('pulse');},900);} }
  else switchTab(g.tab);
}
function showOffline(off){
  offDoubled=false;
  var nx=nextGoalNow();
  var rows=Object.keys(off.earned).filter(function(k){return off.earned[k]>0;})
    .map(function(k){return '<div class="row"><span>'+G.RES_META[k].name+'</span><b>+'+G.fmt(off.earned[k])+'</b></div>';}).join('');
  if(!rows)rows='<div class="row"><span>Станция отдыхала</span><b>мало времени</b></div>';
  openModal('1f6f8','Станция работала без тебя',
      '<p>Пока тебя не было <b>'+fmtTime(off.seconds)+'</b>, экипаж не останавливался:</p>'+rows+
   (off.chests?'<p style="margin-top:8px;color:#ffd76a">Экипаж нашёл сундуков: <b>'+off.chests+'</b> — открывай во вкладке «Экспедиции».</p>':'')+
   (nx?('<p style="margin-top:10px">На что потратить: <b>'+nx.n+'</b> — '+nx.req+
        (isFinite(nx.eta)?' <span style="color:#93a0cf">(ждать '+G.etaText(nx.eta)+')</span>':'')+'</p>'):'')+
   ((off.effSec&&off.effSec<off.seconds)?('<p style="margin-top:8px;color:#93a0cf">Первые '+
        Math.round(G.MAX_OFFLINE_H)+' ч станция работала на полную, дальше — по 40%: потолок можно '+
        'расширить исследованиями, но ночной доход не должен обгонять дневной.</p>'):'')+
   '<p style="margin-top:10px;color:#93a0cf">«Автопилот дока» и «Спящий режим ядра» увеличивают оффлайн-доход.</p>',
   [{l:'ЗАБРАТЬ',k:''},{l:'К ЦЕЛИ',k:'p',ic:'1f3af',fn:function(){ goalJump(nx); }},
    {l:'×2 ЗА РЕКЛАМУ',k:'y',ic:'1f4b5',fn:function(){
      var onPlatform=YSDK&&YSDK.sdk&&YSDK.isPlayable&&YSDK.isPlayable();
      if(onPlatform){ YSDK.showAds(function(sh){ if(sh){state.stats.adsWatched++;try{window.WzShop&&state.stats.adsWatched>=5&&WzShop.unlock('ads5')}catch(e){}doubleOffline(off);} else toast('Реклама недоступна','err'); }); }
      else doubleOffline(off);
      return false;
   }}]);
}

/* ---------- help ---------- */
/* справка сталапоэтапной: показываем только то, что уже открыто, и честно говорим,
   что будет дальше. Стена из 18 пунктов пугала больше, чем учила. */
var HELP=[
 {g:null,            t:'Тапай по станции', d:'Каждый тап даёт энергию. Энергия — валюта стройки.'},
 {g:'tab:modules',   t:'Строй модули', d:'«Модули» → модуль работает сам, даже когда игра закрыта (до 8 часов).'},
 {g:'market',        t:'Продавай руду', d:'«Экспедиции» → «Биржа руды». Курс дышит: на пике выходит заметно дороже.'},
 {g:'port',          t:'Сдай груз в порт', d:'«Экспедиции» → Звёздный порт: у корабля есть заказ и срок. Просрочка сгорает.'},
 {g:'tab:explore',   t:'Отправляй экспедиции', d:'Они идут минутами и часами и возвращаются сами, даже с закрытой игрой.'},
 {g:'lab',           t:'Корми лабораторию', d:'«Ещё» → «Наука»: узлы за антиматерию, каждый усиливает станцию навсегда.'},
 {g:'prestige',      t:'Варп-прыжок', d:'Сброс модулей и резонанса ради антиматерии: +12% ко всему доходу за каждую ✦. Двигатель остывает 15 минут, 30% корпусов уцелело.'},
 {g:'yard',          t:'Построй свой флот', d:'«Ещё» → «Флот»: корабли остаются навсегда, прикрывают станцию в рейдах и качаются антиматерией.'},
 {g:'chest',         t:'Открывай сундки', d:'Падают из экспедиций и с комет: ресурсы, буст и шанс артефакта.'},
 {g:'wheel',         t:'Крути колесо', d:'«Ещё» → «Колесо»: бесплатный спин раз в 3 часа.'},
 {g:'raid',          t:'Отбивай налёты', d:'Через экран летит пират: тапай по нему, пока не ушёл.'},
 {g:'victory',       t:'Финал станции', d:'Все условия в разделе «Финал» — и станция уходит в Вечный режим: +25% ко всему доходу.'}
];
function showHelp(){
  var open=HELP.filter(function(h){ return !h.g||G.gateOpen(state,h.g); });
  var h='<p><b>Цепь капитана</b> 🎖 — единственная цель, которая ведёт вперёд. Сделал шаг → отчёт ' +
        'обрабатывается своё время → награда → отпирается одна новая вещь. Так 25 шагов, дальше эпохи. ' +
        'Всё остальное — способ закрыть текущий шаг.</p>'+
        '<div class="sect">Что уже работает</div>'+
        open.map(function(x){ return '<p><b>·</b> '+x.t+' — '+x.d+'</p>'; }).join('')+
        '<div class="sect">Чему учить дальше</div>'+
        '<p>На каждом шаге цепи капитан сам объясняет, что делать и где это лежит — и записывает ' +
        'историю станции в «Журнал капитана» («Ещё» → «Прогресс»).</p>';
  var soon=[],seen={};
  for(var i=(state.chain||0);i<(state.chain||0)+6;i++){
    var c=G.chainCfg(state,i); if(!c||!c.nx)continue;
    if(!seen[c.nx]){ seen[c.nx]=1; soon.push('шаг '+(i+1)+' · '+c.nx); }
    if(soon.length>=4)break;
  }
  if(soon.length)h+='<div class="sect">Скоро откроется</div><p>'+soon.join('<br>')+'</p>';
  h+='<p>Прогресс сохраняется автоматически и в облаке.</p>';
  openModal('2753','Как играть',h,[{l:'НАЧАТЬ',k:'y',ic:'1f680'}]);
}

/* v34: первый шаг объясняет «урок капитана» — пузырь «тапай» убран, чтобы не дублировать.
   Пузыри дальше показываются только когда их вкладка уже отперта (её просто нет в DOM). */
var COACH=[
 {n:2, target:'#tabs .tab[data-tab="modules"]', pos:'up', txt:'Построй первый модуль', sub:'«Солнечный парус» стоит 15 энергии и работает сам.'},
 {n:3, target:'#tabs .tab[data-tab="explore"]', pos:'up', txt:'Продай руду на бирже', sub:'Руда → кредиты. Кредиты открывают новые модули.'},
 {n:4, target:'#tabs .tab[data-tab="more"]', pos:'up', txt:'Наука, колесо и облики', sub:'Во вкладке «Ещё» — Лаборатория за антиматерию, бесплатный спин колеса, облики и варп-прыжок. Разделы переключаются кнопками сверху.'},
 {n:5, target:'#tabs .tab[data-tab="explore"]', pos:'up', txt:'Звёздный порт', sub:'Кораблям на стоянке нужен груз, у сделки есть срок. Красные срочные чартеры платят ×4,5.'},
 {n:6, target:'#tabs .tab[data-tab="more"]', pos:'up', txt:'Верфь и флот', sub:'Корабли остаются навсегда, летают вокруг станции и прикрывают её в рейдах. Собери бонус-сет — получишь двойной бонус.'},
 {n:7, target:'#tabs .tab[data-tab="more"]', pos:'up', txt:'Ремонтный док', sub:'Пираты могут абордировать корабль — его бонусы пропадают. Почини за кредиты в разделе «Флот» или подожди, пока док всё сделает сам.'},
 {n:8, target:'#tabs .tab[data-tab="more"]', pos:'up', txt:'Качай уровень корабля', sub:'В разделе «Флот» у каждого корабля есть уровень: антиматерия усиливает его бонус на 15% за уровень, а на 3/6/10/15 уровнях корабль даёт флоту вечный перк.'}
];
var COACH_TRIG={5:function(){ return (state.port&&state.port.list&&state.port.list.length>0); },
                6:function(){ return G.shipOwned(state)>0; },
                7:function(){ return G.dockCount(state)>0; },
                8:function(){ var su=bestShipUp(state); return G.shipOwned(state)>0&&!!su&&(state.resources.antimatter||0)>=su.cost*2; }};
function coachStep(){
  var box=$('#coach'); if(!box)return;
  box.innerHTML='';
  var step=null;
  for(var i=0;i<COACH.length;i++){
    if(state.seenTut<COACH[i].n){
      var tr=COACH_TRIG[COACH[i].n];
      if(tr&&!tr())break;
      step=COACH[i]; break;
    }
  }
  if(!step)return;
  var t=document.querySelector(step.target); if(!t)return;
  var r=t.getBoundingClientRect();
  if(r.width<=0||r.top<0||r.bottom>window.innerHeight)return;
  var c=el('div','coach '+(step.pos==='down'?'down':'up'));
  c.innerHTML=step.txt+'<small>'+step.sub+'</small><span class="arrow"></span><button class="x">✕</button>';
  box.appendChild(c);
  var cw=c.offsetWidth||230, chh=c.offsetHeight||70;
  var left=Math.max(10,Math.min(window.innerWidth-cw-10, r.left+r.width/2-cw/2));
  var hb=$('#btn-harvest'), hr=hb?hb.getBoundingClientRect():null;
  var tb=$('#topbar'), minTop=tb?(tb.getBoundingClientRect().bottom+6):8;
  function hits(t){ return hr && !(t+chh<hr.top-6 || t>hr.bottom+6); }
  /* пузырь не должен наезжать на нижнюю навигацию: иначе он закрывает ту вкладку, о которой говорит */
  var tb2=$('#tabs'), tr2=tb2?tb2.getBoundingClientRect():null;
  function hitsTabs(t){ return tr2 && !(t+chh<tr2.top-6 || t>tr2.bottom+6); }
  var cands=[];
  if(step.pos==='down'){ cands.push(r.bottom+16, r.top-chh-16); } else { cands.push(r.top-chh-16, r.bottom+16); }
  if(hr) cands.push(hr.bottom+12, hr.top-chh-12);
  var top=null;
  for(var ci=0;ci<cands.length;ci++){
    var t=Math.max(minTop,cands[ci]);
    if(t+chh>window.innerHeight-8||t<minTop)continue;
    if(hits(t)||hitsTabs(t))continue;
    top=t;break;
  }
  if(top===null){ top=Math.max(minTop,Math.min(window.innerHeight-chh-8,r.bottom+16));
    if(hitsTabs(top))top=Math.max(minTop,tr2.top-chh-14); }
  c.className='coach '+(top>r.bottom?'down':'up');
  c.innerHTML=step.txt+'<small>'+step.sub+'</small><span class="arrow"></span><button class="x">✕</button>';
  c.querySelector('.x').onclick=function(){ state.seenTut=99; coachStep(); };
  c.style.left=left+'px'; c.style.top=top+'px';
  c.querySelector('.x').onclick=function(){ state.seenTut=99; coachStep(); };
}
function coachDone(n){
  if(state.seenTut<n){ state.seenTut=n; setTimeout(coachStep,260); }
}

/* ---------- «антискука»: игрок молчит — подсказать ближайшее дело ---------- */
function markAct(){ lastActAt=Date.now(); if(Date.now()<nudgeUntil)hideNudge(); }
function hlEl(sel,ms){
  var e=null; try{ e=document.querySelector(sel); }catch(err){ e=null; }
  if(!e)return;
  e.classList.add('hl');
  if(hlTimer)clearTimeout(hlTimer);
  hlTimer=setTimeout(function(){ try{ if(e&&e.classList)e.classList.remove('hl'); }catch(err){} },ms||8000);
}
function chainGo(cfg,cb){
  var t=(cfg&&cfg.tab)||'prog';
  if(t==='modules'||t==='upgrades'||t==='explore'||t==='quests'||t==='achieve')switchTab(t);
  else{switchTab('more');openSec(t);}
  if(cb)setTimeout(cb,240);
}
/* подсказки онбординга: первые 90 секунд — самые частые и прямые */
function firstRunNudge(now){
  var ps=state.stats.playSeconds||0;
  if(ps>=90)return null;
  var c=G.chainState(state);
  if(ps<12)return {ic:'1f44a',h:'Тапай по станции',t:'Энергия — главный ресурс первых минут. Копи и строй модули',b:'ТАПАТЬ',
    go:function(){ var a=$('#clickArea'); if(a){a.classList.add('pulse');setTimeout(function(){a.classList.remove('pulse');},1200);} switchTab('modules'); }};
  if(c.ready)return {ic:c.cfg.ic,h:'Шаг «'+c.cfg.n+'» выполнен',t:'Забери награду: '+G.chainRwTxt(c.cfg.rw)+(c.cfg.nx?('. Откроется: '+c.cfg.nx):''),b:'ЗАБРАТЬ',
    go:function(){ chainGo(c.cfg,chainClaimUi); }};
  return {ic:c.cfg.ic,h:'Цель: '+c.cfg.n,t:c.cfg.d+' — '+G.fmt(c.cur)+'/'+G.fmt(c.need),b:'ОТКРЫТЬ',
    go:function(){ chainGo(c.cfg); }};
}
function hideNudge(){ var b=$('#nudge'); if(!b)return; b.classList.add('hidden'); b.innerHTML=''; nudgeUntil=0; }
function nudgeData(){
  var now=Date.now(), st=state;
  if((st.chests||[]).length)return {ic:'1f4e6',h:'Сундук ждёт вскрытия',t:'Внутри ресурсы, буст и шанс артефакта',b:'ОТКРЫТЬ',
    go:function(){ switchTab('explore'); setTimeout(function(){ openChestUi(0); },240); }};
  var cst=G.chainState(st);
  if(cst.ready)return {ic:cst.cfg.ic,h:'Шаг цепи выполнен',t:cst.cfg.n+' — забери награду: '+G.chainRwTxt(cst.cfg.rw),b:'ЗАБРАТЬ',
    go:function(){ chainGo(cst.cfg,chainClaimUi); }};
  if(G.dailyState(st,now).ready)return {ic:'1f4c5',h:'Награда дня ждёт',t:'Подарок экипажу, серия дней не сгорела',b:'ЗАБРАТЬ',
    go:function(){ goMore('prog'); setTimeout(function(){ claimDailyUi(false); },240); }};
  var su=bestShipUp(st);
  if(su&&(st.resources.antimatter||0)>=su.cost)return {ic:'1f6a2',h:'Флот ждёт апгрейда',t:su.b.n+' ур. '+su.lv+' → '+(su.lv+1)+': '+su.txt,b:'УЛУЧШИТЬ',
    go:function(){ goMore('fleet'); setTimeout(function(){ shipUpUi(su.id); },240); }};
  var av=G.researchList(st).filter(function(x){return x.can;});
  if(av.length&&!G.resRunInfo(st,now))return {ic:av[0].r.ic,h:'Лаборатория простаивает',t:'Запусти узел «'+av[0].r.n+'» — '+av[0].r.d,b:'ЗАПУСТИТЬ',
    go:function(){ goMore('sci'); setTimeout(function(){ buyResearchUi(av[0].r.id); },240); }};
  var ps=G.portState(st,now);
  var aff=(ps.list||[]).filter(function(c){return G.portCan(st,c);});
  if(aff.length)return {ic:'1f6a2',h:'Груз готов на складе',t:'Отдай груз кораблю у стенки — награда: '+rwTxt(G.portReward(st,aff[0])),b:'В ПОРТ',
    go:function(){ switchTab('explore'); }};
  var lad=G.ladder(st,now);
  if(lad.length){ var l=lad[0];
    return {ic:l.ic,h:'Ближайшая цель: '+l.n,t:l.req+(l.rw?(' · даст: '+l.rw):'')+(isFinite(l.eta)?(' · '+G.etaText(l.eta)):''),b:'ПОКАЗАТЬ',
      go:function(){ if(l.tab==='more')goMore(l.sec||'prog'); else switchTab(l.tab); }};
  }
  if((st.stats.playSeconds||0)<420)return {ic:'1f44a',h:'Станция ждёт твоей руки',t:'Тапай по станции: энергия — главный ресурс первых минут',b:'ТАПАТЬ',
    go:function(){ var a=$('#clickArea'); if(a){ a.classList.add('pulse'); setTimeout(function(){a.classList.remove('pulse');},900); } }};
  return null;
}
function checkNudge(){
  var box=$('#nudge'); if(!box)return;
  var now=Date.now();
  if(!box.classList.contains('hidden')){ if(now>=nudgeUntil)hideNudge(); return; }
  if(modalOpen())return;
  var cb=$('#coach'); if(cb&&cb.firstElementChild)return; /* обучающий пузырь важнее */
  var idle=(now-lastActAt)/1000, ps=state.stats.playSeconds||0;
  var idleMin=ps<90?8:(ps<240?22:70);
  if(idle<idleMin)return;
  var d=firstRunNudge(now)||nudgeData(); if(!d){ return; }
  box.className='nudge';
  box.style.visibility='hidden';
  box.innerHTML='<img src="'+IC(d.ic)+'" alt=""><div class="ntxt"><b>'+d.h+'</b><span>'+d.t+'</span></div>'+
    '<button class="btn y sm">'+d.b+'</button><button class="nx">✕</button>';
  box.querySelector('.btn').onclick=function(e){ e.stopPropagation(); markAct(); hideNudge(); d.go(); };
  box.querySelector('.nx').onclick=function(e){ e.stopPropagation(); lastActAt=Date.now(); nudgeUntil=now+90000; hideNudge(); };
  var hb=$('#btn-harvest');
  if(hb){ var r=hb.getBoundingClientRect(), w=Math.min(340,Math.max(280,r.width+74));
    box.style.width=w+'px';
    var sb=$('#soon'), minTop=8;
    if(sb){ var sr=sb.getBoundingClientRect(); if(sr.height>0)minTop=sr.bottom+8; }
    box.style.left=Math.max(8,Math.min(window.innerWidth-w-8,r.left+r.width/2-w/2))+'px';
    box.style.top=Math.max(minTop,r.top-box.offsetHeight-10)+'px'; }
  box.style.visibility='visible';
  nudgeUntil=now+14000; nudgeBtnAt=now;
}
/* ---------- confetti ---------- */
function confettiAt(cx,cy,n){
  var fx=$('#fx'); if(!fx)return;
  var cols=['#39e6ff','#8b5cf6','#ff5bd0','#ffd76a','#3ee6a0'];
  for(var i=0;i<(n||40);i++){
    var d=el('div','conf');
    d.style.left=cx+'px'; d.style.top=cy+'px';
    d.style.background=cols[i%cols.length];
    d.style.setProperty('--cx',((Math.random()-0.5)*420)+'px');
    d.style.setProperty('--cy',(120+Math.random()*320)+'px');
    d.style.setProperty('--cr',((Math.random()-0.5)*900)+'deg');
    d.style.animationDelay=(Math.random()*0.25)+'s';
    fx.appendChild(d); (function(e){setTimeout(function(){e.remove();},2100);})(d);
  }
}

/* ---------- save ---------- */
function saveSettings(){ try{ localStorage.setItem(LSSET,JSON.stringify(settings)); }catch(e){} }
function loadSettings(){
  try{ var r=localStorage.getItem(LSSET); if(r){ var o=JSON.parse(r); if(o&&typeof o==='object'){ settings.sound=o.sound!==false; settings.music=o.music!==false; settings.vib=o.vib!==false; } } }catch(e){}
}
function saveNow(){
  try{ localStorage.setItem(LS,G.save(state)); }catch(e){}
}
function saveCloud(force){
  if(!YSDK||!YSDK.sdk)return;
  if(!force && !YSDK.isPlayable())return;
  try{ YSDK.saveGame(G.save(state)); }catch(e){}
}
function applyState(s,src){
  if(!s)return false;
  state=s; boostUntil=state.boostUntil||0; lastLvl=G.stationLevel(state);
  applySkin(); renderAll();
  if(src)toast('Прогресс восстановлен из '+src,'ok');
  return true;
}
function loadLocal(){
  var raw=null;
  try{ raw=localStorage.getItem(LS); }catch(e){}
  if(raw){ var s=G.load(raw); if(s){ applyState(s,null); return s; } }
  return null;
}
function tryCloud(){
  if(!YSDK||!YSDK.loadGame){ cloudChecked=true; return; }
  try{
    YSDK.loadGame(function(raw){
      cloudChecked=true;
      if(!raw)return;
      var cloud=G.load(raw); if(!cloud)return;
      var local=null; try{ local=G.load(localStorage.getItem(LS)); }catch(e){}
      var ct=+cloud.stats.lastSeen||0, lt=local?(+local.stats.lastSeen||0):0;
      var ce=+cloud.stats.totalEnergy||0, le=local?(+local.stats.totalEnergy||0):0;
      if(!local || ct>=lt-60000 || ce>le*1.05) applyState(cloud,'облака Яндекса');
    });
  }catch(e){ cloudChecked=true; }
}

/* ---------- loop ---------- */
var etaAcc=0;
function refreshEtas(){
  var els=document.querySelectorAll('[data-etacost]');
  if(!els.length)return;
  var r=G.rates(state);
  Array.prototype.forEach.call(els,function(n){
    var c; try{ c=JSON.parse(n.getAttribute('data-etacost').replace(/&quot;/g,'"')); }catch(e){ return; }
    var t=0;
    for(var k in c){ var v=G.timeToR(state.resources[k]||0,r[k]||0,c[k]); if(v>t)t=v; }
    n.textContent='⏳ '+G.etaText(t);
    if(t>0)n.classList.add('wait'); else n.classList.remove('wait');
  });
  var lad=document.querySelectorAll('[data-etaat]');
  var nowT=Date.now();
  Array.prototype.forEach.call(lad,function(n){
    var left=(+n.getAttribute('data-etaat'))-nowT;
    n.textContent=G.etaText(Math.max(0,left)/1000);
    if(left>0)n.classList.add('wait'); else n.classList.remove('wait');
  });
}
function loop(){
  var now=performance.now();
  var dt=Math.min(3,(now-lastFrame)/1000); lastFrame=now;
  try{
    G.tick(state,dt);
    var back=G.expTick(state,Date.now());
    if(back.length)onExpBack(back);
    var resDone=G.resTick(state,Date.now());
    if(resDone)onResDone(resDone);
    var half=G.chainHalfTick(state,Date.now());
    if(half){ snd('coin'); buzz([12,12,12]);
      toast('\u{1f4e9} Предотчёт по шагу «'+half.cfg.n+'»: '+G.chainRwTxt(half.rw)+' · впереди ещё '+
        (half.need-half.at),'gold');
      if(activeTab==='more')renderMore(); markAlerts(); }
    var slipDone=G.shipInstallTick(state,Date.now());
    slipDone.forEach(function(x){ snd('victory'); buzz([20,20,50]);
      toast('\u2693 Спущен: '+x.name+' — вышел на орбиту, бонусы флота работают','gold');
      confettiAt(window.innerWidth/2,window.innerHeight*0.34,24);
      if(activeTab==='more'&&moreSec==='fleet')renderMore();
      markAlerts(); updateSoon(); });
    var inst=G.installTick(state,Date.now());
    inst.forEach(function(x){ snd('victory'); buzz([20,20,50]);
      toast('\u2728 Смонтажено: '+x.name+' — корпус вышел на полную мощность','gold');
      G.logAdd(state,'\u2728 Монтаж завершён: '+x.name,'gold');
      confettiAt(window.innerWidth/2,window.innerHeight*0.34,26);
      if(activeTab==='modules')renderModules();
      if(activeTab==='more')renderMore(); });
        var fl=G.maybeFlare(state,Date.now()); if(fl)onFlare(fl);
    var vs=G.victoryState(state);
    if(vs.done&&!state.victory&&!root.__vicToast){ root.__vicToast=1;
      toast('🌟 ФИНАЛ ГОТОВ: все условия выполнены — заверши станцию во вкладке «Ещё»','gold'); snd('victory'); }
    if(!vs.done)root.__vicToast=0;
    var atr=G.autoTapRate(state);
    if(atr>0){ tapAcc+=dt; var iv=1/atr, guard=0; while(tapAcc>=iv&&guard<10){ tapAcc-=iv; guard++; autoTap(); } } else tapAcc=0;
    prodAcc+=dt; if(prodAcc>1.6){ prodAcc=0; prodPop(); }
    moreAcc+=dt; if(moreAcc>1){ moreAcc=0; if(activeTab==='more'&&!modalOpen())refreshMoreTimers(); }
    var a=G.checkAch(state);
    a.forEach(function(x){ snd('upgrade'); toast('🏆 '+x.n,'gold'); G.logAdd(state,'🏆 Награда: '+x.n,'gold'); });
    var q=G.checkQuests(state);
    G.checkDq(state).forEach(function(x){ var c=G.dqCfg(x.id); if(c)toast('📌 Задание дня готово: '+c.n,'gold'); });
    q.forEach(function(x){ toast('📋 Задание готово: '+x.n,'gold'); });
    if(a.length||q.length)markAlerts();
    refreshResBar(); updateStage(); renderObjective(); gateWatch();
        if(activeTab==='explore')refreshExploreCd();
    updateFlare(); updateChestBtn();
    if(state.upgrades['auto1']){ autoAcc+=dt; if(autoAcc>4){ autoAcc=0; autoBuild(); autoShip(); } }
    if(state.upgrades['auto2']){ sellAcc+=dt; if(sellAcc>5){ sellAcc=0; autoSell(); } }
    if(state.upgrades['auto3']){ expAcc+=dt; if(expAcc>7){ expAcc=0; autoExplore(); } }
    if(state.upgrades['autores']){ resAcc+=dt; if(resAcc>6){ resAcc=0; autoResearch(); } }
    if(state.upgrades['autochest']){ chAcc+=dt; if(chAcc>4){ chAcc=0; autoChest(); } }
    if(state.upgrades['autoroute']){ rtAcc+=dt; if(rtAcc>3){ rtAcc=0; var rs=G.routeState(state); if(rs.claim){ routeClaimUi(); } } }
    var _dr=G.dockTick(state,Date.now());
    if(_dr.length){
      _dr.forEach(function(b){ if(b){ toast('🔧 Док починил «'+b.n+'» — корабль снова в строю');
        G.logAdd(state,'🔧 '+b.n+' восстановлен доком','ok'); } });
      snd('dock'); updateFleet(); markAlerts();
      if(activeTab==='more'&&moreSec==='fleet')renderMore();
    }
    portAcc+=dt; if(portAcc>1){ portAcc=0;
      var _ps=G.portState(state,Date.now());
      if(portN>=0&&_ps.list.length>portN){ snd('dock'); portFly('in'); toast('🚀 В порт прибыл новый корабль — нужен груз','gold');
        G.logAdd(state,'⚓ В порт прибыл корабль: '+G.portCfg(_ps.list[_ps.list.length-1].k).n,''); }
      portN=_ps.list.length; }
    if(state.upgrades['autoport']){ ptAcc+=dt; if(ptAcc>5){ ptAcc=0; autoPort(); } }
    if(state.upgrades['rep1']){ rpAcc+=dt; if(rpAcc>7){ rpAcc=0; autoRepair(); } }
    updatePortBtn();
    etaAcc+=dt; if(etaAcc>1){ etaAcc=0; refreshEtas(); }
    soonAcc+=dt; if(soonAcc>1){ soonAcc=0; updateSoon(); }
    nudgeAcc+=dt; if(nudgeAcc>1.5){ nudgeAcc=0; checkNudge(); }
    if(raidHit){ raidAcc+=dt;
      /* охотник за кораблями пролетает мимо патруля и роя: его сбивают только твои тапы,
         иначе сильный флот вообще не давал бы абордажей и блокировал ветку ремонта */
      var atr2=(raidAutoImmune?0:G.fleetDps(state))+G.autoTapRate(state)*(raidAutoImmune?0:1);
      if(atr2>0&&raidAcc>=1){ raidAcc=0; raidHit(Math.max(1,Math.round(atr2/3))); } } else raidAcc=0;
    saveAcc+=dt; if(saveAcc>5){ saveAcc=0; saveNow(); }
    cloudAcc+=dt; if(cloudAcc>25){ cloudAcc=0; saveCloud(false); }
    sigAcc+=dt; if(sigAcc>0.7){ sigAcc=0; autoRefresh(); }
  }catch(e){ if(window.console)console.warn('loop',e); }
}
function autoRepair(){
  var dl=G.dockList(state); if(!dl.length)return;
  var best=null,bc=1e18;
  dl.forEach(function(b){ var c=G.repairCost(state,b.id); if(c<bc){bc=c;best=b;} });
  if(!best)return;
  if((state.resources.credits||0)<bc*1.5)return;
  var r=G.repairShip(state,best.id,Date.now());
  if(!r.ok)return;
  snd('dock'); toast('🔧 Бригада починила «'+best.n+'»');
  updateFleet(); markAlerts();
  if(activeTab==='more'&&moreSec==='fleet')renderMore();
}
function autoResearch(){
  if(G.resRunInfo(state,Date.now()))return;
  var av=G.researchList(state).filter(function(x){return x.can;});
  if(!av.length)return;
  av.sort(function(a,b){return a.r.cost-b.r.cost;});
  var r=av[0].r;
  if(G.buyResearch(state,r.id)){
    state.seenRes=state.seenRes||0;
    if(state.seenRes++%3===0)toast('🧠 Научный ИИ отправил узел «'+r.n+'» в лабораторию');
    if(activeTab==='more')renderMore();
    markAlerts();
  }
}
function autoChest(){
  if(!(state.chests||[]).length)return;
  var b=G.openChest(state,0); if(!b)return;
  state.stats.chestsOpened=(state.stats.chestsOpened||0)+1;
  if(b.boost)applyBoost(b.boost.mul,b.boost.sec);
  toast('📦 ИИ вскрыл сундук: '+b.lines.join(' · '));
  snd('chest');
  if(activeTab==='more')renderMore();
}
function autoSell(){
  var have=Math.floor(state.resources.minerals||0);
  var keep=Math.max(200,Math.floor(G.costFor(G.MODULES.miner,state.modules.miner||0,state)*0.4));
  if(have-keep<50)return;
  var r=G.sellMinerals(state,Math.floor((have-keep)*0.6));
  if(r.ok&&activeTab==='explore')renderExplore();
}
function autoExplore(){
  if(G.expActive(state)>=G.expSlots(state))return;
  var pool=[],i;
  for(i=0;i<G.EXPLORE.length;i++){
    var e=G.EXPLORE[i];
    if(!G.expReady(state,e.key))continue;
    if(!G.expGate(state,i).ok)continue;
    var c=G.expCost(state,e),ok=true;
    for(var k in c){ if((state.resources[k]||0)<c[k])ok=false; }
    if(ok)pool.push(e);
  }
  if(!pool.length)return;
  pool.sort(function(a,b){return b.mult-a.mult;});
  G.explore(state,pool[0].key);
}
function autoBuild(){
  var best=null,bc=Infinity;
  G.MORDER.forEach(function(k){
    var m=G.MODULES[k];
    if(!G.modUnlocked(m,state))return;
    var c=G.costFor(m,state.modules[k]||0,state);
    if(state.resources[G.payRes(m)]<c)return;
    if(c<bc){bc=c;best=k;}
  });
  if(best){ var r=G.buyModule(state,best); if(r.ok){ popAtCard('[data-mod="'+best+'"]','⚙ авто', ''); } }
}
var lastLvl=0, lastLvlToast=0;
var BG=[
 {lvl:1,  img:'assets/img/bg.jpg'},
 {lvl:10, img:'assets/img/bg2.jpg'},
 {lvl:20, img:'assets/img/bg3.jpg'},
 {lvl:30, img:'assets/img/bg4.jpg'},
 {lvl:42, img:'assets/img/bg5.jpg'},
 {lvl:55, img:'assets/img/bg6.jpg'},
 {lvl:70, img:'assets/img/bg7.jpg'}
];
var lastBg='',bgPre={};
function updateBg(){
  var l=G.stationLevel(state),img=BG[0].img,idx=0;
  for(var i=0;i<BG.length;i++) if(l>=BG[i].lvl){img=BG[i].img;idx=i;}
  if(idx<BG.length-1 && !bgPre[BG[idx+1].img]){ bgPre[BG[idx+1].img]=1; try{ var pr=new Image(); pr.src=BG[idx+1].img; }catch(e){} }
  if(img===lastBg)return; lastBg=img;
  var el=document.querySelector('.bg-photo'); if(!el)return;
  el.style.transition='opacity .9s ease'; el.style.opacity='0';
  setTimeout(function(){ el.style.backgroundImage='url("'+img+'")'; el.style.opacity=''; },900);
}
function updateScene(){
  var area=$('#clickArea'); if(!area)return;
  var sc=G.sceneFor(state);
  var pl=$('#scenePlanet'), im=$('#scenePlanetImg');
  if(pl&&im){
    if(im.getAttribute('data-src')!==sc.img){ im.src='assets/img/'+sc.img; im.setAttribute('data-src',sc.img);
      pl.classList.remove('swap'); void pl.offsetWidth; pl.classList.add('swap'); }
    pl.style.setProperty('--glow',sc.glow);
    var nm=$('#sceneName'); if(nm)nm.textContent=sc.n;
  }
  var l=G.stationLevel(state), cur=G.totalModules(state), base=(l-1)*6, next=l*6, span=Math.max(1,next-base);
  var lb=$('#lvlBar'), lt=$('#lvlTxt');
  if(lb)lb.style.width=Math.max(0,Math.min(100,(cur-base)/span*100))+'%';
  if(lt){ var _un=G.levelUnlockText(l+1);
    var _t='до ур. '+G.fmt(l+1)+' · '+(cur-base)+'/'+span+(_un?(' · затем: '+_un):'');
    lt.textContent=_t.length>92?(_t.slice(0,90)+'…'):_t; }
}
function flyShip(){
  var area=$('#clickArea'); if(!area||document.hidden){ setTimeout(flyShip,15000); return; }
  var kinds=['ship_A','ship_B','ship_E','ship_H','ship_L','station_A'];
  var w=area.clientWidth||240, h=area.clientHeight||240, r=area.getBoundingClientRect();
  var d=el('div','flyship'); var im=el('img'); im.src='assets/img/space/'+kinds[Math.floor(Math.random()*kinds.length)]+'.png'; im.alt='';
  var sz=12+Math.floor(Math.random()*12); im.style.width=sz+'px'; im.style.height=sz+'px';
  d.appendChild(im); area.appendChild(d);
  var dir=Math.random()<0.5?1:-1, y=10+Math.random()*(h*0.8);
  d.style.top=y+'px'; d.style.left=(dir>0?-30:w+10)+'px';
  if(dir<0)d.style.transform='scaleX(-1)';
  var dur=5200+Math.random()*3000, t0=Date.now();
  (function step(){
    var k=(Date.now()-t0)/dur;
    if(k>=1||!d.parentNode){ if(d.parentNode)d.parentNode.removeChild(d); return; }
    var x=dir>0?(-30+(w+60)*k):(w+10-(w+60)*k);
    d.style.left=x+'px'; d.style.opacity=(k<0.12?k/0.12:(k>0.88?(1-k)/0.12:1));
    requestAnimationFrame(step);
  })();
  setTimeout(flyShip,14000+Math.random()*22000);
}
function updateOrbits(){
  var lvl=G.stationLevel(state);
  var area=$('#clickArea'); if(!area)return;
  var want=Math.max(2,Math.min(7,1+Math.floor(lvl/2)));
  if(area.getAttribute('data-n')===String(want))return;
  area.setAttribute('data-n',want);
  area.querySelectorAll('.orbit').forEach(function(o){o.remove();});
  var kinds=['satellite_A','satellite_C','satellite_B','satellite_D','meteor_large','station_B','station_C'];
  for(var i=0;i<want;i++){
    var o=el('div','orbit');
    o.style.animationDuration=(16+i*7)+'s';
    o.style.animationDirection=(i%2?'reverse':'normal');
    o.style.transform='rotate('+(i*(360/want))+'deg)';
    var im=el('img'); im.src='assets/img/space/'+kinds[i%kinds.length]+'.png'; im.alt='';
    var sz=14+((i*5)%16); im.style.width=sz+'px'; im.style.height=sz+'px'; im.style.marginLeft=(-sz/2)+'px';
    o.appendChild(im); area.appendChild(o);
  }
}
function celebrate(lv,rw){
  var t=el('div','levelup','СТАНЦИЯ '+G.stationLevel(state)+'<small>'+(G.stationTitle(state).split('·')[1]||'').trim().toUpperCase()+'</small>');
  $('#fx').appendChild(t); setTimeout(function(){t.remove();},1900);
  confettiAt(window.innerWidth/2, window.innerHeight*0.38, 46);
  snd('warp');
  if(!rw)return;
  var parts=[];
  if(rw.credits)parts.push('+'+G.fmt(rw.credits)+' кредитов');
  if(rw.energy)parts.push('+'+G.fmt(rw.energy)+' энергии');
  if(rw.antimatter)parts.push('+'+rw.antimatter+' антиматерии');
  if(rw.chests)parts.push('+сундук'+(rw.chests>1?' ×'+rw.chests:''));
  var nx=G.levelUnlockText(lv);
  /* на поздних уровнях станции растут часто: не спамим тостом чаще, чем раз в 9 секунд */
  if(Date.now()-lastLvlToast>9000){
    lastLvlToast=Date.now();
    toast('🏗 Уровень '+lv+' — подарок экипажу: '+parts.join(', ')+(nx?(' · открывается: '+nx):''),'gold');
    G.logAdd(state,'🏗 Уровень станции '+lv+' · '+parts.join(', '),'gold');
  }
  updateChestBtn();
}
function updateStage(){
  var r=G.rates(state);
  var lv=G.stationLevel(state);
  if(lastLvl && lv>lastLvl){ var _lu=null;
    try{ _lu=G.levelUpReward(state,lastLvl,lv); }catch(e){ _lu=null; }
    celebrate(lv,_lu&&_lu.rw); }
  lastLvl=lv;
    updateOrbits();
  updateScene();
  updateBg();
  updateModRing();
  updateLvlRing();
  updateShield();
  updateSwarm();
  updateFleet();
  var d=$('#dps'); if(d)d.textContent=G.fmt(r.energy);
  var cp=$('#clickPower'); if(cp)cp.textContent=G.fmt(G.clickPower(state));
  var hv=$('#btn-harvest'); if(hv)hv.textContent='ГЕНЕРИРОВАТЬ +'+G.fmt(G.clickPower(state));
  var mv=$('#multVal'); if(mv){ var pm=G.productionMult(state); mv.textContent=(pm>=1000?G.fmt(pm):pm.toFixed(2)); }
  var lv2=$('#stationLevel'); if(lv2)lv2.textContent=G.stationTitle(state);
  var sn=$('#skinName'); if(sn)sn.textContent=G.skinById(state.skin).n;
  var hint=$('#tapHint'); if(hint) hint.style.display=(state.stats.totalClicks>2?'none':'');
  var bb=$('#boostBar'), bt=$('#boostTxt'), bi=$('#boostIcon');
  if(bb){
    if(boostUntil>Date.now()){
      bb.classList.remove('hidden','ad'); bb.style.cursor='default'; bb.onclick=null;
      if(bi)bi.src=IC('1f525');
      bt.textContent='БУСТ ×7 · '+Math.ceil((boostUntil-Date.now())/1000)+'с';
    } else {
      if(state.boostUntil)state.boostUntil=0;
      bb.classList.remove('hidden'); bb.classList.add('ad'); bb.style.cursor='pointer';
      if(bi)bi.src='assets/img/bonus_boost.png';
      bt.textContent='БУСТ ×7 ЗА РЕКЛАМУ';
      bb.onclick=function(e){ e.stopPropagation(); watchAd(); };
    }
  }
}
var expTagsFresh=0;
function refreshExploreCd(){
  var box=$('#exploreList'); if(!box)return;
  var any=0, now0=Date.now();
  G.EXPLORE.forEach(function(e){ if(!G.expReady(state,e.key,now0)||G.expGet(state,e.key))any++; });
  var _nowT=Date.now();
  var ms=document.querySelector('#exploreList [data-minstock]');
  if(ms)ms.textContent=G.fmt(state.resources.minerals||0);
  document.querySelectorAll('#exploreList [data-portleft]').forEach(function(e){
    e.textContent='⏳ '+fmtTime(Math.max(0,(+e.getAttribute('data-portleft'))-_nowT)/1000);
  });
  var _pn=document.querySelector('#exploreList [data-portnext]');
  if(_pn){ var _pl2=(+_pn.getAttribute('data-portnext'))-now0;
    _pn.textContent=fmtTime(Math.max(0,_pl2)/1000); }
  var _ci=document.querySelector('#exploreList [data-carin]');
  if(_ci){ var _cl=(+_ci.getAttribute('data-carin'))-_nowT;
    if(_cl<=0){ renderExplore(); return; } _ci.textContent='⏳ '+fmtTime(_cl/1000); }
  var runAny=0;
  box.querySelectorAll('b[data-expeta]').forEach(function(n){
    var left=(+n.getAttribute('data-expeta'))-now0;
    if(left<=0){ runAny=1; return; }
    n.textContent=fmtTime(left/1000);
  });
  box.querySelectorAll('[data-expprog]').forEach(function(n){
    var end=+n.getAttribute('data-expprog'), st=+n.getAttribute('data-expst')||0;
    var total=end-st; if(total<=0)total=600000;
    n.style.width=Math.max(2,Math.min(100,(now0-st)/total*100))+'%';
  });
  var sn=document.querySelector('#expSlotsN');
  if(sn)sn.textContent=G.expActive(state)+'/'+G.expSlots(state);
  if(runAny){ renderExplore(); return; }
  if(!any)return;
  var i=0;
  box.querySelectorAll('.expcard').forEach(function(card){
    var e=G.EXPLORE[i++]; if(!e)return;
    var run=G.expGet(state,e.key), left=G.expLeft(state,e.key,now0);
    var b=card.querySelector('[data-exp]');
    var cool=card.querySelector('.cool');
    if(run){ if(b){b.disabled=true;b.textContent='В ПУТИ';} }
    else if(left>0){ if(b){b.disabled=true;b.textContent='⟳ ОТДЫХ';}
      if(cool)cool.textContent='⟳ экипаж отдыхает '+fmtTime(left/1000); }
    else if(b){ var inf=G.expInfo(state,e,now0);
      b.disabled=!(G.expActive(state)<G.expSlots(state)&&afford(inf.cost)); b.textContent='ОТПРАВИТЬ'; if(cool)cool.remove(); }
  });
  /* цены и награды экспедиций обновляем на месте: кнопка «ОТПРАВИТЬ» не должна мигать */
  expTagsFresh=expTagsFresh||0;
  if(now0-expTagsFresh>3000){
    expTagsFresh=now0;
    var idx2=0;
    box.querySelectorAll('.expcard').forEach(function(card){
      var e=G.EXPLORE[idx2++]; if(!e)return;
      var inf=G.expInfo(state,e,now0);
      if(inf.run)return;
      var tg=card.querySelector('[data-exptags]');
      var rch=inf.run?inf.run.ch:inf.ch;
      if(tg)tg.innerHTML='<span class="tag artc" title="Шанс привести артефакт за этот поход">🔎 '+
          Math.round(G.expArtChance(state,e,rch)*100)+'%</span>'+
        '<span class="tag" title="Шанс привести сундук находок за этот поход">📦 '+
          Math.round(G.expChestChance(state,e,rch)*100)+'%</span>'+
        costTags(inf.cost)+(afford(inf.cost)?'':etaChip(inf.cost))+
        (inf.left>0?'<span class="cool" data-expcd="'+inf.left+'">⟳ экипаж отдыхает '+fmtTime(inf.left/1000)+'</span>':'');
      var sub=card.querySelector('.csub');
      var gate=G.expGate(state,idx2-1);
      if(sub&&gate.ok)sub.innerHTML=(inf.run?'Везёт груз: ':'Идёт <b>'+expDurTxt(e.dur)+'</b> · Награда: ')+
        Object.keys(inf.rw).map(function(k){return '+'+G.fmt(inf.rw[k])+' '+G.RES_META[k].name;}).join(', ')+
        (inf.run?' · <span class="good">груз зафиксирован при отправке</span>'
                 :' · <span class="risk">Риск: -'+Math.round(G.expLoss(state,e)*100)+'% снаряжения</span>');
    });
  }
  var now=Date.now();
  var pk=document.querySelector('#exploreList [data-peakcd]');
  if(pk){ var pleft=(+pk.getAttribute('data-peakcd'))-now;
    if(pleft<=0){ renderExplore(); } else { pk.textContent='⟳ '+fmtTime(pleft/1000); } }
  document.querySelectorAll('#exploreList [data-portleft]').forEach(function(e){
    var left=(+e.getAttribute('data-portleft'))-now;
    e.textContent='⏳ '+fmtTime(Math.max(0,left)/1000);
  });
}

/* ---------- лента «СКОРО»: ближайшие события станции ---------- */
function rwTxt(rw){
  var o=[];Object.keys(rw).forEach(function(k){
    if(k==='antimatter'){o.push('+'+G.fmt(rw[k])+' ✦');return;}
    o.push('+'+G.fmt(rw[k])+' '+(G.RES_META[k]?G.RES_META[k].name.toLowerCase():k));
  });
  return o.join(' · ');
}
function bestShipUp(s){
  var best=null;
  G.SHIPS.forEach(function(b){ var lv=G.shipLv(s,b.id); if(!lv)return;
    var c=G.shipUpCost(s,b.id);
    if(!best||c<best.cost)best={b:b,id:b.id,lv:lv,cost:c,txt:G.shipLvText(s,b.id,lv+1)}; });
  return best;
}
function upcoming(now,all){
  now=(typeof now==='number'&&isFinite(now))?now:Date.now();
  var out=[],s=state;
  Object.keys(s.expRun||{}).forEach(function(k){
    var r=s.expRun[k]; if(!r||!r.end)return;
    var cfg=null; G.EXPLORE.forEach(function(e){ if(e.key===k)cfg=e; });
    var rw=r.rw||(cfg?G.expReward(s,cfg,r.val,now):null);
    out.push({at:r.end,abs:1,ic:'1fa90',t:'Экспедиция «'+(cfg?cfg.n:'дальняя')+'» вернётся',s:'Экспедиция',tab:'explore',
      rw:rw?rwTxt(rw)+(cfg&&cfg.anti?' · есть антиматерия':''):'груз на борту'});
  });
  var rr=G.resRunInfo(s,now);
  if(rr)out.push({at:rr.end,abs:1,ic:'1f52c',t:'Наука: '+rr.cfg.n,s:'Наука',tab:'more',sec:'sci',rw:rr.cfg.d});
  var ps=G.portState(s,now);
  if(ps.nextIn>0)out.push({at:now+ps.nextIn,ic:'1f6a2',t:'Новый корабль в порту',s:'Корабль в порту',tab:'explore',
    rw:'новая сделка: '+G.fmt(Math.round((G.rates(s).credits||0)*90))+' кредитов'});
  if(ps.carReady&&ps.carIn>0)out.push({at:now+ps.carIn,ic:'1f69a',t:'Караван у стенки',s:'Караван',tab:'explore',rw:'цепочка из '+G.CARAVAN_LEN+' сделок'});
  var fi=G.flareInfo(s,now);
  if(!fi.active&&fi.nextIn>0)out.push({at:now+fi.nextIn,abs:1,ic:'1f31e',t:'Вспышка ×'+fi.mult,s:'Вспышка ×'+fi.mult,tab:'scene',rw:'энергия ×'+fi.mult+' на 45 сек'});
  if(soonAt.comet>now)out.push({at:soonAt.comet,abs:1,ic:'1f320',t:'Комета пролетит',s:'Комета',tab:'scene',rw:''+G.fmt(Math.round((G.rates(s).energy||0)*120+(G.rates(s).minerals||0)*40))+' ресурсов'});
  if(G.gateOpen(s,'raid')){
    if(soonAt.boss>now)out.push({at:soonAt.boss,abs:1,ic:'1f6a9',t:'Флагман пиратов',s:'Флагман',tab:'scene',rw:'жирная награда + шанс артефакта'});
    else if(soonAt.raid>now)out.push({at:soonAt.raid,abs:1,ic:'1f6f8',t:'Пираты идут',s:'Пираты',tab:'scene',rw:'отразишь — получишь кредиты'});
  }
  if(radarAt>now)out.push({at:radarAt,abs:1,ic:'1f6e1',t:'Охотник прилетит',s:'Охотник',tab:'more',sec:'fleet',rw:'собьёшь — антиматерия'});
  var bcd=0,bk=null;
  G.EXPLORE.forEach(function(e){ if(!G.expGate(s,G.EXPLORE.indexOf(e)).ok)return;
    var l=G.expLeft(s,e.key,now); if(l>0&&(!bcd||l<bcd)){bcd=l;bk=e;} });
  if(bk)out.push({at:now+bcd,ic:bk.ic,t:'Экипаж готов снова',s:'Экипаж готов',tab:'explore',rw:'можно отправить «'+bk.n+'»'});
  var cst=G.chainState(s);
  if(cst.ready)out.push({at:now,ic:cst.cfg.ic,t:'Цепь капитана: награда',s:'Цепь: награда',tab:'more',sec:'prog',now:1,must:1,rw:G.chainRwTxt(cst.cfg.rw)});
  else{
    var cet=etaSmooth('soon:chain:'+cst.i,G.chainEta(s,cst));
    if(isFinite(cet)&&cet<36*3600)out.push({at:now+Math.max(1,cet)*1000,ic:cst.cfg.ic,
      t:'Цепь: '+cst.cfg.n,s:'Цепь капитана',tab:'more',sec:'prog',must:1,now:cet<=2?1:0,
      rw:cst.cur+'/'+cst.need+(cst.cfg.nx?(' \u00b7 '+cst.cfg.nx):'')});
    else out.push({at:now+Math.max(1,(cst.wait||120000)/1000)*1000,ic:cst.cfg.ic,
      t:'Цепь: '+cst.cfg.n,s:'Цепь капитана',tab:'more',sec:'prog',must:1,
      rw:cst.cur+'/'+cst.need+' · сделаешь первое действие — и срок станет точным'});
  }
  var ng=G.nextGate(s);
  if(ng&&isFinite(ng.eta)&&ng.eta<36*3600)out.push({at:now+Math.max(1,ng.eta)*1000,ic:'1f30c',gate:1,
    t:'Откроется: '+G.gateName(ng.key),s:'Откроется: '+G.gateName(ng.key),
    tab:G.gateTab(ng.key),sec:G.gateSec(ng.key),now:ng.eta<=2?1:0,
    rw:ng.req});
  G.installList(s,now).forEach(function(it){
    out.push({at:it.end,ic:G.MODULES[it.key].ic,
      t:'Монтаж: '+G.MODULES[it.key].name,s:'Монтаж корпуса',tab:'modules',
      rw:'корпус собран на '+Math.round(it.pct)+'% · потом выпуск на полную'}); });
  /* ближайшая стройка: самый близкий «построить» — горизонт на минуты */
  var rc=G.ratesCalm(s),nb=null;
  G.MORDER.forEach(function(k){ var m=G.MODULES[k]; if(!G.modUnlocked(m,s))return;
    var l=s.modules[k]||0,c=G.costFor(m,l,s),pr=G.payRes(m),have=s.resources[pr]||0;
    if(have>=c)return;
    var rr=(rc[pr]||0)>0?rc[pr]:(pr==='energy'?Math.max(1,G.clickPower(s)):0);
    var t=rr>0?(c-have)/rr:Infinity;
    if(!nb||t<nb.t)nb={t:t,k:k,l:l,c:c,pr:pr,have:have}; });
  if(nb&&nb.t<36*3600)out.push({at:now+Math.max(1,nb.t)*1000,ic:G.MODULES[nb.k].ic,
    t:'Стройка: '+G.MODULES[nb.k].name+' ур. '+(nb.l+1),s:'Стройка модуля',tab:'modules',now:nb.t<=2?1:0,
    rw:'ещё '+G.fmt(nb.c-nb.have)+' '+G.RES_META[nb.pr].g});
  G.shipInstallList(s,now).forEach(function(it){ var b=G.shipById(it.id);
    out.push({at:it.end,ic:'1f6a2',t:'Верфь: спуск '+(b?b.n:'корпуса'),s:'Спуск корпуса',tab:'more',sec:'fleet',
      rw:'стапель '+Math.round(it.pct)+'% · бонусы включатся после спуска'}); });
  /* цель-накопление: одна конкретная стройка, которую ждут минуты, а не секунды */
  var gb=G.goalBuild(s,now);
  if(gb&&isFinite(gb.eta)&&gb.eta<36*3600)out.push({at:now+Math.max(1,gb.eta)*1000,ic:gb.ic,goal:1,now:gb.ready?1:0,
    t:'Копим на: '+gb.name+' ур. '+(gb.from+1)+(gb.n>1?('\u2026'+gb.to):''),s:'Копим на стройку',tab:'modules',
    rw:'ещё '+G.fmt(gb.need)+' '+G.RES_META[gb.res].g+' \u00b7 '+gb.gain});
  var nu=G.nextUnlockLevel(s), lu=etaSmooth('soon:lvl:'+nu.lvl,G.levelEta(s,nu.lvl));
  if(isFinite(lu)&&lu<36*3600)out.push({at:now+Math.max(1,lu)*1000,ic:nu.ic,
    t:'Уровень станции '+nu.lvl+': '+nu.txt,s:'Ур. станции '+nu.lvl,tab:'modules',now:lu<=2?1:0,
    rw:'откроет: '+nu.txt});
  var bmS=null, rrS=G.rates(s);
  G.MORDER.forEach(function(k){ var l=s.modules[k]||0; if(!l)return; var nxm=G.mileNext(l); if(!nxm.at)return;
    var pr=G.payRes(G.MODULES[k]), c=G.bulkCost(G.MODULES[k],l,nxm.left,state);
    var t=G.timeToR(state.resources[pr]||0,rrS[pr]||0,c);
    if(!bmS||t<bmS.t)bmS={t:t,k:k,nxm:nxm}; });
  if(bmS&&bmS.t<36*3600)out.push({at:now+Math.max(1,bmS.t)*1000,ic:G.MODULES[bmS.k].ic,
    t:'Веха: '+G.MODULES[bmS.k].name+' ур. '+bmS.nxm.at,s:'Веха модуля',tab:'modules',now:bmS.t<=2?1:0,
    rw:'выпуск модуля ×'+bmS.nxm.mult.toFixed(2)+' · ещё '+bmS.nxm.left});
  if(G.gateOpen(s,'daily')&&G.dailyState(s,now).ready)out.push({at:now,ic:'1f4c5',t:'Награда дня',tab:'more',sec:'prog',now:1,rw:'серия дней растёт'});
  if(G.gateOpen(s,'chest')&&(s.chests||[]).length)out.push({at:now,ic:'1f4e6',t:'Сундук ×'+s.chests.length,tab:'explore',now:1,rw:'ресурсы, буст, шанс артефакта'});
  var pgn=G.gateOpen(s,'prestige')?G.prestigeGain(s):0,pcool=G.prestigeCool(s,now);
  if(pgn>=1&&pcool.ready)out.push({at:now,ic:'1f680',t:'Варп-прыжок: +'+G.fmt(pgn)+' ✦',tab:'more',sec:'prog',now:1,rw:'+12% ко всему доходу навсегда'});
  else if(pgn>=1)out.push({at:pcool.next,ic:'1f680',t:'Варп-прыжок: +'+G.fmt(pgn)+' ✦',s:'Варп-прыжок',tab:'more',sec:'prog',
    rw:'двигатель остывает · +12% ко всему доходу'});
  if(G.gateOpen(s,'route')&&G.routeState(s).claim)out.push({at:now,ic:'1f9ed',t:'Маршрут: награда',s:'Маршрут',tab:'explore',now:1,rw:'этап '+((s.route&&s.route.stage||0)+1)+' из '+G.ROUTE.length});
  var su=G.gateOpen(s,'yard')?bestShipUp(s):null;
  if(su){ var tsu=G.timeToR(s.resources.antimatter||0,G.rates(s).antimatter||0,su.cost);
  out.push({at:now+Math.max(1,tsu)*1000,ic:'1f6a2',now:tsu<=2?1:0,
    t:'Флот: '+su.b.n+' ур. '+su.lv+' → '+(su.lv+1),s:'Флот: ур. корабля',tab:'more',sec:'fleet',rw:su.txt}); }
  out.sort(function(a,b){return a.at-b.at;});
  if(all)return out;
  /* три горизонта: ближайшая цель, замок (что откроется) и цель-накопление «копим на».
     Цепь капитана и ближайший замок не имеют права пропадать из ленты — иначе игрок
     не знает, чего ждать, и окно между событиями кажется пустым. */
  var mc=null,mg=null,mgoal=null;
  out.forEach(function(x){ if(x.must&&!mc)mc=x; if(x.gate&&!mg)mg=x; if(x.goal&&!mgoal)mgoal=x; });
  var pick=[];
  [mc,mg,mgoal].forEach(function(x){ if(x&&pick.indexOf(x)<0)pick.push(x); });
  out.forEach(function(x){ if(!x.now&&pick.length<3&&pick.indexOf(x)<0)pick.push(x); });
  out.forEach(function(x){ if(x.now&&pick.length<3&&pick.indexOf(x)<0)pick.push(x); });
  pick.sort(function(a,b){return a.at-b.at;});
  return pick;
}
function updateSoon(){
  var box=$('#soon'); if(!box)return;
  var now=Date.now(), cw=box.clientWidth||window.innerWidth, narrow=cw<520;
  var cap=cw<300?1:(cw<620?2:3), L=upcoming(now).slice(0,cap);
  var sig=L.map(function(x){return x.t+'@'+(x.abs?x.at:Math.round((x.at-now)/30000));}).join('|');
  if(sig!==soonSig){
    soonSig=sig;
    var head='<div class="soon-l"><img src="'+IC('23f3')+'" alt=""><b>СКОРО</b></div>';
    if(!L.length){ box.innerHTML=head+'<span class="soon-none">Станция работает ровно — ждём новые события</span>'; return; }
    box.innerHTML=head+L.map(function(x){
      var jump=x.tab==='more'?(x.sec||'prog'):x.tab;
      return '<button class="soochip'+(x.now?' hot':'')+'" data-soon="'+jump+'" title="'+(x.t+(x.rw?(' — '+x.rw):''))+'">'+
        '<img src="'+IC(x.ic)+'" alt=""><span>'+((narrow&&x.s)?x.s:x.t)+
        (x.rw?'<i>'+x.rw+'</i>':'')+'</span>'+
        '<em data-soonat="'+x.at+'">'+(x.now?'сейчас':fmtTime((x.at-now)/1000))+'</em></button>';
    }).join('');
    var chips=box.querySelectorAll('.soochip');
    while(chips.length>1&&box.scrollWidth>box.clientWidth+2){ chips[chips.length-1].remove();
      chips=box.querySelectorAll('.soochip'); }
    box.querySelectorAll('[data-soon]').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        var id=b.getAttribute('data-soon');
        if(id==='scene'){ var a=$('#clickArea'); if(a){ a.classList.add('pulse'); setTimeout(function(){a.classList.remove('pulse');},900); } return; }
        if(id==='prog'||id==='sci'||id==='fleet'||id==='wheel'||id==='col'||id==='set'){ switchTab('more'); openSec(id); }
        else switchTab(id);
      };
    });
  } else {
    box.querySelectorAll('[data-soonat]').forEach(function(nn){
      var left=(+nn.getAttribute('data-soonat'))-now;
      nn.textContent=(left<=0)?'сейчас':fmtTime(left/1000);
    });
  }
}

/* ---------- цель игрока (видна во всех вкладках) ---------- */
function nextObjective(){
  var claim=null,claimD=null;
  G.QUESTS.forEach(function(q){ if(state.quests[q.id]==='claim'&&!claim)claim={t:'quest',q:q}; });
  var dd=state.dq||{list:[]};
  (dd.list||[]).forEach(function(x){ if(x.st==='claim'&&!claimD)claimD={t:'dq',d:x,cfg:G.dqCfg(x.id)}; });
    if(claimD)return claimD;
  if(claim)return claim;
  if(G.chainState(state).ready)return {t:'chain'};
  if(G.routeState(state).claim)return {t:'route'};
  var _pc=null,_pleft=1e12;
  (G.gateOpen(state,'port')&&state.port&&state.port.list||[]).forEach(function(c){ var lf=c.exp-Date.now(); if(G.portCan(state,c)&&lf<_pleft){_pleft=lf;_pc=c;} });
  if(_pc&&(_pc.big||_pleft<5*60000||_pc.car))return {t:'port',c:_pc};
  var _dk=G.gateOpen(state,'dock')?G.dockList(state):[];
  if(_dk.length){
    var _db=_dk[0]; _dk.forEach(function(b){ if(G.repairCost(state,b.id)<G.repairCost(state,_db.id))_db=b; });
    if((state.resources.credits||0)>=G.repairCost(state,_db.id))return {t:'dock',b:_db};
  }
  if(G.gateOpen(state,'chest')&&(state.chests||[]).length){ var bi=0,best=0;
    state.chests.forEach(function(c,i){ if(c.r>best){best=c.r;bi=i;} });
    return {t:'chest',idx:bi,cfg:G.CHEST_BY_R[best]||G.CHESTS[0]}; }
  var next=null;
  for(var i=0;i<G.QUESTS.length;i++){ if(!state.quests[G.QUESTS[i].id]){ next={t:'quest',q:G.QUESTS[i]}; break; } }
  if(next){ var qs=G.questState(state,next.q); if(qs.done)next=null; }
  if(!next){
    for(var j=0;j<(dd.list||[]).length;j++){ var x2=dd.list[j]; if(!x2.st){ var st2=G.dqState(state,x2); if(!st2.done){ next={t:'dq',d:x2,cfg:G.dqCfg(x2.id)}; break; } } }
  }
  if(!next&&G.gateOpen(state,'prestige')){
    var pg=G.prestigeGain(state);
    if(pg>=3)next={t:'prestige',gain:pg};
  }
  if(!next&&G.gateOpen(state,'yard')){ var _su=bestShipUp(state);
    if(_su&&(state.resources.antimatter||0)>=_su.cost)next={t:'shipup',id:_su.id,b:_su.b,lv:_su.lv,cost:_su.cost}; }
  if(!next&&G.gateOpen(state,'victory')){ var v=G.victoryState(state); if(v.done&&!v.won)next={t:'victory'}; }
  /* если больше делать нечего, целью становится текущий шаг цепи: у игрока
     всегда есть полоска прогресса и срок, а не пустая строка */
  if(!next){ var _cs=G.chainState(state); if(!_cs.done)next={t:'chain'}; }
  if(!next&&!state.victory&&G.gateOpen(state,'lab')){
    var rl=G.researchList(state);
    for(var k=0;k<rl.length;k++){ if(rl[k].can){ next={t:'res',r:rl[k].r}; break; } }
  }
  return next;
}
var objSig='', objPct=-1;
function moreSecFor(t){
  if(t==='res')return 'sci';
  if(t==='dock')return 'fleet';
  if(t==='victory'||t==='prestige')return 'prog';
  return null;
}
function goMore(t){ switchTab('more'); var id=moreSecFor(t); if(id)openSec(id); }
function openSec(id){ if(moreSec===id)return; moreSec=id; if(activeTab==='more')renderMore(); }
function renderObjective(force){
  var box=$('#objective'); if(!box)return;
  var o=nextObjective();
  objLast=o;
  var key='none';
  if(o){
    if(o.t==='quest')key='quest|'+o.q.id+'|'+(state.quests[o.q.id]||'');
    else if(o.t==='dq')key='dq|'+o.d.id+'|'+o.d.st;
    else if(o.t==='chest')key='chest|c'+o.idx+'|'+o.cfg.r;
    else if(o.t==='res')key='res|'+o.r.id;
    else if(o.t==='victory')key='victory|'+(state.victory?1:0);
    else if(o.t==='route')key='route|'+(state.route?state.route.stage:0)+'|'+(state.route?state.route.n:0);
    else if(o.t==='port')key='port|'+o.c.id+'|'+(G.portCan(state,o.c)?1:0);
    else if(o.t==='chain')key='chain|'+(state.chain||0);
    else if(o.t==='dock')key='dock|'+o.b.id+'|'+((state.resources.credits||0)>=G.repairCost(state,o.b.id)?1:0);
    else if(o.t==='shipup')key='shipup|'+o.id+'|'+o.lv+'|'+((state.resources.antimatter||0)>=o.cost?1:0);
    else key='prestige|'+o.gain;
  }
  if(!force&&key===objSig){ if(o)updateObBar(o); return; }
  objSig=key;
  if(!o){ box.className='objective hidden'; box.innerHTML=''; objPct=-1; return; }
  var name='',txt='',cur=0,need=1,claim=false,kind='',ic='1f4cb',tab='quests',verb='ЗАБРАТЬ',wait='награда ждёт';
  if(o.t==='quest'){ var q=o.q, qs=G.questState(state,q); name=q.n; txt=q.d; cur=qs.cur; need=qs.need;
    claim=(state.quests[q.id]==='claim'); kind='Задание'; ic=q.ic; }
  else if(o.t==='chest'){ name=o.cfg.n; txt='Открой сундук находок — внутри ресурсы, буст и шанс артефакта';
    cur=1; need=1; claim=true; kind='Находка'; ic=o.cfg.ic; tab='explore'; verb='ОТКРЫТЬ'; wait='сундук ждёт' }
  else if(o.t==='route'){ var rs=G.routeState(state); name='Звёздный маршрут · этап '+(rs.stage+1);
    txt='Караван прошёл этап — забери награду: '+Object.keys(rs.rw).map(function(k){return '+'+G.fmt(rs.rw[k])+' '+G.RES_META[k].name;}).join(', ');
    cur=1; need=1; claim=true; kind='Маршрут'; ic='1f9ed'; tab='explore'; verb='ЗАБРАТЬ'; wait='награда ждёт' }
  else if(o.t==='port'){ var pc=G.portCfg(o.c.k); name=o.c.big?'Большая сделка дня':pc.n;
    txt='Осталось '+fmtTime(Math.max(0,o.c.exp-Date.now())/1000)+' — отдай груз ('+portNeedTxt(o.c)+') и получи '+portRewardTxt(G.portReward(state,o.c));
    cur=1; need=1; claim=true; kind='Порт'; ic=pc.ic; tab='explore'; verb='СДАТЬ ГРУЗ'; wait='сделка ждёт' }
  else if(o.t==='dock'){ var dd=G.dockState(state,o.b.id,Date.now()); name='Ремонт «'+o.b.n+'»';
    txt='Корабль абордирован: бонусы и патруль не работают. Почини — или док сделает это сам через '+fmtTime(dd.left/1000);
    cur=state.resources.credits||0; need=dd.cost; claim=true; kind='Док'; ic='1f527'; tab='more'; verb='ПОЧИНИТЬ'; wait='корабль ждёт ремонта' }
  else if(o.t==='victory'){ name='Галактическое ядро'; txt='Все условия выполнены — заверши станцию и открой Вечный режим';
    cur=1; need=1; claim=true; kind='ФИНАЛ'; ic='1f31f'; tab='more'; verb='ЗАВЕРШИТЬ'; wait='всё готово' }
  else if(o.t==='res'){ name=o.r.n; txt='Изучи узел лаборатории: '+o.r.d; cur=state.resources.antimatter||0;
    need=o.r.cost; claim=true; kind='Наука'; ic=o.r.ic; tab='more'; verb='ИССЛЕДОВАТЬ'; wait='узел доступен' }
  else if(o.t==='shipup'){ name=o.b.n+' · уровень '+(o.lv+1);
    txt='Антиматерия уже на счету: качни корабль — '+G.shipLvText(state,o.id,o.lv+1);
    cur=state.resources.antimatter||0; need=o.cost; claim=true; kind='Флот'; ic='1f6a2';
    tab='more'; verb='УЛУЧШИТЬ'; wait='корабль ждёт апгрейда'; }
  else if(o.t==='chain'){ var cst=G.chainState(state); name=cst.cfg.n;
    txt=cst.cfg.d+' · награда: '+G.chainRwTxt(cst.cfg.rw)+(cst.cfg.nx?(' · откроет: '+cst.cfg.nx):'');
    cur=cst.cur; need=cst.need; claim=cst.ready; kind='Цепь капитана'; ic=cst.cfg.ic; tab='more'; verb='ЗАБРАТЬ';
    wait=cst.work?('задача закрыта, отчёт обрабатывается '+fmtLeft(cst.wait)):'шаг выполнен';
    if(cst.work&&!cst.ready)txt='Задача уже закрыта — отчёт капитана обрабатывается, награда будет через '+fmtLeft(cst.wait)+
      '. Это время можно потратить на стройку: следующий шаг цепи всегда дороже предыдущего.'; }
  else if(o.t==='prestige'){ name='Варп-прыжок'; txt='Копится +'+G.fmt(o.gain)+' антиматерии — сбрось станцию и стань сильнее';
    cur=1; need=1; claim=true; kind='Престиж'; ic='1f680'; tab='more'; verb='ВАРП-ПРЫЖОК'; wait='готов к прыжку' }
  else { var c=o.cfg, st=G.dqState(state,o.d); name=c.n; txt=st.txt; cur=st.cur; need=st.need;
    claim=(o.d.st==='claim'); kind='Задание дня'; ic=c.ic; }
  var pct=Math.max(0,Math.min(100,need?cur/need*100:0));
  objPct=Math.floor(pct/2);
  box.className='objective'+(claim?' claim':'')+(o.t==='victory'?' gold':'');
  box.innerHTML='<div class="ob-l"><img src="'+IC(ic)+'" alt=""><div class="ob-t"><b>'+kind+
    (claim?' · '+wait:'')+'</b><span>'+name+' — '+txt+'</span></div></div>'+
    '<div class="ob-r">'+(claim?'<button class="btn y sm" id="obGo">'+verb+'</button>'
      :'<div class="ob-bar"><i style="width:'+pct+'%"></i></div><span class="ob-n">'+G.fmt(cur)+'/'+G.fmt(need)+'</span>')+'</div>';
  box.onclick=function(e){
    var g=e.target&&e.target.closest?e.target.closest('#obGo'):null;
    if(g){ doObjective(o); return; }
    if(tab==='more')goMore(o.t); else switchTab(tab);
  };
}
var objHist={key:'',cur:0,t:0,eta:0};
function objEta(key,cur,need){
  var now=Date.now();
  if(objHist.key!==key){ objHist={key:key,cur:cur,t:now,eta:0}; return 0; }
  var dt=(now-objHist.t)/1000;
  if(dt<6)return objHist.eta;
  var rate=(cur-objHist.cur)/dt;
  objHist={key:key,cur:cur,t:now,eta:rate>0?(need-cur)/rate:objHist.eta};
  return objHist.eta;
}
function updateObBar(o){
  var box=$('#objective'); if(!box)return;
  var bar=box.querySelector('.ob-bar>i'), lab=box.querySelector('.ob-n');
  if(!bar||!lab)return;
  var cur=0,need=1;
  if(o.t==='quest'){ var qs=G.questState(state,o.q); cur=qs.cur; need=qs.need; }
  else if(o.t==='dq'){ var st=G.dqState(state,o.d); cur=st.cur; need=st.need; }
  else if(o.t==='dock'){ cur=state.resources.credits||0; need=G.dockState(state,o.b.id,Date.now()).cost; }
  else if(o.t==='res'){ cur=state.resources.antimatter||0; need=o.r.cost; }
  else if(o.t==='chain'){ var cs2=G.chainState(state); cur=cs2.cur; need=cs2.need; }
  else if(o.t==='shipup'){ cur=state.resources.antimatter||0; need=o.cost; }
  var pct=Math.max(0,Math.min(100,need?cur/need*100:0));
  bar.style.width=pct+'%';
  var e=objEta(objSig,cur,need);
  lab.textContent=G.fmt(cur)+'/'+G.fmt(need)+(e>0&&isFinite(e)?(' · '+G.etaText(e)):'');
}
function doObjective(o){
  snd('tab');
  if(o.t==='quest')claimQ(o.q.id);
  else if(o.t==='prestige'){ goMore('prestige'); setTimeout(doPrestige,220); }
  else if(o.t==='chest')openChestUi(o.idx);
  else if(o.t==='route'){ switchTab('explore'); setTimeout(routeClaimUi,220); }
  else if(o.t==='port'){ switchTab('explore'); setTimeout(function(){ doPort(o.c.id); },220); }
  else if(o.t==='victory'){ goMore('victory'); setTimeout(doVictory,220); }
  else if(o.t==='res'){ goMore('res'); setTimeout(function(){ buyResearchUi(o.r.id); },220); }
  else if(o.t==='dock'){ goMore('dock'); setTimeout(function(){ repairUi(o.b.id); },220); }
  else if(o.t==='chain'){ chainGo(G.chainState(state).cfg,chainClaimUi); }
  else if(o.t==='shipup'){ goMore('fleet'); setTimeout(function(){ shipUpUi(o.id); },220); }
  else claimDqUi(o.d.id);
  setTimeout(function(){ renderObjective(true); markAlerts(); },260);
}
/* лёгкая подпись только активной вкладки */
function panelSig(id){
  var a=[];
  if(id==='modules'){
    G.MORDER.forEach(function(k){ var m=G.MODULES[k]; a.push((G.modUnlocked(m,state)?1:0)+(state.modules[k]||0)+'q'+buyQty); });
  } else if(id==='upgrades'){
    G.UPGRADES.forEach(function(x){ a.push(state.upgrades[x.id]?1:(x.req(state)?2:4)); });
  } else if(id==='explore'){
    G.EXPLORE.forEach(function(x){ a.push((state.exploreCooldown[x.key]>0?1:(afford(x.cost)?2:3))); });
    a.push(state.stats.totalExpeditions);
    var _rs=G.routeState(state); a.push(_rs.n+'/'+_rs.stage+'/'+(_rs.claim?1:0)); a.push((state.chests||[]).length);
    var _pl=(state.port&&state.port.list)||[]; _pl.forEach(function(c){ a.push(c.id+(G.portCan(state,c)?1:0)); });
    a.push(_pl.length);
  } else if(id==='quests'){
    G.QUESTS.forEach(function(x){ var qs=G.questState(state,x); a.push((state.quests[x.id]||'')+'|'+(qs.cur>=qs.need?1:0)); });
    a.push(state.daily.streak+'|'+(G.dailyState(state,Date.now()).ready?1:0));
    (state.dq&&state.dq.list||[]).forEach(function(x){ var st=G.dqState(state,x); a.push(x.st+Math.floor(st.cur/st.need*20)); });
  } else if(id==='achieve'){
    G.ACH.forEach(function(x){ var st=G.achState(state,x); a.push(state.achievements[x.id]?1:(st.cur>=st.need?1:0)+''+Math.floor(st.cur/st.need*20)); });
  }
  return id+'#'+a.join(',');
}
function autoRefresh(){
  if(activeTab==='more')return;
  if(!modal.classList.contains('hidden'))return;
  if(Date.now()-pressAt<700)return;   /* не пересобирать список, пока палец на экране */
  var sig=panelSig(activeTab);
  if(sig!==lastSig){ lastSig=sig; renderPanel(activeTab); return; }
  refreshCards();
  markAlerts();
}
/* карточки не пересоздаются: меняем только цифры и доступность кнопки */
function refreshCards(){
  var box=$('#modulesList');
  if(box&&activeTab==='modules'){
    Array.prototype.forEach.call(box.querySelectorAll('[data-mod]'),function(c){
      var k=c.getAttribute('data-mod'),m=G.MODULES[k],lvl=state.modules[k]||0;
      if(!G.modUnlocked(m,state))return;
      var n=(buyQty===100?Math.max(1,G.maxBuy(state,k)):buyQty);
      var pr=G.payRes(m),cost=G.bulkCost(m,lvl,n,state),can=state.resources[pr]>=cost;
      if(c.classList.contains('ok')!==can)c.classList.toggle('ok',can);
      var tag=c.querySelector('.tag.cost');
      if(tag)tag.innerHTML='<img src="'+IC(G.RES_META[pr].ic)+'" alt="">'+G.fmt(cost)+(n>1?' <small>×'+n+'</small>':'');
      var btn=c.querySelector('[data-buy]'); if(btn)btn.disabled=!can;
      var eta=c.querySelector('.tag.eta');
      if(eta){ eta.style.display=can?'none':''; if(!can)eta.setAttribute('data-etacost','{&quot;'+pr+'&quot;:'+Math.round(cost)+'}'); }
    });
  }
  box=$('#upgradesList');
  if(box&&activeTab==='upgrades'){
    Array.prototype.forEach.call(box.querySelectorAll('[data-up]'),function(c){
      var u=null; G.UPGRADES.forEach(function(x){ if(x.id===c.getAttribute('data-up'))u=x; });
      if(!u||state.upgrades[u.id])return;
      var can=afford(u.cost);
      if(c.classList.contains('ok')!==can)c.classList.toggle('ok',can);
      var btn=c.querySelector('[data-upb]'); if(btn)btn.disabled=!can;
      var eta=c.querySelector('.tag.eta'); if(eta)eta.style.display=can?'none':'';
    });
  }
}

/* ---------- render all ---------- */
function renderAll(){ applySkin(); renderResBar(); renderTabs(); switchTab(activeTab); updateStage(); updateChestBtn(); updatePortBtn(); renderObjective(true); markAlerts(); updateSoon(); }

/* ---------- init ---------- */
function init(){
  if(root.__cosmicInit)return; root.__cosmicInit=true;
  try{
    document.addEventListener('pointerdown',function(){ pressAt=Date.now(); markAct(); },true);
    document.addEventListener('keydown',markAct,true);
  }catch(e){}
  modal=$('#modal'); mIcon=$('#mIcon'); mTitle=$('#mTitle'); mBody=$('#mBody'); mActions=$('#mActions'); toastBox=$('#toasts');
  loadSettings();
  loadLocal();
  G.rollDQ(state,Date.now());
  if(YSDK&&YSDK.boot){ YSDK.boot(function(){ if(YSDK)YSDK.init().then(function(){ tryCloud(); }); }); }
  else if(YSDK){ YSDK.init().then(function(){ tryCloud(); }); }
  initSounds();
  boostUntil=state.boostUntil||0;
  lastLvl=G.stationLevel(state);
  applySkin();
  var l0=G.stationLevel(state); lastBg=BG[0].img;
  for(var i0=0;i0<BG.length;i0++) if(l0>=BG[i0].lvl) lastBg=BG[i0].img;
  var bp=document.querySelector('.bg-photo'); if(bp&&lastBg!==BG[0].img) bp.style.backgroundImage='url("'+lastBg+'")';
  var off=G.offline(state,Date.now());
  renderAll();
  if(off.seconds>0)setTimeout(function(){showOffline(off);},400);
  else if(!state.stats.totalClicks && state.lessonSeen && state.lessonSeen[state.chain||0])setTimeout(showHelp,300);
  if(G.dailyState(state,Date.now()).ready)setTimeout(function(){ tryDaily(60); }, off.seconds>0?5200:1400);

  $('#btn-help').onclick=function(){snd('tab');showHelp();};
  $('#btn-menu').onclick=function(){snd('tab');switchTab('more');};
  $('#btn-harvest').onclick=function(){
    var a=$('#clickArea').getBoundingClientRect();
    doClick(a.left+a.width/2,a.top+a.height*0.35);
  };
  var area=$('#clickArea');
  area.addEventListener('pointerdown',function(e){ e.preventDefault(); ambStart(); doClick(e.clientX,e.clientY); });
  document.addEventListener('pointerdown',function once(){ ambStart(); document.removeEventListener('pointerdown',once); });
  document.addEventListener('contextmenu',function(e){e.preventDefault();});
  /* лёгкий параллакс фона (только мышь/трекпад) */
  if(window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    var bgp=document.querySelector('.bg-photo'),par=0;
    window.addEventListener('pointermove',function(e){
      if(par)return; par=1;
      requestAnimationFrame(function(){ par=0;
        var dx=(e.clientX/window.innerWidth-0.5), dy=(e.clientY/window.innerHeight-0.5);
        if(bgp)bgp.style.setProperty('--px',(dx*-14).toFixed(2)+'px'),bgp.style.setProperty('--py',(dy*-10).toFixed(2)+'px');
      });
    },{passive:true});
  }
  modal.addEventListener('click',function(e){ if(e.target===modal)closeModal(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape')closeModal(); });
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){ if(YSDK)YSDK.gameplayStop(); saveNow(); saveCloud(false); ambStop(); }
    else { if(YSDK)YSDK.gameplayStart(); lastFrame=performance.now(); ambStart();
           var o=G.offline(state,Date.now()); if(o.seconds>300)showOffline(o); }
  });
  window.addEventListener('beforeunload',function(){ saveNow(); saveCloud(false); if(YSDK)YSDK.gameplayStop(); });
  var rz=null;
  window.addEventListener('resize',function(){ clearTimeout(rz); rz=setTimeout(function(){ renderTabs(); markAlerts(); coachStep(); },250); });
  lastFrame=performance.now();
  setInterval(loop,G.TICK_MS);
  setTimeout(flyShip,4000);
    scheduleComet();
  scheduleRaid(true);
  scheduleBoss(true);
  scheduleHunter();
  setTimeout(function(){ if(!state.lessonSeen||!state.lessonSeen[state.chain||0])lessonModal(state.chain||0,null); },1400);
  setTimeout(coachStep,900);
  if(YSDK){ YSDK.markReady(); YSDK.gameplayStart(); }
}
root.UI={init:init,get state(){return state;},set state(v){state=v;},renderAll:renderAll,toast:toast,doClick:doClick,
 openModal:openModal,closeModal:closeModal,spawnComet:spawnComet,setBoost:setBoost,watchAd:watchAd,switchTab:switchTab,
 doBuy:doBuy,doExplore:doExplore,doSell:doSell,spawnBoss:function(o){spawnRaid(Object.assign({boss:true},o||{}));},
 buyResearch:buyResearchUi,doVictory:doVictory,renderObjective:renderObjective,renderExplore:renderExplore,nextObjective:nextObjective,doObjective:doObjective,routeClaim:routeClaimUi,updateShield:updateShield,claimDaily:claimDailyUi,showDaily:showDailyModal,
 pickSkin:pickSkin,claimQ:claimQ,doUpg:doUpg,showHelp:showHelp,showLeaderboard:showLeaderboard,
 upReqText:upReqText,firstRunNudge:firstRunNudge,showOffline:showOffline, openWheel:openWheel, openSec:openSec, repairUi:repairUi, openRepair:openRepair, sqClaimUi:sqClaimUi, dockHtml:dockHtml, coachStep:coachStep, getSec:function(){return moreSec;}, moreSecFor:moreSecFor,renderPanel:renderPanel,saveNow:saveNow,loadLocal:loadLocal, openChest:openChestUi,autoTap:autoTap,autoShip:autoShip,autoExplore:autoExplore,expDurTxt:expDurTxt,buyShip:buyShipUi, spawnRaid:spawnRaid, spawnHunter:function(){ spawnRaid({hunter:true}); }, autoRepair:autoRepair, doPeak:doPeak, peakHtml:peakHtml, doEmergency:doEmergency, careerHtml:careerHtml, showCareer:careerModal, setCareer:function(v){careerOpen=!!v;renderMore();},
  startHuntWave:function(){ huntQueue=(G.shipOwned(state)>=4)?2:1; launchHunter(); return huntQueue+1; },
  huntQueueLeft:function(){ return huntQueue; }, setHuntQueue:function(n){ huntQueue=Math.max(0,+n||0); return huntQueue; },
  showRadar:showRadar, hideRadar:hideRadar, radarHtml:radarHtml,
  get radarAt(){ return radarAt; }, set radarAt(v){ radarAt=+v||0; },
  passportText:passportText, passportModal:passportModal, copyText:copyText, sharePassport:sharePassport,
  nudgeNow:checkNudge, nudgeData:nudgeData, hideNudge:hideNudge, refreshCards:refreshCards,
 upcoming:upcoming, updateSoon:updateSoon, firstRunNudge:firstRunNudge, chainGo:chainGo,
  set idleSince(v){lastActAt=+v||0;}, get idleSince(){return lastActAt;},
  submitSeasonScore:submitSeasonScore, showSeasonBoard:showSeasonBoard, spawnFlare:function(){
    var f=G.maybeFlare(state,Date.now()); if(!f&&state.flare){state.flare.nextAt=Date.now();f=G.maybeFlare(state,Date.now());} if(f)onFlare(f); },
 get settings(){return settings;},
 snd:snd, sfx:SFX, ambStart:ambStart, ambStop:ambStop,
 audio:{ get ac(){return AC;}, set ac(v){AC=v;ACBAD=false;}, set master(v){MASTER=v;}, set sfxg(v){SFXG=v;},
           get voices(){return VOICES;}, get amb(){return AMBV;} }};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})(typeof window!=='undefined'?window:this);
