'use strict';
/* ============================================================
   Candy Carnival — cozy neon-carnival match-3 for Yandex Games
   Vanilla JS + DOM board, YaGames SDK (ads, cloud save, stats, i18n)
   ============================================================ */

/* ---------------- board config ---------------- */
let COLS = 8, ROWS = 8, NUM_TYPES = 6, TILE = 64;

/* 16 candy treats — downloaded sprite pack (Ville Seppänen, CC BY 4.0), 256px RGBA,
   trimmed to content and centred on a 256px canvas so every tile sits dead straight. */
/* 60 treats, 10 chapter sets. Every chapter set takes exactly ONE treat from each
   silhouette family (round / ring / block / cluster / long / wrapped) and parks it on
   its own colour bucket, so inside a chapter no two treats share a silhouette and no
   two are closer than 43 degrees on the colour wheel. Built by tools/make_tiles3.py
   from the Candy Icon Pack (Ville Seppänen, CC BY 4.0, 256x256 RGBA); contact shadow
   and rim light are baked into the PNG so the CSS needs no heavy drop-shadow. */
const PALART = [];
for (let p = 0; p < 10; p++) for (let t = 0; t < 6; t++) PALART.push('assets/tiles/p' + p + '_' + t + '.png');
const TILES = PALART.slice(0, 6);            // legacy name: the first chapter set
const PALETTES = [
  [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5],
  [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]
];
/* measured dominant hue of every art file, per chapter (tools/make_tiles3.py) */
const TILE_HUE = [
  [5, 52, 128, 189, 259, 308], [52, 123, 190, 259, 309, 5], [123, 190, 258, 311, 6, 52],
  [190, 260, 308, 7, 52, 123], [258, 311, 8, 53, 123, 190], [5, 52, 128, 192, 259, 309],
  [52, 125, 192, 259, 309, 5], [122, 191, 258, 307, 5, 53], [192, 259, 308, 7, 52, 123],
  [258, 307, 9, 52, 122, 191]
];
const SIL = ['round', 'ring', 'block', 'cluster', 'long', 'wrapped'];
let PAL = 0;                                   // active palette index (set per level)
const artFor = (t, pal) => PALART[((pal == null ? PAL : pal) % 10) * 6 + ((t | 0) % 6)];
const tileFor = (t, types, pal) => artFor(t, pal);
const hueOf = (t, pal) => TILE_HUE[((pal == null ? PAL : pal) % 10)][((t | 0) % 6)];
const SPECIAL = { SWIRL: 'swirl', BOMB: 'bomb', RAINBOW: 'rainbow' };
/* full-cell art for special pieces — drawn in the same glossy kawaii style as the treats */
/* special pieces are OVERLAYS now: the treat underneath stays visible, so the board
   never turns into a field of identical tokens and colour meaning survives */
const SPART = {
  swirl: '<svg viewBox="0 0 100 100">' +
    '<g fill="none" stroke-linecap="round">' +
    '<circle cx="50" cy="50" r="41" stroke="#6ee7ff" stroke-width="7.5" opacity=".95"/>' +
    '<circle cx="50" cy="50" r="41" stroke="#eaffff" stroke-width="2.4" opacity=".8"/>' +
    '<path d="M50 50a7 7 0 1 1 14 0 14 14 0 1 1-28 0 21 21 0 1 1 42 0 28 28 0 1 1-56 0"' +
    ' stroke="#f4ffff" stroke-width="5.4" opacity=".92"/>' +
    '<path d="M50 3v11M50 86v11M3 50h11M86 50h11" stroke="#eaffff" stroke-width="7"/></g>' +
    '<circle cx="50" cy="50" r="41" fill="none" stroke="#0b3f66" stroke-width="1.6" opacity=".55"/>' +
    '</svg>',
  bomb: '<svg viewBox="0 0 100 100">' +
    '<circle cx="50" cy="52" r="40" fill="rgba(24,10,40,.46)" stroke="#ff9a3c" stroke-width="6.5"/>' +
    '<circle cx="50" cy="52" r="40" fill="none" stroke="#ffd76a" stroke-width="2" opacity=".85"/>' +
    '<path d="M50 26 L57 44 L76 44 L61 55 L67 74 L50 62 L33 74 L39 55 L24 44 L43 44 Z"' +
    ' fill="#ffd76a" opacity=".92"/>' +
    '<path d="M74 24c8-9 16-11 22-7" fill="none" stroke="#ffd76a" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="95" cy="16" r="8.5" fill="#ffd76a"/><circle cx="95" cy="16" r="4" fill="#fff8dc"/>' +
    '</svg>',
  rainbow: '<svg viewBox="0 0 100 100">' +
    '<circle cx="50" cy="50" r="40" fill="none" stroke="url(#rbg)" stroke-width="10"/>' +
    '<circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>' +
    '<path d="M50 4l3.2 7.4 8 .9-6 5.4 1.7 7.9L50 21.6 41.1 25.6l1.7-7.9-6-5.4 8-.9Z" fill="#fff"/>' +
    '<g fill="#fff" opacity=".9"><circle cx="14" cy="30" r="3.4"/><circle cx="86" cy="70" r="3.4"/></g>' +
    '</svg>'
};
const cellKey = (r, c) => r + ',' + c;
const unKey = k => k.split(',').map(Number);

/* ---------------- i18n ---------------- */
const L = {
  en: {
    level: 'Level', levelShort: 'LVL', score: 'Score', goal: 'Goal', moves: 'moves', coins: 'Tickets',
    collect: 'Collect', levels: 'Levels', playbtn: 'Play', continueBtn: 'Continue', tagline: 'A sweet match-3 at the night carnival',
    howto: 'How to play', gotit: 'Got it',
    how1: 'Swap neighbouring treats to line up 3 or more.',
    how2: '4 in a row — Swirl clears a whole line. 5 in a row — Rainbow clears one colour.',
    how3: 'L or T shape — Bomb blasts a 3×3 area.',
    how4: 'Win levels, earn tickets and buy boosters in the shop.',
    how5: 'Treats frozen in ice: crack the ice with matches and blasts.',
    win: 'Level complete!', lose: 'Out of moves', next: 'Next level', restart: 'Play again',
    retry: 'Try again', continue: 'Continue', daily: 'Daily gift', claim: 'Claim',
    coinsGot: 'Tickets earned', adDouble: 'Watch a video — tickets ×2', adMoves: 'Watch a video — +5 moves',
    adSkip: 'The video was not finished — no prize',
    noMoves: 'No moves left — reshuffling!', hint: 'Tap two neighbours to swap',
    combo: 'COMBO', hammer: 'Hammer', rainbow: 'Rainbow', shuffle: 'Shuffle',
    needCoins: 'Not enough tickets', boostOn: 'Tap a treat to use the booster',
    lvlLocked: 'Locked', saved: 'Progress saved', welcome: 'Welcome back, level ',
    ice: 'Ice', iceGoal: 'Break the ice', scoreGoal: 'Score', goalWord: 'Goal',
    introGoal: 'Goal', introMoves: 'moves left', good: 'Nice!', great: 'Sweet!',
    amazing: 'Amazing!', carnival: 'CARNIVAL!', shop: 'Shop', shopad: 'Watch a video — free booster',
    shopnote: 'Boosters stay in your inventory and never expire.',
    buy: 'Buy', have: 'In stock', free: 'Free', wheel: 'Wheel of fortune', spin: 'Spin',
    wheelComeback: 'Come back in %s for another spin', wheelStreak: 'Day %s streak — tickets bonus!',
    prizeTickets: '+%s tickets', prizeBooster: '%s ×%s', sound: 'Sound: on', soundOff: 'Sound: off',
    adFree: 'Watch a video — get it free', thanks: 'Thanks for playing!', iceLeft: 'ice left',
    streak: 'Streak', hintWord: 'Hint', boostFree: 'From inventory', fever: 'Carnival fever!',
    chapter: 'Chapter', newWord: 'New', starsWord: 'stars', levelsDone: '%s of %s levels cleared',
    starsOf: '%s / %s stars', nextChest: 'Next chest: level %s',
    chest: 'Chapter chest', chestOpen: 'Open the chest', chestGot: 'Chest opened!',
    rewardStars: 'Star reward', rewardGot: 'Reward for %s stars: %s',
    finaleTitle: 'Carnival complete!', finaleText: 'All %s levels cleared — %s stars. The whole park cheers for you!',
    replay: 'Start a new run', levelsBtn: 'Level map',
    intro_ice: 'Ice — crack it with matches and blasts', intro_shape: 'New board shape — mind the gaps',
    intro_double: 'Thick ice — two hits per block', intro_six: 'Six treat types on the board',
    intro_mixed: 'Two goals at once', intro_big: 'Bigger board', intro_narrow: 'Narrow board',
    intro_collect: 'Collect orders', intro_score: 'Score attack', intro_finale: 'Chapter finale — big chest inside',
    streakBonus: 'Win streak %s — bonus +%s tickets!', chapterDone: 'Chapter %s complete!',
    nextGoal: 'NEXT UP', giftBooster: 'Tough run! Here is a free hammer — you will get it.',
    bombWord: 'BOMB!', swirlWord: 'SWIRL!', rainbowWord: 'RAINBOW!',
    chainGoal: 'Break the chains', chainLocked: 'Shackles! Build the match around it or blast it.',
    fudgeGoal: 'Burn the caramel', fudgeBurned: 'Caramel burned!', fudgeGrew: 'Caramel crept over %s treat(s)!',
    paradeWord: 'Parade', paradeOn: 'PARADE ×2 · %s moves', paradeGo: 'CARNIVAL PARADE!',
    orderDone: 'Order complete!', ordSpecial: 'Make', ordIce: 'Break', ordChain: 'Unchain', ordBlast: 'Big clears',
    intro_chain: 'Shackles — the treat cannot be swapped, match around it',
    intro_fudge: 'Caramel — it creeps every move you ignore it',
    intro_carousel: 'Carousel — the top and bottom rows slide after every move',
    intro_parade: 'Parade meter — fill it and the carnival hands you specials',
    intro_orders: 'Orders — quick side tasks with instant rewards',
    how6: 'Shackles hold a treat in place — build the match around it.',
    how7: 'Caramel never moves and creeps if you ignore it. Burn it with blasts.',
    how8: 'Carousel: the top and bottom rows slide after every move.',
    how9: 'Fill the parade meter and the carnival hands out specials and double score.',
    targetGoal: 'Hit the pegs', balloonGoal: 'Pop the balloons',
    ordTarget: 'Hit', ordBalloon: 'Pop', ordLit: 'Clear in the light',
    bandWord: 'Band', band3: 'The band kicks in — free swirl!', band6: 'The band soars — free rainbow!',
    tilt0: 'down', tilt1: 'left', tilt2: 'up', tilt3: 'right',
    tiltSoon: 'turning soon!', tiltGo: 'The ride tilts — treats fall ',
    balloonLost: '%s balloon(s) flew away: -1 move each!', targetHit: 'Bullseye ×%s!',
    intro_target: 'Ring toss — clear a treat sitting on a peg',
    intro_balloon: 'Balloons climb every move — pop them before they fly off',
    intro_spot: 'Spotlight — clears inside the light pay triple',
    intro_tilt: 'Tilted ride — gravity turns every few moves',
    intro_band: 'Keep producing and the band hands you free specials',
    how10: 'A cone of light crawls over the board: clears inside it pay triple.',
    how11: 'Pegs are bolted down — clear the treat on top of them to score a hit.',
    how12: 'Balloons climb one row per move. Off the top edge costs you a move.',
    how13: 'On the tilted ride gravity turns every few moves — plan for it.',
    how14: 'Chain productive moves and the band gives you a free swirl, then a rainbow.',
    how15: 'Fill the parade meter and tap it to call the parade when YOU want.',
    tier1: 'Bronze', tier2: 'Silver', tier3: 'Gold', tier4: 'CARNIVAL!',
    stMoves: 'moves used', stCombo: 'best combo', stOrders: 'orders', stScore: 'score',
    bundle: 'Bundle', streakDay: 'Day %s of the streak: +%s tickets!',
    settings: 'Settings', musicWord: 'Music', soundWord: 'Sound', vibrateWord: 'Vibration',
    onWord: 'On', offWord: 'Off', skipNone: 'No streak-savers left',
    skipStore: 'Streak-savers', resetWord: 'Reset progress', resetAsk: 'Tap again to erase everything',
    resetDone: 'Progress erased', skipWord: 'Keep the streak (×%s)', skipGot: 'Streak-saver! ×%s',
    skipUsed: 'Streak saved — day %s continues', skipNote: 'A saver is earned on day 7 of the streak and keeps it alive if you miss a day.',
    shareWord: 'Share the game', shareTitle: 'Candy Carnival \u2014 match-3 at the night carnival',
    shareDesc: 'I just cleared level {n}! 200 sweet levels, boosters and a wheel of fortune.',
    setNote: 'Music and sound are separate. Vibration works on mobile only.',
    passport: 'Carnival passport', ppNote: 'Clear all ten levels of a chapter and the pavilion stamp is yours. Every stamp pays out tickets once.',
    ppStamp: 'Stamp', ppClaim: 'Claim +%s', ppGot: 'Collected', ppLocked: 'Locked',
    ppLevels: '%s / 10 levels', ppReady: 'Stamp ready!', ppAll: 'Full passport — the whole carnival is yours!',
    ppWord: 'Passport',
    beltGoal: 'Run the belts', fwGoal: 'Launch fireworks', fwWord: 'Firework',
    fwFuse: 'Fuse %s', fwBoom: 'Firework misfired: -1 move!', fwLaunch: 'Firework launched!',
    leverTilt: 'Tilt', leverSpot: 'Light', leverRide: 'Ride', leverMix: 'Mix',
    leverUsed: 'The %s lever already ran', leverGo: 'Lever pulled: %s',
    leverPick: 'Tap a cell to aim the spotlight', rideWord: 'rides',
    trickWord: 'Tricks', trickSwirl: 'Swirl', trickBomb: 'Bomb', trickRainbow: 'Rainbow',
    trickCost: '%s moves', trickNo: 'Not enough moves for that trick',
    dailyTag: 'Ride of the day', dailyNote: 'First win today pays double tickets',
    journalTitle: 'Carnival journal', journalSub: 'Everything the carnival has seen you do',
    sigSpot: 'Spotlight', sigTricks: 'Trick stall', sigConsole: 'Control panel',
    sigBelts: 'Conveyor belts', sigMirror: 'Mirror maze', sigFw: 'Fireworks',
    sigCarousel: 'Carousel', sigTilt: 'Tilted gravity', sigOrders: 'Live orders',
    sigBalloon: 'Balloons', sigTarget: 'Ring toss', sigChain: 'Shackles',
    sigFudge: 'Caramel', sigIce: 'Frost',
    jPlays: 'Levels played', jWins: 'Levels cleared', jTickets: 'Tickets earned',
    jFw: 'Fireworks launched', jLevers: 'Levers pulled', jTricks: 'Tricks bought',
    jBest: 'Best combo', jDaily: 'Daily rides claimed', jStars: 'Stars on the board',
    jRides: 'Rides ridden', journalFoot: 'The carnival keeps no receipts but it remembers.',
    dailyGo: 'Play it', dailyDone: 'Today\'s ride is already claimed',
    dailyWon: 'Ride of the day cleared: tickets x2', dailyNow: 'Today the carnival runs',
    rideFw: 'Fireworks on every stall', rideMirror: 'Mirror maze day', rideBelts: 'Conveyor day',
    rideFrost: 'Deep frost', rideChains: 'Shackled treats', rideBalloons: 'Balloon rush',
    rideSpot: 'Spotlight always on', rideTilt: 'Tilted gravity', rideTricks: 'Trick stall open',
    rideCarousel: 'Carousel day',
    trickOn: 'Tap a cell to place the %s', trickDone: '%s placed for %s moves',
    mirrorWord: 'Mirror', mirrorV: 'left↔right', mirrorH: 'up↔down', mirrorR: 'diagonal',
    intro_belt: 'Conveyor belts — treats slide along the arrows every move',
    intro_fw: 'Fireworks — clear them before the fuse burns out',
    intro_mirror: 'Mirror maze — every swap repeats on the other side',
    intro_console: 'Control panel — pull the levers yourself, once each',
    intro_tricks: 'Trick stall — buy special treats with moves, not tickets',
    how16: 'Conveyor belts push treats along their arrows after every move.',
    how17: 'Fireworks carry a fuse: clear them in time or they cost you a move.',
    how18: 'In the mirror maze every swap repeats on the mirrored side.',
    how19: 'The control panel gives you levers — pull them once per level, for free.',
    how20: 'The trick stall sells spinals, bombs and rainbows for MOVES, not tickets.',
    ordBelt: 'Slide', ordFw: 'Launch', ordTrick: 'Buy',
    logWord: 'Carnival log', logLever: 'levers pulled', logTrick: 'tricks bought',
    logFw: 'fireworks', logBelt: 'belt moves', ppAll2: 'Full passport',
    pickReward: 'Pick your prize', pickCoins: 'Tickets', pickBooster: 'Booster', pickMoves: '+3 moves next level',
    pickDone: 'Prize taken',
    leverWord: 'Panel', gadWord: 'carnival work', hintBooster: 'Tip: %s usually fixes this level.',
  },
  ru: {
    level: 'Уровень', levelShort: 'УР', score: 'Очки', goal: 'Цель', moves: 'ходов', coins: 'Билеты',
    collect: 'Собери', levels: 'Уровни', playbtn: 'Играть', continueBtn: 'Продолжить', tagline: 'Сладкие матч-3 на ночном карнавале',
    howto: 'Как играть', gotit: 'Понятно',
    how1: 'Меняй соседние лакомства — собирай 3 и больше в ряд.',
    how2: '4 в ряд — «Спираль» сметает линию. 5 в ряд — «Радуга» убирает весь цвет.',
    how3: 'Фигура L или T — «Бомба» взрывает область 3×3.',
    how4: 'Проходи уровни, получай билеты и покупай бустеры в магазине.',
    how5: 'Лакомства во льду: разбивай лёд совпадениями и взрывами рядом.',
    win: 'Уровень пройден!', lose: 'Ходы закончились', next: 'Следующий уровень', restart: 'Сыграть ещё',
    retry: 'Попробовать снова', continue: 'Продолжить', daily: 'Ежедневный подарок', claim: 'Забрать',
    coinsGot: 'Получено билетов', adDouble: 'Видео — билеты ×2', adMoves: 'Видео — +5 ходов',
    adSkip: 'Видео не досмотрено — приз не выдан',
    noMoves: 'Ходов нет — перемешиваю поле!', hint: 'Нажми две соседние клеточки, чтобы поменять',
    combo: 'КОМБО', hammer: 'Молоток', rainbow: 'Радуга', shuffle: 'Перемешать',
    needCoins: 'Не хватает билетов', boostOn: 'Нажми на лакомство, чтобы применить бустер',
    lvlLocked: 'Закрыт', saved: 'Прогресс сохранён', welcome: 'С возвращением, уровень ',
    ice: 'Лёд', iceGoal: 'Разбей лёд', scoreGoal: 'Набери', goalWord: 'Цель',
    introGoal: 'Цель', introMoves: 'ходов', good: 'Неплохо!', great: 'Сладко!',
    amazing: 'Ух ты!', carnival: 'КАРНАВАЛ!', shop: 'Магазин', shopad: 'Видео — бесплатный бустер',
    shopnote: 'Бустеры остаются в инвентаре и не сгорают между уровнями.',
    buy: 'Купить', have: 'В наличии', free: 'Бесплатно', wheel: 'Колесо фортуны', spin: 'Крутить',
    wheelComeback: 'Новый спин через %s', wheelStreak: 'Серия %s дн. — бонус к билетам!',
    prizeTickets: '+%s билетов', prizeBooster: '%s ×%s', sound: 'Звук: вкл', soundOff: 'Звук: выкл',
    adFree: 'Видео — бесплатно', thanks: 'Спасибо за игру!', iceLeft: 'льда осталось',
    streak: 'Серия', hintWord: 'Подсказка', boostFree: 'Из инвентаря', fever: 'Карнавал!',
    chapter: 'Глава', newWord: 'Новое', starsWord: 'звёзд', levelsDone: 'Пройдено %s из %s уровней',
    starsOf: '%s / %s звёзд', nextChest: 'Следующий сундук: уровень %s',
    chest: 'Сундук главы', chestOpen: 'Открыть сундук', chestGot: 'Сундук открыт!',
    rewardStars: 'Награда за звёзды', rewardGot: 'Награда за %s звёзд: %s',
    finaleTitle: 'Карнавал пройден!', finaleText: 'Пройдено все %s уровней — %s звёзд. Весь парк аплодирует тебе!',
    replay: 'Начать заново', levelsBtn: 'Карта уровней',
    intro_ice: 'Лёд — разбивай совпадениями и взрывами', intro_shape: 'Новая форма поля — будь внимателен',
    intro_double: 'Толстый лёд — нужно два удара', intro_six: 'Шесть видов лакомств на поле',
    intro_mixed: 'Две цели сразу', intro_big: 'Большое поле', intro_narrow: 'Узкое поле',
    intro_collect: 'Собирай заказы', intro_score: 'Атака очками', intro_finale: 'Финал главы — внутри сундук',
    streakBonus: 'Серия побед %s — бонус +%s билетов!', chapterDone: 'Глава %s пройдена!',
    nextGoal: 'Дальше', giftBooster: 'Тяжело? Держи бесплатный молоток — дальше будет проще.',
    bombWord: 'БОМБА!', swirlWord: 'СПИРАЛЬ!', rainbowWord: 'РАДУГА!',
    chainGoal: 'Разбей цепи', chainLocked: 'Цепи! Меняй другие плитки — совпадение вокруг снимет цепи.',
    fudgeGoal: 'Сожги карамель', fudgeBurned: 'Карамель сгорела!', fudgeGrew: 'Карамель расползлась на %s!',
    paradeWord: 'Парад', paradeOn: 'ПАРАД ×2 · %s ходов', paradeGo: 'КАРНАВАЛЬНЫЙ ПАРАД!',
    orderDone: 'Заказ выполнен!', ordSpecial: 'Сделай', ordIce: 'Разбей', ordChain: 'Освободи', ordBlast: 'Большие ряды',
    intro_chain: 'Цепи — лакомство не двигается, строй совпадение вокруг',
    intro_fudge: 'Карамель — каждый ход, когда её не трогают, она растёт',
    intro_carousel: 'Карусель — верхний и нижний ряды едут после каждого хода',
    intro_parade: 'Шкала парада — наполни, и карнавал даст спец-фигуры',
    intro_orders: 'Заказы — быстрые задания с мгновенной наградой',
    how6: 'Цепи держат лакомство на месте — строй совпадение вокруг него.',
    how7: 'Карамель не двигается и расползается, если её не трогать. Сожги её взрывами.',
    how8: 'Карусель: верхний и нижний ряды поля едут после каждого хода.',
    how9: 'Наполни шкалу парада — карнавал выдаст спец-фигуры и удвоит очки.',
    targetGoal: 'Сбей мишени', balloonGoal: 'Лопни шары',
    ordTarget: 'Сбей', ordBalloon: 'Лопни', ordLit: 'Убери в свете',
    bandWord: 'Оркестр', band3: 'Оркестр разогрелся — бесплатная спираль!', band6: 'Оркестр в ударе — бесплатная радуга!',
    tilt0: 'вниз', tilt1: 'влево', tilt2: 'вверх', tilt3: 'вправо',
    tiltSoon: 'скоро переворот!', tiltGo: 'Аттракцион накренился — лакомства падают ',
    balloonLost: '%s шар(ов) улетело: минус ход за каждый!', targetHit: 'В яблочко ×%s!',
    intro_target: 'Кольцеброс — сбей лакомство, стоящее на мишени',
    intro_balloon: 'Шары поднимаются каждый ход — лопни их до потолка',
    intro_spot: 'Прожектор — всё, что снято в свете, даёт тройные очки',
    intro_tilt: 'Перевёрнутый аттракцион — гравитация меняется каждые несколько ходов',
    intro_band: 'Играй результативно — оркестр даст бесплатные спец-фигуры',
    how10: 'По полю бродит луч прожектора: совпадения в свете дают тройные очки.',
    how11: 'Мишени прикручены к полю — сбивай лакомство прямо с них.',
    how12: 'Шары поднимаются на ряд каждый ход. Улетит — минус ход.',
    how13: 'На перевёрнутом аттракционе гравитация меняется каждые несколько ходов.',
    how14: 'Серия результативных ходов: оркестр выдаст спираль, а потом радугу.',
    how15: 'Наполни шкалу парада и нажми на неё — парад в твой момент.',
    tier1: 'Бронза', tier2: 'Серебро', tier3: 'Золото', tier4: 'КАРНАВАЛ!',
    stMoves: 'ходов потрачено', stCombo: 'лучшее комбо', stOrders: 'заказы', stScore: 'очки',
    bundle: 'Набор', streakDay: 'День %s серии: +%s билетов!',
    settings: 'Настройки', musicWord: 'Музыка', soundWord: 'Звук', vibrateWord: 'Вибрация',
    onWord: 'Вкл', offWord: 'Выкл', skipNone: 'Пропускалок нет',
    skipStore: 'Пропускалки серии', resetWord: 'Сбросить прогресс', resetAsk: 'Нажми ещё раз — стереть всё',
    resetDone: 'Прогресс сброшен', skipWord: 'Сохранить серию (×%s)', skipGot: 'Пропускалка! ×%s',
    skipUsed: 'Серия сохранена — продолжается день %s', skipNote: 'Пропускалка даётся на 7-й день серии и спасает её, если ты пропустил день.',
    shareWord: 'Поделиться игрой', shareTitle: 'Candy Carnival — матч-3 на ночном карнавале',
    shareDesc: 'Я только что прошёл уровень {n}: 200 сладких уровней, бустеры и колесо фортуны!',
    setNote: 'Музыка и звук включаются отдельно. Вибрация — только на телефоне.',
    passport: 'Паспорт карнавала', ppNote: 'Пройди все десять уровней главы — и печать павильона твоя. Каждая печать один раз приносит билеты.',
    ppStamp: 'Печать', ppClaim: 'Забрать +%s', ppGot: 'Забирали', ppLocked: 'Закрыто',
    ppLevels: '%s / 10 уровней', ppReady: 'Печать готова!', ppAll: 'Паспорт полон — весь карнавал твой!',
    ppWord: 'Паспорт',
    beltGoal: 'Прокрути ленты', fwGoal: 'Запусти фейерверки', fwWord: 'Фейерверк',
    fwFuse: 'Фитиль %s', fwBoom: 'Фейерверк бахнул сам: минус ход!', fwLaunch: 'Фейерверк запущен!',
    leverTilt: 'Наклон', leverSpot: 'Свет', leverRide: 'Поехали', leverMix: 'Перемешать',
    leverUsed: 'Рычаг «%s» уже отработал', leverGo: 'Рычаг: %s',
    leverPick: 'Нажми клетку — перенесу прожектор', rideWord: 'аттракционы',
    trickWord: 'Трюки', trickSwirl: 'Спираль', trickBomb: 'Бомба', trickRainbow: 'Радуга',
    trickCost: '%s хода', trickNo: 'Не хватает ходов на трюк',
    dailyTag: 'Атракцион дня', dailyNote: 'Первая победа сегодня — билеты x2',
    journalTitle: 'Журнал карнавала', journalSub: 'Всё, что карнавал видел, как вы делаете',
    sigSpot: 'Прожектор', sigTricks: 'Лавка трюков', sigConsole: 'Пульт управления',
    sigBelts: 'Конвейеры', sigMirror: 'Зеркальный лабиринт', sigFw: 'Фейерверки',
    sigCarousel: 'Карусель', sigTilt: 'Наклонная гравитация', sigOrders: 'Живые заказы',
    sigBalloon: 'Шары', sigTarget: 'Кольцеброс', sigChain: 'Оковы',
    sigFudge: 'Карамель', sigIce: 'Мороз',
    jPlays: 'Уровней сыграно', jWins: 'Уровней пройдено', jTickets: 'Билетов заработано',
    jFw: 'Фейерверков запущено', jLevers: 'Рычагов натянуто', jTricks: 'Трюков куплено',
    jBest: 'Лучшее комбо', jDaily: 'Атракционов дня пройдено', jStars: 'Звёзд на табло',
    jRides: 'Атракционов прокатились', journalFoot: 'Карнавал не хранит чеки, но всё запоминает.',
    dailyGo: 'Играть', dailyDone: 'Сегодняшний аттракцион уже пройден',
    dailyWon: 'Атракцион дня пройден: билеты x2', dailyNow: 'Сегодня на карнавале',
    rideFw: 'Фейерверки на каждой стойке', rideMirror: 'День зеркал', rideBelts: 'День конвейеров',
    rideFrost: 'Глубокий мороз', rideChains: 'Окованные лакомства', rideBalloons: 'Нашествие шаров',
    rideSpot: 'Прожектор всегда светит', rideTilt: 'Наклонная гравитация', rideTricks: 'Лавка трюков открыта',
    rideCarousel: 'День карусели',
    trickOn: 'Нажми на клетку — поставлю «%s»', trickDone: '«%s» за %s хода',
    mirrorWord: 'Зеркало', mirrorV: 'лево↔право', mirrorH: 'верх↔низ', mirrorR: 'наискосок',
    intro_belt: 'Конвейерные ленты — лакомства едут по стрелкам каждый ход',
    intro_fw: 'Фейерверки — сними их, пока фитиль не догорел',
    intro_mirror: 'Зеркальный лабиринт — каждый ход повторяется с другой стороны',
    intro_console: 'Пульт оператора — дёргай рычаги сам, каждый один раз',
    intro_tricks: 'Лавка трюков — спец-фигуры за ходы, не за билеты',
    how16: 'Конвейерные ленты толкают лакомства по стрелкам после каждого хода.',
    how17: 'У фейерверка фитиль: не снял вовремя — минус ход.',
    how18: 'В зеркальном лабиринте каждый своп повторяется зеркально.',
    how19: 'Пульт даёт рычаги: дёргай по одному за уровень — это бесплатно.',
    how20: 'Лавка трюков продаёт спирали, бомбы и радуги за ХОДЫ, а не за билеты.',
    ordBelt: 'Прокрути', ordFw: 'Запусти', ordTrick: 'Купи',
    logWord: 'Журнал карнавала', logLever: 'рычагов', logTrick: 'трюков',
    logFw: 'фейерверков', logBelt: 'сдвигов лент', ppAll2: 'Паспорт полон',
    pickReward: 'Выбери приз', pickCoins: 'Билеты', pickBooster: 'Бустер', pickMoves: '+3 хода вперёд',
    pickDone: 'Приз взят',
    leverWord: 'Пульт', gadWord: 'работа парка', hintBooster: 'Подсказка: обычно спасает «%s».',
  }
};
let lang = 'ru';
const T = k => (L[lang] && L[lang][k]) || L.en[k] || k;

