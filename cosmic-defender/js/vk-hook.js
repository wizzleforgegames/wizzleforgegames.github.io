/* vk-hook.js — перехват покупок через VK Play.
 * Определяет window.NativeBilling и window.NativeAds,
 * чтобы main.js работал без изменений.
 */
(function () {
  'use strict';

  // === Каталог товаров ===
  // Ключи совпадают с PREMIUM_PRODUCT_ID из main.js ("novaPrime")
  var PRODUCTS = {
    'novaPrime': { id: '1001', amount: 199.00, name: 'NOVA PRIME' },
    'nova_prime': { id: '1001', amount: 199.00, name: 'NOVA PRIME' }
  };

  // =====================================================
  // ADS — VK Play не поддерживает interstitial/rewarded
  // в базовом API. Делаем no-op, чтобы кнопки "Возродиться"
  // не крашились (просто не сработают — вернётся false).
  // =====================================================
  // =====================================================
  // ADS — VK Bridge (VKWebAppShowNativeAds / VKWebAppShowRewarded).
  // VK Play отдаёт игру во фрейме на домене VK, поэтому рекламные
  // методы VK Bridge доступны, если фреймRecognized как VK-приложение.
  // Вне VK (GitHub Pages, локальный тест) — без рекламы: вознаграждение
  // выдаётся бесплатно, чтобы игру можно было играть целиком.
  // =====================================================
  var BRIDGE_URLS = [
    'https://unpkg.com/@vkontakte/vk-bridge@3.0.2/dist/browser.min.js',
    'https://cdn.jsdelivr.net/npm/@vkontakte/vk-bridge@3.0.2/dist/browser.min.js',
    'https://unpkg.com/@vkontakte/vk-bridge/dist/sdk.min.js'
  ];
  var bridge = null, inVK = false, bridgeTried = false;
  var sup = {}, hasInter = false, hasReward = false;

  function detectVK() {
    try {
      var q = new URLSearchParams(location.search);
      var appId = parseInt(q.get('vk_app_id') || q.get('app_id') || window.VK_PLAY_APP_ID || '0', 10) || 0;
      var ref = ''; try { ref = document.referrer || ''; } catch (e) {}
      /* referrer площадки — главный признак; плюс явный ?vk=1 для тестов и сборок */
      var refVK = /vkplay[.]ru|play[.]vk[.]com|game[.]mail[.]ru|odnoklassniki[.]ru/i.test(ref);
      inVK = !!(appId || window.__vkit || refVK || q.get('vk') === '1' ||
                /VKApp|vkWebView|vk[.]com|vkplay/i.test(navigator.userAgent));
    } catch (e) {}
  }
  function loadOne(u) {
    return new Promise(function (res) {
      var s = document.createElement('script');
      s.src = u; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { res(!!(window.vkBridge || window.vkConnect)); };
      s.onerror = function () { s.remove(); res(false); };
      document.head.appendChild(s);
      setTimeout(function () { res(!!(window.vkBridge || window.vkConnect)); }, 5000);
    });
  }
  async function loadBridge() {
    if (bridgeTried) return !!bridge;
    bridgeTried = true;
    for (var i = 0; i < BRIDGE_URLS.length; i++) {
      if (await loadOne(BRIDGE_URLS[i])) {
        bridge = window.vkBridge || window.vkConnect || null;
        if (bridge) { console.log('[VK ADS] bridge loaded'); return true; }
      }
    }
    console.log('[VK ADS] bridge not loaded');
    return false;
  }
  function sendM(m, p, ms) {
    if (!bridge || !inVK) return Promise.resolve({ ok: false, why: 'off' });
    try {
      var pr = bridge.send(m, p || {}).then(
        function (d) { return { ok: true, data: d }; },
        function (e) { return { ok: false, err: (e && (e.error_reason || e.error_msg)) || String(e) }; });
      var to = new Promise(function (r) { setTimeout(function () { r({ ok: false, why: 'timeout' }); }, ms || 15000); });
      return Promise.race([pr, to]);
    } catch (e) { return Promise.resolve({ ok: false, err: String(e) }); }
  }
  function withTimeout(pr, ms) {
    return Promise.race([pr, new Promise(function (r) { setTimeout(function () { r(false); }, ms); })]);
  }
  async function supportsM(m) {
    if (!bridge) return false;
    if (m in sup) return sup[m];
    try { if (bridge.supportsAsync) { sup[m] = await withTimeout(Promise.resolve(bridge.supportsAsync(m)), 4000); return sup[m]; } } catch (e) {}
    try { if (bridge.supports) { sup[m] = !!bridge.supports(m); return sup[m]; } } catch (e) {}
    sup[m] = true; return true;
  }
  async function check(format) {
    if (!inVK || !bridge) return false;
    var r = await sendM('VKWebAppCheckNativeAds', { ad_format: format }, 6000);
    return !!(r.ok && r.data && (r.data.result === true || r.data.is_ready === true || r.data.has_ad));
  }

  window.NativeAds = {
    ready: false,
    inVK: false,
    init: function () {
      detectVK();
      this.inVK = inVK;
      var self = this;
      return loadBridge().then(function (ok) {
        if (!ok || !inVK) { console.log('[VK ADS] standalone mode — ads skipped'); self.ready = true; return; }
        return Promise.all([check('interstitial'), check('reward')]).then(function (r) {
          hasInter = r[0]; hasReward = r[1];
          console.log('[VK ADS] ready inter=' + hasInter + ' reward=' + hasReward);
          self.ready = true;
        });
      }).catch(function (e) { console.warn('[VK ADS] init fail', e); self.ready = true; });
    },
    showBanner: function () {
      if (!inVK) return;
      sendM('VKWebAppShowBannerShow', { banner_style: 'promobanner', location: 'bottom' }, 6000)
        .then(function (r) { if (!r.ok) return sendM('VKWebAppShowBannerAd', { banner_location: 'bottom', banner_align: 'center', height_type: 'compact', can_close: false }, 6000); });
    },
    hideBanner: function () {
      if (!inVK) return;
      sendM('VKWebAppShowBannerHide', {}, 6000).then(function (r) {
        if (!r.ok) sendM('VKWebAppHideBannerAd', {}, 6000);
      });
    },
    prepareInterstitial: function () { check('interstitial').then(function (v) { hasInter = v; }); },
    showInterstitial: function () {
      if (!inVK || !bridge) return Promise.resolve(false);
      return supportsM('VKWebAppShowNativeAds').then(function (ok) {
        if (!ok) return false;
        return sendM('VKWebAppShowNativeAds', { ad_format: 'interstitial' }, 90000).then(function (r) {
          console.log('[VK ADS] interstitial:', r);
          return !!(r.ok);
        });
      });
    },
    prepareRewarded: function () { check('reward').then(function (v) { hasReward = v; }); },
    showRewarded: function (onReward) {
      if (!inVK || !bridge) {
        // вне VK (GitHub Pages / локальный тест) — выдаём награду без рекламы
        console.log('[VK ADS] standalone — reward given without ad');
        if (onReward) onReward(true);
        return Promise.resolve(true);
      }
      return supportsM('VKWebAppShowNativeAds').then(function (ok) {
        if (!ok) return supportsM('VKWebAppShowRewarded').then(function (ok2) {
          if (!ok2) { if (onReward) onReward(false); return false; }
          return sendM('VKWebAppShowRewarded', {}, 120000).then(function (r) {
            var got = !!(r.ok && r.data && (r.data.action === 'goalAchieved' || r.data.is_reward));
            if (onReward) onReward(got);
            return got;
          });
        });
        return sendM('VKWebAppShowNativeAds', { ad_format: 'reward' }, 120000).then(function (r) {
          var got = !!(r.ok && r.data && (r.data.action === 'goalAchieved' || r.data.is_reward));
          if (!got && r.ok) {
            // некоторые площадки возвращают просто result:true
            got = (r.data.result === true);
          }
          console.log('[VK ADS] rewarded:', r, '->', got);
          if (onReward) onReward(got);
          return got;
        });
      }).catch(function (e) { console.warn('[VK ADS] rewarded fail', e); if (onReward) onReward(false); return false; });
    }
  };

  // =====================================================
  // IAP — через VK Play paymentFrame
  // =====================================================
  var pendingPurchase = null;
  var pendingTimer = null;
  var TIMEOUT_MS = 180000; // 3 мин — VK Play может обрабатывать долго

  function clearPending(success) {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    if (!pendingPurchase) return;
    var p = pendingPurchase;
    pendingPurchase = null;
    try {
      p.resolve({
        success: !!success,
        productID: success ? p.productId : undefined,
        canceled: !success
      });
    } catch (e) { console.warn('[VK IAP] resolve fail:', e); }
  }

  function startPurchase(productId) {
    return new Promise(function (resolve) {
      var product = PRODUCTS[productId];
      if (!product) {
        console.warn('[VK IAP] Unknown product:', productId);
        resolve({ success: false });
        return;
      }

      if (!window.vkPlayApi || typeof window.vkPlayApi.paymentFrame !== 'function') {
        console.warn('[VK IAP] VK Play API not ready');
        resolve({ success: false, canceled: true });
        return;
      }

      if (pendingPurchase) {
        try { pendingPurchase.resolve({ success: false, canceled: true }); } catch (e) {}
        if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      }

      pendingPurchase = { productId: productId, resolve: resolve };

      try {
        window.vkPlayApi.paymentFrame({
          merchant_param: {
            uid: (window.vkPlayUser && window.vkPlayUser.uid) || 'guest',
            amount: product.amount.toFixed(2),
            currency: 'RUB',
            description: product.name,
            item_id: product.id
          },
          callback: function (result) {
            console.log('[VK IAP] payment result:', result);
            if (result && (result.success || result.status === 'success')) {
              rememberPurch(productId);   // чтобы «NOVA PRIME» не терялся после перезагрузки
              clearPending(true);
            } else {
              clearPending(false);
            }
          }
        });

        pendingTimer = setTimeout(function () {
          console.log('[VK IAP] timeout after ' + (TIMEOUT_MS/1000) + 's');
          clearPending(false);
        }, TIMEOUT_MS);

        console.log('[VK IAP] paymentFrame opened for', productId);
      } catch (e) {
        console.warn('[VK IAP] paymentFrame error:', e);
        clearPending(false);
      }
    });
  }

  var PURCH_KEY = 'cd_purchases';
  function loadPurch() { try { return JSON.parse(localStorage.getItem(PURCH_KEY) || '[]'); } catch (e) { return []; } }
  function savePurch(l) { try { localStorage.setItem(PURCH_KEY, JSON.stringify(l)); } catch (e) {} }
  function rememberPurch(productId) {
    var l = loadPurch();
    if (!l.some(function (p) { return (p.productID || p.id) === productId; })) {
      l.push({ productID: productId, id: productId, purchaseToken: 'vk-' + Date.now(), at: Date.now() });
      savePurch(l);
    }
  }
  window.NativeBilling = {
    purchase: function (productId) { return startPurchase(productId); },
    requestPurchase: function (productId) { return startPurchase(productId); },
    getPurchases: function () { return Promise.resolve(loadPurch()); }
  };


  /* =====================================================
     LEADERBOARD — VK Play (mailru core). Пробуем реальные методы
     api; если их нет — локальная таблица рекордов, чтобы UI работал.
     ===================================================== */
  var LB_KEY = 'cd_lb_vk';
  function localLb() { try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); } catch (e) { return []; } }
  function saveLb(l) { try { localStorage.setItem(LB_KEY, JSON.stringify(l)); } catch (e) {} }
  function apiCall(name, args) {
    return new Promise(function (res) {
      var api = window.vkPlayApi;
      if (!api || typeof api[name] !== 'function') { res(null); return; }
      var done = false;
      var cb = function (r) { if (!done) { done = true; res(r); } };
      try {
        var pr = api[name].apply(api, (args || []).concat([cb]));
        if (pr && typeof pr.then === 'function') pr.then(cb, function () { cb(null); });
      } catch (e) { cb(null); }
      setTimeout(function () { cb(null); }, 6000);
    });
  }
  window.NativeBoard = {
    submit: function (kind, score) {
      score = Math.max(0, Math.round(score || 0));
      var l = localLb();
      l.push({ score: score, date: new Date().toLocaleDateString('ru-RU'), me: true });
      l.sort(function (a, b) { return b.score - a.score; });
      saveLb(l.slice(0, 20));
      var names = ['setScore', 'setTopScore', 'saveScore', 'setLeaderboardScore'];
      var i = 0;
      (function next() {
        if (i >= names.length) return;
        apiCall(names[i++], [score]).then(function (r) { if (r === null) next(); });
      })();
      return Promise.resolve(true);
    },
    entries: function (kind) {
      var names = ['getTopScores', 'getTop', 'getLeaderboard', 'getScores'];
      var i = 0;
      return new Promise(function (res) {
        (function next() {
          if (i >= names.length) { res(localLb()); return; }
          apiCall(names[i++], [20]).then(function (r) {
            if (r && (r.scores || r.entries || Array.isArray(r))) {
              var arr = r.scores || r.entries || r;
              res(arr.map(function (x, k) {
                return { rank: x.rank || k + 1, name: (x.user && (x.user.name || x.user.nick)) || x.name || ('Игрок ' + (k + 1)),
                         score: x.score || x.points || 0, me: !!x.me };
              }));
              return;
            }
            next();
          });
        })();
      });
    },
    platformAchievements: function () { return Promise.resolve([]); }
  };

  console.log('[VK] hooks installed (NativeBilling + NativeAds + NativeBoard)');
})();
