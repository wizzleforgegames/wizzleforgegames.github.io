/* week.js — Недельная гонка (Weekly Race): очки недели, рубежи, призовые места */
(function(){
'use strict';
const IXRE=/\{([a-z0-9-]+)\}/gi;
function ix(h){return String(h).replace(IXRE,(m,n)=>'<svg class="ic"><use href="#i-'+n+'"/></svg>')}
function nf(n){return (n||0).toLocaleString(I18N.lang==='ru'?'ru-RU':'en-US')}
const WEEK_MS=6048e5, DAY_CAP=1200;
const TIERS=[
  {p:400, c:400,  xp:0,   pu:''},
  {p:1000,c:700,  xp:300, pu:''},
  {p:2000,c:1200, xp:0,   pu:'hammer'},
  {p:3400,c:2000, xp:600, pu:''},
  {p:5000,c:3200, xp:900, pu:'bomb'}
];
const PRIZE=[[1,3000],[3,2000],[10,1200],[25,700],[9999,300]];
const NAMES=['NeonFox','PixelOwl','VoltCat','GridRun','Zephyr','LumenX','ByteWolf','QuartzQ','NovaPup','HexHawk',
  'Mirage','Cobalt','FrostByte','TurboAnt','GlowDeer','RuneKit','SolarRay','EchoMoth','PrismFox','VoidLynx',
  'KiloNine','DriftOx','OnyxPlum','SableFox'];
const TARGET=[6800,6100,5400,4700,4200,3800,3400,3000,2700,2400,2100,1900,1700,1500,1300,1100,950,800,650,520,400,300,210,140];

function weekStart(){const d=new Date();const off=(d.getDay()+6)%7;
  return new Date(d.getFullYear(),d.getMonth(),d.getDate()-off,0,0,0)}
function wnum(){const m=weekStart();
  return Math.floor(Date.UTC(m.getFullYear(),m.getMonth(),m.getDate())/86400000)}
function wleft(){const m=weekStart();return new Date(m.getFullYear(),m.getMonth(),m.getDate()+7,0,0,0)-Date.now()}
function wfrac(){return Math.max(0,Math.min(1,1-wleft()/WEEK_MS))}
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function st(){const S=BB.S;
  if(!S.week||typeof S.week!=='object')S.week={num:0,pts:0,day:'',dayPts:0,claimed:[],rank:0,prize:null,last:null};
  if(!Array.isArray(S.week.claimed))S.week.claimed=[];
  return S.week}
function rollover(){const w=st();
  if(w.num===wnum())return false;
  if(w.pts>0){const pl=Math.max(1,w.rank||999);let coins=300;
    for(const [lim,c] of PRIZE){if(pl<=lim){coins=c;break}}
    w.prize={place:pl,coins:coins,pts:w.pts};}
  else w.prize=null;
  w.num=wnum();w.pts=0;w.day='';w.dayPts=0;w.claimed=[];w.rank=0;w.last=null;
  BB.save();return true}

/* очки за партию */
function racePts(r){
  const sc=(r&&r.score)||BB.G.score||0, ln=(r&&r.lines!=null?r.lines:BB.G.linesThisGame)||0,
        bl=(r&&r.blasts!=null?r.blasts:BB.G.blastsThisGame)||0;
  return Math.max(0,Math.round(sc/150)+ln*3+bl*20);
}
function add(r){
  if(rollover()){}
  const w=st(), today=BB.today();
  if(w.day!==today){w.day=today;w.dayPts=0}
  const raw=racePts(r), room=Math.max(0,DAY_CAP-w.dayPts), got=Math.min(raw,room);
  w.pts+=got;w.dayPts+=got;w.num=wnum();
  BB.save();
  try{if(P.supportsLb())P.lbSet(w.pts,'weekly_race')}catch(e){}
  return {got:got,raw:raw,cap:DAY_CAP,dayPts:w.dayPts,pts:w.pts};
}
/* соперники-боты (когда живой рейтинг пуст) */
function bots(){
  const w=wnum(), f=wfrac(), rnd=mul(w*97+13);
  return TARGET.map((t,i)=>({name:NAMES[(w*3+i*5)%NAMES.length],
    score:Math.max(40,Math.round(t*f*(0.88+rnd()*0.24))),me:false,rank:0,bot:true}));
}
function tiers(){return TIERS}
function claimed(i){return st().claimed.indexOf(i)>=0}
function claimable(){const w=st();let n=0;TIERS.forEach((t,i)=>{if(w.pts>=t.p&&!claimed(i))n++});
  if(w.prize)n++;return n}
function nextTier(){const w=st();for(let i=0;i<TIERS.length;i++)if(!claimed(i))return i;return -1}
function give(t){
  BB.S.coins+=(t.c||0);
  if(t.xp){BB.S.xp+=t.xp;try{UI.checkLevel&&UI.checkLevel()}catch(e){}}
  if(t.pu){try{UI.givePu&&UI.givePu(t.pu)}catch(e){}}
  BB.save();
}
function claim(i,dbl){
  const w=st(),t=TIERS[i];if(!t||claimed(i)||w.pts<t.p)return null;
  w.claimed.push(i);give(t);
  if(!dbl)w.last={i:i,c:t.c,xp:t.xp,pu:t.pu,at:Date.now()};
  else w.last=null;
  BB.save();return t;
}
function dblLast(){
  const w=st(),L=w.last;
  if(!L||Date.now()-L.at>12e5)return null;
  const t=TIERS[L.i];if(!t||!claimed(L.i))return null;
  return t;
}
function claimPrize(dbl){
  const w=st(),pz=w.prize;if(!pz)return null;
  BB.S.coins+=pz.coins*(dbl?2:1);BB.save();w.prize=null;BB.save();return pz;
}
function setRank(n){const w=st();if(n>0)w.rank=n}
function rank(){return st().rank||0}
function pts(){return st().pts}
function dayPts(){return st().dayPts}

/* ---------- HTML ---------- */
function cd(ms){
  const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5);
  if(d)return d+I18N.t('time.d')+(h?' '+h+I18N.t('time.h'):'');
  if(h)return h+I18N.t('time.h')+' '+Math.floor(ms%36e5/6e4)+I18N.t('time.m');
  return Math.floor(ms/6e4)+I18N.t('time.m');
}
function puName(p){return p?I18N.t('pu.'+p):''}
function rwLabel(t){
  const a=[];if(t.c)a.push('+'+nf(t.c)+' {bolt}');if(t.xp)a.push('+'+t.xp+' XP');
  if(t.pu)a.push('{'+(t.pu==='bomb'?'bomb':'hammer')+'} '+puName(t.pu));
  return a.join(' · ');
}
function card(){
  const w=st(),left=wleft(),f=wfrac();
  const nt=nextTier(),nx=nt>=0?TIERS[nt]:null;
  const rk=rank();
  let h='<div class="wrace">'+
    '<div class="wr-h"><div class="wr-t">{flag-2} '+I18N.t('week.title')+'</div>'+
    '<div class="wr-cd">{clock} '+cd(left)+'</div></div>'+
    '<div class="wr-nums">'+
      '<div class="wr-n"><b>'+nf(w.pts)+'</b><span>'+I18N.t('week.pts')+'</span></div>'+
      '<div class="wr-n"><b>'+(rk?'#'+rk:'—')+'</b><span>'+I18N.t('week.place')+'</span></div>'+
      '<div class="wr-n"><b>'+nf(w.dayPts)+'/'+nf(DAY_CAP)+'</b><span>'+I18N.t('week.today')+'</span></div>'+
    '</div>'+
    '<div class="wr-bar"><u style="width:'+(nx?Math.min(100,Math.round(w.pts/nx.p*100)):100)+'%"></u></div>'+
    '<div class="wr-tiers">';
  TIERS.forEach((t,i)=>{
    const cl=claimed(i),ok=w.pts>=t.p;
    h+='<button class="wr-tier '+(cl?'done':(ok?'on':'lock'))+'" data-wr="'+i+'"'+(cl||!ok?' disabled':'')+'>'+
       '<b>'+nf(t.p)+'</b><em class="ttx">'+ix(rwLabel(t))+'</em>'+
       '<em class="tic">'+ix(cl?'{check}':'{gift}')+'</em></button>';
  });
  h+='</div>';
  if(nx)h+='<div class="wr-next">{gift} '+I18N.t('week.next')+' <b>'+nf(nx.p)+'</b> → '+ix(rwLabel(nx))+'</div>';
  const dl=dblLast();
  if(dl)h+='<div class="wr-foot"><span>'+I18N.t('week.got')+' '+ix(rwLabel(dl))+'</span>'+
    '<button class="btn m sm" id="wrDbl">{bolt} ×2</button></div>';
  else{
    const pend=TIERS.filter((t,i)=>!claimed(i)&&w.pts>=t.p).length;
    h+='<div class="wr-foot"><span>'+I18N.t('week.hint')+'</span>'+
      (pend?'<em>'+I18N.t('week.ready').replace('{n}',pend)+'</em>'
           :(nx?'<em>'+nf(Math.max(0,nx.p-w.pts))+' '+I18N.t('week.left')+'</em>':''))+'</div>';
  }
  h+='</div>';
  if(w.prize){const pz=w.prize;
    h+='<div class="wr-prize"><div class="wp-t">{trophy} '+I18N.t('week.prize')+' · '+I18N.t('week.placeN')+' '+pz.place+'</div>'+
      '<div class="wp-s">'+I18N.t('week.prizesub').replace('{n}',nf(pz.pts))+'</div>'+
      '<div class="wp-b"><button class="btn p sm" id="wrPz">{bolt} +'+nf(pz.coins)+'</button>'+
      '<button class="btn m sm" id="wrPz2">{bolt} ×2</button></div></div>';
  }
  return h;
}
function bind(root){
  root.querySelectorAll('[data-wr]').forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.wr,w=st(),t=TIERS[i];
    if(!t||claimed(i)||w.pts<t.p)return;
    AUDIO.click();claim(i,false);
    UI.toast('{gift}',I18N.t('week.got')+' '+rwLabel(t).replace(/[{}]/g,''),I18N.t('week.dblhint'));
    UI.renderHub();
  });
  const db=root.querySelector('#wrDbl');
  if(db)db.onclick=async()=>{
    const t=dblLast();if(!t)return;
    const r=await P.rewarded('week_double');
    if(r.ok){const w=st();w.last=null;give(t);BB.save();P.track('ad_reward',{reason:'week_double'});
      AUDIO.reward();UI.toast('{bolt}',I18N.t('week.dbl')+' '+rwLabel(t).replace(/[{}]/g,''));UI.renderHub()}
    else UI.toast('{alert-triangle}',I18N.t('toast.watchad'));
  };
  const pz=root.querySelector('#wrPz');
  if(pz)pz.onclick=()=>{const p=claimPrize(false);if(p){AUDIO.reward();
    UI.toast('{trophy}',I18N.t('week.prize')+': +'+nf(p.coins)+' {bolt}'.replace(/[{}]/g,''));UI.renderHub()}};
  const pz2=root.querySelector('#wrPz2');
  if(pz2)pz2.onclick=async()=>{
    const p=st().prize;if(!p)return;
    const r=await P.rewarded('week_prize');
    if(r.ok){claimPrize(true);P.track('ad_reward',{reason:'week_prize'});AUDIO.reward();
      UI.toast('{trophy}',I18N.t('week.prize')+': +'+nf(p.coins*2));UI.renderHub()}
    else UI.toast('{alert-triangle}',I18N.t('toast.watchad'));
  };
}
/* плашка «твоя позиция» над лидербордом */
function pos(rows){
  const me=rows.find(r=>r.me);
  if(!me)return '';
  const above=rows.filter(r=>!r.me&&r.score>(me.score||0)).sort((a,b)=>a.score-b.score)[0];
  const gap=above?Math.max(1,Math.round(above.score-(me.score||0))):0;
  return '<div class="lbpos"><span class="rk">'+(me.rank?'#'+me.rank:'#—')+'</span>'+
    '<div class="lp-t">'+I18N.t('week.you')+' · '+nf(me.score)+'</div>'+
    '<em>'+(above?I18N.t('week.gap').replace('{n}',nf(gap)):I18N.t('week.top1'))+'</em></div>';
}
function menu(){
  const w=st(),nt=nextTier(),nx=nt>=0?TIERS[nt]:null;
  const mt=document.getElementById('menuTop');
  if(mt){const bd=mt.querySelector('.mbdg');const n=claimable();
    if(bd){bd.textContent=n>9?'9+':(n||'');bd.classList.toggle('on',n>0)}}
  const el=document.getElementById('menuWeek');if(!el)return;
  const t=el.querySelector('#mwT'),u=el.querySelector('#mwS'),g=el.querySelector('#mwGo'),
        b=el.querySelector('#mwBar'),d=el.querySelector('.mbdg');
  const n=claimable();
  if(d){d.textContent=n>9?'9+':(n||'');d.classList.toggle('on',n>0)}
  el.classList.toggle('claim',n>0);
  if(t)t.textContent=I18N.t('week.title');
  if(u)u.textContent=nf(w.pts)+' '+I18N.t('week.pts')+' · '+(rank()?'#'+rank():'')+
    (rank()?' · ':'')+I18N.t('week.ends')+' '+cd(wleft());
  if(g)g.innerHTML=n?('<b>'+I18N.t('chain.get')+'</b>'):('<svg class="ic"><use href="#i-flag-2"/></svg>');
  if(b)b.style.width=(nx?Math.min(100,Math.round(w.pts/nx.p*100)):100)+'%';
}
window.WEEK={ensure:rollover,add:add,claim:claim,claimPrize:claimPrize,dblLast:dblLast,claimable:claimable,pts:pts,dayPts:dayPts,rank:rank,setRank:setRank,
  bots:bots,card:card,bind:bind,pos:pos,menu:menu,tiers:tiers,wleft:wleft,DAY_CAP:DAY_CAP,
  racePts:racePts,state:st};
})();
