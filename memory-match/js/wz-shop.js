/* wz-shop.js — единый магазин ₽ + достижения + рекорды для игр Wizzle Forge.
   Работает на любой площадке: Яндекс SDK (ysdk), VK Play (vk-adapter даёт ysdk-фасад),
   APK (wz-adapter даёт ysdk-фасад), а на GitHub Pages — Robokassa.
   Конфиг: window.WZ_SHOP = {products:[{id,price,title,desc}], ach:[{id,title,desc}],
            store:'ключ LS', achStore:'ключ LS', mount:'селектор куда вставить кнопки'} */
(function () {
  'use strict';
  var C = window.WZ_SHOP || {};
  var PRODUCTS = C.products || [];
  var ACH = C.ach || [];
  var STORE = C.store || 'wz_shop_v1';
  var ACHSTORE = C.achStore || 'wz_ach_v1';
  var LBSTORE = C.lbStore || 'wz_lb_v1';
  var lang = (function () { try { return (navigator.language || 'ru').slice(0, 2); } catch (e) { return 'ru'; } })();
  if (lang !== 'ru') lang = 'en';
  var T = {
    ru: { shop: 'Магазин', ach: 'Достижения', lb: 'Рекорды', buy: 'Купить', owned: 'Куплено', close: 'Закрыть',
          thanks: 'Спасибо за покупку!', fail: 'Покупка не завершена', best: 'Твой рекорд', noach: 'Пока нет достижений',
          nolb: 'Рекордов пока нет — сыграй партию', unlock: 'Достижение получено' },
    en: { shop: 'Shop', ach: 'Achievements', lb: 'Records', buy: 'Buy', owned: 'Owned', close: 'Close',
          thanks: 'Thanks for your purchase!', fail: 'Purchase not completed', best: 'Your best', noach: 'No achievements yet',
          nolb: 'No records yet — play a round', unlock: 'Achievement unlocked' }
  }[lang];

  /* ---------- хранение ---------- */
  function ls(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var owned = ls(STORE, []);
  var achs = ls(ACHSTORE, {});

  /* ---------- md5 (для Robokassa на сайте) ---------- */
  var md5 = (function () {
    function a(x, y) { var z = (x & 0xFFFF) + (y & 0xFFFF); return ((x >> 16) + (y >> 16) + (z >> 16) << 16) | (z & 0xFFFF); }
    function r(x, c) { return (x << c) | (x >>> (32 - c)); }
    function f(x, y, z) { return (x & y) | (~x & z); } function g(x, y, z) { return (x & z) | (y & ~z); }
    function h(x, y, z) { return x ^ y ^ z; } function i(x, y, z) { return y ^ (x | ~z); }
    function o(v, x, s, t) { return a(r(a(v, a(a(x, t), s)), 0), 0); }
    function A(x, k, s, t, m) { return o(f(x[0], x[1], x[2]), x[m], s, t); }
    function B(x, k, s, t, m) { return o(g(x[0], x[1], x[2]), x[m], s, t); }
    function C2(x, k, s, t, m) { return o(h(x[0], x[1], x[2]), x[m], s, t); }
    function D(x, k, s, t, m) { return o(i(x[0], x[1], x[2]), x[m], s, t); }
    function s2b(s) { var b = []; for (var n = 0; n < s.length; n++) { var c = s.charCodeAt(n);
        if (c < 128) b.push(c); else if (c < 2048) { b.push(192 | (c >> 6), 128 | (c & 63)); }
        else { b.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); } } return b; }
    function hex(n) { var s = ''; for (var j = 0; j < 4; j++) s += ('0' + ((n >> (j * 8 + 4)) & 15).toString(16) + ((n >> (j * 8)) & 15).toString(16)); return s; }
    return function (str) {
      var x = s2b(str), n = x.length, words = [];
      for (var q = 0; q < n; q += 4) words.push(x[q] + (x[q + 1] << 8) + (x[q + 2] << 16) + (x[q + 3] << 24));
      words[n >> 2] = words[n >> 2] | (0x80 << ((n % 4) * 8));
      while (words.length % 16 !== 14) words.push(0);
      words.push(n * 8); words.push(0);
      var A0 = 1732584193, B0 = -271733879, C0 = -1732584194, D0 = 271733878, x2 = [A0, B0, C0, D0];
      var K = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
      var S = [5,0,4,7,6,1,11,2,13,8,10,3,12,15,9,14,0,4,7,6,11,2,13,8,10,3,12,15,9,14,5,1,
               5,9,3,7,0,13,1,8,10,6,14,2,12,4,15,11,0,6,13,1,8,10,4,15,14,2,12,4,15,11,5,9,3,7,
               7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22];
      for (var off = 0; off < words.length; off += 16) {
        var blk = words.slice(off, off + 16), X = x2.slice();
        for (var s3 = 0; s3 < 64; s3++) {
          var t;
          if (s3 < 16) t = A(X, blk, K[s3], -680876936, s3);
          else if (s3 < 32) t = B(X, blk, K[s3 + 1], -389564586, [1,6,11,0,5,10,15,4,9,14,3,8,13,2,7,12][s3 % 16]);
          else if (s3 < 48) t = C2(X, blk, K[s3 + 2], 328289091, [5,8,11,14,1,4,7,10,13,0,3,6,9,12,15,2][s3 % 16]);
          else t = D(X, blk, K[s3 + 3], -627311912, [0,7,14,5,12,3,10,1,8,15,6,13,4,11,2,9][s3 % 16]);
          X = [t, X[0], X[1], X[2]];
        }
        x2 = [a(x2[0], X[0]), a(x2[1], X[1]), a(x2[2], X[2]), a(x2[3], X[3])];
      }
      return hex(x2[0]) + hex(x2[1]) + hex(x2[2]) + hex(x2[3]);
    };
  })();

  /* ---------- стили и разметка ---------- */
  var CSS = '.wz-btn{position:fixed;right:10px;bottom:10px;z-index:9990;display:flex;gap:6px}' +
    '.wz-btn button{padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(12,12,18,.72);' +
    'color:#eaeaf0;font:600 12px/1.2 Inter,system-ui,sans-serif;backdrop-filter:blur(6px);cursor:pointer}' +
    '.wz-btn button:hover{border-color:#7c5cff}' +
    '.wz-ov{position:fixed;inset:0;z-index:9995;background:rgba(6,6,10,.86);display:none;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif;color:#eaeaf0}' +
    '.wz-ov.on{display:flex}.wz-card{width:min(520px,94vw);max-height:86vh;overflow:auto;background:#14141d;border:1px solid #2a2a38;border-radius:14px;padding:18px}' +
    '.wz-card h3{margin:0 0 12px;font-size:17px;font-weight:800}.wz-row{display:flex;justify-content:space-between;gap:12px;align-items:center;' +
    'padding:12px;border:1px solid #23232f;border-radius:10px;margin-bottom:8px;background:#1a1a24}' +
    '.wz-row b{display:block;font-size:14px}.wz-row span{display:block;font-size:12px;color:#8a8a9c}' +
    '.wz-buy{padding:9px 14px;border-radius:9px;border:0;background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}' +
    '.wz-buy[disabled]{opacity:.55}.wz-own{padding:9px 14px;border-radius:9px;border:1px solid #34d399;color:#34d399;font-weight:700;font-size:12px;white-space:nowrap}' +
    '.wz-close{margin-top:10px;width:100%;padding:11px;border-radius:10px;border:1px solid #2a2a38;background:transparent;color:#8a8a9c;font-weight:700;cursor:pointer}' +
    '.wz-ach{display:flex;gap:10px;align-items:center;padding:11px;border:1px solid #23232f;border-radius:10px;margin-bottom:8px;background:#1a1a24;opacity:.55}' +
    '.wz-ach.got{opacity:1;border-color:rgba(124,92,255,.5)}.wz-ach i{width:26px;height:26px;border-radius:8px;background:#23232f;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:13px}' +
    '.wz-ach.got i{background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff}' +
    '.wz-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;padding:12px 18px;border-radius:12px;' +
    'background:#14141d;border:1px solid rgba(124,92,255,.55);color:#eaeaf0;font:700 13px Inter,system-ui,sans-serif;display:none}' +
    '.wz-lb{font-size:13px;color:#8a8a9c}.wz-lb div{padding:7px 0;border-bottom:1px solid #23232f}';
  function css() { if (document.getElementById('wz-shop-css')) return; var s = document.createElement('style'); s.id = 'wz-shop-css'; s.textContent = CSS; document.head.appendChild(s); }
  function toast(msg) {
    css(); var t = document.getElementById('wz-toast');
    if (!t) { t = document.createElement('div'); t.id = 'wz-toast'; t.className = 'wz-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = 'none'; }, 2600);
  }
  function overlay(kind) {
    css();
    var ov = document.getElementById('wz-ov');
    if (!ov) { ov = document.createElement('div'); ov.id = 'wz-ov'; ov.className = 'wz-ov'; document.body.appendChild(ov); }
    var body = '';
    if (kind === 'shop') {
      body = '<h3>' + T.shop + '</h3>' + PRODUCTS.map(function (p) {
        var has = owned.indexOf(p.id) >= 0;
        return '<div class="wz-row"><div><b>' + p.title + '</b><span>' + (p.desc || '') + '</span></div>' +
          (has ? '<span class="wz-own">' + T.owned + '</span>'
               : '<button class="wz-buy" data-buy="' + p.id + '">' + T.buy + ' · ' + p.price + ' ₽</button>') + '</div>';
      }).join('');
    } else if (kind === 'ach') {
      body = '<h3>' + T.ach + ' · ' + Object.keys(achs).filter(function (k) { return achs[k]; }).length + '/' + ACH.length + '</h3>' +
        (ACH.length ? ACH.map(function (a) {
          var got = !!achs[a.id];
          return '<div class="wz-ach' + (got ? ' got' : '') + '"><i>' + (got ? '✓' : '☆') + '</i><div><b>' + a.title + '</b><span>' + (a.desc || '') + '</span></div></div>';
        }).join('') : '<div class="wz-lb">' + T.noach + '</div>');
    } else {
      var lb = ls(LBSTORE, []);
      body = '<h3>' + T.lb + '</h3>' + (lb.length ? '<div class="wz-lb">' + lb.map(function (r, i) {
        return '<div>' + (i + 1) + '. <b style="color:#eaeaf0">' + r.score + '</b> · ' + r.date + '</div>'; }).join('') + '</div>'
        : '<div class="wz-lb">' + T.nolb + '</div>');
    }
    ov.innerHTML = '<div class="wz-card">' + body + '<button class="wz-close" type="button">' + T.close + '</button></div>';
    ov.classList.add('on');
    ov.onclick = function (e) {
      if (e.target === ov || e.target.classList.contains('wz-close')) { ov.classList.remove('on'); return; }
      var b = e.target.closest ? e.target.closest('[data-buy]') : null;
      if (b) API.buy(b.getAttribute('data-buy'), b);
    };
  }

  /* ---------- покупки ---------- */
  function rbk(p) {
    var login = C.rbkLogin || 'wizzleforgegames', pass1 = C.rbkPass1 || 'TK2WLN14OM4P12MR';
    var inv = Date.now() % 1000000000, sum = String(p.price);
    var rec = '{"items":[{"name":"' + String(p.title).replace(/[^\p{L}\p{N}._-]/gu, '-') + '","price":' + p.price +
              ',"quantity":1,"tax":0,"payment_method":1,"measure":10}]}';
    var sig = md5(login + ':' + sum + ':' + inv + ':' + encodeURIComponent(rec) + ':' + pass1 + ':Shp_prod=' + p.id);
    var u = 'https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=' + login + '&OutSum=' + sum + '&InvId=' + inv +
      '&Description=' + encodeURIComponent(p.title) + '&Receipt=' + encodeURIComponent(rec) + '&Shp_prod=' + p.id +
      '&SignatureValue=' + sig + '&Encoding=UTF-8';
    var w = null; try { w = window.open(u, '_blank'); } catch (e) {}
    return new Promise(function (res) {
      var t0 = Date.now();
      var iv = setInterval(function () {
        var st = ls('wz_pay', {});
        if (st && st.ok && st.prod === p.id) { clearInterval(iv); res(true); }
        else if (Date.now() - t0 > 120000) { clearInterval(iv); res(false); }
      }, 1200);
      if (!w) { clearInterval(iv); res(false); }
    });
  }
  function buy(id, btn) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    if (btn) btn.disabled = true;
    var y = null;
    try { y = (typeof ysdk !== 'undefined' && ysdk) ? ysdk : (window.YSDK && window.YSDK.sdk) ? window.YSDK.sdk : null; } catch (e) {}
    if (!y && window.YaGames && window.YaGames.__ysdk) y = window.YaGames.__ysdk;
    var pr = Promise.resolve(null);
    if (y && y.payments && (y.payments.requestPurchase || y.payments.purchase)) {
      pr = Promise.resolve(y.payments.requestPurchase ? y.payments.requestPurchase({ item: id }) : y.payments.purchase(id))
        .then(function (r) {
          var pur = r && (r.purchase || r);
          if (y.payments.confirmPurchase && pur) { try { y.payments.confirmPurchase(pur); } catch (e) {} }
          return true;
        });
    } else if (window.NativeBilling && window.NativeBilling.purchase) {
      pr = Promise.resolve(window.NativeBilling.purchase(id)).then(function (r) { return !!(r && r.success); });
    } else { pr = rbk(p); }
    pr.then(function (ok) {
      if (btn) btn.disabled = false;
      if (ok) { if (owned.indexOf(id) < 0) owned.push(id); put(STORE, owned); toast(T.thanks); overlay('shop'); fire(id); }
      else toast(T.fail);
    }, function () { if (btn) btn.disabled = false; toast(T.fail); });
  }
  function fire(id) { try { window.dispatchEvent(new CustomEvent('wz-purchase', { detail: { id: id } })); } catch (e) {} }

  /* ---------- API ---------- */
  var API = {
    owned: function (id) { return owned.indexOf(id) >= 0; },
    buy: buy,
    open: overlay,
    unlock: function (id) {
      if (achs[id]) return false;
      achs[id] = true; put(ACHSTORE, achs);
      var a = ACH.filter(function (x) { return x.id === id; })[0];
      if (a) toast(T.unlock + ': ' + a.title);
      return true;
    },
    score: function (n) {
      n = Math.max(0, Math.round(n || 0));
      var lb = ls(LBSTORE, []);
      var d = new Date(); ds = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2);
      var me = ls('wz_me', null);
      if (me && me.score >= n && me.date === ds) return;
      lb.push({ score: n, date: ds }); lb.sort(function (a, b) { return b.score - a.score; }); lb = lb.slice(0, 10);
      put(LBSTORE, lb); put('wz_me', { score: lb[0].score, date: ds });
      try {
        var y = (typeof ysdk !== 'undefined' && ysdk) ? ysdk : (window.YSDK && window.YSDK.sdk) ? window.YSDK.sdk : null;
        if (y && y.leaderboards && y.leaderboards.setScore) y.leaderboards.setScore('best', n).catch(function () {});
      } catch (e) {}
    },
    has: function () { return true; }
  };
  window.WzShop = API;

  /* ---------- кнопки ---------- */
  function mount() {
    var host = null;
    if (C.mount) { try { host = document.querySelector(C.mount); } catch (e) {} }
    if (host) {
      var wrap = document.createElement('div'); wrap.className = 'wz-in';
      wrap.innerHTML = '<button type="button" id="wzshopIn">' + T.shop + '</button><button type="button" id="wzachIn">' + T.ach +
        '</button><button type="button" id="wzlbIn">' + T.lb + '</button>';
      host.appendChild(wrap);
      wrap.querySelector('#wzshopIn').onclick = function () { overlay('shop'); };
      wrap.querySelector('#wzachIn').onclick = function () { overlay('ach'); };
      wrap.querySelector('#wzlbIn').onclick = function () { overlay('lb'); };
      return;
    }
    var bar = document.createElement('div'); bar.className = 'wz-btn';
    bar.innerHTML = '<button type="button" id="wzshopBtn">' + T.shop + '</button><button type="button" id="wzachBtn">' + T.ach + '</button>';
    document.body.appendChild(bar);
    bar.querySelector('#wzshopBtn').onclick = function () { overlay('shop'); };
    bar.querySelector('#wzachBtn').onclick = function () { overlay('ach'); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