/* ---------------- runtime state ---------------- */
let ysdk = null, player = null, soundOn = true, musicOn = true, vibeOn = true, skipTickets = 0;
let level = 1, score = 0, coins = 0, movesLeft = 0, movesTotal = 0;
let objectives = [], running = false, lastCombo = 0, targetMode = null;
let completedLevels = new Set(), starsByLevel = {}, dailyDate = '', wheelDate = '', streak = 0;
let inventory = { hammer: 0, rainbow: 0, shuffle: 0 };
let lossStreak = 0, winStreak = 0, fever = 0;
let LEVELS = [], levelCfg = null, sinceInterstitial = 0, hintTimer = null, adBusy = false, rated = false;
/* if the ad SDK never calls back, release the button after this much time
   (a QA/QA-harness knob: tests shorten it, the game ships with 25 s) */
let AD_WATCHDOG_MS = 35000;
let chestsOpened = new Set(), claimedRewards = new Set(), claimedChapters = new Set();

/* ---- motivation ladder: chest every 10 levels + star milestones ---- */
const CHEST_TABLE = ch => {
  const coins = 120 + ch * 45;
  const boosters = ['hammer', 'rainbow', 'shuffle'];
  const kind = boosters[ch % 3];
  const n = 2 + Math.floor(ch / 4);
  return [{ kind: 'coins', n: coins }, { kind: kind, n: n }, { kind: 'coins', n: 60 + ch * 20 }];
};
const STAR_REWARDS = [
  { stars: 5,   kind: 'shuffle', n: 1 }, { stars: 15,  kind: 'coins',   n: 150 },
  { stars: 30,  kind: 'hammer',  n: 2 }, { stars: 50,  kind: 'coins',   n: 250 },
  { stars: 75,  kind: 'rainbow', n: 2 }, { stars: 100, kind: 'coins',   n: 400 },
  { stars: 140, kind: 'hammer',  n: 3 }, { stars: 180, kind: 'coins',   n: 600 },
  { stars: 230, kind: 'rainbow', n: 3 }, { stars: 290, kind: 'shuffle', n: 4 },
  { stars: 350, kind: 'coins',   n: 900 }, { stars: 420, kind: 'hammer', n: 4 },
  { stars: 490, kind: 'rainbow', n: 4 }, { stars: 550, kind: 'coins',   n: 1500 }
];
const totalStars = () => Object.values(starsByLevel).reduce((a, b) => a + (b | 0), 0);
function nextChestLevel() {
  for (let n = 10; n <= totalLevels(); n += 10) if (!chestsOpened.has(n)) return n;
  return 0;
}
function grantReward(r) {
  if (r.kind === 'coins') { coins += r.n; flyTickets(4); }
  else inventory[r.kind] = (inventory[r.kind] | 0) + r.n;
  updateHUD(); saveProgress();
}
function checkStarRewards() {
  const tot = totalStars();
  for (let i = 0; i < STAR_REWARDS.length; i++) {
    const r = STAR_REWARDS[i];
    if (claimedRewards.has(i) || tot < r.stars) continue;
    claimedRewards.add(i);
    grantReward(r);
    toast(T('rewardGot').replace('%s', r.stars).replace('%s', prizeLabel(r)));
    analytics.track('star_reward', { stars: r.stars, kind: r.kind, n: r.n });
  }
}
const el = id => document.getElementById(id);

let SPEED = 1;                       // test hook: 1 = normal, <1 = fast (used by automated tests)
const delay = ms => new Promise(r => setTimeout(r, Math.max(0, Math.round(ms * SPEED))));
/* restart a CSS animation without forcing a synchronous reflow (no jank) */
function restartAnim(node, cls) {
  if (!node) return;
  node.classList.remove(cls);
  requestAnimationFrame(() => { if (node) node.classList.add(cls); });
}

/* ---------------- audio (all files downloaded from the web) ---------------- */
const SFX = {};
let music = null, MUSIC_TRACKS = [], musicIdx = 0;
function preloadSound(name, url) { SFX[name] = new Audio(url); SFX[name].preload = 'auto'; }
const VIBE = { pop: 10, match: 16, combo: 26, reward: 34, magic: 20, arcade: 18, shuffle: 24, win: 70, lose: 110 };
function vibe(name) {
  if (!vibeOn) return;
  const ms = VIBE[name]; if (!ms) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}
function play(name, vol) {
  vibe(name);
  if (!soundOn || !SFX[name]) return;
  try {
    const a = SFX[name];
    a.currentTime = 0; a.volume = vol == null ? 1 : vol;
    a.play().catch(() => {});
  } catch (e) {}
}
function startMusic() {
  if (!music || !musicOn || !soundOn) return;
  try { music.loop = true; music.volume = 0.26; music.play().catch(() => {}); } catch (e) {}
}
function stopMusic() { try { if (music) music.pause(); } catch (e) {} }
function pauseAllAudio() { try { for (const k in SFX) SFX[k] && SFX[k].pause(); stopMusic(); } catch (e) {} }
function resumeAllAudio() { if (!soundOn) return; startMusic(); }

/* ---------------- board data ---------------- */
let board = [];        // board[r][c] = type index or -1
let spec = [];         // spec[r][c] = {kind,tile} | null
let ice = [];          // ice[r][c] = 0..2 layers of frost
let chain = [];        // chain[r][c] = 0..2 shackles: the treat cannot be swapped
let blk = [];          // blk[r][c] = null | {kind:'fudge',hp} — immovable, spreading caramel
let wall = [];         // wall[r][c] = 1 -> hole, no treat ever spawns there
let tgt = [];          // tgt[r][c] = 1 -> ring-toss peg bolted to the board cell
let bal = [];          // bal[r][c] = {hp} -> balloon: rises every move, escapes off the top
let conv = [];         // conv[r][c] = 0 (no belt) or 1=up 2=right 3=down 4=left
let fw = [];           // fw[r][c] = {n} firework treat with a burning fuse
let levers = [];       // the control panel: free, once-per-level ride controls
let tricks = null;     // the trick stall: specials bought with MOVES
let leverMode = null;  // 'spot' while the player aims the spotlight
let beltMoves = 0, fwLaunched = 0, leversPulled = 0, tricksBought = 0;
let spot = null;       // {r,c} centre of the travelling spotlight (3x3 lit area)
let spotPath = [], spotAt = 0;
let gravDir = 0;       // 0 down, 1 left, 2 up, 3 right — the tilted ride
let bandMeter = 0;     // the carnival band: a clean streak of moves pays out
let SHAPE = 'full';    // current level shape id
const cells = [];      // DOM nodes
const parts = [];      // cached child nodes per cell (see buildCells)

/* the carnival's own pulse: a meter that fills with matches and unleashes a PARADE,
   plus a live queue of small orders the player can chase for quick rewards */
let paradeMeter = 0, paradeMoves = 0, orders = [], ordersDone = 0, fudgeTouched = null, bestCombo = 0;
let moveCleared = 0, moveSpecials = 0, moveLit = 0;

const isSolid = (r, c) => (board[r] && board[r][c] >= 0) || !!(spec[r] && spec[r][c]);
const isWall = (r, c) => !!(wall[r] && wall[r][c]);
const isBlk = (r, c) => !!(blk[r] && blk[r][c]);
const isChained = (r, c) => (chain[r] && chain[r][c] > 0);
const isBalloon = (r, c) => !!(bal[r] && bal[r][c]);
const isTarget = (r, c) => !!(tgt[r] && tgt[r][c]);
const isBelt = (r, c) => !!(conv[r] && conv[r][c]);
const isFw = (r, c) => !!(fw[r] && fw[r][c]);
/* belt arrow -> (dr,dc): 1 up, 2 right, 3 down, 4 left */
const BELT_D = [null, [-1, 0], [0, 1], [1, 0], [0, -1]];
const isBlockedCell = (r, c) => isWall(r, c) || isBlk(r, c) || isBalloon(r, c);
/* the direction treats fall in, as a (dr,dc) step */
const GRAV = [[1, 0], [0, -1], [-1, 0], [0, 1]];
const gravVec = () => GRAV[gravDir];
const isLit = (r, c) => !!spot && Math.abs(r - spot.r) <= 1 && Math.abs(c - spot.c) <= 1;
const inBoard = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;

/* ---- board shapes: true = hole. Generated for the ACTUAL rows/cols so
      portrait / landscape / 7..9 grids all stay symmetric and playable. ---- */
const SHAPES = {
  full:     () => false,
  corners:  (r, c, R, C) => { const k = (R >= 9 || C >= 9) ? 2 : 1;
    return (r < k && c < k) || (r < k && c >= C - k) || (r >= R - k && c < k) || (r >= R - k && c >= C - k); },
  cross:    (r, c, R, C) => { const k = Math.max(1, (R / 4) | 0), m = Math.max(1, (C / 4) | 0);
    return (r < k && c < m) || (r < k && c >= C - m) || (r >= R - k && c < m) || (r >= R - k && c >= C - m); },
  sides:    (r, c, R, C) => { const k = Math.max(2, (R / 4) | 0);
    return (c === 0 || c === C - 1) && (r < k || r >= R - k); },
  diamond:  (r, c, R, C) => { const mr = (R - 1) / 2, mc = (C - 1) / 2;   /* octagon / diamond */
    return Math.abs(r - mr) + Math.abs(c - mc) > (mr + mc - 2.5); },
  arch:     (r, c, R, C) => { const m = (C / 2) | 0; return r < 2 && (c === m || (C % 2 === 0 && c === m - 1)); },
  frame:    (r, c, R, C) => { const top = r === 0, bot = r === R - 1, left = c === 0, right = c === C - 1;
    if (!(top || bot || left || right)) return false;
    return (top || bot) ? (c % 2 === 1) : (r % 2 === 1); },
  pyramid:  (r, c, R, C) => { const mc = (C - 1) / 2, half = mc * (r + 1) / R;
    return Math.abs(c - mc) > half + 0.5; },
  notch:    (r, c, R, C) => { const mr = (R / 2) | 0, mc = (C / 2) | 0;
    return (r === mr || r === mr - 1) && (c === mc || c === mc - 1); },
  waist:    (r, c, R, C) => { const k = Math.max(1, (Math.min(R, C) / 4) | 0);
    return r >= k && r <= R - 1 - k && (c < k || c > C - 1 - k); },
  pillars:  (r, c, R, C) => { const mr = (R / 2) | 0; return r === mr && c % 3 === 1; }
};
function buildWall(R, C, shape) {
  const f = SHAPES[shape] || SHAPES.full;
  const g = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) row.push(f(r, c, R, C) ? 1 : 0);
    g.push(row);
  }
  trimHoles(g, R, C);
  prunePockets(g, R, C);
  let holes = 0, bad = false;
  for (let r = 0; r < R; r++) {
    let free = 0;
    for (let c = 0; c < C; c++) if (!g[r][c]) free++; else holes++;
    if (free > 0 && free < 3) bad = true;          // a 1-2 cell strip can never host a match
  }
  for (let c = 0; c < C; c++) {
    let free = 0; for (let r = 0; r < R; r++) if (!g[r][c]) free++;
    if (free > 0 && free < 3) bad = true;
  }
  if (bad || holes > R * C * 0.45) return buildWall(R, C, 'full');
  return g;
}
/* A cell with fewer than two playable neighbours can never take part in a match,
   so it is a dead pocket: treat it as a hole instead. */
function openness(g, R, C, r, c) {
  let n = 0;
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nc >= 0 && nr < R && nc < C && !g[nr][nc]) n++;
  }
  return n;
}
function prunePockets(g, R, C) {
  for (let pass = 0; pass < 8; pass++) {
    const kill = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!g[r][c] && openness(g, R, C, r, c) <= 1) kill.push([r, c]);
    if (!kill.length) break;
    for (const [r, c] of kill) g[r][c] = 1;
  }
}
/* cut the mask down so no row/column loses too much space — always removing
   mirrored pairs first, so shapes stay left/right and top/bottom symmetric */
function trimHoles(g, R, C) {
  const maxRow = Math.max(2, Math.floor(C * 0.55)), maxCol = Math.max(2, Math.floor(R * 0.45));
  for (let r = 0; r < R; r++) {
    for (;;) {
      let n = 0, l = -1, rr = -1;
      for (let c = 0; c < C; c++) if (g[r][c]) { n++; if (l < 0) l = c; rr = c; }
      if (n <= maxRow || l < 0) break;
      g[r][l] = 0;
      if (rr !== l && l + rr === C - 1) g[r][rr] = 0;
    }
  }
  for (let c = 0; c < C; c++) {
    for (;;) {
      let n = 0, t = -1, b = -1;
      for (let r = 0; r < R; r++) if (g[r][c]) { n++; if (t < 0) t = r; b = r; }
      if (n <= maxCol || t < 0) break;
      g[t][c] = 0;
      if (b !== t && t + b === R - 1) g[b][c] = 0;
    }
  }
}
const randType = () => Math.floor(Math.random() * NUM_TYPES);

function makeBoard() {
  wall = buildWall(ROWS, COLS, SHAPE);
  board = []; spec = []; ice = []; chain = []; blk = []; tgt = []; bal = []; conv = [];
  for (let r = 0; r < ROWS; r++) {
    spec.push(new Array(COLS).fill(null));
    ice.push(new Array(COLS).fill(0));
    chain.push(new Array(COLS).fill(0));
    blk.push(new Array(COLS).fill(null));
    tgt.push(new Array(COLS).fill(0));
    bal.push(new Array(COLS).fill(null));
    conv.push(new Array(COLS).fill(0));
    fw.push(new Array(COLS).fill(null));
    board.push([]);
    for (let c = 0; c < COLS; c++) {
      if (wall[r][c]) { board[r][c] = -1; continue; }
      let t, guard = 0;
      do { t = randType(); guard++; } while (guard < 40 && (
        (c >= 2 && board[r][c - 1] === t && board[r][c - 2] === t) ||
        (r >= 2 && board[r - 1][c] === t && board[r - 2][c] === t)));
      board[r][c] = t;
    }
  }
  if (!anyMove()) reshuffleTypes();
}

/* cells[r][c] is the DOM node (lots of code touches it directly); parts[r][c] caches every
   overlay child so render() never runs a querySelector — that used to be ~6 lookups per
   cell per frame, i.e. ~4400 on a 9x9 board. */
function buildCells() {
  const b = el('board');
  b.innerHTML = '';
  cells.length = 0; parts.length = 0;
  const frag = document.createDocumentFragment();
  for (let r = 0; r < ROWS; r++) {
    cells[r] = []; parts[r] = [];
    for (let c = 0; c < COLS; c++) {
      const d = document.createElement('div');
      d.className = 'cell'; d.dataset.r = r; d.dataset.c = c;
      const img = document.createElement('img');
      img.alt = ''; img.draggable = false; img.className = 'tile';
      d.appendChild(img);
      frag.appendChild(d);
      cells[r][c] = d;
      parts[r][c] = { img: img, k: '', badge: null, art: null, ice: null,
                      chain: null, blk: null, mark: null, peg: null, ball: null,
                      fw: null, belt: null, cls: '' };
    }
  }
  b.appendChild(frag);
  cells.length = ROWS;
}

/* ---------------- responsive layout ---------------- */
/* the marquee frame + its bulbs + glow need this much room around the board */
const FRAME_PAD = 14;
function layoutBoard() {
  const top = el('topbar'), hud = el('hud'), bot = el('bottombar'), wrap = el('boardwrap');
  const land = window.innerWidth > window.innerHeight && window.innerHeight <= 660;
  let availW, availH;
  if (land) {
    const side = Math.max(150, Math.min(240, Math.round(window.innerWidth * 0.24)));
    availW = Math.max(180, window.innerWidth - side - 22 - FRAME_PAD * 2);
    availH = Math.max(160, window.innerHeight - (top ? top.offsetHeight : 40) - 14 - FRAME_PAD * 2);
  } else {
    const chrome = (top ? top.offsetHeight : 44) + (hud ? hud.offsetHeight : 44) +
                   (bot ? bot.offsetHeight : 60) + 30;
    availW = Math.max(180, window.innerWidth - (window.innerWidth > 430 ? 24 : 12) - FRAME_PAD * 2);
    availH = Math.max(160, window.innerHeight - chrome - FRAME_PAD * 2 - 18);
  }
  /* hard clamp: whatever the grid actually left for the board is the hard limit */
  if (wrap) {
    const bw = wrap.clientWidth - FRAME_PAD * 2, bh = wrap.clientHeight - FRAME_PAD * 2;
    if (bw > 40) availW = Math.min(availW, bw);
    if (bh > 40) availH = Math.min(availH, bh);
  }
  TILE = Math.max(24, Math.min(Math.floor(availW / COLS), Math.floor(availH / ROWS), 104));
  document.documentElement.style.setProperty('--tile', String(TILE));
  const b = el('board');
  if (b) { b.style.width = (COLS * TILE) + 'px'; b.style.height = (ROWS * TILE) + 'px'; }
  const f = el('boardframe');
  if (f) { f.style.width = (COLS * TILE + 14) + 'px'; f.style.height = (ROWS * TILE + 14) + 'px'; }
  const g = el('garland');
  if (g) { g.style.width = (COLS * TILE) + 'px'; g.style.left = '50%'; g.style.transform = 'translateX(-50%)'; g.style.top = 'max(0px, calc(50% - ' + (ROWS * TILE / 2) + 'px - 16px))'; }
  positionCells();
}
function positionCells() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const d = cells[r] && cells[r][c]; if (!d) continue;
    d.style.left = (c * TILE) + 'px'; d.style.top = (r * TILE) + 'px';
  }
}

/* ---------------- rendering ---------------- */
const BADGE = {
  swirl: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#062340" stroke="#fff" stroke-width="1.7"/><path d="M12 12a2 2 0 1 1 4 0 4 4 0 1 1-8 0 6 6 0 1 1 12 0" fill="none" stroke="#6ee7ff" stroke-width="2.3" stroke-linecap="round"/></svg>',
  bomb: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2b1200" stroke="#fff" stroke-width="1.7"/><circle cx="10.4" cy="14.2" r="6.2" fill="#150a00" stroke="#ff9a3c" stroke-width="1.9"/><path d="M14.8 8.4c1.7-2.3 3.8-2.7 5.2-1.6" stroke="#ffd76a" stroke-width="2.1" fill="none" stroke-linecap="round"/><circle cx="20.2" cy="6.4" r="2.1" fill="#ffd76a"/><circle cx="8.2" cy="11.8" r="1.9" fill="#ff9a3c"/></svg>',
  rainbow: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2a1745" stroke="#fff" stroke-width="1.7"/><path d="M12 3.6l2.4 5.4 5.9.6-4.5 4 1.3 5.8L12 16.5 6.9 19.4l1.3-5.8-4.5-4 5.9-.6Z" fill="url(#stara)" stroke="#fff" stroke-width=".9"/><circle cx="12" cy="12" r="11" fill="none" stroke="url(#rbg)" stroke-width="2.3"/></svg>'
};
/* every overlay child is cached in parts[r][c]; classes render owns are diffed against
   the previous frame, so a steady board costs almost no DOM work. */
function dropNode(n) { if (n) n.remove(); }
function childNode(d, P, key, tag, cls) {
  if (P[key]) return P[key];
  const n = document.createElement(tag);
  n.className = cls;
  d.appendChild(n);
  P[key] = n;
  return n;
}
function render() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const d = cells[r] && cells[r][c]; if (!d) continue;
    const P = parts[r][c]; if (!P) continue;
    const sp = spec[r][c];
    const own = [];

    if (isWall(r, c)) {
      P.img.style.opacity = '0'; P.k = '';
      ['badge','art','ice','chain','blk','mark','peg','ball','fw','belt'].forEach(k => { dropNode(P[k]); P[k] = null; });
      applyOwn(d, P, ['hole']);
      continue;
    }
    if (sp) {
      own.push('sp-' + sp.kind);
      if (sp.kind === SPECIAL.RAINBOW) {
        /* the colour still matters: a rainbow piece wipes out one colour */
        const key = 'r' + sp.tile;
        if (P.k !== key) { P.img.src = artFor(sp.tile); P.k = key; }
        P.img.style.opacity = '1';
        const art = childNode(d, P, 'art', 'span', 'spart');
        if (art.dataset.k !== sp.kind) { art.dataset.k = sp.kind; art.innerHTML = SPART[sp.kind]; }
      } else {
        /* swirl / bomb sit ON TOP of a real treat, so the board never turns into
           a field of identical tokens — you can still read the colour underneath */
        const key = 'b' + sp.tile;
        if (P.k !== key) { P.img.src = tileFor(sp.tile); P.k = key; }
        P.img.style.opacity = '1';
        const art = childNode(d, P, 'art', 'span', 'spart');
        if (art.dataset.k !== sp.kind) { art.dataset.k = sp.kind; art.innerHTML = SPART[sp.kind]; }
      }
      const bd = childNode(d, P, 'badge', 'span', 'badge');
      if (bd.dataset.k !== sp.kind) { bd.dataset.k = sp.kind; bd.innerHTML = BADGE[sp.kind]; }
    } else if (board[r][c] >= 0) {
      const key = 'b' + board[r][c];
      if (P.k !== key) { P.img.src = tileFor(board[r][c]); P.k = key; }
      P.img.style.opacity = '1';
      dropNode(P.art); P.art = null;
      dropNode(P.badge); P.badge = null;
    } else {
      P.img.style.opacity = '0'; P.k = '';
      dropNode(P.art); P.art = null;
      dropNode(P.badge); P.badge = null;
    }

    /* frost */
    const layers = ice[r][c] | 0;
    if (layers > 0 && board[r][c] >= 0) {
      childNode(d, P, 'ice', 'div', 'ice');
      own.push('ice' + layers);
    } else { dropNode(P.ice); P.ice = null; }

    /* shackles: the treat is there but it refuses to move */
    const cl = chain[r][c] | 0;
    if (cl > 0 && board[r][c] >= 0) {
      childNode(d, P, 'chain', 'div', 'chain');
      own.push('chain' + cl);
    } else { dropNode(P.chain); P.chain = null; }

    /* ring-toss peg bolted to this cell */
    if (tgt[r][c]) { childNode(d, P, 'peg', 'i', 'peg'); }
    else { dropNode(P.peg); P.peg = null; }

    /* balloon: it is not a treat, it is a balloon tied to the board */
    if (bal[r][c]) { childNode(d, P, 'ball', 'i', 'balloon'); }
    else { dropNode(P.ball); P.ball = null; }

    /* B1: conveyor belt arrow painted on the cell floor */
    const bd = conv[r] && conv[r][c];
    if (bd) {
      const n = childNode(d, P, 'belt', 'i', 'belt');
      n.dataset.dir = ['', 'u', 'r', 'd', 'l'][bd];
    } else { dropNode(P.belt); P.belt = null; }

    /* B3: firework fuse — the number left before it goes off on its own */
    const f = fw[r] && fw[r][c];
    if (f) {
      const n = childNode(d, P, 'fw', 'i', 'fw');
      n.dataset.n = String(Math.max(1, f.n));
      own.push('fw' + Math.max(1, Math.min(6, f.n)));
    } else { dropNode(P.fw); P.fw = null; }

    /* carousel arrows on the two sliding rows */
    if (levelCfg && levelCfg.carousel && (r === 0 || r === ROWS - 1)) {
      const crm = childNode(d, P, 'mark', 'i', 'crmark');
      crm.dataset.dir = r === 0 ? 'l' : 'r';
    } else { dropNode(P.mark); P.mark = null; }

    /* caramel blocker: no treat at all, just a sticky blob that grows */
    const bl = blk[r][c];
    if (bl) {
      const n = childNode(d, P, 'blk', 'div', 'blk');
      n.dataset.hp = String(bl.hp);
      own.push('fudge' + Math.max(1, Math.min(2, bl.hp)));
      P.img.style.opacity = '0';
    } else { dropNode(P.blk); P.blk = null; }

    if (isLit(r, c)) own.push('lit');
    applyOwn(d, P, own);
  }
  drawSpot();
}
/* swap only the classes render owns; sel/hint/pop/hop stay untouched */
function applyOwn(d, P, own) {
  const sig = own.join(' ');
  if (P.cls === sig) return;
  const old = P.cls ? P.cls.split(' ') : [];
  for (const k of old) if (own.indexOf(k) < 0) d.classList.remove(k);
  for (const k of own) if (old.indexOf(k) < 0) d.classList.add(k);
  P.cls = sig;
}
/* the travelling spotlight: one soft cone of light over the lit 3x3 */
function drawSpot() {
  let n = el('spotlight');
  if (!spot) { if (n) n.style.opacity = '0'; return; }
  if (!n) {
    n = document.createElement('div');
    n.id = 'spotlight'; n.style.opacity = '0';
    const b = el('board'); if (!b) return;
    b.appendChild(n);
  }
  const x = Math.max(0, (spot.c - 1)) * TILE, w = Math.min(COLS, 3) * TILE;
  const y = Math.max(0, (spot.r - 1)) * TILE, h = Math.min(ROWS, 3) * TILE;
  n.style.left = x + 'px'; n.style.top = y + 'px';
  n.style.width = w + 'px'; n.style.height = h + 'px';
  n.style.opacity = '1';
}

