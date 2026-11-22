/* Обертка над Yandex Games SDK.
   Использует подтверждённые методы API (см. https://yandex.com/dev/games/):
   - window.YaGames.init() -> ysdk
   - ysdk.player.getData() / player.setData()  — облако прогресса (+ progressChanged)
   - ysdk.leaderboards.setScore() / getEntries() — лидерборды
   - ysdk.adv.showFullscreenAds() / ysdk.adv.showRewardedVideo() — реклама
   - ysdk.fullscreen.request() — полный экран
   - ysdk.events.GameplayAPI.start()/stop() и ysdk.events.progressChanged
   - ysdk.actions.ABTest — A/B-тестирование
   - ysdk.environment.i18n.lang — язык (ru/en)
   Все вызовы защищены try/catch: при локальном запуске (не в iframe Яндекса)
   SDK не загрузится, данные сохраняются в localStorage. */
const YandexGames = (() => {
  let ysdk = null;
  let player = null;        // resolved Player object (from getPlayer())
  let playerData = {};
  const LS = 'mm_yg_';

  async function getPlayer() {
    // modern API: ysdk.getPlayer() -> Promise<Player>
    // legacy fallback: ysdk.player (direct property)
    if (ysdk && typeof ysdk.getPlayer === 'function') {
      try { return await ysdk.getPlayer(); }
      catch (e) { return (ysdk.player || null); }
    }
    return (ysdk.player || null);
  }

  async function init() {
    try {
      if (window.YaGames) {
        ysdk = await window.YaGames.init();
        try {
          const p = await getPlayer();
          if (p && typeof p.getData === 'function') {
            player = p;
            playerData = await p.getData();
          } else if (ysdk.player && typeof ysdk.player.getData === 'function') {
            player = ysdk.player;
            playerData = await ysdk.player.getData();
          }
        } catch (e) {}
        // старт геймплея (чтобы Яндекс знал, что игрок в игре)
        try {
          if (ysdk.features && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.start) {
            ysdk.features.GameplayAPI.start();
          }
        } catch (e) {}
        // подписка на события платформы (adShowFailed / gameplayAvailable)
        try {
          const adv = ysdk.adv || {};
          const events = ysdk.events || {};
          const ET = (events.EventType && events.EventType) || (adv.EventType && adv.EventType) || {};
          const onEvent = (typeof events.onEvent === 'function') ? events.onEvent.bind(events)
                          : (typeof adv.onEvent === 'function') ? adv.onEvent.bind(adv)
                          : null;
          const gameplayAPI = (events.GameplayAPI && events.GameplayAPI) || (adv.GameplayAPI && adv.GameplayAPI);
          if (ET.GAMEPLAY_AVAILABLE && gameplayAPI && typeof gameplayAPI.start === 'function') {
            gameplayAPI.start();
          }
          if (ET.AD_FAILED && typeof onEvent === 'function') {
            onEvent(ET.AD_FAILED, () => {
              try { if (gameplayAPI && gameplayAPI.stop) gameplayAPI.stop(); } catch (e2) {}
              setTimeout(() => { try { if (gameplayAPI && gameplayAPI.start) gameplayAPI.start(); } catch (e2) {} }, 500);
            });
          }
        } catch (e) {}
        // Game Ready: сообщаем, что игрой можно пользоваться (п. 1.19.2 требований).
        loadingReady();
        // пауза/возобновление от платформы (п. 1.19.4, помогает п. 1.3 и 4.7)
        try {
          if (typeof ysdk.on === 'function') {
            ysdk.on('game_api_pause', () => { pauseAudioForAd(); if (window.__MM && window.__MM.onSdkPause) window.__MM.onSdkPause(); });
            ysdk.on('game_api_resume', () => { resumeAudioAfterAd(); if (window.__MM && window.__MM.onSdkResume) window.__MM.onSdkResume(); });
          }
        } catch (e) {}
      }
    } catch (e) {
      try { playerData = JSON.parse(localStorage.getItem(LS + 'player') || '{}'); }
      catch (e) {}
    }
    return ysdk;
  }

  // Game Ready (п. 1.19.2): LoadingAPI.ready(), старые имена — как запасной вариант
  function loadingReady() {
    try {
      const f = (ysdk && ysdk.features) || {};
      if (f.LoadingAPI && typeof f.LoadingAPI.ready === 'function') { f.LoadingAPI.ready(); return true; }
      if (typeof ysdk.readyGame === 'function') { ysdk.readyGame(); return true; }
      if (f.Loading && typeof f.Loading.finish === 'function') { f.Loading.finish(); return true; }
    } catch (e) {}
    return false;
  }

  // разметка геймплея: старт/стоп (п. 1.19.3)
  function gameplayStart() {
    try { const g = ysdk && ysdk.features && ysdk.features.GameplayAPI; if (g && g.start) g.start(); } catch (e) {}
  }
  function gameplayStop() {
    try { const g = ysdk && ysdk.features && ysdk.features.GameplayAPI; if (g && g.stop) g.stop(); } catch (e) {}
  }

  // звук во время рекламы/паузы: п. 1.3 и 4.7 — звук игры должен останавливаться
  function pauseAudioForAd() { try { if (window.AudioMgr && AudioMgr.pauseAll) AudioMgr.pauseAll(); } catch (e) {} }
  function resumeAudioAfterAd() { try { if (window.AudioMgr && AudioMgr.resumeAll) AudioMgr.resumeAll(); } catch (e) {} }

  // отчёт Яндексу об изменении прогресса (для daily reward / retention)
  let lastProgress = null;   // последний валидный % (0..100), чтобы не слать объект
  async function reportProgress(progress) {
    try {
      let data;
      if (typeof progress === 'number' && isFinite(progress)) {
        data = Math.max(0, Math.min(100, Math.round(progress)));
        lastProgress = data;
      } else if (progress && typeof progress === 'object' && typeof progress.extra === 'string') {
        data = progress;
      } else {
        data = (lastProgress === null) ? null : lastProgress;
      }
      if (data === null) return false;
      if (ysdk) {
        // ysdk.on('progressChanged') в SDK не зарегистрирован → слушатель навешивался
        // в пустоту (и копировался при каждом вызове), данные Яндекс не получал.
        // Единственный рабочий способ — прямой вызов ysdk.events.progressChanged(data).
        if (ysdk.events && typeof ysdk.events.progressChanged === 'function') {
          ysdk.events.progressChanged(data);
        }
      }
    } catch (e) {}
  }

  async function saveData(data) {
    const merged = { ...playerData, ...data };
    playerData = merged;
    try {
      const p = player || await getPlayer();
      if (p && typeof p.setData === 'function') {
        await p.setData(merged);
      } else if (ysdk && typeof ysdk.player.setData === 'function') {
        await ysdk.player.setData(merged);
      } else {
        localStorage.setItem(LS + 'player', JSON.stringify(merged));
      }
      await reportProgress();
      return true;
    } catch (e) {
      localStorage.setItem(LS + 'player', JSON.stringify(merged));
      return true;
    }
  }

  async function loadData(keys) {
    try {
      const p = player || await getPlayer();
      if (p && typeof p.getData === 'function') {
        const res = await p.getData(keys);
        if (res) return res;
      }
    } catch (e) {}
    return playerData;
  }

  async function setScore(leaderboard, score, extraData) {
    try {
      if (ysdk && ysdk.leaderboards) {
        if (ysdk.isAvailableMethod && typeof ysdk.isAvailableMethod === 'function') {
          const ok = await ysdk.isAvailableMethod('leaderboards.setScore');
          if (!ok) return score;
        }
        const args = extraData !== undefined ? [leaderboard, score, extraData] : [leaderboard, score];
        await ysdk.leaderboards.setScore.apply(ysdk.leaderboards, args);
      }
    } catch (e) {}
    return score;
  }

  async function getTop(leaderboard, count = 5) {
    try {
      if (ysdk && ysdk.leaderboards) {
        if (ysdk.isAvailableMethod && typeof ysdk.isAvailableMethod === 'function') {
          const ok = await ysdk.isAvailableMethod('leaderboards.getEntries');
          if (!ok) return [];
        }
        const opts = { quantityTop: Math.max(1, Math.min(20, count)) };
        const res = await ysdk.leaderboards.getEntries(leaderboard, opts);
        if (res && Array.isArray(res.entries)) return res.entries;
        if (res && Array.isArray(res)) return res;
      }
    } catch (e) {}
    return [];
  }

  // A/B-тестирование (обязательный элемент модерации)
  async function abTest(group) {
    try {
      if (ysdk && ysdk.actions && ysdk.actions.ABTest) {
        await ysdk.actions.ABTest(group);
      }
    } catch (e) {}
  }

  function fullScreen() {
    try {
      if (ysdk && ysdk.fullscreen) {
        if (ysdk.fullscreen.request) ysdk.fullscreen.request();
        else if (ysdk.fullscreen.requestFullscreen) ysdk.fullscreen.requestFullscreen();
      }
    } catch (e) {}
  }

  // современный метод показа межстраничной рекламы (sdk-adv: showFullscreenAdv)
  function interstitial() {
    if (!ysdk || !ysdk.adv) return;
    pauseAudioForAd();
    const done = () => resumeAudioAfterAd();
    const opts = { onClose: done, onError: done, blocksGameplay: true };
    try {
      if (typeof ysdk.adv.showFullscreenAdv === 'function') ysdk.adv.showFullscreenAdv(opts);
      else if (typeof ysdk.adv.showInterstitialAds === 'function') ysdk.adv.showInterstitialAds();
      else if (typeof ysdk.adv.showFullscreenAds === 'function') ysdk.adv.showFullscreenAds();
    } catch (e) { done(); }
    // страховка: если колбэков нет — звук сам не восстановится
    setTimeout(done, 15000);
  }
  function reward() {
    if (!ysdk || !ysdk.adv) return;
    pauseAudioForAd();
    try {
      if (typeof ysdk.adv.showRewardedVideo === 'function') {
        ysdk.adv.showRewardedVideo({ onClosed: resumeAudioAfterAd, onError: resumeAudioAfterAd });
      }
    } catch (e) { resumeAudioAfterAd(); }
  }

  // rewarded с промисом: resolve(true) если награда выдана
  function rewardPromise() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resumeAudioAfterAd(); resolve(v); } };
      try {
        if (!ysdk || !ysdk.adv || typeof ysdk.adv.showRewardedVideo !== 'function') {
          // вне платформы Яндекса (локальный тест) — считаем просмотренным
          finish(true); return;
        }
        let closedByClick = false;
        pauseAudioForAd();
        const options = {
          onRewarded: () => finish(true),
          onClosed: () => { resumeAudioAfterAd(); finish(closedByClick); },
          onOpened: () => {},
          onError: () => { resumeAudioAfterAd(); finish(false); },  // показ не состоялся → награды нет
        };
        const adv = ysdk.adv.showRewardedVideo(options);
        // страховка: если промпис не разрешился за 3 минуты — считаем провалом
        setTimeout(() => finish(false), 180000);
        if (adv && typeof adv.then === 'function') adv.then(() => {}, () => finish(false));
      } catch (e) { finish(false); }
    });
  }

  // Межстраничная реклама с троттлингом (не чаще раза в minGap мс)
  let _lastInter = 0;
  function interstitialThrottled(minGapMs) {
    const now = Date.now();
    if (now - _lastInter < (minGapMs || 90000)) return false;
    _lastInter = now; interstitial(); return true;
  }

  // Запрос оценки игры (новый feedback.requestReview / старый rateGame)
  let _rated = false;
  async function requestRating() {
    if (_rated) return false;
    try {
      if (!ysdk) return false;
      if (ysdk.feedback && typeof ysdk.feedback.requestReview === 'function') {
        _rated = true; await ysdk.feedback.requestReview(); return true;
      }
      if (typeof ysdk.rateGame === 'function') {
        _rated = true; await ysdk.rateGame(); return true;
      }
    } catch (e) {}
    return false;
  }

  function toast(msg) {
    try {
      if (ysdk && ysdk.player && ysdk.player.showBannerAlert) {
        ysdk.player.showBannerAlert({ message: msg });
        return;
      }
    } catch (e) {}
    if (typeof console !== 'undefined') console.log('[yg]', msg);
  }

  function locale() {
    // язык даёт только SDK Яндекса; вне iframe — русский по умолчанию
    try {
      if (ysdk && ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang) {
        return ysdk.environment.i18n.lang;
      }
    } catch (e) {}
    return 'ru';
  }

  function stopGameplay() {
    try {
      if (ysdk && ysdk.features && ysdk.features.GameplayAPI) ysdk.features.GameplayAPI.stop();
    } catch (e) {}
  }

  return { init, saveData, loadData, setScore, getTop, abTest, fullScreen,
           sdk: () => ysdk, loadingReady, gameplayStart, gameplayStop,
           pauseAudioForAd, resumeAudioAfterAd,
           interstitial, interstitialThrottled, reward, rewardPromise, requestRating,
           toast, locale, stopGameplay, reportProgress,
           loadingFinish: loadingReady,
           adv: interstitial, rewardVideo: reward, monetization: () => ysdk };
})();
