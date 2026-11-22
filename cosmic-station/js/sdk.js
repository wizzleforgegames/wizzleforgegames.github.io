/* Cosmic Station Idle — обёртка над Yandex Games SDK.
   Работает и на платформе, и локально (file://): всё обёрнуто в try/catch.
   Поддерживает современный Player API (ysdk.getPlayer / setData / getData)
   и наследие FeaturesAPI.PlayersAPI (saveGame / getGameProgress). */
(function (root) {
  'use strict';

  var YSDK = {
    sdk: null,
    player: null,      // современный: ysdk.getPlayer()
    players: null,     // наследие: sdk.features.PlayersAPI
    ready: false,
    initPromise: null
  };

  function noop() {}

  function ensureWindow() {
    if (!root.YaGames) return null;
    return root.YaGames;
  }

  YSDK.init = function () {
    if (YSDK.initPromise) return YSDK.initPromise;
    var YaGames = ensureWindow();
    if (!YaGames) {
      YSDK.initPromise = Promise.resolve(YSDK);
      return YSDK.initPromise;
    }
    YSDK.initPromise = YaGames.init().then(function (sdk) {
      YSDK.sdk = sdk;
      // современные фичи
      try { YSDK.player = sdk.getPlayer ? sdk.getPlayer() : null; } catch (e) { YSDK.player = null; }
      // наследие
      try { YSDK.players = sdk.features && sdk.features.PlayersAPI || null; } catch (e) { YSDK.players = null; }
      return YSDK;
    }).catch(function (err) {
      console.warn('Yandex SDK init failed:', err);
      YSDK.sdk = null;
      YSDK.player = null;
      YSDK.players = null;
      return YSDK;
    });
    return YSDK.initPromise;
  };

  /* отметить готовность игры (LoadingAPI) */
  YSDK.markReady = function () {
    YSDK.ready = true;
    try {
      var la = YSDK.sdk && YSDK.sdk.features && YSDK.sdk.features.LoadingAPI;
      if (la && typeof la.ready === 'function') la.ready();
    } catch (e) {}
  };

  /* старт/остановка игровой сессии для статистики */
  YSDK.gameplayStart = function () {
    try {
      var g = YSDK.sdk && YSDK.sdk.features && YSDK.sdk.features.GameplayAPI;
      if (g && typeof g.start === 'function') g.start();
    } catch (e) {}
  };
  YSDK.gameplayStop = function () {
    try {
      var g = YSDK.sdk && YSDK.sdk.features && YSDK.sdk.features.GameplayAPI;
      if (g && typeof g.stop === 'function') g.stop();
    } catch (e) {}
  };


  /* загрузка платформенного SDK (/sdk.js) при запуске вне Yandex */
  YSDK.boot = function (cb) {
    if (root.YaGames) { if (cb) cb(); return; }
    var done = false;
    var fin = function () { if (done) return; done = true; if (cb) cb(); };
    try {
      var s = document.createElement('script');
      s.src = 'https://yandexgames.ru/sdk.js'; s.async = true;
      s.onload = fin; s.onerror = fin;
      (document.head || document.documentElement).appendChild(s);
      setTimeout(fin, 2500);
    } catch (e) { fin(); }
  };

  /* межстраничная реклама (не чаще раза в 3 минуты — требование разумной частоты) */
  var _lastInter = 0;
  YSDK.interstitial = function (cb) {
    var sdk = YSDK.sdk;
    if (!sdk || !sdk.adv || typeof sdk.adv.showFullscreenAdv !== 'function') { if (cb) cb(false); return; }
    var now = Date.now();
    if (now - _lastInter < 180000) { if (cb) cb(false); return; }
    _lastInter = now;
    var done = false;
    try {
      sdk.adv.showFullscreenAdv({ callbacks: {
        onClose: function (wasShown) { if (done) return; done = true; if (cb) cb(!!wasShown); },
        onOpen: function () {}, onError: function () { if (done) return; done = true; if (cb) cb(false); }
      } });
    } catch (e) { if (cb) cb(false); }
  };

  /* диалог оценки игры */
  YSDK.rateGame = function () {
    var sdk = YSDK.sdk;
    try {
      if (sdk && sdk.feedback && typeof sdk.feedback.requestReview === 'function') { sdk.feedback.requestReview(); return; }
      if (sdk && sdk.promptShowRating) sdk.promptShowRating();
    } catch (e) {}
  };

  /* язык и окружение */
  YSDK.lang = function () { try { return (YSDK.sdk && YSDK.sdk.environment && YSDK.sdk.environment.i18n && YSDK.sdk.environment.i18n.lang) || 'ru'; } catch (e) { return 'ru'; } };
  YSDK.isPlayable = function () { try { return !!(YSDK.sdk && YSDK.sdk.environment && YSDK.sdk.environment.playable); } catch (e) { return false; } };

  /* Показать rewarded-рекламу и выдать награду. callback(ok).
     Актуальный API Яндекс Игр: ysdk.adv.showRewardedVideo({callbacks:{onOpen,onRewarded,onClose,onError}}).
     Фолбеки: showFullScreenRewards (наследие), showFullscreenAdv (межстраничная как награда). */
  YSDK.showAds = function (cb) {
    var sdk = YSDK.sdk;
    if (!sdk || !sdk.adv) { if (cb) cb(true); return; }
    var done = false;
    var fin = function (v) { if (done) return; done = true; if (cb) cb(!!v); };
    setTimeout(function () { fin(false); }, 30000);
    var rewarded = false;
    var cbs = {
      onOpen: function () {}, onOpened: function () {},
      onRewarded: function () { rewarded = true; },
      onClose: function (wasShown) {
        if (typeof wasShown === 'boolean') fin(wasShown || rewarded); else fin(true);
      },
      onError: function () { fin(false); },
      onDismiss: function () { fin(true); }
    };
    try {
      if (typeof sdk.adv.showRewardedVideo === 'function') { sdk.adv.showRewardedVideo({ callbacks: cbs }); return; }
      if (typeof sdk.adv.showFullScreenRewards === 'function') { sdk.adv.showFullScreenRewards({ callbacks: cbs }); return; }
      if (typeof sdk.adv.showFullscreenAdv === 'function') { sdk.adv.showFullscreenAdv({ callbacks: cbs }); return; }
      fin(false);
    } catch (e) { fin(false); }
  };

  /* аналитика / события (sdk.events / sdk.analytics) */
  YSDK.event = function (name, data) {
    var sdk = YSDK.sdk;
    if (!sdk || !sdk.events) return;
    try {
      if (typeof sdk.events === 'function') sdk.events(name, data);
      else if (typeof sdk.events.send === 'function') sdk.events.send(name, data);
      else if (typeof sdk.events[name] === 'function') sdk.events[name](data);
    } catch(e){}
  };
  YSDK.analytics = function (eventType, eventParams) {
    var sdk = YSDK.sdk;
    if (!sdk || !sdk.analytics || typeof sdk.analytics !== 'function') return;
    try { sdk.analytics(eventType, eventParams); } catch(e){}
  };

  /* сохранение в облако Яндекса (современный + наследие) */
  YSDK.saveGame = function (data) {
    var player = YSDK.player;
    if (player && typeof player.setData === 'function') {
      // flush=true — сохранить немедленно
      player.setData({ save: data }, true).then(function(){}, function(){});
      return;
    }
    var legacy = YSDK.players;
    if (legacy && typeof legacy.saveGame === 'function') {
      try { legacy.saveGame(data); } catch (e) {}
      return;
    }
  };

  /* загрузка из облака Яндекса (современный + наследие). callback(jsonString|null) */
  YSDK.loadGame = function (cb) {
    var player = YSDK.player;
    if (player && typeof player.getData === 'function') {
      try {
        player.getData(['save']).then(function (arr) {
          var d = arr && arr[0] && arr[0].value;
          if (d == null) { cb(null); return; }
          if (typeof d === 'string') { cb(d); return; }
          if (d instanceof Uint8Array) {
            try { cb(new TextDecoder('utf-8',{fatal:false}).decode(d)); return; } catch(e){}
            cb(String.fromCharCode.apply(null, new Uint16Array(d))); return;
          }
          cb(String(d));
        }).catch(function () { cb(null); });
        return;
      } catch (e) { cb(null); return; }
    }
    var legacy = YSDK.players;
    if (legacy && typeof legacy.getGameProgress === 'function') {
      try {
        legacy.getGameProgress().then(function (progress) {
          var d = progress && progress.data;
          if (d == null) { cb(null); return; }
          if (typeof d === 'string') { cb(d); }
          else if (d instanceof Uint8Array) {
            try { cb(new TextDecoder('utf-8',{fatal:false}).decode(d)); }
            catch (e) { cb(String.fromCharCode.apply(null, new Uint16Array(d))); }
          } else { cb(String(d)); }
        }).catch(function () { cb(null); });
      } catch (e) { cb(null); }
      return;
    }
    if (cb) cb(null);
  };

  /* ---------- лидерборды Яндекс Игр ---------- */
  var _lbs=null, _lbPromise=null;
  YSDK.getLeaderboards = function () {
    var sdk = YSDK.sdk;
    if (!sdk || typeof sdk.getLeaderboards !== 'function') return Promise.resolve(null);
    if (_lbs) return Promise.resolve(_lbs);
    if (!_lbPromise) {
      try { _lbPromise = sdk.getLeaderboards().then(function (l) { _lbs = l || null; return _lbs; }, function () { return null; }); }
      catch (e) { return Promise.resolve(null); }
    }
    return _lbPromise;
  };
  /* отправить счёт (энергия за всё время) */
  YSDK.submitScore = function (score, cb) {
    YSDK.getLeaderboards().then(function (lbs) {
      if (!lbs || !lbs.leaderboards || !lbs.leaderboards.length) { if (cb) cb(false); return; }
      var lb = lbs.leaderboards[0];
      try {
        lb.setScore({ score: Math.floor(score) })
          .then(function () { if (cb) cb(true); }, function () { if (cb) cb(false); });
      } catch (e) { if (cb) cb(false); }
    });
  };
  /* поиск нужной таблицы по имени (сезонная таблица настраивается во второй) */
  function _lbFind(lbs, name) {
    if (!lbs || !lbs.leaderboards || !lbs.leaderboards.length) return null;
    var arr = lbs.leaderboards, i;
    if (name) {
      var ln = String(name).toLowerCase();
      for (i = 0; i < arr.length; i++) {
        var t = String(arr[i].title || arr[i].id || '').toLowerCase();
        if (t.indexOf(ln) >= 0) return arr[i];
      }
    }
    return arr[0];
  }
  YSDK.submitScoreNamed = function (name, score, cb) {
    YSDK.getLeaderboards().then(function (lbs) {
      var lb = _lbFind(lbs, name);
      if (!lb) { if (cb) cb(false); return; }
      try { lb.setScore({ score: Math.floor(score) }).then(function () { if (cb) cb(true); }, function () { if (cb) cb(false); }); }
      catch (e) { if (cb) cb(false); }
    });
  };
  YSDK.showLeaderboardNamed = function (name, cb) {
    YSDK.getLeaderboards().then(function (lbs) {
      var lb = _lbFind(lbs, name);
      if (!lb) { if (cb) cb(false); return; }
      try { lb.show({ onNextPage: function () {} }); if (cb) cb(true); } catch (e) { if (cb) cb(false); }
    });
  };
  /* показать таблицу рекордов */
  YSDK.showLeaderboards = function (cb) {
    YSDK.getLeaderboards().then(function (lbs) {
      if (!lbs || !lbs.leaderboards || !lbs.leaderboards.length) { if (cb) cb(false); return; }
      try { lbs.leaderboards[0].show({ onNextPage: function () {} }); if (cb) cb(true); }
      catch (e) { if (cb) cb(false); }
    });
  };

  // фолбек: если YaGames SDK ещё не подключён (локальный file://) — не роняем инициализацию
  try {
    if (typeof root.YaGames === 'undefined') {
      function _YaGamesFallback() {}
      _YaGamesFallback.init = function(){
        return Promise.resolve({
          features:{},
          getPlayer: function(){ return {
            setData:function(){return Promise.resolve();},
            getData:function(){ return Promise.resolve([]); }
          }; }
        });
      };
      root.YaGames = _YaGamesFallback;
    }
  } catch (e) {}
  root.YSDK = YSDK;
})(typeof window!=='undefined'?window:this);
