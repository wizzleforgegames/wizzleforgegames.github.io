/* ================= BlockBlastik core ================= */
(function(){
let N=8;
const KEY='bb_save_v1';
const GRID_MULT={8:1,9:1.15,10:1.32};
const DIFF_TIER={1:-0.25,2:0.3,3:0.75,4:1.3};
const DIFF_MULT={1:1,2:1.12,3:1.28,4:1.5};
const UNLOCK={grid9:4,grid10:7,diff2:2,diff3:5,diff4:10};
let ACC='#3FE3FF';
const UIH=()=>window.UI||{quest(){},syncHud(){},toast(){},checkLevel(){},checkAch(){},onGameOver(){},onGameStart(){},syncArmed(){}};
const THEME_PAL={
 neon:[['#3FE3FF','#0E7FA8'],['#FF5BD4','#8E2A8E'],['#9BFF4D','#3E8F22'],['#FFC13D','#A86A10'],['#8B6CFF','#4A32A8'],['#FF7A4D','#A8411F'],['#4DFFB8','#17946F'],['#FF5F6D','#A32A38']],
 midnight:[['#6FA8FF','#1E4C93'],['#A78BFF','#4B2E9A'],['#4FD1C5','#146B66'],['#F0ABFC','#8A3E9A'],['#7DD3FC','#1E6A8F'],['#FFB86B','#8F5A1E'],['#86EFAC','#2A7A4A'],['#FCA5A5','#8F2E3A']],
 sunset:[['#FF8A5B','#8F3A1E'],['#FF4D8D','#8F2350'],['#FFC13D','#8F6A10'],['#FF5BD4','#8F2A7A'],['#FFD166','#8F7A20'],['#FF6B6B','#8F2E2E'],['#C77DFF','#5A2A8F'],['#6EE7B7','#1E7A5A']],
 mint:[['#34E39A','#0E7A4E'],['#7CFFB2','#2A8F5A'],['#00D6C0','#0A6E63'],['#B6FF6E','#4A8F22'],['#4DD0E1','#146A7A'],['#FFE066','#8F7A1E'],['#FF8A65','#8F3A20'],['#A7F3D0','#2A7A5A']],
 cyber:[['#FF2E97','#8F1A52'],['#00E5FF','#0A6E7A'],['#B026FF','#5A1A8F'],['#FFE600','#8F8010'],['#00FFA3','#0A7A52'],['#FF6B35','#8F3A15'],['#7DF9FF','#1E7A8F'],['#FF4FD8','#8F2A78']]
};
let gestured=false;
try{window.addEventListener('pointerdown',()=>{gestured=true},{once:true,passive:true});
    window.addEventListener('keydown',()=>{gestured=true},{once:true})}catch(e){}
function vibe(p){if(!gestured)return;try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}
function hexRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
const PAL=[
 {a:'#3FE3FF',b:'#0E7FA8',g:'rgba(63,227,255,'},
 {a:'#FF5BD4',b:'#8E2A8E',g:'rgba(255,91,212,'},
 {a:'#9BFF4D',b:'#3E8F22',g:'rgba(155,255,77,'},
 {a:'#FFC13D',b:'#A86A10',g:'rgba(255,193,61,'},
 {a:'#8B6CFF',b:'#4A32A8',g:'rgba(139,108,255,'},
 {a:'#FF7A4D',b:'#A8411F',g:'rgba(255,122,77,'},
 {a:'#4DFFB8',b:'#17946F',g:'rgba(77,255,184,'},
 {a:'#FF5F6D',b:'#A32A38',g:'rgba(255,95,109,'}
];
function mixHex(a,b,t){const A=hexRgb(a),B=hexRgb(b);
  return '#'+[0,1,2].map(i=>Math.round(A[i]+(B[i]-A[i])*t).toString(16).padStart(2,'0')).join('');}
function setThemePal(id){
  const t=THEME_PAL[id]||THEME_PAL.neon;
  for(let i=0;i<PAL.length;i++){
    const [a,b]=t[i%t.length];
    PAL[i].a=a;PAL[i].b=b;PAL[i]._i=i;
    const r=hexRgb(a);PAL[i].g='rgba('+r[0]+','+r[1]+','+r[2]+',';
  }
  ACC=t[0][0];
  resetGlow();
  for(const k in SPR)delete SPR[k];
}
const BASE=[
 [[0,0]],
 [[0,0],[1,0]],
 [[0,0],[1,0],[2,0]],
 [[0,0],[1,0],[2,0],[3,0]],
 [[0,0],[1,0],[2,0],[3,0],[4,0]],
 [[0,0],[1,0],[0,1],[1,1]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
 [[0,0],[0,1],[1,1]],
 [[0,0],[1,0],[0,1],[0,2]],
 [[0,0],[1,0],[2,0],[1,1]],
 [[0,0],[1,0],[1,1],[2,1]],
 [[0,0],[1,0],[2,0],[2,1]],
 [[0,0],[1,0],[2,0],[0,1],[0,2]],
 [[0,0],[1,0],[1,1],[1,2]],
 [[0,0],[1,0],[2,0],[1,1],[1,2]],
 [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
 [[0,0],[2,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[2,0],[3,0],[1,1],[2,1]],
 [[0,0],[1,0],[2,0],[0,2],[1,2],[2,2]],
 [[0,0],[1,0],[2,0],[0,1],[2,1]]
];
function norm(c){const mx=Math.min(...c.map(p=>p[0])),my=Math.min(...c.map(p=>p[1]));
  return c.map(p=>[p[0]-mx,p[1]-my]).sort((x,y)=>x[0]-y[0]||x[1]-y[1]);}
function key(c){return c.map(p=>p[0]+','+p[1]).join(';');}
function rot(c){return norm(c.map(p=>[p[1],-p[0]]));}
function mir(c){return norm(c.map(p=>[-p[0],p[1]]));}
const SHAPES=(function(){
  const out=[],seen=new Set();
  for(const b of BASE){
    let cur=[norm(b)];
    for(let i=0;i<3;i++)cur.push(rot(cur[cur.length-1]));
    const all=cur.concat(cur.map(c=>mir(c)));
    for(const c of all){const k=key(c); if(seen.has(k))continue; seen.add(k);
      let w=0,mx=0,my=0; c.forEach(p=>{mx=Math.max(mx,p[0]);my=Math.max(my,p[1])});
      const n=c.length;
      out.push({cells:c,w:1,n,w2:mx+1,h2:my+1});
    }
  }
  const T={1:3,2:8,3:22,4:33,5:18,6:9,7:4,8:2,9:3};
  const cnt={};out.forEach(o=>cnt[o.n]=(cnt[o.n]||0)+1);
  out.forEach(o=>{o.w=(T[Math.min(9,o.n)]||2)/(cnt[o.n]||1);
    if(o.w2>=5||o.h2>=5)o.w*=0.8;});
  return out;
})();
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const dayNum=(s)=>{const p=s.split('-');return Math.floor(Date.UTC(+p[0],+p[1]-1,+p[2])/86400000);};

/* ---------- save ---------- */
const DEF={v:1,coins:0,xp:0,level:1,best:{classic:0,sprint:0,daily:0},
 daily:{date:'',played:false,best:0}, streak:{n:0,last:'',pending:null}, freeze:1, freezeDay:'', rescue:{day:'',n:0}, rg:null, chest:{next:0},
 quests:{date:'',list:[]}, ach:{}, season:{xp:0,claimed:[]},
 set:{sound:true,music:true,vib:true}, stats:{games:0,lines:0,places:0,pu:0,blasts:0,perfects:0,maxCombo:0,sprintBest:0},
 noAds:false,golden:false,first:true,invites:0,rated:false,rateSkip:0,rateBonus:false,gridN:8,diffTier:1,unlockedShown:{},
 wheel:{date:'',free:1,ads:0,coins:0},wheelBoost:0,deal:{id:0,until:0},lastSeen:0,updatedAt:0,
 bonus:{date:'',done:false,score:0},
 skin:'neon',skins:[],trial:{id:'',games:0},wquests:{week:'',list:[]},notif:false,notifBonus:false,fav:false,favBonus:false,rpSkip:0,freeAd:{date:'',n:0},puAd:{date:'',n:0},hintAd:{date:'',n:0},firstBuy:false,starterBought:false,ob:0};
let S=JSON.parse(JSON.stringify(DEF));
function loadSave(){try{const r=localStorage.getItem(KEY);if(r){const o=JSON.parse(r);
  S=Object.assign(JSON.parse(JSON.stringify(DEF)),o);
  S.best=Object.assign({classic:0,sprint:0,daily:0},o.best||{});
  S.set=Object.assign({sound:true,music:true,vib:true},o.set||{});
  S.stats=Object.assign(JSON.parse(JSON.stringify(DEF.stats)),o.stats||{});
}}catch(e){}}
let saveT=0,cloudT=0;
function save(){S.updatedAt=Date.now();clearTimeout(saveT);saveT=setTimeout(()=>{
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
  clearTimeout(cloudT);cloudT=setTimeout(()=>{try{window.P&&P.cloudSet(S)}catch(e){}},8000);
},250);}
/* cloud save (VK Play storage): merge remote into the live S object in place */
function adoptRemote(o){if(!o||typeof o!=='object')return false;
  try{const d=JSON.parse(JSON.stringify(DEF));const m=Object.assign(d,o);
    m.best=Object.assign({classic:0,sprint:0,daily:0},o.best||{});
    m.set=Object.assign({sound:true,music:true,vib:true},o.set||{});
    m.stats=Object.assign(JSON.parse(JSON.stringify(DEF.stats)),o.stats||{});
    Object.keys(d).forEach(k=>{S[k]=m[k]});save();return true;
  }catch(e){return false}}
function pushCloud(){try{window.P&&P.cloudFlush()}catch(e){}}
loadSave();
const LOCAL_UPD=Number(S.updatedAt)||0; /* as loaded from disk, before any boot mutation */

/* ---------- runtime ---------- */
const G={
 get N(){return N}, grid:new Int8Array(N*N), pieces:[], mode:'classic', running:false, over:false,
 score:0, combo:0, streak:0, blast:0, blastTurns:0, blastReady:false, rescue:false, revives:0, seedRng:null, demo:false,
 timeLeft:60, gained:0, placedThisGame:0, linesThisGame:0, maxComboThis:0, blastsThisGame:0, perfectsThisGame:0,
 bonus:false, bonusAd:0, bonusTime:0
};
const PU_COST={hammer:250,swap:150,bomb:400};
const HINT_COST=90;
const PU_FREE={hammer:0,swap:0,bomb:0};

/* ---------- canvas ---------- */
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
let W=0,H=0,DPR=1, L={cell:0,bx:0,by:0,bs:0,trayY:0,trayH:0,slots:[]};
const parts=[], floats=[], clearing=[], shake={t:0,m:0};
const flash={a:0,c:'255,255,255'};
const GLOWC=[];
function glowSprite(ci){ ci=Math.max(0,Math.min(PAL.length-1,ci|0)); if(GLOWC[ci])return GLOWC[ci];
  const s=64,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
  const p=PAL[ci];const rg=g.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,'rgba(255,255,255,.55)');rg.addColorStop(.14,p.a);rg.addColorStop(.46,p.g+'0.30)');rg.addColorStop(1,p.g+'0)');
  g.fillStyle=rg;g.fillRect(0,0,s,s);GLOWC[ci]=c;return c;}
function resetGlow(){for(let i=0;i<GLOWC.length;i++)GLOWC[i]=null;}
function doFlash(ci,a){const p=PAL[Math.max(0,Math.min(PAL.length-1,ci))];flash.c=p.g.slice(6,-1);flash.a=Math.max(flash.a,a);}
let hintCells=[];
let spawnCells=[];
let tension=99;
function resize(){
  const r=cv.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,(window.BG&&BG.quality===0)?1.25:2);
  if(W===r.width&&H===r.height&&cv.width===Math.round(r.width*dpr)&&cv.height===Math.round(r.height*dpr))return;
  W=r.width;H=r.height;DPR=dpr;
  cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  for(const k in SPR)delete SPR[k];
  resetGlow();
  layout();
}
function hudBox(){
  const el=document.getElementById('hud');
  if(!el)return {w:0,h:0};
  const r=el.getBoundingClientRect();
  return {w:r.width||0,h:r.height||0};
}
function layout(){
  if(W<40||H<40)return;
  const wide = (W/H)>1.12;
  const hb=hudBox();
  if(wide){
    const pad=14, topH=Math.min(14,H*0.045);
    let hudW=Math.max(150,Math.min(215,W*0.19));
    if(hb.w)hudW=Math.max(140,Math.min(280,hb.w+24));
    let trayW=Math.max(104,Math.min(W*0.155,178));
    const gap=Math.max(16,Math.min(34,W*0.03));
    let availH=H-topH-pad*2, availW=W-pad*2-trayW-gap*2-hudW;
    if(availW<N*20){hudW=Math.max(120,W*0.14);availW=W-pad*2-trayW-gap*2-hudW;}
    let cell=Math.floor(Math.min(availW/N,availH/N));
    cell=Math.max(16,cell);
    const bs=cell*N;
    const groupW=bs+gap+trayW;
    const regionX=pad+hudW+gap, regionW=W-regionX-pad;
    const sx=Math.round(regionX+Math.max(0,(regionW-groupW)/2));
    L.cell=cell;L.bs=bs;L.gap=gap;L.topH=topH;L.wide=true;
    L.bx=sx; L.by=Math.round(topH+(availH-bs)/2);
    L.trayW=trayW; L.trayH=bs; L.trayY=L.by;
    const tH=bs, sg=Math.min(12,tH*0.028), each=(tH-sg*2)/3;
    L.slots=[0,1,2].map(i=>({x:Math.round(sx+bs+gap),y:Math.round(L.by+i*(each+sg)),w:Math.round(trayW),h:Math.round(each)}));
    return;
  }
  L.wide=false;
  const pad=10, topH=Math.max(46,Math.min(hb.h?hb.h+18:H*0.09,H*0.34));
  const gap=Math.max(8,Math.min(18,H*0.022));
  let trayH=Math.max(74,Math.min(H*0.30,190));
  let avail=H-topH-pad*2-gap-trayH;
  let cell=Math.floor(Math.min((W-pad*2)/N, avail/N));
  if(cell<18){trayH=Math.max(64,H*0.20);avail=H-topH-pad*2-gap-trayH;cell=Math.floor(Math.min((W-pad*2)/N,avail/N));}
  cell=Math.max(14,cell);
  const bs=cell*N;
  trayH=Math.max(64,Math.min(trayH,Math.max(64,H-topH-pad*2-gap-bs)));
  L.cell=cell;L.bs=bs;L.gap=gap;L.topH=topH;
  const groupH=bs+gap+trayH;
  const startY=topH+Math.max(pad,(H-topH-groupH)/2);
  L.bx=Math.round((W-bs)/2); L.by=Math.round(startY);
  L.trayH=Math.round(trayH); L.trayY=Math.round(L.by+bs+gap);
  const sw=Math.min(bs,W-pad*2), sg=Math.min(12,sw*0.03), each=(sw-sg*2)/3;
  L.slots=[0,1,2].map(i=>({x:Math.round((W-sw)/2+i*(each+sg)),y:L.trayY,w:Math.round(each),h:L.trayH}));
}
function rr(c,x,y,w,h,r){if(w<=0||h<=0)return;c.beginPath();r=Math.max(0,Math.min(r,w/2,h/2));c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}

/* ---------- pieces ---------- */
function pickShape(rng,diff){
  const r=rng||Math.random;
  let tot=0; const ws=SHAPES.map(s=>{let w=s.w; if(diff>0)w*= (1+ (s.n-3)*0.14*diff); if(diff<0)w*=(1-(s.n-3)*0.1*diff); return w;});
  ws.forEach(w=>tot+=w);
  let x=r()*tot;
  for(let i=0;i<SHAPES.length;i++){x-=ws[i];if(x<=0)return SHAPES[i];}
  return SHAPES[0];
}
function diffLevel(){
  const base=DIFF_TIER[G.tier||1]||0;
  return Math.max(-0.35,Math.min(1.25,base+Math.min(0.45,G.score/3200*0.45)));
}
function scoreMult(){return (DIFF_MULT[G.tier||1]||1)*(GRID_MULT[N]||1)*(G.bonus?3:1)}
function maxGrid(){return S.level>=UNLOCK.grid10?10:(S.level>=UNLOCK.grid9?9:8)}
function maxTier(){return S.level>=UNLOCK.diff4?4:(S.level>=UNLOCK.diff3?3:(S.level>=UNLOCK.diff2?2:1))}
function dailyGrid(){const l=S.level;return l>=UNLOCK.grid10?10:(l>=UNLOCK.grid9?9:8)}
function dailyTier(){return Math.max(1,Math.min(maxTier(),1+Math.floor(S.level/5)))}
function mkPiece(rng,d){
  const s=pickShape(rng,d);
  return {shape:s.cells,n:s.n,color:Math.floor((rng?rng():Math.random())*PAL.length),used:false};
}
/* can all pieces be placed (in some order) on the current board? */
function canPlaceAll(pcs,g){
  if(!pcs.length)return true;
  const p=pcs[0],rest=pcs.slice(1);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    let ok=true;
    for(const c of p.shape){const nx=x+c[0],ny=y+c[1];
      if(nx>=N||ny>=N||g[ny*N+nx]){ok=false;break}}
    if(!ok)continue;
    const put=[];for(const c of p.shape){const i=(y+c[1])*N+x+c[0];g[i]=1;put.push(i)}
    const r=canPlaceAll(rest,g);
    for(const i of put)g[i]=0;
    if(r)return true;
  }
  return false;
}
function trayPlayable(pcs){
  const g=new Int8Array(N*N);
  for(let i=0;i<N*N;i++)g[i]=G.grid[i]?1:0;
  return canPlaceAll(pcs,g);
}
/* ---------- генератор наборов: решение ВСЕГДА есть, но насколько оно очевидное —
   зависит от сложности. На высоких тирах фигура может встать только после того,
   как игрок другой фигурой добьёт ряд/столбец и освободит место (цепочка). ---------- */
function gFits(sh,g,x,y){
  for(const c of sh){const nx=x+c[0],ny=y+c[1];
    if(nx<0||ny<0||nx>=N||ny>=N||g[ny*N+nx])return false}
  return true;
}
function gClears(sh,g,x,y){
  const cov=new Set();sh.forEach(c=>cov.add((y+c[1])*N+x+c[0]));
  const rows=new Set(),cols=new Set();
  sh.forEach(c=>{rows.add(y+c[1]);cols.add(x+c[0])});
  let n=0;
  rows.forEach(r=>{let ok=true;for(let i=0;i<N;i++){const k=r*N+i;if(!g[k]&&!cov.has(k)){ok=false;break}}if(ok)n++});
  cols.forEach(c=>{let ok=true;for(let i=0;i<N;i++){const k=i*N+c;if(!g[k]&&!cov.has(k)){ok=false;break}}if(ok)n++});
  return n;
}
function gApplyClear(g,x,y,sh){
  const cov=new Set();sh.forEach(c=>cov.add((y+c[1])*N+x+c[0]));
  const rows=new Set(),cols=new Set();
  sh.forEach(c=>{rows.add(y+c[1]);cols.add(x+c[0])});
  const full=[];
  rows.forEach(r=>{let ok=true;for(let i=0;i<N;i++)if(!g[r*N+i]){ok=false;break}if(ok)full.push(['r',r])});
  cols.forEach(c=>{let ok=true;for(let i=0;i<N;i++)if(!g[i*N+c]){ok=false;break}if(ok)full.push(['c',c])});
  full.forEach(([t,v])=>{for(let i=0;i<N;i++)g[t==='r'?v*N+i:i*N+v]=0});
}
/* существует ли порядок установки всех фигур (с авто-очисткой линий), при котором
   все они встанут. Это гарантия того, что у игрока всегда есть ход. */
function chainSolvable(pcs,g,useClears){
  if(!pcs.length)return true;
  for(let i=0;i<pcs.length;i++){
    const sh=pcs[i].shape, rest=pcs.filter((_,j)=>j!==i);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      if(!gFits(sh,g,x,y))continue;
      const put=[];sh.forEach(c=>{const k=(y+c[1])*N+x+c[0];g[k]=1;put.push(k)});
      let ok=false;
      if(useClears&&gClears(sh,g,x,y)>0){
        const g2=Int8Array.from(g);gApplyClear(g2,x,y,sh);
        ok=chainSolvable(rest,g2,true);
      } else {
        ok=chainSolvable(rest,g,useClears);
      }
      put.forEach(k=>g[k]=0);
      if(ok)return true;
    }
  }
  return false;
}
function trayStats(pcs,g){
  let fitsSum=0,imm=0,clearMax=0,bestN=99,worstN=0,awk=0;
  for(const p of pcs){
    let f=0,cm=0;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(gFits(p.shape,g,x,y)){f++;cm=Math.max(cm,gClears(p.shape,g,x,y))}
    fitsSum+=f; if(f>0)imm++; clearMax+=cm;
    const w=Math.max(...p.shape.map(c=>c[0]))+1,h=Math.max(...p.shape.map(c=>c[1]))+1;
    bestN=Math.min(bestN,p.shape.length); worstN=Math.max(worstN,p.shape.length);
    awk+=(Math.max(w,h)>=4?1:0)+(p.shape.length>=5?1:0)+(w>1&&h>1&&p.shape.length<4?1:0)-(p.shape.length===1?1:0);
  }
  return {fitsSum,imm,clearMax,bestN,worstN,awk};
}
function trayScore(st,tier,gift){
  if(st.imm===0)return -1e9;                       // ни одна фигура не встаёт сейчас = тупик
  if(st.worstN>6||st.bestN<0)return -1e9;
  let s=0;
  if(tier<=1)      s= st.fitsSum*2 + st.clearMax*34 + (st.imm===3?50:0);
  else if(tier===2)s= st.fitsSum*1 + st.clearMax*20 + (st.imm===3?25:0);
  else if(tier===3)s= -st.fitsSum*1.8 + st.clearMax*12 + (st.imm<3?45:0) + (st.imm>=1?20:0) + st.awk*8;
  else             s= -st.fitsSum*3.4 + (st.clearMax===0?60:st.clearMax*2) + (st.imm===1?60:(st.imm===2?40:0)) + st.awk*14;
  if(gift) s+= st.clearMax*40;                     // иногда дарим «подарок» — ряд сам просится
  if(st.imm===1&&tier<=2) s-=60;                   // на лёгком не загоняем в единственный ход
  return s;
}
function newTray(){
  const rng=G.seedRng, tier=G.tier||1;
  const d=rng?0:diffLevel();
  const g=new Int8Array(N*N);
  for(let i=0;i<N*N;i++)g[i]=G.grid[i]?1:0;
  const useClears=tier>=3;
  const gift=rng?false:(Math.random()<0.22);
  let best=null,bs=-1e9,fallback=null;
  const tries=tier>=3?18:14;
  for(let a=0;a<tries;a++){
    const pcs=[mkPiece(rng,d),mkPiece(rng,d),mkPiece(rng,d)];
    if(!fallback)fallback=pcs;
    if(!chainSolvable(pcs,Int8Array.from(g),useClears))continue;
    const st=trayStats(pcs,g);
    const sc=trayScore(st,tier,gift);
    if(sc>bs){bs=sc;best=pcs;if(sc>0&&a>2&&tier<=2&&st.imm===3&&st.clearMax>0)break}
  }
  if(!best){ // страховка: подбираем по одной заведомо встающей фигуре
    best=[];
    for(let i=0;i<3;i++){
      for(let a=0;a<40;a++){const p=mkPiece(rng,d);if(anyFit(p)){best.push(p);break}}
      if(best.length<i+1)best.push({shape:[[0,0]],n:1,color:Math.floor(Math.random()*PAL.length),used:false});
    }
  }
  {const t0=performance.now();best.forEach((p,ix)=>{p.t0=t0+ix*90});}
  G.pieces=best;
  tension=tensionOf();
}
function tensionOf(){
  let s=0;
  for(const p of G.pieces){if(p.used)continue;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(fits(p,x,y))s++;
    if(s>26)return s;}
  return s;
}
function fits(p,ox,oy){
  for(const c of p.shape){const x=ox+c[0],y=oy+c[1];
    if(x<0||y<0||x>=N||y>=N)return false;
    if(G.grid[y*N+x])return false;}
  return true;
}
function anyFit(p){for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(fits(p,x,y))return true;return false;}
function boardHasRoom(){return G.pieces.some(p=>!p.used&&anyFit(p));}
/* game over check — ждём, пока доедут анимации снятия линий/бласта */
function checkOver(){
  overTries=0;
  if(!G.running||G.over)return;
  const now=performance.now();
  for(let k=clearing.length-1;k>=0;k--){const c=clearing[k];if(!c.t0||now-c.t0>900)clearing.splice(k,1);}
  if(clearing.length&&scheduleOver())return;
  if(!boardHasRoom()){
    if(blastReady()&&!G.rescue){G.rescue=true;banner(I18N.t('blast.rescue'));UIH().syncHud();return}
    endGame();
  }
}
let overT=null,overTries=0;
function scheduleOver(){if(overTries++>25){overTries=0;return false}clearTimeout(overT);overT=setTimeout(checkOver,120);return true}


/* ---------- attract mode: доска в меню «играет сама» ---------- */
function demoScore(sh,g,x,y){
  const put=[];sh.forEach(c=>put.push((y+c[1])*N+x+c[0]));
  put.forEach(k=>{g[k]=1});
  const cl=gClears(sh,g,x,y);
  let adj=0,hole=0;
  put.forEach(k=>{const cx=k%N,cy=(k/N)|0;
    for(let d=0;d<4;d++){const nx=cx+(d===0?1:d===1?-1:0),ny=cy+(d===2?1:d===3?-1:0);
      if(nx<0||ny<0||nx>=N||ny>=N)continue; if(g[ny*N+nx])adj++;}});
  for(let i=0;i<N*N;i++){if(g[i])continue;const cx=i%N,cy=(i/N)|0;let w=0;
    for(let d=0;d<4;d++){const nx=cx+(d===0?1:d===1?-1:0),ny=cy+(d===2?1:d===3?-1:0);
      if(nx<0||ny<0||nx>=N||ny>=N||g[ny*N+nx])w++;}
    if(w===4)hole++;}
  put.forEach(k=>{g[k]=0});
  let sc=cl*cl*260+adj*15-hole*46;
  const cx=x+sh[0][0]+0.5,cy=y+sh[0][1]+0.5;
  sc+=(N/2-Math.abs(cx-N/2))*3+(N/2-Math.abs(cy-N/2))*2;
  return sc;
}
function demoBot(){
  if(G.over||!G.running)return false;
  const idx=[0,1,2].filter(i=>G.pieces[i]&&!G.pieces[i].used);
  if(!idx.length)return false;
  const g=Int8Array.from(G.grid);
  let best=null;
  for(let q=0;q<idx.length;q++){
    const pi=idx[q],sh=G.pieces[pi].shape;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      if(!gFits(sh,g,x,y))continue;
      const sc=demoScore(sh,g,x,y)+Math.random()*20;
      if(!best||sc>best.sc)best={pi:pi,x:x,y:y,sc:sc};
    }
  }
  if(!best)return false;
  place(G.pieces[best.pi],best.x,best.y);
  return true;
}
/* ---------- scoring ---------- */
const LINE_MULT=[0,1,2.4,4.2,6.6,9,12,15,19];
function place(p,ox,oy){
  let cells=0;
  const st0=performance.now();
  for(const c of p.shape){const idx=(oy+c[1])*N+ox+c[0];G.grid[idx]=p.color+1;cells++;
    spawnCells.push({i:idx,t0:st0+c[1]*26+c[0]*18});}
  G.score+=Math.round(cells*scoreMult()); G.placedThisGame++; if(!G.demo)S.stats.places++;
  AUDIO.drop();
  const rows=[],cols=[];
  for(let y=0;y<N;y++){let f=true;for(let x=0;x<N;x++)if(!G.grid[y*N+x]){f=false;break}if(f)rows.push(y);}
  for(let x=0;x<N;x++){let f=true;for(let y=0;y<N;y++)if(!G.grid[y*N+x]){f=false;break}if(f)cols.push(x);}
  const lines=rows.length+cols.length;
  if(lines>0){
    G.combo++; G.streak++; G.maxComboThis=Math.max(G.maxComboThis,G.combo);
    if(!G.demo)S.stats.maxCombo=Math.max(S.stats.maxCombo,G.combo);
    const mult=(LINE_MULT[Math.min(lines,8)]||20)*(1+0.22*(G.combo-1));
    let pts=Math.round(10*N*lines*mult*scoreMult()*(G.blastTurns>0?2:1));
    G.score+=pts; G.linesThisGame+=lines; if(!G.demo)S.stats.lines+=lines;
    const set=new Set();
    rows.forEach(y=>{for(let x=0;x<N;x++)set.add(y*N+x)});
    cols.forEach(x=>{for(let y=0;y<N;y++)set.add(y*N+x)});
    const cnow=performance.now();
    set.forEach(i=>clearing.push({i,t:0,color:G.grid[i]-1,t0:cnow}));
    setTimeout(()=>{
      set.forEach(i=>{spawnBurst(i,G.grid[i]-1);G.grid[i]=0;
        const sx=spawnCells.findIndex(x=>x.i===i);if(sx>=0)spawnCells.splice(sx,1);});
      lineWave(rows,cols,Math.min(lines-1,7));
      doFlash(Math.min(lines-1,7),Math.min(0.20,0.05+lines*0.035));
      let empty=true;for(let i=0;i<N*N;i++)if(G.grid[i]){empty=false;break}
      if(empty){G.score+=200+50*S.level;if(!G.demo)S.stats.perfects++;G.perfectsThisGame=(G.perfectsThisGame||0)+1;banner(I18N.t('toast.perfect'));AUDIO.reward();shake.t=.45;shake.m=7;UIH().quest('perfect',1);
        try{window.BG&&BG.pulse(PAL[2].g.slice(6,-1))}catch(e){}
        scoreFloat('+'+(200+50*S.level),'#9BFF4D',30);}
      tension=tensionOf();scheduleOver();
    },240);
    AUDIO.clear(lines,G.combo);
    try{AUDIO.intens(Math.min(3,G.combo+(G.blastTurns>0?2:0)))}catch(e){}
    if(S.set&&S.set.vib){vibe(lines>1?[18,26,18]:18)}
      try{P.taptic(lines>2?'heavy':'light')}catch(e){}
    shake.t=Math.min(.5,.14+lines*.06); shake.m=3+lines*2.2;
    scoreFloat('+'+pts,PAL[Math.min(lines-1,7)].a,20+lines*4);
    if(G.combo>=2){banner(I18N.t('toast.combo')+' ×'+G.combo);AUDIO.combo(G.combo);}
    G.blast=Math.min(G.blastMax,G.blast+lines+(G.combo>=3?1:0));
    if(G.combo>=2)UIH().quest('combo',G.combo);
    UIH().quest('lines',lines);
  } else { G.combo=0; G.streak=0; }
  if(G.blastTurns>0)G.blastTurns--;
  G.rescue=false;
  if(G.blast>=(G.blastMax||10)&&G.blastTurns<=0&&!G.blastReady){G.blastReady=true;onBlastReady();}
  p.used=true;
  UIH().quest('place',1);
  if(!G.pieces.some(q=>!q.used)) newTray(); else tension=tensionOf();
  if(lines>0) setTimeout(checkOver,260); else checkOver();
  UIH().syncHud();
}
function blastTargets(){
  const rf=new Int16Array(N),cf=new Int16Array(N);
  for(let i=0;i<N*N;i++)if(G.grid[i]){rf[(i/N)|0]++;cf[i%N]++;}
  const cand=[];
  for(let i=0;i<N*N;i++){
    if(!G.grid[i])continue;
    const x=i%N,y=(i/N)|0;let nb=0;
    for(let d=0;d<4;d++){
      const nx=x+(d===0?1:d===1?-1:0),ny=y+(d===2?1:d===3?-1:0);
      if(nx>=0&&ny>=0&&nx<N&&ny<N&&G.grid[ny*N+nx])nb++;
    }
    let s=rf[y]+cf[x]+nb*1.4;
    if(rf[y]===1)s-=7;            // одинокий блок в почти пустом ряду — чистим первым
    if(cf[x]===1)s-=7;
    if(nb===0)s-=2.5;             // изолированный мусор
    if(rf[y]>=N-2)s+=20;          // не ломать ряды, которые игрок вот-вот закроет
    if(cf[x]>=N-2)s+=20;
    cand.push({i,s:s+Math.random()*0.9});
  }
  cand.sort((a,b)=>a.s-b.s);
  const k=Math.max(4,Math.min(cand.length,Math.round(N*1.2)));
  return cand.slice(0,k).map(c=>c.i);
}
function blastReady(){return !!(G.running&&!G.over&&G.blastReady&&G.blastTurns<=0);}
function blastMeter(){return {v:G.blast,max:G.blastMax||10,ready:!!G.blastReady,turns:G.blastTurns,rescue:!!G.rescue};}
function onBlastReady(){
  if(G.demo){UIH().syncHud();return}
  try{AUDIO.reward()}catch(e){}
  banner(I18N.t('blast.ready'));
  try{window.BG&&BG.pulse(PAL[3].g.slice(6,-1))}catch(e){}
  UIH().syncHud();
}
function fireBlast(){
  if(!G.running||G.over||!G.blastReady||G.blastTurns>0)return false;
  G.blastReady=false;G.blast=0;G.blastTurns=4;G.rescue=false;
  if(!G.demo)S.stats.blasts++;
  G.blastsThisGame=(G.blastsThisGame||0)+1;
  const pick=blastTargets();
  AUDIO.blast();try{AUDIO.intens(3)}catch(e){}
  try{if(S.set&&S.set.vib&&!G.demo){vibe([30,40,30]);P.taptic('heavy')}}catch(e){}
  banner(I18N.t('toast.blast'));shake.t=.6;shake.m=10;
  doFlash(3,0.28);
  try{window.BG&&BG.pulse(PAL[3].g.slice(6,-1))}catch(e){}
  const now=performance.now();
  pick.forEach((i,k)=>clearing.push({i,t:0,color:G.grid[i]-1,t0:now+k*40}));
  const bonus=pick.length*14;G.score+=bonus;
  setTimeout(()=>{
    pick.forEach(i=>{if(G.grid[i]){spawnBurst(i,G.grid[i]-1);G.grid[i]=0;
      const sx=spawnCells.findIndex(x=>x.i===i);if(sx>=0)spawnCells.splice(sx,1);}});
    scoreFloat('+'+bonus,'#FFC13D',26);
    tension=tensionOf();
    if(!boardHasRoom()&&!G.demo){newTray();}
    checkOver();UIH().syncHud();
  },420);
  UIH().quest('blast',1);
  UIH().syncHud();
  return true;
}
function spawnBurst(i,color){
  const cap=(window.BG&&BG.quality===0)?80:165;
  if(parts.length>cap)return;
  const x=L.bx+(i%N+0.5)*L.cell, y=L.by+(Math.floor(i/N)+0.5)*L.cell;
  const ci=Math.max(0,Math.min(PAL.length-1,color));
  const p=PAL[ci];
  for(let k=0;k<2;k++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*3.0;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1.0,life:1,r:L.cell*(0.07+Math.random()*0.10),c:p.a,ci:ci});
  }
  if(Math.random()<0.34)parts.push({x,y,vx:0,vy:0,life:1,r:L.cell*0.22,c:p.a,ring:true,ci:ci});
}
function lineWave(rows,cols,ci){
  const p=PAL[Math.max(0,Math.min(PAL.length-1,ci))];
  const all=rows.map(y=>({x:L.bx+L.bs/2,y:L.by+(y+0.5)*L.cell})).concat(cols.map(x=>({x:L.bx+(x+0.5)*L.cell,y:L.by+L.bs/2})));
  all.slice(0,3).forEach(o=>{if(parts.length<((window.BG&&BG.quality===0)?90:180))parts.push({x:o.x,y:o.y,vx:0,vy:0,life:1,r:L.cell*0.55,c:p.a,ring:true,ci:ci})});
}
let flSeq=0,flSeqAt=0,bnSeq=0,bnSeqAt=0;
function addFloat(x,y,txt,color,size){
  if(L.bs){x=Math.max(8,Math.min(W-8,x));y=Math.max(18,Math.min(H-30,y));}
  const el=document.createElement('div');el.className='float';el.textContent=txt;
  el.style.left=x+'px';el.style.top=y+'px';el.style.color=color;el.style.fontSize=(size||18)+'px';
  const fx=document.getElementById('fxLayer');fx.appendChild(el);
  const all=fx.querySelectorAll('.float');
  if(all.length>6)all[0].remove();
  setTimeout(()=>el.remove(),1100);
}
/* очки всплывают в верхнем «желобе» поля и расходятся по очереди —
   так они никогда не сливаются с крупным баннером внизу поля */
