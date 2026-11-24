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

    /* ---------- md5 (для подписи Robokassa на сайте) ---------- */
  var MD5 = (function () {
    var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
             5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
             4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
             6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    var K = new Uint32Array(64);
    for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    function rotl(x, c) { return ((x << c) | (x >>> (32 - c))) >>> 0; }
    function utf8(str) {
      var out = [], s = unescape(encodeURIComponent(str));
      for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
      return out;
    }
    function core(b) {
      var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
      for (var off = 0; off < b.length; off += 64) {
        var M = new Uint32Array(16);
        for (var j = 0; j < 16; j++)
          M[j] = (b[off + j * 4] | (b[off + j * 4 + 1] << 8) | (b[off + j * 4 + 2] << 16) | (b[off + j * 4 + 3] << 24)) >>> 0;
        var A = a0, B = b0, C = c0, D = d0;
        for (var i = 0; i < 64; i++) {
          var F, g;
          if (i < 16) { F = (B & C) | (~B & D); g = i; }
          else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
          else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
          else { F = C ^ (B | ~D); g = (7 * i) % 16; }
          F = (F + A + K[i] + M[g]) >>> 0;
          A = D; D = C; C = B;
          B = (B + rotl(F, S[i])) >>> 0;
        }
        a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
      }
      return [a0, b0, c0, d0];
    }
    return function (str) {
      var b = utf8(str), len = b.length * 8;
      b.push(0x80);
      while (b.length % 64 !== 56) b.push(0);
      var lo = len >>> 0, hi = Math.floor(len / 4294967296) >>> 0;
      b.push(lo & 0xff, (lo >>> 8) & 0xff, (lo >>> 16) & 0xff, (lo >>> 24) & 0xff,
             hi & 0xff, (hi >>> 8) & 0xff, (hi >>> 16) & 0xff, (hi >>> 24) & 0xff);
      var h = core(b), hex = '';
      for (var i = 0; i < 4; i++)
        for (var sh = 0; sh < 32; sh += 8)
          hex += ((h[i] >>> sh) & 0xff).toString(16).padStart(2, '0');
      return hex;
    };
  })();
  var md5 = MD5;

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
    try { localStorage.setItem('wz_back', JSON.stringify({url: location.href, t: Date.now()})); } catch (e) {}
    var w = null; try { w = window.open(u, '_blank'); } catch (e) {}
    return new Promise(function (res) {
      var t0 = Date.now();
      var iv = setInterval(function () {
        var st = ls('wz_pay', {});
        if (st && st.ok && String(st.prod || (st.q && st.q.Shp_prod) || '') === String(p.id)) { clearInterval(iv); res(true); }
        else if (Date.now() - t0 > 120000) { clearInterval(iv); res(false); }
      }, 1200);
      if (!w) { clearInterval(iv); res(false); }
    });
  }
  function buy(id, btn) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    if (btn) btn.disabled = true;
    function payer() {
      var y = null;
      try { y = (typeof ysdk !== 'undefined' && ysdk) ? ysdk : (window.YSDK && window.YSDK.sdk) ? window.YSDK.sdk : null; } catch (e) {}
      if (!y && window.YaGames && window.YaGames.__ysdk) y = window.YaGames.__ysdk;
      if (!y) { try { if (typeof YandexGames !== 'undefined' && YandexGames) y = (typeof YandexGames.sdk === 'function' ? YandexGames.sdk() : (typeof YandexGames.monetization === 'function' ? YandexGames.monetization() : null)); } catch (e) {} }
      if (!y) { try { if (typeof YSDK !== 'undefined' && YSDK && YSDK.sdk) y = YSDK.sdk; } catch (e) {} }
      if (y && y.payments && (y.payments.requestPurchase || y.payments.purchase)) return Promise.resolve(y.payments);
      if (window.YaGames && typeof window.YaGames.init === 'function') {
        try {
          return Promise.resolve(window.YaGames.init()).then(function (sdk) {
            return (sdk && sdk.payments && (sdk.payments.requestPurchase || sdk.payments.purchase)) ? sdk.payments : null;
          }, function () { return null; });
        } catch (e) {}
      }
      return Promise.resolve(null);
    }
    var pr = payer().then(function (P) {
      if (P) {
        return Promise.resolve(P.requestPurchase ? P.requestPurchase({ item: id }) : P.purchase(id)).then(function (r) {
          var pur = r && (r.purchase || r);
          if (P.confirmPurchase && pur) { try { P.confirmPurchase(pur); } catch (e) {} }
          return true;
        });
      }
      if (window.NativeBilling && window.NativeBilling.purchase) {
        return Promise.resolve(window.NativeBilling.purchase(id)).then(function (r) { return !!(r && r.success); });
      }
      return rbk(p);
    });
    return pr.then(function (ok) {
      if (btn) btn.disabled = false;
      if (ok) { if (owned.indexOf(id) < 0) owned.push(id); put(STORE, owned); toast(T.thanks); overlay('shop'); fire(id); }
      else toast(T.fail);
      return !!ok;
    }, function () { if (btn) btn.disabled = false; toast(T.fail); return false; });
  }
  function fire(id) { try { window.dispatchEvent(new CustomEvent('wz-purchase', { detail: { id: id } })); } catch (e) {} }

  /* ---------- API ---------- */
  var API = {
    md5: md5,
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
        if (!y) { try { if (typeof YandexGames !== 'undefined' && YandexGames) y = (typeof YandexGames.sdk === 'function' ? YandexGames.sdk() : null); } catch (e) {} }
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
    bar.innerHTML = '<button type="button" id="wzshopBtn">' + T.shop + '</button><button type="button" id="wzachBtn">' + T.ach +
      '</button><button type="button" id="wzlbBtn">' + T.lb + '</button>';
    document.body.appendChild(bar);
    bar.querySelector('#wzshopBtn').onclick = function () { overlay('shop'); };
    bar.querySelector('#wzachBtn').onclick = function () { overlay('ach'); };
    bar.querySelector('#wzlbBtn').onclick = function () { overlay('lb'); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
