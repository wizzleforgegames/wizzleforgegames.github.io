/* ===== Memory Match — игровая логика (один замыкающий модуль, экспорт в window.__MM) =====
   Данные: js/data/{i18n,decks,meta}.js. Обёртки платформы: js/sdk.js, js/audio.js.

   Разделы файла (порядок = порядок в файле):
     утилиты, состояние, эффекты, локализация, прогресс и разблокировки,
     похожесть картинок (dHash + цвет, только для QA) и спавн пар (placePairs — рандом),
     раскладка сетки (boardSize / chooseShape / layoutGrid),
     подарок, меню колод, выбор уровней, старт уровня, доска, геймплей,
     HUD и таймер, пауэр-апы, оценка памяти, финиш, достижения, рубашки,
     реклама, модалка результата, кнопки и инициализация, туториал,
     подписи, пересчёт сетки (поворот/ресайз), старт игры. */
(() => {
  'use strict';

  // ---------- Утилиты ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = (s) => Math.floor(s / 60) + ':' + String(Math.max(0, s % 60)).padStart(2, '0');

  // ---------- Состояние ----------
  const State = {
    lang: 'ru',
    progress: {},
    current: null,        // { deckId, deck, level }
    shape: null,          // { cols, rows, gap, cw, ch }
    cards: [],
    flipped: [],
    matchedPairs: 0, moves: 0, wrong: 0, streak: 0,
    score: 0, mode: null, lock: false, finished: false,
    timer: null, seconds: 0, deadline: 0, maxDeadline: 0, timedOut: false,
    coins: 0, earned: 0, doubled: false, resumes: 0, adPuUsed: false,
    mem: { recall: 0, given: 0, lucky: 0, half: 0, probe: 0, slip: 0 },
    puUsed: { peek: 0, hint: 0, shuffle: 0, addtime: 0 },
    powerups: Object.assign({}, INITIAL_PU),
    deckFilter: 'all',
    levelsPlayed: 0, paused: false,
  };

  // ---------- Эффекты ----------
  function ensureFx() {
    let fx = $('#fx');
    if (!fx) { fx = el('div', 'fx'); document.body.appendChild(fx); }
    return fx;
  }
  function spawnBurst(x, y, colors) {
    const fx = ensureFx();
    const n = 14;
    for (let i = 0; i < n; i++) {
      const p = el('div', 'particle');
      const col = colors[i % colors.length];
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5);
      const dist = 50 + Math.random() * 70;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.background = col; p.style.boxShadow = '0 0 12px ' + col;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      p.style.setProperty('--d', (0.5 + Math.random() * 0.5) + 's');
      fx.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  }
  function spawnConfetti(count) {
    const fx = ensureFx();
    const palette = ['#6ee7ff', '#ff7bd8', '#ffd36e', '#58e08a', '#a78bfa', '#f472b6'];
    for (let i = 0; i < count; i++) {
      const c = el('div', 'confetti');
      c.style.left = (5 + Math.random() * 90) + '%';
      const col = palette[i % palette.length];
      c.style.background = col; c.style.boxShadow = '0 0 10px ' + col;
      const dur = 2 + Math.random() * 2;
      c.style.setProperty('--t', dur + 's');
      c.style.setProperty('--dr', (Math.random() * 240 - 120) + 'px');
      c.style.animationDuration = dur + 's';
      c.style.transform = 'translate(-50%,0) rotate(' + (Math.random() * 360) + 'deg)';
      fx.appendChild(c);
      setTimeout(() => c.remove(), (dur + 1.2) * 1000);
    }
  }
  function showFloater(ref, text, color) {
    if (!ref) return;
    const f = el('div', 'floater', text);
    f.style.color = color;
    const r = ref.getBoundingClientRect();
    f.style.left = (r.left + r.width / 2 - 16) + 'px';
    f.style.top = (r.top + r.height / 2 - 12) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }
  function colorFor(img) { return CARD_COLORS[img] || '#6ee7ff'; }

  // ---------- Локализация ----------
  function L(key) { return (I18N[State.lang] && I18N[State.lang][key]) || I18N.ru[key] || key; }
  function deckName(id) { return (I18N[State.lang].decks || {})[id] || id; }
  function modeLabel(mode) { return MODES[mode] ? L(MODES[mode].key) : ''; }
  function levelTitle(lv) { return (lv.title && (lv.title[State.lang] || lv.title.ru)) || lv.id; }

  // ---------- Прогресс ----------
  // progress: { stars: {levelId:0..3}, unlocked: {levelId:1}, coins, backs, back, pu, stats, ach, ... }
  const FIRST_LEVEL = 'animals_1';

  function normalizeProgress(p) {
    if (!p || typeof p !== 'object') p = {};
    p.stars = (p.stars && typeof p.stars === 'object') ? p.stars : {};
    p.unlocked = (p.unlocked && typeof p.unlocked === 'object') ? p.unlocked : {};
    p.unlocked[FIRST_LEVEL] = 1;
    // миграция старой схемы (уровень -> звёзды прямо в корне)
    if (!p.migrated) {
      LEVELS_ALL.forEach(lv => {
        const v = p[lv.id];
        if (typeof v === 'number') {
          if (v > 0) { p.stars[lv.id] = Math.max(p.stars[lv.id] || 0, v); p.unlocked[lv.id] = 1; }
          delete p[lv.id];
        }
      });
      // следующий уровень после уже сыгранного остаётся открытым
      DECKS.forEach(d => d.levels.forEach((lv, i) => {
        if (p.stars[lv.id] > 0 && d.levels[i + 1]) p.unlocked[d.levels[i + 1].id] = 1;
      }));
      p.migrated = 1;
    }
    // «лечение» сохранений, испорченных сломанной цепочкой req/next в прошлых версиях:
    // если колода-предок полностью пройдена, у дочерней колоды обязан быть открыт первый уровень.
    const cleared = (d) => d.levels.every(lv => (p.stars[lv.id] || 0) > 0);
    DECKS.forEach(d => {
      if (!d.req) { p.unlocked[d.levels[0].id] = 1; return; }
      const req = DECK_BY_ID[d.req];
      if (req && cleared(req)) p.unlocked[d.levels[0].id] = 1;
      // если первый уровень уже открыт, но колода была заперта логикой прошлых версий — чиним rest
      if (p.unlocked[d.levels[0].id] && !p.unlocked[d.levels[0].id]) p.unlocked[d.levels[0].id] = 1;
    });
    if (!p.backs || typeof p.backs !== 'object') p.backs = { neon: 1, wave: 1 };
    p.backs.neon = 1; p.backs.wave = 1;
    if (!BACKS.some(b => b.id === p.back)) p.back = 'wave';
    p.stats = p.stats || {};
    p.ach = p.ach || {};
    return p;
  }

  async function loadProgress() {
    let prog = null;
    try {
      const keys = ['mm_progress'];
      const cloud = await YandexGames.loadData(keys);
      if (cloud && (cloud.mm_progress || cloud.mm_yg_player)) {
        const raw = cloud.mm_progress || cloud.mm_yg_player;
        prog = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch (e) {}
    if (!prog) {
      try {
        for (const k of ['mm_progress', 'mm_yg_player']) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          prog = (parsed && parsed.mm_progress) ? parsed.mm_progress : parsed;
          if (prog) break;
        }
      } catch (e) {}
    }
    State.progress = normalizeProgress(prog || {});
    State.coins = State.progress.coins || 0;
    State.powerups = Object.assign({}, INITIAL_PU, State.progress.pu || {});
  }
  async function saveProgress() {
    try { localStorage.setItem('mm_progress', JSON.stringify(State.progress)); } catch (e) {}
    try { await YandexGames.saveData({ mm_progress: State.progress }); } catch (e) {}
  }

  // Индексы колод: req — единственный источник правды для цепочки разблокировок,
  // next — подсказка UI (и запасной путь, если req не указан).
  const DECK_BY_ID = {};
  DECKS.forEach(d => { DECK_BY_ID[d.id] = d; });
  function decksAfter(deck) {
    const out = DECKS.filter(d => d.req === deck.id);
    const nx = DECK_BY_ID[deck.next];
    if (nx && out.indexOf(nx) < 0) out.push(nx);
    return out;
  }
  function deckStarted(deck) {
    return deck.levels.some(lv => !!State.progress.unlocked[lv.id] || (State.progress.stars[lv.id] || 0) > 0);
  }
  function deckUnlocked(deck) {
    if (!deck.req) return true;
    if (deckStarted(deck)) return true;
    const req = DECK_BY_ID[deck.req];
    if (!req) return true;
    return deckStarted(req);
  }
  function deckCleared(deck) {
    return deck.levels.every(lv => (State.progress.stars[lv.id] || 0) > 0);
  }
  function levelAvailable(deck, lv) {
    if (!deckUnlocked(deck)) return false;
    return !!State.progress.unlocked[lv.id] || (State.progress.stars[lv.id] || 0) > 0;
  }
  function unlockLevel(levelId) { State.progress.unlocked[levelId] = 1; }
  function starsOf(lvId) { return State.progress.stars[lvId] || 0; }
  function levelsDone() { return LEVELS_ALL.filter(l => starsOf(l.id) > 0).length; }
  function decksDone() { return DECKS.filter(d => deckCleared(d)).length; }
  function totalStars() { return LEVELS_ALL.reduce((m, l) => m + starsOf(l.id), 0); }

  function unlockNext(deck, lv) {
    const idx = deck.levels.findIndex(l => l.id === lv.id);
    if (idx >= 0 && idx < deck.levels.length - 1) { unlockLevel(deck.levels[idx + 1].id); return; }
    // пройден последний уровень колоды -> открываем первые уровни всех колод,
    // которые на неё ссылаются (req), плюс колоду из next
    decksAfter(deck).forEach(nd => { if (nd.levels[0]) unlockLevel(nd.levels[0].id); });
  }
  function hasNext(deck, lv) {
    const idx = deck.levels.findIndex(l => l.id === lv.id);
    return (idx >= 0 && idx < deck.levels.length - 1) || !!deck.next;
  }
  function lastLevelReady() {
    return !!(State.progress.lastDeck && State.progress.lastLevel &&
      DECKS.some(d => d.id === State.progress.lastDeck && d.levels.some(l => l.id === State.progress.lastLevel)));
  }

  // ---------- Похожесть картинок (dHash + цветовой профиль) ----------
  const _sigCache = new Map();
  function sigOf(name) {
    if (_sigCache.has(name)) return _sigCache.get(name);
    const raw = IMG_SIG[name];
    let out = null;
    if (raw && raw.length >= 70) {
      const bits = new Uint8Array(64);
      for (let i = 0; i < 16; i++) {
        const v = parseInt(raw.substr(i * 4, 4), 16);
        for (let b = 0; b < 4; b++) bits[i * 4 + b] = (v >> (3 - b)) & 1;
      }
      const hist = new Float32Array(27);
      for (let i = 0; i < 27; i++) hist[i] = parseInt(raw.substr(16 + i * 2, 2), 16) / 63;
      out = { bits, hist };
    }
    _sigCache.set(name, out);
    return out;
  }
  function similarity(a, b) {
    if (a === b) return 1;
    const A = sigOf(a), B = sigOf(b);
    if (!A || !B) return 0;
    let ham = 0;
    for (let i = 0; i < 64; i++) if (A.bits[i] !== B.bits[i]) ham++;
    const struct = 1 - ham / 64;
    let d = 0;
    for (let i = 0; i < 27; i++) d += Math.abs(A.hist[i] - B.hist[i]);
    const col = 1 - Math.min(1, d / 2);
    return 0.5 * struct + 0.5 * col;
  }

  // ---------- Перемешивание и соседи доски ----------
  function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function adjacents(idx, cols, rows) {
    const out = [];
    const c = idx % cols, r = (idx / cols) | 0;
    if (c > 0) out.push(idx - 1);
    if (c < cols - 1) out.push(idx + 1);
    if (r > 0) out.push(idx - cols);
    if (r < rows - 1) out.push(idx + cols);
    return out;
  }
  // ---------- Спавн: простая случайная раскладка ----------
  // Без эвристик и локального поиска: просто тасуем колоду картинок (Fisher–Yates).
  function placePairs(imgs) {
    return shuffleArr(imgs.slice());
  }

  // ---------- Раскладка сетки (ровная, без «съезжания») ----------
  const CARD_AR = 1.18;   // карта чуть выше, чем широкая
  // Сколько места реально занимает доска: считаем от экрана, а не от #board
  // (иначе при повороте/клавиатуре получаем транзитные размеры и сетка «едет»).
  function boardSize() {
    const scr = $('#screen-game');
    if (!scr) {
      const b = $('#board');
      return { W: Math.max(160, (b ? b.clientWidth : window.innerWidth) - 4),
               H: Math.max(160, (b ? b.clientHeight : Math.round(window.innerHeight * 0.6)) - 4) };
    }
    const cs = getComputedStyle(scr);
    const padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const padH = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    let used = 0;
    ['.game-hud', '.powerups', '.hud-mode-wrap', '.game-controls'].forEach(sel => {
      const n = $(sel);
      if (n && getComputedStyle(n).display !== 'none') used += n.offsetHeight + 8;
    });
    const W = Math.max(150, scr.clientWidth - padH - 4);
    const H = Math.max(120, scr.clientHeight - padV - used - 6);
    return { W, H };
  }
  function chooseShape(count, W, H) {
    let best = null;
    for (let cols = 2; cols <= Math.min(6, count); cols++) {
      if (count % cols) continue;          // только ровные сетки: без пустых клеток
      const rows = count / cols;
      if (rows > 6) continue;
      const gap = cols >= 5 ? 8 : (cols >= 4 ? 9 : 11);
      const cw = Math.floor(Math.min((W - (cols - 1) * gap) / cols, (H - (rows - 1) * gap) / (rows * CARD_AR)));
      if (cw < 28) continue;
      const ch = Math.floor(cw * CARD_AR);
      const squareness = Math.min(cols * cw, rows * ch) / Math.max(cols * cw, rows * ch);
      const score = cw * 100 + squareness * 40 - rows * 3;
      if (!best || score > best.score) best = { cols, rows, gap, cw, ch, score };
    }
    if (!best) {
      const cols = Math.min(4, count), rows = Math.ceil(count / cols);
      const gap = 6;
      const cw = Math.max(24, Math.floor(Math.min((W - (cols - 1) * gap) / cols, (H - (rows - 1) * gap) / (rows * CARD_AR))));
      best = { cols, rows, gap, cw, ch: Math.floor(cw * CARD_AR), score: 0 };
    }
    return best;
  }
  function applyShape(grid, shape) {
    grid.style.setProperty('--cw', shape.cw + 'px');
    grid.style.setProperty('--ch', shape.ch + 'px');
    grid.style.gap = shape.gap + 'px';
    grid.style.gridTemplateColumns = 'repeat(' + shape.cols + ', ' + shape.cw + 'px)';
    grid.style.gridTemplateRows = 'repeat(' + shape.rows + ', ' + shape.ch + 'px)';
    grid.style.width = (shape.cols * shape.cw + (shape.cols - 1) * shape.gap) + 'px';
    grid.style.height = (shape.rows * shape.ch + (shape.rows - 1) * shape.gap) + 'px';
  }
  function relayout() {
    const grid = $('#board .grid');
    if (!grid || !State.cards.length || !State.shape) return;
    const { W, H } = boardSize();
    const s = State.shape;
    const gap = s.gap;
    const cw = Math.floor(Math.min((W - (s.cols - 1) * gap) / s.cols, (H - (s.rows - 1) * gap) / (s.rows * CARD_AR)));
    if (cw < 24) return;
    s.cw = cw; s.ch = Math.floor(cw * CARD_AR);
    applyShape(grid, s);
  }

  // ---------- Ежедневный подарок (без ежедневного вызова) ----------
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function giftAvailable() { return State.progress.giftDate !== todayKey(); }
  function claimGift() {
    if (!giftAvailable()) { YandexGames.toast(L('giftReady')); return; }
    const y = new Date(Date.now() - 864e5);
    const yKey = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    State.progress.giftStreak = (State.progress.giftPrev === yKey) ? (State.progress.giftStreak || 0) + 1 : 1;
    State.progress.giftPrev = todayKey();
    State.progress.giftDate = todayKey();
    const gain = 20 + Math.min(60, 10 * (State.progress.giftStreak - 1));
    addCoins(gain);
    State.progress.giftStars = (State.progress.giftStars || 0) + gain;
    saveProgress();
    YandexGames.toast(L('giftGranted') + ' +' + gain + ' 🪙 · 🔥 ' + State.progress.giftStreak);
    AudioMgr.play('correct');
    renderDecks();
  }

  // ---------- Меню: карточки колод ----------
  function renderDecks() {
    const wrap = $('#decks');
    const top = $('#menu-top');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (top) top.innerHTML = '';

    // живой фон меню — фото из открытой колоды
    try {
      const open = DECKS.filter(deckUnlocked);
      const pick = (open.length ? open : DECKS)[Math.floor(Math.random() * (open.length || DECKS.length))];
      const bg = 'assets/img/' + pick.levels[0].imgs[0] + '.jpg';
      $$('.menu-bg').forEach(b => {
        let i = b.querySelector('.mb-img');
        if (!i) { i = el('div', 'mb-img'); b.appendChild(i); }
        i.style.backgroundImage = "url('" + bg + "')";
      });
    } catch (e) {}

    const host = top || wrap;
    const maxStars = LEVELS_ALL.length * 3;
    const got = totalStars();
    const menuProg = el('div', 'menu-progress');
    menuProg.innerHTML =
      '<div class="mp-title">' + L('progress') + ': ' + got + ' / ' + maxStars +
      ' <span class="mp-coins">💰 ' + (State.coins || 0) + '</span></div>' +
      '<div class="mp-bar"><div class="bar" style="width:' + Math.round(100 * got / maxStars) + '%"></div></div>' +
      '<div class="mp-lab">' + Math.round(100 * got / maxStars) + '% · ' + levelsDone() + '/' + LEVELS_ALL.length + ' ' + L('cleared') + '</div>';
    host.appendChild(menuProg);

    const row = el('div', 'menu-cta');
    if (lastLevelReady()) {
      const cont = el('button', 'btn-continue', L('continue'));
      cont.addEventListener('click', startContinue);
      row.appendChild(cont);
    }
    const gift = el('button', 'btn-gift' + (giftAvailable() ? '' : ' wait'),
      L('giftClaim') + (giftAvailable() ? '' : ' ✓'));
    gift.addEventListener('click', claimGift);
    row.appendChild(gift);
    const bonus = el('button', 'btn-bonus' + (bonusAvailable() ? '' : ' wait'));
    const bLeft = Math.max(0, Math.ceil((180000 - (Date.now() - (State.progress.bonusTs || 0))) / 60000));
    bonus.innerHTML = bonusAvailable() ? L('adBonus') : (L('adBonusWait') + ' ' + bLeft + 'м');
    bonus.addEventListener('click', () => menuBonus(bonus));
    row.appendChild(bonus);
    host.appendChild(row);

    if (!State.deckFilter) State.deckFilter = 'all';
    const tabs = el('div', 'deck-tabs');
    [['all', L('tabAll')], ['open', L('tabOpen')], ['done', L('tabDone')]].forEach(([k, t]) => {
      const b = el('button', 'deck-tab' + (State.deckFilter === k ? ' on' : ''), t);
      b.dataset.f = k;
      b.addEventListener('click', () => { State.deckFilter = k; renderDecks(); });
      tabs.appendChild(b);
    });
    host.appendChild(tabs);

    DECKS.filter(deck => {
      if (State.deckFilter === 'open') return deckUnlocked(deck) && !deckCleared(deck);
      if (State.deckFilter === 'done') return deckCleared(deck);
      return true;
    }).forEach(deck => {
      const unlocked = deckUnlocked(deck);
      const card = el('div', 'deck-card' + (unlocked ? '' : ' locked'));
      const img = el('div', 'deck-img');
      img.style.backgroundImage = "url('assets/img/" + deck.levels[0].imgs[0] + ".jpg')";
      card.appendChild(img);
      card.appendChild(el('div', 'deck-name', deckName(deck.id)));

      const meta = el('div', 'deck-meta');
      const stars = el('div', 'deck-stars');
      const got2 = deck.levels.reduce((m, lv) => m + starsOf(lv.id), 0);
      const max2 = deck.levels.length * 3;
      stars.innerHTML = Array.from({ length: max2 }, (_, i) =>
        '<span style="opacity:' + (i < got2 ? 1 : 0.35) + '">★</span>').join('');
      const count = el('div');
      count.textContent = deck.levels.length + ' ' + L('levels');
      meta.appendChild(count);
      meta.appendChild(stars);
      const prog = el('div', 'deck-prog');
      const cleared = deck.levels.filter(lv => starsOf(lv.id) > 0).length;
      const fill = el('div', 'bar');
      fill.style.width = Math.round(100 * cleared / deck.levels.length) + '%';
      const lab = el('div', 'lab');
      lab.textContent = cleared + '/' + deck.levels.length + ' ' + L('cleared');
      prog.appendChild(fill); prog.appendChild(lab);
      meta.appendChild(prog);
      card.appendChild(meta);

      if (!unlocked) {
        const lock = el('div', 'lock', '<span class="lock-ic">🔒</span>');
        lock.appendChild(el('div', 'lock-req', L('needDeck') + ': ' + deckName(deck.req)));
        card.appendChild(lock);
        card.addEventListener('click', () => YandexGames.toast(L('locked')));
      } else {
        card.addEventListener('click', () => openLevels(deck.id));
      }
      wrap.appendChild(card);
    });

    checkAchievements();
    renderAchievements();
  }

  // ---------- Выбор уровней ----------
  function nextLevelOf(deck) {
    return deck.levels.find(l => levelAvailable(deck, l) && !(starsOf(l.id) > 0)) ||
           deck.levels.find(l => levelAvailable(deck, l)) || null;
  }
  function openLevels(deckId) {
    const deck = DECKS.find(d => d.id === deckId);
    if (!deck) return;
    State.currentDeck = deck;
    const wrap = $('#levels');
    wrap.innerHTML = '';
    const next = nextLevelOf(deck);
    deck.levels.forEach((lv, i) => wrap.appendChild(levelCard(deck, lv, i, next)));

    $('#levels-title').textContent = deckName(deck.id);
    const done = deck.levels.filter(lv => starsOf(lv.id) > 0).length;
    const got = deck.levels.reduce((m, lv) => m + starsOf(lv.id), 0);
    const hint = $('#choose-hint');
    if (hint) hint.textContent = done + '/' + deck.levels.length + ' ' + L('cleared') + ' · ' +
      got + '/' + deck.levels.length * 3 + ' ' + L('stars');
    const bar = $('#lv-prog-bar');
    if (bar) bar.style.width = Math.round(100 * got / (deck.levels.length * 3)) + '%';
    const cta = $('#btn-lv-play');
    if (cta) {
      const lab = cta.querySelector('.lv-lab') || cta.querySelector('span') || cta;
      const arr = cta.querySelector('.lv-arr');
      cta.classList.toggle('locked', !next);
      lab.textContent = next ? (starsOf(next.id) > 0 ? L('play') : L('continue')) : L('locked');
      if (arr) arr.hidden = !next;
      cta.disabled = !next;
      cta.onclick = () => next ? startLevel(deck.id, next.id) : YandexGames.toast(L('locked'));
    }
    show('#screen-levels');
    layoutLevels();
    requestAnimationFrame(layoutLevels);
  }
  function levelCard(deck, lv, i, next) {
    const avail = levelAvailable(deck, lv), s = starsOf(lv.id);
    const card = el('div', 'level-card' + (avail ? '' : ' locked') + (s > 0 ? ' done' : '') + (next && next.id === lv.id ? ' next' : ''));
    card.tabIndex = avail ? 0 : -1;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', levelTitle(lv));

    const media = el('div', 'lc-media');
    if (lv.imgs && lv.imgs[0]) media.style.backgroundImage = "url('assets/img/" + lv.imgs[0] + ".jpg')";
    media.appendChild(el('span', 'lc-num', String(i + 1)));
    const mode = el('span', 'lc-mode mode-' + lv.mode);
    mode.textContent = modeLabel(lv.mode);
    media.appendChild(mode);
    if (s > 0) media.appendChild(el('span', 'lc-badge', '✓'));
    if (!avail) media.appendChild(el('div', 'lc-lock', '<span class="lc-lock-ic">🔒</span>'));
    card.appendChild(media);

    const body = el('div', 'lc-body');
    body.appendChild(el('div', 'lc-title', levelTitle(lv)));
    const row = el('div', 'lc-row');
    row.appendChild(el('span', 'lc-pairs', lv.pairs + ' ' + L('pairs')));
    const st = el('span', 'lc-stars');
    st.innerHTML = [0, 1, 2].map(k => '<span class="' + (k < s ? 'on' : '') + '">★</span>').join('');
    row.appendChild(st);
    body.appendChild(row);
    const th = el('div', 'lc-thumbs');
    (lv.imgs || []).slice(0, 5).forEach(img => {
      const im = el('img');
      im.src = 'assets/img/' + img + '.jpg'; im.alt = ''; im.loading = 'lazy';
      im.addEventListener('error', () => im.remove(), { once: true });
      th.appendChild(im);
    });
    body.appendChild(th);
    body.appendChild(el('div', 'lc-go' + (avail ? '' : ' is-lock'),
      avail ? (next && next.id === lv.id ? L('continue') : L('play')) : '🔒 ' + L('locked')));
    card.appendChild(body);

    const act = () => avail ? startLevel(deck.id, lv.id) : YandexGames.toast(L('locked'));
    card.addEventListener('click', act);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    return card;
  }
  // Сколько колонок/строк в сетке. Правило простое:
  // 1) если все уровни влезают в ОДНУ строку (карточка >= 190px) — делаем одну строку по центру;
  // 2) иначе подбираем сетку, где карточка ближе всего к квадрату и без «рваных» строк.
  const LV_MAXH = 600;   // максимальная высота карточки: выше — только пустота
  function layoutLevels() {
    const scr = $('#screen-levels'), wrap = $('#levels');
    if (!scr || !wrap || !scr.classList.contains('active')) return;
    const n = wrap.children.length;
    if (!n) return;
    const cs = getComputedStyle(wrap);
    const pX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const pY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    // берем размеры самой области сетки: она уже равна свободному месту под шапкой
    const W = Math.max(160, Math.min(wrap.clientWidth, 1500) - pX - 2);
    const H = Math.max(150, wrap.clientHeight - pY - 2);
    const cand = [];
    for (let cols = 1; cols <= Math.min(8, n); cols++) {
      const rows = Math.ceil(n / cols);
      const gap = (cols >= 4 || rows >= 5) ? 10 : (cols >= 2 ? 14 : 12);
      const cw = (W - (cols - 1) * gap) / cols, ch = (H - (rows - 1) * gap) / rows;
      if (cw < 150 || ch < 110) continue;
      cand.push({ cols, rows, gap, cw, ch });
    }
    let best = null;
    const oneRow = cand.filter(c => c.rows === 1 && c.cols === n).sort((a, b) => b.cw - a.cw)[0];
    if (W >= 560 && n >= 2 && oneRow && oneRow.cw >= 190) best = oneRow;
    if (!best && W < 560) best = cand.filter(c => c.cols === 1)[0] || null;
    if (!best) {
      for (const c of cand) {
        let score = -Math.abs(Math.log((c.cw / c.ch) / 1.05)) * 100 + Math.min(c.cw * c.ch, 330 * 330) / 4000;
        if (n % c.cols) score -= 60;
        if (!best || score > best.score) best = { cols: c.cols, gap: c.gap, cw: c.cw, ch: c.ch, score };
      }
    }
    if (!best) best = { cols: 1, gap: 12, cw: W, ch: 0 };
    const capped = best.ch > LV_MAXH;
    const rowH = capped ? LV_MAXH : Math.max(120, Math.round(best.ch || 150));
    wrap.style.setProperty('--lcols', best.cols);
    wrap.style.setProperty('--lgap', best.gap + 'px');
    wrap.style.setProperty('--lminh', rowH + 'px');
    wrap.style.setProperty('--lmaxh', capped ? LV_MAXH + 'px' : '1fr');
    wrap.classList.toggle('lv-fill', !!best.ch);
    wrap.classList.toggle('lv-center', capped);
    wrap.classList.toggle('lv-slim', best.ch > 0 && best.ch < 168);
    wrap.classList.toggle('lv-narrow', best.cw > 0 && best.cw < 215);
    wrap.classList.toggle('lv-wide', best.cw >= 420);
    wrap.classList.toggle('lv-row', best.cols === 1 && best.cw >= 280);
  }
  function show(screen) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const node = $(screen);
    if (!node) return;
    node.classList.add('active');
    // заходим в меню — всегда перерисовываем прогресс, иначе полоса остаётся
    // протухшей (было 99% после финального уровня, пока не перезагрузишься)
    if (screen === '#screen-menu') { try { renderDecks(); } catch (e) {} }
    // разметка геймплея для Яндекс Игр (п. 1.19.3): уровень — игра, меню — не игра
    try {
      if (screen === '#screen-game') YandexGames.gameplayStart();
      else YandexGames.gameplayStop();
    } catch (e) {}
  }

  // ---------- Старт уровня ----------
  function startLevel(deckId, levelId) {
    const deck = DECKS.find(d => d.id === deckId);
    const lv = deck && deck.levels.find(l => l.id === levelId);
    if (!deck || !lv || !levelAvailable(deck, lv)) return;
    hideTutorial();
    stopTimer();
    State.current = { deckId, deck, level: lv };
    State.progress.lastDeck = deckId; State.progress.lastLevel = lv.id;
    State.mode = lv.mode;
    State.matchedPairs = 0; State.moves = 0; State.wrong = 0; State.streak = 0;
    State.score = 0; State.lock = false; State.finished = false;
    State.seconds = 0; State.timedOut = false; State.flipped = [];
    State.mem = { recall: 0, given: 0, lucky: 0, half: 0, probe: 0, slip: 0 };
    State.puUsed = { peek: 0, hint: 0, shuffle: 0, addtime: 0 };
    State.cards = []; State.shape = null;
    const cfg = MODES[lv.mode];
    State.deadline = cfg.timed ? lv.pairs * 18 : 0;
    State.maxDeadline = State.deadline;
    State.earned = 0; State.doubled = false; State.resumes = 0; State.adPuUsed = false;
    $('#deck-title').textContent = deckName(deck.id) + ' — ' + levelTitle(lv);
    try {
      const gb = document.querySelector('#screen-game .gb-img');
      if (gb && lv.imgs && lv.imgs[0]) gb.style.backgroundImage = "url('assets/img/" + lv.imgs[0] + ".jpg')";
    } catch (e) {}
    applyStaticLang();
    $('#hud-mode').textContent = modeLabel(lv.mode);
    $('#hud-mode').className = 'hud-mode mode-' + lv.mode;
    updateHud();
    show('#screen-game');
    renderBoard(lv);
    renderPowerups();
    startTimer();
    AudioMgr.bgm();
    saveProgress();
  }
  function startContinue() {
    if (!lastLevelReady()) return;
    startLevel(State.progress.lastDeck, State.progress.lastLevel);
  }
  function restartCurrent() {
    if (!State.current) return;
    startLevel(State.current.deckId, State.current.level.id);
  }

  // ---------- Доска ----------
  function renderBoard(lv) {
    const board = $('#board');
    board.innerHTML = '';
    const fx = $('#fx'); if (fx) fx.innerHTML = '';
    const items = [];
    lv.imgs.forEach(img => { items.push(img); items.push(img); });
    const { W, H } = boardSize();
    State.shape = chooseShape(items.length, W, H);
    const placed = placePairs(items);
    const grid = el('div', 'grid');
    const bk = BACKS.find(b => b.id === (State.progress.back || 'neon')) || BACKS[0];
    const theme = 'assets/img/' + bk.img + '.jpg';
    State.cards = placed.map((img, i) => ({ img, id: i, open: false, matched: false, seen: false, given: false }));
    State.cards.forEach((c, i) => {
      const card = el('div', 'card');
      const inner = el('div', 'card-inner');
      const back = el('div', 'card-back');
      const bimg = el('div', 'cb-img');
      bimg.style.backgroundImage = "url('" + theme + "')";
      back.appendChild(bimg);
      back.appendChild(el('div', 'cb-frame'));
      const front = el('div', 'card-front');
      const img = el('img');
      img.src = 'assets/img/' + c.img + '.jpg';
      img.alt = c.img;
      img.loading = i < 6 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      img.addEventListener('error', () => {
        img.style.opacity = '0';
        front.classList.add('no-img');
        front.dataset.name = c.img;
      }, { once: true });
      front.appendChild(img);
      inner.appendChild(back); inner.appendChild(front);
      card.appendChild(inner);
      c._el = card; c._img = img;
      card.addEventListener('click', () => onCardClick(card, c));
      card.classList.add('deal');
      card.style.animationDelay = (i * 0.035) + 's';
      grid.appendChild(card);
    });
    board.appendChild(grid);
    applyShape(grid, State.shape);
  }

  // ---------- Геймплей ----------
  function onCardClick(cardEl, card) {
    if (State.lock || State.finished) return;
    if (card.open || card.matched) return;
    if (State.flipped.length >= 2) return;
    const wasSeen = card.seen, wasGiven = card.given;
    // игрок сам открыл карту -> он увидел её и запомнил место (подсказка больше не «подарок»)
    card.open = true; card.seen = true; card.given = false;
    cardEl.classList.add('flipped');
    AudioMgr.play('click');
    State.flipped.push({ el: cardEl, card, wasSeen, wasGiven });
    if (State.flipped.length === 2) {
      State.moves++;
      State.lock = true;
      updateHud();
      const [a, b] = State.flipped;
      if (a.card.img === b.card.img) onMatch(a, b);
      else onMismatch(a, b);
    }
  }
  function pointsFor(streak, mode) {
    const cfg = MODES[mode] || MODES.classic;
    return cfg.base + Math.min(streak, cfg.maxStreak) * cfg.streakMul;
  }
  function onMatch(a, b) {
    a.card.matched = b.card.matched = true;
    a.el.classList.add('matched'); b.el.classList.add('matched');
    State.matchedPairs++;
    State.streak++;
    // ищем пару по памяти или наугад:
    //   recall — обе карты игрок открыл сам и запомнил (совпадение по памяти);
    //   given  — обе карты известны, но хотя бы одну подсказала игра (не засчитывается);
    //   half   — одна карта известна, вторая открыта впервые (полувезение);
    //   lucky  — обе открыты впервые (чистая удача, ни минус, ни плюс).
    const byMemory = a.wasSeen && b.wasSeen && !a.wasGiven && !b.wasGiven;
    if (a.wasSeen && b.wasSeen) {
      if (a.wasGiven || b.wasGiven) State.mem.given++;
      else State.mem.recall++;
    } else if (a.wasSeen || b.wasSeen) State.mem.half++;
    else State.mem.lucky++;
    const ce = $('#combo');
    if (ce && State.streak >= 2) {
      ce.classList.add('flash');
      setTimeout(() => ce.classList.remove('flash'), 500);
    }
    const gained = pointsFor(State.streak, State.mode) + (byMemory ? 25 : 0);
    State.score += gained;
    showFloater(a.el, '+' + gained, 'var(--ok)');
    AudioMgr.play('match');
    if (State.streak >= 2) {
      [a.el, b.el].forEach(node => {
        node.classList.add('hot');
        setTimeout(() => node.classList.remove('hot'), 1100);
      });
    }
    updateHud();
    if (State.current) reportProgress();
    const rect = a.el.getBoundingClientRect();
    spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2,
      [colorFor(a.card.img), colorFor(b.card.img), '#ffd36e']);
    State.flipped = [];
    State.lock = false;
    if (State.matchedPairs >= State.current.level.pairs) finishGame(false);
  }
  function onMismatch(a, b) {
    State.wrong++;
    State.streak = 0;
    // Промах считается провалом памяти только если ОБЕ карты игрок открыл сам и
    // их расположение не менялось. Если карта открыта впервые (или её подсказала игра) —
    // игрок не мог её помнить, значит это разведка, а не провал памяти.
    const bothKnown = a.wasSeen && b.wasSeen;
    const bothOwn = bothKnown && !a.wasGiven && !b.wasGiven;
    if (bothOwn) State.mem.slip++;
    else State.mem.probe++;
    const ce = $('#combo');
    if (ce) { ce.classList.remove('flash', 'hot'); ce.textContent = 'x1'; }
    AudioMgr.play('wrong');
    [a.el, b.el].forEach(node => {
      node.classList.add('miss');
      setTimeout(() => node.classList.remove('miss'), 620);
    });
    setTimeout(() => {
      if (State.finished) return;
      a.el.classList.remove('flipped');
      b.el.classList.remove('flipped');
      a.card.open = b.card.open = false;
      State.flipped = [];
      State.lock = false;
    }, 620);
  }

  // ---------- HUD / таймер ----------
  function updateHud() {
    const set = (sel, txt) => { const n = $(sel); if (n) n.textContent = txt; };
    set('#stat-moves', State.moves);
    set('#stat-score', State.score);
    set('#lbl-moves', L('moves'));
    set('#lbl-time', L('time'));
    set('#lbl-score', L('score'));
    set('#lbl-coins', L('coins'));
    set('#coins', State.coins || 0);
    const ce = $('#combo');
    if (ce) {
      const combo = Math.max(1, State.streak);
      ce.textContent = 'x' + combo;
      ce.classList.toggle('hot', combo >= 2);
    }
    const pc = $('#hud-pairs');
    if (pc && State.current) {
      pc.textContent = State.matchedPairs + '/' + (State.current.level.pairs || 0);
      pc.classList.toggle('done', State.matchedPairs >= (State.current.level.pairs || 0));
    }
    const t = $('#stat-time');
    if (t) {
      if (State.mode === 'blitz' && State.deadline > 0) {
        t.textContent = fmtTime(State.deadline);
        t.classList.toggle('low', State.deadline <= 10);
      } else {
        t.textContent = fmtTime(State.seconds);
        t.classList.remove('low');
      }
    }
  }
  function tick() {
    if (State.finished) return;
    State.seconds++;
    if (State.mode === 'blitz') {
      State.deadline--;
      if (State.deadline <= 0) { State.deadline = 0; updateHud(); timeUp(); return; }
    }
    updateHud();
  }
  function startTimer() { stopTimer(); State.timer = setInterval(tick, 1000); }
  function stopTimer() { if (State.timer) { clearInterval(State.timer); State.timer = null; } }
  function addTime(seconds) {
    if (State.mode !== 'blitz' || State.finished) return false;
    State.deadline = Math.min(State.maxDeadline + 30, State.deadline + seconds);
    if (!State.timer) startTimer();
    updateHud();
    return true;
  }
  function addCoins(n) {
    State.coins = Math.max(0, (State.coins || 0) + n);
    State.progress.coins = State.coins;
    if (n > 0) State.progress.coinsTotal = (State.progress.coinsTotal || 0) + n;
    saveProgress();
    const c = $('#coins'); if (c) c.textContent = State.coins;
  }
  function reportProgress() {
    // общий прогресс игры: пройдено уровней + недобранная текущая вершина
    let pct = 0;
    try {
      const total = LEVELS_ALL.length || 1;
      let cur = 0;
      if (State.current && State.current.level && starsOf(State.current.level.id) === 0) {
        cur = clamp(State.matchedPairs, 0, State.current.level.pairs) / (State.current.level.pairs || 1);
      }
      pct = Math.round(100 * (levelsDone() + cur) / total);
    } catch (e) {}
    return YandexGames.reportProgress(clamp(pct, 0, 100));
  }

  // ---------- Пауэр-апы ----------
  function puAvailable(id) {
    return !!POWERUPS[id] && (State.powerups[id] || 0) > 0 && !State.lock && !State.finished && !!State.current;
  }
  function puColor(id) {
    const m = { peek: '#5bb6ff', hint: '#ffcf44', shuffle: '#8a5bff', addtime: '#44dd8b' };
    return m[id] || '#888';
  }
  function renderPowerups() {
    const box = $('#powerups');
    if (!box) return;
    box.innerHTML = '';
    PU_ORDER.forEach(id => {
      const p = POWERUPS[id];
      const cnt = State.powerups[id] || 0;
      const item = el('div', 'pu-item');
      const use = el('button', 'pu-btn' + (cnt > 0 ? '' : ' empty'));
      use.dataset.pu = id;
      use.title = p.desc[State.lang];
      use.style.setProperty('--c', puColor(id));
      use.innerHTML = '<span class="pu-ic">' + p.icon + '</span><span class="pu-cnt">' + cnt + '</span>';
      const buy = el('button', 'pu-buy');
      buy.dataset.buy = id;
      buy.title = p.desc[State.lang];
      buy.style.setProperty('--c', puColor(id));
      buy.innerHTML = '+<span class="pu-price">' + p.cost + '🪙</span>';
      item.appendChild(use); item.appendChild(buy);
      box.appendChild(item);
    });
    const ad = el('button', 'pu-ad' + (State.adPuUsed ? ' used' : ''),
      '<span class="pu-ic">📺</span><span class="pu-cnt">+1</span>');
    ad.id = 'pu-ad';
    ad.title = L('adPu');
    ad.setAttribute('aria-label', L('adPu'));
    box.appendChild(ad);
    bindPu();
  }
  let _puBound = false;
  function bindPu() {
    if (_puBound) return;
    _puBound = true;
    const box = $('#powerups');
    if (!box) return;
    box.addEventListener('click', e => {
      const buy = e.target.closest('.pu-buy');
      if (buy) { buyPowerup(buy.dataset.buy); return; }
      const ad = e.target.closest('.pu-ad');
      if (ad) { puAdReward(ad); return; }
      const b = e.target.closest('.pu-btn');
      if (b) usePowerup(b.dataset.pu);
    });
  }
  function usePowerup(id) {
    if (!puAvailable(id)) return;
    if (id === 'addtime' && State.mode !== 'blitz') { YandexGames.toast('⏱️ ' + L('blitz')); return; }
    State.powerups[id]--;
    State.puUsed[id] = (State.puUsed[id] || 0) + 1;
    persistPowerups();
    AudioMgr.play('flip');
    if (id === 'peek') peekAll();
    else if (id === 'hint') showHint();
    else if (id === 'shuffle') doShuffle();
    else if (id === 'addtime') addTime(15);
    updateHud();
    renderPowerups();
  }
  function persistPowerups() {
    State.progress.pu = Object.assign({}, State.powerups);
    saveProgress();
  }
  function buyPowerup(id) {
    const p = POWERUPS[id];
    if (!p) return;
    if (State.coins < p.cost) { YandexGames.toast(L('noCoins') + ' · ' + p.cost + '🪙'); return; }
    State.coins -= p.cost;
    State.progress.coins = State.coins;
    State.powerups[id] = (State.powerups[id] || 0) + 1;
    persistPowerups();
    AudioMgr.play('correct');
    YandexGames.toast(L('bought') + ' ' + p.icon);
    updateHud(); renderPowerups();
  }
  function peekAll() {
    let i = 0;
    State.cards.forEach(c => {
      if (c.matched || !c._el) return;
      if (!c.given) c.given = !c.seen;   // сами не открывали -> знание подарил обзор
      c.seen = true;   // карту показали -> её место известно, забыть его = промах памяти
      c._el.classList.add('peek');
      c._el.style.animationDelay = (i++ * 0.03) + 's';
      setTimeout(() => c._el && c._el.classList.remove('peek'), 2000);
    });
  }
  function showHint() {
    const rem = State.cards.filter(c => !c.matched && !c.open);
    const map = {};
    for (const c of rem) (map[c.img] = map[c.img] || []).push(c);
    let found = null;
    for (const k in map) if (map[k].length >= 2) { found = map[k]; break; }
    if (!found) return;
    found.forEach(c => {
      if (!c._el) return;
      if (!c.given) c.given = !c.seen;   // пару подсказала игра
      c.seen = true;   // пару показали -> её место известно
      c._el.classList.add('hint');
      setTimeout(() => c._el && c._el.classList.remove('hint'), 1800);
    });
  }
  function doShuffle() {
    if (State.lock || State.finished) return;
    const mobile = State.cards.filter(c => !c.matched && !c.open);
    if (mobile.length < 2) return;
    const s = State.shape;
    // пересобираем картинки по тем же слотам с учётом запрета на похожих соседей
    const slots = mobile.map(c => c.id);
    const imgs = mobile.map(c => c.img);
    const placed = placePairs(imgs);
    // раскладываем placed по слотам подряд (слоты могут быть непоследовательными)
    const order = slots.map((slot, i) => ({ slot, img: placed[i] }));
    order.forEach(({ slot, img }) => {
      const c = State.cards[slot];
      if (!c) return;
      c.img = img;
      if (c._img) {
        c._img.src = 'assets/img/' + img + '.jpg';
        c._img.alt = img;
        c._img.style.opacity = '1';
        c._img.onerror = () => { c._img.style.opacity = '0'; };
      }
      // карта уехала на новое место: старое знание о расположении обнуляем
      c.seen = false; c.given = false;
      if (c._el) {
        c._el.classList.add('reshuffled');
        c._el.dataset.name = img;
        setTimeout(() => c._el && c._el.classList.remove('reshuffled'), 500);
      }
    });
    AudioMgr.play('flip');
  }

  // ---------- Оценка памяти (новая модель) ----------
  // Память меряется ТОЛЬКО тем, знал ли игрок расположение карт в момент хода.
  //
  // Каждый ход — две карты. Для каждой известно, открыта ли она игроком ранее (seen)
  // и подсказана ли она игрой (given: обзор/лампочка). Отсюда 4 исхода:
  //   slip   — обе карты игрок открыл сам, место известно, но он всё равно промахнулся.
  //            Единственный прямой провал памяти -> снижает оценку.
  //   recall — обе карты игрок нашёл сам и вспомнил, что они совпадают -> повышает.
  //   given  — совпало, но хотя бы одну карту подсказала игра: не хвалим и не ругаем;
  //            промах с подсказанной картой тоже не ругаем (знание было подарком).
  //   lucky / half / probe — карта открыта впервые: игрок не мог её помнить,
  //            значит исход зависит от везения, а не от памяти -> не влияет.
  //
  // Оценка = точность решений, принятых по памяти: recall / (recall + slip).
  // Удача (угадал пару вслепую) на неё не влияет вообще, лишние ходы — тоже.
  // Подсказки дают знание бесплатно, поэтому стоят немного.
  const MEM_T3 = 85, MEM_T2 = 55;
  function memoryStats() {
    const m = State.mem;
    const decided = m.recall + m.slip;              // ходов, где решение зависело от памяти
    const acc = decided ? (m.recall / decided) * 100 : 100;
    let pu = 0;
    for (const k in State.puUsed) pu += (PU_PENALTY[k] || 0) * (State.puUsed[k] || 0);
    return {
      recall: m.recall, slip: m.slip, given: m.given,
      lucky: m.lucky, half: m.half, probe: m.probe,
      decided, acc, pu, score: clamp(Math.round(acc - pu), 0, 100),
    };
  }
  function memoryScore() { return memoryStats().score; }
  function starsFor(score, completed, matched, pairs) {
    if (!completed) return matched >= Math.ceil(pairs * 0.6) ? 1 : 0;
    if (score >= MEM_T3) return 3;
    if (score >= MEM_T2) return 2;
    return 1;
  }

  // ---------- Финиш ----------
  async function finishGame(timedOut) {
    if (State.finished) return;
    State.finished = true;
    stopTimer();
    const deck = State.current.deck;
    const lv = State.current.level;
    const completed = State.matchedPairs >= lv.pairs;
    const mem = memoryScore();
    const stars = starsFor(mem, completed, State.matchedPairs, lv.pairs);
    const wasPerfect = stars === 3;
    State.memScore = mem;
    State.stars = stars;

    if (lv.mode === 'blitz' && completed) State.score += State.deadline * 5;
    State.score += Math.round(mem * 2);

    const prev = starsOf(lv.id);
    if (stars > prev) { State.progress.stars[lv.id] = stars; }
    const st = State.progress.stats;
    st.matches = (st.matches || 0) + State.matchedPairs;
    st.moves = (st.moves || 0) + State.moves;
    st.plays = (st.plays || 0) + 1;
    st.bestStreak = Math.max(st.bestStreak || 0, State.streak);
    if (wasPerfect) st.perfects = (st.perfects || 0) + 1;
    st.bestScore = Math.max(st.bestScore || 0, State.score);
    st.memBest = Math.max(st.memBest || 0, mem);
    if (mem >= 70 && completed) st.memRuns = (st.memRuns || 0) + 1;
    if (stars > 0) unlockNext(deck, lv);
    await saveProgress();

    const earned = 8 + stars * 6 + Math.min(20, Math.round(State.score / 120)) + State.matchedPairs + Math.round(mem / 10);
    State.earned = Math.max(0, earned);
    if (stars > 0) addCoins(State.earned);
    checkAchievements();

    if (stars > 0) await YandexGames.setScore('mm_' + lv.id, State.score);
    reportProgress();

    try { YandexGames.gameplayStop(); } catch (e) {}
    showResult(deck, lv, stars, wasPerfect, timedOut, mem);
    AudioMgr.play(stars === 0 ? 'lose' : (wasPerfect ? 'win' : 'correct'));
    State.levelsPlayed++;
    if (stars > 0 && State.levelsPlayed % 3 === 0 && !(window.WzShop && WzShop.owned('noads'))) YandexGames.interstitialThrottled(90000);
    if (stars > 0 && deckCleared(deck) && !State.progress.rated) {
      State.progress.rated = 1; await saveProgress();
      setTimeout(() => { try { YandexGames.requestRating(); } catch (e) {} }, 1200);
    }
  }

  // ---------- Достижения ----------
  function achValue(key) {
    if (key === 'coinsTotal') return State.progress.coinsTotal || 0;
    if (key === 'levelsDone') return levelsDone();
    if (key === 'decksDone') return decksDone();
    const st = State.progress.stats || {};
    return st[key] || 0;
  }
  function checkAchievements() {
    const got = State.progress.ach || {};
    let newly = 0;
    ACHS.forEach(a => {
      if (got[a.id]) return;
      if (achValue(a.key) >= a.need) {
        got[a.id] = 1; newly++;
        addCoins(25);
        YandexGames.toast('🏅 ' + a.t[State.lang] + ' +25🪙');
      }
    });
    if (newly) { State.progress.ach = got; saveProgress(); }
    return newly;
  }
  function renderAchievements() {
    const body = $('#ach-body');
    if (!body) return;
    const st = State.progress.stats || {};
    const got = Object.keys(State.progress.ach || {}).filter(k => (State.progress.ach || {})[k]).length;
    const ru = State.lang === 'ru';
    const head = el('div', 'ach-stats');
    head.innerHTML = [
      ['🏅', L('achTitle'), got + '/' + ACHS.length],
      ['💰', L('coins'), State.coins || 0],
      ['🃏', ru ? 'Собрано пар' : 'Pairs matched', st.matches || 0],
      ['⭐', L('progress'), totalStars() + '/' + LEVELS_ALL.length * 3],
      ['🗺️', L('levels'), levelsDone() + '/' + LEVELS_ALL.length],
      ['🧠', L('memScore'), (st.memBest || 0) + '%'],
    ].map(r => '<div class="ach-stat"><span class="asi">' + r[0] + '</span><span class="asl">' + r[1] +
      '</span><span class="asv">' + r[2] + '</span></div>').join('');
    body.innerHTML = '';
    body.appendChild(head);
    const grid = el('div', 'achs-grid');
    ACHS.forEach(a => {
      const have = (State.progress.ach || {})[a.id] ? 1 : 0;
      const cur = Math.min(a.need, achValue(a.key));
      const card = el('div', 'ach' + (have ? ' done' : ''));
      card.innerHTML =
        '<div class="ach-ic">' + a.icon + '</div>' +
        '<div class="ach-txt"><div class="ach-name">' + a.t[State.lang] + '</div>' +
        '<div class="ach-desc">' + a.d[State.lang] + '</div>' +
        '<div class="ach-bar"><div class="bar" style="width:' + Math.round(100 * cur / a.need) + '%"></div></div></div>' +
        '<div class="ach-val">' + (have ? '✓' : cur + '/' + a.need) + '</div>';
      grid.appendChild(card);
    });
    body.appendChild(grid);

    const box = el('div', 'my-best');
    box.innerHTML = '<div class="my-best-title">' + L('myBest') + '</div>';
    const list = el('div', 'my-best-list');
    let any = false;
    DECKS.forEach(deck => {
      let g = 0;
      deck.levels.forEach(lv => { g += starsOf(lv.id); });
      if (g > 0) {
        any = true;
        const row = el('div', 'my-best-row');
        row.innerHTML = '<div class="my-best-name">' + deckName(deck.id) + '</div>' +
          '<div class="my-best-stars">' + g + '/' + deck.levels.length * 3 + ' ' + L('stars') + '</div>';
        row.addEventListener('click', () => { $('#ach-modal').classList.remove('show'); openLevels(deck.id); });
        list.appendChild(row);
      }
    });
    if (!any) list.appendChild(el('div', 'my-best-hint', '—'));
    box.appendChild(list);
    body.appendChild(box);

    const cr = el('div', 'credits');
    cr.textContent = State.lang === 'ru'
      ? '🎵 Музыка: «Bassa Island Game Loop» — Kevin MacLeod (CC BY 3.0). 📷 Фото: Pexels, NASA, Wikimedia Commons (public domain / CC0).'
      : '🎵 Music: “Bassa Island Game Loop” — Kevin MacLeod (CC BY 3.0). 📷 Photos: Pexels, NASA, Wikimedia Commons (public domain / CC0).';
    body.appendChild(cr);
  }

  // ---------- Рубашки карт ----------
  function renderBacks() {
    const body = $('#back-body'); if (!body) return;
    body.innerHTML = '';
    const head = el('div', 'backs-head');
    head.innerHTML = '<div class="bh-title">🎴 ' + L('backTitle') + '</div>' +
      '<div class="bh-coins">💰 ' + (State.coins || 0) + '</div>';
    body.appendChild(head);
    const hint = el('div', 'backs-hint'); hint.textContent = L('backHint'); body.appendChild(hint);
    const grid = el('div', 'backs-grid');
    BACKS.forEach(b => {
      const owned = !!(State.progress.backs || {})[b.id];
      const equipped = (State.progress.back || 'neon') === b.id;
      const card = el('div', 'back-card' + (equipped ? ' equipped' : ''));
      const prev = el('div', 'back-prev');
      prev.style.backgroundImage = "url('assets/img/" + b.img + ".jpg')";
      card.appendChild(prev);
      const nm = el('div', 'back-name'); nm.textContent = b.t[State.lang]; card.appendChild(nm);
      const act = el('div', 'back-act');
      if (equipped) act.innerHTML = '<span class="back-tag ok">✓ ' + L('backEquipped') + '</span>';
      else if (owned) {
        const btn = el('button', 'soft-btn', L('backEquip'));
        btn.addEventListener('click', () => {
          State.progress.back = b.id; saveProgress(); renderBacks();
          AudioMgr.play('click'); YandexGames.toast('🎴 ' + b.t[State.lang]);
        });
        act.appendChild(btn);
      } else {
        const price = el('span', 'back-price', b.cost + ' 🪙');
        const btn = el('button', 'primary-btn', L('backBuy'));
        btn.addEventListener('click', () => {
          if ((State.coins || 0) < b.cost) { YandexGames.toast(L('backNoCoins')); AudioMgr.play('wrong'); return; }
          State.coins -= b.cost; State.progress.coins = State.coins;
          State.progress.backs[b.id] = 1; State.progress.back = b.id;
          saveProgress(); renderBacks(); updateHud();
          AudioMgr.play('win'); spawnConfetti(50);
          YandexGames.toast('🎴 ' + L('backBought'));
        });
        act.appendChild(btn); act.appendChild(price);
      }
      card.appendChild(act);
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }
  function openBacks() { renderBacks(); $('#back-modal').classList.add('show'); }
  function hideBacks() { $('#back-modal').classList.remove('show'); }

  // ---------- Реклама ----------
  function timeUp() {
    if (State.finished) return;
    stopTimer();
    const lv = State.current.level;
    if ((State.resumes || 0) >= 2) { finishGame(true); return; }
    $('#timeup-title').textContent = L('timeUp');
    $('#timeup-sub').textContent = L('timeUpSub') + ' · ' + State.matchedPairs + '/' + lv.pairs;
    const b = $('#btn-timeup-ad');
    if (b) { b.textContent = L('timeUpGo'); b.disabled = false; }
    $('#timeup-modal').classList.add('show');
  }
  function hideTimeUp() { $('#timeup-modal').classList.remove('show'); }
  async function resumeBlitz() {
    const b = $('#btn-timeup-ad'); if (b) b.disabled = true;
    hideTimeUp();
    const ok = await YandexGames.rewardPromise();
    if (!ok || State.finished) { YandexGames.toast(L('adFail')); finishGame(true); return; }
    State.resumes = (State.resumes || 0) + 1;
    State.deadline = Math.min(State.maxDeadline, State.deadline + 20);
    if (!State.timer) startTimer();
    updateHud();
    AudioMgr.play('correct');
    showFloater($('#board') || document.body, '+20s', '#ffd36e');
  }
  async function rewardDouble() {
    if (State.doubled || !State.current) return;
    const b = $('#btn-reward-x2'); if (b) b.disabled = true;
    const ok = await YandexGames.rewardPromise();
    if (!ok) { if (b) b.disabled = false; YandexGames.toast(L('adFail')); return; }
    State.doubled = true;
    addCoins(State.earned);
    if (b) { b.classList.add('done'); b.textContent = '✓ ' + L('adWatched'); }
    const rc = $('#result-coins'); if (rc) rc.textContent = '+' + (State.earned * 2) + ' 🪙';
    YandexGames.toast(L('doubled'));
    AudioMgr.play('win');
    spawnConfetti(60);
    updateHud();
  }
  function bonusAvailable() { return Date.now() - (State.progress.bonusTs || 0) >= 180000; }
  async function menuBonus(btn) {
    if (!bonusAvailable()) return;
    if (btn) btn.classList.add('busy');
    const ok = await YandexGames.rewardPromise();
    if (btn) btn.classList.remove('busy');
    if (!ok) { YandexGames.toast(L('adFail')); return; }
    State.progress.bonusTs = Date.now(); saveProgress();
    addCoins(50);
    YandexGames.toast('+50 🪙');
    AudioMgr.play('correct');
    renderDecks();
  }
  async function puAdReward(btn) {
    if (State.adPuUsed) { YandexGames.toast(L('adBusy')); return; }
    if (btn) btn.classList.add('busy');
    const ok = await YandexGames.rewardPromise();
    if (btn) btn.classList.remove('busy');
    if (!ok) { YandexGames.toast(L('adFail')); return; }
    State.adPuUsed = true;
    const id = PU_ORDER[Math.floor(Math.random() * PU_ORDER.length)];
    State.powerups[id] = (State.powerups[id] || 0) + 1;
    persistPowerups();
    AudioMgr.play('correct');
    YandexGames.toast(POWERUPS[id].icon + ' +1');
    updateHud(); renderPowerups();
  }

  // ---------- Модалка результата ----------
  function showResult(deck, lv, stars, wasPerfect, timedOut, mem) {
    const row = $('#result-stars');
    row.innerHTML = ['★', '★', '★'].map((s, i) =>
      '<span class="s' + (i < stars ? ' on' : '') + '">' + s + '</span>').join('');
    const completed = State.matchedPairs >= lv.pairs;
    const t = (!completed) ? L('fail') : (timedOut ? L('timed') : (wasPerfect ? L('perfect') : L('done')));
    $('#result-title').textContent = t;
    $('#result-moves').textContent = State.moves;
    $('#result-time').textContent = fmtTime(State.seconds);
    $('#result-score').textContent = State.score;
    const rc = $('#result-coins');
    if (rc) rc.textContent = (stars > 0 ? '+' + State.earned : '0') + ' 🪙';

    // разбор: память, а не удача
    const memBox = $('#result-mem');
    if (memBox) {
      const m = memoryStats();
      memBox.innerHTML =
        '<div class="mem-head"><span>' + L('memScore') + '</span><b class="mem-val' +
        (mem >= MEM_T3 ? ' hi' : (mem >= MEM_T2 ? ' mid' : ' lo')) + '">' + mem + '%</b></div>' +
        '<div class="mem-bar"><div class="bar" style="width:' + mem + '%"></div></div>' +
        '<div class="mem-rows">' +
        '<div class="mr"><span>' + L('memAcc') + '</span><b>' + m.recall + '</b></div>' +
        '<div class="mr"><span>' + L('memLucky') + '</span><b>' + (m.lucky + m.half) + '</b></div>' +
        '<div class="mr"><span>' + L('memBlind') + '</span><b>' + m.slip + '</b></div>' +
        (m.given ? '<div class="mr"><span>' + L('memGiven') + '</span><b>' + m.given + '</b></div>' : '') +
        (m.decided ? '<div class="mr"><span>' + L('memDecided') + '</span><b>' +
          Math.round(m.acc) + '%</b></div>' : '') +
        '</div>' +
        '<div class="mem-note">' + L('memHint') + '</div>';
    }

    const best = $('#result-best');
    const prevBest = (State.progress.bestLvScore || {})[lv.id] || 0;
    let recHtml = '';
    if (stars > 0 && State.score > prevBest) {
      State.progress.bestLvScore = State.progress.bestLvScore || {};
      State.progress.bestLvScore[lv.id] = State.score;
      saveProgress();
      recHtml = '<span class="rec-badge">🏅 ' + L('newRecord') + '</span> ';
    }
    if (best) best.innerHTML = recHtml;
    Promise.resolve(YandexGames.getTop('mm_' + lv.id, 3)).then(entries => {
      if (!best) return;
      if (entries && entries.length) {
        const top = entries.map(e => e.player_score + ' · ' + (e.player_name || '')).slice(0, 3).join(' · ');
        best.innerHTML = recHtml + L('best') + ': ' + top;
      }
    }).catch(() => {});

    $('#btn-next').style.display = (stars > 0 && hasNext(deck, lv)) ? '' : 'none';
    const x2 = $('#btn-reward-x2');
    if (x2) {
      const can = stars > 0;
      x2.style.display = can ? '' : 'none';
      x2.disabled = !!State.doubled;
      x2.classList.toggle('done', !!State.doubled);
      x2.textContent = State.doubled ? ('✓ ' + L('adWatched')) : (L('adX2') + ' +' + State.earned);
    }
    try{ if(window.WzShop){ WzShop.score(State.score||0);
      var _c=JSON.parse(localStorage.getItem('mm_cnt')||'{}');
      if(stars>0){ _c.wins=(_c.wins||0)+1; WzShop.unlock('first_win'); }
      if(stars===3) WzShop.unlock('perfect');
      if(State.mode==='blitz'&&stars>0) WzShop.unlock('blitz');
      _c.decks=_c.decks||{}; if(State.deckId) _c.decks[State.deckId]=1;
      if(Object.keys(_c.decks).length>=5) WzShop.unlock('collector');
      if(_c.wins>=10) WzShop.unlock('win10');
      localStorage.setItem('mm_cnt', JSON.stringify(_c)); } }catch(e){}
    $('#result-modal').classList.add('show');
    if (stars >= 2) spawnConfetti(stars === 3 ? 120 : 60);
    else spawnConfetti(30);
  }

  // ---------- Кнопки / инициализация ----------
  function initMenuButtons() {
    const on = (sel, fn) => { const n = $(sel); if (n) n.addEventListener('click', fn); };
    on('#btn-tutorial', showTutorial);
    on('#btn-backs', openBacks);
    on('#btn-backs-close', hideBacks);
    on('#btn-back', () => { stopTimer(); show('#screen-menu'); renderDecks(); });
    on('#btn-levels-back', () => { stopTimer(); show('#screen-menu'); renderDecks(); });
    on('#btn-restart', restartCurrent);
    on('#btn-again', () => { hideResult(); restartCurrent(); });
    on('#btn-share-result', () => shareResult());
    on('#btn-next', () => {
      hideResult();
      const deck = State.current.deck, lv = State.current.level;
      const idx = deck.levels.findIndex(l => l.id === lv.id);
      if (idx >= 0 && idx < deck.levels.length - 1) startLevel(deck.id, deck.levels[idx + 1].id);
      else if (deck.next) openLevels(deck.next);
      else { show('#screen-menu'); renderDecks(); }
    });
    on('#btn-menu-result', () => { hideResult(); show('#screen-menu'); renderDecks(); });
    on('#btn-reward-x2', () => rewardDouble());
    on('#btn-timeup-ad', () => resumeBlitz());
    on('#btn-timeup-end', () => { hideTimeUp(); finishGame(true); });
    on('#btn-sound', () => setSound());
    on('#btn-sound2', () => setSound());
    on('#btn-ach', () => { renderAchievements(); $('#ach-modal').classList.add('show'); });
    on('#btn-ach-close', () => $('#ach-modal').classList.remove('show'));
    on('#btn-confirm-yes', () => closeConfirm(true));
    on('#btn-confirm-no', () => closeConfirm(false));
    // долгое нажатие / правый клик по полю игры не должны давать выделение и меню (п. 1.6.1.8, 1.6.2.7)
    document.addEventListener('contextmenu', e => {
      if (e.target && e.target.closest && e.target.closest('#app')) e.preventDefault();
    });
    on('#btn-fullscreen', () => YandexGames.fullScreen());
    on('#btn-reset', async () => {
      const ok = await askConfirm(L('reset'), L('resetDesc'), L('yes'), L('no'));
      if (!ok) return;
      State.progress = normalizeProgress({});
      State.coins = 0;
      State.powerups = Object.assign({}, INITIAL_PU);
      await saveProgress();
      renderDecks();
      YandexGames.toast('Progress reset');
    });
    $('#ach-modal').addEventListener('click', e => { if (e.target.id === 'ach-modal') $('#ach-modal').classList.remove('show'); });
    $('#back-modal').addEventListener('click', e => { if (e.target.id === 'back-modal') hideBacks(); });
    $('#btn-lang').addEventListener('click', () => {
      State.lang = State.lang === 'ru' ? 'en' : 'ru';
      applyStaticLang();
      renderDecks();
      if (State.current && $('#screen-game').classList.contains('active')) {
        $('#deck-title').textContent = deckName(State.current.deck.id) + ' — ' + levelTitle(State.current.level);
        $('#hud-mode').textContent = modeLabel(State.current.level.mode);
        renderPowerups(); updateHud();
      }
    });
  }
  // свой диалог подтверждения: window.confirm в iframe Яндекса выглядит чужеродно
  let _confirmResolve = null;
  function askConfirm(title, text, yesTxt, noTxt) {
    const m = $('#confirm-modal');
    if (!m) return Promise.resolve(true);
    const put = (sel, txt) => { const n = $(sel); if (n) n.textContent = txt; };
    put('#confirm-title', title); put('#confirm-text', text);
    put('#btn-confirm-yes', yesTxt || L('yes')); put('#btn-confirm-no', noTxt || L('no'));
    m.classList.add('show');
    try { YandexGames.gameplayStop(); } catch (e) {}
    return new Promise(res => { _confirmResolve = res; });
  }
  function closeConfirm(ok) {
    const m = $('#confirm-modal');
    if (m) m.classList.remove('show');
    const r = _confirmResolve; _confirmResolve = null;
    if (r) r(ok);
    if ($('#screen-game').classList.contains('active') && !State.finished) {
      try { YandexGames.gameplayStart(); } catch (e) {}
    }
  }

  function setSound() {
    const on = !AudioMgr.isOn();
    AudioMgr.setOn(on);
    const icon = on ? '🔊' : '🔇';
    const a = $('#btn-sound'), b = $('#btn-sound2');
    if (a) a.textContent = icon;
    if (b) b.textContent = icon;
  }
  function hideResult() { $('#result-modal').classList.remove('show'); }

  // ---------- Туториал ----------
  let _tutBound = false;
  function buildTutorial() {
    const card = $('#tutorial-modal .modal-card');
    if (!card) return;
    card.innerHTML =
      '<div class="stars-row" style="font-size:28px">🧠 🃏 🎯</div>' +
      '<h2>' + L('tutorialTitle') + '</h2>' +
      '<p class="tut-body">' + L('tutorialBody') + '</p>' +
      '<div class="modal-actions"><button id="btn-tutorial-close" class="primary-btn">' + L('gotIt') + '</button></div>';
    if (!_tutBound) {
      _tutBound = true;
      const modal = $('#tutorial-modal');
      modal.addEventListener('click', e => { if (e.target === modal) closeTutorial(); });
    }
    const cb = $('#btn-tutorial-close');
    if (cb) cb.addEventListener('click', closeTutorial);
  }
  function closeTutorial() {
    $('#tutorial-modal').classList.remove('show');
    State.progress.tutDone = true; saveProgress();
  }
  function showTutorial() { buildTutorial(); $('#tutorial-modal').classList.add('show'); }
  function hideTutorial() { $('#tutorial-modal').classList.remove('show'); }

  // ---------- Статичные подписи ----------
  function applyStaticLang() {
    const set = (sel, txt) => { const n = $(sel); if (n) n.textContent = txt; };
    set('#btn-back', L('back'));
    const lb = $('#btn-levels-back');
    if (lb) {
      const lbl = lb.querySelector('.lv-lbl');
      const txt = L('levelBack');
      if (lbl) lbl.textContent = txt.replace(/^[\u2039\u00ab<]\s*/, ''); else lb.textContent = txt;
      lb.setAttribute('aria-label', txt.replace(/^[\u2039\u00ab<]\s*/, '').trim());
    }
    if (State.currentDeck && $('#screen-levels').classList.contains('active')) openLevels(State.currentDeck.id);
    set('#btn-restart', L('restart'));
    set('#btn-again', L('again'));
    set('#btn-share-result', L('share'));
    set('#btn-next', L('next'));
    set('#btn-menu-result', L('menu'));
    set('#logo-brand', L('brand'));
    set('#tagline', L('tag'));
    set('#result-moves-lab', L('movesLab'));
    set('#result-score-lab', L('scoreLab'));
    set('#btn-lang', State.lang.toUpperCase());
    set('#btn-ach-close', L('closeLab'));
    set('#btn-backs-close', L('closeLab'));
    document.documentElement.lang = State.lang;
    document.title = L('title');
  }

  // ---------- Поделиться результатом ----------
  async function shareResult() {
    const url = 'https://wizzleforgegames.github.io/memory-match/';
    const sc = ($('#result-score') && $('#result-score').textContent) || '0';
    const text = L('shareMsg') + ': ' + sc;
    try {
      if (navigator.share) { await navigator.share({ title: L('brand'), text: text + ' ' + url, url }); return; }
    } catch (e) { return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); if (window.YandexGames && YandexGames.toast) YandexGames.toast(L('copied')); }
    catch (e) { if (window.YandexGames && YandexGames.toast) YandexGames.toast(url); }
  }

  // ---------- Пересчёт сетки (поворот, ресайз, клавиатура) ----------
  let _rz = null;
  function scheduleRelayout() {
    clearTimeout(_rz);
    _rz = setTimeout(() => {
      relayout();
      layoutLevels();
      // второй проход: дожидаемся финальной раскладки HUD/панелей после поворота
      setTimeout(() => { relayout(); layoutLevels(); }, 320);
    }, 120);
  }
  window.addEventListener('resize', scheduleRelayout);
  window.addEventListener('orientationchange', () => setTimeout(() => { relayout(); layoutLevels(); }, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleRelayout);
  document.addEventListener('visibilitychange', () => {
    const inGame = $('#screen-game').classList.contains('active');
    if (!inGame || !State.current || State.finished) return;
    if (document.hidden) {
      stopTimer();
      YandexGames.stopGameplay();
      try { AudioMgr.pauseAll(); } catch (e) {}
    } else if (!State.timedOut && !$('#result-modal').classList.contains('show') &&
             !$('#timeup-modal').classList.contains('show')) {
      startTimer();
      try { AudioMgr.resumeAll(); } catch (e) {}
    }
  });

  // ---------- Пауза/возобновление по событиям платформы ----------
  function onSdkPause() {
    stopTimer();
    if (State.current && !State.finished) State.paused = true;
  }
  function onSdkResume() {
    if (!State.paused) return;
    State.paused = false;
    const inGame = $('#screen-game').classList.contains('active');
    if (inGame && !State.finished && !State.timedOut &&
        !$('#result-modal').classList.contains('show') && !$('#timeup-modal').classList.contains('show')) {
      startTimer();
    }
  }

  // ---------- Старт ----------
  async function boot() {
    await YandexGames.init();
    await YandexGames.abTest('mm_variant');
    await loadProgress();
    const loc = (YandexGames.locale() || '').slice(0, 2);
    State.lang = loc === 'en' ? 'en' : 'ru';
    initMenuButtons();
    applyStaticLang();
    await AudioMgr.init();
    checkAchievements();
    renderDecks();
    if (!State.progress.tutDone) showTutorial();
    const icon = AudioMgr.isOn() ? '🔊' : '🔇';
    const a = $('#btn-sound'), b = $('#btn-sound2');
    if (a) a.textContent = icon;
    if (b) b.textContent = icon;
    show('#screen-menu');
    try {
      const ro = new ResizeObserver(scheduleRelayout);
      if ($('#board')) ro.observe($('#board'));
    } catch (e) {}
    console.log('Memory Match ready. lang =', State.lang, '| decks =', DECKS.length, '| levels =', LEVELS_ALL.length);
  }

  window.__MM = {
    boot, startLevel, openLevels, renderDecks, restartCurrent, startContinue,
    DECKS, LEVELS_ALL, State, memoryScore, starsFor, similarity, placePairs, chooseShape, layoutLevels, nextLevelOf,
    deckUnlocked, levelAvailable, unlockNext, deckStarted, decksAfter, unlockLevel, normalizeProgress,
    claimGift, giftAvailable, openBacks, hideBacks, renderBacks, achValue, checkAchievements,
    timeUp, resumeBlitz, rewardDouble, menuBonus, puAdReward, bonusAvailable, showResult, finishGame,
    usePowerup, buyPowerup, doShuffle, peekAll, showHint, relayout,
    onSdkPause, onSdkResume, show, askConfirm,
  };
  document.addEventListener('DOMContentLoaded', boot);
})();