function scoreFloat(txt,color,size){
  const now=performance.now();
  if(now-flSeqAt>700){flSeq=0;flSeqAt=now}
  const y=(L.bs?L.by+L.bs*0.30:60)+(flSeq%4)*20;
  flSeq++;
  addFloat(L.bx+L.bs/2,y,txt,color,size);
}
let bannerUntil=0;
function banner(txt){
  bannerUntil=performance.now()+1300;
  const fx=document.getElementById('fxLayer');
  const now=performance.now();
  if(now-bnSeqAt>900){bnSeq=0;bnSeqAt=now}
  const el=document.createElement('div');el.className='banner';el.textContent=txt;
  if(L.bs){el.style.left=Math.round(L.bx+L.bs/2)+'px';
    const step=Math.max(44,Math.round(L.bs*0.085));
    el.style.top=Math.round(L.by+L.bs*0.70+(bnSeq%2)*step)+'px';}
  bnSeq++;
  fx.appendChild(el);
  const all=fx.querySelectorAll('.banner');
  if(all.length>2)all[0].remove();
  setTimeout(()=>el.remove(),1300);
}

/* ---------- draw ---------- */
let drag=null; // {pi, x,y, ox,oy, valid}
let armed=null; // 'hammer'|'bomb'|'swap'
function draw(ts){
  ctx.clearRect(0,0,W,H);
  let sx=0,sy=0;
  if(shake.t>0){shake.t-=0.016;const m=shake.m*Math.max(0,shake.t);sx=(Math.random()-.5)*m;sy=(Math.random()-.5)*m;}
  ctx.save();ctx.translate(sx,sy);
  drawBoard();drawTray();drawParticles();
  if(drag)drawDrag();
  ctx.restore();
  if(flash.a>0.01){ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='rgba('+flash.c+','+flash.a.toFixed(3)+')';ctx.fillRect(0,0,W,H);ctx.restore();
    flash.a*=0.86; if(flash.a<0.012)flash.a=0;}
  requestAnimationFrame(draw);
}
function socketSprite(S){
  const k='sk'+Math.round(S)+'|'+SKIN+'|'+ACC; let sp=SPR[k]; if(sp)return sp;
  const c=document.createElement('canvas');
  c.width=c.height=Math.ceil(S*DPR);
  const g=c.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);
  const r=Math.min(13,S*0.30);
  // recessed hole: dark plate, slightly darker than the board
  rr(g,0.5,0.5,S-1,S-1,r);
  const cg=g.createLinearGradient(0,0,0,S);
  cg.addColorStop(0,'rgba(2,5,12,.46)');cg.addColorStop(.6,'rgba(4,8,17,.34)');cg.addColorStop(1,'rgba(7,12,22,.24)');
  g.fillStyle=cg;g.fill();
  g.save();g.clip();
  // depth: shadow along the top edge
  const sg=g.createLinearGradient(0,0,0,S*0.6);
  sg.addColorStop(0,'rgba(0,0,0,.38)');sg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=sg;g.fillRect(0,0,S,S*0.6);
  // faint accent bounce from the bottom
  const ag=g.createLinearGradient(0,S*0.35,0,S);
  ag.addColorStop(0,ACC+'00');ag.addColorStop(1,ACC+'0D');
  g.fillStyle=ag;g.fillRect(0,0,S,S);
  g.restore();
  // rim: soft dark outline + light bottom edge (carved look)
  g.strokeStyle='rgba(255,255,255,.055)';g.lineWidth=1;
  rr(g,0.5,0.5,S-1,S-1,r);g.stroke();
  g.save();rr(g,0.5,0.5,S-1,S-1,r);g.clip();
  g.strokeStyle='rgba(255,255,255,.085)';g.lineWidth=1.3;
  g.beginPath();g.moveTo(S*0.24,S-1);g.lineTo(S*0.76,S-1);g.stroke();
  g.restore();
  sp=SPR[k]={_w:S,_h:S,c:c};
  return sp;
}
function drawBoard(){
  const {bx,by,bs,cell}=L;
  const tt0=performance.now();
  ctx.save();
  // outer halo
  const hg=ctx.createRadialGradient(bx+bs/2,by+bs/2,bs*0.30,bx+bs/2,by+bs/2,bs*0.92);
  hg.addColorStop(0,ACC+'22');hg.addColorStop(.62,ACC+'0D');hg.addColorStop(1,ACC+'00');
  ctx.fillStyle=hg;ctx.fillRect(bx-bs*0.45,by-bs*0.45,bs*1.9,bs*1.9);
  rr(ctx,bx-8,by-8,bs+16,bs+16,20);
  const g=ctx.createLinearGradient(0,by,0,by+bs);
  g.addColorStop(0,'rgba(255,255,255,.075)');g.addColorStop(.5,'rgba(255,255,255,.028)');g.addColorStop(1,'rgba(255,255,255,.05)');
  ctx.fillStyle=g;ctx.fill();
  const rg=ctx.createRadialGradient(bx+bs/2,by+bs*0.42,bs*0.05,bx+bs/2,by+bs/2,bs*0.78);
  rg.addColorStop(0,ACC+'1F');rg.addColorStop(1,ACC+'00');
  ctx.fillStyle=rg;ctx.fill();
  // slow diagonal sheen
  ctx.save();rr(ctx,bx-8,by-8,bs+16,bs+16,20);ctx.clip();
  const sh=(tt0*0.00006)%1, sx0=bx-8+(-0.3+sh*1.6)*bs;
  const sg2=ctx.createLinearGradient(sx0,by-8,sx0+bs*0.55,by+bs+8);
  sg2.addColorStop(0,'rgba(255,255,255,0)');sg2.addColorStop(.5,'rgba(255,255,255,.045)');sg2.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sg2;ctx.fillRect(bx-8,by-8,bs+16,bs+16);
  ctx.restore();
  const cb=Math.max(0,Math.min(1,(G.combo||0)/6));
  const dn=(G.running&&tension>0&&tension<=3)?1:0;
  const dp=0.5+0.5*Math.sin(tt0/170);
  const eg=ctx.createLinearGradient(bx,by,bx+bs,by+bs);
  if(dn){const a1=(0.42+0.34*dp).toFixed(3);
    eg.addColorStop(0,'rgba(255,95,109,'+a1+')');eg.addColorStop(.5,'rgba(255,170,180,.24)');
    eg.addColorStop(1,'rgba(255,95,109,'+a1+')');}
  else{const fa=(0.32+0.36*cb).toFixed(3);
    eg.addColorStop(0,PAL[0].g+fa+')');eg.addColorStop(.5,'rgba(255,255,255,'+(0.12+0.16*cb).toFixed(3)+')');
    eg.addColorStop(1,PAL[1].g+fa+')');}
  ctx.strokeStyle=eg;ctx.lineWidth=1.4+1.3*cb+0.8*dn;rr(ctx,bx-8,by-8,bs+16,bs+16,20);ctx.stroke();
  if(cb>0.15||dn){ // combo / danger aura
    ctx.save();ctx.globalCompositeOperation='lighter';
    const ag=ctx.createRadialGradient(bx+bs/2,by+bs/2,bs*0.42,bx+bs/2,by+bs/2,bs*0.86);
    const ac=dn?'rgba(255,95,109,':PAL[Math.min(7,(G.combo||0))].g;
    const aa=(dn?0.16*dp+0.06:0.13*cb);
    ag.addColorStop(0,ac+'0)');ag.addColorStop(.7,ac+aa.toFixed(3)+')');ag.addColorStop(1,ac+'0)');
    ctx.fillStyle=ag;ctx.fillRect(bx-bs*0.4,by-bs*0.4,bs*1.8,bs*1.8);ctx.restore();
  }
  const tt=tt0,c0=bx-8,c1=by-8,cw=bs+16,ch=bs+16,ins=11,tk=Math.max(13,cw*0.07);
  const AX=c0+ins,BX=c0+cw-ins,AY=c1+ins,DY=c1+ch-ins;
  const kSp=1300-700*Math.min(1,(G.combo||0)/6);
  ctx.strokeStyle=dn?'rgba(255,95,109,'+(0.45+0.40*dp).toFixed(3)+')'
    :PAL[Math.min(7,(G.combo||0))].g+(0.34+0.20*Math.sin(tt/kSp)).toFixed(3)+')';
  ctx.lineWidth=2.2+1.4*cb;ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(AX,AY+tk);ctx.lineTo(AX,AY);ctx.lineTo(AX+tk,AY);
  ctx.moveTo(BX-tk,AY);ctx.lineTo(BX,AY);ctx.lineTo(BX,AY+tk);
  ctx.moveTo(AX,DY-tk);ctx.lineTo(AX,DY);ctx.lineTo(AX+tk,DY);
  ctx.moveTo(BX-tk,DY);ctx.lineTo(BX,DY);ctx.lineTo(BX,DY-tk);
  ctx.stroke();
  if(G.blastTurns>0){ctx.strokeStyle='rgba(255,193,61,.55)';ctx.lineWidth=2;rr(ctx,bx-8,by-8,bs+16,bs+16,20);ctx.stroke();}
  ctx.restore();
  // empty cells (slow idle wave)
  const wv=tt0*0.0011;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const px=bx+x*cell+2,py=by+y*cell+2,s=cell-4;
    const sp=socketSprite(Math.round(s));
    ctx.globalAlpha=0.72+0.28*(0.5+0.5*Math.sin(wv-(x+y)*0.62));
    ctx.drawImage(sp.c,px,py,sp._w,sp._h);
  }
  ctx.globalAlpha=1;
  // ghost
  if(drag&&drag.valid){
    const p=G.pieces[drag.pi];
    ctx.save();
    for(const c of p.shape){const px=bx+(drag.ox+c[0])*cell+2,py=by+(drag.oy+c[1])*cell+2,s=cell-4;
      rr(ctx,px,py,s,s,Math.min(8,s*0.22));ctx.fillStyle=PAL[p.color].g+'0.28)';ctx.fill();
      ctx.strokeStyle=PAL[p.color].a;ctx.lineWidth=1.5;ctx.stroke();}
    ctx.restore();
    // "will clear" bands
    const g2=new Int8Array(G.grid);
    for(const c of p.shape){const gx=drag.ox+c[0],gy=drag.oy+c[1];if(gx>=0&&gy>=0&&gx<N&&gy<N)g2[gy*N+gx]=1;}
    const rows=[],cols=[];
    for(let y=0;y<N;y++){let f=1;for(let x=0;x<N;x++)if(!g2[y*N+x]){f=0;break}if(f)rows.push(y)}
    for(let x=0;x<N;x++){let f=1;for(let y=0;y<N;y++)if(!g2[y*N+x]){f=0;break}if(f)cols.push(x)}
    if(rows.length||cols.length){
      const t=performance.now(),pulse=0.30+0.26*Math.sin(t/150),acc=PAL[p.color].g,hex=PAL[p.color].a;
      ctx.save();ctx.globalCompositeOperation='lighter';
      const band=(x0,y0,w,h)=>{
        const gr=ctx.createLinearGradient(x0,y0,x0+w,y0+h);
        gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,acc+pulse+')');
        gr.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=gr;ctx.fillRect(x0,y0,w,h);
        ctx.strokeStyle=acc+(pulse+0.25)+')';ctx.lineWidth=2;
        ctx.strokeRect(x0+1,y0+1,w-2,h-2);};
      rows.forEach(y=>band(bx,by+y*cell+1,bs,cell-2));
      cols.forEach(x=>band(bx+x*cell+1,by,cell-2,bs));
      ctx.restore();
      const n=rows.length+cols.length;
      if(n>1){const lx=bx+bs/2,ly=by-14;
        ctx.save();ctx.globalAlpha=0.55+0.35*Math.sin(t/150);
        ctx.font='800 '+Math.round(cell*0.62)+'px Rubik,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillStyle=hex;ctx.fillText('×'+n,lx,ly);ctx.restore();}
    }
  } else if(drag&&!drag.valid){
    const p=G.pieces[drag.pi];
    ctx.save();ctx.globalAlpha=.5;
    for(const c of p.shape){const px=bx+(drag.ox+c[0])*cell+2,py=by+(drag.oy+c[1])*cell+2,s=cell-4;
      if(px<bx-2||py<by-2||px+s>bx+bs+2||py+s>by+bs+2)continue;
      rr(ctx,px,py,s,s,Math.min(8,s*0.22));ctx.fillStyle='rgba(255,95,109,.35)';ctx.fill();}
    ctx.restore();
  }
  // filled
  const now=performance.now();
  const done=[];
  for(let i=0;i<N*N;i++){
    const v=G.grid[i]; if(!v)continue;
    const cl=clearing.find(c=>c.i===i);
    let sc=1,al=1;
    const sp=spawnCells.find(x=>x.i===i);
    if(sp){const t=(now-sp.t0)/230;
      if(t<0){sc=0.2;al=0.25}
      else if(t<1){const e=1-Math.pow(1-t,3);sc=0.2+0.98*e-(t>0.62?Math.sin((t-0.62)/0.38*Math.PI)*0.16:0);al=Math.min(1,t*3.2)}
      else spawnCells.splice(spawnCells.indexOf(sp),1);}
    if(cl){const t=Math.min(1,Math.max(0,(now-cl.t0)/220));
      if(t>0){sc=1+0.28*Math.sin(t*Math.PI)-t*0.55;al=1-t;}
      if((now-cl.t0)>=220)done.push(i);}
    drawCell(bx+(i%N)*cell+2,by+Math.floor(i/N)*cell+2,cell-4,PAL[v-1],sc,al);
  }
  for(const d of done){const idx=clearing.findIndex(c=>c.i===d);if(idx>=0)clearing.splice(idx,1);}
  if(done.length&&!clearing.length)scheduleOver();
  // hint highlight
  const hn=performance.now();
  hintCells=hintCells.filter(h=>h.t>hn);
  if(hintCells.length){
    ctx.save();ctx.globalAlpha=0.25+0.45*Math.abs(Math.sin(hn/220));
    hintCells.forEach(h=>{const x=h.i%N,y=Math.floor(h.i/N);
      rr(ctx,bx+x*cell+2,by+y*cell+2,cell-4,cell-4,8);
      ctx.fillStyle='rgba(63,227,255,.5)';ctx.fill();
      ctx.strokeStyle='#3FE3FF';ctx.lineWidth=2;ctx.stroke();});
    ctx.restore();
  }
  // armed cursor
  if(armed==='hammer'||armed==='bomb'){
    const m=pointer;
    if(m.in){
      const gx=Math.floor((m.x-bx)/cell),gy=Math.floor((m.y-by)/cell);
      if(gx>=0&&gy>=0&&gx<N&&gy<N){
        const r=armed==='bomb'?1:0;
        for(let y=gy-r;y<=gy+r;y++)for(let x=gx-r;x<=gx+r;x++){
          if(x<0||y<0||x>=N||y>=N)continue;
          rr(ctx,bx+x*cell+2,by+y*cell+2,cell-4,cell-4,8);
          ctx.fillStyle=armed==='bomb'?'rgba(255,95,109,.35)':'rgba(255,193,61,.35)';ctx.fill();
          ctx.strokeStyle=armed==='bomb'?'#FF5F6D':'#FFC13D';ctx.lineWidth=1.5;ctx.stroke();
        }
      }
    }
  }
}
/* ---------- skins ---------- */
const SKINS=[
 {id:'neon',   st:'neon',   lvl:0,   price:0,    glow:.55, gb:.30},
 {id:'candy',  st:'candy',  lvl:3,   price:0,    glow:.30, gb:.24},
 {id:'chrome', st:'chrome', lvl:8,   price:0,    glow:.16, gb:.16},
 {id:'glass',  st:'glass',  lvl:0,   price:1500, glow:.50, gb:.34},
 {id:'arcade', st:'arcade', lvl:0,   price:3000, glow:.10, gb:.10},
 {id:'crystal',st:'crystal',lvl:0,   price:0,    glow:.55, gb:.36, pass:true}
];
let SKIN='neon';
function skinById(id){return SKINS.filter(s=>s.id===id)[0]||SKINS[0];}
function effSkin(){return (S.trial&&S.trial.games>0&&S.trial.id)?S.trial.id:(S.skin||'neon');}
function setSkin(id){SKIN=skinById(id).st;for(const k in SPR)delete SPR[k];resetGlow();}
function applySkin(){setSkin(effSkin());}
function paintBlock(g,S,pal,st){
  const A=pal.a,B=pal.b,M=mixHex(A,B,.55);
  const r=st==='arcade'?Math.max(2,S*.10):Math.min(11,S*.245);
  if(st==='candy'){
    const lg=g.createLinearGradient(0,0,0,S);
    lg.addColorStop(0,mixHex(A,'#ffffff',.38));lg.addColorStop(.55,M);lg.addColorStop(1,mixHex(B,'#ffffff',.12));
    rr(g,0,0,S,S,r);g.fillStyle=lg;g.fill();
    g.save();rr(g,0,0,S,S,r);g.clip();
    const bg=g.createRadialGradient(S*.34,S*.16,0,S*.34,S*.16,S*.78);
    bg.addColorStop(0,'rgba(255,255,255,.55)');bg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=bg;g.fillRect(0,0,S,S);
    const bs=g.createLinearGradient(0,S*.55,0,S);
    bs.addColorStop(0,'rgba(0,0,0,0)');bs.addColorStop(1,'rgba(0,0,0,.16)');
    g.fillStyle=bs;g.fillRect(0,S*.55,S,S*.45);
    g.restore();
    g.strokeStyle='rgba(255,255,255,.62)';g.lineWidth=Math.max(1,S*.045);rr(g,0,0,S,S,r);g.stroke();
    return;
  }
  if(st==='chrome'){
    const lg=g.createLinearGradient(0,0,0,S);
    lg.addColorStop(0,mixHex(A,'#ffffff',.55));lg.addColorStop(.32,A);
    lg.addColorStop(.50,mixHex(A,'#05070f',.55));lg.addColorStop(.64,B);
    lg.addColorStop(1,mixHex(B,'#ffffff',.38));
    rr(g,0,0,S,S,r);g.fillStyle=lg;g.fill();
    g.save();rr(g,0,0,S,S,r);g.clip();
    g.fillStyle='rgba(255,255,255,.55)';g.fillRect(0,S*.05,S,S*.06);
    g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,S*.78,S,S*.05);
    g.restore();
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=Math.max(1,S*.03);rr(g,0,0,S,S,r);g.stroke();
    return;
  }
  if(st==='glass'){
    rr(g,0,0,S,S,r);
    const lg=g.createLinearGradient(0,0,S,S);
    lg.addColorStop(0,mixHex(A,'#ffffff',.28));lg.addColorStop(1,B);
    g.globalAlpha=.74;g.fillStyle=lg;g.fill();g.globalAlpha=1;
    g.save();rr(g,0,0,S,S,r);g.clip();
    const hl=g.createLinearGradient(0,0,0,S*.55);
    hl.addColorStop(0,'rgba(255,255,255,.62)');hl.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=hl;g.fillRect(0,0,S,S*.55);
    g.strokeStyle='rgba(255,255,255,.30)';g.lineWidth=Math.max(1,S*.07);
    g.beginPath();g.arc(S*.5,S*.52,S*.30,-2.45,-1.0);g.stroke();
    g.restore();
    g.strokeStyle=A;g.lineWidth=Math.max(1,S*.045);rr(g,0,0,S,S,r);g.stroke();
    return;
  }
  if(st==='arcade'){
    rr(g,0,0,S,S,r);g.fillStyle=A;g.fill();
    g.save();rr(g,0,0,S,S,r);g.clip();
    g.fillStyle='rgba(255,255,255,.42)';g.fillRect(S*.10,S*.10,S*.55,S*.15);
    g.fillStyle='rgba(0,0,0,.26)';g.fillRect(0,S*.66,S,S*.34);
    g.fillStyle='rgba(0,0,0,.16)';g.fillRect(S*.66,0,S*.34,S);
    g.restore();
    const lw=Math.max(1.6,S*.075);
    g.strokeStyle='rgba(6,8,18,.8)';g.lineWidth=lw;
    rr(g,lw*.5,lw*.5,S-lw,S-lw,r);g.stroke();
    return;
  }
  if(st==='crystal'){
    rr(g,0,0,S,S,r);
    const lg=g.createLinearGradient(0,0,S,S);
    lg.addColorStop(0,mixHex(A,'#ffffff',.45));lg.addColorStop(.5,A);lg.addColorStop(1,B);
    g.fillStyle=lg;g.fill();
    g.save();rr(g,0,0,S,S,r);g.clip();
    g.fillStyle='rgba(255,255,255,.20)';
    g.beginPath();g.moveTo(0,0);g.lineTo(S*.62,0);g.lineTo(0,S*.62);g.closePath();g.fill();
    g.fillStyle='rgba(0,0,0,.20)';
    g.beginPath();g.moveTo(S,S);g.lineTo(S*.42,S);g.lineTo(S,S*.42);g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=Math.max(1,S*.05);
    g.beginPath();g.moveTo(-S*.1,S*.74);g.lineTo(S*.74,-S*.1);g.stroke();
    g.restore();
    g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=Math.max(1,S*.03);rr(g,0,0,S,S,r);g.stroke();
    return;
  }
  const lg=g.createLinearGradient(0,0,0,S);
  lg.addColorStop(0,A);lg.addColorStop(.52,M);lg.addColorStop(1,B);
  rr(g,0,0,S,S,r);g.fillStyle=lg;g.fill();
  g.save();rr(g,0,0,S,S,r);g.clip();
  const gl=g.createLinearGradient(0,0,0,S*.66);
  gl.addColorStop(0,'rgba(255,255,255,.40)');gl.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gl;g.fillRect(0,0,S,S*.66);
  const bs=g.createLinearGradient(0,S*.5,0,S);
  bs.addColorStop(0,'rgba(0,0,0,0)');bs.addColorStop(1,'rgba(0,0,0,.34)');
  g.fillStyle=bs;g.fillRect(0,S*.5,S,S*.5);
  const lw=Math.max(1,S*.05);
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=lw;
  g.beginPath();g.moveTo(r*.55,lw*.5);g.lineTo(S-r*.55,lw*.5);g.stroke();
  g.strokeStyle='rgba(0,0,0,.38)';
  g.beginPath();g.moveTo(r*.55,S-lw*.5);g.lineTo(S-r*.55,S-lw*.5);g.stroke();
  const sp2=g.createRadialGradient(S*.30,S*.24,0,S*.30,S*.24,S*.46);
  sp2.addColorStop(0,'rgba(255,255,255,.34)');sp2.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=sp2;g.fillRect(0,0,S,S);
  g.restore();
  g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=Math.max(1,S*.028);
  rr(g,0,0,S,S,r);g.stroke();
}
function drawSkinPreview(el,id,t){
  const sk=skinById(id),d=Math.max(1,window.devicePixelRatio||1);
  const w=el.clientWidth||110,h=el.clientHeight||70;
  if(el.width!==Math.ceil(w*d)||el.height!==Math.ceil(h*d)){el.width=Math.ceil(w*d);el.height=Math.ceil(h*d)}
  const g=el.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
  const tt=t||0, bob=Math.sin(tt/620)*0.045, sc=1+Math.sin(tt/900)*0.022;
  const cs=Math.min(h*.34,w*.24)*sc,ox=(w-cs*3)/2,oy=(h-cs*3)/2+bob*cs;
  const cells=[[1,0,0],[0,1,1],[1,1,2],[2,1,3]];
  for(const cx of cells){
    const b2=Math.sin(tt/620+cx[0]*0.9+cx[1]*1.3)*0.03*cs;
    g.save();g.translate(ox+cx[0]*cs+1,oy+cx[1]*cs+1+b2);
    g.shadowColor=PAL[cx[2]].g+sk.glow.toFixed(2)+')';g.shadowBlur=cs*sk.gb;g.shadowOffsetY=cs*.04;
    paintBlock(g,cs-2,PAL[cx[2]],sk.st);g.restore();
  }
}
/* mini 2x2 preview of a theme palette (for the menu swatches) */
function themePalOf(id){
  const t=THEME_PAL[id]||THEME_PAL.neon;
  return t.map(c=>{const r=hexRgb(c[0]);return {a:c[0],b:c[1],g:'rgba('+r[0]+','+r[1]+','+r[2]+',',_i:-1}});
}
function drawThemeSwatch(el,id){
  const d=Math.max(1,window.devicePixelRatio||1);
  const w=el.clientWidth||34,h=el.clientHeight||34;
  el.width=Math.ceil(w*d);el.height=Math.ceil(h*d);
  const g=el.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
  const pal=themePalOf(id),sk=skinById(SKIN);
  const cs=Math.min(w,h)*0.40,ox=(w-cs*2)/2,oy=(h-cs*2)/2;
  [[0,0,0],[1,0,1],[0,1,3],[1,1,2]].forEach(c=>{
    g.save();g.translate(ox+c[0]*cs+1,oy+c[1]*cs+1);
    g.shadowColor=pal[c[2]].g+(sk.glow*0.7).toFixed(2)+')';g.shadowBlur=cs*sk.gb*0.6;g.shadowOffsetY=cs*.03;
    paintBlock(g,cs-2.5,pal[c[2]],sk.st);g.restore();
  });
}
/* ---------- block sprites ---------- */
const SPR={};
const SPR_BASE=128;
function blockSprite(ci,size){
  const S=SPR_BASE, k=ci+'|'+SKIN;
  let sp=SPR[k]; if(sp)return sp;
  const pal=PAL[ci]||PAL[0], sk=skinById(SKIN);
  const pad=Math.ceil(S*(0.22+sk.gb*0.6));
  const c=document.createElement('canvas');
  const tot=S+pad*2;
  c.width=Math.ceil(tot*DPR); c.height=Math.ceil(tot*DPR);
  const g=c.getContext('2d'); g.setTransform(DPR,0,0,DPR,0,0);
  g.save();g.translate(pad,pad);
  if(sk.glow>0.02){g.shadowColor=pal.g+sk.glow.toFixed(2)+')';g.shadowBlur=S*sk.gb;g.shadowOffsetY=S*0.05;}
  paintBlock(g,S,pal,sk.st);
  g.restore();
  SPR[k]={c:c,p:pad,S:S,t:tot};
  return SPR[k];
}
function drawCell(px,py,s,pal,sc,al){
  const sp=blockSprite(pal._i!=null?pal._i:0,s);
  const k=Math.max(0.02,(s*(sc==null?1:sc))/sp.S), t=sp.t*k, o=(sp.p+sp.S/2)*k;
  ctx.save();ctx.globalAlpha=al;
  ctx.drawImage(sp.c,px+s/2-o,py+s/2-o,t,t);
  ctx.restore();
}
function pieceBox(p,cell){
  let mx=0,my=0;p.shape.forEach(c=>{mx=Math.max(mx,c[0]);my=Math.max(my,c[1])});
  return {w:(mx+1)*cell,h:(my+1)*cell};
}
function drawTray(){
  const now=performance.now();
  L.slots.forEach((s,i)=>{
    const p=G.pieces[i];
    const live=p&&!p.used&&!(drag&&drag.pi===i);
    const mx=live?Math.max(...p.shape.map(c=>c[0]))+1:0, my=live?Math.max(...p.shape.map(c=>c[1]))+1:0;
    const wide=!!L.wide;
    const cs=live?Math.min((s.w-14)/mx,(s.h-14)/my,(L.cell||24)*(wide?0.95:1.32)):0;
    // card hugs the piece: no giant empty panels
    const ph=live?0:Math.min(s.w,s.h)*0.66;
    const cw=live?(wide?s.w:Math.min(s.w,Math.max(cs*mx+18,s.w*0.5))):ph;
    const ch=live?(wide?s.h:Math.min(s.h,Math.max(cs*my+18,s.h*0.5))):ph;
    const cx=s.x+(s.w-cw)/2, cy=s.y+(s.h-ch)/2;
    rr(ctx,cx,cy,cw,ch,16);
    const sg=ctx.createLinearGradient(0,cy,0,cy+ch);
    if(live){sg.addColorStop(0,'rgba(255,255,255,.055)');sg.addColorStop(1,'rgba(255,255,255,.018)');}
    else{sg.addColorStop(0,'rgba(255,255,255,.022)');sg.addColorStop(1,'rgba(255,255,255,.008)');}
    ctx.fillStyle=sg;ctx.fill();
    ctx.strokeStyle= armed==='swap'? 'rgba(63,227,255,.5)':(live?'rgba(255,255,255,.10)':'rgba(255,255,255,.05)');
    ctx.lineWidth=1;ctx.stroke();
    if(!live){
      ctx.save();ctx.setLineDash([4,5]);ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;
      rr(ctx,cx+6,cy+6,cw-12,ch-12,12);ctx.stroke();ctx.restore();
      return;
    }
    let pop=1,pal2=1;
    if(p.t0){const t=(now-p.t0)/320;
      if(t<0){pop=0.25;pal2=0}
      else if(t<1){const e=1-Math.pow(1-t,3);pop=0.25+0.86*e-(t>0.6?Math.sin((t-0.6)/0.4*Math.PI)*0.11:0);pal2=Math.min(1,t*3)}
      else p.t0=0}
    const b=pieceBox(p,cs*pop);
    const bob=Math.sin(now/900+i*1.7)*Math.min(3,cs*0.06);
    const ox=cx+(cw-b.w)/2, oy=cy+(ch-b.h)/2+bob;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.20*pal2;
    const gs=glowSprite(p.color);
    ctx.drawImage(gs,ox-cs*0.55,oy-cs*0.55,b.w+cs*1.1,b.h+cs*1.1);
    ctx.restore();
    for(const c of p.shape)drawCell(ox+c[0]*cs*pop+1,oy+c[1]*cs*pop+1,cs*pop-2,PAL[p.color],1,pal2);
  });
}
function drawDrag(){
  const p=G.pieces[drag.pi],cell=L.cell,up=1.08;
  const b=pieceBox(p,cell*up);
  const px=drag.x-b.w/2, py=drag.y-b.h/2;
  ctx.save();
  ctx.globalAlpha=.22;
  const gs=glowSprite(p.color);
  ctx.drawImage(gs,px-cell*0.3,py+b.h+cell*0.1,b.w+cell*0.6,b.h*0.5);
  ctx.globalAlpha=.97;
  for(const c of p.shape)drawCell(px+c[0]*cell*up+2,py+c[1]*cell*up+2,cell*up-4,PAL[p.color],1,1);
  ctx.restore();
}
let pointer={x:0,y:0,in:false};
function drawParticles(){
  if(!parts.length)return;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life-=0.022;
    if(p.life<=0){parts.splice(i,1);continue}
    if(p.ring){const r=p.r*(1+(1-p.life)*0.85);
      ctx.globalAlpha=Math.max(0,p.life)*0.34;ctx.strokeStyle=p.c;ctx.lineWidth=Math.max(1,p.r*0.08*p.life);
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.283);ctx.stroke();
      ctx.globalAlpha=Math.max(0,p.life)*0.10;
      const sp=glowSprite(p.ci||0);ctx.drawImage(sp,p.x-r*0.8,p.y-r*0.8,r*1.6,r*1.6);
      continue}
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.16;p.vx*=0.99;
    const r=p.r*(0.6+p.life*0.9);
    ctx.globalAlpha=Math.max(0,p.life)*0.62;
    const sp=glowSprite(p.ci||0);
    ctx.drawImage(sp,p.x-r*1.3,p.y-r*1.3,r*2.6,r*2.6);
  }
  ctx.restore();
}
function pos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function slotAt(x,y){return L.slots.findIndex(s=>x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h)}
function onDown(e){
  if(!G.running||G.over)return;
  const p=pos(e);pointer.x=p.x;pointer.y=p.y;pointer.in=true;
  AUDIO.unlock();
  if(armed){handleArmed(p);return}
  const si=slotAt(p.x,p.y);
  if(si>=0&&G.pieces[si]&&!G.pieces[si].used){
    const off=(e.pointerType==='touch')?L.cell*0.95:0;
    drag={pi:si,x:p.x,y:p.y-off,off:off,ox:0,oy:0,valid:false};
    updateDrag();AUDIO.pick();
    try{cv.setPointerCapture(e.pointerId)}catch(err){}
  }
}
function onMove(e){
  const p=pos(e);pointer.x=p.x;pointer.y=p.y;pointer.in=true;
  if(drag){drag.x=p.x;drag.y=p.y-(drag.off||0);updateDrag();}
}
function updateDrag(){
  const p=G.pieces[drag.pi],b=pieceBox(p,L.cell);
  const cx=drag.x,cy=drag.y;
  let ox=Math.round((cx-L.bx-b.w/2)/L.cell),oy=Math.round((cy-L.by-b.h/2)/L.cell);
  drag.ox=ox;drag.oy=oy;drag.valid=fits(p,ox,oy);
}
function onUp(e){
  if(!drag)return;
  const p=G.pieces[drag.pi];
  if(drag.valid){place(p,drag.ox,drag.oy);}
  else{AUDIO.ui('tap');}
  drag=null;
}
function handleArmed(p){
  const cell=L.cell,{bx,by}=L;
  const gx=Math.floor((p.x-bx)/cell),gy=Math.floor((p.y-by)/cell);
  if(armed==='swap'){
    const si=slotAt(p.x,p.y);
    if(si>=0){reroll(si);S.stats.pu++;AUDIO.power();UIH().quest('pu',1);setArmed(null);UIH().syncHud();}
    return;
  }
  if(gx<0||gy<0||gx>=N||gy>=N)return;
  if(armed==='hammer'){
    if(!G.grid[gy*N+gx]){AUDIO.ui('tap');return}
    destroyCells([[gx,gy]],false);S.stats.pu++;AUDIO.boom();UIH().quest('pu',1);setArmed(null);UIH().syncHud();
  } else if(armed==='bomb'){
    const cs=[];for(let y=gy-1;y<=gy+1;y++)for(let x=gx-1;x<=gx+1;x++){
      if(x<0||y<0||x>=N||y>=N)continue; if(G.grid[y*N+x])cs.push([x,y]);}
    if(!cs.length){AUDIO.ui('tap');return}
    destroyCells(cs,true);S.stats.pu++;AUDIO.boom();shake.t=.4;shake.m=8;UIH().quest('pu',1);setArmed(null);UIH().syncHud();
  }
}
function destroyCells(cs,big){
  let n=0;
  cs.forEach(([x,y])=>{const i=y*N+x;if(G.grid[i]){clearing.push({i,t:0,color:G.grid[i]-1,t0:performance.now()});n++;}});
  setTimeout(()=>{cs.forEach(([x,y])=>{const i=y*N+x;if(G.grid[i]){spawnBurst(i,G.grid[i]-1);G.grid[i]=0;}});
    if(!boardHasRoom())endGame();},170);
  if(big&&n){const pts=n*14;G.score+=pts;scoreFloat('+'+pts,'#FF7A4D',22);}
}
function reroll(i){
  const rng=G.seedRng;const was=G.pieces[i]&&G.pieces[i].shape?String(G.pieces[i].shape):'';
  let s=pickShape(rng,diffLevel()),tries=0;
  while(String(s.cells)===was&&tries++<10)s=pickShape(rng,diffLevel());
  G.pieces[i]={shape:s.cells,n:s.n,color:Math.floor((rng?rng():Math.random())*PAL.length),used:false};
  addFloat(L.slots[i].x+L.slots[i].w/2,L.slots[i].y,'↻','#3FE3FF',20);
}
function setArmed(a){armed=(armed===a)?null:a;UIH().syncArmed(armed);}