/* ---------------- input: click + drag ---------------- */
let selected = null, dragFrom = null, dragStart = null, trickMode = null;

function cellFromPoint(x, y) {
  const b = el('board'); if (!b) return null;
  const rect = b.getBoundingClientRect();
  const c = Math.floor((x - rect.left) / TILE), r = Math.floor((y - rect.top) / TILE);
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
  return { r, c };
}

function bindInput() {
  const b = el('board');
  b.addEventListener('pointerdown', e => {
    if (running || adBusy || modalOpen()) return;
    const p = cellFromPoint(e.clientX, e.clientY);
    if (!p) return;
    e.preventDefault();
    if (leverMode === 'spot') {
      if (!isWall(p.r, p.c) && spot) {
        spot = { r: p.r, c: p.c };
        const li = levers.findIndex(x => x.kind === 'spot' && !x.used);
        if (li >= 0) { levers[li].used = true; leversPulled++; }
        leverMode = null;
        drawSpot(); render(); play('magic', .6); toast(T('leverGo').replace('%s', leverLabel('spot')));
        updateHUD();
      }
      return;
    }
    if (trickMode) { const k = trickMode; trickMode = null; (async () => { await placeTrick(k, p.r, p.c); updateHUD(); })(); return; }
    if (targetMode) { useBoosterOn(p.r, p.c); return; }
    dragFrom = p; dragStart = { x: e.clientX, y: e.clientY };
    if (!selected) { selected = p; cells[p.r][p.c].classList.add('sel'); return; }
    if (selected.r === p.r && selected.c === p.c) { clearSel(); return; }
    if (adjacent(selected, p)) { const a = selected; clearSel(); trySwap(a, p); }
    else { clearSel(); selected = p; cells[p.r][p.c].classList.add('sel'); }
  });
  b.addEventListener('pointerup', e => {
    if (!dragFrom || !dragStart || running) { dragFrom = null; return; }
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > TILE * 0.35 || Math.abs(dy) > TILE * 0.35) {
      let t = { r: dragFrom.r, c: dragFrom.c };
      if (Math.abs(dx) > Math.abs(dy)) t.c += dx > 0 ? 1 : -1; else t.r += dy > 0 ? 1 : -1;
      clearSel();
      if (t.r >= 0 && t.c >= 0 && t.r < ROWS && t.c < COLS) trySwap(dragFrom, t);
    }
    dragFrom = null; dragStart = null;
  });
  b.addEventListener('pointercancel', () => { dragFrom = null; dragStart = null; });
  b.addEventListener('contextmenu', e => e.preventDefault());
}
const adjacent = (a, b) => (Math.abs(a.r - b.r) + Math.abs(a.c - b.c)) === 1;
function modalOpen() {
  return ['lvlsel', 'howto', 'shop', 'wheel', 'overlay'].some(id => {
    const m = el(id); return m && !m.classList.contains('hidden');
  });
}
function clearSel() {
  if (selected && cells[selected.r] && cells[selected.r][selected.c]) cells[selected.r][selected.c].classList.remove('sel');
  selected = null;
}
function clearHints() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (cells[r] && cells[r][c]) cells[r][c].classList.remove('hint');
}
function bindParadeBtn() {
  const b = el('paradebox'); if (!b) return;
  b.addEventListener('click', async () => {
    if (running || adBusy || modalOpen()) return;
    if (paradeMeter < PARADE_NEED || paradeMoves > 0) return;
    running = true;
    await startParade();
    running = false;
    updateHUD();
  });
}
function bindHintBtn() {
  const b = el('hintbtn'); if (!b) return;
  b.addEventListener('click', () => {
    if (running || adBusy || modalOpen()) return;
    if (hintBtnCool) { return; }
    hintBtnCool = true; b.classList.add('cool');
    setTimeout(() => { hintBtnCool = false; b.classList.remove('cool'); }, 4000);
    showHint();
  });
}
let hintBtnCool = false;
function armHint() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (running || targetMode) return;
    /* watchdog: a board can lose its last move to a carnival tick */
    if (!anyMove()) { ensurePlayable(); return; }
    showHint();
  }, 6000);
}

/* ---------------- swap ---------------- */
async function animSwap(a, b, dur) {
  const A = cells[a.r][a.c], B = cells[b.r][b.c];
  const dx = (b.c - a.c) * TILE, dy = (b.r - a.r) * TILE;
  A.style.transition = B.style.transition = 'transform ' + (dur || 190) + 'ms cubic-bezier(.25,1.15,.4,1)';
  A.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  B.style.transform = 'translate(' + (-dx) + 'px,' + (-dy) + 'px)';
  await delay(dur || 190);
  A.style.transition = B.style.transition = 'none';
  A.style.transform = ''; B.style.transform = '';
  requestAnimationFrame(() => { if (A) A.style.transition = ''; if (B) B.style.transition = ''; });
}
function swapData(a, b) {
  let t = board[a.r][a.c]; board[a.r][a.c] = board[b.r][b.c]; board[b.r][b.c] = t;
  let s = spec[a.r][a.c]; spec[a.r][a.c] = spec[b.r][b.c]; spec[b.r][b.c] = s;
  let i = ice[a.r][a.c]; ice[a.r][a.c] = ice[b.r][b.c]; ice[b.r][b.c] = i;
  let h = chain[a.r][a.c]; chain[a.r][a.c] = chain[b.r][b.c]; chain[b.r][b.c] = h;
  let k = blk[a.r][a.c]; blk[a.r][a.c] = blk[b.r][b.c]; blk[b.r][b.c] = k;
  let f = fw[a.r][a.c]; fw[a.r][a.c] = fw[b.r][b.c]; fw[b.r][b.c] = f;
  let b2 = conv[a.r][a.c]; conv[a.r][a.c] = conv[b.r][b.c]; conv[b.r][b.c] = b2;
}
/* ---- B4: the mirror maze. Every swap is repeated on the mirrored side, so a
      single move is really two moves and the whole plan has to account for it. ---- */
function mirrorOf(r, c) {
  const m = levelCfg && levelCfg.mirror;
  if (!m) return null;
  if (m === 'v') return [r, COLS - 1 - c];
  if (m === 'h') return [ROWS - 1 - r, c];
  if (m === 'r') return [ROWS - 1 - r, COLS - 1 - c];
  return null;
}
function mirrorPair(a, b) {
  const A = mirrorOf(a.r, a.c), B = mirrorOf(b.r, b.c);
  if (!A || !B) return null;
  const p = { r: A[0], c: A[1] }, q = { r: B[0], c: B[1] };
  if (!adjacent(p, q)) return null;
  if ((p.r === a.r && p.c === a.c) && (q.r === a.r && q.c === a.c)) return null;
  if (isWall(p.r, p.c) || isWall(q.r, q.c)) return null;
  if (isBlockedCell(p.r, p.c) || isBlockedCell(q.r, q.c)) return null;
  if (isChained(p.r, p.c) || isChained(q.r, q.c)) return null;
  if (board[p.r][p.c] < 0 && !spec[p.r][p.c]) return null;
  if (board[q.r][q.c] < 0 && !spec[q.r][q.c]) return null;
  return { a: p, b: q };
}

async function trySwap(a, b) {
  if (isBlockedCell(a.r, a.c) || isBlockedCell(b.r, b.c)) return;
  if (board[a.r][a.c] < 0 && board[b.r][b.c] < 0) return;
  if (isChained(a.r, a.c) || isChained(b.r, b.c)) {   /* shackles: no swap, no move spent */
    play('click', .35);
    restartAnim(cells[a.r][a.c], 'nudge'); restartAnim(cells[b.r][b.c], 'nudge');
    toast(T('chainLocked'));
    return;
  }
  running = true; clearHints();
  play('swap', .5);
  hop(a); hop(b);
  const mp = mirrorPair(a, b);              // the mirror maze repeats the swap
  if (mp) { hop(mp.a); hop(mp.b); await Promise.all([animSwap(a, b), animSwap(mp.a, mp.b)]); }
  else await animSwap(a, b);
  swapData(a, b);
  if (mp) swapData(mp.a, mp.b);
  render();

  const spA = spec[a.r][a.c], spB = spec[b.r][b.c];
  const hasMatch = computeRuns().length > 0;

  if (!hasMatch && !spA && !spB) {           // invalid — bounce back
    if (mp) await Promise.all([animSwap(a, b, 170), animSwap(mp.a, mp.b, 170)]);
    else await animSwap(a, b, 170);
    swapData(a, b);
    if (mp) swapData(mp.a, mp.b);
    render();
    running = false; armHint();
    return;
  }

  spendMove();
  fudgeTouched = new Set();
  moveCleared = 0; moveSpecials = 0; moveLit = 0;
  analytics.track('swap', { level });

  if (spA || spB) {                          // special triggered by swap
    let set = new Set([cellKey(a.r, a.c), cellKey(b.r, b.c)]);
    if (spA && spB) comboSpecial(a, b, set);
    set = detonate(set);                     // бомба/свирл обязаны сработать при свопе
    await clearAndFall(set, 1);
    await resolve();
  } else {
    await resolve();
  }
  bandTick();
  if (!allGoalsDone() && movesLeft > 0) await carnivalTick();
  running = false;
  checkState();
  if (!running) armHint();
}
/* the band only plays while the player keeps producing */
function bandTick() {
  const productive = lastCombo >= 2 || moveSpecials > 0 || moveCleared >= 6;
  if (productive) {
    if (bandMeter < BAND_MAX) {
      bandMeter++;
      if (bandMeter === 3) toast(T('band3'));
      if (bandMeter === BAND_MAX) toast(T('band6'));
    }
  } else if (moveCleared <= 3) bandMeter = 0;
  if (bandMeter >= BAND_MAX) { bandReward(SPECIAL.RAINBOW); bandMeter = 0; }
  else if (bandMeter === 3) bandReward(SPECIAL.SWIRL);
}

function comboSpecial(a, b, set) {           // two specials swapped => extra blast
  const A = spec[a.r][a.c], B = spec[b.r][b.c];
  const kinds = [A.kind, B.kind];
  if (kinds.includes(SPECIAL.RAINBOW)) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) set.add(cellKey(r, c));
  } else if (kinds.includes(SPECIAL.SWIRL)) {
    for (let c = 0; c < COLS; c++) set.add(cellKey(a.r, c));
    for (let r = 0; r < ROWS; r++) set.add(cellKey(r, a.c));
  } else {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const r = a.r + dr, c = a.c + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) set.add(cellKey(r, c));
    }
  }
}

function hop(a) { restartAnim(cells[a.r] && cells[a.r][a.c], 'hop'); }

function spendMove() {
  movesLeft = Math.max(0, movesLeft - 1);
  if (paradeMoves > 0) paradeMoves--;
  updateHUD();
}

/* ---------------- match logic ---------------- */
function computeRuns() {
  const runs = [];
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const t = board[r][c];
      if (t < 0 || t == null) { c++; continue; }
      let e = c; while (e + 1 < COLS && board[r][e + 1] === t) e++;
      const len = e - c + 1;
      if (len >= 3) runs.push({ cells: Array.from({ length: len }, (_, i) => [r, c + i]), len, horizontal: true, type: t });
      c = e + 1;
    }
  }
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const t = board[r][c];
      if (t < 0 || t == null) { r++; continue; }
      let e = r; while (e + 1 < ROWS && board[e + 1][c] === t) e++;
      const len = e - r + 1;
      if (len >= 3) runs.push({ cells: Array.from({ length: len }, (_, i) => [r + i, c]), len, horizontal: false, type: t });
      r = e + 1;
    }
  }
  return runs;
}

function planNewSpecials(runs) {
  /* one special per match group: L/T shapes give a BOMB, straight 4+ a SWIRL, 5+ a RAINBOW */
  const out = [], used = new Set(), merged = new Set();
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const A = runs[i], B = runs[j];
    if (A.horizontal === B.horizontal || A.type !== B.type) continue;
    const shared = A.cells.find(p => B.cells.some(q => q[0] === p[0] && q[1] === p[1]));
    if (!shared) continue;
    const distinct = new Set([...A.cells, ...B.cells].map(k => cellKey(k[0], k[1])));
    if (distinct.size > 9) continue;
    const k = cellKey(shared[0], shared[1]);
    if (used.has(k) || ice[shared[0]][shared[1]] > 0) continue;
    used.add(k); merged.add(i); merged.add(j);
    out.push({ r: shared[0], c: shared[1], kind: SPECIAL.BOMB, tile: A.type });
  }
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.len < 4 || merged.has(i)) continue;
    const center = run.cells[run.len >= 5 ? 2 : 1];
    const k = cellKey(center[0], center[1]);
    if (used.has(k) || ice[center[0]][center[1]] > 0) continue;
    used.add(k);
    out.push({ r: center[0], c: center[1], kind: run.len >= 5 ? SPECIAL.RAINBOW : SPECIAL.SWIRL, tile: run.type });
  }
  return out;
}

function specialCells(r, c, sp) {
  const out = [];
  if (sp.kind === SPECIAL.SWIRL) {
    for (let x = 0; x < COLS; x++) out.push(cellKey(r, x));
    for (let y = 0; y < ROWS; y++) out.push(cellKey(y, c));
  } else if (sp.kind === SPECIAL.BOMB) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(cellKey(nr, nc));
    }
  } else if (sp.kind === SPECIAL.RAINBOW) {
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++)
      if (board[rr][cc] === sp.tile) out.push(cellKey(rr, cc));
  }
  return out.filter(k => { const p = unKey(k); return !isWall(p[0], p[1]); });
}

/* chain-detonate every special that sits inside the cleared set */
function detonate(set) {
  const out = new Set(set), fired = new Set(), burnt = new Set(), stack = [...set];
  while (stack.length) {
    const k = stack.pop();
    const [r, c] = unKey(k);
    if (fw[r] && fw[r][c] && !burnt.has(k)) {          // a firework caught in a blast chains
      burnt.add(k);
      for (const t of fwCells(r, c)) if (!out.has(t)) { out.add(t); stack.push(t); }
    }
    const sp = spec[r] && spec[r][c];
    if (!sp || fired.has(k)) continue;
    fired.add(k);
    for (const t of specialCells(r, c, sp)) if (!out.has(t)) { out.add(t); stack.push(t); }
  }
  return out;
}

async function resolve() {
  let combo = 0;
  while (true) {
    const runs = computeRuns();
    if (!runs.length) break;
    combo++;
    lastCombo = combo;
    if (combo > bestCombo) bestCombo = combo;
    const newSp = planNewSpecials(runs);
    let set = new Set();
    for (const run of runs) for (const p of run.cells) set.add(cellKey(p[0], p[1]));
    set = detonate(set);
    for (const s of newSp) set.delete(cellKey(s.r, s.c));
    if (combo >= 4 && fever < 3 && movesLeft > 0 && running) {
      fever++; movesLeft++; play('reward', .6);
      toast('+' + 1 + ' ' + T('moves') + ' · ' + T('fever'));
      updateHUD();
    }
    const removed = await clearAndFall(set, combo, newSp);
    if (allGoalsDone()) { updateHUD(); await delay(140); return true; }
    if (!removed) break;                       // only ice was cracked — stop the loop
  }
  if (combo > 0) { updateHUD(); await delay(120); }
  return combo > 0;
}

async function clearAndFall(set, combo, newSp) {
  newSp = newSp || [];
  const keys = [...set].filter(k => { const p = unKey(k); return !isWall(p[0], p[1]); });
  if (!keys.length) return 0;

  /* caramel blobs soak up blasts instead of flying off the board, balloons pop */
  const fudgeHit = [], balloonHit = [], treatKeys = [];
  for (const k of keys) {
    const [r, c] = unKey(k);
    if (isBlk(r, c)) { if (fudgeHit.indexOf(k) < 0) fudgeHit.push(k); }
    else if (isBalloon(r, c)) { if (balloonHit.indexOf(k) < 0) balloonHit.push(k); }
    else treatKeys.push(k);
  }
  /* ice absorbs the hit: the treat survives, the frost cracks */
  const cracked = [], clearedKeys = [];
  let chainsBroken = 0;
  for (const k of treatKeys) {
    const [r, c] = unKey(k);
    if (ice[r][c] > 0 && board[r][c] >= 0 && !(spec[r] && spec[r][c])) { cracked.push([r, c]); }
    else clearedKeys.push(k);
  }
  /* frost AND caramel next to a blast also take damage — those levels stay playable */
  const seen = new Set(keys);
  for (const k of clearedKeys) {
    const [r, c] = unKey(k);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (!inBoard(nr, nc)) continue;
      const nk = cellKey(nr, nc);
      if (seen.has(nk)) continue;
      if (ice[nr][nc] > 0 && board[nr][nc] >= 0 && !(spec[nr][nc])) { seen.add(nk); cracked.push([nr, nc]); }
      else if (isBlk(nr, nc)) { seen.add(nk); fudgeHit.push(nk); }
      else if (isBalloon(nr, nc)) { seen.add(nk); balloonHit.push(nk); }
    }
  }

  /* tally objectives */
  const cleared = {};
  for (const k of clearedKeys) {
    const [r, c] = unKey(k);
    const t = board[r][c] >= 0 ? board[r][c] : (spec[r][c] ? spec[r][c].tile : -1);
    if (t >= 0) cleared[t] = (cleared[t] || 0) + 1;
    if (chain[r][c] > 0) chainsBroken += chain[r][c];
  }
  /* fireworks cleared by the match are "launched": big score + a free 3x3 chain.
     This has to happen BEFORE the tally: the objectives below read fwNow. */
  let fwNow = 0;
  for (const k of clearedKeys) {
    const [r, c] = unKey(k);
    if (!fw[r][c]) continue;
    fw[r][c] = null; fwNow++;
    ring(r, c); spLabel(r, c, 'firework');
  }
  if (fwNow) { fwLaunched += fwNow; toast(T('fwLaunch')); play('arcade', .6); }
  for (const o of objectives) {
    if (o.kind === 'collect' && cleared[o.tile]) o.got += cleared[o.tile];
    if (o.kind === 'ice') o.got += cracked.length;
    if (o.kind === 'chain') o.got += chainsBroken;
    if (o.kind === 'fudge') o.got += countFudgeBurned(fudgeHit);
    if (o.kind === 'firework') o.got += fwNow;
  }
  /* ring-toss: a treat cleared ON a peg counts as a hit */
  let pegsHit = 0;
  for (const k of clearedKeys) {
    const [r, c] = unKey(k);
    if (!tgt[r][c]) continue;
    tgt[r][c] = 0; pegsHit++;
    ring(r, c); play('arcade', .4);
  }
  if (pegsHit) {
    for (const o of objectives) if (o.kind === 'target') o.got += pegsHit;
    toast(T('targetHit').replace('%s', pegsHit));
  }
  /* the live order queue: short goals with instant rewards */
  let specialsMade = newSp.length;
  for (const o of orders) {
    if (o.done) continue;
    if (o.kind === 'collect' && cleared[o.tile]) o.got += cleared[o.tile];
    else if (o.kind === 'special') o.got += specialsMade;
    else if (o.kind === 'ice') o.got += cracked.length;
    else if (o.kind === 'chain') o.got += chainsBroken;
    else if (o.kind === 'blast') o.got += clearedKeys.length >= 5 ? 1 : 0;
    else if (o.kind === 'target') o.got += pegsHit;
    else if (o.kind === 'lit') o.got += clearedKeys.reduce((a, k) => { const q = unKey(k); return a + (isLit(q[0], q[1]) ? 1 : 0); }, 0);
    else if (o.kind === 'firework') o.got += fwNow;
    if (o.got >= o.need) completeOrder(o);
  }
  /* carnival fever meter — the spotlight doubles what it touches */
  const litKeys = clearedKeys.filter(k => { const p = unKey(k); return isLit(p[0], p[1]); });
  paradeMeter = Math.min(PARADE_NEED, paradeMeter + clearedKeys.length + cracked.length +
    chainsBroken * 2 + pegsHit * 4 + balloonHit.length * 6 + litKeys.length + fwNow * 5);

  /* score */
  const mult = paradeMoves > 0 ? 2 : 1;
  const pts = Math.round((clearedKeys.length * 14 * Math.min(combo, 4) + newSp.length * 90 +
    cracked.length * 25 + chainsBroken * 30 + fudgeHit.length * 40 +
    pegsHit * 70 + litKeys.length * 26 + fwNow * 95) * mult);
  score += pts;
  moveCleared += clearedKeys.length; moveSpecials += newSp.length;
  if (litKeys.length) { moveLit += litKeys.length; restartAnim(el('board'), 'litflash'); }
  analytics.track('match', { n: clearedKeys.length, combo, level });
  if (combo > 1) { analytics.track('combo', { n: combo, level }); showCombo(combo); play('combo', .5); }
  else play('match', .55);
  for (const s of newSp) analytics.track('special_bit', { kind: s.kind, level });

  /* fx */
  if (clearedKeys.length) { popScore(clearedKeys, pts, combo); particles(clearedKeys); }
  for (const k of clearedKeys) { const [r, c] = unKey(k); const d = cells[r][c]; if (d) d.classList.add('pop'); }
  for (const [r, c] of cracked) restartAnim(cells[r][c], 'crack');
  if (clearedKeys.length >= 6 || cracked.length >= 4) shake();
  await delay(230);
  for (const k of clearedKeys) {
    const [r, c] = unKey(k);
    const d = cells[r][c]; if (d) { d.classList.remove('pop'); }
    board[r][c] = -1; spec[r][c] = null; ice[r][c] = 0;
  }
  for (const [r, c] of cracked) {
    ice[r][c] = Math.max(0, ice[r][c] - 1);
    if (ice[r][c] === 0) play('arcade', .4);
  }
  for (const k of balloonHit) { const [r, c] = unKey(k); popBalloon(r, c); }
  for (const k of fudgeHit) {
    const [r, c] = unKey(k);
    const b = blk[r] && blk[r][c];
    if (!b) continue;
    b.hp--;
    restartAnim(cells[r][c], 'fudgehit');
    play('arcade', .35);
    if (b.hp <= 0) {
      blk[r][c] = null;
      particles([k]); ring(r, c);
      toast(T('fudgeBurned'));
    }
  }
  for (const s of newSp) {
    board[s.r][s.c] = -1; spec[s.r][s.c] = { kind: s.kind, tile: s.tile };
    ring(s.r, s.c); spLabel(s.r, s.c, s.kind); play('magic', .45);
    if (s.kind === SPECIAL.BOMB) play('arcade', .35);
  }
  /* визуальные лучи для уже сработавших спец-фигур */
  for (const k of keys) {
    const [r, c] = unKey(k);
    const sp = spec[r] && spec[r][c];
    if (!sp) continue;
    if (sp.kind === SPECIAL.SWIRL) { beam(r, c, true); beam(r, c, false); ring(r, c); }
    else if (sp.kind === SPECIAL.BOMB) { blast(r, c); ring(r, c); shake(); }
    else if (sp.kind === SPECIAL.RAINBOW) { ring(r, c); flashBoard(.5); shake(); }
  }

  applyGravity();
  render();
  updateHUD();
  await delay(280);
  return clearedKeys.length;
}

/* Gravity. Caramel blobs, balloons and holes never fall: they act as shelves, so the
   board is processed as a stack of independent segments. The ride can be TILTED, so the
   same code runs along any of the four axes — a "lane" is just a line parallel to the
   fall direction, walked from the floor inward. */
function isShelf(r, c) { return isWall(r, c) || isBlk(r, c) || isBalloon(r, c); }
function applyGravity() {
  const [dr, dc] = gravVec();
  const s = dr !== 0 ? dr : dc;                 // +1: rows/cols grow away from the floor
  const lanes = dc === 0 ? COLS : ROWS;
  const len = dc === 0 ? ROWS : COLS;
  for (let L = 0; L < lanes; L++) {
    let seg = [];
    for (let i = 0; i < len; i++) {
      const t = (s > 0) ? (len - 1 - i) : i;    // start at the floor
      const r = dc === 0 ? t : L, c = dc === 0 ? L : t;
      if (isShelf(r, c)) { fallSegment(seg, dr, dc, s); seg = []; }
      else seg.push([r, c]);
    }
    fallSegment(seg, dr, dc, s);
  }
}
function fallSegment(slots, dr, dc, s) {
  if (!slots.length) return;
  const items = [];
  for (const [r, c] of slots) if (isSolid(r, c)) items.push({ r: r, c: c, t: board[r][c], sp: spec[r][c], ic: ice[r][c], hn: chain[r][c], fw: fw[r][c] });
  for (const [r, c] of slots) { board[r][c] = -1; spec[r][c] = null; ice[r][c] = 0; chain[r][c] = 0; fw[r][c] = null; }
  let umin = Infinity;
  for (const [r, c] of slots) umin = Math.min(umin, (dc === 0 ? r : c) * s);
  let i = 0, fresh = 0;
  for (const [r, c] of slots) {
    if (i < items.length) {
      const it = items[i++];
      board[r][c] = it.t; spec[r][c] = it.sp; ice[r][c] = it.ic; chain[r][c] = it.hn; fw[r][c] = it.fw;
      if (it.r !== r || it.c !== c) setFall(r, c, (dc === 0 ? it.r - r : it.c - c), dc !== 0);
    } else {
      board[r][c] = randType(); spec[r][c] = null; ice[r][c] = 0; chain[r][c] = 0; fw[r][c] = null;
      const off = (umin - 1 - fresh - (dc === 0 ? r : c) * s) * s;
      setFall(r, c, off, dc !== 0); fresh++;
    }
  }
}
function dropIn() {
  const [dr, dc] = gravVec();
  const s = dr !== 0 ? dr : dc;
  const lanes = dc === 0 ? COLS : ROWS, len = dc === 0 ? ROWS : COLS;
  for (let L = 0; L < lanes; L++)
    for (let i = 0; i < len; i++) {
      const t = (s > 0) ? (len - 1 - i) : i;
      const r = dc === 0 ? t : L, c = dc === 0 ? L : t;
      if (isShelf(r, c)) continue;
      setTimeout(() => setFall(r, c, -(i + 2 + (L % 3)) * s, dc !== 0), (lanes - L) * 26);
    }
}
function setFall(r, c, off, horiz) {
  const d = cells[r] && cells[r][c]; if (!d) return;
  d.style.setProperty(horiz ? '--fallx' : '--fall', (off * TILE) + 'px');
  restartAnim(d, horiz ? 'falling-x' : 'falling');
  setTimeout(() => d.classList.remove(horiz ? 'falling-x' : 'falling'), 320);
}

/* ---------------- deadlock & hint ---------------- */
/* one logical move = the swap plus its mirror image */
function swapBoth(a, b) {
  swapData(a, b);
  const mp = mirrorPair(a, b);
  if (mp) swapData(mp.a, mp.b);
}
function anyMove() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= ROWS || nc >= COLS) continue;
      if (isBlockedCell(r, c) || isBlockedCell(nr, nc)) continue;
      if (spec[r][c] || spec[nr][nc]) return true;
      if (isChained(r, c) || isChained(nr, nc)) continue;
      swapBoth({ r, c }, { r: nr, c: nc });
      const ok = computeRuns().length > 0;
      swapBoth({ r, c }, { r: nr, c: nc });
      if (ok) return true;
    }
  }
  return false;
}
function findHintMove() {
  let best = null;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= ROWS || nc >= COLS) continue;
      if (isBlockedCell(r, c) || isBlockedCell(nr, nc)) continue;
      if (isChained(r, c) || isChained(nr, nc)) continue;
      swapBoth({ r, c }, { r: nr, c: nc });
      const runs = computeRuns();
      swapBoth({ r, c }, { r: nr, c: nc });
      if (runs.length) {
        const mx = Math.max(...runs.map(x => x.len));
        if (!best || mx > best.len) best = { a: { r, c }, b: { r: nr, c: nc }, len: mx };
        if (mx >= 4) return best;
      }
    }
  }
  return best;
}
function showHint() {
  const m = findHintMove(); if (!m) return;
  clearHints();
  if (cells[m.a.r][m.a.c]) cells[m.a.r][m.a.c].classList.add('hint');
  if (cells[m.b.r][m.b.c]) cells[m.b.r][m.b.c].classList.add('hint');
  play('click', .35);
  setTimeout(clearHints, 2600);
}
/* Re-deal the treats WITHOUT touching frost or special pieces: wiping the ice
   would silently make an ice goal impossible to finish. */
