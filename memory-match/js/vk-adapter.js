/* vk-adapter.js — единый адаптер площадки VK Play для браузерных сборок.
   Ставить ПОСЛЕ <script>window.VK_PLAY_APP_ID=<id></script> и ДО sdk игры.
   Делает:
     1) определяет, что игра внутри iframe VK Play;
     2) грузит mailru.core.js (iframeApi) — платежи VK Play;
     3) грузит @vkontakte/vk-bridge — реклама VK (native interstitial / reward / banner);
     4) подсовывает игре совместимый объект window.YaGames (ysdk-совместимый фасад),
        чтобы код, написанный под Яндекс Игры, работал и в VK Play.
   Вне VK Play не делает ничего. */
(function () {
  'use strict';
  var LOG = '[VK-ADAPTER]';
  function info() { try { console.log.apply(console, [LOG].concat([].slice.call(arguments))); } catch (e) {} }

  /* ---------- определение площадки ---------- */
  function qp(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  function appId() {
    var id = parseInt(qp('vk_app_id') || qp('app_id') || qp('appid') || window.VK_PLAY_APP_ID || 0, 10) || 0;
    if (!id) { try { var m = (document.referrer || '').match(/vkplay\.ru\/app\/(\d+)/); if (m) id = +m[1]; } catch (e) {} }
    return id;
  }
  /* Признаки именно VK Play: referrer домена площадки, UA, явный ?vk=1 или vk_app_id.
     Просто «мы во фрейме» — НЕ признак (в Яндекс Играх тоже фрейм). */
  function inVKPlay() {
    if (window.self === window.top) return false;
    var r = ''; try { r = document.referrer || ''; } catch (e) {}
    if (/vkplay\.ru|play\.vk\.com|game\.mail\.ru|odnoklassniki\.ru/.test(r)) return true;
    if (/vkplay|VKApp|vkWebView|MyGamesApp/i.test(navigator.userAgent || '')) return true;
    if (qp('vk') === '1' || qp('vk_app_id') || qp('app_id') || qp('appid')) return true;
    return false;
  }
  var APP = appId();
  if (!inVKPlay()) { window.VK_PLAY = { active: false, appId: APP }; return; }
  info('VK Play iframe, app id =', APP);

  /* ---------- загрузка скриптов ---------- */
  function loadScript(u, ms) {
    return new Promise(function (res) {
      var s = document.createElement('script');
      s.src = u; s.async = true; s.crossOrigin = 'anonymous';
      var done = false;
      s.onload = function () { if (!done) { done = true; res(true); } };
      s.onerror = function () { if (!done) { done = true; s.remove(); res(false); } };
      document.head.appendChild(s);
      setTimeout(function () { if (!done) { done = true; res(false); } }, ms || 6000);
    });
  }

  /* ---------- VK Bridge: реклама ---------- */
  var BRIDGE_URLS = [
    'https://unpkg.com/@vkontakte/vk-bridge@3.0.2/dist/browser.min.js',
    'https://cdn.jsdelivr.net/npm/@vkontakte/vk-bridge@3.0.2/dist/browser.min.js',
    'https://unpkg.com/@vkontakte/vk-bridge/dist/sdk.min.js'
  ];
  var bridge = null, sup = {};
  async function loadBridge() {
    for (var i = 0; i < BRIDGE_URLS.length && !bridge; i++) {
      if (await loadScript(BRIDGE_URLS[i], 6000)) bridge = window.vkBridge || window.vkConnect || null;
    }
    info('bridge:', !!bridge);
    return !!bridge;
  }
  function send(m, p, ms) {
    if (!bridge) return Promise.resolve({ ok: false, why: 'nobridge' });
    try {
      var pr = bridge.send(m, p || {}).then(
        function (d) { return { ok: true, data: d }; },
        function (e) { return { ok: false, err: (e && (e.error_reason || e.error_msg)) || String(e) }; });
      var to = new Promise(function (r) { setTimeout(function () { r({ ok: false, why: 'timeout' }); }, ms || 20000); });
      return Promise.race([pr, to]);
    } catch (e) { return Promise.resolve({ ok: false, err: String(e) }); }
  }
  function withTimeout(pr, ms) {
    return Promise.race([pr, new Promise(function (r) { setTimeout(function () { r(false); }, ms); })]);
  }
  async function supports(m) {
    if (!bridge) return false;
    if (m in sup) return sup[m];
    try { if (bridge.supportsAsync) { sup[m] = await withTimeout(Promise.resolve(bridge.supportsAsync(m)), 4000); return sup[m]; } } catch (e) {}
    try { if (bridge.supports) { sup[m] = !!bridge.supports(m); return sup[m]; } } catch (e) {}
    sup[m] = true; return true;
  }

  /* ---------- VK Play iframeApi: платежи ---------- */
  var api = null, apiReady = null;
  function initIframeApi() {
    if (apiReady) return apiReady;
    apiReady = new Promise(async function (res) {
      if (!APP) return res(null);
      if (!window.iframeApi) await loadScript('https://vkplay.ru/app/' + APP + '/static/mailru.core.js', 6000);
      if (typeof window.iframeApi !== 'function') { info('iframeApi нет'); return res(null); }
      try {
        var p = window.iframeApi({
          appid: String(APP),
          getLoginStatusCallback: function (s) { window.VK_PLAY_USER = (s && (s.loggedIn || s.auth)) ? (s.user || { uid: s.uid }) : null; },
          paymentReceivedCallback: function (d) { info('paymentReceived', d); },
          errorCallback: function (e) { info('iframeApi error', e); }
        });
        var a = await Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, 9000); })]);
        api = a; info('iframeApi готов:', !!a); res(a);
      } catch (e) { info('iframeApi init fail', e); res(null); }
    });
    return apiReady;
  }

  /* ---------- реклама: единая точка ---------- */
  var lastAdAt = 0;
  async function showInterstitial() {
    if (!bridge) return false;
    if (!(await supports('VKWebAppShowNativeAds'))) return false;
    var t = Date.now();
    if (t - lastAdAt < 60000) return false;   // не чаще раза в минуту
    lastAdAt = t;
    var r = await send('VKWebAppShowNativeAds', { ad_format: 'interstitial' }, 90000);
    info('interstitial', r);
    return !!r.ok;
  }
  async function showRewarded(cb) {
    var done = function (v) { try { if (typeof cb === 'function') cb(v); } catch (e) {} return v; };
    if (!bridge) return done(false);
    if (await supports('VKWebAppShowNativeAds')) {
      var r = await send('VKWebAppShowNativeAds', { ad_format: 'reward' }, 120000);
      var got = !!(r.ok && r.data && (r.data.action === 'goalAchieved' || r.data.is_reward || r.data.result === true));
      info('reward(native)', r, got); return done(got);
    }
    if (await supports('VKWebAppShowRewarded')) {
      var r2 = await send('VKWebAppShowRewarded', {}, 120000);
      var got2 = !!(r2.ok && r2.data && (r2.data.action === 'goalAchieved' || r2.data.is_reward));
      info('reward(legacy)', r2, got2); return done(got2);
    }
    return done(false);
  }
  function showBanner(show) {
    if (!bridge) return;
    if (show) {
      send('VKWebAppShowBannerShow', { banner_style: 'promobanner', location: 'bottom' }, 6000)
        .then(function (r) { if (!r.ok) send('VKWebAppShowBannerAd', { banner_location: 'bottom', banner_align: 'center', height_type: 'compact', can_close: false }, 6000); });
    } else {
      send('VKWebAppShowBannerHide', {}, 6000).then(function (r) { if (!r.ok) send('VKWebAppHideBannerAd', {}, 6000); });
    }
  }

  /* ---------- платежи VK Play ---------- */
  var CATALOG = window.VK_PLAY_PRODUCTS || {};
  function buy(item) {
    return new Promise(async function (res) {
      var a = await initIframeApi();
      if (!a || typeof a.paymentFrame !== 'function') { info('paymentFrame недоступен'); return res({ success: false, canceled: true }); }
      var uid = (window.VK_PLAY_USER && window.VK_PLAY_USER.uid) || 'guest';
      try {
        a.paymentFrame({
          merchant_param: {
            uid: String(uid), amount: Number(item.amount || 0).toFixed(2), currency: 'RUB',
            description: item.title || item.name || String(item.id), item_id: String(item.id)
          },
          callback: function (r) {
            var ok = !!(r && (r.success || r.status === 'success'));
            info('payment result', r, ok);
            res({ success: ok, canceled: !ok, id: item.id, purchaseToken: ok ? ('vk-' + Date.now()) : undefined });
          }
        });
      } catch (e) { info('paymentFrame error', e); res({ success: false, canceled: true }); }
    });
  }

  /* ---------- ysdk-совместимый фасад ---------- */
  function makeYsdk() {
    var storage = {};
    try { storage = JSON.parse(localStorage.getItem('vkplay_player') || '{}'); } catch (e) {}
    var player = {
      getData: function () { return Promise.resolve(storage); },
      setData: function (d) { storage = Object.assign(storage || {}, d || {}); try { localStorage.setItem('vkplay_player', JSON.stringify(storage)); } catch (e) {} return Promise.resolve(); },
      isAuthorized: function () { return !!window.VK_PLAY_USER; },
      showBannerAlert: function () {}, showLeaderboardAuthDialog: function () {},
      getStats: function () { return Promise.resolve({ gamesCount: 0, playsCount: 0 }); }
    };
    var adv = {
      showFullscreenAdv: function (o) { o = o || {}; showInterstitial().then(function (v) { try { v ? o.onClose && o.onClose(true) : o.onError && o.onError({}) ; } catch (e) {} }); },
      showFullscreenAds: function (o) { adv.showFullscreenAdv(o); },
      showInterstitialAds: function (o) { adv.showFullscreenAdv(o); },
      showRewardedVideo: function (o) {
        o = o || {};
        showRewarded(function (got) {
          try { o.onRewarded && o.onRewarded(); } catch (e) {}
          try { o.onClose && o.onClose(got); } catch (e) {}
        });
      },
      showRewardVideo: function (o) { adv.showRewardedVideo(o); },
      showBannerAdv: function () { showBanner(true); },
      hideBannerAdv: function () { showBanner(false); },
      showStickyAdv: function (o) { showBanner(true); return { hide: function () { showBanner(false); }, show: function () { showBanner(true); } }; },
      checkRewardedVideoAvailability: function (cb) { try { cb && cb(true); } catch (e) {} },
      getAdvSettings: function () { return Promise.resolve({ ads: { fullScreenAdsShowFrequencyMs: 60000 } }); }
    };
    var payments = {
      init: function () { return Promise.resolve(); },
      initCatalog: function () { return Promise.resolve(); },
      getPrices: function () { return Promise.resolve(Object.keys(CATALOG).map(function (k) { return { id: k, price: String(CATALOG[k].amount), productId: k }; })); },
      getCatalogItems: function () { return payments.getPrices(); },
      getItemById: function (id) { return Promise.resolve(CATALOG[id] ? Object.assign({ id: id }, CATALOG[id]) : null); },
      getPurchases: function () { try { return Promise.resolve(JSON.parse(localStorage.getItem('vkplay_purchases') || '[]')); } catch (e) { return Promise.resolve([]); } },
      purchase: function (id) {
        var it = CATALOG[id]; if (!it) return Promise.resolve({ success: false, canceled: true });
        return buy(Object.assign({ id: id }, it)).then(function (r) {
          if (r.success) {
            var ps; try { ps = JSON.parse(localStorage.getItem('vkplay_purchases') || '[]'); } catch (e) { ps = []; }
            ps.push({ id: id, purchaseToken: r.purchaseToken });
            try { localStorage.setItem('vkplay_purchases', JSON.stringify(ps)); } catch (e) {}
          }
          return r;
        });
      },
      requestPurchase: function (arg) {
        var id = (typeof arg === 'string') ? arg
             : ((arg && (typeof arg.item === 'string' ? arg.item
                        : (arg.item && (arg.item.id || arg.item.productId)))) || (arg && arg.id) || '');
        if (!id) { var e0 = new Error('no item'); e0.code = 'PURCHASE_UNAVAILABLE'; return Promise.reject(e0); }
        return payments.purchase(id).then(function (r) {
          if (r && r.success) return { id: id, itemKey: id, purchaseToken: r.purchaseToken || ('vk-' + Date.now()) };
          var e = new Error('purchase canceled'); e.code = 'PURCHASE_CANCELED'; throw e;
        });
      },
      consumePurchase: function () { return Promise.resolve(); }
    };
    var ACH_KEY = 'vkplay_ach';
    function achLoad() { try { return JSON.parse(localStorage.getItem(ACH_KEY) || '{}'); } catch (e) { return {}; } }
    function achSave(o) { try { localStorage.setItem(ACH_KEY, JSON.stringify(o)); } catch (e) {} }
    var ach = {
      getAchievements: function (list) {
        var have = achLoad();
        return Promise.resolve((list || []).map(function (n) {
          return { title: n, description: n, unlocked: !!have[n], progress: have[n] ? 1 : 0, steps: have[n] ? 1 : 0, image: null };
        }));
      },
      setAchievement: function (name) {
        var have = achLoad();
        if (have[name]) return Promise.resolve({ changed: false, unlocked: true });
        have[name] = Date.now(); achSave(have);
        return Promise.resolve({ changed: true, unlocked: true });
      },
      flushAchievements: function () { return Promise.resolve({ total: Object.keys(achLoad()).length }); }
    };
    var ysdk = {
      app: { id: String(APP) },
      adv: adv, payments: payments, player: player,
      getPlayer: function () { return Promise.resolve(player); },
      getPayments: function () { return Promise.resolve(payments); },
      environment: { appInfo: { lang: 'ru', tld: 'ru', theme: 'light', servicesDomain: 'yandex.ru' },
                     i18n: { lang: 'ru' }, Tld: 'ru', DisplayLanguage: 'ru', theme: { color: 'light' } },
      features: {
        GameplayAPI: { start: function () {}, stop: function () {} },
        LoadingAPI: { ready: function () {}, start: function () {}, stop: function () {} },
        ShowAPI: { start: function () {}, stop: function () {} },
        MonetizationAPI: { showMonetizationPrompt: function () {}, hideMonetizationPrompt: function () {} },
        PromptGamesAPI: { show: function () { return Promise.resolve({ outcome: 'dismissed' }); } },
        PromptInstallAPI: { available: false, prompt: function () {} }
      },
      events: { GameplayAPI: { start: function () {}, stop: function () {} },
                EventType: { GAMEPLAY_AVAILABLE: 'gameplayAvailable', AD_FAILED: 'adShowFailed' },
                onEvent: function () {}, progressChanged: function () {} },
      leaderboards: { isAvailable: function () { return false; },
                      setScore: function () { return Promise.resolve(); },
                      getEntries: function () { return Promise.resolve({ userScore: null, entries: [] }); },
                      getDescription: function () { return Promise.resolve(null); } },
      stats: { event: function () {} },
      actions: { ABTest: { getConfig: function () { return Promise.resolve({ variants: [] }); },
                           isControlExperiment: function () { return true; } } },
      auth: { openAuthDialog: function () { return Promise.resolve(); } },
      fullscreen: { request: function () { try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) {} } },
      share: function (payload) {
        var link = (payload && (payload.link || payload.url)) || location.href;
        return send('VKWebAppShare', { link: link }, 15000).then(function (r) { return r.ok ? { result: 'OK' } : { result: 'FAILED' }; });
      },
      shareUrl: function (url) { return ysdk.share({ link: url || location.href }); },
      feedback: function () {},
      getAchievements: function () { return Promise.resolve(ach); },
      readyGame: function () {}, rateGame: function () {}, loadingReady: function () {},
      isAvailableMethod: function () { return false; },
      on: function () {}, setAdvSettings: function () {},
      lang: 'ru', langCode: 'ru'
    };
    // всё остальное — пустые функции, чтобы игра не падала
    return new Proxy(ysdk, {
      get: function (t, k) {
        if (k in t) return t[k];
        if (typeof k === 'symbol') return undefined;
        // then/catch/finally и служебное — не подменяем, иначе объект
        // считается thenable и Promise.resolve(ysdk) никогда не завершится
        if (k === 'then' || k === 'catch' || k === 'finally' || k === 'toJSON' ||
            k === 'valueOf' || k === 'toString' || k === 'constructor' ||
            k === 'nodeType' || k === 'nodeName' || k === 'length' || k === 'splice' ||
            k.indexOf('@@') === 0 || k === Symbol.toPrimitive) return undefined;
        return function () { return Promise.resolve(null); };
      }
    });
  }

  /* ---------- точка входа ---------- */
  window.VK_PLAY = {
    active: true, appId: APP,
    ads: { interstitial: showInterstitial, rewarded: showRewarded, banner: showBanner },
    pay: { buy: buy, catalog: CATALOG },
    ready: Promise.all([loadBridge(), initIframeApi()]).then(function () {
      if (!window.YaGames) {
        window.YaGames = { init: function () { return Promise.resolve(makeYsdk()); } };
        info('window.YaGames установлен (VK-фасад)');
      }
      return true;
    })
  };
  /* window.YaGames ставим СРАЗУ, не дожидаясь bridge/iframeApi: игра вполне
     может вызвать YaGames.init() раньше. init() сам дождётся готовности. */
  if (!window.YaGames) {
    window.YaGames = {
      init: function () {
        return window.VK_PLAY.ready.catch(function () { return null; }).then(function () { return makeYsdk(); });
      }
    };
    info('window.YaGames установлен синхронно (VK-фасад)');
  }
  if (window.VK_PLAY_AUTOINIT !== false) { window.VK_PLAY.ready.catch(function () {}); }
})();