/* ---------- flow ---------- */
function startGame(mode,demo,opts){
  G.mode=mode;G.demo=!!demo;G.bonus=!!(opts&&opts.bonus);G.bonusAd=0;G.bonusTime=0;G.grid.fill(0);G.score=0;G.combo=0;G.streak=0;G.blast=0;G.blastTurns=0;G.blastReady=false;G.rescue=false;
  G.over=false;G.running=true;G.revives=0;G.gained=0;G.placedThisGame=0;G.linesThisGame=0;G.maxComboThis=0;
  G.duelLines=0;
  G.timeLeft=G.bonus?BONUS_SECS:60;parts.length=0;clearing.length=0;drag=null;setArmed(null);hintCells=[];spawnCells=[];
  G.placedThisGame=0;G.linesThisGame=0;G.maxComboThis=0;G.blastsThisGame=0;G.perfectsThisGame=0;G.gained=0;
  N=(mode==='daily')?dailyGrid():Math.min(S.gridN||8,maxGrid());
  G.tier=(mode==='daily')?dailyTier():Math.min(S.diffTier||1,maxTier());
  G.grid=new Int8Array(N*N);
  G.blastMax=(N===8?10:(N===9?12:14));
  if(!demo){
  if(S.wheelBoost){G.blast=Math.floor(G.blastMax*0.5);S.wheelBoost=0;save();}
  if(S.boost&&S.boost.arm){G.blast=Math.max(G.blast,Math.floor(G.blastMax*0.5));S.boost.arm=0;save();
    UIH().toast&&UIH().toast('{sparkles}',I18N.t('boost.started'));
  }
  }
  resize();
  if(mode==='daily'){const d=new Date();G.seedRng=mulberry(dayNum(today())*7919+d.getMonth()*131);}
  else G.seedRng=null;
  newTray();
  let guard=0; while(!boardHasRoom()&&guard++<30){G.grid.fill(0);newTray();}
  if(!demo){UIH().syncHud();UIH().onGameStart&&UIH().onGameStart(mode);}
}
let endLock=false;
function tickTrial(){if(S.trial&&S.trial.games>0&&S.trial.id){S.trial.games--;if(S.trial.games<=0){S.trial={id:'',games:0};applySkin();UIH().trialOver&&UIH().trialOver();}}}
function endGame(){
  if(G.over||endLock)return;endLock=true;setTimeout(()=>endLock=false,300);
  G.over=true;G.running=false;tickTrial();drag=null;setArmed(null);
  if(G.demo){return;}
  AUDIO.fail();
  const b=S.best[G.mode]||0;
  const isNew=G.score>b&&!G.bonus;
  if(isNew)S.best[G.mode]=G.score;
  S.stats.games++;
  let coins=Math.round(Math.min(260,G.score*0.05)+G.linesThisGame*2+(isNew?50:0));
  let dbonus=0;
  if(G.mode==='daily'&&(G.score||0)>(S.daily.best||0))dbonus=Math.min(420,120+10*(S.level||1));
  let xpg=Math.max(40,Math.round(G.score/18+G.linesThisGame*10+G.maxComboThis*4+(G.blast>=(G.blastMax||10)?30:0)));
  if(G.bonus)xpg=Math.max(40,Math.round(xpg*0.55));
  G.gained=coins+dbonus;G.xpGain=xpg;S.coins+=coins+dbonus;
  S.xp+=xpg;
  S.season.xp=(S.season.xp||0)+Math.max(20,Math.round((G.bonus?G.score*0.5:G.score)/25));
  UIH().checkLevel();
  if(G.mode==='daily'){S.daily={date:today(),played:true,best:Math.max(S.daily.best||0,G.score)};}
  if(G.mode==='sprint'&&!G.bonus)S.stats.sprintBest=Math.max(S.stats.sprintBest||0,G.score);
  let bextra=0;
  if(G.bonus){bextra=Math.round(Math.min(700,G.score*0.06));coins+=bextra;G.gained+=bextra;S.coins+=bextra;
    S.bonus={date:today(),done:true,score:G.score};}
  UIH().quest('score',G.score);UIH().quest('game',1);
  if(G.mode==='daily')UIH().quest('daily',1);
  if(G.mode==='sprint')UIH().quest('sprint',1);
  UIH().checkAch();
  UIH().onGameOver({score:G.score,best:S.best[G.mode],isNew,coins:coins+dbonus,dbonus:dbonus,xp:xpg,lines:G.linesThisGame,
    combo:G.maxComboThis,blasts:G.blastsThisGame||0,perfects:G.perfectsThisGame||0,
    bonus:G.bonus?bextra:0,isBonus:!!G.bonus,bonusTime:G.bonusTime||0});
  save();
}
function revive(kind){
  // kind: 'ad'|'coins'
  G.revives++;
  G.over=false;G.running=true;
  // clear random cells to unblock
  const filled=[];for(let i=0;i<N*N;i++)if(G.grid[i])filled.push(i);
  const k=Math.min(filled.length,Math.max(10,Math.floor(filled.length*0.55)));
  for(let c=0;c<k;c++){const j=Math.floor(Math.random()*filled.length);const i=filled[j];
    spawnBurst(i,G.grid[i]-1);G.grid[i]=0;filled.splice(j,1);}
  G.pieces.forEach((p,i)=>{if(p.used)reroll(i)});
  let guard=0;while(!boardHasRoom()&&guard++<40){G.grid.fill(0);newTray();}
  AUDIO.power();banner('×2');
  UIH().syncHud();
}
function reviveCost(){return [150,300,600][Math.min(G.revives,2)]||900;}