function reshuffleTypes() {
  for (let tries = 0; tries < 40; tries++) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (isBlockedCell(r, c) || spec[r][c]) continue;
      board[r][c] = randType();
    }
    if (!computeRuns().length && anyMove()) break;
  }
  if (!anyMove()) forceMove();
}
/* Last resort: plant a near-match (X X . / . . X) so the player always has one swap.
   Only touches free, unfrozen, unchained cells, and never plants a ready-made run. */
function forceMove() {
  for (let tries = 0; tries < 80; tries++) {
    const r = (Math.random() * (ROWS - 1)) | 0, c = (Math.random() * (COLS - 2)) | 0;
    if (c + 2 >= COLS) continue;
    const spots = [[r, c], [r, c + 1], [r, c + 2], [r + 1, c + 2]];
    let ok = true;
    for (const p of spots) {
      if (!inBoard(p[0], p[1]) || isWall(p[0], p[1]) || isBlockedCell(p[0], p[1]) ||
          (ice[p[0]][p[1]] | 0) > 0 || (chain[p[0]][p[1]] | 0) > 0 || spec[p[0]][p[1]]) { ok = false; break; }
    }
    if (!ok) continue;
    const t = randType();
    let u = randType(), g = 0;
    while (u === t && g++ < 20) u = randType();
    const keep = spots.map(p => board[p[0]][p[1]]);
    board[r][c] = t; board[r][c + 1] = t; board[r][c + 2] = u; board[r + 1][c + 2] = t;
    if (computeRuns().length || !anyMove()) {
      spots.forEach((p, i) => { board[p[0]][p[1]] = keep[i]; });
      continue;
    }
    return true;
  }
  return false;
}
async function ensurePlayable() {
  if (anyMove()) return;
  /* the carnival tick (belts / carousel / tilt / caramel) can wipe out the only
     move a moment after resolve(), so the re-deal loops until the board is live */
  for (let k = 0; k < 8 && !anyMove(); k++) reshuffleTypes();
  toast(T('noMoves'));
  play('shuffle', .6);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (isWall(r, c)) continue; const d = cells[r][c]; d.classList.add('pop'); }
  await delay(240);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells[r][c].classList.remove('pop');
  reshuffleTypes();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!isWall(r, c)) setFall(r, c, 1 + (r % 3));
  render();
  await delay(320);
}

/* ---------------- fx helpers ---------------- */
function popScore(keys, pts, combo) {
  const b = el('board'); if (!b) return;
  const g = keys.map(unKey).reduce((a, p) => [Math.min(a[0], p[0]), Math.max(a[1], p[1]), Math.min(a[2], p[2]), Math.max(a[3], p[3])], [99, -1, 99, -1]);
  const d = document.createElement('div');
  d.className = 'popfx';
  d.textContent = '+' + pts + (combo > 1 ? '  ×' + combo : '');
  const w = COLS * TILE;
  d.style.left = Math.max(TILE * .9, Math.min(w - TILE * .9, (((g[2] + g[3]) / 2) + 0.5) * TILE)) + 'px';
  d.style.top = Math.max(TILE * .7, (((g[0] + g[1]) / 2) + 0.5) * TILE) + 'px';
  b.appendChild(d); setTimeout(() => d.remove(), 800);
}
const PCOLORS = ['#ffd76a', '#ff5ea7', '#3fd68a', '#6ee7ff', '#b197ff', '#ff8a3d'];
function particles(keys) {
  const b = el('board'); if (!b) return;
  const per = keys.length > 16 ? 2 : keys.length > 8 ? 3 : 5;   // keep the DOM light on big clears
  let budget = 64;
  for (const k of keys) {
    const [r, c] = unKey(k);
    const cx = (c + .5) * TILE, cy = (r + .5) * TILE;
    for (let i = 0; i < per && budget > 0; i++) { budget--;
      const p = document.createElement('div'); p.className = 'particle';
      const ang = Math.random() * Math.PI * 2, dist = 22 + Math.random() * 40;
      p.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px');
      p.style.background = PCOLORS[(Math.random() * PCOLORS.length) | 0];
      p.style.left = cx + 'px'; p.style.top = cy + 'px';
      b.appendChild(p); setTimeout(() => p.remove(), 760);
    }
  }
}
function blast(r, c) {                       /* bomb: 3x3 shockwave + flash */
  const b = el('board'); if (!b) return;
  const d = document.createElement('div'); d.className = 'blastfx';
  d.style.left = ((c - 1) * TILE) + 'px'; d.style.top = ((r - 1) * TILE) + 'px';
  d.style.width = (TILE * 3) + 'px'; d.style.height = (TILE * 3) + 'px';
  b.appendChild(d); setTimeout(() => d.remove(), 620);
}
function flashBoard(alpha) {
  const b = el('board'); if (!b) return;
  const d = document.createElement('div'); d.className = 'flashfx';
  d.style.setProperty('--fa', String(alpha == null ? .55 : alpha));
  b.appendChild(d); setTimeout(() => d.remove(), 460);
}
function spLabel(r, c, kind) {
  const b = el('board'); if (!b) return;
  const d = document.createElement('div'); d.className = 'sp-label';
  d.textContent = kind === SPECIAL.BOMB ? T('bombWord') : kind === SPECIAL.SWIRL ? T('swirlWord') :
    kind === 'firework' ? T('fwWord') : T('rainbowWord');
  d.style.left = Math.max(TILE, Math.min(COLS * TILE - TILE, (c + .5) * TILE)) + 'px';
  d.style.top = Math.max(TILE * .8, (r + .5) * TILE) + 'px';
  b.appendChild(d); setTimeout(() => d.remove(), 900);
}
function ring(r, c) {
  const b = el('board'); if (!b) return;
  const d = document.createElement('div'); d.className = 'ringfx';
  d.style.left = (c * TILE) + 'px'; d.style.top = (r * TILE) + 'px';
  d.style.width = TILE + 'px'; d.style.height = TILE + 'px';
  b.appendChild(d); setTimeout(() => d.remove(), 520);
}
function beam(r, c, horiz) {
  const b = el('board'); if (!b) return;
  const d = document.createElement('div'); d.className = 'beam';
  if (horiz) { d.style.left = '0'; d.style.top = ((r + .5) * TILE - 3) + 'px'; d.style.width = (COLS * TILE) + 'px'; d.style.height = '6px'; }
  else { d.style.top = '0'; d.style.left = ((c + .5) * TILE - 3) + 'px'; d.style.width = '6px'; d.style.height = (ROWS * TILE) + 'px';
    d.style.background = 'linear-gradient(180deg,transparent,rgba(255,255,255,.75),transparent)'; }
  b.appendChild(d); setTimeout(() => d.remove(), 460);
}
function shake() { restartAnim(el('board'), 'board-shake'); }
function comboWord(n) {
  if (n >= 6) return T('carnival');
  if (n >= 4) return T('amazing');
  if (n >= 3) return T('great');
  return T('good');
}
function showCombo(n, word) {
  const c = el('combo'); if (!c) return;
  c.textContent = word || (comboWord(n) + '  ' + n + '×');
  restartAnim(c, 'show');
}
function toast(msg) {
  const t = el('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1900);
}
function confetti(host) {
  const box = host || document.body;
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = (Math.random() * 100) + '%';
    c.style.animationDelay = (Math.random() * .5) + 's';
    const s = 6 + ((Math.random() * 8) | 0);
    c.style.width = s + 'px'; c.style.height = s + 'px';
    if (Math.random() > .5) c.style.borderRadius = '50%';
    c.style.background = PCOLORS[(Math.random() * PCOLORS.length) | 0];
    box.appendChild(c); setTimeout(() => c.remove(), 3000);
  }
}
function flyTickets(n) {
  const chip = document.querySelector('.chip-coin'); if (!chip) return;
  const to = chip.getBoundingClientRect();
  const from = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  for (let i = 0; i < Math.min(n || 1, 6); i++) {
    const d = document.createElement('div'); d.className = 'fly';
    const fx = to.left + to.width / 2 - from.x + (Math.random() * 20 - 10);
    const fy = to.top + to.height / 2 - from.y + (Math.random() * 20 - 10);
    d.style.left = (from.x + (Math.random() * 90 - 45)) + 'px';
    d.style.top = (from.y + (Math.random() * 60 - 30)) + 'px';
    d.style.setProperty('--fx', fx + 'px');
    d.style.setProperty('--fy', fy + 'px');
    d.style.animationDelay = (i * 0.11) + 's';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1600);
  }
}

/* ---------------- HUD ---------------- */
function starSvg(on) {
  /* gradients live once in index.html (#stara / #starb) — cheap for 200-cell maps */
  return '<svg viewBox="0 0 24 24" class="' + (on ? 'on' : 'off') + '">' +
    '<path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45L2.6 9.45l6.5-.95Z" ' +
    'fill="url(#star' + (on ? 'a' : 'b') + ')" stroke="' + (on ? '#a06a10' : '#6b5a8a') + '" stroke-width="1"/></svg>';
}
const starDot = on => '<i class="st' + (on ? ' on' : '') + '"></i>';
const ICE_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="6" fill="rgba(160,220,255,.75)" stroke="#eaf6ff" stroke-width="1.6"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="1.6" opacity=".85"/></svg>';
const TILT_LEV_SVG = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 3v13M12 3l-4 4M12 3l4 4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20h16" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>';
const SPOT_LEV_SVG = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2.5l3.4 7.6 7.6 3.4-7.6 3.4L12 24.5l-3.4-7.6L1 13.5l7.6-3.4z" fill="currentColor" opacity=".9"/><circle cx="12" cy="13.5" r="3.2" fill="#2a1745"/></svg>';
const RIDE_LEV_SVG = '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3.4v17.2M3.4 12h17.2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>';
const MIX_LEV_SVG = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h4.5l8 10H21M4 17h4.5l2.2-2.8M14.6 9.1 16.5 7H21" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.6 4.4 21.4 7l-2.8 2.6" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/></svg>';
const LEV_SVG = { tilt: TILT_LEV_SVG, spot: SPOT_LEV_SVG, ride: RIDE_LEV_SVG, mix: MIX_LEV_SVG };
const CHAIN_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><g fill="none" stroke="#d9c9f5" stroke-width="2.6" stroke-linecap="round"><ellipse cx="8" cy="8" rx="4.2" ry="3.2" transform="rotate(-40 8 8)"/><ellipse cx="12.4" cy="12.2" rx="4.2" ry="3.2" transform="rotate(-40 12.4 12.2)"/><ellipse cx="16.8" cy="16.4" rx="4.2" ry="3.2" transform="rotate(-40 16.8 16.4)"/></g></svg>';
const SPOT_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2.5l3.4 7.6 7.6 3.4-7.6 3.4L12 24.5l-3.4-7.6L1 13.5l7.6-3.4z" fill="#ffd76a" opacity=".9"/><circle cx="12" cy="13.5" r="3.4" fill="#fff"/></svg>';
const TARGET_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="9" r="7" fill="none" stroke="#ff9a3c" stroke-width="2.6"/><circle cx="12" cy="9" r="3" fill="#ffd76a"/><path d="M12 16v5.4" stroke="#c9b8e8" stroke-width="2.4" stroke-linecap="round"/></svg>';
const BALLOON_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><ellipse cx="10" cy="8.6" rx="5.6" ry="6.6" fill="#ff5ea7" stroke="#ffd0e4" stroke-width="1.4"/><ellipse cx="8" cy="6.4" rx="1.7" ry="2.2" fill="#fff" opacity=".75"/><path d="M10 15.2l-1.2 2.2h2.4z" fill="#ff5ea7"/><path d="M10 17.4c1.6 1.4-1.6 2.4 0 4" stroke="#c9b8e8" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
const FW_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 21c-3.4 0-6.2-2.6-6.2-6.2S8.6 6 12 6s6.2 5.2 6.2 8.8S15.4 21 12 21Z" fill="#ff9a3c" stroke="#ffd76a" stroke-width="1.5"/><path d="M12 6V3.4" stroke="#7ef0a0" stroke-width="1.8" stroke-linecap="round"/><g fill="#ffd76a"><circle cx="4.4" cy="4.6" r="1.5"/><circle cx="19.6" cy="4.6" r="1.5"/><circle cx="12" cy="1.6" r="1.4"/></g></svg>';
const BELT_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><rect x="2.5" y="8" width="19" height="8.4" rx="4.2" fill="#6ee7ff" stroke="#0b3f66" stroke-width="1.4"/><g fill="#0b3f66"><circle cx="6.5" cy="12.2" r="1.7"/><circle cx="12" cy="12.2" r="1.7"/><circle cx="17.5" cy="12.2" r="1.7"/></g><path d="M9 4.4l3 3 3-3" fill="none" stroke="#ffd76a" stroke-width="2.2" stroke-linecap="round"/></svg>';
const FUDGE_SVG = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 10c0-3.4 3.6-5.6 8-5.6s8 2.2 8 5.6v6.4c0 1.6-1.2 2.8-2.8 2.8H6.8C5.2 19.2 4 18 4 16.4V10Z" fill="#8a4a1e" stroke="#ffd76a" stroke-width="1.5"/><path d="M4 11h16" stroke="#ffd76a" stroke-width="1.4" opacity=".8"/><path d="M8 14.4h8" stroke="#ff9a3c" stroke-width="1.6" stroke-linecap="round"/></svg>';

function goalProgress() {
  if (!objectives.length) return 0;
  let sum = 0;
  for (const o of objectives) {
    sum += o.kind === 'score' ? Math.min(1, (o.got || score) / o.goal) : Math.min(1, o.got / o.need);
  }
  return sum / objectives.length;
}
function allGoalsDone() {
  return objectives.length > 0 && objectives.every(o =>
    o.kind === 'score' ? score >= o.goal : o.got >= o.need);
}
function goalLabel(o) {
  if (o.kind === 'score') return T('score') + ' ' + score + ' / ' + o.goal;
  if (o.kind === 'ice') return T('iceGoal') + ' ' + o.got + ' / ' + o.need;
  if (o.kind === 'chain') return T('chainGoal') + ' ' + o.got + ' / ' + o.need;
  if (o.kind === 'fudge') return T('fudgeGoal') + ' ' + o.got + ' / ' + o.need;
  if (o.kind === 'target') return T('targetGoal') + ' ' + o.got + ' / ' + o.need;
  if (o.kind === 'balloon') return T('balloonGoal') + ' ' + o.got + ' / ' + o.need;
  if (o.kind === 'firework') return T('fwGoal') + ' ' + o.got + ' / ' + o.need;
  if (o.kind === 'belt') return T('beltGoal') + ' ' + o.got + ' / ' + o.need;
  return T('collect') + ' ' + o.got + ' / ' + o.need;
}
function goalIcon(o) {
  if (o.kind === 'score') return '';
  if (o.kind === 'ice') return ICE_SVG;
  if (o.kind === 'chain') return CHAIN_SVG;
  if (o.kind === 'fudge') return FUDGE_SVG;
  if (o.kind === 'target') return TARGET_SVG;
  if (o.kind === 'balloon') return BALLOON_SVG;
  if (o.kind === 'firework') return FW_SVG;
  if (o.kind === 'belt') return BELT_SVG;
  return '<img class="objicon" src="' + tileFor(o.tile) + '" alt=""/>';
}

function updateHUD() {
  try {
    if (el('lvl')) el('lvl').textContent = level;
    if (el('score')) el('score').textContent = score;
    if (el('coins')) el('coins').textContent = coins;
    if (el('shopcoins')) el('shopcoins').textContent = coins;
    if (el('movesleft')) el('movesleft').textContent = movesLeft;
    const mb = el('movesbox'); if (mb) mb.classList.toggle('low', movesLeft <= 4);

    const pf = el('progfill'); if (pf) pf.style.width = (goalProgress() * 100) + '%';

    /* goal chips (1–2 objectives) */
    const box = el('goals');
    if (box) {
      const sig = objectives.map(o => o.kind + ':' + (o.tile || '') + ':' + o.need).join('|');
      if (box.dataset.sig !== sig) {
        box.dataset.sig = sig;
        box.innerHTML = objectives.map((o, i) =>
          '<div class="hud-goal' + (o.kind === 'ice' ? ' ice-goal' : '') + '" data-i="' + i + '">' +
          goalIcon(o) + '<span class="g-txt"></span></div>').join('');
      }
      objectives.forEach((o, i) => {
        const chip = box.querySelector('[data-i="' + i + '"]');
        if (!chip) return;
        const t = chip.querySelector('.g-txt'); if (t) t.textContent = goalLabel(o);
        chip.classList.toggle('done', o.kind === 'score' ? score >= o.goal : o.got >= o.need);
      });
    }

    /* carnival fever meter — full means the player may call the parade */
    const pbox = el('paradebox');
    if (pbox) {
      pbox.classList.toggle('hidden', paradeMoves <= 0 && paradeMeter <= 0);
      pbox.classList.toggle('ready', paradeMeter >= PARADE_NEED && paradeMoves <= 0);
      const pf2 = el('paradefill');
      if (pf2) pf2.style.width = Math.min(100, (paradeMeter / PARADE_NEED) * 100) + '%';
      pbox.classList.toggle('hot', paradeMoves > 0);
      const pl = el('paradelabel');
      if (pl) pl.textContent = paradeMoves > 0 ? T('paradeOn').replace('%s', paradeMoves)
        : (paradeMeter >= PARADE_NEED ? T('paradeReady') : T('paradeWord'));
    }
    /* the carnival band: six pips, three = free swirl, six = free rainbow */
    const bb = el('bandbox');
    if (bb) {
      bb.classList.toggle('hidden', bandMeter <= 0 && !(levelCfg && levelCfg.orders));
      const sig = String(bandMeter);
      if (bb.dataset.sig !== sig) {
        bb.dataset.sig = sig;
        bb.innerHTML = '<span class="band-k">' + T('bandWord') + '</span>' +
          Array.from({ length: BAND_MAX }, (_, i) => '<i class="bp' + (i < bandMeter ? ' on' : '') + '"></i>').join('');
      }
    }
    /* the tilted ride: which way treats fall, and how soon it turns */
    const tb = el('tiltbox');
    if (tb) {
      const every = levelCfg ? (levelCfg.tiltEvery | 0) : 0;
      tb.classList.toggle('hidden', !every);
      if (every) {
        const due = tiltDue();
        const sig = gravDir + ':' + due;
        if (tb.dataset.sig !== sig) {
          tb.dataset.sig = sig;
          tb.innerHTML = '<span class="tilt-ic d' + gravDir + '"></span><b>' + T('tilt' + gravDir) + '</b>' +
            (due === 1 ? '<i class="tilt-soon">' + T('tiltSoon') + '</i>' : '');
        }
        tb.classList.toggle('soon', due === 1);
      }
    }
    /* B2 + B5: the control panel (free levers) and the trick stall (moves -> specials) */
    const gb = el('gadgets');
    if (gb) {
      const sig = levers.map(l => 'L' + l.kind + (l.used ? 'x' : '')).join(',') + '|' +
        (tricks ? Object.keys(tricks).map(k => 'T' + k + ':' + tricks[k] + ':' + (trickMode === k ? '*' : '') + (movesLeft <= tricks[k] ? 'x' : '')).join(',') : '') +
        '|' + lang;
      if (gb.dataset.sig !== sig) {
        gb.dataset.sig = sig;
        let html = '';
        if (levers.length) {
          html += '<span class="gad-k">' + T('leverWord') + '</span>';
          html += levers.map((l, i) => '<button type="button" class="lev' + (l.used ? ' used' : '') +
            '" data-lev="' + i + '" title="' + leverLabel(l.kind) + '">' + LEV_SVG[l.kind] +
            '<b>' + leverLabel(l.kind) + '</b></button>').join('');
        }
        if (tricks) {
          html += '<span class="gad-k">' + T('trickWord') + '</span>';
          html += ['swirl', 'bomb', 'rainbow'].map(k => {
            const poor = movesLeft <= tricks[k];
            return '<button type="button" class="trk' + (trickMode === k ? ' on' : '') + (poor ? ' poor' : '') +
              '" data-trick="' + k + '"><i>' + BADGE[k] + '</i><b>' + tricks[k] + '</b></button>';
          }).join('');
        }
        gb.innerHTML = html;
      }
      gb.classList.toggle('hidden', !levers.length && !tricks);
    }
    /* live order queue */
    const ob = el('orders');
    if (ob) {
      ob.classList.toggle('hidden', !orders.length);
      const sig = orders.map(o => o.kind + ':' + (o.tile | 0) + ':' + o.need + ':' + (o.done ? 1 : 0) + ':' + o.got).join('|');
      if (ob.dataset.sig !== sig) {
        ob.dataset.sig = sig;
        ob.innerHTML = orders.map((o, i) =>
          '<div class="ord' + (o.done ? ' done' : '') + '" data-i="' + i + '">' + orderIcon(o) +
          '<span>' + orderLabel(o) + '</span><b class="ord-r">' + rewardLabel(o.reward) + '</b></div>').join('');
      }
    }
    /* stars preview for the current level */
    const sr = el('starrow');
    if (sr) {
      const got = starsByLevel[level] || 0;
      sr.innerHTML = [1, 2, 3].map(i => starSvg(i <= got)).join('');
    }
    /* boosters: inventory count + affordability */
    for (const id in BOOST) {
      const b = el('b-' + id);
      if (!b) continue;
      const q = inventory[id] | 0;
      const qb = el('q-' + id);
      if (qb) { qb.textContent = q; qb.classList.toggle('zero', q <= 0); }
      const cost = b.querySelector('.cost');
      if (cost) cost.style.display = q > 0 ? 'none' : '';
      b.classList.remove('poor');
      b.title = T(BOOST[id].label) + (q > 0 ? ' ×' + q : ' — ' + BOOST[id].cost);
    }
  } catch (e) { console.warn('updateHUD', e); }
}

/* ---------------- levels ---------------- */
/* 20 chapters x 10 levels. Each chapter teaches / mixes one new twist,
   so the game never repeats the same level twice in a row. */
const CHAPTERS = [
  { ru: 'Открытие карнавала', en: 'Carnival Opening',  tag: 'score' },
  { ru: 'Сладкий заказ',      en: 'Sweet Orders',      tag: 'collect' },
  { ru: 'Ледяная витрина',    en: 'Frosty Window',     tag: 'ice' },
  { ru: 'Двойной заказ',      en: 'Double Order',      tag: 'collect2' },
  { ru: 'Аттракцион',         en: 'The Rides',         tag: 'shape' },
  { ru: 'Ледяной шторм',      en: 'Ice Storm',         tag: 'ice' },
  { ru: 'Большой шатёр',      en: 'The Big Top',       tag: 'big' },
  { ru: 'Тесная будка',       en: 'Tiny Booth',        tag: 'narrow' },
  { ru: 'Зеркальный лабиринт',en: 'Mirror Maze',       tag: 'shape' },
  { ru: 'Вечерний парад',     en: 'Evening Parade',    tag: 'mixed' },
  { ru: 'Морозный базар',     en: 'Frost Market',      tag: 'ice' },
  { ru: 'Желейный тупик',     en: 'Jelly Passage',     tag: 'shape' },
  { ru: 'Карусель',           en: 'Carousel',          tag: 'six' },
  { ru: 'Двойная радуга',     en: 'Double Rainbow',    tag: 'collect2' },
  { ru: 'Ледяной дворец',      en: 'Ice Palace',      tag: 'ice' },
  { ru: 'Ночной фейерверк',   en: 'Night Fireworks',   tag: 'score' },
  { ru: 'Тайный проход',      en: 'Secret Passage',    tag: 'shape' },
  { ru: 'Сладкий марафон',    en: 'Candy Marathon',    tag: 'mixed' },
  { ru: 'Финальный шатёр',    en: 'Final Big Top',     tag: 'mixed' },
  { ru: 'Большой карнавал',   en: 'The Grand Carnival',tag: 'mixed' }
];
const chapterOf = n => Math.max(0, Math.min(CHAPTERS.length - 1, (((n | 0) - 1) / 10) | 0));
function chapterName(n) { const c = CHAPTERS[chapterOf(n)]; return lang === 'ru' ? c.ru : c.en; }
/* What a chapter is KNOWN for: the mechanic that shows up in it most often. The map
   then tells the player which ride they are walking into before they tap it. */
let CH_SIG = {};
function chapterSignature(ch) {
  if (CH_SIG[ch]) return CH_SIG[ch];
  const tally = {};
  const add = (k, w) => { tally[k] = (tally[k] | 0) + w; };
  for (let n = ch * 10 + 1; n <= ch * 10 + 10 && n <= totalLevels(); n++) {
    const c = getLevelCfg(n); if (!c) continue;
    if (c.mirror) add('Mirror', 3);
    if ((c.firework | 0) > 0) add('Fw', 3);
    if ((c.belts | 0) > 0) add('Belts', 3);
    if (c.console) add('Console', 3);
    if (c.tricks) add('Tricks', 3);
    if (c.spotlight) add('Spot', 2);
    if (c.carousel) add('Carousel', 2);
    if ((c.tiltEvery | 0) > 0) add('Tilt', 2);
    if (c.orders) add('Orders', 1);
    if ((c.balloonCount | 0) > 0) add('Balloon', 1);
    if ((c.targetCount | 0) > 0) add('Target', 1);
    if ((c.chainCount | 0) > 0) add('Chain', 1);
    if ((c.fudgeCount | 0) > 0) add('Fudge', 1);
    if ((c.iceCount | 0) > 0) add('Ice', 1);
  }
  let bestK = '', bestV = 0;
  for (const k in tally) if (tally[k] > bestV) { bestV = tally[k]; bestK = k; }
  CH_SIG[ch] = bestK;
  return bestK;
}
const isFinale = n => (n | 0) % 10 === 0;

function proceduralLevel(lvl) {
  lvl = Math.max(1, lvl | 0);
  const types = Math.min(6, 4 + Math.floor((lvl - 1) / 10));
  const moves = Math.min(34, 17 + Math.floor((lvl - 1) * 0.35));
  const k = (lvl - 1) % 4;
  if (k === 0) return { id: lvl, cols: 8, rows: 8, types, objective: 'score', scoreGoal: 1200 + (lvl - 1) * 650, moves };
  if (k === 1) return { id: lvl, cols: 8, rows: 8, types, objective: 'collect', collectTile: (lvl * 3) % types, collectNeed: Math.min(50, 12 + lvl), moves };
  if (k === 2) return { id: lvl, cols: 8, rows: 8, types, objective: 'ice', iceCount: Math.min(24, 6 + Math.floor(lvl / 2)), moves: moves + 3 };
  return { id: lvl, cols: 8, rows: 8, types, objective: 'collect2',
    collectTile: (lvl * 2) % types, collectTile2: ((lvl * 2) + 1) % types,
    collectNeed: Math.min(30, 8 + Math.floor(lvl / 2)), collectNeed2: Math.min(30, 8 + Math.floor(lvl / 2)), moves: moves + 2 };
}
const PROCEDURAL = Array.from({ length: 200 }, (_, i) => proceduralLevel(i + 1));
function getLevelCfg(n) { return (n >= 1 && n <= LEVELS.length) ? LEVELS[n - 1] : PROCEDURAL[n - 1]; }
function totalLevels() { return Math.max(LEVELS.length, PROCEDURAL.length, 200); }

