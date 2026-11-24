/* wz-bridge.js — мост площадки для Cosmic Defender ВНЕ VK Play.
   VK Play обслуживает js/vk-hook.js (NativeAds + NativeBilling через paymentFrame).
   Здесь закрываем остальные площадки:
     • Яндекс Игры  — настоящий YaGames SDK (ysdk.adv / ysdk.payments / ysdk.leaderboards)
     • APK (RuStore/Google Play) — window.WizzleNative + фасад wz-adapter.js (window.YaGames)
     • наш сайт / зеркало — реклама выключена (награда выдаётся бесплатно),
       покупки идут напрямую через Robokassa (MD5-подпись, возврат на /pay/success.html)
   Ничего не ломает: если vk-hook уже поставил NativeAds/NativeBilling внутри VK — выходим. */
(function () {
  'use strict';
  function qp(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  var inVK = false;
  try {
    inVK = /vkplay\.ru|play\.vk\.com|game\.mail\.ru|odnoklassniki\.ru/.test(document.referrer || '') ||
           /vkplay|VKApp|vkWebView|MyGamesApp/i.test(navigator.userAgent || '') || qp('vk') === '1';
  } catch (e) {}
  if (inVK) { window.WZ_PLATFORM = 'vkplay'; return; }

  var LOGIN = 'wizzleforgegames', PASS1 = 'TK2WLN14OM4P12MR';
  var PRODUCTS = {
    novaPrime:   { sum: 199, title: 'Cosmic Defender: корабль NOVA PRIME' },
    noads:       { sum: 149, title: 'Cosmic Defender: без рекламы' },
    revive:      { sum: 59,  title: 'Cosmic Defender: возрождение' }
  };
  var y = null, facadeDone = false;
  var waiters = [];
  function ready(fn) { if (facadeDone) { fn(!!y); return; } waiters.push(fn); }
  function finish() {
    if (facadeDone) return; facadeDone = true;
    for (var i = 0; i < waiters.length; i++) { try { waiters[i](!!y); } catch (e) {} }
    waiters = [];
  }
  (function initFacade() {
    try {
      if (typeof YaGames === 'undefined' || !YaGames || !YaGames.init) { finish(); return; }
      Promise.resolve(YaGames.init()).then(function (f) { y = f || null; finish(); },
                                             function () { finish(); });
    } catch (e) { finish(); }
    setTimeout(finish, 6000);
  })();

  /* ---------- покупки через Robokassa (для сайта/зеркала) ---------- */
  function localPurchases() { try { return JSON.parse(localStorage.getItem('cd_purchases') || '[]'); } catch (e) { return []; } }
  function savePurchases(l) { try { localStorage.setItem('cd_purchases', JSON.stringify(l)); } catch (e) {} }
  function rbkBuy(productId) {
    var P = PRODUCTS[productId];
    if (!P || typeof MD5 !== 'function') return Promise.resolve({ success: false, canceled: true });
    var inv = String(Date.now()).slice(0, 10);
    var clean = function (s) { return String(s).replace(/[^\p{L}\p{N}._-]/gu, '-').replace(/-+/g, '-').slice(0, 100); };
    var receipt = '{"items":[{"name":"' + clean(P.title) + '","quantity":1,"sum":' + P.sum +
                  ',"payment_method":"full_payment","payment_object":"commodity","tax":"none"}]}';
    var parts = [LOGIN, String(P.sum), inv, encodeURIComponent(receipt), PASS1, 'Shp_prod=' + productId];
    var sig = MD5(parts.join(':'));
    var url = 'https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=' + encodeURIComponent(LOGIN) +
              '&OutSum=' + encodeURIComponent(P.sum) + '&InvId=' + encodeURIComponent(inv) +
              '&Description=' + encodeURIComponent(P.title) + '&Receipt=' + encodeURIComponent(receipt) +
              '&Shp_prod=' + encodeURIComponent(productId) + '&SuccessURL=' +
              encodeURIComponent('https://wizzleforgegames.github.io/pay/success.html?prod=' + productId) +
              '&FailURL=' + encodeURIComponent('https://wizzleforgegames.github.io/pay/fail.html') +
              '&SignatureValue=' + sig + '&Encoding=UTF-8';
    try { localStorage.setItem('wz_pay_wait', productId + '|' + Date.now()); } catch (e) {}
    var w = null;
    try { w = window.open(url, '_blank'); } catch (e) {}
    return new Promise(function (res) {
      var t0 = Date.now(), iv = setInterval(function () {
        var got = null;
        try { got = JSON.parse(localStorage.getItem('wz_pay') || 'null'); } catch (e) {}
        if (got && String(got.prod || '') === String(productId)) {
          clearInterval(iv);
          try { localStorage.removeItem('wz_pay'); localStorage.removeItem('wz_pay_wait'); } catch (e) {}
          var l = localPurchases(); l.push({ id: productId, token: 'rbk-' + inv }); savePurchases(l);
          res({ success: true, productID: productId, canceled: false });
        } else if (Date.now() - t0 > 600000 || (w && w.closed && Date.now() - t0 > 8000)) {
          clearInterval(iv); res({ success: false, canceled: true, productID: productId });
        }
      }, 1200);
    });
  }

  /* ---------- реклама ---------- */
  window.NativeAds = {
    ready: true,
    init: function () { return Promise.resolve(true); },
    prepareInterstitial: function () {}, prepareRewarded: function () {},
    showInterstitial: function () {
      return new Promise(function (res) {
        ready(function (ok) {
          if (!ok || !y || !y.adv || !y.adv.showFullscreenAdv) { res(false); return; }
          try { y.adv.showFullscreenAdv({ callbacks: { onClose: function () { res(true); }, onError: function () { res(false); } } }); }
          catch (e) { res(false); }
        });
      });
    },
    showRewarded: function (onReward) {
      return new Promise(function (res) {
        ready(function (ok) {
          if (!ok || !y || !y.adv || !y.adv.showRewardedVideo) { if (onReward) onReward(true); res(true); return; }
          var settled = false;
          var fin = function (got) { if (settled) return; settled = true; if (onReward) onReward(got); res(got); };
          try {
            y.adv.showRewardedVideo({ callbacks: {
              onRewarded: function () { fin(true); },
              onClose: function () { fin(true); },
              onError: function () { fin(false); } } });
          } catch (e) { fin(true); }
          setTimeout(function () { fin(true); }, 120000);
        });
      });
    },
    showBanner: function () { try { y && y.adv && y.adv.showBannerAdv && y.adv.showBannerAdv(); } catch (e) {} },
    hideBanner: function () { try { y && y.adv && y.adv.hideBannerAdv && y.adv.hideBannerAdv(); } catch (e) {} }
  };

  /* ---------- покупки ---------- */
  window.NativeBilling = {
    purchase: function (productId) {
      return new Promise(function (res) {
        ready(function (ok) {
          var p = ok && y && y.payments;
          if (p && (p.requestPurchase || p.purchase)) {
            var pr = p.requestPurchase ? p.requestPurchase({ item: productId }) : p.purchase(productId);
            Promise.resolve(pr).then(function (r) {
              var purchase = r && (r.purchase || r);
              if (p.confirmPurchase && purchase) { try { p.confirmPurchase(purchase); } catch (e) {} }
              var l = localPurchases(); l.push({ id: productId, token: (purchase && purchase.purchaseToken) || 'plat' }); savePurchases(l);
              res({ success: true, productID: productId, canceled: false });
            }).catch(function (e) {
              res({ success: false, canceled: !!(e && (e.code === 'PURCHASE_CANCELED' || e.code === 'USER_CANCELED')), productID: productId });
            });
          } else {
            rbkBuy(productId).then(res);
          }
        });
      });
    },
    getPurchases: function () {
      return new Promise(function (res) {
        ready(function (ok) {
          var p = ok && y && y.payments;
          if (p && p.getPurchases) {
            Promise.resolve(p.getPurchases()).then(function (r) {
              var l = (r && r.purchases) || r || [];
              res((l || []).map(function (x) { return { id: x.productID || x.id, token: x.purchaseToken }; }));
            }, function () { res(localPurchases()); });
          } else res(localPurchases());
        });
      });
    }
  };

  /* ---------- лидерборды и достижения площадки ---------- */
  window.NativeBoard = {
    available: function () { return !!(y && y.leaderboards); },
    submit: function (name, score) {
      return new Promise(function (res) {
        ready(function (ok) {
          if (!ok || !y || !y.leaderboards || !y.leaderboards.setScore) { res(false); return; }
          try { Promise.resolve(y.leaderboards.setScore(name, Math.round(score))).then(function () { res(true); }, function () { res(false); }); }
          catch (e) { res(false); }
        });
      });
    },
    entries: function (name, count) {
      return new Promise(function (res) {
        ready(function (ok) {
          if (!ok || !y || !y.leaderboards || !y.leaderboards.getEntries) { res([]); return; }
          try {
            Promise.resolve(y.leaderboards.getEntries(name, { totalCount: count || 10, quantity: count || 10 }))
              .then(function (r) { res((r && r.entries) || []); }, function () { res([]); });
          } catch (e) { res([]); }
        });
      });
    },
    platformAchievements: function () {
      return new Promise(function (res) {
        ready(function () {
          try { if (y && typeof y.getAchievements === 'function') { Promise.resolve(y.getAchievements()).then(res, function () { res([]); }); return; } } catch (e) {}
          res([]);
        });
      });
    }
  };
  window.WZ_DEBUG = { hasFacade: function () { return !!y; }, platform: function () { return window.WZ_PLATFORM; } };
  window.WZ_PLATFORM = (window.WizzleNative ? 'apk' : (y ? 'platform' : 'standalone'));
  try { Promise.resolve(typeof YaGames !== 'undefined' && YaGames && YaGames.init && YaGames.init()).then(function (f) { if (f) { y = f; window.WZ_PLATFORM = window.WizzleNative ? 'apk' : 'platform'; } }); } catch (e) {}
  console.log('[WZ-BRIDGE] platform =', window.WZ_PLATFORM);
})();