/* sprint / bonus timer */
const BONUS_SECS=45,BONUS_ADD=20,BONUS_MAX_ADD=40;
setInterval(()=>{
  if(G.running&&G.mode==='sprint'&&!G.over){
    G.timeLeft--;
    if(G.timeLeft<=10&&G.timeLeft>0)AUDIO.tick();
    if(G.timeLeft<=0){G.timeLeft=0;endGame();}
    UIH().syncHud();
  }
},1000);

cv.addEventListener('pointerdown',onDown);
cv.addEventListener('pointermove',onMove);
cv.addEventListener('pointerup',onUp);
cv.addEventListener('pointercancel',()=>{drag=null});
cv.addEventListener('pointerleave',()=>{pointer.in=false});
requestAnimationFrame(draw);
window.addEventListener('resize',resize);
if(window.ResizeObserver){let _rr=0;
  new ResizeObserver(()=>{if(_rr)cancelAnimationFrame(_rr);_rr=requestAnimationFrame(()=>{_rr=0;resize();});}).observe(cv);}
window.addEventListener('orientationchange',()=>setTimeout(resize,250));

window.BB={
  tension:()=>tension,recalc:()=>{tension=tensionOf();return tension},
 get N(){return N},PAL,PU_COST,HINT_COST,G,S,save,loadSave,adoptRemote,pushCloud,localUpdatedAt:()=>LOCAL_UPD,startGame,endGame,revive,reviveCost,setArmed,
 maxGrid,maxTier,UNLOCK,GRID_MULT,DIFF_MULT,dailyGrid,dailyTier,
 BONUS_SECS,BONUS_ADD,BONUS_MAX_ADD,
 bonusReady(){return S.bonus&&S.bonus.date!==today()},
 addBonusTime(){if(!G.bonus||G.bonusAd>=1||G.bonusTime>=BONUS_MAX_ADD)return false;
   G.bonusAd=1;G.bonusTime+=BONUS_ADD;G.timeLeft+=BONUS_ADD;save();UIH().syncHud();return true},setSetup(g,t){
   S.gridN=Math.max(8,Math.min(maxGrid(),g||8));S.diffTier=Math.max(1,Math.min(maxTier(),t||1));save();
   startGame(G.mode);return {n:S.gridN,t:S.diffTier};
 },get armed(){return armed},
 reroll,resize,getLayout(){return L},blast:fireBlast,blastReady,blastMeter,today,dayNum,addFloat,scoreFloat,banner,spawnBurst,setThemePal,THEME_PAL,demoBot,
 SKINS,skinById,setSkin,applySkin,effSkin,drawSkinPreview,drawThemeSwatch,themePalOf,trayStats,chainSolvable,diffLevel,gFits,gClears,
 get pieces(){return G.pieces},
 getDrag(){return drag},getPointer(){return pointer},slotAt,
 findFit(pi){const p=G.pieces[pi];if(!p||p.used)return null;for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(fits(p,x,y))return{x,y};return null},
 pickSample(diff){const sh=pickShape(null,diff||0);return {n:sh.n,w:sh.w2,h:sh.h2}},
 tryPlace(pi,x,y){const p=G.pieces[pi];if(!p||p.used)return false;if(!fits(p,x,y))return false;place(p,x,y);return true},
 hint(){
   const pi=[0,1,2].find(i=>!G.pieces[i].used);
   if(pi===undefined)return false;
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
     if(fits(G.pieces[pi],x,y)){
       const p=G.pieces[pi];
       hintCells=p.shape.map(c=>({i:(y+c[1])*N+x+c[0],t:performance.now()+2400}));
       return {pi,x,y};
     }
   }
   return false;
 },
 buyPower(kind){
   const c=PU_COST[kind];
   if(S.coins<c){UIH().toast('{bolt}',I18N.t('toast.nocoin'));return false}
   S.coins-=c;save();setArmed(kind);AUDIO.power();
   UIH().toast(kind==='hammer'?'{hammer}':kind==='bomb'?'{bomb}':'{refresh}',I18N.t('toast.pu'+kind.charAt(0).toUpperCase()+kind.slice(1)));
   return true;
 },
 freePower(kind){ setArmed(kind);AUDIO.power(); }
};
})();