function getAdaptiveCfg(cfg) {
  const c = Object.assign({}, cfg);
  if (lossStreak >= 2) {
    if (c.scoreGoal) c.scoreGoal = Math.max(700, c.scoreGoal - 250 * (lossStreak - 1));
    c.moves += 2 * (lossStreak - 1);
    if (c.collectNeed) c.collectNeed = Math.max(6, c.collectNeed - 2 * (lossStreak - 1));
    if (c.collectNeed2) c.collectNeed2 = Math.max(6, c.collectNeed2 - 2 * (lossStreak - 1));
    if (c.iceCount) c.iceCount = Math.max(4, c.iceCount - 2 * (lossStreak - 1));
    if (c.chainCount) c.chainCount = Math.max(2, c.chainCount - 2 * (lossStreak - 1));
    if (c.fudgeCount) c.fudgeCount = Math.max(2, c.fudgeCount - (lossStreak - 1));
    if (c.balloonCount) c.balloonCount = Math.max(2, c.balloonCount - (lossStreak - 1));
    if (c.targetCount) c.targetCount = Math.max(3, c.targetCount - 2 * (lossStreak - 1));
    if (c.firework) c.firework = Math.max(2, c.firework - (lossStreak - 1));
    if (c.belts) c.belts = Math.max(3, c.belts - 2 * (lossStreak - 1));
  } else if (winStreak >= 5) {
    if (c.scoreGoal) c.scoreGoal += 200 * (winStreak - 4);
    if (c.collectNeed) c.collectNeed += 3 * (winStreak - 4);
    if (c.collectNeed2) c.collectNeed2 += 3 * (winStreak - 4);
  }
  if (Array.isArray(c.goals)) {
    const soft = lossStreak >= 2 ? -(lossStreak - 1) : (winStreak >= 5 ? (winStreak - 4) : 0);
    if (soft) c.goals = c.goals.map(g => {
      if (g.kind === 'score') return { kind: 'score', goal: Math.max(500, (g.goal | 0) + soft * 220) };
      if (g.kind === 'ice') return { kind: 'ice', tile: g.tile, count: Math.max(3, (g.count | 0) + soft * 2) };
      if (g.kind === 'chain') return { kind: 'chain', count: Math.max(2, (g.count | 0) + soft * 2) };
      if (g.kind === 'target') return { kind: 'target', count: Math.max(2, (g.count | 0) + soft * 2) };
      if (g.kind === 'balloon') return { kind: 'balloon', count: Math.max(2, (g.count | 0) + soft) };
      if (g.kind === 'fudge') return { kind: 'fudge', count: Math.max(2, (g.count | 0) + soft) };
      if (g.kind === 'firework') return { kind: 'firework', count: Math.max(1, (g.count | 0) + soft) };
      if (g.kind === 'belt') return { kind: 'belt', count: Math.max(4, (g.count | 0) + soft * 2) };
      return { kind: 'collect', tile: g.tile, need: Math.max(4, (g.need | 0) + soft * 3) };
    });
  }
  /* the daily ride re-rigs the level the player is on (tutorial levels stay plain) */
  if (dailyMode && level > 8) dailyRide().apply(c);
  return c;
}

function playableCells() {
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!isWall(r, c)) n++;
  return n;
}

/* Board geometry follows the screen: landscape gets a wide short board,
   a tall phone gets extra rows instead of a strip of dead space under the board. */
function boardShape(cfg) {
  const w = window.innerWidth, h = window.innerHeight;
  const cols = Math.max(7, Math.min(9, cfg.cols || 8));
  const rows = Math.max(7, Math.min(9, cfg.rows || 8));
  if (w / h > 1.15) return { cols: Math.max(cols, 9), rows: 7 };
  if (h / w > 1.3) {
    const availW = Math.max(200, w - (w > 430 ? 24 : 12) - FRAME_PAD * 2);
    const availH = Math.max(200, h - 215 - FRAME_PAD * 2);
    const tile = Math.floor(availW / cols);
    const fit = Math.max(rows, Math.floor(availH / Math.max(24, tile)));
    return { cols: cols, rows: Math.max(7, Math.min(10, Math.min(fit, rows + 2))) };
  }
  return { cols: cols, rows: rows };
}

function buildObjectives(cfg) {
  const out = [];
  if (Array.isArray(cfg.goals) && cfg.goals.length) {
    for (const g of cfg.goals) {
      if (g.kind === 'score') out.push({ kind: 'score', goal: g.goal | 0, got: 0 });
      else if (g.kind === 'ice') out.push({ kind: 'ice', need: Math.max(1, g.count | 0), got: 0 });
      else if (g.kind === 'chain') out.push({ kind: 'chain', need: Math.max(1, g.count | 0), got: 0 });
      else if (g.kind === 'fudge') out.push({ kind: 'fudge', need: Math.max(1, g.count | 0), got: 0 });
      else if (g.kind === 'target') out.push({ kind: 'target', need: Math.max(1, g.count | 0), got: 0 });
      else if (g.kind === 'balloon') out.push({ kind: 'balloon', need: Math.max(1, g.count | 0), got: 0 });
      else if (g.kind === 'firework') out.push({ kind: 'firework', need: Math.max(1, g.count | 0), got: 0 });
      else if (g.kind === 'belt') out.push({ kind: 'belt', need: Math.max(1, g.count | 0), got: 0 });
      else out.push({ kind: 'collect', tile: (g.tile | 0) % NUM_TYPES, need: Math.max(1, g.need | 0), got: 0 });
    }
    return out;
  }
  if (cfg.objective === 'target') {
    out.push({ kind: 'target', need: cfg.targetCount || 6, got: 0 });
  } else if (cfg.objective === 'balloon') {
    out.push({ kind: 'balloon', need: cfg.balloonCount || 5, got: 0 });
  } else if (cfg.objective === 'firework') {
    out.push({ kind: 'firework', need: cfg.firework || 4, got: 0 });
  } else if (cfg.objective === 'belt') {
    out.push({ kind: 'belt', need: cfg.beltGoal || 12, got: 0 });
  } else if (cfg.objective === 'collect') {
    out.push({ kind: 'collect', tile: (cfg.collectTile | 0) % NUM_TYPES, need: cfg.collectNeed || 10, got: 0 });
  } else if (cfg.objective === 'collect2') {
    const a = (cfg.collectTile | 0) % NUM_TYPES;
    let b = (cfg.collectTile2 != null ? cfg.collectTile2 | 0 : a + 1) % NUM_TYPES;
    if (b === a) b = (b + 1) % NUM_TYPES;
    out.push({ kind: 'collect', tile: a, need: cfg.collectNeed || 10, got: 0 });
    out.push({ kind: 'collect', tile: b, need: cfg.collectNeed2 || cfg.collectNeed || 10, got: 0 });
  } else if (cfg.objective === 'ice') {
    out.push({ kind: 'ice', need: cfg.iceCount || 8, got: 0 });
  } else if (cfg.objective === 'chain') {
    out.push({ kind: 'chain', need: cfg.chainCount || 6, got: 0 });
  } else if (cfg.objective === 'fudge') {
    out.push({ kind: 'fudge', need: cfg.fudgeCount || 4, got: 0 });
  } else {
    out.push({ kind: 'score', goal: cfg.scoreGoal || 1000, got: 0 });
  }
  return out;
}

function iceCandidates(pattern) {
  const out = [];
  const mr = (ROWS / 2) | 0, mc = (COLS / 2) | 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isWall(r, c) || openness(wall, ROWS, COLS, r, c) < 3) continue;
    let ok = true;
    if (pattern === 'border') ok = (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1);
    else if (pattern === 'band') ok = (r >= mr - 1 && r <= mr + 1);
    else if (pattern === 'plus') ok = (r === mr || c === mc);
    else if (pattern === 'checker') ok = ((r + c) % 2) === 0;
    else if (pattern === 'corners') ok = (r < 2 || r > ROWS - 3) && (c < 2 || c > COLS - 3);
    else if (pattern === 'columns') ok = (c % 2 === 1);
    if (ok) out.push([r, c]);
  }
  return out;
}
function placeIce(cfg) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) ice[r][c] = 0;
  const need = cfg.iceCount | 0;
  if (need <= 0) return;
  const n = Math.max(1, Math.min(playableCells(), need));
  const dbl = Math.max(0, Math.min(1, cfg.iceDouble || 0));
  let pattern = cfg.icePattern || 'blob';
  let placed = 0;
  /* a pattern that leaves too few well-connected cells would bury frost in thin
     corners where no match can ever reach it -> use a compact blob instead */
  if (pattern !== 'blob' && iceCandidates(pattern).length < Math.min(n, 8)) pattern = 'blob';

  const openCells = min => {
    const out = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
      if (!isWall(r, c) && ice[r][c] < 2 && openness(wall, ROWS, COLS, r, c) >= min) out.push([r, c]);
    return out;
  };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  if (pattern === 'blob') {
    const blobs = Math.max(1, Math.min(3, Math.ceil(n / 9)));
    const per = Math.ceil(n / blobs);
    const seeds = shuffle(openCells(3));
    for (let b = 0; b < blobs && placed < n; b++) {
      const seed = seeds[b] || (seeds[0] && seeds[0]);
      if (!seed) break;
      const front = [seed];
      const inSet = new Set([cellKey(seed[0], seed[1])]);
      while (front.length && placed < b * per + per && placed < n) {
        const i = (Math.random() * front.length) | 0;
        const [r, c] = front.splice(i, 1)[0];
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = r + dr, nc = c + dc;
          if (nr < 1 || nc < 1 || nr > ROWS - 2 || nc > COLS - 2 || isWall(nr, nc)) continue;
          if (openness(wall, ROWS, COLS, nr, nc) < 3) continue;
          const k = cellKey(nr, nc);
          if (!inSet.has(k)) { inSet.add(k); front.push([nr, nc]); }
        }
        if (ice[r][c] > 0 || isWall(r, c)) continue;
        ice[r][c] = Math.random() < dbl ? 2 : 1;
        placed += ice[r][c];
      }
    }
  } else {
    const cand = shuffle(iceCandidates(pattern));
    let pass = 0;
    while (placed < n && cand.length && pass < 40) {
      for (const [r, c] of cand) {
        if (placed >= n) break;
        if (ice[r][c] >= 2) continue;
        const add = (placed + 2 <= n && Math.random() < dbl) ? 2 : 1;
        ice[r][c] = Math.min(2, ice[r][c] + add);
        placed += add;
      }
      pass++;
    }
  }
  /* the pattern ran out of room -> top up anywhere so the goal matches the design */
  if (placed < n) {
    let rest = shuffle(openCells(3));
    if (!rest.length) rest = shuffle(openCells(0));
    for (const [r, c] of rest) {
      if (placed >= n) break;
      const add = Math.min(2 - ice[r][c], placed + 2 <= n ? 2 : 1);
      ice[r][c] += add; placed += add;
    }
  }
  /* frost must never vanish completely — the goal has to stay reachable */
  if (!placed) {
    let spot = shuffle(openCells(2))[0] || shuffle(openCells(0))[0];
    if (spot) { ice[spot[0]][spot[1]] = 1; placed = 1; }
  }
  for (const o of objectives) if (o.kind === 'ice') o.need = Math.max(1, placed);
}


/* ============================================================
   CARNIVAL MECHANICS — shackles, caramel, carousel, parade, orders
   ============================================================ */
const PARADE_NEED = 58;

function countFudge() {
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isBlk(r, c)) n++;
  return n;
}
function countFudgeBurned(hitKeys) {
  let n = 0;
  for (const k of hitKeys) {
    const [r, c] = unKey(k);
    const b = blk[r] && blk[r][c];
    if (b && b.hp <= 1) n++;
  }
  return n;
}
function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ---- shackles: a treat that refuses to be swapped. You have to build the
      match around it, which turns a plain board into a small puzzle. ---- */
function placeChains(cfg) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) chain[r][c] = 0;
  const need = cfg.chainCount | 0;
  if (need <= 0) return;
  const cand = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isWall(r, c) || isBlk(r, c) || (ice[r][c] | 0) > 0) continue;
    if (openness(wall, ROWS, COLS, r, c) < 3) continue;
    cand.push([r, c]);
  }
  shuffleArr(cand);
  const dbl = Math.max(0, Math.min(1, cfg.chainDouble || 0));
  let placed = 0;
  for (const [r, c] of cand) {
    if (placed >= need) break;
    const add = (placed + 2 <= need && Math.random() < dbl) ? 2 : 1;
    chain[r][c] = add; placed += add;
  }
  for (const o of objectives) if (o.kind === 'chain') o.need = Math.max(1, placed);
}

/* ---- caramel: an immovable blob that eats blasts, blocks falling treats and
      creeps into a free neighbour every move you fail to hit it. ---- */
function placeFudge(cfg) {
  const need = cfg.fudgeCount | 0;
  if (need <= 0) return;
  const cand = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isWall(r, c) || isBlk(r, c) || (ice[r][c] | 0) > 0 || (chain[r][c] | 0) > 0) continue;
    if (openness(wall, ROWS, COLS, r, c) < 3) continue;
    cand.push([r, c]);
  }
  shuffleArr(cand);
  /* keep blobs together so they are easy to reach and easy to read */
  cand.sort((a, b) => (Math.abs(a[0] - (ROWS - 1) / 2) + Math.abs(a[1] - (COLS - 1) / 2)) -
                      (Math.abs(b[0] - (ROWS - 1) / 2) + Math.abs(b[1] - (COLS - 1) / 2)));
  let placed = 0;
  for (let i = 0; i < cand.length && placed < need; i++) {
    const [r, c] = cand[i];
    blk[r][c] = { kind: 'fudge', hp: 2 };
    board[r][c] = -1; spec[r][c] = null;
    placed++;
  }
  for (const o of objectives) if (o.kind === 'fudge') o.need = Math.max(1, placed);
}

/* ---- carousel: after every move the top row slides left and the bottom row
      slides right, so the board itself is part of the puzzle. ---- */
async function carouselShift() {
  const rows = [0, ROWS - 1];
  let moved = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], dir = i === 0 ? -1 : 1;
    const line = [];
    /* balloons are shelves: their cell carries no treat, so rotating through one
       would smear an empty cell across the row and leave a permanent hole */
    for (let c = 0; c < COLS; c++) if (!isWall(r, c) && !isBlk(r, c) && !isBalloon(r, c)) line.push(c);
    if (line.length < 3) continue;
    const last = line[line.length - 1], first = line[0];
    const keep = line.map(c => ({ t: board[r][c], sp: spec[r][c], ic: ice[r][c], hn: chain[r][c], fw: fw[r][c], cv: conv[r][c] }));
    for (let j = 0; j < line.length; j++) {
      const src = keep[(j - dir + line.length) % line.length];
      const c = line[j];
      board[r][c] = src.t; spec[r][c] = src.sp; ice[r][c] = src.ic; chain[r][c] = src.hn;
      fw[r][c] = src.fw;
    }
    for (const c of line) setSlide(r, c, dir * TILE);
    moved = true;
  }
  if (!moved) return;
  play('shuffle', .45);
  render();
  await delay(260);
}
function setSlide(r, c, dx) {
  const d = cells[r] && cells[r][c]; if (!d) return;
  d.style.setProperty('--slide', dx + 'px');
  restartAnim(d, 'sliding');
  setTimeout(() => d.classList.remove('sliding'), 300);
}

/* ---- caramel creeps ---- */
async function spreadFudge() {
  const blobs = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!isBlk(r, c)) continue;
    blobs.push([r, c, fudgeTouched && fudgeTouched.has(cellKey(r, c))]);
  }
  if (!blobs.length) return;
  let total = countFudge(), grew = 0;
  for (const [r, c, hit] of blobs) {
    if (hit || total >= 12) continue;
    const free = [];
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (!inBoard(nr, nc) || isWall(nr, nc) || isBlk(nr, nc)) continue;
      if (spec[nr][nc] || (ice[nr][nc] | 0) > 0 || (chain[nr][nc] | 0) > 0) continue;
      if (board[nr][nc] < 0) continue;
      free.push([nr, nc]);
    }
    if (!free.length) continue;
    const [nr, nc] = free[(Math.random() * free.length) | 0];
    board[nr][nc] = -1; blk[nr][nc] = { kind: 'fudge', hp: 2 };
    restartAnim(cells[nr][nc], 'fudgegrow');
    total++; grew++;
  }
  if (grew) {
    play('boost', .5);
    render(); updateHUD();
    toast(T('fudgeGrew').replace('%s', grew));
    await delay(300);
  }
}

/* ---- parade: the meter fills with matches; when it is full the carnival
      throws free special treats onto the board and doubles the score. ---- */
async function startParade() {
  paradeMeter = 0; paradeMoves = 4;
  const spots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isWall(r, c) || isBlk(r, c) || spec[r][c]) continue;
    if (board[r][c] < 0 || (ice[r][c] | 0) > 0 || (chain[r][c] | 0) > 0) continue;
    spots.push([r, c]);
  }
  shuffleArr(spots);
  const n = Math.min(6, Math.max(2, (spots.length / 9) | 0));
  for (let i = 0; i < n; i++) {
    const [r, c] = spots[i];
    spec[r][c] = { kind: Math.random() < .55 ? SPECIAL.SWIRL : SPECIAL.BOMB, tile: board[r][c] };
    board[r][c] = -1;
    ring(r, c);
  }
  render();
  flashBoard(.55); shake(); play('magic', .85);
  showCombo(0, T('paradeGo'));
  confetti(el('boardwrap'));
  analytics.track('parade', { level, n });
  updateHUD();
  await delay(420);
}

/* ---- orders: a live queue of small asks with instant rewards ---- */
function buildOrders(cfg) {
  orders = []; ordersDone = 0;
  const n = Math.max(0, Math.min(4, cfg.orders | 0));
  if (!n) return;
  const kinds = ['collect', 'collect', 'special', 'blast'];
  if (objectives.some(o => o.kind === 'ice') || (cfg.iceCount | 0) > 0) kinds.push('ice', 'ice');
  if ((cfg.chainCount | 0) > 0) kinds.push('chain', 'chain');
  if ((cfg.targetCount | 0) > 0) kinds.push('target', 'target');
  if ((cfg.balloonCount | 0) > 0) kinds.push('balloon');
  if (cfg.spotlight) kinds.push('lit', 'lit');
  if ((cfg.firework | 0) > 0) kinds.push('firework', 'firework');
  if ((cfg.belts | 0) > 0) kinds.push('belt');
  for (let i = 0; i < n; i++) {
    const kind = kinds[(Math.random() * kinds.length) | 0];
    const o = { kind, got: 0, done: false, id: i };
    if (kind === 'collect') { o.tile = (Math.random() * NUM_TYPES) | 0; o.need = 6 + ((level / 4) | 0) + ((Math.random() * 5) | 0); }
    else if (kind === 'special') o.need = 2 + ((Math.random() * 2) | 0);
    else if (kind === 'ice') o.need = 4 + ((Math.random() * 4) | 0);
    else if (kind === 'chain') o.need = 3 + ((Math.random() * 3) | 0);
    else if (kind === 'target') o.need = 2 + ((Math.random() * 3) | 0);
    else if (kind === 'balloon') o.need = 1 + ((Math.random() * 2) | 0);
    else if (kind === 'lit') o.need = 5 + ((Math.random() * 5) | 0);
    else if (kind === 'firework') o.need = 1 + ((Math.random() * 2) | 0);
    else if (kind === 'belt') o.need = 6 + ((Math.random() * 8) | 0);
    else o.need = 2 + ((Math.random() * 2) | 0);
    const roll = Math.random();
    if (roll < .45) o.reward = { kind: 'coins', n: 30 + ((level / 3) | 0) * 6 };
    else if (roll < .75) o.reward = { kind: 'moves', n: 2 };
    else o.reward = { kind: ['hammer', 'rainbow', 'shuffle'][(Math.random() * 3) | 0], n: 1 };
    orders.push(o);
  }
}
function orderLabel(o) {
  if (o.kind === 'collect') return o.got + '/' + o.need;
  if (o.kind === 'special') return T('ordSpecial') + ' ' + o.got + '/' + o.need;
  if (o.kind === 'ice') return T('ordIce') + ' ' + o.got + '/' + o.need;
  if (o.kind === 'chain') return T('ordChain') + ' ' + o.got + '/' + o.need;
  if (o.kind === 'target') return T('ordTarget') + ' ' + o.got + '/' + o.need;
  if (o.kind === 'balloon') return T('ordBalloon') + ' ' + o.got + '/' + o.need;
  if (o.kind === 'lit') return T('ordLit') + ' ' + o.got + '/' + o.need;
  if (o.kind === 'firework') return T('ordFw') + ' ' + o.got + '/' + o.need;
  if (o.kind === 'belt') return T('ordBelt') + ' ' + o.got + '/' + o.need;
  return T('ordBlast') + ' ' + o.got + '/' + o.need;
}
function orderIcon(o) {
  if (o.kind === 'collect') return '<img src="' + tileFor(o.tile) + '" alt=""/>';
  if (o.kind === 'ice') return ICE_SVG;
  if (o.kind === 'chain') return CHAIN_SVG;
  if (o.kind === 'target') return TARGET_SVG;
  if (o.kind === 'balloon') return BALLOON_SVG;
  if (o.kind === 'lit') return SPOT_SVG;
  if (o.kind === 'firework') return FW_SVG;
  if (o.kind === 'belt') return BELT_SVG;
  if (o.kind === 'special') return BADGE.bomb;
  return '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12h16M12 4v16" stroke="#ffd76a" stroke-width="3" stroke-linecap="round"/></svg>';
}
function rewardLabel(r) {
  if (r.kind === 'coins') return '+' + r.n + ' ' + T('coins');
  if (r.kind === 'moves') return '+' + r.n + ' ' + T('moves');
  return T(r.kind) + ' ×' + r.n;
}
function completeOrder(o) {
  o.done = true; ordersDone++;
  const r = o.reward;
  if (r.kind === 'coins') { coins += r.n; flyTickets(3); }
  else if (r.kind === 'moves') { movesLeft += r.n; }
  else { inventory[r.kind] = (inventory[r.kind] | 0) + r.n; }
  play('reward', .75);
  toast(T('orderDone') + ' · ' + rewardLabel(r));
  analytics.track('order_done', { level, kind: o.kind, reward: r.kind });
  saveProgress();
}

/* ---- ring-toss pegs: bolted to the board, you have to shoot a treat off them ---- */
function placeTargets(cfg) {
  const need = cfg.targetCount | 0;
  if (need <= 0) return;
  const cand = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isBlockedCell(r, c) || (ice[r][c] | 0) > 0 || (chain[r][c] | 0) > 0) continue;
    if (openness(wall, ROWS, COLS, r, c) < 3) continue;
    cand.push([r, c]);
  }
  shuffleArr(cand);
  /* keep pegs apart so the player has to aim at several places, not one corner */
  const picked = [];
  for (const p of cand) {
    if (picked.length >= need) break;
    if (picked.some(q => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 2)) continue;
    picked.push(p);
  }
  for (const [r, c] of picked) tgt[r][c] = 1;
  for (const o of objectives) if (o.kind === 'target') o.need = Math.max(1, picked.length);
}
function countTargets() {
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (tgt[r][c]) n++;
  return n;
}

/* ---- balloons: tied to the board, they climb one row per move and slip away
      off the top edge — the first mechanic in the game that costs you moves ---- */
function placeBalloons(cfg) {
  const need = cfg.balloonCount | 0;
  if (need <= 0) return;
  const cand = [];
  for (let r = ROWS - 1; r >= 1; r--) for (let c = 0; c < COLS; c++) {
    if (isBlockedCell(r, c) || tgt[r][c] || (ice[r][c] | 0) > 0 || (chain[r][c] | 0) > 0) continue;
    if (openness(wall, ROWS, COLS, r, c) < 3) continue;
    cand.push([r, c]);
  }
  shuffleArr(cand);
  let placed = 0;
  for (const [r, c] of cand) {
    if (placed >= need) break;
    if (bal[r][Math.max(0, c - 1)] || bal[r][Math.min(COLS - 1, c + 1)]) continue;
    if (isWall(r - 1, c)) continue;                       // no headroom = an instant loss
    bal[r][c] = { hp: 1 };
    board[r][c] = -1; spec[r][c] = null; ice[r][c] = 0; chain[r][c] = 0;
    placed++;
  }
  for (const o of objectives) if (o.kind === 'balloon') o.need = Math.max(1, placed);
}
function popBalloon(r, c) {
  if (!bal[r][c]) return false;
  bal[r][c] = null;
  const k = cellKey(r, c);
  particles([k]); ring(r, c); play('arcade', .5);
  for (const o of objectives) if (o.kind === 'balloon') o.got++;
  for (const o of orders) {
    if (o.done || o.kind !== 'balloon') continue;
    o.got++;
    if (o.got >= o.need) completeOrder(o);
  }
  paradeMeter = Math.min(PARADE_NEED, paradeMeter + 6);
  return true;
}
async function riseBalloons() {
  let moved = 0, escaped = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!bal[r][c]) continue;
    if (r === 0) {
      bal[r][c] = null; escaped++;
      particles([cellKey(r, c)]);
      continue;
    }
    const up = r - 1;
    if (isWall(up, c) || isBlk(up, c) || bal[up][c]) continue;
    bal[up][c] = bal[r][c]; bal[r][c] = null;
    const t = board[up][c], sp = spec[up][c], ic = ice[up][c], hn = chain[up][c], f2 = fw[up][c];
    board[up][c] = board[r][c]; spec[up][c] = spec[r][c]; ice[up][c] = ice[r][c]; chain[up][c] = chain[r][c]; fw[up][c] = fw[r][c];
    board[r][c] = t; spec[r][c] = sp; ice[r][c] = ic; chain[r][c] = hn; fw[r][c] = f2;
    setFall(up, c, -1, false);
    moved++;
  }
  if (escaped) {
    movesLeft = Math.max(0, movesLeft - escaped);
    toast(T('balloonLost').replace('%s', escaped));
    play('lose', .45); shake();
    analytics.track('balloon_escape', { level, n: escaped });
  }
  if (moved || escaped) {
    /* an escaped balloon leaves its cell free: gravity must close that gap, otherwise
       the board keeps a permanent hole and the level quietly becomes smaller */
    applyGravity();
    render(); updateHUD(); await delay(260);
  }
}

/* ---- B1: conveyor belts. Arrows live on cells; after every move the treat that
      sits on a belt slides one step along the arrow. The dead `conv` array from v5
      finally does something. ---- */
function placeBelts(cfg) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) conv[r][c] = 0;
  const need = cfg.belts | 0;
  if (need <= 0) return;
  const free = (r, c) => inBoard(r, c) && !isWall(r, c) && !isBlk(r, c) && !isBalloon(r, c) &&
    !(ice[r][c] | 0) && !(chain[r][c] | 0) && openness(wall, ROWS, COLS, r, c) >= 3;
  const seeds = shuffleArr([]);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (free(r, c)) seeds.push([r, c]);
  let placed = 0, guard = 0;
  while (placed < need && seeds.length && guard++ < 200) {
    const [r, c] = seeds.pop();
    if (conv[r][c]) continue;
    const dirs = shuffleArr([1, 2, 3, 4]);
    let best = null;
    for (const d of dirs) {
      const [dr, dc] = BELT_D[d];
      const run = [];
      let rr = r, cc = c;
      while (run.length < 4 && free(rr, cc) && !conv[rr][cc]) {
        run.push([rr, cc]);
        const nr = rr + dr, nc = cc + dc;
        if (!free(nr, nc) || conv[nr][nc]) break;
        rr = nr; cc = nc;
      }
      if (run.length >= 2 && (!best || run.length > best.length)) best = run.map(p => ({ p: p, d: d }));
    }
    if (!best) continue;
    for (const cell of best) { conv[cell.p[0]][cell.p[1]] = cell.d; placed++; }
  }
  for (const o of objectives) if (o.kind === 'belt') o.need = Math.max(1, placed);
}
/* one belt cycle. The board is full of treats, so a belt cannot "slide into a gap":
   it ROTATES the whole chain of cells it feeds. Chains are walked from their head,
   so a treat is never carried twice in the same cycle. */
