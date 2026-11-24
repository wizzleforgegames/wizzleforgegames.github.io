/* wz-meta.js — достижения и рекорды Cosmic Defender на любой площадке.
   Достижения считаются локально (живут в localStorage), счёт рекорда уходит
   в лидерборд площадки через window.NativeBoard (wz-bridge.js / vk-hook.js). */
(function () {
  'use strict';
  var KEY = 'cd_ach', LB_NAME = 'best';
  var ACH = [
    { id: 'first',  ru: 'Первый вылет',      en: 'First flight',      d_ru: 'Соверши первый вылет',            d_en: 'Complete your first run' },
    { id: 's1k',    ru: '1 000 очков',       en: '1,000 points',      d_ru: 'Набери 1 000 очков за вылет',     d_en: 'Score 1,000 in one run' },
    { id: 's5k',    ru: '5 000 очков',       en: '5,000 points',      d_ru: 'Набери 5 000 очков за вылет',     d_en: 'Score 5,000 in one run' },
    { id: 'w5',     ru: '5 волн',            en: '5 waves',           d_ru: 'Дойди до 5-й волны',              d_en: 'Reach wave 5' },
    { id: 'w10',    ru: '10 волн',           en: '10 waves',          d_ru: 'Дойди до 10-й волны',             d_en: 'Reach wave 10' },
    { id: 'swarm',  ru: '100 врагов',        en: '100 enemies',       d_ru: 'Сбей 100 врагов за вылет',        d_en: 'Destroy 100 enemies in one run' },
    { id: 'prime',  ru: 'NOVA PRIME',        en: 'NOVA PRIME',        d_ru: 'Купи премиум-корабль',            d_en: 'Own the premium ship' },
    { id: 'noads',  ru: 'Без рекламы',       en: 'Ad-free',           d_ru: 'Купи отключение рекламы',         d_en: 'Buy the ad-free upgrade' }
  ];
  function lang() {
    try { if (window.CDUI && CDUI.lang) return CDUI.lang(); } catch (e) {}
    var l = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return l === 'ru' ? 'ru' : 'en';
  }
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function has(id) { return !!store()[id]; }

  var toastBox = null;
  function toast(text) {
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.style.cssText = 'position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:9999;' +
        'background:rgba(10,14,26,.92);border:1px solid #ffcf4a;color:#ffcf4a;padding:10px 16px;' +
        'border-radius:10px;font:600 14px/1.4 system-ui,sans-serif;text-align:center;pointer-events:none';
      document.body.appendChild(toastBox);
    }
    toastBox.textContent = text; toastBox.style.display = 'block';
    clearTimeout(toastBox._t); toastBox._t = setTimeout(function () { toastBox.style.display = 'none'; }, 2600);
  }

  var overlay = null;
  function panel(title, html) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(4,6,12,.86);' +
        'display:flex;align-items:center;justify-content:center;padding:16px';
      overlay.innerHTML = '<div style="max-width:520px;width:100%;max-height:82vh;overflow:auto;background:#0b1020;' +
        'border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px;color:#e8ecf7;' +
        'font:400 14px/1.5 system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.6)">' +
        '<h3 style="margin:0 0 12px;font-size:19px;color:#ffcf4a;letter-spacing:.04em"></h3>' +
        '<div class="wz-body"></div>' +
        '<button class="wz-close" style="margin-top:14px;width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);' +
        'background:transparent;color:#e8ecf7;font:600 13px/1 system-ui,sans-serif;cursor:pointer"></button></div>';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.classList.contains('wz-close')) overlay.style.display = 'none';
      });
      document.body.appendChild(overlay);
    }
    var L = lang();
    overlay.querySelector('h3').textContent = title;
    overlay.querySelector('.wz-body').innerHTML = html;
    overlay.querySelector('.wz-close').textContent = L === 'ru' ? 'Закрыть' : 'Close';
    overlay.style.display = 'flex';
  }

  function openAch() {
    var L = lang(), st = store(), rows = '';
    for (var i = 0; i < ACH.length; i++) {
      var a = ACH[i], got = !!st[a.id];
      rows += '<div style="display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08)">' +
        '<div style="width:26px;text-align:center;font-size:17px;color:' + (got ? '#ffcf4a' : '#5b6478') + '">' + (got ? '★' : '☆') + '</div>' +
        '<div style="flex:1"><div style="font-weight:600;color:' + (got ? '#e8ecf7' : '#98a2b8') + '">' + (L === 'ru' ? a.ru : a.en) + '</div>' +
        '<div style="font-size:12px;color:#8b94a8">' + (L === 'ru' ? a.d_ru : a.d_en) + '</div></div></div>';
    }
    var got = 0; for (var k in st) if (st[k]) got++;
    panel((L === 'ru' ? 'Достижения' : 'Achievements') + ' · ' + got + '/' + ACH.length, rows);
  }

  function openLb() {
    var L = lang(), best = 0;
    try { best = parseInt(localStorage.getItem('cd_best') || '0', 10) || 0; } catch (e) {}
    var html = '<div style="font-size:13px;color:#98a2b8;margin-bottom:10px">' +
      (L === 'ru' ? 'Твой рекорд' : 'Your best') + ': <b style="color:#ffcf4a">' + best.toLocaleString() + '</b></div><div class="wz-lb"></div>';
    panel(L === 'ru' ? 'Рекорды' : 'Leaderboard', html);
    var box = overlay.querySelector('.wz-lb');
    if (!window.NativeBoard || !window.NativeBoard.available) { box.innerHTML = ''; return; }
    try {
      Promise.resolve(window.NativeBoard.entries(LB_NAME, 10)).then(function (list) {
        if (!list || !list.length) {
          box.innerHTML = '<div style="font-size:13px;color:#8b94a8">' +
            (L === 'ru' ? 'Таблица рекордов появится вместе с площадкой.' : 'The leaderboard comes with the platform.') + '</div>';
          return;
        }
        var rows = '';
        for (var i = 0; i < list.length; i++) {
          var e = list[i];
          rows += '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.08)">' +
            '<span>' + (i + 1) + '. ' + (e.player && (e.player.publicName || e.displayName) || e.displayName || '—') + '</span>' +
            '<b style="color:#ffcf4a">' + (e.score || 0) + '</b></div>';
        }
        box.innerHTML = rows;
      });
    } catch (e) {}
  }

  function onRun(stats) {
    var L = lang(), st = store(), news = [];
    function give(id, ok) { if (ok && !st[id]) { st[id] = Date.now(); news.push(id); } }
    give('first', (stats.plays || 0) >= 1);
    give('s1k', (stats.score || 0) >= 1000);
    give('s5k', (stats.score || 0) >= 5000);
    give('w5', (stats.level || 0) >= 5);
    give('w10', (stats.level || 0) >= 10);
    give('swarm', (stats.kills || 0) >= 100);
    give('prime', !!stats.premium);
    give('noads', !!stats.noads);
    save(st);
    for (var i = 0; i < news.length; i++) {
      var a = null;
      for (var j = 0; j < ACH.length; j++) if (ACH[j].id === news[i]) a = ACH[j];
      if (a) toast((L === 'ru' ? 'ДОСТИЖЕНИЕ: ' : 'ACHIEVEMENT: ') + (L === 'ru' ? a.ru : a.en));
    }
    try { if (stats.best) localStorage.setItem('cd_best', String(stats.best)); } catch (e) {}
    if (window.NativeBoard && window.NativeBoard.submit && stats.best) {
      try { window.NativeBoard.submit(LB_NAME, stats.best); } catch (e) {}
    }
  }

  window.WzMeta = { onRun: onRun, openAch: openAch, openLb: openLb, has: has, list: ACH };
})();
