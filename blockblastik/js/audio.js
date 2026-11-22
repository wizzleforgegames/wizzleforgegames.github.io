(function(){
const FILES={
 click:'click1.ogg', tap:'switch1.ogg', hover:'rollover1.ogg',
 place:'plate_med.ogg', placeSoft:'soft_med.ogg',
 clear:'glass_light.ogg', clearBig:'glass_heavy.ogg',
 boom:'punch_heavy.ogg', trash:'trash3.ogg',
 power:'powerup1.ogg', power2:'powerup4.ogg', reward:'powerup8.ogg',
 coin:'pep2.ogg', coin2:'pep4.ogg',
 up:'highup.ogg', down:'lowdown.ogg',
 combo1:'threetone1.ogg', combo2:'threetone2.ogg', combo3:'twotone1.ogg',
 zap:'zap1.ogg', zap2:'zap2.ogg', jump:'phasejump3.ogg'
};
let ctx=null, master=null, muted=false, quiet=false, ready=false, vol=0.9, decoding=false, unlocked=false;
const buf={}, raw={};
function ac(){
  if(ctx)return ctx;
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return null;
  ctx=new AC(); master=ctx.createGain(); master.gain.value=vol; master.connect(ctx.destination);
  return ctx;
}
function load(){
  const jobs=Object.keys(FILES).map(k=>fetch('assets/audio/'+FILES[k])
    .then(r=>r.ok?r.arrayBuffer():null).then(b=>{if(b)raw[k]=b;}).catch(()=>{}));
  return Promise.all(jobs);
}
function decodeAll(){
  const c=ac(); if(!c||decoding||ready)return;
  decoding=true;
  const keys=Object.keys(raw).filter(k=>!buf[k]);
  let i=0;
  const next=()=>{
    if(i>=keys.length){decoding=false;ready=true;return}
    const k=keys[i++];
    c.decodeAudioData(raw[k].slice(0),d=>{buf[k]=d;next()},()=>next());
  };
  next();
}
function play(k,opt){
  opt=opt||{};
  if(muted||quiet||!unlocked)return; const c=ac(); if(!c)return;
  if(c.state==='suspended')c.resume();
  const b=buf[k];
  if(b){
    const s=c.createBufferSource(); s.buffer=b;
    if(opt.rate)s.playbackRate.value=Math.max(.25,Math.min(4,opt.rate));
    const g=c.createGain(); g.gain.value=(opt.vol==null?1:opt.vol);
    const p=c.createStereoPanner?c.createStereoPanner():null;
    if(p&&opt.pan){p.pan.value=Math.max(-1,Math.min(1,opt.pan));s.connect(g);g.connect(p);p.connect(master);}
    else{s.connect(g);g.connect(master);}
    try{s.start(c.currentTime+(opt.delay||0));}catch(e){}
    return;
  }
  tone(opt.freq||440,opt.dur||.12,opt.type||'sine',opt.vol==null?1:opt.vol,opt.delay||0);
}
function tone(f,d,type,v,delay){
  if(quiet||!unlocked)return;
  const c=ac(); if(!c)return; if(c.state==='suspended')c.resume();
  const o=c.createOscillator(),g=c.createGain();
  o.type=type||'sine'; o.frequency.value=f;
  const t=c.currentTime+(delay||0);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime((v||1)*.5,t+.012);
  g.gain.exponentialRampToValueAtTime(.0008,t+d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+d+.02);
}
function seq(list){ list.forEach(x=>{ if(x.s)play(x.s,x); else tone(x.f,x.d,x.t,x.v,x.delay); }); }
/* --- procedural neon ambient music --- */
let mus=null,musGain=null,musTimer=null,musOn=false,step=0;
const SCALE=[0,3,5,7,10,12,15,12,10,7,5,3]; // minor arpeggio
let musInt=0,musStepMs=260;
function musicStart(){
  const c=ac(); if(!c||musOn)return; musOn=true;
  musGain=c.createGain(); musGain.gain.value=0.0; musGain.connect(master);
  const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1400; f.Q.value=0.7;
  f.connect(musGain);
  mus=f;
  musGain.gain.linearRampToValueAtTime(0.16,c.currentTime+2.5);
  step=0;
  musLoop();
}
function musLoop(){
  if(musTimer)clearInterval(musTimer);
  musTimer=setInterval(()=>{
    if(!musOn)return;
    const c2=ac(); if(!c2)return;
    const t=c2.currentTime;
    const root=55; // A1
    const s=SCALE[step%SCALE.length];
    // bass pad every 8 steps
    if(step%8===0){
      const o=c2.createOscillator(),g=c2.createGain();
      o.type='sawtooth'; o.frequency.value=root*Math.pow(2,(s%12)/12);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.10,t+0.4);
      g.gain.linearRampToValueAtTime(0.0,t+2.2);
      o.connect(g); g.connect(mus); o.start(t); o.stop(t+2.4);
    }
    // arp pluck
    const o=c2.createOscillator(),g=c2.createGain();
    o.type='triangle';
    o.frequency.value=root*4*Math.pow(2,s/12);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.075,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0006,t+0.55);
    o.connect(g); g.connect(mus); o.start(t); o.stop(t+0.6);
    // sparkle
    if(step%6===3){const o2=c2.createOscillator(),g2=c2.createGain();
      o2.type='sine'; o2.frequency.value=root*8*Math.pow(2,(s+7)/12);
      g2.gain.setValueAtTime(0,t); g2.gain.linearRampToValueAtTime(0.04,t+0.01);
      g2.gain.exponentialRampToValueAtTime(0.0006,t+0.4);
      o2.connect(g2); g2.connect(mus); o2.start(t); o2.stop(t+0.45);}
    // kick + hat when intensity rises
    if(musInt>=1&&step%4===0){
      const k=c2.createOscillator(),kg=c2.createGain();
      k.type='sine'; k.frequency.setValueAtTime(120,t); k.frequency.exponentialRampToValueAtTime(42,t+0.16);
      kg.gain.setValueAtTime(0.16,t); kg.gain.exponentialRampToValueAtTime(0.001,t+0.22);
      k.connect(kg); kg.connect(musGain); k.start(t); k.stop(t+0.25);
    }
    if(musInt>=1&&step%2===1){
      const h=c2.createOscillator(),hg=c2.createGain();
      h.type='square'; h.frequency.value=6200+Math.random()*900;
      hg.gain.setValueAtTime(0.014*musInt,t); hg.gain.exponentialRampToValueAtTime(0.0005,t+0.05);
      const hp=c2.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=5200;
      h.connect(hp); hp.connect(hg); hg.connect(musGain); h.start(t); h.stop(t+0.07);
    }
    // extra octave layer on high intensity
    if(musInt>=2&&step%3===0){
      const o3=c2.createOscillator(),g3=c2.createGain();
      o3.type='sawtooth'; o3.frequency.value=root*2*Math.pow(2,s/12);
      g3.gain.setValueAtTime(0,t); g3.gain.linearRampToValueAtTime(0.03,t+0.02);
      g3.gain.exponentialRampToValueAtTime(0.0006,t+0.7);
      o3.connect(g3); g3.connect(mus); o3.start(t); o3.stop(t+0.75);
    }
    step++;
  },musStepMs);
}
function setIntensity(v){
  v=Math.max(0,Math.min(3,v|0));
  if(v===musInt)return; musInt=v;
  const c=ac(); if(!c||!musOn)return;
  if(mus)mus.frequency.setTargetAtTime(1400+v*620,c.currentTime,0.4);
  if(musGain)musGain.gain.setTargetAtTime(0.16+v*0.022,c.currentTime,0.6);
  const ms=[260,260,225,196][v];
  if(ms!==musStepMs){musStepMs=ms;musLoop();}
}
function musicStop(){
  if(!musOn)return; musOn=false;
  clearInterval(musTimer); musTimer=null;
  const c=ac(); if(musGain&&c)musGain.gain.linearRampToValueAtTime(0,c.currentTime+0.6);
}
const A={
 load, unlock(){const c=ac(); if(c&&c.state==='suspended')c.resume();},
 setMuted(m){muted=m; if(master)master.gain.value=m?0:vol; if(m)musicStop();},
 setQuiet(q){quiet=!!q;},
 music(on){ if(!unlocked)return; on?musicStart():musicStop(); },
 intens(v){ setIntensity(v); },
 startMusicOnce(){ if(!unlocked)return; if(!this._mu){this._mu=true;musicStart();} },
 get muted(){return muted},
 ui(k){play(k,{vol:.5,rate:1.05})},
 click(){play('click',{vol:.55})},
 hover(){play('hover',{vol:.25,rate:1.2})},
 pick(){play('tap',{vol:.5})},
 drop(){play('place',{vol:.7,rate:.95+Math.random()*.1})},
 clear(n,combo){
   const base=Math.min(1.9,1+n*0.16+combo*0.05);
   play(n>=2?'clearBig':'clear',{vol:.8,rate:base});
   const notes=[523,659,784,1046,1318];
   for(let i=0;i<Math.min(4,n+1);i++)tone(notes[i]*(1+combo*0.03),.16,'triangle',.22,i*0.055);
 },
 combo(n){ const f=[0,440,554,659,784,880,1046,1244][Math.min(7,n)]||1318;
   tone(f,.2,'square',.16); tone(f*1.5,.22,'triangle',.12,.05); },
 blast(){ seq([{s:'zap',vol:.9},{s:'power',vol:.8,delay:.08},{f:1046,d:.5,t:'sawtooth',v:.18,delay:.05},{f:1568,d:.5,t:'triangle',v:.14,delay:.14}]); },
 boom(){ play('boom',{vol:.85,rate:.9}); play('trash',{vol:.5,rate:1.1,delay:.03}); },
 power(){ play('power',{vol:.7}); },
 reward(){ seq([{s:'reward',vol:.75},{s:'coin',vol:.6,delay:.12},{f:1046,d:.2,t:'triangle',v:.16,delay:.2},{f:1318,d:.25,t:'triangle',v:.14,delay:.28}]); },
 coin(){ play('coin',{vol:.55,rate:1+Math.random()*.15}); },
 levelup(){ seq([{f:523,d:.16,t:'triangle',v:.2},{f:659,d:.16,t:'triangle',v:.2,delay:.1},{f:784,d:.16,t:'triangle',v:.22,delay:.2},{f:1046,d:.35,t:'triangle',v:.24,delay:.3}]); },
 fail(){ seq([{s:'down',vol:.7},{f:392,d:.3,t:'sawtooth',v:.14},{f:262,d:.5,t:'sine',v:.16,delay:.16}]); },
 tick(){ tone(1200,.04,'square',.08); },
 ready(){return ready}
};
window.AUDIO=A;
})();