function beltStep(r, c) {
  const d = conv[r] && conv[r][c]; if (!d) return null;
  const [dr, dc] = BELT_D[d];
  const nr = r + dr, nc = c + dc;
  if (!inBoard(nr, nc) || isWall(nr, nc) || isShelf(nr, nc)) return null;
  if (isChained(r, c) || isChained(nr, nc)) return null;
  return { r: nr, c: nc, d: d };
}
function carry(a, b) {
  board[b.r][b.c] = board[a.r][a.c]; spec[b.r][b.c] = spec[a.r][a.c];
  ice[b.r][b.c] = ice[a.r][a.c]; chain[b.r][b.c] = chain[a.r][a.c]; fw[b.r][b.c] = fw[a.r][a.c];
}
function wipe(r, c) {
  board[r][c] = -1; spec[r][c] = null; ice[r][c] = 0; chain[r][c] = 0; fw[r][c] = null;
}
async function runBelts() {
  /* The board is full, so a belt cannot "slide into a gap": one cycle is a
     PERMUTATION. Every arrow hands its treat to the next cell, the last arrow of a
     run wraps into the cell behind the head, and that cell feeds the head. All
     writes come from one snapshot, so a treat travels exactly one cell per cycle -
     even where two runs touch or a run loops back on itself. */
  const to = {}, pred = {}, heads = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!conv[r][c]) continue;
    const t = beltStep(r, c);
    if (!t) continue;                               // every arrow is honoured, run ends included
    const sk = cellKey(r, c), dk = cellKey(t.r, t.c);
    if (pred[dk]) continue;                         // two arrows into one cell: the second waits
    to[sk] = dk; pred[dk] = sk;
  }
  for (const k in to) if (!pred[k]) heads.push(k);
  /* a run is not a dead end: the treat it throws into the cell beyond the last arrow
     displaces that treat back to the head of the run - the belt returns underneath */
  for (const k of heads) {
    let cur = k, guard = 0;
    while (to[cur] && guard++ < 64) cur = to[cur];  // walk to the last cell of the run
    if (to[cur]) {
      const x = to[cur];                            // the cell the last arrow points at
      if (!to[x] && x !== k) { to[x] = k; pred[k] = x; }
    } else if (cur !== k) { to[cur] = k; pred[k] = cur; }   // arrow into a wall: loop inside
  }
  const keys = Object.keys(to);
  if (!keys.length) return 0;
  const snap = {};
  for (const k of keys) {
    const p = unKey(k);
    snap[k] = { t: board[p[0]][p[1]], sp: spec[p[0]][p[1]], ic: ice[p[0]][p[1]], hn: chain[p[0]][p[1]], rocket: fw[p[0]][p[1]] };
  }
  for (const k of keys) if (!pred[k]) { const p = unKey(k); wipe(p[0], p[1]); }
  let moved = 0;
  for (const k of keys) {
    const s = snap[k]; if (!s) continue;
    const b = unKey(to[k]);
    board[b[0]][b[1]] = s.t; spec[b[0]][b[1]] = s.sp; ice[b[0]][b[1]] = s.ic;
    chain[b[0]][b[1]] = s.hn; fw[b[0]][b[1]] = s.rocket;
    const a = unKey(k), d = conv[a[0]][a[1]];
    if (d === 2) setSlide(b[0], b[1], TILE);
    else if (d === 4) setSlide(b[0], b[1], -TILE);
    else if (d === 3) setFall(b[0], b[1], -TILE, false);
    else setFall(b[0], b[1], TILE, false);
    moved++;
  }
  if (!moved) return 0;
  beltMoves += moved;
  for (const o of objectives) if (o.kind === 'belt') o.got += moved;
  for (const o of orders) {
    if (o.done || o.kind !== 'belt') continue;
    o.got += moved;
    if (o.got >= o.need) completeOrder(o);
  }
  paradeMeter = Math.min(PARADE_NEED, paradeMeter + moved);
  applyGravity();
  play('shuffle', .4);
  render();
  await delay(240);
  return moved;
}

/* ---- B3: fireworks. A treat with a burning fuse: clear it in time and it pays
      big (and chains into its neighbours), ignore it and it goes off by itself
      and costs you a move. The first real threat in the game. ---- */
function placeFireworks(cfg) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) fw[r][c] = null;
  const need = cfg.firework | 0;
  if (need <= 0) return;
  const fuse = Math.max(2, Math.min(6, cfg.fuse | 0 || 3));
  const cand = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isBlockedCell(r, c) || (ice[r][c] | 0) > 0 || (chain[r][c] | 0) > 0) continue;
    if (spec[r][c] || board[r][c] < 0) continue;
    if (openness(wall, ROWS, COLS, r, c) < 3) continue;
    cand.push([r, c]);
  }
  shuffleArr(cand);
  const picked = [];
  for (const p of cand) {
    if (picked.length >= need) break;
    if (picked.some(q => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 3)) continue;
    picked.push(p);
  }
  if (!picked.length && cand.length) picked.push(cand[0]);
  for (const [r, c] of picked) fw[r][c] = { n: fuse };
  /* "launch N of M": the level plants more rockets than it asks for, so a rocket that
      sits where no match can reach it does not make the level unwinnable */
  for (const o of objectives) if (o.kind === 'firework') {
    const placed = picked.length;
    o.need = Math.max(1, Math.min(o.need | 0 || placed, placed - (placed > 2 ? 1 : 0)));
  }
}
function fwCells(r, c) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const nr = r + dr, nc = c + dc;
    if (inBoard(nr, nc) && !isWall(nr, nc)) out.push(cellKey(nr, nc));
  }
  return out;
}
async function tickFireworks() {
  let any = false, boom = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const f = fw[r] && fw[r][c]; if (!f) continue;
    f.n--; any = true;
    if (f.n <= 0) boom.push([r, c]);
  }
  if (!any) return;
  if (boom.length) {
    let set = new Set();
    for (const [r, c] of boom) for (const k of fwCells(r, c)) set.add(k);
    set = detonate(set);
    for (const [r, c] of boom) fw[r][c] = null;
    movesLeft = Math.max(0, movesLeft - boom.length);
    play('lose', .5); shake(); flashBoard(.35);
    toast(T('fwBoom').replace('%s', boom.length));
    analytics.track('firework_boom', { level, n: boom.length });
    await clearAndFall(set, 1);
    await resolve();
    updateHUD();
    return;
  }
  render();
}

/* ---- B2: the control panel. Free, once-per-level levers that let the player
      pull the rides himself instead of enduring them. ---- */
const LEVER_KINDS = () => ['tilt', 'spot', 'ride', 'mix'];
function buildLevers(cfg) {
  levers = [];
  if (!cfg.console) return;
  /* most useful first. The ride lever only appears on levels that have rides, but the
     spotlight and the mixer are always on the panel, so a lever is never a dud. */
  const have = [];
  if ((cfg.tiltEvery | 0) > 0) have.push('tilt');
  if (cfg.carousel || (cfg.belts | 0) > 0) have.push('ride');
  have.push('spot');
  have.push('mix');
  levers = have.slice(0, 3).map(k => ({ kind: k, used: false }));
}
function leverLabel(k) { return T('lever' + k.charAt(0).toUpperCase() + k.slice(1)); }
function bindGadgets() {
  const gb = el('gadgets'); if (!gb) return;
  gb.addEventListener('click', e => {
    if (running || adBusy || modalOpen()) return;
    const lb = e.target.closest ? e.target.closest('.lev') : null;
    if (lb) {
      const i = parseInt(lb.dataset.lev, 10);
      if (isNaN(i)) return;
      if (levers[i] && levers[i].used) { toast(T('leverUsed').replace('%s', leverLabel(levers[i].kind))); play('click', .4); return; }
      (async () => { running = true; await pullLever(i); running = false; updateHUD(); })();
      return;
    }
    const tb = e.target.closest ? e.target.closest('.trk') : null;
    if (tb) {
      const k = tb.dataset.trick;
      if (!tricks || !tricks[k]) return;
      if (movesLeft <= tricks[k]) { toast(T('trickNo')); play('click', .4); return; }
      trickMode = (trickMode === k) ? null : k;
      toast(T('trickOn').replace('%s', T('trick' + k.charAt(0).toUpperCase() + k.slice(1))));
      play('click', .5);
      updateHUD();
    }
  });
}
async function pullLever(i) {
  const L0 = levers[i];
  if (!L0 || L0.used) { toast(T('leverUsed').replace('%s', leverLabel(L0 ? L0.kind : ''))); return; }
  if (L0.kind === 'spot') {
    leverMode = 'spot';
    toast(T('leverPick'));
    play('click', .5);
    return;
  }
  L0.used = true; leversPulled++;
  play('boost', .6);
  if (L0.kind === 'tilt') {
    gravDir = (gravDir + 1) % 4;
    applyGravity(); render();
    flashBoard(.4); shake();
    toast(T('tiltGo').replace('%s', T('tilt' + gravDir)));
    analytics.track('lever_tilt', { level, dir: gravDir });
    await delay(320);
  } else if (L0.kind === 'ride') {
    if (levelCfg && levelCfg.carousel) await carouselShift();
    if (levelCfg && (levelCfg.belts | 0) > 0) await runBelts();
    if (spot) advanceSpot();
    await resolve();
  } else {
    play('shuffle', .7);
    reshuffleTypes(); render();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) setFall(r, c, 1 + (c % 3));
    await delay(320);
  }
  updateHUD();
}

/* ---- B5: the trick stall. Special treats bought with MOVES, not tickets:
      the player decides when a move is worth spending on a placement. ---- */
const TRICK_COST = { swirl: 3, bomb: 4, rainbow: 6 };
function buildTricks(cfg) {
  tricks = null;
  if (!cfg.tricks) return;
  tricks = { swirl: TRICK_COST.swirl, bomb: TRICK_COST.bomb, rainbow: TRICK_COST.rainbow };
}
async function placeTrick(kind, r, c) {
  const cost = tricks[kind];
  if (movesLeft <= cost) { toast(T('trickNo')); play('click', .4); return false; }
  if (isBlockedCell(r, c) || isWall(r, c) || (ice[r][c] | 0) > 0 || (chain[r][c] | 0) > 0) { play('click', .4); return false; }
  if (board[r][c] < 0 && !spec[r][c]) { play('click', .4); return false; }
  const tile = spec[r][c] ? spec[r][c].tile : board[r][c];
  spec[r][c] = { kind: kind, tile: tile };
  board[r][c] = -1;
  movesLeft -= cost; tricksBought++;
  ring(r, c); spLabel(r, c, kind); play('magic', .7);
  toast(T('trickDone').replace('%s', T('trick' + kind.charAt(0).toUpperCase() + kind.slice(1))).replace('%s', cost));
  analytics.track('trick_buy', { level, kind, cost });
  render(); updateHUD();
  await delay(220);
  return true;
}

/* ---- spotlight: a cone of light crawls over the board; clearing treats inside it
      pays triple, so the player starts planning around a moving target ---- */
function initSpot(cfg) {
  spot = null; spotPath = []; spotAt = 0;
  if (!cfg.spotlight) return;
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) if (!isWall(r, c)) row.push([r, c]);
    if (r % 2) row.reverse();
    for (const p of row) spotPath.push(p);
  }
  if (spotPath.length < 3) { spotPath = []; return; }
  spotAt = (spotPath.length / 2) | 0;
  spot = { r: spotPath[spotAt][0], c: spotPath[spotAt][1] };
}
function advanceSpot() {
  if (!spotPath.length) return;
  spotAt = (spotAt + 1) % spotPath.length;
  spot = { r: spotPath[spotAt][0], c: spotPath[spotAt][1] };
  play('click', .25);
}

/* ---- the tilted ride: every N moves gravity turns a quarter ---- */
const GRAV_WORD = () => ['down', 'left', 'up', 'right'][gravDir];
function tiltDue() {
  const every = levelCfg ? (levelCfg.tiltEvery | 0) : 0;
  if (!every) return 0;
  const used = movesTotal - movesLeft;
  const left = every - (used % every);
  return left === every ? 0 : left;          // 1 = flips on the next move
}
function tiltNow() {
  const every = levelCfg ? (levelCfg.tiltEvery | 0) : 0;
  if (!every) return false;
  if ((movesTotal - movesLeft) % every !== 0) return false;
  gravDir = (gravDir + 1) % 4;
  return true;
}

/* ---- the carnival band: keep producing something every move and the
      band plays louder — 3 clean moves = a free swirl, 6 = a free rainbow ---- */
const BAND_MAX = 6;
function bandReward(kind) {
  const spots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isBlockedCell(r, c) || spec[r][c]) continue;
    if (board[r][c] < 0 || (ice[r][c] | 0) > 0 || (chain[r][c] | 0) > 0) continue;
    spots.push([r, c]);
  }
  shuffleArr(spots);
  const n = kind === SPECIAL.RAINBOW ? 1 : 2;
  let made = 0;
  for (let i = 0; i < spots.length && made < n; i++) {
    const [r, c] = spots[i];
    spec[r][c] = { kind: kind, tile: board[r][c] };
    board[r][c] = -1;
    ring(r, c); spLabel(r, c, kind); made++;
  }
  if (made) { play('magic', .7); render(); }
  analytics.track('band_reward', { level, kind, made });
  return made;
}

/* ---- the post-move carnival tick: one strict order for everything that moves ---- */
async function carnivalTick() {
  if (allGoalsDone()) return;
  if (levelCfg && (levelCfg.fudgeCount | 0) > 0) await spreadFudge();
  if (levelCfg && (levelCfg.balloonCount | 0) > 0) await riseBalloons();
  if (levelCfg && (levelCfg.firework | 0) > 0) await tickFireworks();
  if (allGoalsDone() || movesLeft <= 0) { updateHUD(); return; }
  if (levelCfg && (levelCfg.belts | 0) > 0) { if (await runBelts()) await resolve(); }
  if (levelCfg && levelCfg.carousel) await carouselShift();
  if (spot) advanceSpot();
  if (tiltNow()) {
    applyGravity(); render();
    flashBoard(.4); shake(); play('boost', .6);
    toast(T('tiltGo').replace('%s', T('tilt' + gravDir)));
    analytics.track('tilt', { level, dir: gravDir });
    await delay(340);
  }
  updateHUD();
}

async function newLevel(showIntro = true) {
  levelCfg = getAdaptiveCfg(getLevelCfg(level));
  const shape = boardShape(levelCfg);
  COLS = shape.cols; ROWS = shape.rows;
  NUM_TYPES = Math.max(4, Math.min(6, levelCfg.types || 5));
  SHAPE = levelCfg.shape || 'full';
  PAL = chapterOf(level) % PALETTES.length;
  document.body.dataset.ch = String(PAL);
  objectives = buildObjectives(levelCfg);
  score = 0; lastCombo = 0; bestCombo = 0; targetMode = null; fever = 0;
  paradeMeter = 0; paradeMoves = 0; fudgeTouched = null;
  gravDir = 0; bandMeter = 0; moveCleared = 0; moveSpecials = 0; moveLit = 0;
  leverMode = null; leversPulled = 0; tricksBought = 0; fwLaunched = 0; beltMoves = 0;
  movesTotal = levelCfg.moves; movesLeft = movesTotal;
  buildCells(); layoutBoard(); makeBoard();
  if (levelCfg.iceCount || objectives.some(o => o.kind === 'ice')) placeIce(levelCfg);
  placeChains(levelCfg);
  placeFudge(levelCfg);
  placeTargets(levelCfg);
  placeBalloons(levelCfg);
  placeBelts(levelCfg);
  placeFireworks(levelCfg);
  initSpot(levelCfg);
  buildLevers(levelCfg);
  buildTricks(levelCfg);
  buildOrders(levelCfg);
  /* frost, shackles and caramel all eat cells: the deal that was playable a moment ago
     may not be any more, and a level the player cannot open is worse than a hard one */
  if (!anyMove()) reshuffleTypes();
  render(); updateHUD(); dropIn();
  clearTimeout(hintTimer);
  gameplayWanted = true; sdkGameplay(true);
  if (showIntro) {
    await showIntroBanner();
    if (level === 1) toast(T('hint'));
  }
  armHint();
}
function restartLevel() { hideOverlay(); newLevel(); }
function goToLevel(n) { hideModal('lvlsel'); level = Math.max(1, Math.min(n | 0, totalLevels())); newLevel(); }

async function showIntroBanner() {
  const box = el('intro'); if (!box) return;
  const goals = objectives.map(o => {
    if (o.kind === 'score') return T('score') + ' ' + o.goal;
    if (o.kind === 'ice') return T('iceGoal') + ' ' + o.need;
    if (o.kind === 'chain') return T('chainGoal') + ' ' + o.need;
    if (o.kind === 'fudge') return T('fudgeGoal') + ' ' + o.need;
    if (o.kind === 'target') return T('targetGoal') + ' ' + o.need;
    if (o.kind === 'balloon') return T('balloonGoal') + ' ' + o.need;
    if (o.kind === 'firework') return T('fwGoal') + ' ' + o.need;
    if (o.kind === 'belt') return T('beltGoal') + ' ' + o.need;
    return T('collect') + ' ' + o.need;
  });
  const icons = objectives.map(o => goalIcon(o));
  const ch = chapterName(level);
  const newTag = levelCfg && levelCfg.intro ? '<div class="intro-new">' + T('newWord') + ': ' + T('intro_' + levelCfg.intro) + '</div>' : '';
  box.innerHTML = '<div>' + newTag +
    '<div class="intro-l">' + T('level') + ' ' + level + ' · ' + ch + '</div>' +
    '<div class="intro-t">' + icons.join('<span style="opacity:.5">+</span>') + '<span>' + goals.join(' + ') + '</span></div>' +
    '<div class="intro-m">' + movesTotal + ' ' + T('introMoves') + '</div></div>';
  restartAnim(box, 'show');
  play('click', .5);
  await delay(levelCfg && levelCfg.intro ? 2100 : 1500);
}

/* ---------------- win / lose ---------------- */
function starsFor() {
  if (movesTotal <= 0) return 1;
  const left = movesLeft / movesTotal;
  let st = 1;
  if (left >= 0.25) st++;
  if (left >= 0.45) st++;
  return st;
}
function checkState() {
  if (!objectives.length) return;
  if (allGoalsDone()) { winLevel(); return; }
  if (movesLeft <= 0) { loseLevel(); return; }
  ensurePlayable();
}

function winLevel() {
  running = true;
  play('win', .8);
  gameplayWanted = false; sdkGameplay(false);
  winStreak++; lossStreak = 0;
  const st = starsFor();
  starsByLevel[level] = Math.max(starsByLevel[level] || 0, st);
  completedLevels.add(level);
  const bonus = isFinale(level) ? 40 + chapterOf(level) * 20 : 0;
  const streakBonus = winStreak >= 3 ? 10 * Math.min(5, winStreak - 1) : 0;
  let earned = 20 + st * 15 + streakBonus + bonus;
  const dailyToday = dailyMode && !dailyClaimed();
  if (dailyToday) { earned *= 2; dailyDate = todayKey(); setTimeout(() => toast(T('dailyWon')), 1100); }
  coins += earned;
  if (winStreak >= 3) setTimeout(() => toast(T('streakBonus').replace('%s', winStreak).replace('%s', streakBonus)), 700);
  const pch = chapterOf(level);
  if (chapterCleared(pch) && !claimedChapters.has(pch)) setTimeout(() => toast(T('ppReady') + ' ' + (pch + 1)), 1500);
  bumpJournal({ plays: 1, wins: 1, tickets: earned, fw: fwLaunched, levers: leversPulled,
    tricks: tricksBought, best: bestCombo, stars: st, daily: dailyToday ? 1 : 0,
    rides: (leversPulled ? 1 : 0) + (levelCfg && levelCfg.carousel ? 1 : 0) });
  analytics.completed++;
  analytics.track('level_complete', { level, score, stars: st });
  checkStarRewards();
  saveProgress(); submitScore();
  flyTickets(4);
  confetti(el('overlay'));
  const tier = st >= 3 && starsFor() === 3 && movesLeft / Math.max(1, movesTotal) >= 0.5 ? 4 : st;
  const stats = [
    { k: T('stMoves'), v: (movesTotal - movesLeft) + '/' + movesTotal },
    { k: T('stScore'), v: score },
    { k: T('stCombo'), v: bestCombo + '×' }
  ];
  if (orders.length) stats.push({ k: T('stOrders'), v: ordersDone + '/' + orders.length });
  const extra = [];
  if (leversPulled) extra.push(leversPulled + ' ' + T('logLever'));
  if (tricksBought) extra.push(tricksBought + ' ' + T('logTrick'));
  if (fwLaunched) extra.push(fwLaunched + ' ' + T('logFw'));
  if (dailyMode) extra.unshift(T('dailyTag') + ': ' + rideLabel(dailyRide().k));
  if (extra.length) stats.push({ k: T('gadWord'), v: extra.join(' · ') });
  const done = level >= totalLevels();
  const chest = (isFinale(level) && !chestsOpened.has(level)) ? level : 0;
  if (done) {
    showOverlay('win', {
      title: T('finaleTitle'),
      text: T('finaleText').replace('%s', totalLevels()).replace('%s', totalStars()),
      stars: st, coins: earned, chest: chest, tier: tier, stats: stats,
      main: { label: T('replay'), cb: () => { level = 1; hideOverlay(); running = false; newLevel(); } },
      alt: { label: T('levelsBtn'), cb: () => { hideOverlay(); running = false; showLevelSelect(); } },
      ad: { label: T('adDouble'), cb: (btn) => { rewarded(btn, () => { coins += earned; el('ovcoinval').textContent = '+' + (earned * 2); updateHUD(); saveProgress(); flyTickets(3); }); } }
    });
  } else {
    showOverlay('win', {
      title: T('win'),
      text: T('score') + ' ' + score,
      stars: st, tier: tier, stats: stats,
      coins: earned,
      chest: chest,
      next: nextLevelTeaser(),
      ribbon: T('level') + ' ' + level + ' · ' + T('chapter') + ' ' + (chapterOf(level) + 1) +
              ' (' + chapterProgress(level) + ')',
      main: { label: T('next'), cb: () => { maybeInterstitial(() => { level++; hideOverlay(); running = false; newLevel(); checkDailyReward(true); }); } },
      alt: { label: T('restart'), cb: () => { hideOverlay(); running = false; restartLevel(); } },
      ad: { label: T('adDouble'), cb: (btn) => { rewarded(btn, () => { coins += earned; el('ovcoinval').textContent = '+' + (earned * 2); updateHUD(); saveProgress(); flyTickets(3); }); } }
    });
  }
  if (level >= 5 && !rated) { rated = true; setTimeout(askRating, 1200); }
}
function chapterProgress(n) {
  let got = 0;
  for (let k = chapterOf(n) * 10 + 1; k <= chapterOf(n) * 10 + 10 && k <= totalLevels(); k++) if (completedLevels.has(k)) got++;
  return got + '/10';
}
function nextLevelTeaser() {
  const n = level + 1;
  if (n > totalLevels()) return '';
  const cfg = getAdaptiveCfg(getLevelCfg(n));
  const objs = buildObjectives(cfg);
  const pal = chapterOf(n) % PALETTES.length;
  const bits = objs.map(o => {
    if (o.kind === 'score') return '<span class="nx-g">★ ' + o.goal + '</span>';
    if (o.kind === 'ice') return '<span class="nx-g ice">' + ICE_SVG.replace('width="24" height="24"', 'width="15" height="15"') + o.need + '</span>';
    return '<span class="nx-g"><img loading="lazy" decoding="async" src="' + tileFor(o.tile, cfg.types, pal) + '" alt=""/>' + o.need + '</span>';
  }).join('<i>+</i>');
  return '<span class="nx-k">' + T('nextGoal') + '</span><span class="nx-l">' + T('level') + ' ' + n +
    ' · ' + chapterName(n) + '</span>' + bits + '<span class="nx-m">' + cfg.moves + ' ' + T('moves') + '</span>';
}
function loseLevel() {
  running = true;
  play('lose', .8);
  gameplayWanted = false; sdkGameplay(false);
  lossStreak++; winStreak = 0;
  bumpJournal({ plays: 1, fw: fwLaunched, levers: leversPulled, tricks: tricksBought, best: bestCombo });
  analytics.track('level_fail', { level, score });
  let gift = '';
  if (lossStreak >= 3 && (inventory.hammer | 0) + (inventory.rainbow | 0) + (inventory.shuffle | 0) === 0) {
    inventory.hammer = (inventory.hammer | 0) + 1;
    gift = T('giftBooster');
    saveProgress(); updateHUD();
  }
  const need = objectives.map(o => goalLabel(o)).join(' · ');
  const stats = [{ k: T('stScore'), v: score }, { k: T('stCombo'), v: bestCombo + '×' }];
  if (orders.length) stats.push({ k: T('stOrders'), v: ordersDone + '/' + orders.length });
  const near = goalProgress();
  const hintBooster = (objectives.some(o => o.kind === 'ice') && near > .7) ? T('hammer') :
    (objectives.some(o => o.kind === 'fudge' || o.kind === 'firework') && near > .6) ? T('rainbow') :
    (near > .85 ? T('shuffle') : '');
  showOverlay('lose', {
    title: T('lose'),
    text: need + (gift ? '\n' + gift : '') + (hintBooster ? '\n' + T('hintBooster').replace('%s', hintBooster) : ''),
    stars: 0, coins: 0, stats: stats,
    main: { label: T('retry'), cb: () => { hideOverlay(); running = false; restartLevel(); } },
    alt: { label: T('levels'), cb: () => { hideOverlay(); running = false; showLevelSelect(); } },
    ad: { label: T('adMoves'), cb: (btn) => { rewarded(btn, () => { movesLeft += 5; hideOverlay(); running = false; updateHUD(); armHint(); }); } }
  });
}

