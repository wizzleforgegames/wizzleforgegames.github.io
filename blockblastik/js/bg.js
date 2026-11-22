/* animated aurora background + floating neon blocks + reactive pulse */
(function(){
const cv=document.getElementById('bgc'),c=cv.getContext('2d');
let W=0,H=0,DPR=1,t=0,px=[],blobs=[],blocks=[],pulse=null,SPR={};
let Q=1,acc=0,fn=0,lastT=0,upn=0,ups=0,la=0;  /* adaptive quality: 1 = full, 0 = lite */
const COL=[[63,227,255],[255,91,212],[139,108,255],[255,193,61],[77,255,184]];
const BG_THEMES={
 neon:{grad:['#070C1C','#05070F','#04060D'],col:[[63,227,255],[255,91,212],[139,108,255],[255,193,61],[77,255,184]]},
 midnight:{grad:['#0A1130','#060A1A','#040714'],col:[[111,168,255],[167,139,255],[79,209,197],[240,171,252],[125,211,252]]},
 sunset:{grad:['#1E0C16','#12060E','#0C0409'],col:[[255,138,91],[255,77,141],[255,193,61],[255,91,212],[255,209,102]]},
 mint:{grad:['#081A12','#04120E','#020B08'],col:[[52,227,154],[124,255,178],[0,214,192],[182,255,110],[77,208,225]]},
 cyber:{grad:['#150926','#0A0512','#06030B'],col:[[255,46,151],[0,229,255],[176,38,255],[255,230,0],[0,255,163]]}
};
let GRAD=BG_THEMES.neon.grad.slice();
function rgb(i){const q=COL[i%COL.length];return q[0]+','+q[1]+','+q[2]}
function setTheme(id){const th=BG_THEMES[id]||BG_THEMES.neon;GRAD=th.grad.slice();
  for(let i=0;i<COL.length;i++){const cc=th.col[i%th.col.length];COL[i][0]=cc[0];COL[i][1]=cc[1];COL[i][2]=cc[2]}
  SPR={};}
function firePulse(col){pulse={t:0,c:col||rgb(0)}}
window.BG={setTheme,setColors:setTheme,pulse:firePulse,get quality(){return Q},get perf(){return {Q,acc:Math.round(acc),fn,upn,ups,la:Math.round(la)}}};
function rr(g,x,y,w,h,r){if(w<=0||h<=0)return;g.beginPath();r=Math.max(0,Math.min(r,w/2,h/2));
  g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function blockSprite(ci,size){
  const k=ci+'|'+Math.round(size);if(SPR[k])return SPR[k];
  const s=Math.ceil(size*1.5),el=document.createElement('canvas');el.width=el.height=s;
  const g=el.getContext('2d'),o=s*0.25,r=size*0.24,cc=rgb(ci);
  g.shadowColor='rgba('+cc+',.55)';g.shadowBlur=size*0.20;
  g.strokeStyle='rgba('+cc+',.80)';g.lineWidth=Math.max(1.1,size*0.045);
  rr(g,o,o,size,size,r);g.stroke();
  g.shadowBlur=0;
  const lg=g.createLinearGradient(o,o,o+size,o+size);
  lg.addColorStop(0,'rgba('+cc+',.20)');lg.addColorStop(1,'rgba('+cc+',.02)');
  g.fillStyle=lg;g.fill();
  g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=1;rr(g,o+1.5,o+1.5,size-3,size-3,r*0.8);g.stroke();
  SPR[k]=el;return el;
}
function setQ(v){if(Q===v)return;Q=v;resize();
  try{window.dispatchEvent(new Event('resize'))}catch(e){}}
function resize(){const r=cv.getBoundingClientRect();W=r.width;H=r.height;
  DPR=Q?Math.min(window.devicePixelRatio||1,1.5):1;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);c.setTransform(DPR,0,0,DPR,0,0);
  blobs=[
   {x:.18,y:.12,r:.62,ci:0,sp:.00021,ax:.16,ay:.10},
   {x:.82,y:.22,r:.55,ci:1,sp:.00017,ax:.13,ay:.14},
   {x:.5,y:.85,r:.7,ci:2,sp:.00013,ax:.20,ay:.09},
   {x:.1,y:.75,r:.42,ci:4,sp:.00023,ax:.11,ay:.12},
   {x:.9,y:.8,r:.4,ci:3,sp:.00019,ax:.10,ay:.10},
   {x:.5,y:.05,r:.5,ci:1,sp:.00011,ax:.24,ay:.06},
   {x:.02,y:.42,r:.36,ci:2,sp:.00015,ax:.08,ay:.18}
  ];
  px=[];const n=Math.round((Q?1:0.45)*Math.min(90,Math.max(28,W*H/16000)));
  for(let i=0;i<n;i++)px.push({x:Math.random()*W,y:Math.random()*H,
    r:.6+Math.random()*2.1,s:.06+Math.random()*.32,a:.10+Math.random()*.35,
    ci:Math.floor(Math.random()*COL.length),ph:Math.random()*6.28});
  blocks=[];const bn=Q?Math.round(Math.min(13,Math.max(6,W/110))):0;
  for(let i=0;i<bn;i++){const d=0.35+Math.random()*0.65;
    blocks.push({x:Math.random(),y:Math.random(),sz:(30+Math.random()*86)*d,
      rot:Math.random()*6.28,vr:(Math.random()-.5)*0.0022,
      vy:-(0.000018+Math.random()*0.000055)*d,vx:(Math.random()-.5)*0.00003,
      a:0.10+Math.random()*0.16*d,ci:Math.floor(Math.random()*COL.length),ph:Math.random()*6.28,d:d});}
}
function frame(now){
  t+=16;
  now=now||performance.now();
  if(lastT){const dt=now-lastT;if(dt<200){acc+=dt;fn++;if(fn>=70){const a=acc/fn;la=a;
      if(Q){if(a>26.5){setQ(0);upn=0}}
      else if(a<23&&ups<3){if(++upn>=6){ups++;setQ(1)}}else upn=0;
      acc=0;fn=0;}}}
  lastT=now;
  const g=c.createLinearGradient(0,0,0,H);
  g.addColorStop(0,GRAD[0]);g.addColorStop(.55,GRAD[1]);g.addColorStop(1,GRAD[2]);
  c.fillStyle=g;c.fillRect(0,0,W,H);
  c.globalCompositeOperation='lighter';
  for(const b of blobs){
    if(!Q&&b.ci>2)continue;
    const bx=(b.x+Math.sin(t*b.sp)*b.ax)*W, by=(b.y+Math.cos(t*b.sp*1.3)*b.ay)*H;
    const R=b.r*Math.max(W,H)*0.55;
    const col=COL[b.ci];
    const rg=c.createRadialGradient(bx,by,0,bx,by,R);
    rg.addColorStop(0,'rgba('+col[0]+','+col[1]+','+col[2]+',0.20)');
    rg.addColorStop(.45,'rgba('+col[0]+','+col[1]+','+col[2]+',0.065)');
    rg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=rg;c.fillRect(bx-R,by-R,R*2,R*2);
  }
  // perspective floor grid
  const hy=H*0.74, gs=(t*0.012)%1;
  c.strokeStyle='rgba('+rgb(0)+',.055)';c.lineWidth=1;
  c.beginPath();
  for(let i=1;i<=7;i++){const p=(i-1+gs)/7;const y=hy+(H-hy)*Math.pow(p,1.9);
    c.moveTo(0,y);c.lineTo(W,y);}
  for(let i=-6;i<=6;i++){const x=W/2+i*W*0.13;c.moveTo(W/2+i*W*0.035,hy);c.lineTo(x,H);}
  c.stroke();
  const hz=c.createLinearGradient(0,H*0.70,0,H);
  const hc=COL[0];
  hz.addColorStop(0,'rgba(0,0,0,0)');
  hz.addColorStop(1,'rgba('+hc[0]+','+hc[1]+','+hc[2]+','+(0.055+0.02*Math.sin(t*0.0004))+')');
  c.fillStyle=hz;c.fillRect(0,H*0.70,W,H*0.30);
  // floating neon blocks
  for(const b of blocks){
    b.y+=b.vy*16;b.x+=b.vx*16;b.rot+=b.vr*16;
    if(b.y<-0.15){b.y=1.12;b.x=Math.random()}
    const sp=blockSprite(b.ci,b.sz),al=b.a*(0.65+0.35*Math.sin(t*0.0008+b.ph));
    c.save();c.globalAlpha=al;
    c.translate(b.x*W,b.y*H);c.rotate(b.rot);
    c.drawImage(sp,-sp.width/2,-sp.height/2);
    c.restore();
  }
  for(const p of px){
    p.y-=p.s; if(p.y<-4){p.y=H+4;p.x=Math.random()*W}
    const a=p.a*(0.6+0.4*Math.sin(t*0.0016+p.ph));
    const col=COL[p.ci];
    c.fillStyle='rgba('+col[0]+','+col[1]+','+col[2]+','+a+')';
    c.beginPath();c.arc(p.x,p.y,p.r,0,6.283);c.fill();
  }
  if(pulse){
    pulse.t+=16;const k=pulse.t/900;
    if(k>=1)pulse=null;
    else{const R=Math.max(W,H)*(0.06+0.62*k),a=(1-k)*(1-k)*0.30;
      const rg=c.createRadialGradient(W/2,H*0.5,R*0.55,W/2,H*0.5,R);
      rg.addColorStop(0,'rgba('+pulse.c+',0)');rg.addColorStop(.72,'rgba('+pulse.c+','+a.toFixed(3)+')');
      rg.addColorStop(1,'rgba('+pulse.c+',0)');
      c.fillStyle=rg;c.fillRect(0,0,W,H);}
  }
  c.globalCompositeOperation='source-over';
  const vr=Math.max(W,H);
  const vg=c.createRadialGradient(W/2,H*0.46,vr*0.28,W/2,H*0.5,vr*0.92);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.62,'rgba(0,0,0,.18)');vg.addColorStop(1,'rgba(0,0,0,.52)');
  c.fillStyle=vg;c.fillRect(0,0,W,H);
  requestAnimationFrame(frame);
}
window.addEventListener('resize',resize);
resize();requestAnimationFrame(frame);
})();
