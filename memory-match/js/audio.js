/* Звуковой менеджер. Звуки — из интернета (assets/audio/*). Никакой генерации. */
const AudioMgr = (() => {
  let soundOn = localStorage.getItem('mm_sound_on') !== '0';
  let ysdkAudio = null;   // ysdk.features.audio

  async function initSdkAudio() {
    // НЕ зовём YaGames.init() второй раз: берём уже инициализированный ysdk из sdk.js
    try {
      const s = (window.YandexGames && window.YandexGames.sdk && window.YandexGames.sdk()) || null;
      ysdkAudio = s && s.features && s.features.audio ? s.features.audio : null;
    } catch (e) { /* не в iframe Яндекс — аудио через <audio> */ }
  }

  // один экземпляр <audio> на эффект чтобы можно было перезапускать быстро
  const pool = {};
  function nameFor(src) {
    return src.replace(/.*\//, '').replace(/\.[^.]+$/, '');
  }

  function play(src, { volume = 1, loop = false } = {}) {
    if (!soundOn) return;
    const url = AudioMgr.url(src);
    if (!url) return;

    // Приоритет: ysdk audio (короткие sfx), иначе HTML5 <audio>
    if (ysdkAudio && src !== 'bgm') {
      try {
        ysdkAudio.play({ urls: [url], volume: Math.max(0, Math.min(1, volume)) });
        return;
      } catch (e) {}
    }
    const key = nameFor(url) + (loop ? '_loop' : '');
    let aud = pool[key];
    if (!aud) {
      try {
        aud = new Audio(url);
        aud.preload = 'auto';
        aud.volume = volume;
        aud.onerror = () => {};
      } catch (e) { aud = null; }
      if (aud) pool[key] = aud;
    }
    if (!aud) return;
    try {
      aud.volume = volume;
      aud.currentTime = 0;
      if (loop) { aud.loop = true; aud.play().catch(() => {}); }
      else { aud.play().catch(() => {}); }
    } catch (e) {}
  }

  function stop(src) {
    const base = nameFor(AudioMgr.url(src));
    [base, base + '_loop'].forEach(k => {
      const aud = pool[k];
      if (!aud) return;
      try { aud.pause(); aud.currentTime = 0; } catch (e) {}
    });
  }

  function bgm() { play('bgm', { volume: 0.5, loop: true }); }
  function setOn(on) {
    soundOn = on;
    try { localStorage.setItem('mm_sound_on', on ? '1' : '0'); } catch (e) {}
    if (!on) { api.stop('bgm'); }
    else if (inGame()) { api.bgm(); }
    return soundOn;
  }
  function inGame() {
    try { return !!document.querySelector('#screen-game.active'); } catch (e) { return false; }
  }

  // пауза звука при потере фокуса / показе рекламы (п. 1.3 и 4.7 требований Яндекс Игр)
  let paused = false, wasBgm = false;
  function pauseAll() {
    if (paused) return;
    paused = true;
    const bg = pool[nameFor(AudioMgr.url('bgm')) + '_loop'];
    wasBgm = !!(bg && !bg.paused);
    Object.keys(pool).forEach(k => { const a = pool[k]; if (a) { try { a.pause(); } catch (e) {} } });
  }
  function resumeAll() {
    if (!paused) return;
    paused = false;
    if (!soundOn) return;
    if (wasBgm && inGame()) api.bgm();
  }
  function isOn() { return soundOn; }

  // Источник звуков: из интернета (CC0 / Freesound-стиль), локальный фолбэк.
  // Можно переопределить REMOTE_BASE на удалённый CDN — звуки всё равно из сети.
  const REMOTE_BASE = ''; // пример: 'https://cdn.example.com/sfx/'
  const urls = {
    flip: 'assets/audio/flip.mp3',
    click: 'assets/audio/click.mp3',
    correct: 'assets/audio/correct.mp3',
    wrong: 'assets/audio/wrong.mp3',
    match: 'assets/audio/match.mp3',
    win: 'assets/audio/win.mp3',
    lose: 'assets/audio/lose.mp3',
    bgm: 'assets/audio/bgm.mp3',
  };
  const urlFor = (k) => {
    const base = urls[k] || '';
    if (REMOTE_BASE && !/^https?:/i.test(base)) return REMOTE_BASE + base.split('/').pop();
    return base;
  };

  // собираем публичный объект в локальную переменную — не обращаемся к const
  // AudioMgr внутри своего же инициализатора (TDZ), поэтому возвращаем `api`
  const api = {};
  api.url = (k) => urlFor(k);
  api.init = initSdkAudio;
  api.play = play;
  api.stop = stop;
  api.bgm = bgm;
  api.setOn = setOn;
  api.pauseAll = pauseAll;
  api.resumeAll = resumeAll;
  api.isOn = isOn;
  api.urls = urls;
  return api;
})();