/* ---------------- overlay ---------------- */
function showOverlay(kind, o) {
  hideModal('lvlsel');
  const ov = el('overlay');
  el('ovribbon').textContent = o.ribbon || (T('level') + ' ' + level);
  el('ovtitle').textContent = o.title;
  el('ovtext').textContent = o.text;
  el('ovstars').innerHTML = [1, 2, 3].map(i => starSvg(o.stars >= i)).join('');
  const tierBox = el('ovtier');
  if (tierBox) {
    if (o.tier) {
      tierBox.classList.remove('hidden');
      tierBox.dataset.t = String(o.tier);
      tierBox.textContent = T('tier' + Math.max(1, Math.min(4, o.tier)));
    } else tierBox.classList.add('hidden');
  }
  const stBox = el('ovstats');
  if (stBox) {
    if (o.stats && o.stats.length) {
      stBox.classList.remove('hidden');
      stBox.innerHTML = o.stats.map(x => '<span><b>' + x.v + '</b><i>' + x.k + '</i></span>').join('');
    } else stBox.classList.add('hidden');
  }
  const coinBox = el('ovcoins');
  if (coinBox) coinBox.style.display = o.coins ? 'inline-flex' : 'none';
  el('ovcoinval').textContent = '+' + (o.coins || 0);

  const cs = el('ovchest');
  if (cs) {
    if (o.chest) {
      cs.classList.remove('hidden', 'got');
      cs.innerHTML = CHEST_SVG + '<span>' + T('chest') + ' · ' + T('level') + ' ' + o.chest + '</span>' +
        '<button class="bigbtn" id="ovchestbtn">' + T('chestOpen') + '</button>';
      const cb = el('ovchestbtn');
      if (cb) cb.onclick = () => openChest(o.chest, cb);
    } else {
      const nx = nextChestLevel();
      if (nx) { cs.classList.remove('hidden'); cs.classList.add('got'); cs.innerHTML = CHEST_SVG + '<span>' + T('nextChest').replace('%s', nx) + '</span>'; }
      else cs.classList.add('hidden');
    }
  }
  const nx = el('ovnext');
  if (nx) {
    if (o.next) { nx.classList.remove('hidden'); nx.innerHTML = o.next; }
    else nx.classList.add('hidden');
  }
  const b1 = el('ovbtn'), b2 = el('ovbtn2'), b3 = el('ovbtn3');
  b1.textContent = o.main.label; b1.onclick = o.main.cb;
  b2.textContent = o.alt ? o.alt.label : ''; b2.onclick = o.alt ? o.alt.cb : null;
  b2.classList.toggle('hidden', !o.alt);
  if (o.ad) { b3.textContent = o.ad.label; b3.onclick = () => o.ad.cb(b3); b3.classList.remove('hidden'); b3.disabled = false; }
  else { b3.classList.add('hidden'); }
  ov.classList.remove('hidden');
}
const CHEST_SVG = '<svg class="chest-ic" viewBox="0 0 24 24" width="34" height="34"><path d="M3 10.5C3 7.5 6 5.5 12 5.5s9 2 9 5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-8.5Z" fill="#8a4a1e" stroke="#ffd76a" stroke-width="1.4"/><path d="M3 11h18" stroke="#ffd76a" stroke-width="1.4"/><rect x="10.4" y="8.6" width="3.2" height="5.4" rx="1.2" fill="#ffd76a"/><path d="M5 14h14" stroke="rgba(255,215,106,.5)" stroke-width="1.2"/></svg>';
async function openChest(lvl, btn) {
  if (!lvl || chestsOpened.has(lvl)) return;
  chestsOpened.add(lvl);
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  const cs = el('ovchest');
  if (cs) cs.classList.add('opening');
  play('reward', .8);
  await delay(420);
  const prizes = CHEST_TABLE(chapterOf(lvl));
  let label = [];
  for (const pr of prizes) {
    if (pr.kind === 'coins') { coins += pr.n; label.push('+' + pr.n + ' ' + T('coins')); }
    else { inventory[pr.kind] = (inventory[pr.kind] | 0) + pr.n; label.push(T(pr.kind) + ' ×' + pr.n); }
  }
  grantReward({ kind: 'coins', n: 0 });
  analytics.track('chest_open', { level: lvl, chapter: chapterOf(lvl) });
  if (cs) {
    cs.classList.remove('opening'); cs.classList.add('got');
    cs.innerHTML = CHEST_SVG + '<span>' + T('chestGot') + ' · ' + label.join(' · ') + '</span>';
  }
  confetti(el('overlay'));
  flyTickets(5);
  updateHUD(); saveProgress();
  setTimeout(() => toast(T('chapterDone').replace('%s', chapterOf(lvl) + 1)), 2100);
}
function hideOverlay() { el('overlay').classList.add('hidden'); }
function hideModal(id) { const m = el(id); if (m) m.classList.add('hidden'); }

/* ---------------- daily / wheel of fortune ---------------- */
const DAY_MS = 864e5;
const todayKey = () => new Date().toISOString().slice(0, 10);
function daysBetween(a, b) {
  if (!a || !b) return 99;
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / DAY_MS);
}
const PRIZES = [
  { kind: 'coins', n: 50 }, { kind: 'shuffle', n: 1 }, { kind: 'coins', n: 100 }, { kind: 'hammer', n: 1 },
  { kind: 'coins', n: 30 }, { kind: 'rainbow', n: 1 }, { kind: 'coins', n: 200 }, { kind: 'shuffle', n: 2 }
];
function prizeLabel(p) {
  if (p.kind === 'coins') return T('prizeTickets').replace('%s', p.n);
  return T('prizeBooster').replace('%s', T(p.kind)).replace('%s', p.n);
}
function prizeIcon(p) {
  if (p.kind === 'coins') return '<img src="assets/tiles/coin.png" alt=""/>';
  const src = document.getElementById('b-' + p.kind);
  const svg = src && src.querySelector('svg');
  return svg ? svg.outerHTML.replace('<svg', '<svg width="34" height="34"') : '';
}
function wheelAvailable() { return wheelDate !== todayKey(); }
function buildWheel() {
  const rot = el('wheelrot'); if (!rot) return;
  rot.style.transition = 'none'; rot.style.transform = 'rotate(0deg)';
  rot.querySelectorAll('.seg').forEach(s => s.remove());
  PRIZES.forEach((p, i) => {
    const s = document.createElement('div');
    s.className = 'seg';
    const ang = i * 45 + 22.5;
    s.style.transform = 'rotate(' + ang + 'deg)';
    s.innerHTML = '<span class="seg-in" style="transform:rotate(' + (-ang) + 'deg)">' +
      prizeIcon(p) + '<b>' + (p.kind === 'coins' ? '+' + p.n : '×' + p.n) + '</b></span>';
    rot.appendChild(s);
  });
  const w = el('wheeldisc');
  if (w && !w.querySelector('.wheel-bulbs')) {
    const bulbs = document.createElement('div'); bulbs.className = 'wheel-bulbs';
    const R = 0.5;
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('i');
      const a = (i / 16) * Math.PI * 2;
      b.style.left = 'calc(50% + ' + (Math.cos(a) * 47) + '% - 4px)';
      b.style.top = 'calc(50% + ' + (Math.sin(a) * 47) + '% - 4px)';
      b.style.animationDelay = (i * .12) + 's';
      bulbs.appendChild(b);
    }
    w.appendChild(bulbs);
  }
}
const STREAK_DAY = [30, 50, 80, 120, 180, 250, 400];
function renderDayCal() {
  const box = el('daycal'); if (!box) return;
  const day = Math.max(0, Math.min(7, streak));
  box.innerHTML = STREAK_DAY.map((v, i) =>
    '<span class="dc' + (i < day ? ' got' : '') + (i === day ? ' next' : '') + '">' +
    '<b>' + (i + 1) + '</b><i>+' + v + '</i></span>').join('') +
    '<span class="dc boss' + (day === 7 ? ' got' : '') + '"><b>★</b><i>' + T('bundle') + '</i></span>';
}
function openWheel() {
  buildWheel();
  renderDayCal();
  const avail = wheelAvailable();
  const line = el('wheelline'), spin = el('wheelspin');
  if (avail) {
    line.textContent = T('wheelStreak').replace('%s', streak + 1);
    spin.disabled = false; spin.textContent = T('spin');
  } else {
    const d = daysBetween(wheelDate, todayKey());
    line.textContent = T('wheelComeback').replace('%s', d <= 0 ? '1d' : d + 'd');
    spin.disabled = true; spin.textContent = T('claim');
  }
  renderSkipBtn();
  el('wheel').classList.remove('hidden');
}
function renderSkipBtn() {
  const b = el('skipbtn'); if (!b) return;
  const gap = daysBetween(wheelDate, todayKey());
  const can = skipTickets > 0 && streak > 0 && gap >= 2 && gap <= 6 && wheelAvailable();
  b.classList.toggle('hidden', !can);
  b.textContent = T('skipWord').replace('%s', skipTickets);
  const note = el('skipnote'); if (note) note.textContent = T('skipNote');
  const ss = el('setskips'); if (ss) ss.textContent = String(skipTickets);
}
function useSkipTicket() {
  if (skipTickets <= 0) { toast(T('skipNone')); return; }
  const gap = daysBetween(wheelDate, todayKey());
  if (gap < 2) { renderSkipBtn(); return; }
  skipTickets--;
  /* pretend the missed day never happened: the next spin continues the same chain */
  wheelDate = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
  play('reward', .7);
  toast(T('skipUsed').replace('%s', streak + 1));
  renderDayCal(); renderSkipBtn(); saveProgress();
}
async function spinWheel(btn) {
  if (!wheelAvailable() || adBusy) return;
  const rot = el('wheelrot');
  const idx = (Math.random() * PRIZES.length) | 0;
  const target = 360 * 6 + (360 - (idx * 45 + 22.5)) + (Math.random() * 20 - 10);
  btn.disabled = true;
  el('wheelhub').textContent = '?';
  play('shuffle', .6);
  rot.style.transition = 'none'; rot.style.transform = 'rotate(0deg)';
  void rot.offsetWidth;
  rot.style.transition = 'transform 4.2s cubic-bezier(.12,.9,.16,1)';
  rot.style.transform = 'rotate(' + target + 'deg)';
  analytics.track('wheel_spin', { prize: PRIZES[idx].kind, n: PRIZES[idx].n });
  await delay(4400);
  grantPrize(PRIZES[idx]);
  el('wheelhub').textContent = PRIZES[idx].kind === 'coins' ? '+' + PRIZES[idx].n : '★';
  play('reward', .8);
  confetti(el('wheel'));
  const prev = streak;
  streak = daysBetween(wheelDate, todayKey()) === 1 ? streak + 1 : 1;
  wheelDate = todayKey();
  const bonus = STREAK_DAY[Math.min(6, streak - 1)] + (streak >= 3 ? 20 * streak : 0);
  coins += bonus;
  if (streak % 7 === 0) {
    inventory.hammer += 2; inventory.rainbow += 1; inventory.shuffle += 2;
    skipTickets = Math.min(9, skipTickets + 1);
    setTimeout(() => toast(T('skipGot').replace('%s', skipTickets)), 1200);
  }
  flyTickets(4);
  setTimeout(() => toast(T('streakDay').replace('%s', streak).replace('%s', bonus)), 500);
  renderDayCal();
  saveProgress();
  el('wheelline').textContent = prizeLabel(PRIZES[idx]);
  const spin = el('wheelspin');
  spin.textContent = T('claim'); spin.disabled = true;
  updateHUD();
}
function grantPrize(p) {
  if (p.kind === 'coins') { coins += p.n; flyTickets(3); }
  else { inventory[p.kind] = (inventory[p.kind] | 0) + p.n; }
  updateHUD();
}
function checkDailyReward(force) {
  if (!wheelAvailable()) return;
  if (!force && completedLevels.size === 0) return;   // новичок сначала играет
  setTimeout(() => openWheel(), 600);
}

/* ---------------- boosters ---------------- */
const BOOST = {
  hammer: { cost: 40, label: 'hammer' },
  rainbow: { cost: 80, label: 'rainbow' },
  shuffle: { cost: 30, label: 'shuffle' }
};
function bindBoosters() {
  for (const id of ['hammer', 'rainbow', 'shuffle']) {
    const b = el('b-' + id);
    if (!b) continue;
    b.addEventListener('click', () => {
      if (running) return;
      const cfg = BOOST[id];
      if ((inventory[id] | 0) <= 0 && coins < cfg.cost) { toast(T('needCoins')); play('click', .4); return; }
      if (id === 'shuffle') {
        payBooster(id);
        (async () => { running = true; play('shuffle', .7); reshuffleTypes(); render();
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) setFall(r, c, 1 + (c % 3));
          await delay(340); running = false; checkState(); armHint(); updateHUD(); })();
        return;
      }
      targetMode = (targetMode === id) ? null : id;
      document.querySelectorAll('.boost').forEach(x => x.classList.remove('active'));
      if (targetMode) { b.classList.add('active'); toast(T('boostOn')); play('click', .5); }
    });
  }
}
function payBooster(id) {
  if ((inventory[id] | 0) > 0) inventory[id]--;
  else coins = Math.max(0, coins - BOOST[id].cost);
  updateHUD(); saveProgress();
}
async function useBoosterOn(r, c) {
  const mode = targetMode;
  targetMode = null;
  if (!mode || !BOOST[mode]) return;
  document.querySelectorAll('.boost').forEach(x => x.classList.remove('active'));
  if (isWall(r, c) || bal[r][c]) { if (mode === 'hammer' && bal[r][c]) { popBalloon(r, c); } else return; }
  if (board[r][c] < 0 && !spec[r][c]) return;
  payBooster(mode);
  running = true;
  let set = new Set();
  if (mode === 'hammer') {
    play('arcade', .7);
    set.add(cellKey(r, c));
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && spec[nr][nc]) set.add(cellKey(nr, nc));
    }
  } else {
    play('magic', .7);
    const t = spec[r][c] ? spec[r][c].tile : board[r][c];
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++)
      if (board[rr][cc] === t || (spec[rr][cc] && spec[rr][cc].tile === t)) set.add(cellKey(rr, cc));
    set.add(cellKey(r, c));
    shake();
  }
  set = detonate(set);
  fudgeTouched = new Set();
  moveCleared = 0; moveSpecials = 0; moveLit = 0;
  await clearAndFall(set, 1);
  await resolve();
  bandTick();
  if (!allGoalsDone() && movesLeft > 0) await carnivalTick();
  running = false;
  checkState(); armHint(); updateHUD();
}

async function loadLevels() {
  try {
    const res = await fetch('levels.json', { cache: 'no-store' });
    if (res.ok) { const j = await res.json(); if (Array.isArray(j) && j.length) LEVELS = j; }
  } catch (e) { console.warn('levels fetch failed, using procedural'); }
  if (!Array.isArray(LEVELS) || !LEVELS.length) LEVELS = PROCEDURAL.slice();
  CH_SIG = {};
  normalizeLevels();
}
/* A level may describe its goals either with the old flat counters (iceCount, ...) or with
   the goals[] array. When only the array is there, the blockers were never placed and the
   goal became impossible - so the counters are derived from the goals once, at load. */
function normalizeLevels() {
  const FIELD = { ice: 'iceCount', chain: 'chainCount', fudge: 'fudgeCount', balloon: 'balloonCount', target: 'targetCount' };
  for (const lv of LEVELS) {
    if (!lv || !Array.isArray(lv.goals)) continue;
    for (const g of lv.goals) {
      const f = FIELD[g.kind];
      if (!f) continue;
      lv[f] = Math.max(lv[f] | 0, (g.count | 0) + (g.kind === 'ice' ? 2 : 0));
    }
    /* a rocket goal must be beatable: the level always plants two rockets MORE than
       it asks to launch, and gives a fuse long enough to reach them */
    const fwNeed = lv.goals.filter(g => g.kind === 'firework').reduce((a, g) => a + (g.count | 0), 0);
    if (fwNeed) {
      lv.firework = Math.max(lv.firework | 0, fwNeed + 2);
      lv.fuse = Math.max(lv.fuse | 0, 4);
    }
    if (lv.goals.some(g => g.kind === 'belt') && !(lv.belts | 0)) lv.belts = 6;
  }
}

/* ---------------- C4: carnival journal ----------------
   Lifetime counters, kept in the save blob. Not a leaderboard: a receipt the player
   can read back, which is what makes a 200-level game feel like a run, not a slot. */
const JKEYS = ['plays', 'wins', 'tickets', 'fw', 'levers', 'tricks', 'best', 'daily', 'stars', 'rides'];
let journal = {};
function resetJournal() { journal = {}; for (const k of JKEYS) journal[k] = 0; }
resetJournal();
function bumpJournal(patch) {
  for (const k in patch) {
    if (k === 'best') journal.best = Math.max(journal.best | 0, patch.best | 0);
    else journal[k] = (journal[k] | 0) + (patch[k] | 0);
  }
}
function showJournal() {
  const grid = el('journalgrid'); if (!grid) return;
  const fmt = n => (n | 0).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US');
  const rows = [
    ['jPlays', fmt(journal.plays)], ['jWins', fmt(journal.wins)], ['jStars', fmt(totalStars())],
    ['jTickets', fmt(journal.tickets)], ['jBest', fmt(journal.best) + ' \u00d7'],
    ['jFw', fmt(journal.fw)], ['jLevers', fmt(journal.levers)], ['jTricks', fmt(journal.tricks)],
    ['jRides', fmt(journal.rides)], ['jDaily', fmt(journal.daily)]
  ];
  grid.innerHTML = rows.map(r => '<div class="jrow"><span class="jk">' + T(r[0]) +
    '</span><span class="jv">' + r[1] + '</span></div>').join('');
  const f = el('journalfoot'); if (f) f.textContent = T('journalFoot');
  el('journal').classList.remove('hidden');
  play('click', .6);
}

/* ---------------- C1: ride of the day ----------------
   Every calendar day the carnival re-rigs one of its rides. The same modifier lands on
   every player at once, it is applied on top of the 200 authored levels (no new levels),
   and the first win of the day pays double tickets. */
const DAILY_RIDES = [
  { k: 'fw',       apply: c => { c.firework = Math.max(c.firework | 0, 4); c.fuse = Math.max(c.fuse | 0, 4); } },
  { k: 'mirror',   apply: c => { if (!c.mirror) c.mirror = 'v'; } },
  { k: 'belts',    apply: c => { c.belts = Math.max(c.belts | 0, 8); } },
  { k: 'frost',    apply: c => { c.iceCount = (c.iceCount | 0) + 5; } },
  { k: 'chains',   apply: c => { c.chainCount = (c.chainCount | 0) + 4; } },
  { k: 'balloons', apply: c => { c.balloonCount = (c.balloonCount | 0) + 3; } },
  { k: 'spot',     apply: c => { c.spotlight = true; } },
  { k: 'tilt',     apply: c => { c.tiltEvery = Math.min(c.tiltEvery | 0 || 8, 8); } },
  { k: 'tricks',   apply: c => { c.tricks = true; } },
  { k: 'carousel', apply: c => { c.carousel = true; } }
];
let dailyMode = false;
/* todayKey() already exists further up: the wheel uses the same day stamp */
function dailyRide() {
  const t = todayKey();
  let h = 7;
  for (let i = 0; i < t.length; i++) h = (h * 131 + t.charCodeAt(i)) >>> 0;
  return DAILY_RIDES[h % DAILY_RIDES.length];
}
function dailyClaimed() { return dailyDate === todayKey(); }
function rideLabel(k) { return T('ride' + k.charAt(0).toUpperCase() + k.slice(1)); }
function paintDaily() {
  const b = el('dailybtn'); if (!b) return;
  const r = dailyRide();
  const nm = el('dailyname'), nt = el('dailynote');
  if (nm) nm.textContent = rideLabel(r.k);
  if (nt) nt.textContent = dailyClaimed() ? T('dailyDone') : T('dailyNote');
  b.classList.toggle('done', dailyClaimed());
  b.classList.remove('hidden');
}

/* ---------------- shop ---------------- */
function showShop() {
  const grid = el('shopgrid'); if (!grid) return;
  grid.innerHTML = '';
  for (const id in BOOST) {
    const cfg = BOOST[id];
    const d = document.createElement('div');
    d.className = 'shop-item';
    d.innerHTML = '<div class="si-ic">' + document.getElementById('b-' + id).querySelector('svg').outerHTML + '</div>' +
      '<h4>' + T(cfg.label) + '</h4>' +
      '<p>' + shopDesc(id) + '</p>' +
      '<span class="qty-have">' + T('have') + ': ' + (inventory[id] | 0) + '</span>' +
      '<button class="buybtn">' + T('buy') + ' · ' + cfg.cost + '</button>';
    const btn = d.querySelector('.buybtn');
    btn.disabled = coins < cfg.cost;
    btn.onclick = () => {
      if (coins < cfg.cost) { play('click', .4); return; }
      coins -= cfg.cost; inventory[id] = (inventory[id] | 0) + 1;
      play('reward', .7); analytics.track('buy_booster', { id, cost: cfg.cost });
      updateHUD(); saveProgress(); showShop();
    };
    grid.appendChild(d);
  }
  renderBundles(grid);
  el('shopcoins').textContent = coins;
  el('shop').classList.remove('hidden');
}
const BUNDLES = [
  { id: 'mix3', kind: 'mix', n: 1, price: 150, save: 20 },
  { id: 'hammer3', kind: 'hammer', n: 3, price: 100, save: 20 },
  { id: 'rainbow3', kind: 'rainbow', n: 3, price: 200, save: 40 }
];
function renderBundles(grid) {
  for (const b of BUNDLES) {
    const d = document.createElement('div');
    d.className = 'shop-item bundle';
    const ic = b.kind === 'mix'
      ? '<svg viewBox="0 0 24 24" width="34" height="34"><circle cx="8" cy="8" r="5" fill="#ff5ea7"/><circle cx="16" cy="8" r="5" fill="#6ee7ff"/><circle cx="12" cy="15.5" r="5" fill="#ffd76a"/></svg>'
      : document.getElementById('b-' + b.kind).querySelector('svg').outerHTML;
    d.innerHTML = '<div class="si-ic">' + ic + '</div><h4>' + T('bundle') + '</h4>' +
      '<p>' + (b.kind === 'mix'
        ? (lang === 'ru' ? 'По молотку, радуге и перемешивателю.' : 'One hammer, one rainbow, one shuffle.')
        : T(b.kind) + ' ×' + b.n) + '</p>' +
      '<span class="qty-have">' + T('have') + ': ' + (b.kind === 'mix' ? 1 : (inventory[b.kind] | 0)) + '</span>' +
      '<button class="buybtn"><s>' + (b.price + b.save) + '</s> ' + b.price + '</button>';
    const btn = d.querySelector('.buybtn');
    btn.disabled = coins < b.price;
    btn.onclick = () => {
      if (coins < b.price) return;
      coins -= b.price;
      if (b.kind === 'mix') { inventory.hammer++; inventory.rainbow++; inventory.shuffle++; }
      else inventory[b.kind] = (inventory[b.kind] | 0) + b.n;
      play('reward', .75); analytics.track('buy_bundle', { id: b.id, cost: b.price });
      updateHUD(); saveProgress(); showShop();
    };
    grid.appendChild(d);
  }
}
function shopDesc(id) {
  if (id === 'hammer') return lang === 'ru' ? 'Разбивает одно лакомство и соседние спец-фигуры.' : 'Smashes one treat and nearby special pieces.';
  if (id === 'rainbow') return lang === 'ru' ? 'Убирает все лакомства выбранного цвета.' : 'Clears every treat of the chosen colour.';
  return lang === 'ru' ? 'Перемешивает всё поле, если ходов не осталось.' : 'Reshuffles the whole board.';
}

/* ---------------- level select ---------------- */
const SVG_SM = {};   // 15px copies of the goal glyphs, built once
function smSvg(svg) {
  return SVG_SM[svg] || (SVG_SM[svg] = svg.replace('width="24" height="24"', 'width="15" height="15"'));
}
const BADGE_CACHE = {};   // a level's badge never changes once levels.json is loaded
function levelBadge(n, unlocked) {
  if (!unlocked) return '<svg class="lvl-lock" viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4.5" y="10" width="15" height="10.5" rx="3" fill="currentColor"/></svg>';
  let html = BADGE_CACHE[n];
  if (html) return html;
  const cfg = getLevelCfg(n);
  const goals = buildObjectives(cfg);
  const parts = [];
  for (const o of goals) {
    if (o.kind === 'score') parts.push('★' + o.goal);
    else if (o.kind === 'ice') parts.push(smSvg(ICE_SVG) + o.need);
    else if (o.kind === 'chain') parts.push(smSvg(CHAIN_SVG) + o.need);
    else if (o.kind === 'fudge') parts.push(smSvg(FUDGE_SVG) + o.need);
    else if (o.kind === 'target') parts.push(smSvg(TARGET_SVG) + o.need);
    else if (o.kind === 'balloon') parts.push(smSvg(BALLOON_SVG) + o.need);
    else if (o.kind === 'firework') parts.push(smSvg(FW_SVG) + o.need);
    else if (o.kind === 'belt') parts.push(smSvg(BELT_SVG) + o.need);
    else parts.push('<img class="lvl-ic" loading="lazy" decoding="async" src="' + tileFor(o.tile, cfg.types, chapterOf(n) % PALETTES.length) + '" alt=""/>' + o.need);
  }
  BADGE_CACHE[n] = parts.join('<i class="lvl-plus">+</i>');
  return BADGE_CACHE[n];
}
function showLevelSelect() {
  const grid = el('lvlselgrid'); if (!grid) return;
  grid.innerHTML = '';
  const total = totalLevels();
  const maxDone = completedLevels.size ? Math.max(...completedLevels) : 0;
  const maxUnlocked = Math.max(1, level, maxDone + 1);
  const frag = document.createDocumentFragment();
  let lastCh = -1;
  for (let n = 1; n <= total; n++) {
    const ch = chapterOf(n);
    if (ch !== lastCh) {
      lastCh = ch;
      let chStars = 0;
      for (let k = ch * 10 + 1; k <= ch * 10 + 10 && k <= total; k++) chStars += starsByLevel[k] || 0;
      const h = document.createElement('div');
      h.className = 'lvl-chapter' + (ch === chapterOf(level) ? ' cur' : '');
      const sig = chapterSignature(ch);
      h.innerHTML = '<b>' + T('chapter') + ' ' + (ch + 1) + ' · ' + chapterName(n) + '</b>' +
        (sig ? '<span class="lvl-sig">' + T('sig' + sig) + '</span>' : '') +
        '<span>' + chStars + ' / 30 ' + T('starsWord') + '</span>';
      frag.appendChild(h);
    }
    const st = starsByLevel[n] || 0;
    const done = completedLevels.has(n);
    const unlocked = n <= maxUnlocked;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lvl-cell' + (done ? ' done' : '') + (n === level ? ' cur' : '') + (unlocked ? '' : ' locked') +
      (isFinale(n) ? ' finale' : '') + (isFinale(n) && chestsOpened.has(n) ? ' chest-got' : '');
    b.disabled = !unlocked;
    b.innerHTML = '<span class="lvl-n">' + n + '</span>' +
      '<span class="lvl-mini">' + [1, 2, 3].map(i => starDot(unlocked && st >= i)).join('') + '</span>' +
      '<span class="lvl-obj">' + levelBadge(n, unlocked) + '</span>' +
      (isFinale(n) ? '<span class="lvl-chest' + (chestsOpened.has(n) ? ' got' : '') + '">' + CHEST_SVG.replace('width="34" height="34"', 'width="16" height="16"') + '</span>' : '');
    b.onclick = () => { play('click', .5); goToLevel(n); };
    frag.appendChild(b);
  }
  grid.appendChild(frag);
  const sum = el('lvlsum');
  if (sum) {
    const nx = nextChestLevel();
    sum.innerHTML = '<span>' + T('levelsDone').replace('%s', completedLevels.size).replace('%s', total) + '</span>' +
      '<span>★ ' + T('starsOf').replace('%s', totalStars()).replace('%s', total * 3) + '</span>' +
      (nx ? '<span class="sum-chest">' + CHEST_SVG.replace('width="34" height="34"', 'width="16" height="16"') + T('nextChest').replace('%s', nx) + '</span>' : '');
  }
  renderPassport();
  el('lvlsel').classList.remove('hidden');
  const cur = grid.querySelector('.lvl-cell.cur');
  if (cur && cur.scrollIntoView) setTimeout(() => { try { cur.scrollIntoView({ block: 'center' }); } catch (e) {} }, 60);
}

/* ---------------- SDK adapter (Yandex Games SDK v2) ----------------
   On Yandex the platform itself serves the real SDK at /sdk.js, so the package
   must NOT ship its own sdk.js. Off Yandex (local QA server, file://, a mirror)
   there is no /sdk.js at all: the game then runs against localSDK(), where cloud
   save becomes localStorage and ads are instant no-ops. Only documented v2
   method names are used below (features.GameplayAPI, features.LoadingAPI,
   adv.showFullscreenAdv/showRewardedVideo, feedback.canReview/requestReview,
   leaderboards.setScore, on/off game_api_pause|game_api_resume). */
