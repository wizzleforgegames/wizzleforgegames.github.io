/* FLAPPY COSMOS — звук: пул SFX + музыка
   Art: Kenney (CC0) space kits · Sound: Kenney + "ObservingTheStar" (CC0)
   Порядок подключения: i18n → sdk → save → audio → assets → meta → game → ui */

/* ---------------- audio ---------------- */
const SFX = { click:"click", select:"select", back:"back", pickup:"pickup", rescue:"rescue",
  levelup:"levelup", powerup:"powerup", gameover:"gameover", nearmiss:"nearmiss", magnet:"magnet",
  toggle:"toggle", open:"open", flap:"flap", explode:"explode", hit:"hit", shield:"shield",
  crystal:"crystal", milestone:"milestone" };
const AU = {
  pool:{}, music:null, ready:false, wasMusic:false,
  init(){ if (this.ready) return;
    Object.values(SFX).forEach(n=>{ const a = new Audio("assets/sfx/"+n+".mp3"); a.preload="auto"; this.pool[n]=a; });
    this.music = new Audio("assets/sfx/music.mp3"); this.music.loop = true; this.music.volume = 0.32;
    this.ready = true; },
  playing(){ try { return !!(this.music && !this.music.paused && !this.music.ended); } catch(e){ return false; } },
  play(n, vol){ if(!this.ready || !save.sfxOn) return; const a=this.pool[n]; if(!a) return;
    try{ a.currentTime=0; a.volume = vol ?? 0.75; a.play().catch(()=>{}); }catch(e){} },
  musicStart(){ if(!this.ready || !save.musicOn) return; this.wasMusic = true; this.music.play().catch(()=>{}); },
  musicStop(){ try{ if(this.music){ this.music.pause(); this.music.currentTime=0; } }catch(e){} },
  musicVol(v){ if(this.music) this.music.volume = v; },
  /* п.4.7 и п.1.3: на время полноэкранной рекламы и при потере фокуса звук молчит */
  suspendAll(){ this.wasMusic = this.playing(); this.musicStop();
    try { for (const k in this.pool){ const a=this.pool[k]; if (a && !a.paused) a.pause(); } } catch(e){} },
  resumeMusic(){ try {
      if (!this.wasMusic || !save.musicOn || !this.music) return;
      if (typeof S !== "undefined" && typeof state !== "undefined" && state === S.PAUSE) return;
      this.music.play().catch(()=>{});
    } catch(e){} this.wasMusic = false; }
};