let gameplayOn = false, gameplayWanted = false, offlineSDK = false;
function sdkGameplay(on) {
  if (gameplayOn === on) return;
  gameplayOn = on;
  try {
    const f = ysdk && ysdk.features && ysdk.features.GameplayAPI;
    if (!f) return;
    if (on) f.start(); else f.stop();
  } catch (e) {}
}
function localSDK() {
  const key = LS_KEY, noop = () => {};
  const calls = (window.__sdkCalls = []);
  const mark = n => () => { calls.push(n); };
  const read = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } };
  const nl = ((typeof navigator !== 'undefined' && navigator.language) || 'ru').slice(0, 2).toLowerCase();
  const lang = (nl !== 'ru' && nl !== 'en' && L[nl]) ? nl : 'ru';
  const cb = o => (o && o.callbacks) || o || {};
  return {
    environment: { i18n: { lang }, appInfo: { appId: 'local' }, paymentsExists: false },
    features: { LoadingAPI: { ready: mark('loading_ready') }, GameplayAPI: { start: mark('gameplay_start'), stop: mark('gameplay_stop') }, Analytics: { sendEvent: noop } },
    adv: {
      showFullscreenAdv: o => { calls.push('interstitial'); const c = cb(o); c.onOpen && c.onOpen(); c.onClose && c.onClose(); },
      showRewardedVideo: o => { calls.push('rewarded'); const c = cb(o); c.onOpen && c.onOpen(); c.onRewarded && c.onRewarded(); c.onClose && c.onClose(); },
      getBannerAdvStatus: () => Promise.resolve({ status: 'v1', enabled: false })
    },
    feedback: { canReview: () => Promise.resolve({ value: false, reason: 'NOT_SHOWED' }), requestReview: () => ({ sentFeedback: false }) },
    leaderboards: {
      setScore: (name, score) => { calls.push('lb:' + name + ':' + score); return Promise.resolve(); },
      getDescription: n => Promise.resolve({ id: n, name: 'QA table', defaultLanguage: 'ru' }),
      getEntries: () => Promise.resolve({ entries: [] })
    },
    on: noop, off: noop,
    share: o => { calls.push('share'); return Promise.resolve({ notSupported: true }); },
    getPlayer: () => Promise.resolve({
      getData: () => Promise.resolve(read()),
      setData: d => { try { localStorage.setItem(key, JSON.stringify(Object.assign(read(), d || {}))); } catch (e) {} return Promise.resolve(); }
    })
  };
}

/* ---------------- ads ---------------- */
function rewarded(btn, cb) {
  if (!ysdk || !ysdk.adv || !ysdk.adv.showRewardedVideo) { cb(); if (btn) btn.classList.add('hidden'); return; }
  if (adBusy) return;
  adBusy = true;
  if (btn) btn.disabled = true;
  const backToGameplay = gameplayOn;
  sdkGameplay(false);
  let done = false, opened = false, paid = false;
  const finish = ok => {
    if (done) return; done = true; adBusy = false;
    if (backToGameplay) sdkGameplay(true);
    if (btn) { btn.disabled = false; if (ok) btn.classList.add('hidden'); }
    if (ok) cb();
    else if (opened) toast(T('adSkip'));   /* closed the clip early: no prize */
  };
  try {
    ysdk.adv.showRewardedVideo({
      callbacks: {
        /* п.1.12: the prize is paid ONLY for a completed view. A clip closed
           before the end fires onClose without onRewarded - no prize then. */
        onOpen: () => { opened = true; pauseAllAudio(); },
        onRewarded: () => { paid = true; finish(true); },
        onClose: () => { resumeAllAudio(); finish(paid); },
        onError: () => { resumeAllAudio(); finish(false); }
      }
    });
  } catch (e) { finish(false); }
  /* watchdog: a silent SDK must free the button, but п.1.12 still forbids a prize
     unless the SDK explicitly fired onRewarded. */
  setTimeout(() => finish(false), AD_WATCHDOG_MS);
}
function maybeInterstitial(cb) {
  sinceInterstitial++;
  const every = 3;
  if (level < 3 || !ysdk || !ysdk.adv || !ysdk.adv.showFullscreenAdv || sinceInterstitial < every) { cb(); return; }
  sinceInterstitial = 0;
  let done = false;
  const go = () => { if (!done) { done = true; cb(); } };
  try {
    ysdk.adv.showFullscreenAdv({ callbacks: { onOpen: pauseAllAudio, onClose: () => { resumeAllAudio(); go(); }, onError: go } });
  } catch (e) { go(); }
  setTimeout(go, 12000);
}
function askRating() {
  try {
    const fb = ysdk && ysdk.feedback;
    if (!fb || !fb.requestReview) return;
    if (fb.canReview) {
      fb.canReview().then(r => {
        if (r && r.value !== false) { rated = true; fb.requestReview(); }
      }).catch(() => {});
      return;
    }
    rated = true; fb.requestReview();
  } catch (e) {}
}

/* ---------------- share (ysdk.share) ----------------
   The share dialog is not an ad, so the gameplay markup is left alone. imageUrl
   must be an absolute URL — it is built at runtime from location.origin, the
   package itself never contains an absolute external URL (п.1.7). */
let shareBusy = false;
function shareAvailable() { return !!(ysdk && typeof ysdk.share === 'function'); }
function shareGame() {
  if (!shareAvailable() || shareBusy) return;
  shareBusy = true; setTimeout(() => { shareBusy = false; }, 2000);
  const origin = (location && /^https?:$/.test(location.protocol) && location.origin && location.origin !== 'null') ? location.origin : '';
  const opts = { title: T('shareTitle'), description: T('shareDesc').replace('{n}', String(level)) };
  if (origin) { opts.imageUrl = origin + '/assets/share.png'; opts.shareUrl = origin + '/'; }
  try {
    const p = ysdk.share(opts);
    if (p && p.then) p.then(() => {}, () => {});
  } catch (e) {}
  analytics.track('share', { level });
}

/* ---------------- progress / SDK ----------------
   The save lives in TWO places: the Yandex cloud blob (player.setData) and a
   localStorage mirror. The mirror is written synchronously on every change, so a
   run survives a reload, a crash, a tab swipe — and a guest session, because on
   Yandex getPlayer() can reject or return an anonymous player that has no cloud
   storage at all. On boot we apply the local mirror first (instant, no network),
   then ask the cloud and keep whichever copy is fresher (savedAt) — so switching
   devices never throws away the better run. */
const LS_KEY = 'candy_carnival_save_v1';
const SAVE_KEYS = ['level', 'coins', 'dailyDate', 'wheelDate', 'streak', 'inventory', 'completed',
  'stars', 'sound', 'music', 'vibe', 'skips', 'chests', 'rewards', 'chapters', 'journal', 'savedAt'];
function saveBlob() {
  return {
    level, coins, dailyDate, wheelDate, streak,
    inventory: Object.assign({}, inventory), completed: [...completedLevels], stars: starsByLevel,
    sound: soundOn, music: musicOn, vibe: vibeOn, skips: skipTickets,
    chests: [...chestsOpened], rewards: [...claimedRewards], chapters: [...claimedChapters],
    journal: Object.assign({}, journal), savedAt: Date.now()
  };
}
function localSave(blob) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(blob || saveBlob())); return true; }
  catch (e) { return false; }   /* private mode / quota — cloud save still works */
}
function localLoad() {
  try {
    let d = JSON.parse(localStorage.getItem(LS_KEY));
    if (d && typeof d === 'object') return d;
    d = JSON.parse(localStorage.getItem('candy_carnival_save'));   /* pre-v6.3 mirror */
    return (d && typeof d === 'object') ? d : null;
  } catch (e) { return null; }
}
/* how far a save blob got — used only to break ties between the two copies */
function progressRank(d) {
  if (!d) return -1;
  let r = (typeof d.level === 'number' ? d.level : 1);
  if (Array.isArray(d.completed)) r += d.completed.length * 3;
  if (d.stars && typeof d.stars === 'object') for (const k in d.stars) r += d.stars[k] | 0;
  if (d.journal && typeof d.journal === 'object') r += (d.journal.plays | 0) / 50;
  return r;
}
/* one blob -> runtime state. Defaults first, so a partial blob can never leak
   leftovers of the previous copy into the game. */
function applySave(d) {
  if (!d) return;
  level = (typeof d.level === 'number' && d.level > 1) ? d.level : 1;
  coins = typeof d.coins === 'number' ? d.coins : 0;
  dailyDate = typeof d.dailyDate === 'string' ? d.dailyDate : '';
  wheelDate = typeof d.wheelDate === 'string' ? d.wheelDate : '';
  streak = typeof d.streak === 'number' ? d.streak : 0;
  inventory = Object.assign({ hammer: 0, rainbow: 0, shuffle: 0 }, (d.inventory && typeof d.inventory === 'object') ? d.inventory : {});
  completedLevels = new Set(Array.isArray(d.completed) ? d.completed : []);
  starsByLevel = (d.stars && typeof d.stars === 'object') ? d.stars : {};
  soundOn = d.sound !== false;
  musicOn = d.music !== false;
  vibeOn = d.vibe !== false;
  skipTickets = Math.max(0, (typeof d.skips === 'number' ? d.skips : 0) | 0);
  chestsOpened = new Set(Array.isArray(d.chests) ? d.chests : []);
  claimedRewards = new Set(Array.isArray(d.rewards) ? d.rewards : []);
  claimedChapters = new Set(Array.isArray(d.chapters) ? d.chapters : []);
  resetJournal();
  if (d.journal && typeof d.journal === 'object') for (const k of JKEYS) journal[k] = d.journal[k] | 0;
}
function loadLocal() {
  const d = localLoad();
  if (d) applySave(d);
  return d;
}
function loadProgress() {
  const local = loadLocal();
  if (!player) return Promise.resolve();
  return player.getData(SAVE_KEYS).then(d => {
    if (!d) return;
    const ct = typeof d.savedAt === 'number' ? d.savedAt : 0;
    const lt = local && typeof local.savedAt === 'number' ? local.savedAt : 0;
    let useCloud;
    if (!local) useCloud = true;
    else if (ct && ct > lt + 1500) useCloud = true;      /* cloud is clearly newer (other device) */
    else if (ct && lt > ct + 1500) useCloud = false;     /* this device is newer */
    else useCloud = progressRank(d) >= progressRank(local);
    if (useCloud) { applySave(d); localSave(d); }        /* mirror the cloud copy locally */
  }).catch(() => {});
}
let saveTimer = null;
function saveProgress() {
  localSave();                       /* always: instant, offline, guest-safe */
  if (!player) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { player.setData(saveBlob()).then(() => {}).catch(() => {}); } catch (e) {}
  }, 350);
}
/* leaving the page: no debounce, write both copies right now */
function flushSave() {
  clearTimeout(saveTimer); saveTimer = null;
  localSave();
  if (!player) return;
  try { player.setData(saveBlob()).then(() => {}).catch(() => {}); } catch (e) {}
}
/* Leaderboards: the real SDK signature is setScore(leaderboardName, score) — the
   technical name comes FIRST. The console must have a leaderboard named LB_NAME,
   otherwise every call answers 404; getDescription() tells us that up front, so
   we ask once and stay quiet if the table is not configured. */
const LB_NAME = 'default';
let lbOk = null;
async function leaderboardReady() {
  if (lbOk !== null) return lbOk;
  if (!ysdk || !ysdk.leaderboards || !ysdk.leaderboards.setScore) { lbOk = false; return lbOk; }
  if (!ysdk.leaderboards.getDescription) { lbOk = true; return lbOk; }
  try { lbOk = !!(await ysdk.leaderboards.getDescription(LB_NAME)); } catch (e) { lbOk = false; }
  return lbOk;
}
async function submitScore() {
  if (!(await leaderboardReady())) return;
  const total = Object.values(starsByLevel).reduce((a, b) => a + b, 0);
  try { await ysdk.leaderboards.setScore(LB_NAME, total * 100000 + coins); } catch (e) {}
}

/* ---------------- analytics ---------------- */
const analytics = {
  events: [], sid: '', t0: 0, completed: 0, timer: null,
  init() { this.sid = 's' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36); this.t0 = Date.now(); this.track('session_start', { level }); },
  track(name, props) {
    props = props || {};
    this.events.push({ sid: this.sid, t: Date.now() - this.t0, name, props });
    try { if (ysdk && ysdk.stats && ysdk.stats.event) ysdk.stats.event(name, props); } catch (e) {}
    try { if (ysdk && ysdk.features && ysdk.features.Analytics) ysdk.features.Analytics.sendEvent(name, props); } catch (e) {}
    if (this.events.length > 120) this.flush();
  },
  flush() { this.events.length = 0; }
};

/* ---------------- i18n apply ---------------- */
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(e => {
    const k = e.getAttribute('data-i18n');
    if (k === 'sound') e.textContent = soundOn ? T('sound') : T('soundOff');
    else e.textContent = T(k);
  });
  const sb = el('soundbtn');
  if (sb) { sb.classList.toggle('muted', !soundOn); sb.title = soundOn ? 'Sound: on' : 'Sound: off'; }
  const sb2 = el('soundbtn2');
  if (sb2) sb2.textContent = soundOn ? T('sound') : T('soundOff');
  renderSettings();
  const pl = el('playlabel');
  if (pl) pl.textContent = (level > 1 || completedLevels.size) ? T('continueBtn') : T('playbtn');
  const ps = el('playsub');
  if (ps) {
    const bits = [];
    if (level > 1) bits.push(T('level') + ' ' + level);
    const ts = totalStars();
    if (ts) bits.push('★ ' + ts);
    const nx = nextChestLevel();
    if (nx) bits.push(T('nextChest').replace('%s', nx));
    ps.textContent = bits.join(' · ');
  }
  const wb = el('wheelbtn');
  if (wb) wb.classList.toggle('gold', wheelAvailable());
}

/* ---------------- C1: the carnival passport — one stamp per chapter ---------------- */
const PP_BONUS = 220;
const SEAL_SVG = '<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">' +
  '<circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="4 3"/>' +
  '<circle cx="24" cy="24" r="13.5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
  '<path d="M24 13.5l2.6 6.2 6.7.5-5.1 4.4 1.5 6.6L24 27.6l-5.7 3.6 1.5-6.6-5.1-4.4 6.7-.5L24 13.5Z" fill="currentColor"/></svg>';
const chapterLevels = ch => { const a = []; for (let k = ch * 10 + 1; k <= ch * 10 + 10 && k <= totalLevels(); k++) a.push(k); return a; };
const chapterCleared = ch => chapterLevels(ch).every(k => completedLevels.has(k));
function chapterStarsGot(ch) { return chapterLevels(ch).reduce((a, k) => a + (starsByLevel[k] || 0), 0); }
function passportProgress() { let got = 0; for (let ch = 0; ch < CHAPTERS.length; ch++) if (chapterCleared(ch)) got++; return { got, of: CHAPTERS.length }; }
function renderPassport() {
  const grid = el('ppgrid'); if (!grid) return;
  const cur = chapterOf(level);
  grid.innerHTML = CHAPTERS.map((c, ch) => {
    const cleared = chapterCleared(ch), claimed = claimedChapters.has(ch);
    const stars = chapterStarsGot(ch), done = chapterLevels(ch).filter(k => completedLevels.has(k)).length;
    const st = claimed ? 'got' : (cleared ? 'ready' : 'locked');
    return '<button type="button" class="pp-card ' + st + (ch === cur ? ' cur' : '') + '" data-ch="' + ch + '">' +
      '<span class="pp-seal">' + (cleared ? SEAL_SVG : '<i class="pp-num">' + (ch + 1) + '</i>') + '</span>' +
      '<b class="pp-name">' + (lang === 'ru' ? c.ru : c.en) + '</b>' +
      '<span class="pp-meta">' + T('ppLevels').replace('%s', done) + '</span>' +
      '<span class="pp-stars">' + (stars >= 25 ? '★★★' : stars >= 15 ? '★★' : stars >= 5 ? '★' : '·') + '<i>' + stars + '/30</i></span>' +
      '<span class="pp-act">' + (claimed ? T('ppGot') : cleared ? T('ppClaim').replace('%s', PP_BONUS) : T('ppLocked')) + '</span>' +
      '</button>';
  }).join('');
  const p = passportProgress();
  const head = el('ppsum');
  if (head) head.innerHTML = '<b>' + p.got + ' / ' + p.of + '</b><span>' + (p.got === p.of ? T('ppAll') : T('ppNote')) + '</span>';
  const btn = el('ppbtn');
  if (btn) { btn.classList.toggle('ready', p.got > claimedChapters.size); btn.textContent = T('ppWord') + ' ' + p.got + '/' + p.of; }
}
function openPassport() { renderPassport(); el('passport').classList.remove('hidden'); }
function claimChapterStamp(ch, btn) {
  if (ch < 0 || ch >= CHAPTERS.length) return;
  if (claimedChapters.has(ch)) { toast(T('ppGot')); return; }
  if (!chapterCleared(ch)) { toast(T('ppLocked')); return; }
  claimedChapters.add(ch);
  coins += PP_BONUS;
  play('reward', .8);
  const p = passportProgress();
  toast(T('ppClaim').replace('%s', PP_BONUS) + ' · ' + p.got + '/' + p.of);
  confetti(el('passport'));
  flyTickets(4);
  updateHUD(); saveProgress(); renderPassport();
}

/* ---------------- settings: music / sound / vibration / reset ---------------- */
let resetArmed = 0;
function renderSettings() {
  const set = (id, on) => {
    const b = el(id); if (!b) return;
    b.classList.toggle('on', !!on);
    b.textContent = on ? T('onWord') : T('offWord');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  set('setmusic', musicOn); set('setsound', soundOn); set('setvibe', vibeOn);
  const ss = el('setskips'); if (ss) ss.textContent = String(skipTickets);
  /* share() only exists on the platform, and bindUI runs before initSDK — decide here */
  const sh = el('setshare'); if (sh) sh.classList.toggle('hidden', !shareAvailable());
  const rb = el('setreset');
  if (rb) {
    rb.classList.toggle('armed', Date.now() < resetArmed);
    rb.textContent = Date.now() < resetArmed ? T('resetAsk') : T('resetWord');
  }
}
function openSettings() { renderSettings(); el('settings').classList.remove('hidden'); }
function toggleSetting(which) {
  if (which === 'music') {
    musicOn = !musicOn;
    if (musicOn && soundOn) startMusic(); else stopMusic();
  } else if (which === 'sound') {
    soundOn = !soundOn;
    if (soundOn) { startMusic(); play('click', .6); } else { pauseAllAudio(); }
  } else {
    vibeOn = !vibeOn;
    if (vibeOn) vibe('reward');
  }
  applyLang(); renderSettings(); saveProgress();
}
function resetProgress() {
  if (Date.now() >= resetArmed) { resetArmed = Date.now() + 4500; renderSettings(); return; }
  resetArmed = 0;
  completedLevels = new Set(); starsByLevel = {}; coins = 0; level = 1;
  streak = 0; wheelDate = ''; dailyDate = ''; skipTickets = 0; resetJournal();
  inventory = { hammer: 0, rainbow: 0, shuffle: 0 };
  chestsOpened = new Set(); claimedRewards = new Set(); claimedChapters = new Set();
  lossStreak = 0; winStreak = 0;
  if (player) { try { saveProgress(); } catch (e) {} }
  toast(T('resetDone'));
  hideModal('settings'); hideOverlay();
  running = false; updateHUD(); applyLang(); newLevel(false);
}

function loadSfx() {
  const map = { pop: 'pop.mp3', swap: 'swap.mp3', match: 'match.mp3', lose: 'lose.mp3', win: 'win.mp3', click: 'click.mp3', magic: 'magic.mp3', shuffle: 'shuffle.mp3', arcade: 'arcade.mp3', combo: 'combo.mp3', reward: 'reward.mp3' };
  for (const k in map) preloadSound(k, 'assets/sfx/' + map[k]);
  MUSIC_TRACKS = ['assets/music/carnival.mp3', 'assets/music/ukulele.mp3'];
  music = new Audio(MUSIC_TRACKS[0]); music.preload = 'auto'; music.loop = false; music.volume = .26;
  music.addEventListener('ended', () => {
    if (!musicOn || !soundOn) return;
    musicIdx = (musicIdx + 1) % MUSIC_TRACKS.length;
    try { music.src = MUSIC_TRACKS[musicIdx]; music.play().catch(() => {}); } catch (e) {}
  });
}

/* ---------------- preload ---------------- */
function preloadAssets() {
  return new Promise(res => {
    const urls = PALART.slice(); // the carnival backdrop is inline SVG, nothing to preload
    let left = urls.length;
    const tick = () => { if (--left <= 0) res(); };
    urls.forEach(u => { const i = new Image(); i.onload = tick; i.onerror = tick; i.src = u; });
    setTimeout(res, 4000);
  });
}

/* ---------------- init ---------------- */
async function initSDK() {
  try {
    if (typeof YaGames === 'undefined' || !YaGames || !YaGames.init) {
      /* not served by Yandex (local QA server, mirror, file://) — run offline */
      offlineSDK = true;
      window.YaGames = { init: () => Promise.resolve(localSDK()) };
    }
    ysdk = await YaGames.init();
    const lg = ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang;
    if (lg && L[lg]) lang = lg;
  } catch (e) { console.warn('SDK init', e); }
  try {
    loadLocal();   /* paint the menu from the local mirror before any network call */
    if (ysdk && ysdk.getPlayer) { player = await ysdk.getPlayer(); await loadProgress(); }
  } catch (e) { console.warn('player', e); }
  try {
    /* the platform pauses the game (ads, host page): mute + stop the markup */
    if (ysdk && ysdk.on) {
      ysdk.on('game_api_pause', () => { sdkGameplay(false); pauseAllAudio(); });
      ysdk.on('game_api_resume', () => { resumeAllAudio(); if (gameplayWanted) sdkGameplay(true); });
    }
  } catch (e) {}
}

function bindUI() {
  el('playbtn').addEventListener('click', () => {
    play('click', .7);
    el('splash').classList.add('hidden');
    musicOn = true; startMusic();
    startGame();
  });
  const db = el('dailybtn');
  if (db) db.addEventListener('click', () => {
    play('click', .7);
    dailyMode = true;
    el('splash').classList.add('hidden');
    musicOn = true; startMusic();
    startGame();
  });
  el('journalbtn').addEventListener('click', showJournal);
  el('journalclose').addEventListener('click', () => { play('click', .5); el('journal').classList.add('hidden'); });
  el('howbtn').addEventListener('click', () => { play('click', .6); el('howto').classList.remove('hidden'); });
  el('howclose').addEventListener('click', () => el('howto').classList.add('hidden'));
  el('howok').addEventListener('click', () => { play('click', .6); el('howto').classList.add('hidden'); });
  el('lvlselclose').addEventListener('click', () => { play('click', .5); hideModal('lvlsel'); });
  el('lvlbtn').addEventListener('click', () => { play('click', .6); showLevelSelect(); });
  el('shopbtn').addEventListener('click', () => { play('click', .6); showShop(); });
  el('shopclose').addEventListener('click', () => { play('click', .5); hideModal('shop'); });
  el('shopad').addEventListener('click', () => {
    rewarded(el('shopad'), () => {
      const pool = ['shuffle', 'hammer', 'rainbow'];
      const id = pool[(Math.random() * pool.length) | 0];
      inventory[id] = (inventory[id] | 0) + 1;
      toast(T('prizeBooster').replace('%s', T(id)).replace('%s', 1));
      play('reward', .7); updateHUD(); saveProgress(); showShop();
    });
  });
  el('wheelbtn').addEventListener('click', () => { play('click', .6); openWheel(); });
  el('wheelclose').addEventListener('click', () => { play('click', .5); hideModal('wheel'); });
  el('wheelspin').addEventListener('click', e => spinWheel(e.currentTarget));
  const toggleSound = () => {
    soundOn = !soundOn;
    applyLang();
    if (soundOn) { startMusic(); play('click', .6); } else { pauseAllAudio(); }
    saveProgress();
  };
  el('soundbtn').addEventListener('click', toggleSound);
  el('soundbtn2').addEventListener('click', toggleSound);
  const sbtn = el('setbtn');
  if (sbtn) sbtn.addEventListener('click', () => { play('click', .6); openSettings(); });
  const sclose = el('setclose');
  if (sclose) sclose.addEventListener('click', () => { play('click', .5); hideModal('settings'); });
  const bind = (id, which) => { const b = el(id); if (b) b.addEventListener('click', () => { play('click', .5); toggleSetting(which); }); };
  bind('setmusic', 'music'); bind('setsound', 'sound'); bind('setvibe', 'vibe');
  const rbtn = el('setreset');
  if (rbtn) rbtn.addEventListener('click', () => { play('click', .5); resetProgress(); });
  const shb = el('setshare');
  if (shb) shb.addEventListener('click', () => { play('click', .5); shareGame(); });
  const ppb = el('ppbtn');
  if (ppb) ppb.addEventListener('click', () => { play('click', .6); openPassport(); });
  const ppc = el('ppclose');
  if (ppc) ppc.addEventListener('click', () => { play('click', .5); hideModal('passport'); });
  const ppg = el('ppgrid');
  if (ppg) ppg.addEventListener('click', e => {
    const card = e.target.closest ? e.target.closest('.pp-card') : null;
    if (card) claimChapterStamp(parseInt(card.dataset.ch, 10), card);
  });
  const skb = el('skipbtn');
  if (skb) skb.addEventListener('click', () => { play('click', .5); useSkipTicket(); });
  document.querySelectorAll('.modal-back').forEach(b => b.addEventListener('click', () => {
    const m = b.parentElement;
    if (m.id === 'lvlsel' || m.id === 'howto' || m.id === 'shop' || m.id === 'wheel' || m.id === 'settings' || m.id === 'passport') m.classList.add('hidden');
  }));
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const id of ['wheel', 'shop', 'lvlsel', 'howto', 'settings', 'passport']) { const m = el(id); if (m && !m.classList.contains('hidden')) { m.classList.add('hidden'); play('click', .4); return; } }
  });
  window.addEventListener('resize', () => { layoutBoard(); });
  window.addEventListener('orientationchange', () => setTimeout(layoutBoard, 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseAllAudio(); flushSave(); } else resumeAllAudio();
  });
  window.addEventListener('blur', () => pauseAllAudio());
  window.addEventListener('focus', () => { if (!document.hidden) resumeAllAudio(); });
  window.addEventListener('pagehide', () => { flushSave(); analytics.flush(); });
}

async function startGame() {
  await newLevel(true);
  updateHUD();
  checkDailyReward();
  /* startGame() runs again on every "Play"/"Daily" tap - one timer only */
  if (analytics.timer === null) analytics.timer = setInterval(() => analytics.flush(), 45000);
}

let booted = false;
async function boot() {
  if (booted) return; booted = true;
  /* п.1.19.2: Game Ready has to be reported whatever happens inside boot(),
     otherwise Yandex keeps the loader up forever on a broken start. */
  try { await bootInner(); }
  finally {
    try { if (ysdk && ysdk.features && ysdk.features.LoadingAPI) ysdk.features.LoadingAPI.ready(); } catch (e) {}
  }
}
async function bootInner() {
  applyLang();
  loadSfx();
  await preloadAssets();
  await loadLevels();
  bindUI();
  bindBoosters();
  bindHintBtn();
  bindParadeBtn();
  bindGadgets();
  bindInput();
  await initSDK();
  applyLang();
  paintDaily();
  /* build the board behind the splash so it is ready instantly */
  COLS = 8; ROWS = 8; NUM_TYPES = 5;
  objectives = [{ kind: 'score', goal: 800, got: 0 }];
  buildCells(); layoutBoard(); makeBoard(); render(); updateHUD();
  analytics.init();
}
document.addEventListener('DOMContentLoaded', () => { boot().catch(e => console.warn('boot', e)); });
if (document.readyState !== 'loading') boot().catch(e => console.warn('boot', e));
