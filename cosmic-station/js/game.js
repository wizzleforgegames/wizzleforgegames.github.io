/* Cosmic Station Idle — ядро логики (без DOM). v11: коллекция артефактов */
(function (root) {
'use strict';
var TICK_MS = 100, MAX_OFFLINE_H = 8;

var RES = ['energy','minerals','credits','antimatter'];
var PRESTIGE_MIN = 3e6;   // нижняя планка: прыжок раньше просто не имеет смысла
var PRESTIGE_T = 900;     // и верхняя: прыжок не должен стоить дороже ~15 мин спокойной добычи x N
var PRESTIGE_CD = 15*60*1000; // откат двигателя: следующий прыжок не раньше, чем через 15 минут
var PRESTIGE_KEEP = 0.30;   // после прыжка станция держит 30% корпусов: восстановление быстрое, а не с нуля
var RES_META = {
  energy:{ic:'26a1',name:'Энергия',g:'энергии',c:'#ffd76a'},
  minerals:{ic:'1faa8',name:'Руда',g:'руды',c:'#9fb4d8'},
  credits:{ic:'1f31f',name:'Кредиты',g:'кредитов',c:'#ffe066'},
  antimatter:{ic:'2728',name:'Антиматерия',g:'антиматерии',c:'#c58cff'}
};

var MODULES = {
 solar:  {key:'solar', name:'Солнечный парус',   ic:'2600',  desc:'Разворачивает фотопарус и кормит станцию светом.', base:15,    growth:1.24, res:'energy',   rate:0.6},
 miner:  {key:'miner', name:'Астероидный майнер', ic:'26cf',  desc:'Дробит астероиды и присылает руду на борт.',      base:140,   growth:1.24, res:'minerals', rate:0.4,  costRes:'energy', unlock:{res:'energy',v:90,chain:1}},
 reactor:{key:'reactor',name:'Термоядерный реактор',ic:'2622', desc:'Гелиевый термояд — плотная и стабильная энергия.',base:1400,  growth:1.26, res:'energy',   rate:11,   unlock:{res:'minerals',v:60,chain:2}},
 hydro:  {key:'hydro', name:'Гидропонный отсек',  ic:'1f331', desc:'Биоферма: перерабатывает энергию в кредиты.',     base:2600,  growth:1.28, res:'credits',  rate:4,    costRes:'energy', unlock:{res:'energy',v:1200,chain:3}},
 shield: {key:'shield',name:'Энергощит',          ic:'1f6e1', desc:'Гасит потери в экспедициях и вспышки.',           base:900,   growth:1.29, res:'credits',  rate:0,    unlock:{res:'credits',v:150,chain:4}, stat:'defense'},
 drone:  {key:'drone', name:'Дрон-сканнер',       ic:'1f6f0', desc:'Разведывает сектор: +шанс успеха экспедиций.',    base:5200,  growth:1.27, res:'credits',  rate:0,    unlock:{res:'credits',v:900,chain:5}, stat:'scan'},
 laser:  {key:'laser', name:'Плазменный бур',     ic:'1f52b', desc:'Пробуривает ядра планет — гора руды.',            base:9500,  growth:1.26, res:'minerals', rate:5.2,  unlock:{mod:'miner',v:5,chain:6}},
 habitat:{key:'habitat',name:'Жилой купол',       ic:'1f3e2', desc:'Экипаж растит всю продукцию станции.',            base:24000, growth:1.30, res:'credits',  rate:26,   costRes:'energy', unlock:{mod:'hydro',v:5,chain:7}, stat:'crew'},
 fusion: {key:'fusion',name:'Синтезатор гелия-3', ic:'1f4a0', desc:'Добывает He-3 с луны — чистый поток энергии.',    base:68000, growth:1.29, res:'energy',   rate:260,  unlock:{mod:'reactor',v:5,chain:8}},
 dyson:  {key:'dyson', name:'Сфера Дайсона',      ic:'1f31e', desc:'Охватывает звезду: колоссальный приток энергии.', base:420000,growth:1.31, res:'energy',   rate:2400, unlock:{mod:'fusion',v:5,chain:9}},
  forge:  {key:'forge', name:'Звёздная кузница',    ic:'2692',  desc:'Плавит астероиды в балки — руда рекой.',            base:3.2e7, growth:1.32, res:'minerals', rate:900,  unlock:{mod:'dyson',v:5,lv:18,chain:11}},
 fleet:  {key:'fleet', name:'Торговый флот',      ic:'1f6a2', desc:'Караваны кораблей разносят грузы по секторам.',      base:1.8e8, growth:1.33, res:'credits',  rate:7000, unlock:{mod:'forge',v:5,lv:24,chain:12}},
 station:{key:'station',name:'Ядро Варп-станции', ic:'1f300', desc:'Гипердвигатель: рождает антиматерию прямо в доке.',base:6e6,  growth:1.34, res:'antimatter',rate:0.06,costRes:'credits',unlock:{mod:'dyson',v:3,lv:12,chain:10}},
 ring:   {key:'ring',  name:'Кольцо обитания',    ic:'1f3a0', desc:'Огромное кольцо-город: тысячи домов и заводов на орбите.', base:2.6e9, growth:1.34, res:'credits',  rate:82000, costRes:'credits', unlock:{mod:'fleet',v:5,lv:30,chain:13}},
 gate:   {key:'gate',  name:'Звёздные врата',     ic:'1f6aa', desc:'Кольцо гиперперехода: качает энергию прямо из ядра галактики.', base:1.4e10,growth:1.35, res:'energy',   rate:52000, costRes:'credits', unlock:{mod:'ring',v:5,lv:38,chain:14}}
};
var MORDER = ['solar','miner','reactor','hydro','shield','drone','laser','habitat','fusion','dyson','forge','fleet','station','ring','gate'];

var UPGRADES = [
 {id:'click1', name:'Усиленный контакт',   ic:'1f44a', cost:{energy:250},     eff:'click', v:2,   req:function(s){return s.stats.totalClicks>=25;}},
 {id:'click2', name:'Наноперчатки',        ic:'1f9e4', cost:{energy:6000},    eff:'click', v:3,   req:function(s){return s.achievements['click100'];}},
 {id:'click3', name:'Кинетический накопитель',ic:'26a1',cost:{energy:180000}, eff:'click', v:4,   req:function(s){return s.modules.solar>=15;}},
 {id:'solar1', name:'Эффективные фотоэлементы',ic:'2600',cost:{energy:1200},  eff:'mod', tgt:'solar', v:2, req:function(s){return s.modules.solar>=5;}},
 {id:'solar2', name:'Гелиевые линзы',      ic:'1f308', cost:{energy:45000},   eff:'mod', tgt:'solar', v:3, req:function(s){return s.modules.solar>=15;}},
 {id:'miner1', name:'Алмазные коронки',    ic:'1f48e', cost:{minerals:250},   eff:'mod', tgt:'miner', v:2, req:function(s){return s.modules.miner>=5;}},
 {id:'miner2', name:'Гравитационные дробилки',ic:'1f300',cost:{minerals:3000},eff:'mod', tgt:'miner', v:3, req:function(s){return s.modules.miner>=15;}},
 {id:'react1', name:'Сверхпроводники',     ic:'1f50b', cost:{energy:22000},   eff:'mod', tgt:'reactor', v:2, req:function(s){return s.modules.reactor>=5;}},
 {id:'react2', name:'Магнитная ловушка',   ic:'1f9f2', cost:{energy:320000},  eff:'mod', tgt:'reactor', v:3, req:function(s){return s.modules.reactor>=15;}},
 {id:'all1',   name:'Оптимизация систем',  ic:'1f527', cost:{credits:4000},   eff:'all', v:1.25, req:function(s){return G.stationLevel(s)>=4;}},
 {id:'all2',   name:'ИИ-диспетчер',        ic:'1f916', cost:{credits:90000},  eff:'all', v:1.5,  req:function(s){return G.stationLevel(s)>=8;}},
 {id:'all3',   name:'Квантовая сеть',      ic:'1f310', cost:{credits:1500000},eff:'all', v:2,    req:function(s){return G.stationLevel(s)>=14;}},
 {id:'off1',   name:'Автопилот дока',      ic:'1f504', cost:{credits:2500},   eff:'offline', v:1.5, req:function(s){return s.stats.totalExpeditions>=1;}},
 {id:'off2',   name:'Спящий режим ядра',   ic:'1f319', cost:{credits:60000},  eff:'offline', v:2, req:function(s){return s.achievements['off1'];}},
 {id:'scan1',  name:'Глубокий радар',      ic:'1f4e1', cost:{credits:12000},  eff:'scan', v:2, req:function(s){return s.modules.drone>=1;}},
 {id:'luck1',  name:'Талисман астронавта', ic:'1f340', cost:{credits:30000},  eff:'luck', v:0.08, req:function(s){return s.stats.totalExpeditions>=5;}},
 {id:'sell1',  name:'Космическая биржа',   ic:'1f4b0', cost:{credits:8000},   eff:'sell', v:2, req:function(s){return s.stats.totalMinerals>=1000;}},
 {id:'comet1', name:'Маяк комет',          ic:'1f320', cost:{credits:15000},  eff:'comet', v:1.6, req:function(s){return s.stats.cometsCaught>=1;}},
 {id:'comet2', name:'Ловушка Спукника',    ic:'2604',  cost:{credits:250000}, eff:'comet', v:2.2, req:function(s){return s.stats.cometsCaught>=5;}},
 {id:'crew1',  name:'Новые экипажи',       ic:'1f468', cost:{credits:250000}, eff:'all', v:1.8, req:function(s){return s.modules.habitat>=5;}},
 {id:'auto1',  name:'Док-автомат',         ic:'1f916', cost:{credits:600000}, eff:'auto', v:1,   req:function(s){return s.modules.habitat>=10;}},
 {id:'auto2',  name:'Автоторговец',        ic:'1f4e1', cost:{credits:120000}, eff:'autosell', v:1, req:function(s){return s.modules.miner>=8;}},
  {id:'auto3',  name:'Автопилот экспедиций',ic:'1f6f8', cost:{credits:900000}, eff:'autoexp', v:1,  req:function(s){return s.stats.expSuccess>=25;}},
 {id:'tap1',   name:'Серво-дрон',           ic:'1f916', cost:{credits:12000},  eff:'tapauto', v:0.5, req:function(s){return s.stats.totalClicks>=200;}},
 {id:'tap2',   name:'Нейро-рой',            ic:'1f6f0', cost:{credits:450000}, eff:'tapauto', v:2,   req:function(s){return !!s.upgrades['tap1']&&s.modules.drone>=5;}},
 {id:'tap3',   name:'Квантовый рой',        ic:'1f30c', cost:{credits:1.2e7},  eff:'tapauto', v:6,   req:function(s){return !!s.upgrades['tap2']&&G.stationLevel(s)>=14;}},
 {id:'flare1', name:'Гелио-коллекторы',     ic:'1f31e', cost:{credits:300000}, eff:'flare', v:2, req:function(s){return (s.stats.flares||0)>=1;}},
 {id:'chest1', name:'Магнит находок',      ic:'1f4e6', cost:{credits:120000}, eff:'chest', v:1.8, req:function(s){return (s.stats.chestsOpened||0)>=3;}},
 {id:'forge1', name:'Плазменные тигли',     ic:'2692',  cost:{minerals:400000},eff:'mod', tgt:'forge', v:2.5, req:function(s){return s.modules.forge>=5;}},
 {id:'fleet1', name:'Янтарные маршруты',    ic:'1f6a2', cost:{credits:9e7},    eff:'mod', tgt:'fleet', v:2.5, req:function(s){return s.modules.fleet>=5;}},
 {id:'all4',   name:'Тёмная материя',       ic:'1f300', cost:{credits:4e8},    eff:'all', v:2.5, req:function(s){return G.stationLevel(s)>=22;}},
 {id:'rup1',  name:'Резонансные паруса',    ic:'26f5', cost:{energy:3e6},     eff:'mod', tgt:'solar', v:4, req:function(s){return G.resHas(s,'rs2')&&s.modules.solar>=25;}},
 {id:'rup2',  name:'Дробилки II',           ic:'1f300', cost:{minerals:9e5},   eff:'mod', tgt:'miner', v:4, req:function(s){return G.resHas(s,'rs4')&&s.modules.miner>=25;}},
 {id:'rup3',  name:'Сверхрой',              ic:'1f30c', cost:{credits:4e8},    eff:'tapauto', v:8, req:function(s){return G.resHas(s,'rs3')&&!!s.upgrades['tap3'];}},
 {id:'rup4',  name:'Тёмная материя II',     ic:'1f311', cost:{credits:6e9},    eff:'all', v:2,   req:function(s){return G.resHas(s,'rs10')&&G.stationLevel(s)>=26;}},
 {id:'rup5',  name:'Звёздный котёл',        ic:'2697', cost:{minerals:8e8},   eff:'mod', tgt:'forge', v:3, req:function(s){return G.resHas(s,'rs9')&&s.modules.forge>=15;}},
 {id:'rup6',  name:'Вечный реактор',        ic:'2699',  cost:{credits:2e11},   eff:'all', v:2.5, req:function(s){return G.resHas(s,'rs12')&&G.stationLevel(s)>=32;}},
 {id:'autores',   name:'Научный ИИ',         ic:'1f9e0', cost:{credits:6e8},    eff:'autores', v:1, req:function(s){return G.resOwned(s)>=3;}},
 {id:'autochest', name:'Вскрыватель находок',ic:'1f4e6', cost:{credits:4e8},    eff:'autochest', v:1, req:function(s){return (s.stats.chestsOpened||0)>=6;}},
 {id:'autoroute', name:'Логистический центр',ic:'1f69a', cost:{credits:3e9},    eff:'autoroute', v:1, req:function(s){return (s.stats.routes||0)>=2;}},
 {id:'port1',  name:'Гильдия перевозчиков', ic:'1f69a', cost:{credits:2.5e6},  eff:'autoport', v:1, req:function(s){return (s.stats.contractsDone||0)>=6;}},
 {id:'port2',  name:'Магистраль торговцев', ic:'1f6e9', cost:{credits:6e7},    eff:'port', v:1.8, req:function(s){return (s.stats.contractsDone||0)>=15;}},
 {id:'port3',  name:'Таможенный союз',      ic:'1f4e1', cost:{credits:9e9},    eff:'port', v:2,   req:function(s){return (s.stats.contractsDone||0)>=40;}},
 {id:'ring1',  name:'Гравитационные купола',ic:'1f3a0', cost:{credits:9e10},   eff:'mod', tgt:'ring', v:3, req:function(s){return (s.modules.ring||0)>=5;}},
 {id:'ford1',  name:'Боевой ордер флота', ic:'2620',  cost:{credits:5e9,antimatter:20}, eff:'patrol', v:2, req:function(s){return shipOwned(s)>=3;}},
 {id:'ford2',  name:'Торговый ордер флота',ic:'1f6e9', cost:{credits:2.5e10,antimatter:35}, eff:'port', v:1.25, req:function(s){return shipOwned(s)>=4;}},
 {id:'rep2',   name:'Сухой док',           ic:'1f6e1', cost:{credits:6e10,antimatter:40},  eff:'docksafe', v:0.5, req:function(s){return (s.stats.boardings||0)>=3;}},
 {id:'sell2',  name:'Биржевые роботы',     ic:'1f916', cost:{credits:5e8},                  eff:'peak', v:1.25, req:function(s){return (s.stats.peakDeals||0)>=1;}},
 {id:'rep1',   name:'Ремонтная бригада',   ic:'1f6e0', cost:{credits:2.5e9,antimatter:15}, eff:'autorepair', v:1, req:function(s){return (s.stats.boardings||0)>=1;}},
 {id:'gate1',  name:'Гиперобход врат',      ic:'1f6aa', cost:{energy:4e11},    eff:'mod', tgt:'gate', v:3, req:function(s){return (s.modules.gate||0)>=5;}},
 {id:'all5',   name:'Тёмная энергия',       ic:'1f311', cost:{credits:8e11},   eff:'all', v:3,   req:function(s){return G.stationLevel(s)>=34;}},
 {id:'click4', name:'Плазменный контакт',   ic:'1f44a', cost:{energy:2e10},    eff:'click', v:5, req:function(s){return s.stats.totalClicks>=4000;}}
];

/* улучшения тоже приходят лесенкой: у каждого свой шаг цепи,
   иначе к десятой минуте игрок видит сразу сорок кнопок */
var UPG_CHAIN={click1:2,click2:3,click3:5,solar1:2,solar2:4,miner1:2,miner2:4,react1:3,react2:5,
  all1:3,all2:5,all3:7,all4:10,all5:14,off1:3,off2:5,scan1:5,luck1:4,sell1:2,sell2:9,comet1:3,comet2:6,
  crew1:7,auto1:8,auto2:5,auto3:9,tap1:6,tap2:8,tap3:11,flare1:6,chest1:8,forge1:12,fleet1:13,ring1:15,
  ford1:11,ford2:12,rep2:12,rep1:10,gate1:16,rup1:8,rup2:9,rup3:11,rup4:13,rup5:12,rup6:15,
  autores:8,autochest:9,autoroute:10,port1:6,port2:9,port3:14};
UPGRADES.forEach(function(u){ var c=UPG_CHAIN[u.id]; if(c==null)return;
  u.chain=c; var f=u.req; u.req=function(s){ return (s.chain||0)>=c && f(s); }; });

var ACH = [
 {id:'click1',  n:'Первые шаги',      ic:'1f446', d:'Кликни 1 раз',              c:function(s){return s.stats.totalClicks>=1;}, r:0.05},
 {id:'click100',n:'Кликер',           ic:'1f44a', d:'Кликни 100 раз',            c:function(s){return s.stats.totalClicks>=100;}, r:0.05},
 {id:'click1k', n:'Маньяк кликов',    ic:'1f4a5', d:'Кликни 1 000 раз',          c:function(s){return s.stats.totalClicks>=1000;}, r:0.10},
 {id:'click5k', n:'Палец-рекордсмен', ic:'1f525', d:'Кликни 5 000 раз',          c:function(s){return s.stats.totalClicks>=5000;}, r:0.20},
 {id:'eng1k',   n:'Зажгся',           ic:'1f4a1', d:'Накопи 1 000 энергии',      c:function(s){return s.stats.totalEnergy>=1e3;}, r:0.05},
 {id:'eng1m',   n:'Мегаватт',         ic:'26a1',  d:'Накопи 1 млн энергии',      c:function(s){return s.stats.totalEnergy>=1e6;}, r:0.10},
 {id:'eng1b',   n:'Гигаэрг',          ic:'1f31f', d:'Накопи 1 млрд энергии',     c:function(s){return s.stats.totalEnergy>=1e9;}, r:0.15},
 {id:'eng1t',   n:'Терацивилизация',  ic:'1f30c', d:'Накопи 1 трлн энергии',     c:function(s){return s.stats.totalEnergy>=1e12;}, r:0.25},
 {id:'min500',  n:'Рудоплавильщик',   ic:'1faa8', d:'Добудь 500 руды',           c:function(s){return s.stats.totalMinerals>=500;}, r:0.05},
 {id:'min10k',  n:'Космический шахтёр',ic:'26cf', d:'Добудь 10 000 руды',        c:function(s){return s.stats.totalMinerals>=1e4;}, r:0.10},
 {id:'min1m',   n:'Астероидный барон',ic:'1f48e', d:'Добудь 1 млн руды',         c:function(s){return s.stats.totalMinerals>=1e6;}, r:0.20},
 {id:'cred5k',  n:'Торговец',         ic:'1f4b0', d:'Заработай 5 000 кредитов',  c:function(s){return s.stats.totalCredits>=5e3;}, r:0.05},
 {id:'cred1m',  n:'Магнат',           ic:'1f3e6', d:'Заработай 1 млн кредитов',  c:function(s){return s.stats.totalCredits>=1e6;}, r:0.10},
 {id:'cred100m',n:'Космический синдикат',ic:'1f451',d:'Заработай 100 млн кредитов',c:function(s){return s.stats.totalCredits>=1e8;}, r:0.20},
 {id:'exp1',    n:'Первая экспедиция',ic:'1f6f8', d:'1 экспедиция',              c:function(s){return s.stats.totalExpeditions>=1;}, r:0.05},
 {id:'exp10',   n:'Разведчик',        ic:'1f5fa', d:'10 экспедиций',             c:function(s){return s.stats.totalExpeditions>=10;}, r:0.10},
 {id:'exp50',   n:'Первопроходец',    ic:'1f9ed', d:'50 экспедиций',             c:function(s){return s.stats.totalExpeditions>=50;}, r:0.15},
 {id:'comet1',  n:'Ловец комет',      ic:'1f320', d:'Поймай 1 комету',           c:function(s){return s.stats.cometsCaught>=1;}, r:0.05},
 {id:'comet10', n:'Хвостатый флот',   ic:'2604',  d:'Поймай 10 комет',           c:function(s){return s.stats.cometsCaught>=10;}, r:0.15},
 {id:'off1',    n:'Вернулся домой',   ic:'1f504', d:'Получи оффлайн-доход',      c:function(s){return s.stats.offlineGains>=1;}, r:0.05},
 {id:'lvl5',    n:'Крепость',         ic:'1f3f0', d:'Уровень станции 5',         c:function(s){return G.stationLevel(s)>=5;}, r:0.10},
 {id:'lvl10',   n:'Мегаструктура',    ic:'1f3df', d:'Уровень станции 10',        c:function(s){return G.stationLevel(s)>=10;}, r:0.15},
 {id:'lvl20',   n:'Галактический узел',ic:'1f3d7',d:'Уровень станции 20',        c:function(s){return G.stationLevel(s)>=20;}, r:0.25},
 {id:'pre1',    n:'Варп-прыжок',      ic:'2728',  d:'Первый престиж',            c:function(s){return s.prestigeCount>=1;}, r:0.10},
 {id:'pre3',    n:'Опытный пилот',    ic:'1f9ed', d:'3 престижа',                c:function(s){return s.prestigeCount>=3;}, r:0.15},
 {id:'pre7',    n:'Ветеран гиперпрыжков',ic:'1f680',d:'7 престижей',             c:function(s){return s.prestigeCount>=7;}, r:0.30},
 {id:'quest5',  n:'Планёр',           ic:'1f4cb', d:'Выполни 5 заданий',         c:function(s){return s.stats.questsDone>=5;}, r:0.10},
 {id:'quest15', n:'Директор станции', ic:'1f4bc', d:'Выполни 15 заданий',        c:function(s){return s.stats.questsDone>=15;}, r:0.20},
 {id:'daily1',  n:'Первый день',      ic:'1f4c5', d:'Забери награду дня',        c:function(s){return s.stats.dailyClaims>=1;}, r:0.05},
 {id:'daily7',  n:'Неделя в космосе', ic:'1f578', d:'Серия наград 7 дней',       c:function(s){return s.daily.streak>=7;}, r:0.25},
 {id:'skin3',   n:'Стилист',          ic:'1f3a8', d:'Открой 3 облика станции',   c:function(s){return s.stats.skinsBought>=3;}, r:0.10},
 {id:'dq10',    n:'Дневник капитана', ic:'1f4d4', d:'Выполни 10 заданий дня',     c:function(s){return (s.stats.dqDone||0)>=10;}, r:0.15},
 {id:'wheel5',  n:'Азарт пилота',     ic:'1f3b5', d:'Крутни колесо 5 раз',        c:function(s){return (s.stats.wheelSpins||0)>=5;}, r:0.10},
 {id:'world4',  n:'Покоритель миров', ic:'1f30d', d:'Доведи станцию до 12 уровня и открой новый мир', c:function(s){return stationLevel(s)>=12;}, r:0.15},
 {id:'peak3',   n:'Акула биржи',      ic:'1f4c8', d:'3 раза продай руду на пике курса', c:function(s){return (s.stats.peakSells||0)>=3;}, r:0.12},
 {id:'art3',    n:'Коллекционер',     ic:'1f48e', d:'Найди 3 артефакта',           c:function(s){return G.artOwned(s)>=3;},  r:0.10},
 {id:'art7',    n:'Собиратель древностей',ic:'1f3a8',d:'Найди 7 артефактов',        c:function(s){return G.artOwned(s)>=7;},  r:0.20},
  {id:'art13',n:'Хранитель звёзд',  ic:'1f4dc', d:'Собери все артефакты',        c:function(s){return G.artOwned(s)>=G.ART.length;}, r:0.35},
 {id:'flare5', n:'Солнечный охотник',  ic:'1f31e', d:'Дождись 5 солнечных вспышек',  c:function(s){return (s.stats.flares||0)>=5;}, r:0.15},
 {id:'chest10',n:'Кладоискатель',      ic:'1f4e6', d:'Открой 10 сундуков',           c:function(s){return (s.stats.chestsOpened||0)>=10;}, r:0.15},
 {id:'autotap3',n:'Полная автоматика', ic:'1f916', d:'Купи все три роя авто-тапа',   c:function(s){return !!(s.upgrades['tap1']&&s.upgrades['tap2']&&s.upgrades['tap3']);}, r:0.20},
 {id:'forge1', n:'Кузнец сектора',     ic:'2692',  d:'Построй звёздную кузницу',     c:function(s){return (s.modules.forge||0)>=1;}, r:0.10},
 {id:'fleet5', n:'Адмирал караванов',  ic:'1f6a2', d:'Собери 5 торговых флотов',     c:function(s){return (s.modules.fleet||0)>=5;}, r:0.15},
  {id:'lvl25',  n:'Вечная станция',     ic:'1f30c', d:'Уровень станции 25',           c:function(s){return stationLevel(s)>=25;}, r:0.30},
  {id:'raid5',  n:'Гроза пиратов',      ic:'1f6f8', d:'Отрази 5 пиратских налётов',  c:function(s){return (s.stats.raids||0)>=5;}, r:0.15},
 {id:'skin6',  n:'Кутюрье галактики',  ic:'1f451', d:'Открой все облики станции',     c:function(s){return SKINS.every(function(k){return s.skins[k.id];});}, r:0.25},
 {id:'res1',   n:'Первый чертёж',      ic:'1f52c', d:'Изучи 1 узел лаборатории',        c:function(s){return G.resOwned(s)>=1;}, r:0.05},
 {id:'res6',   n:'Инженерный центр',   ic:'1f9ea', d:'Изучи 6 узлов лаборатории',       c:function(s){return G.resOwned(s)>=6;}, r:0.15},
 {id:'resAll', n:'Вершина науки',      ic:'1f9ec', d:'Изучи 12 узлов лаборатории',      c:function(s){return G.resBase(s)>=12;}, r:0.35},
 {id:'resInf', n:'Последняя теорема',  ic:'231b',  d:'Изучи все вечные узлы лаборатории', c:function(s){return G.resEternal(s)>=4;}, r:0.50},
 {id:'route3', n:'Караван ходит',      ic:'1f9ed', d:'Пройди 3 этапа маршрута',         c:function(s){return (s.stats.routes||0)>=3;}, r:0.12},
 {id:'route12',n:'Легенда маршрутов',  ic:'1f5fa', d:'Пройди 12 этапов маршрута',       c:function(s){return (s.stats.routes||0)>=12;}, r:0.25},
 {id:'boss1',  n:'Первый флагман',     ic:'1f6a2', d:'Уничтожь пиратский флагман',      c:function(s){return (s.bosses||0)>=1;}, r:0.12},
 {id:'boss5',  n:'Гроза флагманов',    ic:'2620',  d:'Уничтожь 5 флагманов',            c:function(s){return (s.bosses||0)>=5;}, r:0.28},
 {id:'lvl30',  n:'Владыка орбиты',     ic:'1f6f0', d:'Уровень станции 30',              c:function(s){return stationLevel(s)>=30;}, r:0.30},
 {id:'victory',n:'Галактическое ядро', ic:'1f31f', d:'Пройди финал станции',            c:function(s){return !!s.victory;}, r:0.50},
 {id:'board1', n:'Первый абордаж',     ic:'26a0',  d:'Переживи абордаж пиратов',           c:function(s){return (s.stats.boardings||0)>=1;}, r:0.10},
 {id:'hunt1',  n:'Охотник на охотника',ic:'1f3af', d:'Сбей пиратского охотника за кораблями', c:function(s){return (s.stats.hunters||0)>=1;}, r:0.18},
 {id:'hunt5',  n:'Стража верфи',       ic:'1f6e1', d:'Сбей 5 охотников за кораблями',      c:function(s){return (s.stats.hunters||0)>=5;}, r:0.32},
 {id:'repAuto',n:'Ремонтная бригада',  ic:'1f6e0', d:'Купи авто-ремонт кораблей',          c:function(s){return !!s.upgrades['rep1'];}, r:0.15},
 {id:'rep10',  n:'Док без простоев',   ic:'1f527', d:'Почини 10 кораблей в доке',          c:function(s){return (s.stats.repairs||0)>=10;}, r:0.28},
 {id:'rep2a',  n:'Сухой док',          ic:'1f6e1', d:'Построй страховку флота «Сухой док»',  c:function(s){return !!s.upgrades['rep2'];}, r:0.22},
 {id:'peak1',  n:'Сделка на пике',     ic:'1f4c8', d:'Проведи первую пиковую сделку биржи',  c:function(s){return (s.stats.peakDeals||0)>=1;}, r:0.10},
 {id:'peak20', n:'Волк биржи',         ic:'1f4b0', d:'Проведи 20 пиковых сделок',           c:function(s){return (s.stats.peakDeals||0)>=20;}, r:0.32},
 {id:'emg3',   n:'Аварийная команда',  ic:'1f6a9', d:'3 раза вызови аварийный ремонт',       c:function(s){return (s.stats.emg||0)>=3;}, r:0.15},
 {id:'car1',   n:'Проводник каравана', ic:'1f6a2', d:'Проведи караван из трёх контрактов',   c:function(s){return (s.stats.caravans||0)>=1;}, r:0.20},
 {id:'car10',  n:'Магистраль караванов',ic:'1f6e9', d:'Проведи 10 караванов целиком',        c:function(s){return (s.stats.caravans||0)>=10;}, r:0.45},
 {id:'rep5',   n:'Ремонтная бригада',  ic:'1f527', d:'Почини 5 кораблей в доке',           c:function(s){return (s.stats.repairs||0)>=5;},  r:0.18},
 {id:'sq3',    n:'Сезонная программа', ic:'1f4c5', d:'Закрой 3 сезонных задания',          c:function(s){return (s.stats.sqDone||0)>=3;},  r:0.20},
 {id:'sq12',   n:'Марафон сезонов',    ic:'1f3c5', d:'Закрой 12 сезонных заданий',         c:function(s){return (s.stats.sqDone||0)>=12;}, r:0.35},
 {id:'epoch3', n:'Вечные эпохи',       ic:'231b',  d:'3 прыжка в Вечном режиме',        c:function(s){return (s.epochs||0)>=3;}, r:0.30},
 {id:'autopilot',n:'Автопилот',         ic:'1f916', d:'ИИ + вскрыватель + логистика',    c:function(s){return !!(s.upgrades.autores&&s.upgrades.autochest&&s.upgrades.autoroute);}, r:0.20},
 {id:'season1', n:'Сезон закрыт',       ic:'1f3c6', d:'Забрать все награды сезона',      c:function(s){return ((s.season&&s.season.claimed)||[]).length>=5;}, r:0.25},
 {id:'port5',   n:'Перевозчик',           ic:'1f6a2', d:'Выполни 5 контрактов порта',        c:function(s){return (s.stats.contractsDone||0)>=5;}, r:0.10},
 {id:'port25',  n:'Магнат трафика',       ic:'1f6e9', d:'Выполни 25 контрактов порта',       c:function(s){return (s.stats.contractsDone||0)>=25;}, r:0.20},
 {id:'port100', n:'Легенда порта',        ic:'1f4e1', d:'Выполни 100 контрактов порта',      c:function(s){return (s.stats.contractsDone||0)>=100;}, r:0.35},
 {id:'portClean',n:'Ни одной сорванной сделки',ic:'1f9ed',d:'30 контрактов без единого сорванного',c:function(s){return (s.stats.contractsDone||0)>=30&&!(s.stats.contractsMissed||0);}, r:0.25},
 {id:'ring1a',  n:'Кольцо жизни',         ic:'1f3a0', d:'Построй кольцо обитания',           c:function(s){return (s.modules.ring||0)>=1;}, r:0.12},
 {id:'gate3',   n:'Врата галактик',       ic:'1f6aa', d:'Собери 3 звёздных врата',           c:function(s){return (s.modules.gate||0)>=3;}, r:0.22},
 {id:'lvl40',   n:'Владыка глубин',       ic:'1f30c', d:'Уровень станции 40',                c:function(s){return stationLevel(s)>=40;}, r:0.35},
 {id:'exp100',  n:'Сто походов',          ic:'1f5fa', d:'Отправь 100 экспедиций',            c:function(s){return s.stats.totalExpeditions>=100;}, r:0.20},
 {id:'rep3',    n:'Свой человек в порту', ic:'1f3c6', d:'Дорасти порта до «Звёздного порта»',  c:function(s){return portRep(s).lv>=3;}, r:0.20},
 {id:'rep6',    n:'Сердце торговли',      ic:'1f4b5', d:'Максимальная репутация порта',        c:function(s){return portRep(s).lv>=PORT_REP.length-1;}, r:0.45},
 {id:'deal5',   n:'Сделки века',          ic:'1f4e1', d:'Закрой 5 больших сделок дня',         c:function(s){return (s.stats.dealsDone||0)>=5;}, r:0.20},
 {id:'ship2',   n:'Мелкий каботаж',       ic:'1f6a2', d:'Спусти на воду 2 корабля',              c:function(s){return shipOwned(s)>=2;}, r:0.12},
 {id:'ship4',   n:'Собственный флот',     ic:'1f6f8', d:'Спусти на воду 4 корабля',              c:function(s){return shipOwned(s)>=4;}, r:0.25},
 {id:'shipAll', n:'Адмирал верфи',        ic:'1f6a4', d:'Собери все корабли верфи',              c:function(s){return shipOwned(s)>=SHIPS.length;}, r:0.45},
 {id:'set1',    n:'Слаженная команда',    ic:'1f91d', d:'Собери первый бонус-сет кораблей',         c:function(s){return setCount(s)>=1;}, r:0.15},
 {id:'setAll',  n:'Ордер большого флота', ic:'2620',  d:'Собери все три бонус-сета флота',          c:function(s){return setCount(s)>=SHIP_SETS.length;}, r:0.45},
 {id:'pier',    n:'Расширенный пирс',     ic:'1f6a4', d:'Построй расширенный пирс порта',           c:function(s){return !!s.pier;}, r:0.18},
 {id:'urg5',    n:'Срочная доставка',     ic:'26a1',  d:'Закрой 5 срочных чартеров',                c:function(s){return (s.stats.urgentDone||0)>=5;}, r:0.22},
 {id:'ford1a',  n:'Ордер на абордаж',     ic:'2620',  d:'Купи «Боевой ордер флота»',                c:function(s){return !!s.upgrades['ford1'];}, r:0.20},
 {id:'fordAll', n:'Флот во всём',         ic:'1f6e9', d:'Купи оба ордера флота',                     c:function(s){return !!(s.upgrades['ford1']&&s.upgrades['ford2']);}, r:0.35},
 {id:'urg20',   n:'Курьер галактики',     ic:'1f6e9', d:'Закрой 20 срочных чартеров',               c:function(s){return (s.stats.urgentDone||0)>=20;}, r:0.35},
 {id:'shipup5', n:'Механик флота',        ic:'1f527', d:'Улучши корабли верфи 5 раз',                 c:function(s){return (s.stats.shipUps||0)>=5;},  r:0.06},
 {id:'shipup25',n:'Конструктор флота',    ic:'1f6e1', d:'Улучши корабли верфи 25 раз',                c:function(s){return (s.stats.shipUps||0)>=25;}, r:0.18},
 {id:'chain16', n:'Капитан без выходных', ic:'1f3c5', d:'Пройди 16 шагов цепи задач капитана',        c:function(s){return (s.stats.chainDone||0)>=16;},r:0.12}
];

/* p(s) -> [cur, need]; прогресс-бар квеста считается честно, без регекспов */
var QUESTS = [
 {id:'q1', n:'Первый киловатт',        ic:'26a1',  d:'Собери 100 энергии',            c:function(s){return s.stats.totalEnergy>=100;}, p:function(s){return [s.stats.totalEnergy,100];}, rw:{energy:150}},
 {id:'q2', n:'Купи солнечный парус',   ic:'2600',  d:'Купи 1 солнечный парус',        c:function(s){return s.modules.solar>=1;}, p:function(s){return [s.modules.solar,1];}, rw:{energy:200}},
 {id:'q3', n:'Серия кликов',           ic:'1f44a', d:'Сделай 50 кликов',              c:function(s){return s.stats.totalClicks>=50;}, p:function(s){return [s.stats.totalClicks,50];}, rw:{energy:400}},
 {id:'q4', n:'Энергетик',              ic:'1f50b', d:'Купи 5 солнечных парусов',      c:function(s){return s.modules.solar>=5;}, p:function(s){return [s.modules.solar,5];}, rw:{energy:1200}},
 {id:'q5', n:'Первая руда',            ic:'1faa8', d:'Добудь 50 руды',                c:function(s){return s.stats.totalMinerals>=50;}, p:function(s){return [s.stats.totalMinerals,50];}, rw:{minerals:80,credits:150}},
 {id:'q6', n:'Сделка на бирже',        ic:'1f4b0', d:'Продай руду хотя бы раз',       c:function(s){return s.stats.sells>=1;}, p:function(s){return [s.stats.sells,1];}, rw:{credits:300}},
 {id:'q7', n:'Разведка',               ic:'1f6f8', d:'Отправь 1 экспедицию',          c:function(s){return s.stats.totalExpeditions>=1;}, p:function(s){return [s.stats.totalExpeditions,1];}, rw:{credits:400}},
 {id:'q8', n:'Реактор запущен',        ic:'2622',  d:'Купи термоядерный реактор',     c:function(s){return s.modules.reactor>=1;}, p:function(s){return [s.modules.reactor,1];}, rw:{energy:4000}},
 {id:'q9', n:'Город в космосе',        ic:'1f3d7', d:'Доведи станцию до 4 уровня',    c:function(s){return G.stationLevel(s)>=4;}, p:function(s){return [G.stationLevel(s),4];}, rw:{credits:1500}},
 {id:'q10',n:'Ферма на орбите',        ic:'1f331', d:'Купи гидропонный отсек',        c:function(s){return s.modules.hydro>=1;}, p:function(s){return [s.modules.hydro,1];}, rw:{credits:2000}},
 {id:'q11',n:'Щит включён',            ic:'1f6e1', d:'Купи энергощит',                c:function(s){return s.modules.shield>=1;}, p:function(s){return [s.modules.shield,1];}, rw:{credits:2500}},
 {id:'q12',n:'Глаз сектора',           ic:'1f6f0', d:'Купи дрон-сканнер',             c:function(s){return s.modules.drone>=1;}, p:function(s){return [s.modules.drone,1];}, rw:{credits:4000}},
 {id:'q13',n:'Ловец комет',            ic:'1f320', d:'Поймай комету',                 c:function(s){return s.stats.cometsCaught>=1;}, p:function(s){return [s.stats.cometsCaught,1];}, rw:{energy:20000}},
 {id:'q14',n:'Плазменный бур',         ic:'1f52b', d:'Купи плазменный бур',           c:function(s){return s.modules.laser>=1;}, p:function(s){return [s.modules.laser,1];}, rw:{minerals:1500}},
 {id:'q15',n:'10 успешных экспедиций', ic:'1f5fa', d:'10 успешных экспедиций',        c:function(s){return s.stats.expSuccess>=10;}, p:function(s){return [s.stats.expSuccess,10];}, rw:{credits:25000}},
 {id:'q16',n:'Жилой купол',            ic:'1f3e2', d:'Построй жилой купол',           c:function(s){return s.modules.habitat>=1;}, p:function(s){return [s.modules.habitat,1];}, rw:{credits:40000}},
 {id:'q17',n:'Миллионер',              ic:'1f4b0', d:'Заработай 1 000 000 кредитов',  c:function(s){return s.stats.totalCredits>=1e6;}, p:function(s){return [s.stats.totalCredits,1e6];}, rw:{credits:200000}},
 {id:'q18',n:'Гелий-3',                ic:'1f4a0', d:'Купи синтезатор гелия-3',       c:function(s){return s.modules.fusion>=1;}, p:function(s){return [s.modules.fusion,1];}, rw:{energy:2e6}},
 {id:'q19',n:'Уровень станции 12',     ic:'1f3df', d:'Доведи станцию до 12 уровня',   c:function(s){return G.stationLevel(s)>=12;}, p:function(s){return [G.stationLevel(s),12];}, rw:{credits:1e6}},
 {id:'q20',n:'Сфера Дайсона',          ic:'1f31e', d:'Построй сферу Дайсона',         c:function(s){return s.modules.dyson>=1;}, p:function(s){return [s.modules.dyson,1];}, rw:{antimatter:2}},
 {id:'q21',n:'Варп-прыжок',            ic:'2728',  d:'Соверши первый престиж',        c:function(s){return s.prestigeCount>=1;}, p:function(s){return [s.prestigeCount,1];}, rw:{antimatter:3}},
 {id:'q22',n:'Три прыжка',             ic:'1f680', d:'Соверши 3 престижа',            c:function(s){return s.prestigeCount>=3;}, p:function(s){return [s.prestigeCount,3];}, rw:{antimatter:8}},
 {id:'q23',n:'Триллионер',             ic:'1f30c', d:'Накопи 1 трлн энергии',         c:function(s){return s.stats.totalEnergy>=1e12;}, p:function(s){return [s.stats.totalEnergy,1e12];}, rw:{antimatter:15}},
 {id:'q24',n:'Галактический узел',     ic:'1f3d7', d:'Доведи станцию до 20 уровня',   c:function(s){return G.stationLevel(s)>=20;}, p:function(s){return [G.stationLevel(s),20];}, rw:{antimatter:30}},
 {id:'q25',n:'Док-автомат',            ic:'1f916', d:'Купи улучшение «Док-автомат»',  c:function(s){return !!s.upgrades['auto1'];}, p:function(s){return [s.upgrades['auto1']?1:0,1];}, rw:{credits:300000}},
 {id:'q26',n:'Ежедневный контроль',    ic:'1f4c5', d:'Забери награду дня',            c:function(s){return s.stats.dailyClaims>=1;}, p:function(s){return [s.stats.dailyClaims,1];}, rw:{credits:50000}},
 {id:'q27',n:'Оптовый подряд',         ic:'1f6e0', d:'Купи 10 модулей одной кнопкой', c:function(s){return s.stats.bulkBuys>=1;}, p:function(s){return [s.stats.bulkBuys,1];}, rw:{credits:120000}},
 {id:'q28',n:'Стилист',                ic:'1f3a8', d:'Открой 2 облика станции',       c:function(s){return s.stats.skinsBought>=2;}, p:function(s){return [s.stats.skinsBought,2];}, rw:{antimatter:5}},
 {id:'q29',n:'Расписание капитана',    ic:'1f4d4', d:'Выполни 3 задания дня',         c:function(s){return (s.stats.dqDone||0)>=3;}, p:function(s){return [s.stats.dqDone||0,3];}, rw:{antimatter:3}},
 {id:'q30',n:'Испытай удачу',          ic:'1f3b5', d:'Крутни колесо фортуны',         c:function(s){return (s.stats.wheelSpins||0)>=1;}, p:function(s){return [s.stats.wheelSpins||0,1];}, rw:{credits:150000}},
 {id:'q31',n:'Новый мир на орбите',    ic:'1f30d', d:'Открой третий мир орбиты (ур. 8)', c:function(s){return stationLevel(s)>=8;}, p:function(s){return [stationLevel(s),8];}, rw:{credits:250000}},
 {id:'q32',n:'Автоторговец',           ic:'1f4e1', d:'Купи улучшение «Автоторговец»', c:function(s){return !!s.upgrades['auto2'];}, p:function(s){return [s.upgrades['auto2']?1:0,1];}, rw:{credits:400000}},
 {id:'q33',n:'Автопилот экспедиций',   ic:'1f6f8', d:'Купи «Автопилот экспедиций»',   c:function(s){return !!s.upgrades['auto3'];}, p:function(s){return [s.upgrades['auto3']?1:0,1];}, rw:{antimatter:4}},
 {id:'q34',n:'Акула биржи',            ic:'1f4c8', d:'3 раза продай руду на пике курса', c:function(s){return (s.stats.peakSells||0)>=3;}, p:function(s){return [s.stats.peakSells||0,3];}, rw:{credits:600000}},
 {id:'q35',n:'Клад звёздного флота',   ic:'1f48e', d:'Найди 5 артефактов',              c:function(s){return G.artOwned(s)>=5;},  p:function(s){return [G.artOwned(s),5];},  rw:{antimatter:4}},
 {id:'q36',n:'Музей станции',          ic:'1f3a8', d:'Найди 10 артефактов',             c:function(s){return G.artOwned(s)>=10;}, p:function(s){return [G.artOwned(s),10];}, rw:{antimatter:14}},
  {id:'q37',n:'Лавка древностей',       ic:'2696',  d:'Купи артефакт у торговца',         c:function(s){return (s.stats.artBought||0)>=1;}, p:function(s){return [s.stats.artBought||0,1];},  rw:{antimatter:3}},
 {id:'q38',n:'Кладоискатель',          ic:'1f4e6', d:'Открой 3 сундука находок',        c:function(s){return (s.stats.chestsOpened||0)>=3;}, p:function(s){return [s.stats.chestsOpened||0,3];}, rw:{credits:220000}},
 {id:'q39',n:'Солнечная охота',        ic:'1f31e', d:'Дождись 2 солнечных вспышек',      c:function(s){return (s.stats.flares||0)>=2;}, p:function(s){return [s.stats.flares||0,2];}, rw:{credits:350000}},
 {id:'q40',n:'Звёздная кузница',       ic:'2692',  d:'Построй звёздную кузницу',        c:function(s){return (s.modules.forge||0)>=1;}, p:function(s){return [s.modules.forge||0,1];}, rw:{minerals:400000}},
 {id:'q41',n:'Торговый флот',          ic:'1f6a2', d:'Собери 3 торговых флота',         c:function(s){return (s.modules.fleet||0)>=3;}, p:function(s){return [s.modules.fleet||0,3];}, rw:{antimatter:8}},
 {id:'q42',n:'Вечная станция',         ic:'1f30c', d:'Доведи станцию до 25 уровня',      c:function(s){return stationLevel(s)>=25;}, p:function(s){return [stationLevel(s),25];}, rw:{antimatter:30}},
  {id:'q43',n:'Рой дронов',             ic:'1f6f0', d:'Купи улучшение «Нейро-рой»',      c:function(s){return !!s.upgrades['tap2'];}, p:function(s){return [s.upgrades['tap2']?1:0,1];}, rw:{credits:700000}},
 {id:'q44',n:'Гроза пиратов',          ic:'1f6f8', d:'Отрази 3 пиратских налёта',      c:function(s){return (s.stats.raids||0)>=3;}, p:function(s){return [s.stats.raids||0,3];}, rw:{antimatter:4}},
 {id:'q45',n:'Чертёж из лаборатории',  ic:'1f52c', d:'Изучи 1 узел лаборатории',          c:function(s){return G.resOwned(s)>=1;},  p:function(s){return [G.resOwned(s),1];},  rw:{antimatter:2}},
 {id:'q46',n:'Инженерный совет',       ic:'1f9ea', d:'Изучи 6 узлов лаборатории',         c:function(s){return G.resOwned(s)>=6;},  p:function(s){return [G.resOwned(s),6];},  rw:{antimatter:10}},
 {id:'q47',n:'Вершина науки',          ic:'1f9ec', d:'Изучи все 12 узлов лаборатории',    c:function(s){return G.resOwned(s)>=12;}, p:function(s){return [G.resOwned(s),12];}, rw:{antimatter:40}},
 {id:'q48',n:'Звёздный маршрут',       ic:'1f9ed', d:'Пройди 3 этапа маршрута',           c:function(s){return (s.stats.routes||0)>=3;}, p:function(s){return [s.stats.routes||0,3];}, rw:{credits:9e5}},
 {id:'q49',n:'Охота на флагмана',      ic:'1f6a2', d:'Уничтожь пиратский флагман',        c:function(s){return (s.bosses||0)>=1;},  p:function(s){return [s.bosses||0,1];},  rw:{antimatter:6}},
 {id:'q50',n:'Владыка орбиты',         ic:'1f6f0', d:'Доведи станцию до 30 уровня',       c:function(s){return stationLevel(s)>=30;},p:function(s){return [stationLevel(s),30];},rw:{antimatter:35}},
 {id:'q51',n:'Галактическое ядро',     ic:'1f31f', d:'Пройди финал станции',              c:function(s){return !!s.victory;},       p:function(s){return [s.victory?1:0,1];},  rw:{antimatter:60}},
 {id:'q53',n:'Думалка станции',      ic:'1f9e0', d:'Купить «Научный ИИ»',                 c:function(s){return !!s.upgrades.autores;},p:function(s){return [s.upgrades.autores?1:0,1];},rw:{antimatter:12,energy:5e6}},
 {id:'q54',n:'Полный автопилот',     ic:'1f916', d:'Вскрыватель + логистический центр',   c:function(s){return !!(s.upgrades.autochest&&s.upgrades.autoroute);},p:function(s){return [(s.upgrades.autochest?1:0)+(s.upgrades.autoroute?1:0),2];},rw:{antimatter:25,energy:2e7}},
 {id:'q52',n:'Вечная эпоха',           ic:'231b',  d:'Соверши 2 прыжка в Вечном режиме',  c:function(s){return (s.epochs||0)>=2;},  p:function(s){return [s.epochs||0,2];},  rw:{antimatter:50}},
 {id:'q55',n:'Первый контракт',         ic:'1f6a2', d:'Выполни 1 контракт звёздного порта',  c:function(s){return (s.stats.contractsDone||0)>=1;}, p:function(s){return [s.stats.contractsDone||0,1];}, rw:{credits:120000}},
 {id:'q56',n:'Магнат трафика',          ic:'1f6e9', d:'Выполни 25 контрактов порта',         c:function(s){return (s.stats.contractsDone||0)>=25;},p:function(s){return [s.stats.contractsDone||0,25];},rw:{antimatter:12}},
 {id:'q57',n:'Гильдия перевозчиков',    ic:'1f4e1', d:'Купи «Гильдия перевозчиков»',         c:function(s){return !!s.upgrades['port1'];},p:function(s){return [s.upgrades['port1']?1:0,1];},rw:{credits:4e6}},
 {id:'q58',n:'Кольцо обитания',         ic:'1f3a0', d:'Построй кольцо обитания',             c:function(s){return (s.modules.ring||0)>=1;},p:function(s){return [s.modules.ring||0,1];},rw:{antimatter:20}},
 {id:'q59',n:'Звёздные врата',          ic:'1f6aa', d:'Построй звёздные врата',              c:function(s){return (s.modules.gate||0)>=1;},p:function(s){return [s.modules.gate||0,1];},rw:{antimatter:45}},
 {id:'q60',n:'Ядро галактики',          ic:'1f300', d:'Отправь экспедицию к ядру галактики', c:function(s){return (s.stats.expCore||0)>=1;},p:function(s){return [s.stats.expCore||0,1];},rw:{antimatter:60}},
 {id:'q61',n:'Уровень станции 40',      ic:'1f3d7', d:'Доведи станцию до 40 уровня',         c:function(s){return stationLevel(s)>=40;},p:function(s){return [stationLevel(s),40];},rw:{antimatter:80}},
 {id:'q62',n:'Легенда порта',           ic:'1f4dc', d:'Выполни 100 контрактов порта',        c:function(s){return (s.stats.contractsDone||0)>=100;},p:function(s){return [s.stats.contractsDone||0,100];},rw:{antimatter:70}},
 {id:'q63',n:'Свой человек в порту',    ic:'1f3c6', d:'Дорасти порта до «Звёздного порта»',    c:function(s){return G.portRep(s).lv>=3;},p:function(s){return [Math.min(s.stats.contractsDone||0,40),40];},rw:{antimatter:30}},
 {id:'q64',n:'Большая сделка',          ic:'1f4b5', d:'Закрой 3 большие сделки дня',           c:function(s){return (s.stats.dealsDone||0)>=3;},p:function(s){return [s.stats.dealsDone||0,3];},rw:{antimatter:25}},
 {id:'q65',n:'Первый корабль',          ic:'1f6a2', d:'Построй первый корабль на верфи',        c:function(s){return G.shipOwned(s)>=1;},p:function(s){return [G.shipOwned(s),1];},rw:{credits:2e6}},
 {id:'q66',n:'Собственный флот',        ic:'1f6f8', d:'Спусти на воду 4 корабля',               c:function(s){return G.shipOwned(s)>=4;},p:function(s){return [G.shipOwned(s),4];},rw:{antimatter:40}},
 {id:'q67',n:'Адмирал верфи',           ic:'1f6a4', d:'Собери все 6 кораблей верфи',            c:function(s){return G.shipOwned(s)>=6;},p:function(s){return [G.shipOwned(s),6];},rw:{antimatter:120}},
 {id:'q68',n:'Слаженная команда',        ic:'1f91d', d:'Собери 2 бонус-сета кораблей',              c:function(s){return G.setCount(s)>=2;},p:function(s){return [G.setCount(s),2];},rw:{antimatter:60}},
 {id:'q69',n:'Расширенный пирс',         ic:'1f6a4', d:'Построй расширенный пирс порта',            c:function(s){return !!s.pier;},p:function(s){return [s.pier?1:0,1];},rw:{antimatter:18,credits:4e7}},
 {id:'q71',n:'Ордер на абордаж',         ic:'2620',  d:'Купи «Боевой ордер флота», патруль ×2',      c:function(s){return !!s.upgrades['ford1'];},p:function(s){return [s.upgrades['ford1']?1:0,1];},rw:{antimatter:35}},
 {id:'q72',n:'Флот во всём',             ic:'1f6e9', d:'Купи боевой и торговый ордера флота',         c:function(s){return !!(s.upgrades['ford1']&&s.upgrades['ford2']);},p:function(s){return [(s.upgrades['ford1']?1:0)+(s.upgrades['ford2']?1:0),2];},rw:{antimatter:80}},
 {id:'q70',n:'Срочная доставка',         ic:'26a1',  d:'Закрой 5 срочных чартеров порта',           c:function(s){return (s.stats.urgentDone||0)>=5;},p:function(s){return [Math.min(s.stats.urgentDone||0,5),5];},rw:{antimatter:25}},
 {id:'q73',n:'Док-бригада',              ic:'1f527', d:'Почини 3 корабля в ремонтном доке',           c:function(s){return (s.stats.repairs||0)>=3;},p:function(s){return [Math.min(s.stats.repairs||0,3),3];},rw:{antimatter:20,credits:2e8}},
 {id:'q74',n:'Сезонная программа',       ic:'1f4c5', d:'Закрой 3 сезонных задания',                   c:function(s){return (s.stats.sqDone||0)>=3;},p:function(s){return [Math.min(s.stats.sqDone||0,3),3];},rw:{antimatter:30}},
 {id:'q75',n:'Вечная наука',             ic:'231b',  d:'Изучи 2 вечных узла лаборатории',             c:function(s){return G.resEternal(s)>=2;},p:function(s){return [G.resEternal(s),2];},rw:{antimatter:150}},
 {id:'q76',n:'Марафон сезонов',          ic:'1f3c5', d:'Закрой 12 сезонных заданий',                  c:function(s){return (s.stats.sqDone||0)>=12;},p:function(s){return [Math.min(s.stats.sqDone||0,12),12];},rw:{antimatter:120}},
 {id:'q77',n:'Охотник на охотника',      ic:'1f3af', d:'Сбей пиратского охотника за кораблями',        c:function(s){return (s.stats.hunters||0)>=1;},p:function(s){return [Math.min(s.stats.hunters||0,1),1];},rw:{antimatter:25,credits:5e8}},
 {id:'q78',n:'Своя ремонтная бригада',   ic:'1f6e0', d:'Купи улучшение «Ремонтная бригада»',           c:function(s){return !!s.upgrades['rep1'];},p:function(s){return [s.upgrades['rep1']?1:0,1];},rw:{antimatter:30}},
 {id:'q79',n:'Док без простоев',         ic:'1f527', d:'Почини 10 кораблей в ремонтном доке',          c:function(s){return (s.stats.repairs||0)>=10;},p:function(s){return [Math.min(s.stats.repairs||0,10),10];},rw:{antimatter:60}},
 {id:'q80',n:'Сделка на пике',           ic:'1f4c8', d:'Проведи 3 пиковые сделки биржи',                c:function(s){return (s.stats.peakDeals||0)>=3;},p:function(s){return [Math.min(s.stats.peakDeals||0,3),3];},rw:{credits:5e7,antimatter:8}},
 {id:'q81',n:'Страховка флота',          ic:'1f6e1', d:'Построй «Сухой док»',                           c:function(s){return !!s.upgrades['rep2'];},p:function(s){return [s.upgrades['rep2']?1:0,1];},rw:{antimatter:45}},
 {id:'q82',n:'Стража верфи',             ic:'1f6e1', d:'Сбей 5 охотников за кораблями',                 c:function(s){return (s.stats.hunters||0)>=5;},p:function(s){return [Math.min(s.stats.hunters||0,5),5];},rw:{antimatter:70}},
 {id:'q83',n:'Первый караван',           ic:'1f6a2', d:'Проведи караван из трёх контрактов',              c:function(s){return (s.stats.caravans||0)>=1;}, p:function(s){return [Math.min(s.stats.caravans||0,1),1];},rw:{antimatter:30,credits:8e8}},
 {id:'q84',n:'Магистраль караванов',     ic:'1f6e9', d:'Проведи 12 караванов целиком',                    c:function(s){return (s.stats.caravans||0)>=12;},p:function(s){return [Math.min(s.stats.caravans||0,12),12];},rw:{antimatter:90}},
 {id:'q85',n:'Модернизация флота',       ic:'1f527', d:'Улучши корабли верфи 5 раз',                        c:function(s){return (s.stats.shipUps||0)>=5;},p:function(s){return [Math.min(s.stats.shipUps||0,5),5];},rw:{antimatter:25,credits:5e7}},
 {id:'q86',n:'Инженер вечности',         ic:'1f6e1', d:'Улучши корабли верфи 25 раз',                       c:function(s){return (s.stats.shipUps||0)>=25;},p:function(s){return [Math.min(s.stats.shipUps||0,25),25];},rw:{antimatter:150,chests:2}},
 {id:'q87',n:'Вечная цепь капитана',     ic:'1f3c5', d:'Пройди 16 шагов цепи задач капитана',               c:function(s){return (s.stats.chainDone||0)>=16;},p:function(s){return [Math.min(s.stats.chainDone||0,16),16];},rw:{antimatter:80,chests:2}}
];

var EXPLORE = [
 {key:'survey',  n:'Облёт сектора',        ic:'1f4e1', pl:0, ch:0.76, dur:10,  cd:2,  cost:{energy:0.06},                 rw:{energy:1},              mult:5.0, lost:0.55},
 {key:'comet',   n:'Кометный след',        ic:'2604',  pl:1, ch:0.73, dur:12,  cd:2,  cost:{energy:0.05,minerals:0.02},    rw:{energy:0.6,credits:0.4},mult:5.2, lost:0.55},
 {key:'mine',    n:'Бурение астероида',   ic:'1faa8', pl:2, ch:0.70, dur:15,  cd:3,  cost:{energy:0.05,minerals:0.04},    rw:{minerals:1},            mult:5.4, lost:0.55},
 {key:'reef',    n:'Ледяной риф',          ic:'2744',  pl:3, ch:0.68, dur:18,  cd:3,  cost:{energy:0.05,credits:0.02},     rw:{minerals:0.7,credits:0.3},mult:5.6,lost:0.55,anti:1},
 {key:'debris',  n:'Чистка орбиты',        ic:'1f6f0', pl:4, ch:0.66, dur:22,  cd:3,  cost:{energy:0.05,minerals:0.04},    rw:{credits:1},             mult:5.8, lost:0.5},
 {key:'relic',   n:'Поиск реликвий',       ic:'1f3fa', pl:5, ch:0.62, dur:26,  cd:4,  cost:{energy:0.05,credits:0.03},     rw:{credits:0.7,minerals:0.3},mult:6.0,lost:0.5,chest:1,anti:1},
 {key:'storm',   n:'Солнечная вспышка',    ic:'1f31e', pl:6, ch:0.64, dur:30,  cd:4,  cost:{energy:0.06,minerals:0.03},    rw:{energy:1},              mult:6.2, lost:0.5},
 {key:'market',  n:'Чёрный рынок',         ic:'1f4b1', pl:7, ch:0.68, dur:35,  cd:5,  cost:{energy:0.04,credits:0.04},     rw:{credits:1},             mult:6.4, lost:0.5},
 {key:'derelict',n:'Заброшенный корабль',  ic:'1f6f8', pl:8, ch:0.58, dur:40,  cd:5,  cost:{energy:0.05,credits:0.04},     rw:{credits:0.6,minerals:0.4},mult:6.8,lost:0.5,chest:1,anti:1},
 {key:'signal',  n:'Тайный сигнал',        ic:'1f4fb', pl:9, ch:0.57, dur:45,  cd:6,  cost:{energy:0.05,credits:0.05},     rw:{energy:0.6,credits:0.4},mult:7.0, lost:0.45,anti:1},
 {key:'nebula',  n:'Изучение туманности',  ic:'1f30c', pl:10,ch:0.56, dur:50,  cd:6,  cost:{energy:0.06,minerals:0.04},    rw:{energy:0.7,credits:0.3},mult:7.2, lost:0.45,anti:1},
 {key:'hole',    n:'Вход в червоточину',   ic:'1f300', pl:11,ch:0.48, dur:60,  cd:8,  cost:{energy:0.05,credits:0.05},     rw:{energy:0.5,credits:0.5},mult:7.6, lost:0.45,anti:2},
 {key:'gate',    n:'Древние врата',        ic:'1f573', pl:12,ch:0.45, dur:75,  cd:10, cost:{energy:0.05,credits:0.06},     rw:{credits:0.7,minerals:0.3},mult:8.0,lost:0.4,anti:3,chest:2},
 {key:'foundry', n:'Орбитальная верфь',    ic:'1f6f8', pl:13,ch:0.43, dur:90,  cd:12, cost:{energy:0.05,credits:0.06},     rw:{credits:0.6,minerals:0.4},mult:8.4,lost:0.4,anti:4,chest:2},
 {key:'archive', n:'Архив древних',        ic:'1f3fa', pl:14,ch:0.41, dur:110, cd:15, cost:{energy:0.06,credits:0.07},     rw:{credits:0.5,minerals:0.5},mult:8.8,lost:0.4,anti:6,chest:2},
 {key:'core',    n:'Ядро галактики',       ic:'1f300', pl:15,ch:0.37, dur:140, cd:20, cost:{energy:0.06,credits:0.08},     rw:{credits:0.5,energy:0.3,minerals:0.2},mult:9.5,lost:0.35,anti:10,chest:3}
];


/* ---- верфь: собственные корабли (Kenney Simple Space), постоянные бонусы, не сгорают при прыжке ---- */
var SHIPS=[
 {id:'sh1', n:'Буксир «Киль»',       img:'space/ship_A.png', cost:{credits:2.5e6,antimatter:0},  eff:{portgap:0.10},        d:'Корабли в порт прибывают на 10% чаще'},
 {id:'sh2', n:'Рудовоз «Карьера»',   img:'space/ship_B.png', cost:{credits:4e7,antimatter:4},    eff:{sell:1.25},           d:'Курс руды на бирже ×1,25'},
 {id:'sh3', n:'Фрегат «Авангард»',   img:'space/ship_G.png', cost:{credits:9e8,antimatter:12},   eff:{cd:0.15},             d:'Кулдауны экспедиций −15%'},
 {id:'sh4', n:'Лайнер «Мираж»',      img:'space/ship_I.png', cost:{credits:2e10,antimatter:30},  eff:{port:1.30},           d:'Награды звёздного порта ×1,3'},
 {id:'sh5', n:'Док-матка «Гера»',    img:'space/station_A.png',cost:{credits:6e11,antimatter:70},eff:{portgap:0.12,all:1.12},d:'Ещё −12% к сроку швартовки и +12% ко всему доходу'},
 {id:'sh6', n:'Линкор «Титан»',      img:'space/ship_L.png', cost:{credits:2e13,antimatter:150}, eff:{all:1.30,click:2},    d:'Весь доход ×1,3 и сила тапа ×2'}
];
function shipOwned(s){var n=0;for(var k in (s.ships||{}))if(s.ships[k])n++;return n;}
/* ---- уровни кораблей: вечная лесенка за антиматерию. Каждый уровень усиливает
   бонус корабля, а на 3/6/10/15 уровнях открывает постоянный перк флота. ---- */
var SHIP_UP={sh1:2,sh2:4,sh3:8,sh4:16,sh5:32,sh6:64};
var SHIP_PERKS=[{lv:3,t:'патруль +1,2 урона/сек',k:'patrol',v:1.2},
                {lv:6,t:'весь доход станции +2%',k:'all',v:1.02},
                {lv:10,t:'награды порта +4%',k:'port',v:1.04},
                {lv:15,t:'весь доход станции ещё +4%',k:'all',v:1.04},
                {lv:20,t:'патруль ещё +1,5 урона/сек',k:'patrol',v:1.5},
                {lv:25,t:'награды порта ещё +6%',k:'port',v:1.06},
                {lv:35,t:'весь доход станции ещё +7%',k:'all',v:1.07},
                {lv:50,t:'весь доход станции ещё +12%',k:'all',v:1.12},
                {lv:60,t:'патруль ещё +2 урона/сек',k:'patrol',v:2},
                {lv:75,t:'награды порта ещё +10%',k:'port',v:1.10}];
function shipLv(s,id){ if(!(s.ships&&s.ships[id]))return 0; return Math.max(1,+(s.shipLv||{})[id]||1); }
function shipLvSum(s){var n=0;SHIPS.forEach(function(b){n+=shipLv(s,b.id);});return n;}
function shipUpCost(s,id){ var lv=shipLv(s,id); if(!lv)return 0;
  return Math.ceil((SHIP_UP[id]||4)*Math.pow(1.45,lv-1)); }
function shipLvMult(s,id){ return 1+0.15*(shipLv(s,id)-1); }
function shipPerkCount(s,lv){ var n=0; SHIPS.forEach(function(b){ if(shipLv(s,b.id)>=lv)n++; }); return n; }
function shipPerksOf(s,id){ var lv=shipLv(s,id),o=[];
  SHIP_PERKS.forEach(function(p){ if(lv>=p.lv)o.push(p); }); return o; }
function shipNextPerk(s,id){ var lv=shipLv(s,id),n=null;
  SHIP_PERKS.forEach(function(p){ if(!n&&p.lv>lv)n=p; }); return n; }
function upShip(s,id){
  if(!(s.ships&&s.ships[id]))return {ok:false,msg:'Корабль ещё не сошёл с верфи'};
  if(!gateOpen(s,'yard'))return gateErr('yard');
  var cost=shipUpCost(s,id);
  if((s.resources.antimatter||0)<cost)return {ok:false,msg:'Нужно '+cost+' антиматерии'};
  s.resources.antimatter-=cost; s.shipLv=s.shipLv||{};
  s.shipLv[id]=shipLv(s,id)+1; s.stats.shipUps=(s.stats.shipUps||0)+1;
  var b=shipById(id),lv=s.shipLv[id];
  logAdd(s,'⚙ '+b.n+' → ур. '+lv+' (бонус усилен)','gold');
  var pk=SHIP_PERKS.filter(function(p){return p.lv===lv;})[0];
  if(pk)logAdd(s,'✦ Перк флота открыт: '+pk.t+' — '+b.n+' ур. '+lv,'gold');
  return {ok:true,id:id,lv:lv,cost:cost,perk:pk||null};
}
/* ---- бонус-сеты флота: комбинации кораблей дают второй слой синергии ---- */
var SHIP_SETS=[
 {id:'st1', n:'Эскорт торговцев',    need:['sh3','sh4'], ic:'1f6a2', eff:{port:1.25},
   d:'Награды звёздного порта ещё ×1,25'},
 {id:'st2', n:'Логистическая линия', need:['sh1','sh2'], ic:'1f69a', eff:{portgap:0.15,sell:1.2},
   d:'Корабли в порт на 15% чаще, курс руды ×1,2'},
 {id:'st3', n:'Флагманский ордер',   need:['sh5','sh6'], ic:'2620',  eff:{all:1.2,cd:0.10},
   d:'Весь доход ×1,2 и кулдауны экспедиций ещё −10%'}
];
/* --- индексы эффектов -------------------------------------------------------
   Без них upgMult/resEff/artEff/shipEff перебирают ВСЕ апгрейды, исследования,
   артефакты и корабли на каждый вызов. На поздней базе это 200+ итераций внутри
   одного кадра: станция начала тормозить до 2 fps. Индекс строится один раз. */
var EFFK=['all','click','sell','offline','def','port','luck','tap','cd','portgap'];
var EFF_NONE=[];
function effBucket(list){
  var b={mod:[]};
  for(var i=0;i<EFFK.length;i++)b[EFFK[i]]=[];
  list.forEach(function(it){
    var e=it.eff; if(!e)return;
    for(var i=0;i<EFFK.length;i++){var k=EFFK[i];if(e[k]!==undefined&&e[k]!==null)b[k].push(it);}
    if(e.mod!==undefined&&e.mod!==null)b.mod.push(it);
  });
  return b;
}
var _bArt,_bRes,_bShip,_bSet,_bUpg;
function artB(){ return _bArt||(_bArt=effBucket(ART)); }
function resB(){ return _bRes||(_bRes=effBucket(RESEARCH)); }
function shipB(){ return _bShip||(_bShip=effBucket(SHIPS)); }
function setB(){ return _bSet||(_bSet=effBucket(SHIP_SETS)); }
function upgB(){ if(_bUpg)return _bUpg; _bUpg={};
  UPGRADES.forEach(function(u){ var k=u.eff; if(!k)return; (_bUpg[k]||(_bUpg[k]=[])).push(u); });
  return _bUpg; }
function applyShipEff(m,e,kind,k){
  if(!e)return m;
  k=(k===undefined||k!==k)?1:Math.max(1,k);
  var v=e[kind];
  if(v===undefined||v===null)return m;
  if(kind==='port')m*=v;
  else if(kind==='cd'||kind==='portgap')m+=v;
  else m*=1+(v-1)*k;
  return m;
}
function shipEff(s,kind){
  var add=(kind==='cd'||kind==='portgap');
  var m=add?0:1, i, B=shipB(), S=setB();
  var list=B[kind]||EFF_NONE;
  for(i=0;i<list.length;i++){ var b=list[i];
    if(!shipInService(s,b.id))continue;
    m=applyShipEff(m,b.eff,kind,shipLvMult(s,b.id)); }
  var sets=S[kind]||EFF_NONE;
  for(i=0;i<sets.length;i++){ var st=sets[i];
    if(!setHas(s,st.id))continue;
    m=applyShipEff(m,st.eff,kind,1); }
  /* перки за уровни кораблей: вечный слой прогресса флота */
  if(kind==='all'){ var a6=shipPerkCount(s,6),a15=shipPerkCount(s,15),a35=shipPerkCount(s,35),a50=shipPerkCount(s,50);
    if(a6)m*=Math.pow(1.02,a6); if(a15)m*=Math.pow(1.04,a15);
    if(a35)m*=Math.pow(1.07,a35); if(a50)m*=Math.pow(1.12,a50); }
  if(kind==='port'){ var p10=shipPerkCount(s,10),p25=shipPerkCount(s,25),p75=shipPerkCount(s,75);
    if(p10)m*=Math.pow(1.04,p10); if(p25)m*=Math.pow(1.06,p25); if(p75)m*=Math.pow(1.10,p75); }
  return m;
}
function setHas(s,id){
  var st=null;
  SHIP_SETS.forEach(function(x){
    if(x.id!==id)return;
    var ok=x.need.every(function(k){return !!(s.ships&&s.ships[k]);});
    if(ok)st=x;
  });
  return !!st;
}
function setCount(s){var n=0;SHIP_SETS.forEach(function(x){if(setHas(s,x.id))n++;});return n;}
function setParts(s,id){
  var st=null;SHIP_SETS.forEach(function(x){if(x.id===id)st=x;});
  if(!st)return {have:0,need:0,names:[]};
  return {have:st.need.filter(function(k){return !!(s.ships&&s.ships[k]);}).length,
          need:st.need.length,
          names:st.need.map(function(k){var b=shipById(k);return b?b.n:k;})};
}
/* патруль флота: каждый корабль бьёт по пиратам в рейде */
function fleetDps(s){
  var per=1.8+1.2*shipPerkCount(s,3)+1.5*shipPerkCount(s,20)+2*shipPerkCount(s,60);
  return shipFit(s)*per*(s.upgrades&&s.upgrades['ford1']?2:1);
}
function portGapCut(s){return Math.min(0.5,shipEff(s,'portgap')+(s.upgrades&&s.upgrades['ford2']?0.10:0));}
function shipById(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i];return null;}
var SHIP_LV=[0,8,14,20,26,32];
/* верфь тоже открывается лесенкой: один корабль за один шаг цепи */
var SHIP_CHAIN=[0,9,10,11,12,13];
function shipIdx(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return i;return -1;}
/* корабль открывается, когда построен предыдущий и достигнут нужный уровень станции */
function shipUnlocked(s,id){var i=shipIdx(id);
  /* верфь целиком заперта до шага цепи 9: до этого игрок не видит ни одного корабля */
  if(!gateOpen(s,'yard'))return false;
  if(i<=0)return true;
  return shipOwned(s)>=i&&stationLevel(s)>=SHIP_LV[i]&&(s.chain||0)>=SHIP_CHAIN[i];}
function shipReqText(id){var i=shipIdx(id);if(i<=0)return '';
  return 'Нужен предыдущий корабль, уровень станции '+SHIP_LV[i]+' и шаг цепи '+SHIP_CHAIN[i];}
function buyShip(s,id){
  var b=shipById(id); if(!b)return{ok:false,msg:'Корабль не найден'};
  if(s.ships&&s.ships[id])return{ok:false,msg:'Уже на ходу'};
  if(!shipUnlocked(s,id))return{ok:false,msg:'Верфь ещё не спустила этот корпус на воду'};
  for(var k in b.cost){ if((s.resources[k]||0)<b.cost[k])return{ok:false,msg:'Не хватает: '+fmt(b.cost[k])}; }
  for(var k2 in b.cost) s.resources[k2]-=b.cost[k2];
  if(!s.ships)s.ships={}; s.ships[id]=1; s.stats.shipsBought=(s.stats.shipsBought||0)+1;
  return{ok:true,b:b,install:shipInstallStart(s,id,Date.now())};
}
/* ---- верфь: спуск корпуса с стапеля ----
   Корабль куплен, но на орбиту выходит не мгновенно: пока стапель работает, бонусы
   корабля не действуют. Это тот же «breakthrough moment», что и монтаж корпуса:
   большое событие, которого ждут, а не щелчок. */
var SHIP_INSTALL=[0,3*60000,4*60000,5*60000,6*60000,8*60000];
function shipInstallStart(s,id,now){
  var i=shipIdx(id); if(i<=0||!SHIP_INSTALL[i])return null;
  if(!s.shipInstall)s.shipInstall={};
  if(s.shipInstall[id])return shipInstallInfo(s,id,now);
  var t=SHIP_INSTALL[i], at=now||Date.now();
  s.shipInstall[id]={at:at,end:at+t,total:t};
  logAdd(s,'\u{1f6a2} Стапель: '+shipById(id).n+' спускают '+Math.round(t/60000)+
    ' мин; бонусы включатся, когда корпус выйдет на орбиту','');
  return shipInstallInfo(s,id,now);
}
function shipInstallInfo(s,id,now){
  now=tnow(now); var it=s.shipInstall&&s.shipInstall[id]; if(!it)return null;
  var total=+it.total||0,left=Math.max(0,(+it.end||0)-now);
  return {id:id,at:+it.at||now,end:+it.end||0,total:total,left:left,done:left<=0,
          pct:total?Math.max(0,Math.min(100,(total-left)/total*100)):100};
}
function shipInstallList(s,now){
  now=tnow(now); var out=[]; if(!s.shipInstall)return out;
  Object.keys(s.shipInstall).forEach(function(k){ var i=shipInstallInfo(s,k,now); if(i&&!i.done)out.push(i); });
  return out;
}
/* завершение спуска: один раз, с наградой и записью в журнал */
function shipInstallTick(s,now){
  now=tnow(now); var out=[]; if(!s.shipInstall)return out;
  Object.keys(s.shipInstall).slice().forEach(function(k){
    var i=shipInstallInfo(s,k,now); if(!i||!i.done)return;
    delete s.shipInstall[k];
    var b=shipById(k); if(!b)return;
    pushChest(s,2);
    logAdd(s,'\u2693 Спущен: '+b.n+' вышел на орбиту, бонусы работают','gold');
    out.push({id:k,name:b.n,info:i});
  });
  return out;
}
/* корабль в строю: куплен, не в доке и уже спущен на воду */
function shipInService(s,id){
  return !!(s.ships&&s.ships[id])&&!shipDmg(s,id)&&!shipInstallInfo(s,id,Date.now());
}
/* ---- абордаж: пираты снимают корабль с линии, он встаёт в ремонтный док ---- */
var DOCK_AUTO_MS=25*60*1000;
function shipDmg(s,id){return !!(s.dock&&s.dock[id]);}
function dockList(s){return SHIPS.filter(function(b){return (s.ships&&s.ships[b.id])&&shipDmg(s,b.id);});}
function dockCount(s){return dockList(s).length;}
function shipFit(s){ var n=0; SHIPS.forEach(function(b){ if(shipInService(s,b.id))n++; }); return n; }
function repairCost(s,id){
  var i=Math.max(0,shipIdx(id)), l=stationLevel(s);
  var base=Math.max(4000,Math.floor(rates(s).credits*60));
  return Math.floor(base*(1+0.35*i)*(1+0.04*l));
}
function dockState(s,id,now){
  now=tnow(now);
  var b=shipById(id); if(!b||!(s.ships&&s.ships[id])||!shipDmg(s,id))return null;
  var d=s.dock[id]||{}, at=+d.at||now, until=+d.until||(at+DOCK_AUTO_MS);
  var c=repairCost(s,id);
  return {b:b,at:at,until:until,left:Math.max(0,until-now),cost:c,can:(s.resources.credits||0)>=c};
}
function boardShip(s,id){
  var b=shipById(id);
  if(!b||!(s.ships&&s.ships[id])||shipDmg(s,id))return null;
  if(!s.dock)s.dock={};
  s.dock[id]={at:Date.now(),until:Date.now()+DOCK_AUTO_MS};
  s.stats.boardings=(s.stats.boardings||0)+1;
  logAdd(s,'Абордаж: '+b.n+' встал в ремонтный док','err');
  return b;
}
function boardRandom(s){
  var pool=SHIPS.filter(function(b){return (s.ships&&s.ships[b.id])&&!shipDmg(s,b.id);});
  if(!pool.length)return null;
  return boardShip(s,pool[Math.floor(Math.random()*pool.length)].id);
}
function repairShip(s,id,now){
  now=tnow(now);
  var b=shipById(id);
  if(!b||!shipDmg(s,id))return{ok:false,msg:'Этот корабль не в доке'};
  if(!gateOpen(s,'dock'))return gateErr('dock');
  var c=repairCost(s,id);
  if((s.resources.credits||0)<c)return{ok:false,msg:'Нужно '+fmt(c)+' кредитов'};
  s.resources.credits-=c; delete s.dock[id];
  s.stats.repairs=(s.stats.repairs||0)+1;
  logAdd(s,'Ремонтный док: '+b.n+' снова в строю','ok');
  return{ok:true,cost:c,b:b};
}
/* страховка флота: «Сухой док» режет шанс абордажа вдвое */
function dockSafe(s){ var m=1; UPGRADES.forEach(function(u){ if(s.upgrades&&s.upgrades[u.id]&&u.eff==='docksafe')m*=u.v; }); return m; }
/* ---- пиковая сделка биржи: продать всё на пике курса с бонусом ---- */
var PEAK_CD=180000, PEAK_WAVE=1.28, PEAK_BASE=1.3;
function peakBonus(s){ return PEAK_BASE*upgMult(s,'peak'); }
function peakDealState(s,now){
  now=tnow(now);
  var w=marketWave(now), ready=((s.peakAt||0)<=now), cd=Math.max(0,(s.peakAt||0)-now);
  return {w:w,hot:w>=PEAK_WAVE,ready:ready,cd:cd,bonus:peakBonus(s),
          can:ready&&w>=PEAK_WAVE&&gateOpen(s,'market')&&Math.floor(s.resources.minerals||0)>=50,
          qty:Math.floor(s.resources.minerals||0),
          credits:Math.floor(Math.floor(s.resources.minerals||0)*sellRate(s,now)*peakBonus(s))};
}
function peakDeal(s,now){
  now=tnow(now);
  var st=peakDealState(s,now);
  if(!gateOpen(s,'market'))return gateErr('market');
  if(!st.ready)return{ok:false,msg:'Сделка уже была — жди '+Math.ceil(st.cd/1000)+' с'};
  if(!st.hot)return{ok:false,msg:'Сейчас не пик курса'};
  var qty=st.qty; if(qty<50)return{ok:false,msg:'Мало руды'};
  var cr=Math.floor(qty*sellRate(s,now)*st.bonus);
  s.resources.minerals-=qty; s.resources.credits+=cr; s.stats.totalCredits+=cr;
  s.stats.sells++; s.stats.peakSells=(s.stats.peakSells||0)+1; s.stats.peakDeals=(s.stats.peakDeals||0)+1;
  s.peakAt=now+PEAK_CD;
  return{ok:true,credits:cr,qty:qty,bonus:st.bonus};
}
/* аварийный ремонт: раз в 10 минут бесплатно и мгновенно */
var EMG_CD=10*60000;
function emgState(s,now){
  now=tnow(now);
  var cd=Math.max(0,(s.emgAt||0)-now);
  return {ready:cd<=0, cd:cd, has:G?dockList(s).length:dockList(s).length,
          can:cd<=0&&dockList(s).length>0};
}
function emergencyRepair(s,now){
  now=tnow(now);
  var st=emgState(s,now);
  if(!gateOpen(s,'dock'))return gateErr('dock');
  if(!st.ready)return{ok:false,msg:'Аварийная команда отдыхает: '+Math.ceil(st.cd/1000)+' с'};
  var list=dockList(s); if(!list.length)return{ok:false,msg:'В доке никого нет'};
  var best=list[0],bc=repairCost(s,list[0].id);
  list.forEach(function(b){ var c=repairCost(s,b.id); if(c<bc){bc=c;best=b;} });
  delete s.dock[best.id];
  s.emgAt=now+EMG_CD; s.stats.repairs=(s.stats.repairs||0)+1; s.stats.emg=(s.stats.emg||0)+1;
  logAdd(s,'Аварийная команда сняла с мели '+best.n,'ok');
  return{ok:true,b:best};
}
/* авто-ремонт по таймеру: тупиков нет, даже без кредитов корабль вернётся в строй */
function dockTick(s,now){
  now=tnow(now); var out=[];
  if(!s.dock)return out;
  Object.keys(s.dock).forEach(function(k){
    var d=s.dock[k]||{}, until=+d.until||0;
    if(until&&until<=now){ delete s.dock[k]; out.push(shipById(k)); }
  });
  return out;
}
/* ---- журнал станции ---- */
/* Любой вызов ядра может прийти с «временем» не того типа: UI и QA-прогоны передают
   то состояние, то undefined. Если в поле t/exp попадёт объект, сейв разваливается
   на циклической структуре (JSON.stringify бросает), а вместе с ним и вся игра.
   tnow() превращает любое «now» в честное число. */
function tnow(x){ return (typeof x==='number'&&isFinite(x))?x:Date.now(); }
function logAdd(s,txt,kind){
  if(!s.log)s.log=[];
  s.log.unshift({t:Date.now(),x:String(txt).slice(0,90),k:kind||''});
  if(s.log.length>40)s.log.length=40;
}

/* ---- облики станции (Kenney Simple Space, единый стиль) ---- */
var SKINS = [
 {id:'rocket',        n:'«Горизонт»',      img:'rocket.webp',              cost:0,  d:'Штатный корабль станции.'},
 {id:'station_orange',n:'База «Терра»',    img:'skins/station_orange.webp',cost:3,  d:'Посёлок на красной планете.'},
 {id:'station_dome',  n:'Купол «Люмен»',   img:'skins/station_dome.webp',  cost:8,  d:'Купольный город с обсерваторией.'},
 {id:'station_lab',   n:'Комплекс «Нова»', img:'skins/station_lab.webp',   cost:18, d:'Научный комплекс глубокого космоса.'},
  {id:'station_solar', n:'Узел «Гелиос»',   img:'skins/station_solar.webp', cost:35, d:'Солнечная электростанция орбиты.'},
 {id:'station_ufo',   n:'База «Посланник»',     img:'skins/station_ufo.webp',   cost:60, d:'Летучая тарелка глубокой разведки.'},
 {id:'ship_emerald',  n:'Крейсер «Изумруд»',    img:'skins/ship_emerald.webp',  cost:110,d:'Дальний крейсер с плазменным приводом.'},
 {id:'rocket_retro',  n:'Ракета «Аврора»',    img:'skins/rocket_retro.webp',  cost:180,d:'Разведчик со звёздными крыльями.'}
];


var DAILY = [
 {d:1, rw:{credits:2000},        t:'День 1', ic:'1f4c5'},
 {d:2, rw:{credits:6000},        t:'День 2', ic:'1f4c5'},
 {d:3, rw:{minerals:4000},       t:'День 3', ic:'1faa8'},
 {d:4, rw:{credits:25000},       t:'День 4', ic:'1f4b0'},
 {d:5, rw:{energy:250000},       t:'День 5', ic:'26a1'},
 {d:6, rw:{credits:90000},       t:'День 6', ic:'1f4b8'},
 {d:7, rw:{antimatter:2},        t:'Неделя!', ic:'2728'}
];

/* ---- прогресс наград (честные прогресс-бары) ---- */
var ACHP={
 click1:function(s){return [s.stats.totalClicks,1];},
 click100:function(s){return [s.stats.totalClicks,100];},
 click1k:function(s){return [s.stats.totalClicks,1000];},
 click5k:function(s){return [s.stats.totalClicks,5000];},
 eng1k:function(s){return [s.stats.totalEnergy,1e3];},
 eng1m:function(s){return [s.stats.totalEnergy,1e6];},
 eng1b:function(s){return [s.stats.totalEnergy,1e9];},
 eng1t:function(s){return [s.stats.totalEnergy,1e12];},
 min500:function(s){return [s.stats.totalMinerals,500];},
 min10k:function(s){return [s.stats.totalMinerals,1e4];},
 min1m:function(s){return [s.stats.totalMinerals,1e6];},
 cred5k:function(s){return [s.stats.totalCredits,5e3];},
 cred1m:function(s){return [s.stats.totalCredits,1e6];},
 cred100m:function(s){return [s.stats.totalCredits,1e8];},
 exp1:function(s){return [s.stats.totalExpeditions,1];},
 exp10:function(s){return [s.stats.totalExpeditions,10];},
 exp50:function(s){return [s.stats.totalExpeditions,50];},
 comet1:function(s){return [s.stats.cometsCaught,1];},
 comet10:function(s){return [s.stats.cometsCaught,10];},
 off1:function(s){return [s.stats.offlineGains,1];},
 lvl5:function(s){return [stationLevel(s),5];},
 lvl10:function(s){return [stationLevel(s),10];},
 lvl20:function(s){return [stationLevel(s),20];},
 pre1:function(s){return [s.prestigeCount,1];},
 pre3:function(s){return [s.prestigeCount,3];},
 pre7:function(s){return [s.prestigeCount,7];},
 quest5:function(s){return [s.stats.questsDone,5];},
 quest15:function(s){return [s.stats.questsDone,15];},
 daily1:function(s){return [s.stats.dailyClaims,1];},
 daily7:function(s){return [s.daily.streak,7];},
 skin3:function(s){return [s.stats.skinsBought,3];},
 dq10:function(s){return [s.stats.dqDone||0,10];},
 wheel5:function(s){return [s.stats.wheelSpins||0,5];},
 world4:function(s){return [stationLevel(s),12];},
 peak3:function(s){return [s.stats.peakSells||0,3];},
 art3:function(s){return [G.artOwned(s),3];},
 art7:function(s){return [G.artOwned(s),7];},
  art13:function(s){return [G.artOwned(s),G.ART.length];},
 flare5:function(s){return [s.stats.flares||0,5];},
 chest10:function(s){return [s.stats.chestsOpened||0,10];},
 autotap3:function(s){return [(['tap1','tap2','tap3'].filter(function(k){return s.upgrades[k];}).length),3];},
 forge1:function(s){return [s.modules.forge||0,1];},
 fleet5:function(s){return [s.modules.fleet||0,5];},
  lvl25:function(s){return [stationLevel(s),25];},
  skin6:function(s){return [Object.keys(s.skins||{}).length,SKINS.length];},
 raid5:function(s){return [s.stats.raids||0,5];},
 res1:function(s){return [G.resOwned(s),1];},
 res6:function(s){return [G.resOwned(s),6];},
 resAll:function(s){return [Math.min(G.resBase(s),12),12];},
 resInf:function(s){return [G.resEternal(s),4];},
 board1:function(s){return [Math.min(s.stats.boardings||0,1),1];},
 hunt1:function(s){return [Math.min(s.stats.hunters||0,1),1];},
 hunt5:function(s){return [Math.min(s.stats.hunters||0,5),5];},
 repAuto:function(s){return [s.upgrades['rep1']?1:0,1];},
 rep10:function(s){return [Math.min(s.stats.repairs||0,10),10];},
 rep2a:function(s){return [s.upgrades['rep2']?1:0,1];},
 peak1:function(s){return [Math.min(s.stats.peakDeals||0,1),1];},
 peak20:function(s){return [Math.min(s.stats.peakDeals||0,20),20];},
 emg3:function(s){return [Math.min(s.stats.emg||0,3),3];},
 car1:function(s){return [Math.min(s.stats.caravans||0,1),1];},
 car10:function(s){return [Math.min(s.stats.caravans||0,10),10];},
 rep5:function(s){return [Math.min(s.stats.repairs||0,5),5];},
 sq3:function(s){return [Math.min(s.stats.sqDone||0,3),3];},
 sq12:function(s){return [Math.min(s.stats.sqDone||0,12),12];},
 route3:function(s){return [s.stats.routes||0,3];},
 route12:function(s){return [s.stats.routes||0,12];},
 boss1:function(s){return [s.bosses||0,1];},
 boss5:function(s){return [s.bosses||0,5];},
 lvl30:function(s){return [stationLevel(s),30];},
 victory:function(s){return [s.victory?1:0,1];},
 epoch3:function(s){return [s.epochs||0,3];},
 port5:function(s){return [s.stats.contractsDone||0,5];},
 port25:function(s){return [s.stats.contractsDone||0,25];},
 port100:function(s){return [s.stats.contractsDone||0,100];},
 portClean:function(s){return [Math.min(s.stats.contractsDone||0,30),30];},
 ring1a:function(s){return [s.modules.ring||0,1];},
 gate3:function(s){return [s.modules.gate||0,3];},
 lvl40:function(s){return [stationLevel(s),40];},
 exp100:function(s){return [s.stats.totalExpeditions,100];},
 rep3:function(s){return [Math.min(s.stats.contractsDone||0,40),40];},
 rep6:function(s){return [Math.min(s.stats.contractsDone||0,220),220];},
 deal5:function(s){return [s.stats.dealsDone||0,5];},
 ship2:function(s){return [shipOwned(s),2];},
 ship4:function(s){return [shipOwned(s),4];},
 shipAll:function(s){return [shipOwned(s),SHIPS.length];},
 set1:function(s){return [setCount(s),1];},
 setAll:function(s){return [setCount(s),SHIP_SETS.length];},
 pier:function(s){return [s.pier?1:0,1];},
 urg5:function(s){return [Math.min(s.stats.urgentDone||0,5),5];},
 urg20:function(s){return [Math.min(s.stats.urgentDone||0,20),20];},
 ford1a:function(s){return [s.upgrades['ford1']?1:0,1];},
 fordAll:function(s){return [(s.upgrades['ford1']?1:0)+(s.upgrades['ford2']?1:0),2];}
};
function achState(s,a){
  if(s.achievements[a.id])return{done:true,cur:1,need:1};
  var f=ACHP[a.id]; if(!f)return{done:false,cur:0,need:1};
  var pr; try{pr=f(s);}catch(e){pr=[0,1];}
  var cur=+pr[0]||0,need=+pr[1]||1;
  if(!isFinite(cur))cur=0; if(!isFinite(need)||need<1)need=1;
  return{done:cur>=need,cur:Math.max(0,Math.min(cur,need)),need:need};
}

/* ---- планета на орбите: визуальная эволюция по уровню ---- */
var SCENE=[
 {lvl:1,  img:'planets/planet4.png', n:'Луна Станции',      glow:'rgba(190,200,225,.45)'},
 {lvl:4,  img:'planets/planet5.png', n:'Пустынный мир',     glow:'rgba(220,170,110,.5)'},
 {lvl:8,  img:'planets/planet3.png', n:'Голубой мир',       glow:'rgba(110,200,255,.55)'},
 {lvl:12, img:'planets/planet2.png', n:'Расплавленный мир', glow:'rgba(255,140,90,.55)'},
 {lvl:16, img:'planets/planet9.png', n:'Фиолетовый гигант', glow:'rgba(190,120,255,.6)'},
 {lvl:21, img:'planets/planet0.png', n:'Кристаллический мир',glow:'rgba(120,255,230,.6)'},
  {lvl:27, img:'planets/planet1.png', n:'Мир Туманностей',   glow:'rgba(170,150,255,.65)'},
 {lvl:33, img:'planets/planet6.png', n:'Ледяной мир',       glow:'rgba(150,225,255,.62)'},
 {lvl:40, img:'planets/planet7.png', n:'Изумрудный мир',    glow:'rgba(120,255,190,.62)'},
 {lvl:48, img:'planets/planet8.png', n:'Мир Кольца',        glow:'rgba(255,200,120,.65)'},
 {lvl:56, img:'planets/planet4.png', n:'Ледяная луна Титан',glow:'rgba(200,225,255,.66)'},
 {lvl:64, img:'planets/planet9.png', n:'Око Галактики',     glow:'rgba(255,170,255,.7)'},
 {lvl:72, img:'planets/planet3.png', n:'Мир Кольца-2',      glow:'rgba(140,220,255,.7)'},
 {lvl:80, img:'planets/planet0.png', n:'Ядро Галактики',    glow:'rgba(255,230,170,.75)'}
];
function sceneFor(s){var l=stationLevel(s),cur=SCENE[0];for(var i=0;i<SCENE.length;i++)if(l>=SCENE[i].lvl)cur=SCENE[i];return cur;}

/* ---- ежедневные задания ---- */
/* награды заданий/сундуков/налётов привязаны к ТЕКУЩЕМУ производству (mult — секунды добычи).
   Раньше они росли как 1.95^уровень: на поздних уровнях один сундук давал больше,
   чем часы работы станции, и прогресс улетал в бесконечность. */
function dqCred(s,mult){var l=stationLevel(s);return Math.floor(Math.max(400,(rates(s).credits||0)*mult)+Math.pow(1.14,l)*60);}
function dqEng(s,mult){var l=stationLevel(s);return Math.floor(Math.max(600,(rates(s).energy||0)*mult)+Math.pow(1.14,l)*80);}
function dqMin(s,mult){var l=stationLevel(s);return Math.floor(Math.max(150,(rates(s).minerals||0)*mult)+Math.pow(1.12,l)*40);}
var DQ=[
 {id:'tap',   n:'Разминка экипажа',  d:'Сделать {N} тапов по станции',       ic:'1f44a',  cur:function(s){return s.stats.totalClicks;},     need:function(s){return 120+stationLevel(s)*45;},  rw:function(s){return {credits:dqCred(s,700)};}},
 {id:'eng',   n:'Энергошторм',       d:'Накопить {N} энергии',               ic:'26a1',   cur:function(s){return s.stats.totalEnergy;},     need:function(s){return dqEng(s,900);},           rw:function(s){return {credits:dqCred(s,900)};}},
 {id:'min',   n:'Рудовоз',           d:'Добыть {N} руды',                    ic:'1faa8',  cur:function(s){return s.stats.totalMinerals;},   need:function(s){return dqMin(s,900);},           rw:function(s){return {minerals:dqMin(s,400),credits:dqCred(s,400)};}},
 {id:'cred',  n:'Сделка века',       d:'Заработать {N} кредитов',            ic:'1f31f',  cur:function(s){return s.stats.totalCredits;},    need:function(s){return dqCred(s,1200);},          rw:function(s){return {energy:dqEng(s,700)};}},
 {id:'exp',   n:'Поход за горизонт', d:'Отправить {N} экспедиций',           ic:'1fa90',  cur:function(s){return s.stats.totalExpeditions;},need:function(s){return 3+Math.min(9,Math.floor(stationLevel(s)/2));}, rw:function(s){return {credits:dqCred(s,1100)};},
   avail:function(s){ return gateOpen(s,'tab:explore'); }},
 {id:'succ',  n:'Без потерь',        d:'{N} успешных экспедиций',            ic:'1f9ed',  cur:function(s){return s.stats.expSuccess;},      need:function(s){return 2+Math.min(7,Math.floor(stationLevel(s)/3));},  rw:function(s){return {credits:dqCred(s,1400)};},
   avail:function(s){ return gateOpen(s,'tab:explore'); }},
 {id:'sell',  n:'Дилер биржи',       d:'Продать руду {N} раз',               ic:'1f4b0',  cur:function(s){return s.stats.sells;},           need:function(s){return 2+Math.min(6,Math.floor(stationLevel(s)/4));},  rw:function(s){return {minerals:dqMin(s,700)};},
   avail:function(s){ return gateOpen(s,'market'); }},
 {id:'comet', n:'Хвостатая охота',   d:'Поймать {N} комет',                  ic:'1f320',  cur:function(s){return s.stats.cometsCaught;},    need:function(s){return 1+Math.min(3,Math.floor(stationLevel(s)/7));}, rw:function(s){return {energy:dqEng(s,1200)};}},
 {id:'bulk',  n:'Оптовый подряд',    d:'Купить {N} раз пачкой x10 или МАКС', ic:'1f6e0',  cur:function(s){return s.stats.bulkBuys;},        need:function(s){return 1+Math.min(4,Math.floor(stationLevel(s)/5));}, rw:function(s){return {credits:dqCred(s,1300)};}},
 {id:'mod',   n:'Новостройка',       d:'Построить {N} новых модулей',        ic:'1f3d7',  cur:function(s){return totalModules(s);},         need:function(s){return 4+Math.min(20,Math.floor(stationLevel(s)*0.8));}, rw:function(s){return {credits:dqCred(s,1000)};}},
 {id:'upg',   n:'Инженерный совет',  d:'Купить {N} улучшений',               ic:'1f527',  cur:function(s){return Object.keys(s.upgrades).length;}, need:function(s){return 1+Math.min(3,Math.floor(stationLevel(s)/8));}, rw:function(s){return {energy:dqEng(s,900),credits:dqCred(s,500)};},
   avail:function(s){ return gateOpen(s,'tab:upgrades'); }},
  {id:'flare', n:'Заряд звезды',    d:'Дождаться {N} солнечных вспышек',  ic:'1f31e',  cur:function(s){return s.stats.flares||0;},     need:function(s){return 1+Math.min(2,Math.floor(stationLevel(s)/12));}, rw:function(s){return {energy:dqEng(s,1600)};}},
  {id:'raid',  n:'Абордаж',           d:'Отразить {N} пиратских налёта',   ic:'1f6f8',  cur:function(s){return s.stats.raids||0;},      need:function(s){return 1+Math.min(2,Math.floor(stationLevel(s)/14));}, rw:function(s){return {credits:dqCred(s,1500)};},
   avail:function(s){ return gateOpen(s,'raid'); }},
 {id:'chest', n:'Ящик с неба',     d:'Открыть {N} сундука находок',      ic:'1f4e6',  cur:function(s){return s.stats.chestsOpened||0;}, need:function(s){return 1+Math.min(4,Math.floor(stationLevel(s)/6));},  rw:function(s){return {credits:dqCred(s,1300)};},
   avail:function(s){ return gateOpen(s,'chest'); }},
 {id:'quest', n:'Планёр',            d:'Выполнить {N} заданий цепочки',      ic:'1f4cb',  cur:function(s){return s.stats.questsDone;},      need:function(s){return 1+Math.min(3,Math.floor(stationLevel(s)/6));},  rw:function(s){return {antimatter:1+Math.floor(stationLevel(s)/10)};},
   avail:function(s){ var left=0; QUESTS.forEach(function(q){ if(!s.quests[q.id])left++; }); return left>0; }},
 {id:'route', n:'Дальний поход',     d:'Пройти {N} этапа звёздного маршрута', ic:'1f9ed',  cur:function(s){return s.stats.routes||0;},       need:function(s){return 1+Math.min(2,Math.floor(stationLevel(s)/12));}, rw:function(s){return {credits:dqCred(s,1600)};},
   avail:function(s){ return gateOpen(s,'route'); }},
 {id:'res',   n:'День изобретений',  d:'Изучить {N} узел лаборатории',        ic:'1f52c',  cur:function(s){return G.resOwned(s);},           need:function(s){return 1+Math.min(2,Math.floor(stationLevel(s)/10));},rw:function(s){return {antimatter:2+Math.floor(stationLevel(s)/15)};},
   avail:function(s){ return resOwned(s)<RESEARCH.length; }},
 {id:'port',  n:'Смена в порту',     d:'Выполнить {N} контракта звёздного порта', ic:'1f6a2', cur:function(s){return s.stats.contractsDone||0;}, need:function(s){return 1+Math.min(5,Math.floor(stationLevel(s)/7));}, rw:function(s){return {credits:dqCred(s,1500)};},
   avail:function(s){ return stationLevel(s)>=3; }},
 {id:'urg',   n:'Срочная смена',       d:'Закрыть {N} срочный чартер порта',       ic:'26a1',  cur:function(s){return s.stats.urgentDone||0;}, need:function(s){return 1+Math.min(3,Math.floor(stationLevel(s)/10));}, rw:function(s){return {credits:dqCred(s,1800),antimatter:1+Math.floor(stationLevel(s)/25)};},
   avail:function(s){ return portRep(s).lv>=1; }},
 {id:'art',   n:'Пополнение музея',  d:'Найти {N} артефакт',                 ic:'1f48e',  cur:function(s){return s.stats.artifacts||0;},      need:function(s){return 1;}, rw:function(s){return {antimatter:2+Math.floor(stationLevel(s)/12)};},
   avail:function(s){ return artOwned(s)<ART.length; }},
 {id:'shipup', n:'ТО на верфи',      d:'Улучшить корабли {N} раз',            ic:'1f527',  cur:function(s){return s.stats.shipUps||0;},        need:function(s){return 1+Math.min(4,Math.floor(shipOwned(s)));}, rw:function(s){return {antimatter:2+Math.floor(stationLevel(s)/15)};},
   avail:function(s){ return shipOwned(s)>0; }}
];
function hashStr(x){var h=2166136261;for(var i=0;i<x.length;i++){h^=x.charCodeAt(i);h=(h*16777619)>>>0;}return h>>>0;}
function rollDQ(s,now){
  var k=dayKey(now);
  if(s.dq&&s.dq.day===k&&s.dq.list&&s.dq.list.length===3)return s.dq;
  var pool=DQ.filter(function(q){ try{return !q.avail||q.avail(s);}catch(e){return true;} });
  if(pool.length<3)pool=DQ.slice();
  var seed=hashStr(k+'|'+(s.prestigeCount||0));
  for(var i=pool.length-1;i>0;i--){seed=(seed*1103515245+12345)&0x7fffffff;var j=seed%(i+1);var t=pool[i];pool[i]=pool[j];pool[j]=t;}
  var list=[];
  for(var n=0;n<3&&n<pool.length;n++){var q=pool[n];
    var rw={}; try{var r0=q.rw(s);for(var rk in r0)rw[rk]=Math.max(1,Math.floor(r0[rk]));}catch(e){rw={credits:500};}
    list.push({id:q.id,base:q.cur(s),need:Math.max(1,Math.floor(q.need(s))),rw:rw,st:''});}
  s.dq={day:k,list:list,done:0};
  return s.dq;
}
function dqCfg(id){return DQ.find(function(x){return x.id===id;});}
function dqState(s,d){
  var cfg=dqCfg(d.id); if(!cfg)return{done:false,cur:0,need:1,txt:''};
  var cur=0; try{cur=(+cfg.cur(s)||0)-(+d.base||0);}catch(e){cur=0;}
  if(!isFinite(cur)||cur<0)cur=0;
  var need=d.need||1;
  if(d.st==='done'||d.st==='claim')cur=need;
  return{done:cur>=need,cur:Math.min(cur,need),need:need,txt:cfg.d.replace('{N}',fmt(need))};
}
function checkDq(s){
  var out=[]; if(!s.dq||!s.dq.list)return out;
  s.dq.list.forEach(function(d){ if(d.st)return; var st=dqState(s,d); if(st.done){d.st='claim';out.push(d);} });
  return out;
}
function claimDq(s,id){
  if(!s.dq||!s.dq.list)return{ok:false,msg:'Нет задания'};
  var d=null; s.dq.list.forEach(function(x){if(x.id===id)d=x;});
  if(!d)return{ok:false,msg:'Нет задания'};
  if(d.st==='done')return{ok:false,msg:'Уже получено'};
  var st=dqState(s,d); if(!st.done)return{ok:false,msg:'Ещё не выполнено'};
  var cfg=dqCfg(id); d.st='done'; s.dq.done=(s.dq.done||0)+1; s.stats.dqDone=(s.stats.dqDone||0)+1;
  var rw=d.rw||cfg.rw(s);
  for(var k in rw){var v=Math.max(1,Math.floor(rw[k]));s.resources[k]=(s.resources[k]||0)+v;if(k==='antimatter')s.stats.antimatter=(s.stats.antimatter||0)+v;else s.stats['total'+({energy:'Energy',minerals:'Minerals',credits:'Credits'}[k]||'')]= (s.stats['total'+({energy:'Energy',minerals:'Minerals',credits:'Credits'}[k]||'')]||0)+v;}
  return{ok:true,cfg:cfg,rw:rw};
}

/* ---- колесо фортуны ---- */
var WHEEL=[
 {t:'Энергия',      ic:'26a1', k:'energy',   m:1, w:20},
 {t:'Руда',         ic:'1faa8',k:'minerals', m:1, w:14},
 {t:'Кредиты',      ic:'1f31f',k:'credits',  m:1, w:18},
 {t:'Буст ×7',      ic:'1f525',k:'boost',    m:1, w:11},
 {t:'Энергия ×3',   ic:'1f308',k:'energy',   m:3, w:9},
 {t:'Пусто',        ic:'1f6ab',k:'none',     m:0, w:8},
 {t:'Кредиты ×3',   ic:'1f4b8',k:'credits',  m:3, w:9},
  {t:'Антиматерия',  ic:'2728', k:'anti',   m:1, w:3},
 {t:'Сундук',       ic:'1f4e6',k:'chest',  m:1, w:9}
];
var WHEEL_CD=3*3600*1000;
function wheelState(s,now){
  if(!s.wheel)s.wheel={last:0,spins:0};
  var left=(+s.wheel.last||0)+WHEEL_CD-(now||Date.now());
  return{ready:left<=0,left:Math.max(0,left),spins:s.wheel.spins||0};
}
function wheelSpin(s,now){
  var st=wheelState(s,now);
  if(!gateOpen(s,'wheel'))return gateErr('wheel');
  if(!st.ready)return{ok:false,msg:'Колесо перезаряжается'};
  var tw=0; WHEEL.forEach(function(x){tw+=x.w;});
  var r=Math.random()*tw,idx=0,acc=0;
  for(var i=0;i<WHEEL.length;i++){acc+=WHEEL[i].w;if(r<acc){idx=i;break;}}
  var cfg=WHEEL[idx],rw=null;
  if(cfg.k==='energy'){var v=Math.max(300,Math.floor(dqEng(s,420*cfg.m)));s.resources.energy+=v;s.stats.totalEnergy+=v;rw={energy:v};}
  else if(cfg.k==='minerals'){var v2=Math.max(120,Math.floor(dqMin(s,420*cfg.m)));s.resources.minerals+=v2;s.stats.totalMinerals+=v2;rw={minerals:v2};}
  else if(cfg.k==='credits'){var v3=Math.max(250,Math.floor(dqCred(s,420*cfg.m)));s.resources.credits+=v3;s.stats.totalCredits+=v3;rw={credits:v3};}
    else if(cfg.k==='anti'){var v4=1+Math.floor(stationLevel(s)/12);s.resources.antimatter+=v4;s.stats.antimatter=(s.stats.antimatter||0)+v4;rw={antimatter:v4};}
  else if(cfg.k==='chest'){pushChest(s,Math.random()<0.35?2:1);rw={chests:1};}
  s.wheel.last=now||Date.now(); s.wheel.spins=(s.wheel.spins||0)+1; s.stats.wheelSpins=(s.stats.wheelSpins||0)+1;
  return{ok:true,idx:idx,cfg:cfg,rw:rw};
}

/* ---- солнечные вспышки: live-событие каждые 5-9 минут ---- */
var FLARE_MS=45000, FLARE_GAP=[5*60000,9*60000], FLARE_FIRST=[100000,170000];
function flareActive(s,now){now=tnow(now);return !!(s.flare&&+s.flare.until>now);}
function flareMult(s){var v=(s.upgrades&&s.upgrades['flare1'])?6:3;
  if(s.research&&s.research['rs3'])v+=1; return v;}
function flareInfo(s,now){now=tnow(now);var f=s.flare||{nextAt:0,until:0,ext:0};
  if(f.until>now)return{active:true,left:f.until-now,nextIn:0,ext:f.ext||0,mult:flareMult(s)};
  return{active:false,left:0,nextIn:Math.max(0,(f.nextAt||0)-now),ext:f.ext||0,mult:flareMult(s)};}
function maybeFlare(s,now){
  now=tnow(now); if(!s.flare)s.flare={nextAt:0,until:0,ext:0};
  var f=s.flare;
  if(f.until>now)return null;
  if(!f.nextAt){ f.nextAt=now+FLARE_FIRST[0]+Math.random()*(FLARE_FIRST[1]-FLARE_FIRST[0]); return null; }
  if(now<f.nextAt)return null;
  f.until=now+FLARE_MS; f.ext=0;
  f.nextAt=now+FLARE_GAP[0]+Math.random()*(FLARE_GAP[1]-FLARE_GAP[0]);
  s.stats.flares=(s.stats.flares||0)+1;
  return{ms:FLARE_MS,mult:flareMult(s)};
}
function extendFlare(s,add,now){
  now=tnow(now); if(!s.flare)s.flare={nextAt:0,until:0,ext:0};
  var f=s.flare;
  if(!(f.until>now))return{ok:false,msg:'Вспышка уже погасла'};
  if((f.ext||0)>=2)return{ok:false,msg:'Эту вспышку уже продлевали'};
  f.ext=(f.ext||0)+1; f.until=now+(add||25000);
  return{ok:true,left:f.until-now};
}

/* ---- пиратский налёт: активное событие в сцене ---- */
function raidHp(s){return 5+Math.min(10,Math.floor(stationLevel(s)*0.35));}
function raidReward(s){
  return {credits:Math.floor(dqCred(s,900)),energy:Math.floor(dqEng(s,600)),minerals:Math.floor(dqMin(s,400))};
}

/* ---- сундуки находок ---- */
var CHESTS=[
 {r:1,n:'Ящик экипажа',        ic:'1f4e6', w:62},
 {r:2,n:'Контейнер флота',     ic:'1f381', w:28},
 {r:3,n:'Сейф звёздного лорда',ic:'1f451', w:10}
];
var CHEST_BY_R={};CHESTS.forEach(function(c){CHEST_BY_R[c.r]=c;});
function chestMult(s){return upgMult(s,'chest');}
function pushChest(s,tier){
  tier=Math.max(0,tier|0);
  /* сундук не может лежать в закрытом ящике: пока система находок не открыта
     (шаг цепи 4), награда «сундук» превращается в груз на склад. Иначе сундук
     копился бы с 10-го уровня станции, а вскрыть его было бы нельзя */
  if(!gateOpen(s,'chest')){
    var t2=Math.max(1,tier|0);
    var cB=Math.max(200,Math.floor(dqCred(s,220+140*t2))), eB=Math.max(200,Math.floor(dqEng(s,180+120*t2)));
    s.resources.credits+=cB; s.stats.totalCredits+=cB;
    s.resources.energy+=eB; s.stats.totalEnergy+=eB;
    return null;
  }
  var pool=CHESTS.filter(function(c){return c.r<=Math.min(3,tier+1);}),wts=[],tw=0,i;
  for(i=0;i<pool.length;i++){var w=pool[i].w*(1+tier*0.4*(pool[i].r-1));wts.push(w);tw+=w;}
  var r=Math.random()*tw,acc=0,pick=pool[0];
  for(i=0;i<pool.length;i++){acc+=wts[i];if(r<acc){pick=pool[i];break;}}
  if(!s.chests)s.chests=[];
  if(s.chests.length>=6)s.chests.shift();
  var c={r:pick.r,t:Date.now()};s.chests.push(c);return c;
}
function chestReward(s,r){
  var l=stationLevel(s),o={};
      if(r>=3){o.credits=dqCred(s,110);o.energy=dqEng(s,110);o.antimatter=1+Math.floor(l/25);}
  else if(r===2){o.credits=dqCred(s,45);o.energy=dqEng(s,45);
    /* антиматерия из контейнера — редкая удача, иначе рой сундуков обесценивает добычу */
    if(Math.random()<0.22)o.antimatter=1;}
  else{o.energy=dqEng(s,22);o.minerals=dqMin(s,22);}
  return o;
}
function openChest(s,idx){
  if(!s.chests||!s.chests.length)return{ok:false,msg:'Сундуков нет'};
  if(!gateOpen(s,'chest'))return gateErr('chest');
  idx=Math.max(0,Math.min(s.chests.length-1,idx|0));
  var c=s.chests.splice(idx,1)[0];
  var cfg=CHEST_BY_R[c.r]||CHESTS[0], rw=chestReward(s,c.r), boost=false, art=null;
  for(var k in rw){var v=Math.max(1,Math.floor(rw[k]));s.resources[k]=(s.resources[k]||0)+v;
    if(k==='energy')s.stats.totalEnergy+=v;else if(k==='minerals')s.stats.totalMinerals+=v;else if(k==='credits')s.stats.totalCredits+=v;}
  if(c.r>=2&&Math.random()<0.35)boost=true;
  if(c.r>=3&&Math.random()<0.28)art=rollArtifact(s,2);
  s.stats.chestsOpened=(s.stats.chestsOpened||0)+1;
  return{ok:true,chest:c,cfg:cfg,rw:rw,boost:boost,art:art};
}

/* ---- авто-тап: суммарная скорость роя дронов ---- */
function autoTapRate(s){var v=0;UPGRADES.forEach(function(u){if(s.upgrades[u.id]&&u.eff==='tapauto')v+=u.v;});
  v+=resEff(s,'tap'); return v;}

function defaultState(){
  var s={v:4, resources:{energy:0,minerals:0,credits:0,antimatter:0}, modules:{}, upgrades:{},
    achievements:{}, quests:{}, art:{}, artShopCd:0, exploreCooldown:{}, expRun:{}, resRun:null, prestigeCount:0, prestigeThreshold:0,
    boostUntil:0, skin:'rocket', skins:{rocket:1}, daily:{day:'',streak:0}, seenTut:0, lessonSeen:{}, gatesSeen:{},
    dq:{day:'',list:[],done:0}, wheel:{last:0,spins:0}, chests:[], flare:{nextAt:0,until:0,ext:0},
    research:{}, route:{n:0,stage:0,cycles:0}, victory:0, eternal:0, epochs:0, bosses:0, ships:{}, log:[], pier:0,
    unlocked:{}, install:{}, chainHalf:{},
    dock:{}, sq:null, seenNews:'', peakAt:0, emgAt:0, chain:0, chainPlan:null, shipLv:{},
    port:{list:[],nextAt:0,init:0,dealDay:'',carQ:[],carAt:0},
    stats:{totalClicks:0,totalEnergy:0,totalMinerals:0,totalCredits:0,totalExpeditions:0,expSuccess:0,
      cometsCaught:0,offlineGains:0,sells:0,questsDone:0,playSeconds:0,lastSeen:Date.now(),bestDps:0,
      dailyClaims:0,bulkBuys:0,skinsBought:0,adsWatched:0,dqDone:0,wheelSpins:0,peakSells:0,artifacts:0,artBought:0,
            flares:0,chestsOpened:0,autoTaps:0,raids:0,raidsLost:0,research:0,routes:0,bosses:0,epochs:0,
      contractsDone:0,contractsMissed:0,expCore:0,dealsDone:0,rerolls:0,shipsBought:0,urgentDone:0,chainDone:0,levels:0,shipUps:0,
      boardings:0,repairs:0,sqDone:0,hunters:0,peakDeals:0,emg:0,caravans:0,missionsDone:0,antimatter:0}};
  MORDER.forEach(function(k){s.modules[k]=0;});
  EXPLORE.forEach(function(e){s.exploreCooldown[e.key]=0;});
  return s;
}

function fmt(n){
  if(n==null||isNaN(n))return '0';
  if(n<0)return '-'+fmt(-n);
  if(n<1000)return (Math.floor(n)===n)?''+n:n.toFixed(1);
  var u=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qd','Qq','Sxn','Spn','Ocn','Non','Dcn'],t=0,x=n;
  while(x>=1000&&t<u.length-1){x/=1000;t++;}
  return (x<10?x.toFixed(2):x<100?x.toFixed(1):Math.floor(x))+u[t];
}
var COSTM=1;
/* Хвост цены модуля: до 20-го уровня копия дорожает по «крутой» кривой тира,
   дальше — по общей, спокойной (×1.20 за уровень). Причина ровно та, о которой пишут разборы
   жанра: цена растёт экспоненциально, а выпуск — линейно, и на 200-х уровнях
   игра упирается в стену (одна копия модуля = десятки минут). Хвост держит
   срок следующей покупки в одном коридоре: прогресс идёт лесенкой, а не обвалом. */
var GROW_TAIL=1.20, GROW_KNEE=20;
/* ================= цена корпуса привязана к доходности станции =================
   Разборы жанра требуют, чтобы горизонт «до следующей стройки» был досягаемым:
   «a player needs something to look forward to» (MindStudios, 2024) и «balanced
   time-to-goal» (Gamigion). Раньше цена копии была фиксированным числом, а доход
   станции за игру вырастал в миллионы раз: старые модули стоили ноль секунд, а
   новые — десятки часов, и лесенка открытий превращалась то в firehose, то в стену.
   Теперь копия модуля стоит столько, сколько станция производит нужным ресурсом за
   T0·(1+TRAMP·уровень) секунд: срок до следующей копии остаётся в одном коридоре
   всю игру — от полутора минут на старте до десятков минут на глубоких уровнях.
   Доход берётся «спокойный» (без рекламного буста и вспышки) и пересчитывается не
   чаще раза в секунду, а сразу после покупки — чтобы пачковая покупка x10/МАКС не
   могла оплатить сотню копий по старой цене. */
var ANCH_TICK=1000, ANCH_STEP=1;
/* Срок первой копии модуля и надбавка за каждую следующую — в секундах спокойного
   дохода тем ресурсом, которым за модуль платят. Нижние модули дешёвые и покупаются
   часто (это «мелкие, но частые награды» из разборов жанра), верхние — крупные
   стройки на десятки минут. TRAMP держит лёгкий экспоненциальный рост: копия за
   копией срок растёт на 3%, поэтому глубокие уровни модуля не обесцениваются, но и
   не превращаются в стену на сутки. */
var T0={solar:6,miner:10,reactor:14,hydro:18,shield:22,drone:28,laser:35,habitat:45,
        fusion:60,dyson:80,forge:110,fleet:150,station:180,ring:240,gate:320};
var TRAMP=1.03, TMODE=1, T0S=1, RATEM=1;
/* Хвост срока копии (недоделка v37): до TRAMP_KNEE уровней копия дорожает экспоненциально
   (x1.03 за уровень), дальше — только линейно. Разборы жанра сходятся в одном: если цена
   растёт экспонентой, а выпуск встречают таким же множителем, игра сначала разгоняется,
   а потом встаёт стеной. Старая кривая на 259-м уровне энергощита давала ~11 часов за одну
   копию. С линейным хвостом: 260-й уровень ~12 минут, 1000-й ~45 минут. Прогресс остаётся
   медленным, но коридор «сколько ждать следующей стройки» не улетает в сутки. */
var TRAMP_KNEE=40, TRAMP_SLOPE=0.035;
function copySec(m,l){ var T=(T0[m.key]||150), k=Math.max(0,+l||0);
  if(k<=TRAMP_KNEE)return T*Math.pow(TRAMP,k);
  return T*Math.pow(TRAMP,TRAMP_KNEE)*(1+TRAMP_SLOPE*(k-TRAMP_KNEE)); }
/* текущее состояние для расчёта цены: цена привязана к доходу станции, а спрашивают
   её и из мест, где состояние не передают (UI-хелперы, QA-прогоны) */
var CURS=null;
function setCur(s){ if(s&&s.resources)CURS=s; return s; }
function calmRate(s,res){ var v=+ratesCalm(s)[res]||0;
  if(!(v>0)&&res==='energy')v=Math.max(1,clickPower(s)); return v; }
/* раз в ANCH_TICK якорь подтягивается к фактическому спокойному доходу */
function anchUpdate(s,now){
  now=tnow(now);
  if(!s.anch)s.anch={}; if(!s.anchAt)s.anchAt={};
  var rc=ratesCalm(s);
  RES.forEach(function(res){
    var cur=+rc[res]||0; if(!(cur>0)&&res==='energy')cur=Math.max(1,clickPower(s));
    var a=+s.anch[res]||0;
    if(!(a>0)){ if(cur>0){ s.anch[res]=cur; s.anchAt[res]=now+ANCH_TICK; } return; }
    if(now<+s.anchAt[res])return;
    s.anchAt[res]=now+ANCH_TICK;
    s.anch[res]=Math.max(a*(1-ANCH_STEP),Math.min(a*(1+ANCH_STEP),cur));
  });
  return s.anch;
}
function anchRate(s,res,now){
  if(!s)return 0; if(!s.anch)s.anch={};
  var a=+s.anch[res]||0, cur=-1;
  /* якорь обязан поспевать за скачком дохода (загрузка сейва, прыжок, исследование,
     QA-прогон, который подменил состояние): если реальность разошлась с якорем
     больше чем вдвое — подтягиваем сразу, без ожидания очереди */
  if(a>0){ cur=calmRate(s,res);
    if(cur>0&&(cur>a*(1+ANCH_STEP)||cur<a*(1-ANCH_STEP))){ s.anch[res]=cur;
      if(!s.anchAt)s.anchAt={}; s.anchAt[res]=(now||Date.now())+ANCH_TICK; return cur; }
    return a; }
  cur=calmRate(s,res);
  if(cur>0){ s.anch[res]=cur; if(!s.anchAt)s.anchAt={}; s.anchAt[res]=(now||Date.now())+ANCH_TICK; }
  return cur;
}
function payIncome(s,res,now){
  var v=anchRate(s,res,now); if(v>0)return v;
  v=calmRate(s,res); if(v>0)return v;
  /* платить нечем: считаем по энергии — она у станции есть всегда (тап) */
  v=anchRate(s,'energy',now)||calmRate(s,'energy');
  return v>0?v*0.5:0;
}
function costFor(m,l,s,now){ l=l||0; if(s)setCur(s); else s=CURS;
  if(!TMODE){ /* старый абсолютный ценник — только для QA-сравнений темпа */
    var a2=l<GROW_KNEE?l:GROW_KNEE,b2=l-GROW_KNEE;
    return Math.max(1,Math.floor(m.base*COSTM*Math.pow(m.growth,a2)*Math.pow(GROW_TAIL,b2<0?0:b2)));
  }
  var v=copySec(m,l)*payIncome(s,payRes(m),now)*COSTM*T0S;
  return (v>0&&isFinite(v))?Math.max(1,Math.floor(v)):1; }
function payRes(m){return m.costRes||m.res;}
function bulkCost(m,l,n,s,now){var t=0;for(var i=0;i<n;i++)t+=costFor(m,l+i,s,now);return t;}
/* ---- вехи модулей: каждые N копий одного модуля дают постоянный бонус к его выпуску.
   Это «ступенька» между крупными покупками: игрок почти всегда в паре шагов от чего-то. ---- */
var MILE=[10,25,50,80,120,170,240,330,450,600,800,1050,1350,1700,2100,2600,3200,4000];
var MILE_B=0.2;
/* Вехи не кончаются: после таблицы шаг идёт каждые MILE_TAIL уровней со спокойным
   множителем. Иначе на глубоких уровнях у модуля не остаётся ближайшей ступеньки,
   и самая частая цель игрока («дотянуть до вехи») исчезает из лесенки навсегда. */
var MILE_TAIL=500, MILE_TAIL_B=0.10;
function mileTableIdx(l){var n=0;for(var i=0;i<MILE.length;i++){if((l||0)>=MILE[i])n=i+1;else break;}return n;}
function mileTailIdx(l){var last=MILE[MILE.length-1];l=l||0;return l>=last?Math.floor((l-last)/MILE_TAIL):0;}
function mileIdx(l){return mileTableIdx(l)+mileTailIdx(l);}
function mileAt(idx){return idx<MILE.length?MILE[idx]:MILE[MILE.length-1]+(idx-MILE.length+1)*MILE_TAIL;}
function mileMult(k,l){var t=mileTableIdx(l);return Math.pow(1+MILE_B,t)*Math.pow(1+MILE_TAIL_B,mileTailIdx(l));}
function mileNext(l){ l=l||0;
  for(var i=0;i<MILE.length;i++)if(l<MILE[i])return {at:MILE[i],left:MILE[i]-l,i:i,mult:Math.pow(1+MILE_B,i+1)};
  var last=MILE[MILE.length-1],ti=Math.floor((l-last)/MILE_TAIL)+1,at=last+ti*MILE_TAIL;
  return {at:at,left:at-l,i:MILE.length+ti-1,tail:1,
          mult:Math.pow(1+MILE_B,MILE.length)*Math.pow(1+MILE_TAIL_B,ti)};}
function mileInfo(s,k){var l=(s.modules&&s.modules[k])||0,n=mileIdx(l),nx=mileNext(l);
  return {lvl:l,have:n,bonus:Math.pow(1+MILE_B,n),
    next:nx.at?{at:nx.at,left:nx.left,mult:Math.pow(1+MILE_B,nx.i+1),pct:Math.max(0,Math.min(100,l/nx.at*100))}:null};}
function mileJump(s,k,from){var a=mileIdx(from||0),b=mileIdx((s.modules&&s.modules[k])||0);
  if(b<=a)return null;
  var at=mileAt(b-1),mu=mileMult(k,at);
  logAdd(s,'\u2726 Веха: '+MODULES[k].name+' ур. '+at+' — выпуск модуля \u00d7'+mu.toFixed(2),'gold');
  return {at:at,idx:b,mult:mu};}

function upgMult(s,kind,tgt){
  var m=artEff(s,kind,tgt)*resEff(s,kind,tgt)*shipEff(s,kind);
  var list=upgB()[kind];
  if(list)for(var i=0;i<list.length;i++){ var u=list[i];
    if(!s.upgrades[u.id])continue;
    if(tgt==null||u.tgt===tgt)m*=u.v; }
  if(kind==='mod'&&tgt&&MODULES[tgt])m*=mileMult(tgt,(s.modules&&s.modules[tgt])||0);
  return m;
}
function achMult(s){var m=1,ac=s.achievements||{};ACH.forEach(function(a){if(ac[a.id])m+=a.r;});return m;}
/* бонус антиматерии: линейный до 300, дальше мягкий логарифм —
   иначе Ядро Варп-станции даёт взрывной обратный рост (антиматерия -> доход -> антиматерия) */
var ANTI_K=0.12, ANTI_SOFT=300, ANTI_TAIL=0.05;
/* тюнинг для QA-прогонов: значения в замыкании, а не в экспорте */
function tune(k,v){ if(k==='EXP_CUT')EXP_CUT=+v; else if(k==='EXP_GAIN')EXP_GAIN=+v;
 else if(k==='RATEM')RATEM=+v; else if(k==='LVLW')LVLW=+v; else if(k==='TMODE')TMODE=+v; else if(k==='T0S')T0S=+v; else if(k==='TRAMP')TRAMP=+v;
 else if(k==='RESON')RESON=+v; else if(k==='ANTI_K')ANTI_K=+v;
  else if(k==='ANTI_SOFT')ANTI_SOFT=+v; else if(k==='ANTI_TAIL')ANTI_TAIL=+v; else if(k==='COSTM')COSTM=+v;
  else if(k==='GROW_TAIL')GROW_TAIL=+v; else if(k==='GROW_KNEE')GROW_KNEE=+v;
  else if(k==='TRAMP_KNEE')TRAMP_KNEE=+v; else if(k==='TRAMP_SLOPE')TRAMP_SLOPE=+v;
  else if(k==='PRESTIGE_T')PRESTIGE_T=+v; else if(k==='MILE_TAIL')MILE_TAIL=+v;
  else if(k==='RESON_KNEE')RESON_KNEE=+v;
  else if(k==='PRESTIGE_CD')PRESTIGE_CD=+v; else if(k==='PRESTIGE_KEEP')PRESTIGE_KEEP=+v; return tune; }
function antiBonus(s){
  var a=Math.max(0,(s.resources.antimatter||0));
  if(a<=ANTI_SOFT)return 1+ANTI_K*a;
  return (1+ANTI_K*ANTI_SOFT)*(1+ANTI_TAIL*Math.log(1+(a-ANTI_SOFT)/ANTI_SOFT));
}
/* резонанс станции: каждый построенный уровень модуля усиливает всю продукцию.
   Цена следующего уровня модуля растёт экспоненциально, а выпуск — только линейно,
   поэтому без встречного множителя вторая половина игры упирается в стену. */
var RESON=1.008, RESON_KNEE=140;
/* Хвост резонанса: до 140 уровней модулей множитель растёт экспоненциально,
   дальше — только линейно. Причина ровно та, о чём пишут разборы жанра: если и цена,
   и доход растут экспонентой, игра разгоняется до «всё доступно за секунды», а потом
   встаёт стеной. С линейным хвостом темп покупки медленно замедляется всю игру. */
function resonanceMult(s){ var n=totalModules(s)||0; if(n<=0)return 1;
  if(n<=RESON_KNEE)return Math.pow(RESON,n);
  return Math.pow(RESON,RESON_KNEE)*(1+(RESON-1)*(n-RESON_KNEE)); }
function resonanceInfo(s){ var n=totalModules(s)||0; return {n:n,mult:resonanceMult(s)}; }
function productionMult(s,noAnti,noTemp){
  var m=achMult(s);
  m*=resonanceMult(s);
  m*=upgMult(s,'all');
  if(!noAnti)m*=antiBonus(s);
  m*=1+0.03*(s.modules.station|0);
  m*=1+0.02*(s.modules.habitat||0)*upgMult(s,'mod','habitat');
  m*=eternalBonus(s);
  /* временные ускорения (рекламный буст, вспышка) намеренно вынесены:
     по «спокойному» доходу считаются цены, награды и все сроки — иначе
     таймеры и цифры скачут каждый раз, когда включается буст */
  if(!noTemp){
    if(s.boostUntil && s.boostUntil>Date.now()) m*=7;
    if(flareActive(s)) m*=flareMult(s);
  }
  return m;
}
function modUnlocked(m,s){
  if(!m.unlock)return true;
  /* разблокировка — это знание, а не склад: купил модуль или однажды увидел его
     открытым — замок больше не возвращается, даже если ресурсы ушли на покупку */
  if((s.modules[m.key]||0)>0)return true;
  if(s.unlocked&&s.unlocked[m.key])return true;
  var ok=m.unlock.res?((s.resources[m.unlock.res]||0)>=m.unlock.v)
                     :((s.modules[m.unlock.mod]||0)>=m.unlock.v);
  if(ok&&m.unlock.lv)ok=stationLevel(s)>=m.unlock.lv;
  /* верхний тир открывается цепью капитана: открытие обязано приходить
     лесенкой, вслед за шагом цепи, а не пачкой за десять минут */
  if(ok&&m.unlock.chain)ok=(s.chain||0)>=m.unlock.chain;
  if(ok){ if(!s.unlocked)s.unlocked={}; s.unlocked[m.key]=1; }
  return ok;
}
/* чем именно модуль заперт: для карточки, лесенки открытий и ленты «СКОРО».
   показываем то требование, которое дальше по сроку, — игрок обязан видеть
   настоящий барьер, а не самый близкий из двух */
function modGate(s,m){
  if(modUnlocked(m,s))return {ok:true};
  var r=rates(s),g={ok:false};
  if(m.unlock.res){
    var cur=s.resources[m.unlock.res]||0,need=m.unlock.v;
    g={ok:cur>=need,kind:'res',cur:cur,need:need,
       req:'накопить '+fmt(need)+' '+RES_META[m.unlock.res].g,
       eta:timeToR(cur,r[m.unlock.res]||0,need)};
  }else{
    var gm=MODULES[m.unlock.mod],cl=s.modules[gm.key]||0,need2=m.unlock.v;
    g={ok:cl>=need2,kind:'mod',cur:cl,need:need2,
       req:gm.name+' довести до ур. '+need2,
       eta:(cl>=need2)?0:costTime(s,(function(){var o={};o[payRes(gm)]=bulkCost(gm,cl,need2-cl,s);return o;})())};
  }
  function farther(nxt){ if(!g.ok){ if(isFinite(nxt.eta)&&(!isFinite(g.eta)||nxt.eta>g.eta))g=nxt; }
    else g=nxt; }
  if(m.unlock.lv){
    var L=stationLevel(s),lv=m.unlock.lv;
    if(L<lv)farther({ok:false,kind:'lv',cur:L,need:lv,req:'подними станцию до уровня '+lv,eta:levelEta(s,lv)});
  }
  if(m.unlock.chain){
    var chN=(s.chain||0),need3=m.unlock.chain;
    if(chN<need3){
      /* срок считаем по фактическому темпу цепи: сколько в среднем занимает один шаг */
      var per=Math.max(180,(s.stats.playSeconds||900)/Math.max(1,chN));
      farther({ok:false,kind:'chain',cur:chN,need:need3,
        req:'пройди ещё '+pl(need3-chN,'шаг цепи','шага цепи','шагов цепи'),
        eta:(need3-chN)*per});
    }
  }
  return g;
}

/* ================= тихий старт: единый замок интерфейса =================
   Почти всё в игре заперто до времени. Отпирается ровно один предмет за раз —
   шагом цепи капитана (или уровнем станции). Один источник правды: и UI, и лесенка,
   и подсказки, и QA читают только GATES. */
var GATES={
  'tab:modules': {chain:0},
  'tab:more':    {chain:0},
  'tab:quests':  {chain:1},
  'tab:upgrades':{chain:2},
  'tab:explore': {chain:2},
  'tab:achieve': {chain:5},
  'sec:prog':    {chain:0},
  'sec:set':     {chain:0},
  'sec:wheel':   {chain:4},
  'sec:sci':     {chain:5},
  'sec:col':     {chain:8},
  'sec:fleet':   {chain:9},
  'col':         {chain:8},
  'sci':         {chain:5},
  'fleet':       {chain:9},
  'res:minerals':{mod:'miner'},
  'res:credits': {chain:2},
  'res:antimatter':{chain:4},
  'market':      {chain:2},
  'daily':       {chain:1},
  'chest':       {chain:4},
  'port':        {chain:3},
  'wheel':       {chain:4},
  'lab':         {chain:5},
  'prestige':    {chain:7},
  'skins':       {chain:8},
  'route':       {chain:9},
  'yard':        {chain:9},
  'dock':        {chain:9},
  'raid':        {chain:9},
  'season':      {chain:6},
  'career':      {chain:12},
  'pier':        {chain:11},
  'victory':     {chain:15}
};
function gateCfg(key){ return GATES[key]||{chain:0}; }
function gateOpen(s,key){
  var g=gateCfg(key); if(!g)return true;
  if(g.chain!=null&&(s.chain||0)<g.chain)return false;
  if(g.lv!=null&&stationLevel(s)<g.lv)return false;
  if(g.mod&&!modUnlocked(MODULES[g.mod],s))return false;
  return true;
}
/* чем именно заперто и когда откроется — одна формулировка для карточки,
   лесенки, подсказки и урока */
function gateInfo(s,key){
  var g=gateCfg(key),out={key:key,open:gateOpen(s,key),kind:'',need:0,cur:0,req:'',eta:0};
  if(out.open)return out;
  if(g.chain!=null&&(s.chain||0)<g.chain){
    var n=g.chain, step=(CHAIN[n-1]||ECHAIN[n-CHAIN.length-1]||{});
    out.kind='chain'; out.cur=s.chain||0; out.need=n;
    out.req='откроется после шага цепи '+n+(step.n?(' \u00b7 \u00ab'+step.n+'\u00bb'):'');
    out.eta=chainStepEta(s,n);
  }
  if(out.kind!=='chain'&&g.lv!=null&&stationLevel(s)<g.lv){
    out.kind='lv'; out.cur=stationLevel(s); out.need=g.lv;
    out.req='откроется на уровне станции '+g.lv; out.eta=levelEta(s,g.lv);
  }
  if(out.kind==='chain'&&g.lv!=null&&stationLevel(s)<g.lv){
    var le=levelEta(s,g.lv);
    if(isFinite(le)&&le>out.eta){out.kind='lv';out.cur=stationLevel(s);out.need=g.lv;
      out.req='откроется на уровне станции '+g.lv;out.eta=le;}
  }
  if(!out.kind&&g.mod){
    var m=MODULES[g.mod],mg=modGate(s,m);
    out.kind='mod'; out.req='откроется, когда откроется \u00ab'+m.name+'\u00bb'; out.eta=mg.eta||0;
  }
  return out;
}
/* что откроется следующим: одна ближайшая отпертая вещь, а не список на весь экран */
function nextGate(s){
  var best=null;
  for(var k in GATES){
    if(!GATES[k].chain)continue;
    var gi=gateInfo(s,k);
    if(gi.open)continue;
    if(!best||gi.eta<best.eta||(gi.eta===best.eta&&gi.need<best.need))best=gi;
  }
  return best;
}
/* какие замки открылись прямо сейчас (для тоста, урока и пульса вкладки) */
function newGates(s){
  if(!s.gatesSeen)s.gatesSeen={};
  var out=[];
  for(var k in GATES){
    if(s.gatesSeen[k])continue;
    if(gateOpen(s,k)){ s.gatesSeen[k]=1; if(GATES[k].chain>0||GATES[k].lv!=null||GATES[k].mod)out.push(k); }
  }
  return out;
}
/* QA: открыть все замки разом (для старых тестов и отладки) */
function openAll(s){ s.chain=Math.max(s.chain||0,40); s.gatesSeen={}; newGates(s); return s; }
function gateName(k){
  var T={'tab:modules':'Модули','tab:more':'Ещё','tab:quests':'Задания','tab:upgrades':'Улучшения',
    'tab:explore':'Экспедиции','tab:achieve':'Награды','sec:prog':'Прогресс','sec:set':'Настройки',
    'sec:wheel':'Колесо','sec:sci':'Наука','sec:col':'Коллекции','sec:fleet':'Флот',
    'res:minerals':'Руда','res:credits':'Кредиты','res:antimatter':'Антиматерия','market':'Космическая биржа',
    'daily':'Ежедневная награда','chest':'Сундуки находок','port':'Звёздный порт','wheel':'Колесо фортуны',
    'lab':'Лаборатория','prestige':'Варп-прыжок','skins':'Облики станции','route':'Звёздный маршрут',
    'yard':'Верфь','dock':'Ремонтный док','raid':'Налёты пиратов','season':'Сезон',
    'career':'Карьера капитана','pier':'Расширенный пирс','victory':'Финал станции'};
  return T[k]||k;
}
function gateTab(k){
  if(k.indexOf('tab:')===0)return k.slice(4);
  if(k.indexOf('sec:')===0)return 'more';
  if(k==='port'||k==='market'||k==='chest'||k==='route'||k==='daily')return 'explore';
  if(k==='prestige'||k==='season'||k==='career'||k==='victory')return 'more';
  if(k==='yard'||k==='dock'||k==='pier')return 'more';
  if(k==='lab')return 'more';
  if(k==='wheel')return 'more';
  if(k==='skins')return 'more';
  return 'modules';
}
function gateSec(k){
  if(k.indexOf('sec:')===0)return k.slice(4);
  if(k==='prestige'||k==='season'||k==='career'||k==='victory')return 'prog';
  if(k==='lab')return 'sci';
  if(k==='yard'||k==='dock'||k==='pier')return 'fleet';
  if(k==='wheel')return 'wheel';
  if(k==='skins')return 'col';
  return 'prog';
}
/* любая попытка сделать то, что ещё заперто, обязана называть причину тем же
   языком, что и интерфейс: «не открыто», а не «не хватает» или молчаливый отказ */
function gateErr(key){ return {ok:false,gate:key,msg:'Ещё не открыто: '+gateName(key)}; }

/* ---- монтаж: первый корпус крупного модуля собирают несколько минут ----
   Покупка высшего тира перестаёт быть мгновенной и превращается в событие,
   которого можно дождаться: пока идёт монтаж, модуль уже работает, но на треть
   выпуска. Это и есть «breakthrough moment» из разборов жанра: не щелчок,
   а отсчёт до большого скачка силы. */
var INSTALL={forge:5*60000,fleet:6*60000,station:8*60000,ring:10*60000,gate:12*60000};
var INSTALL_PART=0.35;
function installStart(s,key,now){
  if(!INSTALL[key])return null;
  if(!s.install)s.install={};
  if(s.install[key])return installInfo(s,key,now);
  var t=INSTALL[key];
  s.install[key]={at:now||Date.now(),end:(now||Date.now())+t,total:t};
  logAdd(s,'\u{1f6e0} Монтаж: '+MODULES[key].name+' собирают по частям, корпус заработает через '+
    Math.round(t/60000)+' мин','');
  return installInfo(s,key,now);
}
function installInfo(s,key,now){
  now=tnow(now);
  var it=s.install&&s.install[key]; if(!it)return null;
  var total=+it.total||INSTALL[key]||0,left=Math.max(0,(+it.end||0)-now);
  return {key:key,at:+it.at||now,end:+it.end||0,total:total,left:left,done:left<=0,
          pct:total?Math.max(0,Math.min(100,(total-left)/total*100)):100};
}
function installList(s,now){
  now=tnow(now); var out=[];
  if(!s.install)return out;
  Object.keys(s.install).forEach(function(k){ var i=installInfo(s,k,now); if(i&&!i.done)out.push(i); });
  return out;
}
/* завершение монтажа: один раз, с наградой и записью в журнал */
function installTick(s,now){
  now=tnow(now); var out=[];
  if(!s.install)return out;
  Object.keys(s.install).slice().forEach(function(k){
    var i=installInfo(s,k,now); if(!i||!i.done)return;
    delete s.install[k];
    var m=MODULES[k]; if(!m)return;
    pushChest(s,2);
    logAdd(s,'\u2728 Смонтажено: '+m.name+' вышел на полную мощность','gold');
    out.push({key:k,name:m.name,info:i});
  });
  return out;
}
function installFactor(s,key){
  var it=s.install&&s.install[key]; if(!it)return 1;
  return (Date.now()<+it.end)?INSTALL_PART:1;
}

/* ---- предотвчёт шага цепи: половина длинной задачи присылается наградой ----
   Шаг на 16 контрактов не должен быть чёрной дырой на двадцать минут: на середине
   капитан шлёт короткий отчёт с малой наградой. Так каждый длинный шаг даёт два
   значимых события вместо одного, и лесенка идёт ровно. */
function chainHalfAt(c){ return Math.max(1,Math.ceil((+c.need||1)/2)); }
function chainHalfTick(s,now){
  now=tnow(now);
  var st=chainState(s); if(st.done)return null;
  var c=st.cfg; if(!c||(c.need||1)<3)return null;
  if(!s.chainHalf)s.chainHalf={};
  if(s.chainHalf[c.id])return null;
  if(st.cur<chainHalfAt(c))return null;
  s.chainHalf[c.id]=1;
  var rw={},k;
  for(k in c.rw){
    if(k==='chests'){ var n=Math.floor((c.rw[k]||0)*0.5); if(n>0)rw.chests=n; continue; }
    var v=Math.floor((c.rw[k]||0)*0.4); if(v>0)rw[k]=v;
  }
  if(!Object.keys(rw).length)return null;
  for(k in rw){
    var val=Math.max(1,rw[k]);
    if(k==='chests'){ for(var q=0;q<val;q++)pushChest(s,1); continue; }
    s.resources[k]=(s.resources[k]||0)+val;
    if(k==='energy')s.stats.totalEnergy+=val; else if(k==='minerals')s.stats.totalMinerals+=val;
    else if(k==='credits')s.stats.totalCredits+=val; else if(k==='antimatter')s.stats.antimatter=(s.stats.antimatter||0)+val;
  }
  logAdd(s,'\u{1f4e9} Предотчёт по шагу «'+c.n+'»: '+chainRwTxt(rw),'ok');
  return {cfg:c,rw:rw,at:chainHalfAt(c),need:c.need};
}

function ratesWith(s,mult,multNA){
  var r={energy:0,minerals:0,credits:0,antimatter:0};
  MORDER.forEach(function(k){
    var m=MODULES[k], lvl=s.modules[k]||0;
    if(!lvl)return;
    var v=(m.rate||0)*lvl*RATEM*upgMult(s,'mod',k)*installFactor(s,k);
    /* антиматерия растёт от экономики дозированно: корень от общего множителя,
       иначе Ядро Варп-станции разгоняет саму себя до бесконечности */
    r[m.res]+=v*((m.res==='antimatter')?Math.pow(Math.max(1,multNA),0.28):mult);
  });
  return r;
}
function rates(s){return ratesWith(s,productionMult(s),productionMult(s,true));}
/* доход без рекламного буста и вспышки — по нему живут все «сроки» и цены экспедиций */
function ratesCalm(s){return ratesWith(s,productionMult(s,false,true),productionMult(s,true,true));}
function clickPower(s){
  var base=1+(s.modules.solar||0)*0.6+(s.modules.reactor||0)*2+(s.modules.dyson||0)*40;
  var m=upgMult(s,'click')*achMult(s)*(1+0.05*Math.min(300,(s.resources.antimatter||0)));
    if(s.boostUntil&&s.boostUntil>Date.now())m*=7;
  if(flareActive(s))m*=flareMult(s);
  return Math.max(1,Math.floor(base*m));
}
function scanBonus(s){return (s.modules.drone||0)*(1+ (s.upgrades['scan1']?1:0));}
function defense(s){return (s.modules.shield||0)*artEff(s,'def')*resEff(s,'def');}
/* курс руды на бирже «дышит»: базовая волна ~90 c + медленная волна ~7 мин.
   Игрок ловит пик — классическая биржевая петля idle-игры. */
function marketWave(now){
  var t=(now||Date.now())/1000;
  return 1 + 0.26*Math.sin(t/14.3) + 0.18*Math.sin(t/107.7+1.3) + 0.10*Math.sin(t/31.1+2.7);
}
function marketBase(s){return 3*upgMult(s,'sell');}
function sellRate(s,now){return marketBase(s)*marketWave(now);}
function marketLevel(s,now){
  var w=marketWave(now);
  var lbl = w>1.32?'отличный':(w>1.12?'высокий':(w<0.82?'плохой':(w<0.95?'низкий':'средний')));
  return {w:w,label:lbl,good:w>=1.12};
}
function luck(s){return (s.upgrades['luck1']?0.08:0)+artEff(s,'luck')+resEff(s,'luck');}
function offlineMult(s){return upgMult(s,'offline');}
/* ---- сколько осталось ждать: оценка по текущей скорости производства ---- */
/* срок шага цепи никогда не меньше, чем осталось ждать обработки отчёта:
   иначе лесенка обещает «через 0 сек», хотя награду выдадут только через 12 минут */
function chainEta(s,ch){ var w=Math.max(0,+((ch&&ch.wait)||0))/1000; var t=chainEtaWork(s,ch);
  return Math.max(isFinite(t)?t:Infinity,w); }
function chainEtaWork(s,ch){
  var c=ch.cfg,cur=ch.cur,need=ch.need,left=Math.max(0,need-cur);
  var wait=Math.max(0,+ch.wait||0);
  if(left<=0||(c.alt&&ch.work))return wait/1000;
  /* шаги про постройки — считаем по цене модулей */
  if(c.id==='ch1'||c.id==='ch2'||c.id==='ch5'||c.id==='ch13'||c.id==='ch14'||c.id==='ch15'){
    var key=c.id==='ch1'?'solar':(c.id==='ch2'?'miner':(c.id==='ch5'?null:(c.id==='ch13'?'fleet':(c.id==='ch14'?'ring':'gate'))));
    if(key){ var m=MODULES[key],cost=bulkCost(m,s.modules[key]||0,left,s),pr=payRes(m),o={};
      /* bulkCost отдаёт ЧИСЛО, а costTime ждёт объект {ресурс: цена} — иначе шаг
         постройки всегда показывал «готово через 0 сек» */
      o[pr]=cost;
      var t=costTime(s,o);
      /* модуль ещё заперт: срок = добить требуемый модуль-замок и уровень,
         и только потом сама копия */
      if(!modUnlocked(m,s)){
        var u=m.unlock||{}, add=0;
        if(u.mod){ var up=(s.modules[u.mod]||0), need2=(u.v||0);
          if(up<need2){ var o2={}; o2[payRes(MODULES[u.mod])]=bulkCost(MODULES[u.mod],up,need2-up,s);
            add+=costTime(s,o2); } }
        if(u.lv&&stationLevel(s)<u.lv)add+=levelEta(s,u.lv);
        t=add+Math.max(0,t);
      }
      return t; }
    return levelEta(s,need)-0;
  }
  if(c.id==='ch7'){ var u=null; UPGRADES.forEach(function(x){ if(x.id==='tap1')u=x; });
    return u?costTime(s,u.cost):Infinity; }
  if(c.id==='ch10')return costTime(s,SHIPS[0].cost);
  if(c.id==='ch6'){ var r0=null; RESEARCH.forEach(function(x){ if(!x.et&&!resHas(s,x.id)&&(!x.req||resHas(s,x.req))){ if(!r0||x.cost<r0.cost)r0=x; } });
    if(!r0)return Infinity;
    return timeToR(s.resources.antimatter||0,(s.modules.station?(rates(s).antimatter||0):0)||0,r0.cost)+(r0.t||5)*60; }
  if(c.id==='ch8'){ var pg=prestigeGain(s); if(pg>=1)return 0;
    return timeToR(s.stats.totalEnergy-(s.prestigeThreshold||0),ratesCalm(s).energy||0,prestigeNeed(s)); }
  if(c.id==='ch11')return Math.max(60,(CARAVAN_CD*1.6)/1000);
  /* шаги 15+ и вечные эпохи */
  if(c.kind==='lvl')return levelEta(s,need);
  if(c.kind==='anti')return timeToR(s.resources.antimatter||0,antiRate(s),need);
  if(c.kind==='ships'){ var nx=null; SHIPS.forEach(function(b){ var l=shipLv(s,b.id); if(!l)return;
      var cc=shipUpCost(s,b.id); if(!nx||cc<nx.c)nx={c:cc,id:b.id}; });
    if(!nx)return costTime(s,SHIPS[0].cost);
    return timeToR(s.resources.antimatter||0,antiRate(s),nx.c); }
  if(c.id==='ch19'||c.kind==='coll')return artEta(s,left);
  if(c.id==='ch20'||c.id==='ch24')return resEta(s,left);
  if(c.id==='ch22'){ var pv=victoryParts(s),tmax=0;
    pv.forEach(function(x){ var lf=Math.max(0,x.need-x.cur); if(lf<=0)return; var tt=Infinity;
      if(x.k==='lvl')tt=levelEta(s,x.need);
      if(x.k==='pre'){ var pgg=prestigeGain(s);
        tt=(pgg>=1)?0:timeToR(s.stats.totalEnergy-(s.prestigeThreshold||0),ratesCalm(s).energy||0,prestigeNeed(s)); }
      if(x.k==='art')tt=artEta(s,lf);
      if(x.k==='res')tt=resEta(s,lf);
      if(isFinite(tt)&&tt>tmax)tmax=tt; });
    return tmax; }
  if(c.kind==='mis'){ var pmm=Math.max(120,s.stats.playSeconds||120);
    var rmm=(s.stats.missionsDone||0)/pmm;
    if(rmm<=0)rmm=(s.stats.expSuccess||0)/pmm*0.22;      /* дальние миссии ~22% от всех удачных */
    /* своей статистики нет: дальние миссии — примерно четверть всех походов,
       а если и походов нет — одна миссия за эпоху, но срок всё равно конечный */
    if(rmm<=0)rmm=Math.max(expCadence(s)*0.25,1/EPOCH_T);
    return left/rmm; }
    /* шаги-счётчики: своя скорость шага; если шаг только начат — реальная скорость
     тех систем, которые шаг и просит (порт, экспедиции, сундуки, верфь).
     В v35 этот блок был недостижим для ch3/ch4/ch9/ch23/ch25 и для эпох port/exp/chest:
     оценка возвращалась Infinity, и лесенка вместе с «СКОРО» теряла цепь ровно тогда,
     когда игрок только начал шаг и больше всего ждал подсказки. */
  var b0=chainBase(s,c), span0=Math.max(120,(Date.now()-(b0.t||Date.now()))/1000);
  var play=Math.max(120,s.stats.playSeconds||120), rate=cur/span0;
  var kk=c.kind||'', iid=String(c.id||'');
  if(kk==='port'||iid==='ch4'||iid==='ch12'||iid==='ch16')
    rate=Math.max(rate,(s.stats.contractsDone||0)/play,1000/Math.max(60000,PORT_NEW_MS*(portRep(s).gap||1)));
  if(kk==='exp'||iid==='ch3'||iid==='ch9')
    rate=Math.max(rate,(s.stats.totalExpeditions||0)/play,expCadence(s));
  if(kk==='chest')
    rate=Math.max(rate,(s.stats.chestsOpened||0)/play,1/(12*60));
  if(iid==='ch10')rate=Math.max(rate,(s.stats.shipsBought||0)/play,1/(play+600));
  if(iid==='ch11')rate=Math.max(rate,(s.stats.caravans||0)/play,1/(play+CARAVAN_CD/1000));
  if(iid==='ch12')rate=Math.max(rate,(portRep(s).lv||0)/play);
  if(iid==='ch20')rate=Math.max(rate,(s.stats.research||0)/play);
  if(iid==='ch21')rate=Math.max(rate,(s.prestigeCount||0)/play);
  if(iid==='ch23'||iid==='ch25')rate=Math.max(rate,(s.epochs||0)/play*2,1/EPOCH_T);
  if(kk==='lvl2')return levelEta(s,need);   /* «доведи станцию до уровня N» — срок по стройке модулей */
  if(rate<=0)rate=1/600; /* ни своей скорости, ни истории: честный минимум — 1 единица за 10 минут */
  return left/rate;
}
function timeToR(have,rate,amount){
  have=+have||0; amount=+amount||0; rate=+rate||0;
  if(have>=amount)return 0;
  if(!(rate>0))return Infinity;
  return (amount-have)/rate;
}
function timeTo(s,res,amount){ return timeToR(s.resources[res]||0,ratesCalm(s)[res]||0,amount); }
/* Срок «сколько ждать покупку» обязан быть числом всегда. Если по нужному ресурсу
   доход нулевой (станция ещё не производит, ресурс ещё не открыт, антиматерии нет),
   берём тот же якорь, по которому посчитана сама цена (payIncome), а для энергии —
   силу тапа: игрок тапает с первой секунды. Иначе в лесенке и «СКОРО» появляются
   строки «нужен рост производства» вместо срока, и игрок не понимает, чего ждать. */
function rateFor(s,res,now){
  var v=+ratesCalm(s)[res]||0; if(v>0)return v;
  v=payIncome(s,res,now)||0; if(v>0)return v;
  if(res==='energy')return Math.max(1,clickPower(s));
  if(res==='antimatter')return antiRate(s);
  return 0; }
function costTime(s,cost){
  setCur(s);
  var t=0;
  for(var k in cost){ if(k.charAt(0)==='_'||RES.indexOf(k)<0)continue;   /* служебные поля (_copies) — не ресурс */
    var v=timeToR(s.resources[k]||0,rateFor(s,k),cost[k]); if(v>t)t=v; }
  return t; }
/* ---- темп систем: из чего считается «сколько ждать» ---- */
var EPOCH_T=30*60;                       /* вечная эпоха в среднем = полчаса игры */
/* экспедиций в секунду: слоты / самая короткая доступная миссия */
function expCadence(s){
  var sl=Math.max(1,expSlots(s)),best=null,i;
  for(i=0;i<EXPLORE.length;i++){ var e=EXPLORE[i];
    if(!expGate(s,i).ok)continue; if(!best||e.dur<best.dur)best=e; }
  if(!best)return 0;
  return sl/(best.dur*60);
}
/* сколько секунд осталось до следующего уровня корабля (вечная короткая цель флота) */
function shipUpEtaSec(s){
  var r=rates(s).antimatter||0,best=Infinity;
  SHIPS.forEach(function(b){ var l=shipLv(s,b.id); if(!l)return;
    var tt=timeToR(s.resources.antimatter||0,r,shipUpCost(s,b.id)); if(tt<best)best=tt; });
  if(!isFinite(best))return 1800;
  return Math.max(60,best);
}
/* сколько ждать, пока цепь дойдёт до шага n: срок текущего шага + типичный срок
   остальных (по средней скорости игры). Нужен, чтобы замок по цепи (верфь, пирс,
   карьера) не обещал «через 0 сек», пока игрок до него ещё не дошёл. */
function chainStepEta(s,n){
  var cur=s.chain||0; if(n<=cur)return 0;
  var per=Math.max(180,(s.stats.playSeconds||600)/Math.max(1,cur+1));
  var st=chainState(s),own=chainEta(s,st);
  return (isFinite(own)?Math.min(own,per*3):per)+(n-cur-1)*per;
}
function etaText(sec){
  if(sec===null||sec===undefined||sec!==sec)return '';
  if(!isFinite(sec))return 'нужен рост производства';
  if(sec<=1)return 'уже готово';
  if(sec<60)return 'через '+Math.round(sec)+' сек';
  var m=Math.round(sec/60);
  if(m<60)return 'через '+m+' мин';
  var h=Math.floor(m/60),mm=m%60;
  if(h<24)return 'через '+h+' ч'+(mm?' '+mm+' мин':'');
  return 'через '+Math.floor(h/24)+' д';
}
/* «3 модуля», а не «модуля 3»: по-русски число идёт перед словом */
function pl(n,a,b,c){ n=Math.abs(Math.round(n)); var m10=n%10,m100=n%100;
  if(m10===1&&m100!==11)return n+' '+a;
  if(m10>=2&&m10<=4&&(m100<10||m100>=20))return n+' '+b;
  return n+' '+c; }
function durTxt(sec){ sec=Math.max(0,Math.round(sec)); if(sec<60)return sec+' сек';
  var m=Math.round(sec/60); if(m<60)return m+' мин'; var h=Math.floor(m/60); return h+' ч '+(m%60)+' мин'; }
function modsForLevel(L){return Math.ceil((L*L+34*L-35)/6);}
/* сколько копий придётся построить, чтобы добрать уровень: та же жадная
   симуляция, что и у срока уровня, — иначе подпись «построй ещё N» расходилась бы со сроком */
function modCopiesFor(s,L){ var mc=modsCost(s,Math.max(0,modsForLevel(L)-modPoints(s)));
  return (mc&&mc._copies)||0; }
function levelEta(s,L){
  setCur(s);
  var need=modsForLevel(L)-modPoints(s); if(need<=0)return 0;
  var r=rates(s),best=null,bm=null;
  MORDER.forEach(function(k){ var m=MODULES[k]; if(!modUnlocked(m,s))return;
    var c=costFor(m,s.modules[k]||0,s); if(!best||c<best.c)best={c:c,res:payRes(m)},bm=m; });
  if(!best)return Infinity;
  /* цена N модулей считается честной симуляцией: строим каждый следующий самый дешёвый
     модуль (как это делает игрок), а не N × цену самого дешёвого */
  var mc=modsCost(s,need); if(!mc)return Infinity;
  var t=0;
  for(var res in mc){ if(res.charAt(0)==='_')continue;
    var tt=timeToR(s.resources[res]||0,r[res]||0,mc[res]); if(tt>t)t=tt; }
  return t;
}
/* сколько стоит постройка N модулей «как игрок»: жадно берём самый дешёвый доступный */
var _mcCache={k:'',t:0,v:null};
function modsCost(s,need){
  setCur(s);
  var k=modPoints(s)+'|'+need+'|'+MORDER.map(function(x){return s.modules[x]||0;}).join(',');
  if(_mcCache.k===k&&Date.now()-_mcCache.t<4000)return _mcCache.v;
  var lv={},out={},steps=Math.min(need*2,400),i,got=0,copies=0;
  MORDER.forEach(function(x){lv[x]=s.modules[x]||0;});
  for(i=0;i<steps&&got<need;i++){
    var bk=null,bc=Infinity;
    MORDER.forEach(function(x){ var m=MODULES[x]; if(!modUnlocked(m,s))return;
      var c=costFor(m,lv[x],s); if(c<bc){bc=c;bk=x;} });
    if(!bk){_mcCache={k:k,t:Date.now(),v:null};return null;}
    lv[bk]++; copies++; got+=(MPTS[bk]||1);
    var pr=payRes(MODULES[bk]); out[pr]=(out[pr]||0)+bc;
  }
  if(need>got){ /* хвост: недостающие баллы добираем средней ценой последней копии */
    var last=0,cnt=0;
    MORDER.forEach(function(x){ last+=costFor(MODULES[x],lv[x],s); cnt++; });
    last=last/Math.max(1,cnt);
    var leftCop=Math.ceil((need-got)/Math.max(1,(LVLW?4:1)));
    for(var res2 in out) out[res2]+=last*leftCop*0.9;
    copies+=leftCop;
  }
  out._copies=copies;
  _mcCache={k:k,t:Date.now(),v:out};
  return out;
}
function cometMult(s){return upgMult(s,'comet');}

function tick(s,dt){
  setCur(s);
  var r=rates(s);
  s.resources.energy+=r.energy*dt; s.resources.minerals+=r.minerals*dt;
  s.resources.credits+=r.credits*dt; s.resources.antimatter+=r.antimatter*dt;
  s.stats.totalEnergy+=r.energy*dt; s.stats.totalMinerals+=r.minerals*dt;
  s.stats.totalCredits+=r.credits*dt;
  s.stats.playSeconds+=dt; s.stats.lastSeen=Date.now();
  if(r.energy>s.stats.bestDps)s.stats.bestDps=r.energy;
  /* якорь цен и фактический приток антиматерии (она приходит не только из ядра:
     сундуки, награды шагов, прыжки, лавка) — по нему честный срок до науки,
     обликов и уровней кораблей */
  s.stats.antimatter=(s.stats.antimatter||0)+(r.antimatter||0)*dt;
  anchUpdate(s,Date.now());
  return r;
}
function buyModule(s,id){
  setCur(s);
  var m=MODULES[id]; if(!m)return{ok:false,msg:'Модуль не найден'};
  if(!modUnlocked(m,s))return{ok:false,msg:'Модуль заперт'};
  var lvl=s.modules[id]||0, c=costFor(m,lvl,s), pr=payRes(m);
  if(s.resources[pr]<c)return{ok:false,msg:'Не хватает: '+fmt(c)};
  s.resources[pr]-=c; s.modules[id]=lvl+1; anchUpdate(s,0);
  if(lvl===0)installStart(s,id,Date.now());
  return{ok:true,msg:m.name+' \u2192 ур. '+lvl+1,n:1,mile:mileJump(s,id,lvl)};
}
function maxBuy(s,id){
  setCur(s);
  var m=MODULES[id]; if(!m)return 0;
  var lvl=s.modules[id]||0, budget=s.resources[payRes(m)], n=0, c;
  while(n<1000){ c=costFor(m,lvl+n,s); if(budget<c)break; budget-=c; n++; }
  return n;
}
function buyN(s,id,n){
  setCur(s);
  var m=MODULES[id]; if(!m)return{ok:false,msg:'Модуль не найден'};
  if(!modUnlocked(m,s))return{ok:false,msg:'Модуль заперт'};
  var lvl=s.modules[id]||0, c=bulkCost(m,lvl,n,s), pr=payRes(m);
  if(s.resources[pr]<c)return{ok:false,msg:'Не хватает: '+fmt(c)};
  s.resources[pr]-=c; s.modules[id]=lvl+n; anchUpdate(s,0);
  if(lvl===0)installStart(s,id,Date.now());
  if(n>=10)s.stats.bulkBuys++;
  return{ok:true,msg:m.name+' \u2192 ур. '+(lvl+n),n:n,mile:mileJump(s,id,lvl)};
}
function sellMinerals(s,qty){
  if(!gateOpen(s,'market'))return gateErr('market');
  qty=Math.min(Math.floor(qty),Math.floor(s.resources.minerals||0));
  if(qty<=0)return{ok:false,msg:'Руды нет'};
  var cr=Math.floor(qty*sellRate(s,Date.now()));
  if(marketWave()>=1.25)s.stats.peakSells=(s.stats.peakSells||0)+1;
  s.resources.minerals-=qty; s.resources.credits+=cr;
  s.stats.totalCredits+=cr; s.stats.sells++;
  return{ok:true,credits:cr};
}
function buyUpgrade(s,id){
  var u=UPGRADES.find(function(x){return x.id===id;}); if(!u)return{ok:false,msg:'Нет апгрейда'};
  if(s.upgrades[id])return{ok:false,msg:'Уже куплено'};
  if(!u.req(s))return{ok:false,msg:'Рано'};
  if(!gateOpen(s,'tab:upgrades'))return gateErr('tab:upgrades');
  for(var k in u.cost){ if((s.resources[k]||0)<u.cost[k])return{ok:false,msg:'Не хватает: '+fmt(u.cost[k])}; }
  for(var k2 in u.cost) s.resources[k2]-=u.cost[k2];
  s.upgrades[id]=true;
  return{ok:true,msg:'Улучшение: '+u.name};
}
/* ---- экспедиции: длинные миссии (от 10 минут). Снаряжение оплачивается вперёд,
   награда — по возвращении экипажа. Слотов несколько, они растут с уровнем станции. ---- */
var EXP_SLOTS=[{lvl:1,n:1},{lvl:9,n:2},{lvl:18,n:3},{lvl:28,n:4},{lvl:40,n:5},{lvl:65,n:6}];
/* новая миссия открывается за каждый второй поход в старом темпе было слишком
   туго: пока открыта одна миссия, слоты простаивают, и шаг цепи «отправь ещё
   N экспедиций» превращается в ожидание одной очереди. Теперь следующая миссия
   открывается за каждый поход — слоты начинают работать параллельно. */
function expGate(s,i){ var need=i===0?0:i,cur=s.stats.totalExpeditions||0;
  if(i===0&&s.chain<2)return {ok:false,cur:s.chain,need:2,locked:1};
  return {cur:cur,need:need,ok:cur>=need}; }
function expGateEta(s,i){
  var g=expGate(s,i); if(g.ok)return 0;
  if(g.locked)return chainStepEta(s,2);   /* миссия ещё заперта цепью: срок по замку цепи */
  var pool=[],tot=0;
  for(var j=0;j<EXPLORE.length;j++){ if(expGate(s,j).ok){pool.push(EXPLORE[j].dur);tot+=EXPLORE[j].dur;} }
  if(!pool.length)return 30*60;
  return (g.need-g.cur)*(tot/pool.length)*60/Math.max(1,expSlots(s));
}
function expSlots(s){var l=stationLevel(s),n=1;EXP_SLOTS.forEach(function(x){if(l>=x.lvl)n=x.n;});return n;}
function expRunList(s){var o=s.expRun||{},out=[];for(var k in o){if(o[k]&&o[k].end)out.push(k);}return out;}
function expActive(s){return expRunList(s).length;}
function expGet(s,key){return (s.expRun||{})[key]||null;}
function expReady(s,key,now){return (+((s.exploreCooldown||{})[key])||0)<=(now||Date.now());}
function expLeft(s,key,now){return Math.max(0,(+((s.exploreCooldown||{})[key])||0)-(now||Date.now()));}
function expFloor(s,res,dur){return Math.floor(portFloor(s,res)*Math.max(1,dur/720));}
/* курс без биржевой волны: экспедиция — длинное вложение, её цена и груз
   не должны «дышать» вместе с курсом руды каждые полторы минуты */
function expPrice(s,res){
  if(res==='credits')return 1;
  var sr=Math.max(1,marketBase(s));
  if(res==='minerals')return sr;
  if(res==='energy')return Math.max(0.4,sr*0.3);
  return 1;
}
/* Снаряжение похода стоит долю спокойного дохода за время похода. Доля урезана
   (EXP_CUT), а награда поднята (EXP_GAIN): так слоты экспедиций не простаивают,
   потому что игрок, копящий на крупный корпус, всегда может снарядить поход.
   Поход — это «invest» в цикле act→reward→invest→unlock, и он не должен
   конкурировать со стройкой за последний кредит. */
var EXP_CUT=0.35, EXP_GAIN=2.6;
function expCost(s,e,now){
  now=tnow(now); var rs=ratesCalm(s),out={},dur=e.dur*60;
  for(var res in e.cost){
    var q=Math.floor((rs[res]||0)*dur*e.cost[res]*EXP_CUT);
    var f=Math.floor(expFloor(s,res,dur)*Math.max(0.2,e.cost[res]*3)*EXP_CUT);
    if(!isFinite(q)||q<f)q=f;
    out[res]=Math.max(1,Math.floor(q));
  }
  return out;
}
function expVal(s,c,now){var t=0;for(var k in c)t+=(c[k]||0)*expPrice(s,k);return t;}
function expReward(s,e,val,now){
  var rw={},tot=val*e.mult*EXP_GAIN;
  for(var res in e.rw){var p=expPrice(s,res);rw[res]=Math.max(1,Math.floor(tot*(e.rw[res]||0)/p));}
  if(e.anti)rw.antimatter=e.anti+Math.floor(stationLevel(s)/14);
  return rw;
}
function expChance(s,e){return Math.min(0.92,e.ch+scanBonus(s)*0.004+luck(s));}
function expTier(s,e){return Math.floor(EXPLORE.indexOf(e)/3);}
/* реальные шансы: артефакт и сундук падают только из удачного похода,
   поэтому их вероятность = шанс успеха x вероятность находки внутри похода */
function expArtChance(s,e,ch){ch=(ch===undefined)?expChance(s,e):ch;
  return ch*(0.20+expTier(s,e)*0.05);}
function expChestChance(s,e,ch){ch=(ch===undefined)?expChance(s,e):ch;
  var t=expTier(s,e);
  if(e.chest!=null)return Math.min(0.99,ch*0.45+(1-ch)*(0.06+t*0.015)*chestMult(s));
  return Math.min(0.6,ch*(0.06+t*0.015)*chestMult(s));}
/* сколько снаряжения реально уйдёт при провале с учётом энергощита */
function expLoss(s,e){return Math.max(0,1-defense(s)*0.015)*e.lost;}
function expInfo(s,e,now){
  now=tnow(now);
  var c=expCost(s,e,now),run=expGet(s,e.key);
  return {cost:c,rw:(run&&run.rw)?run.rw:expReward(s,e,run?run.val:expVal(s,c,now),now),
          ch:run?run.ch:expChance(s,e),run:run,ready:expReady(s,e.key,now),
          left:expLeft(s,e.key,now),dur:e.dur*60000};
}
function explore(s,key,now){
  now=tnow(now);
  var e=EXPLORE.find(function(x){return x.key===key;}); if(!e)return{ok:false,msg:'Нет события'};
  if(!gateOpen(s,'tab:explore'))return gateErr('tab:explore');
  if(!expReady(s,key,now))return{ok:false,msg:'Экипаж отдыхает '+fmtTimeMs(expLeft(s,key,now))};
  if(expGet(s,key))return{ok:false,msg:'Эта экспедиция уже в пути'};
  if(expActive(s)>=expSlots(s))return{ok:false,msg:'Все слоты экспедиций заняты'};
  var c=expCost(s,e,now);
  for(var k in c){ if((s.resources[k]||0)<c[k])return{ok:false,msg:'Не хватает: '+fmt(c[k])}; }
  for(var k2 in c) s.resources[k2]-=c[k2];
  s.expRun[key]={end:now+e.dur*60000,st:now,val:expVal(s,c,now),cost:c,ch:expChance(s,e),
    rw:expReward(s,e,expVal(s,c,now),now)};
  s.stats.totalExpeditions++;
  if(key==='core')s.stats.expCore=(s.stats.expCore||0)+1;
  logAdd(s,'\u{1f680} '+e.n+': экипаж вышел на маршрут ('+Math.round(e.dur)+' мин)','');
  return{ok:true,started:true,dur:e.dur*60000,cost:c,ch:expChance(s,e),
    rw:s.expRun[key]?s.expRun[key].rw:null};
}
function fmtTimeMs(ms){var m=Math.floor(ms/60000);if(m<1)return Math.ceil(ms/1000)+' с';return m+' мин';}
function expTick(s,now){
  now=tnow(now); var out=[];
  if(!s.expRun)s.expRun={};
  Object.keys(s.expRun).forEach(function(key){
    var r=s.expRun[key]; if(!r||!r.end||r.end>now)return;
    var e=EXPLORE.find(function(x){return x.key===key;});
    if(!e){delete s.expRun[key];return;}
    var res={key:key,name:e.n,ic:e.ic,success:false,reward:null,lost:null,art:null,chest:null,ch:r.ch,dur:e.dur};
    s.exploreCooldown[key]=now+Math.round(e.cd*60000*(1-Math.min(0.6,cdCut(s))));
    var tier=Math.floor(EXPLORE.indexOf(e)/3);
    if(Math.random()<r.ch){
      /* груз зафиксирован в момент отправки: игрок видел именно эти цифры,
         они и приходят. Пересчёт только для старых сейвов без r.rw */
      var rw=r.rw||expReward(s,e,r.val,now);
      for(var k in rw){var v=Math.max(1,rw[k]);
        s.resources[k]=(s.resources[k]||0)+v;
        if(k==='energy')s.stats.totalEnergy+=v; else if(k==='minerals')s.stats.totalMinerals+=v;
        else if(k==='credits')s.stats.totalCredits+=v;}
      res.success=true; res.reward=rw;
      s.stats.expSuccess++;
      /* звёздный маршрут считается только пока он открыт (шаг цепи 9): иначе к моменту
         разблокировки этап уже был пройден, и награда висела бы незабранной */
      if(gateOpen(s,'route')){ routeInit(s); s.route.n++; }
      if(e.dur>=45)s.stats.missionsDone=(s.stats.missionsDone||0)+1;
      if(Math.random()<0.20+tier*0.05)res.art=rollArtifact(s,tier);
      res.artCh=0.20+tier*0.05;
      if(e.chest!=null&&Math.random()<0.45)res.chest=pushChest(s,e.chest);
      else if(Math.random()<(0.06+tier*0.015)*chestMult(s))res.chest=pushChest(s,tier);
      logAdd(s,'\u{1f4e1} '+e.n+': миссия выполнена, груз доставлен','ok');
    }else{
      var d=expLoss(s,e), lost={};
      r.rw=null;
      for(var f in r.cost){var v=Math.round(r.cost[f]*d),b=s.resources[f]||0;
        s.resources[f]=Math.max(0,b-v); lost[f]=b-s.resources[f];}
      res.lost=lost;
      if(gateOpen(s,'route')){ routeInit(s); s.route.n=Math.max(0,s.route.n-1); }
      if(Math.random()<0.025*chestMult(s))res.chest=pushChest(s,0);
      logAdd(s,'\u26a0 '+e.n+': миссия провалена, экипаж вернулся ни с чем','bad');
    }
    delete s.expRun[key]; out.push(res);
  });
  return out;
}

/* ---- звёздный порт: торговые контракты (сток ресурсов, награда — кредиты/антиматерия/сундуки) ---- */
var PORT_SLOTS=3, PORT_NEW_MS=110000, PORT_TTL=16*60*1000, PORT_FIRST=20000;
var PORT_URG_TTL=5*60*1000, PORT_URG_CH=0.2, PORT_URG_MULT=4.5, PIER_COST=25;
var CARAVAN_LEN=3, CARAVAN_CH=0.30, CARAVAN_CD=8*60000, CARAVAN_MIN_REP=2, CARAVAN_TTL_MULT=1.8;
var PORT_KIND=[
 {id:'ore',    n:'Рудовоз',                 ic:'1faa8', need:{minerals:1},   rw:'credits', w:26, secs:[60,140],  min:0},
 {id:'power',  n:'Энергобаржа',             ic:'26a1',  need:{energy:1},     rw:'credits', w:22, secs:[60,140],  min:0},
 {id:'mix',    n:'Сборный караван',         ic:'1f69a', need:{minerals:0.6,energy:0.6}, rw:'credits', w:16, secs:[95,190],  min:0},
 {id:'lux',    n:'Роскошь для колоний',     ic:'1f331', need:{credits:1},    rw:'goods',   w:11, secs:[55,130],  min:1},
 {id:'rare',   n:'Контракт Синдиката',      ic:'1f48e', need:{minerals:0.7,credits:0.7}, rw:'anti',  w:9,  secs:[85,175],  min:2},
 {id:'convoy', n:'Конвой флота',            ic:'1f6a2', need:{energy:0.7,credits:0.7},   rw:'chest', w:8,  secs:[85,175],  min:3},
 {id:'council',n:'Контракт Галактического совета', ic:'1f3c6', need:{energy:0.45,minerals:0.45,credits:0.45}, rw:'big', w:6, secs:[130,250], min:4}
];
/* репутация порта: растёт от выполненных контрактов, ускоряет швартовку,
   множит награды и открывает редкие типы сделок */
var PORT_REP=[
 {need:0,   n:'Пустой док',           m:1.00, gap:1.00},
 {need:4,   n:'Ремонтная стоянка',    m:1.08, gap:0.90},
 {need:12,  n:'Торговый пост',        m:1.18, gap:0.81},
 {need:26,  n:'Звёздный порт',        m:1.30, gap:0.73},
 {need:55,  n:'Узел магистралей',     m:1.45, gap:0.65},
 {need:100, n:'Галактическая таможня',m:1.62, gap:0.57},
 {need:170, n:'Сердце торговли',      m:1.85, gap:0.48}
];
/* Ранги порта не заканчиваются на седьмом: дальше идут почётные узлы — по одному за
   PORT_TAIL_STEP контрактов, каждый даёт немного к наградам и чуть ускоряет корабли.
   Пока у системы есть следующий ранг, у игрока есть вечная понятная цель-счётчик. */
var PORT_TAIL_STEP=120, PORT_TAIL_B=0.05;
function portRankTail(d){ var last=PORT_REP[PORT_REP.length-1];
  return d>=last.need+PORT_TAIL_STEP?Math.floor((d-last.need)/PORT_TAIL_STEP):0; }
function portRankAt(t){ var last=PORT_REP[PORT_REP.length-1];
  if(t<=0)return last;
  return {need:last.need+t*PORT_TAIL_STEP,n:'Почётный узел \u00b7 '+t,
          m:last.m*Math.pow(1+PORT_TAIL_B,t),
          gap:Math.max(0.30,last.gap*Math.pow(0.97,t))}; }
function portRep(s){
  var d=s.stats.contractsDone||0, lv=0, i;
  for(i=0;i<PORT_REP.length;i++) if(d>=PORT_REP[i].need) lv=i;
  var cur=PORT_REP[lv], nx=PORT_REP[lv+1]||null, t=0;
  if(!nx){ t=portRankTail(d); if(t>0){ lv=PORT_REP.length-1+t; cur=portRankAt(t); }
    nx=portRankAt(t+1); nx.tail=1; }
  var pct=nx?Math.max(0,Math.min(100,(d-cur.need)/(nx.need-cur.need)*100)):100;
  return {lv:lv,cfg:cur,next:nx,done:d,pct:pct,mult:cur.m,gap:cur.gap,unlock:lv,
          max:PORT_REP.length-1,tail:t};
}
function portCfg(id){for(var i=0;i<PORT_KIND.length;i++)if(PORT_KIND[i].id===id)return PORT_KIND[i];
  if(id==='deal')return {id:'deal',n:'Большая сделка дня',ic:'1f4b5',min:0,w:0,secs:[0,0]};
  if(id==='caravan')return {id:'caravan',n:'Караванный контракт',ic:'1f6a2',min:0,w:0,secs:[0,0]};
  return PORT_KIND[0];}
function portPrice(s,res,now){
  if(res==='credits')return 1;
  var sr=Math.max(1,sellRate(s,now||Date.now()));
  if(res==='minerals')return sr;
  if(res==='energy')return Math.max(0.4,sr*0.3);
  return 1;
}
function portFloor(s,res){
  var l=stationLevel(s);
  var base={minerals:120,energy:400,credits:900}[res]||200;
  return Math.floor(base*Math.pow(1.35,Math.max(0,l-1)));
}
function portGen(s,now,noU){
  now=tnow(now);
  var tw=0,i;for(i=0;i<PORT_KIND.length;i++)tw+=PORT_KIND[i].w;
  var pool=PORT_KIND.filter(function(x){return x.min<=portRep(s).lv;});
  tw=0; for(i=0;i<pool.length;i++)tw+=pool[i].w;
  var r=Math.random()*tw,acc=0,k=pool[0];
  for(i=0;i<pool.length;i++){acc+=pool[i].w;if(r<acc){k=pool[i];break;}}
  var need={},val=0,rs=rates(s);
  Object.keys(k.need).forEach(function(res){
    var secs=k.secs[0]+Math.random()*(k.secs[1]-k.secs[0]);
    var q=Math.floor((rs[res]||0)*secs*k.need[res]);
    var fl=portFloor(s,res);
    if(!isFinite(q)||q<fl)q=fl;
    need[res]=q; val+=q*portPrice(s,res,now);
  });
  var rw={},sr=Math.max(1,sellRate(s,now));
  if(k.rw==='credits')rw.credits=Math.floor(val*(1.35+Math.random()*0.45));
  else if(k.rw==='goods'){rw.minerals=Math.floor(val*0.42/sr);rw.energy=Math.floor(val*0.72/(sr*0.3));}
  else if(k.rw==='anti'){rw.credits=Math.floor(val*1.15);rw.antimatter=1+Math.floor(stationLevel(s)/14);}
  else if(k.rw==='chest'){rw.credits=Math.floor(val*1.2);rw.chests=1;}
  else {rw.credits=Math.floor(val*1.9);rw.antimatter=2+Math.floor(stationLevel(s)/10);}
  var c={id:'c'+(now%1e7)+'_'+Math.floor(Math.random()*1e5),k:k.id,need:need,rw:rw,t:now,exp:now+PORT_TTL};
  if(!noU&&portRep(s).lv>=1&&Math.random()<PORT_URG_CH)portMakeUrgent(s,c,now);
  return c;
}
/* срочный чартер: короткий срок, награда ×4,5 и антиматерия */
function portMakeUrgent(s,c,now){
  c.urgent=1; c.exp=tnow(now)+PORT_URG_TTL;
  for(var k in c.rw){
    if(k==='chests')continue;
    if(k==='antimatter')c.rw[k]+=(1+Math.floor(stationLevel(s)/12));
    else c.rw[k]=Math.floor(c.rw[k]*PORT_URG_MULT);
  }
  return c;
}
/* караван: целая цепочка связанных контрактов одного конвоя */
function caravanActive(s){
  var n=0; ((s.port&&s.port.list)||[]).forEach(function(c){ if(c.car)n++; });
  n+=((s.port&&s.port.carQ)||[]).length;
  return n;
}
function caravanMake(s,now){
  now=tnow(now);
  var key='cv'+(now%100000)+'_'+Math.floor(Math.random()*9999), out=[],i;
  for(i=0;i<CARAVAN_LEN;i++){
    var c=portGen(s,now,true);
    c.k='caravan'; c.urgent=0; c.big=0;
    c.car={chain:key,step:i+1,n:CARAVAN_LEN};
    c.t=now; c.exp=now+Math.round(PORT_TTL*CARAVAN_TTL_MULT);
    Object.keys(c.need).forEach(function(k){ c.need[k]=Math.floor(c.need[k]*(1.12+0.14*i)); });
    Object.keys(c.rw).forEach(function(k){
      if(k==='chests'){ c.rw.chests=1; return; }
      c.rw[k]=Math.floor(c.rw[k]*(1.55+0.18*i));
    });
    out.push(c);
  }
  out[CARAVAN_LEN-1].car.last=1;
  return out;
}
function caravanBonus(s){
  var l=stationLevel(s);
  return {credits:Math.floor(Math.max(5e4,(rates(s).credits||0)*240)+Math.pow(1.15,l)*120),
          antimatter:3+Math.floor(l/9)};
}
function caravanTxt(s){
  var b=caravanBonus(s);
  return G.fmt(b.credits)+' кредитов, +'+b.antimatter+' антиматерии и сундук находок';
}
/* расширенный пирс: постоянный 4-й слот контрактов */
function portSlots(s){return PORT_SLOTS+((s.pier||0)?1:0);}
function buyPier(s){
  if(s.pier)return{ok:false,msg:'Пирс уже построен'};
  if((s.resources.antimatter||0)<PIER_COST)return{ok:false,msg:'Нужно '+PIER_COST+' антиматерии'};
  s.resources.antimatter-=PIER_COST; s.pier=1;
  return{ok:true};
}
function portGenDeal(s,now){
  now=tnow(now);
  var c=portGen(s,now);
  var rs=rates(s),need={},val=0;
  ['minerals','energy','credits'].forEach(function(res){
    var q=Math.floor((rs[res]||0)*(300+Math.random()*180));
    var fl=portFloor(s,res)*5;
    if(!isFinite(q)||q<fl)q=fl;
    need[res]=q; val+=q*portPrice(s,res,now);
  });
  var sr=Math.max(1,sellRate(s,now));
  c.k='deal'; c.need=need; c.big=1; c.exp=now+20*3600*1000;
  c.rw={credits:Math.floor(val*3.2),antimatter:3+Math.floor(stationLevel(s)/8),chests:1};
  return c;
}
function portState(s,now){
  now=tnow(now);
  if(!s.port)s.port={list:[],nextAt:0};
  var p=s.port,removed=0;
  /* порт заперт до шага цепи 3: до этого игрок не видит ни сделок, ни таймеров */
  if(!gateOpen(s,'port'))return {list:[],nextIn:0,slots:0,missed:s.stats.contractsMissed||0,
    done:s.stats.contractsDone||0,rep:portRep(s),gap:PORT_NEW_MS,car:0,carQ:0,carIn:0,
    carReady:false,caravans:s.stats.caravans||0,locked:1};
  p.list=(p.list||[]).filter(function(c){ if(!c||!c.id||!c.exp)return false; if(c.exp<=now){removed++;return false;} return true; });
  if(removed)s.stats.contractsMissed=(s.stats.contractsMissed||0)+removed;
  var rep=portRep(s), gap=Math.round(PORT_NEW_MS*rep.gap*(1-portGapCut(s)));
  var dk=dayKey(now);
  if((!p.dealDay||p.dealDay!==dk)&&stationLevel(s)>=2){
    p.dealDay=dk;
    p.list.unshift(portGenDeal(s,now));
  }
  var big=0; p.list.forEach(function(c){ if(c.big)big++; });
  var SLOTS=portSlots(s);
  var free=SLOTS-(p.list.length-big);
  if(!p.nextAt)p.nextAt=now+((p.list.length-big)?gap:PORT_FIRST);
  if(!p.init&&stationLevel(s)>=2){ p.init=1;
    for(var q0=0;q0<free;q0++) p.list.push(portGen(s,now));
    p.nextAt=now+gap;
  }
  var guard=0;
  if(!p.carAt)p.carAt=now+Math.round(CARAVAN_CD*0.55);
  if(!p.carWait)p.carWait=0;
  var carReady=(now>=p.carAt&&rep.lv>=CARAVAN_MIN_REP&&caravanActive(s)===0);
  /* Шаг цепи «проведи караван» не имеет права быть лотереей на час: если очередь
     к стенке стоит, а караван не выпал дважды подряд, следующая цепочка приходит
     гарантированно. Игрок ждёт конкретное событие, а не монетку. */
  while(SLOTS-(p.list.length-big)>0&&now>=p.nextAt&&guard<4){
    var wantCar=carReady&&SLOTS-(p.list.length-big)>=1;
    if(wantCar&&(Math.random()<CARAVAN_CH||p.carWait>=2)){
      var chain=caravanMake(s,now);
      p.list.push(chain[0]); p.carQ=chain.slice(1); p.carAt=now+CARAVAN_CD; p.carWait=0; carReady=false;
      logAdd(s,'🚢 Караван встал у стенки: 3 связанных контракта, не сорви цепочку','gold');
    } else { if(wantCar)p.carWait++; p.list.push(portGen(s,now)); }
    p.nextAt=now+gap; guard++;
  }
  /* слоты забиты, а караван просрочен: таймер не должен врать «через 0 сек» */
  if(carReady&&now>p.carAt+gap&&SLOTS-(p.list.length-big)<=0)p.carAt=now+gap;
  /* следующий контракт каравана встаёт к стенке только когда предыдущий сдан */
  var carInList=0; p.list.forEach(function(c){ if(c.car)carInList++; });
  var g2=0;
  while(p.carQ&&p.carQ.length&&carInList===0&&SLOTS-(p.list.length-big)>0&&g2<3){
    var nx=p.carQ.shift(); nx.t=now; nx.exp=now+Math.round(PORT_TTL*CARAVAN_TTL_MULT);
    p.list.push(nx); carInList++; g2++;
  }
  return {list:p.list,nextIn:Math.max(0,p.nextAt-now),slots:SLOTS,missed:s.stats.contractsMissed||0,
          done:s.stats.contractsDone||0,rep:rep,gap:gap,
          car:caravanActive(s),carQ:(p.carQ||[]).length,carIn:Math.max(0,(p.carAt||0)-now),
          carReady:rep.lv>=CARAVAN_MIN_REP,caravans:s.stats.caravans||0};
}
function portCan(s,c){ return Object.keys(c.need).every(function(k){return (s.resources[k]||0)>=c.need[k];}); }
function portReward(s,c){
  var m=upgMult(s,'port')*portRep(s).mult,rw={},k;  /* upgMult уже включает верфь (shipEff 'port') */
  for(k in c.rw)rw[k]=Math.max(1,Math.floor(c.rw[k]*((k==='chests'||k==='antimatter')?1:m)));
  return rw;
}
function portDeliver(s,id,now){
  now=tnow(now);
  if(!s.port)s.port={list:[],nextAt:0};
  if(!gateOpen(s,'port'))return gateErr('port');
  var c=null,idx=-1;
  s.port.list.forEach(function(x,i){ if(x.id===id){c=x;idx=i;} });
  if(!c)return{ok:false,msg:'Контракт уже ушёл'};
  if(!portCan(s,c))return{ok:false,msg:'Не хватает груза'};
  Object.keys(c.need).forEach(function(k){ s.resources[k]=Math.max(0,(s.resources[k]||0)-c.need[k]); });
  s.port.list.splice(idx,1);
  var rw=portReward(s,c);
  for(var r in rw){
    var v=Math.max(1,rw[r]);
    if(r==='chests'){ pushChest(s,1); }
    else{ s.resources[r]=(s.resources[r]||0)+v;
      if(r==='energy')s.stats.totalEnergy+=v; else if(r==='minerals')s.stats.totalMinerals+=v; else if(r==='credits')s.stats.totalCredits+=v; }
  }
  s.stats.contractsDone=(s.stats.contractsDone||0)+1;
  if(c.big)s.stats.dealsDone=(s.stats.dealsDone||0)+1;
  if(c.urgent)s.stats.urgentDone=(s.stats.urgentDone||0)+1;
  var car=null;
  if(c.car){
    if(c.car.last){
      s.stats.caravans=(s.stats.caravans||0)+1;
      s.stats.contractsDone=(s.stats.contractsDone||0)+(CARAVAN_LEN-1); /* цепочка даёт доп. вес репутации */
      car=caravanBonus(s);
      for(var cr in car){
        var cv=Math.max(1,car[cr]); s.resources[cr]=(s.resources[cr]||0)+cv;
        if(cr==='credits')s.stats.totalCredits+=cv; else if(cr==='antimatter')s.stats.antimatter=(s.stats.antimatter||0)+cv;
      }
      pushChest(s,2);
      logAdd(s,'🚢 Караван проведён целиком: +'+fmt(car.credits)+' кредитов, +'+car.antimatter+' антиматерии','gold');
    } else if((s.port.carQ||[]).length){
      /* следующее звено конвоя встаёт к стенке сразу, как только освобождается место:
         цепочка не должна ждать тика порта и не должна рваться из-за забитого пирса */
      var nx2=s.port.carQ.shift();
      nx2.t=tnow(now); nx2.exp=nx2.t+Math.round(PORT_TTL*CARAVAN_TTL_MULT);
      s.port.list.push(nx2);
    }
  }
  return{ok:true,car:car,carStep:c.car?c.car.step:0,carN:c.car?c.car.n:0,cfg:c.big?{id:'deal',n:'Большая сделка дня',ic:'1f4b5',min:0,w:0,secs:[0,0]}:portCfg(c.k),rw:rw,left:s.port.list.length,big:!!c.big,urgent:!!c.urgent};
}
function portRerollCost(s,c){
  var v=0; Object.keys(c.need).forEach(function(k){ v+=c.need[k]*expPrice(s,k); });
  return Math.max(50,Math.floor(v*0.35));
}
function portReroll(s,id,now){
  now=tnow(now);
  if(!s.port)s.port={list:[],nextAt:0,init:0,dealDay:''};
  var c=null; s.port.list.forEach(function(x){ if(x.id===id)c=x; });
  if(!c)return{ok:false,msg:'Контракт уже ушёл'};
  if(c.big)return{ok:false,msg:'Большую сделку дня не заменить'};
  var cost=portRerollCost(s,c);
  if((s.resources.credits||0)<cost)return{ok:false,msg:'Нужно '+fmt(cost)+' кредитов'};
  s.resources.credits-=cost;
  var n=portGen(s,now); n.exp=c.exp; if(c.urgent)portMakeUrgent(s,n,now);
  s.port.list=s.port.list.map(function(x){ return x.id===id?n:x; });
  s.stats.rerolls=(s.stats.rerolls||0)+1;
  return{ok:true,c:n,cost:cost};
}
function portCheapest(s){
  if(!s.port||!s.port.list)return null;
  var best=null,bv=1e30;
  s.port.list.forEach(function(c){
    if(!portCan(s,c))return;
    var v=0; Object.keys(c.need).forEach(function(k){ v+=c.need[k]*portPrice(s,k); });
    if(v<bv){bv=v;best=c;}
  });
  return best;
}

var SEASON_LEN=7*86400*1000;
var SEASON_TIERS=[
  {need:2.5e6, e:3e5,   a:20,   name:'Разминка'},
  {need:2e7,   e:3e6,   a:120,  name:'Разгон'},
  {need:1.5e8, e:4e7,   a:700,  name:'Мастерство'},
  {need:1.2e9, e:5e8,   a:3000, name:'Легенда сектора'},
  {need:1e10,  e:8e9,   a:18000,name:'Хозяин галактики'}
];
function seasonInfo(s,now){
  var id=Math.floor(now/SEASON_LEN);
  if(!s.season||s.season.id!==id)s.season={id:id,base:s.stats.totalEnergy||0,claimed:[]};
  var score=Math.max(0,(s.stats.totalEnergy||0)-(s.season.base||0));
  var start=id*SEASON_LEN;
  return {id:id,start:start,end:start+SEASON_LEN,score:score,
    tiers:SEASON_TIERS.map(function(t,i){
      var cl=((s.season.claimed)||[]).indexOf(i)>=0;
      return {need:t.need,e:t.e,a:t.a,name:t.name,i:i,claimed:cl,done:score>=t.need};
    })};
}
function seasonClaim(s,i,now){
  if(!gateOpen(s,'season'))return null;
  var info=seasonInfo(s,now), t=info.tiers[i];
  if(!t||!t.done||t.claimed)return null;
  if(!s.season.claimed)s.season.claimed=[];
  s.season.claimed.push(i);
  s.resources.energy+=t.e; s.resources.antimatter+=t.a; s.stats.antimatter=(s.stats.antimatter||0)+(+t.a||0);
  return t;
}
/* ---- сезонные задания: 3 цели на неделю, ротируются по id сезона ---- */
var SQ_POOL=[
 {k:'contractsDone',   n:'Торговая неделя',    ic:'1f6e9', base:12, a:18},
 {k:'urgentDone',      n:'Срочная смена',      ic:'1f6a4', base:4,  a:24},
 {k:'cometsCaught',    n:'Охота за кометами',  ic:'1f320', base:6,  a:16},
 {k:'totalExpeditions',n:'Разведка сектора',   ic:'1f6f8', base:16, a:14},
 {k:'raids',           n:'Оборона станции',    ic:'1f3f0', base:8,  a:16},
 {k:'chestsOpened',    n:'Вскрытие находок',   ic:'1f4e6', base:6,  a:15},
 {k:'research',        n:'Неделя науки',       ic:'1f52c', base:3,  a:26},
 {k:'dqDone',          n:'Дисциплина дня',     ic:'1f4cb', base:4,  a:14},
 {k:'repairs',         n:'Ремонтная неделя',   ic:'1f527', base:3,  a:20},
 {k:'artifacts',       n:'Поиск артефактов',   ic:'1f48e', base:2,  a:24},
 {k:'caravans',        n:'Караванные проводки', ic:'1f6a2', base:2, a:10},
 {k:'shipUps',         n:'Модернизация флота',  ic:'1f527', base:3, a:18},
 {k:'chainDone',       n:'Цепь капитана',       ic:'1f3c5', base:4, a:16}
];
function sqCfg(k){ for(var i=0;i<SQ_POOL.length;i++)if(SQ_POOL[i].k===k)return SQ_POOL[i]; return null; }
function sqRoll(s,now){
  var id=Math.floor(now/SEASON_LEN);
  if(s.sq&&s.sq.id===id&&s.sq.list&&s.sq.list.length===3)return s.sq;
  var h=hashStr('sq'+id), pool=SQ_POOL.slice(), list=[];
  for(var i=0;i<3;i++){ h=hashStr(h+'#'+i); var idx=h%pool.length; list.push(pool.splice(idx,1)[0].k); }
  s.sq={id:id,list:list,base:list.map(function(k){return +(s.stats[k]||0);}),claimed:[]};
  return s.sq;
}
function seasonQuests(s,now){
  now=tnow(now);
  var sq=sqRoll(s,now), l=stationLevel(s), out=[];
  sq.list.forEach(function(k,i){
    var p=sqCfg(k); if(!p)return;
    var need=Math.max(2,Math.round(p.base*(1+0.10*l)));
    var cur=Math.max(0,+(s.stats[k]||0)-(sq.base[i]||0));
    out.push({i:i,k:k,n:p.n,ic:p.ic,need:need,cur:Math.min(cur,need),done:cur>=need,
      claimed:((sq.claimed||[]).indexOf(i)>=0),
      rw:{antimatter:Math.max(6,Math.round(p.a*(1+0.05*l))),credits:dqCred(s,140)}});
  });
  return out;
}
function seasonQuestClaim(s,i,now){
  now=tnow(now);
  var list=seasonQuests(s,now), q=null;
  list.forEach(function(x){ if(x.i===i)q=x; });
  if(!q)return{ok:false,msg:'Задание не найдено'};
  if(q.claimed)return{ok:false,msg:'Награда уже забрана'};
  if(!q.done)return{ok:false,msg:'Задание ещё не выполнено'};
  if(!s.sq.claimed)s.sq.claimed=[];
  s.sq.claimed.push(i);
  for(var k in q.rw){ var v=Math.max(1,q.rw[k]); s.resources[k]=(s.resources[k]||0)+v;
    if(k==='credits')s.stats.totalCredits+=v; }
  s.stats.sqDone=(s.stats.sqDone||0)+1;
  logAdd(s,'Сезон: «'+q.n+'» выполнено','ok');
  return{ok:true,q:q};
}

/* порог прыжка растёт с каждым прыжком: второй стоит втрое больше первого,
   пятый — вдесятеро. Иначе варп-прыжки становятся кнопкой «ещё быстрее» и съедают
   первый акт за минуты, а линейная лесенка открытий рассыпается */
/* Порог прыжка привязан к спокойному доходу: прыжок стоит ~20 минут добычи,
   и каждый следующий стоит дороже. Значение замораживается за номером прыжка —
   цифра «сколько ждать» не скачет вместе с биржей, бустом и вспышкой. */
function prestigeNeed(s){
  var n=(s.prestigeCount||0)+1,k='n'+n,cnt=(s.prestigeCount||0);
  if(!s.prestigeNeeds)s.prestigeNeeds={};
  var rec=s.prestigeNeeds[k];
  if(rec&&rec.v>0&&rec.at===cnt)return rec.v;   /* цифра не меняется, пока прыжок не сделан */
  /* следующий прыжок стоит втрое больше добычи, чем прошлый: порог привязан к собственной
     истории игрока, поэтому он не обесценивается вместе с ростом дохода */
  var last=Math.max(0,+s.prestigeLastBank||0);
  /* три планки сразу: нижняя (прыжок раньше бессмыслен), «впятеро больше прошлого банка»
     (прыжки не превращаются в кнопку ускорения) и спокойный потолок по доходу: ~15 минут
     добычи энергии на каждый прыжок. Третья планка и есть линейность: шаг цепи «первый
     варп-прыжок» перестаёт быть 70-минутной чёрной дырой на медленных профилях игры. */
  var rate=+ratesCalm(s).energy||0;
  var v=Math.max(PRESTIGE_MIN*Math.pow(n,1/0.62),Math.round(last*5),
                 rate>0?Math.round(PRESTIGE_T*n*rate):0);
  s.prestigeNeeds[k]={v:v,at:cnt};
  return v;
}
function prestigeGain(s){
  if(!gateOpen(s,'prestige'))return 0;
  var e=Math.max(0,s.stats.totalEnergy-(s.prestigeThreshold||0)), need=prestigeNeed(s);
  if(e<need)return 0;
  // логарифмический рост: каждый следующий порядок добытой энергии = +10 антиматерии.
  return Math.max(1,Math.floor(10*Math.log(1+e/need)/Math.LN10));
}
/* откат прыжка: гипердвигателю нужно остыть. Пока откат идёт, прыжок не доступен —
   иначе игрок сбрасывает станцию пачками и линейная лесенка открытий рассыпается. */
function prestigeCool(s,now){
  now=tnow(now);
  var at=+(s&&s.prestigeAt)||0, left=at+PRESTIGE_CD-now;
  return {left:Math.max(0,left),total:PRESTIGE_CD,ready:at<=0||left<=0,next:at?at+PRESTIGE_CD:0};
}
function prestige(s,now){
  now=tnow(now);
  if(!gateOpen(s,'prestige'))return{ok:false,gain:0,msg:'Гипердвигатель ещё не открыт'};
  var g=prestigeGain(s);
  if(g<1)return{ok:false,gain:0,msg:'Мало энергии для прыжка'};
  var cool=prestigeCool(s,now);
  if(!cool.ready)return{ok:false,gain:g,msg:'Двигатель остывает: '+fmtTimeMs(cool.left)};
  s.prestigeLastBank=Math.max(0,s.stats.totalEnergy-(s.prestigeThreshold||0));
  s.resources.antimatter+=g; s.stats.antimatter=(s.stats.antimatter||0)+g; s.prestigeCount++; s.prestigeAt=now;
  s.prestigeThreshold=s.stats.totalEnergy;
  s.resources.energy=0;s.resources.minerals=0;s.resources.credits=0;
  /* станция уходит в прыжок не в ноль: 30% корпусов уцелело. Это держит темп
     ровным — после прыжка игрок быстро отстраивается обратно и не проваливается
     в получасовое «снова уровень 12». */
  MORDER.forEach(function(k){ s.modules[k]=Math.floor((s.modules[k]||0)*PRESTIGE_KEEP); });
  s.install={}; anchUpdate(s,0);
  s.exploreCooldown={}; s.expRun={}; EXPLORE.forEach(function(e){s.exploreCooldown[e.key]=0;});
  s.boostUntil=0;
  if(s.eternal)s.epochs=(s.epochs||0)+1;
  return{ok:true,gain:g,epochs:s.epochs||0};
}
function checkAch(s){var g=[];ACH.forEach(function(a){if(!s.achievements[a.id]&&a.c(s)){s.achievements[a.id]=true;g.push(a);}});return g;}
function checkQuests(s){
  var out=[];
  QUESTS.forEach(function(q){
    if(s.quests[q.id])return;
    var st=questState(s,q);
    if(st.done){ s.quests[q.id]='claim'; out.push(q); }
  });
  return out;
}
function questState(s,q){
  var done=false,cur=0,need=1;
  try{ done=q.c(s); }catch(e){}
  if(q.p){ try{ var pr=q.p(s); cur=+pr[0]||0; need=+pr[1]||1; }catch(e){} }
  if(!isFinite(cur))cur=0; if(!isFinite(need)||need<1)need=1;
  if(done&&cur<need)cur=need;
  return {done:done,cur:Math.max(0,Math.min(cur,need)),need:need};
}
function claimQuest(s,id){
  var q=QUESTS.find(function(x){return x.id===id;}); if(!q)return{ok:false,msg:'Нет задания'};
  if(s.quests[id]!=='claim')return{ok:false,msg:'Ещё не выполнено'};
  s.quests[id]='done'; s.stats.questsDone++;
  for(var k in q.rw){
    if(k==='chests'){ for(var i=0;i<q.rw[k];i++)pushChest(s,1); continue; }
    s.resources[k]=(s.resources[k]||0)+q.rw[k];
  }
  return{ok:true,q:q};
}
/* ---- коллекция артефактов ---- */
var ART=[
 {id:'ar1', n:'Осколок кометы',      ic:'2604', r:1, d:'Весь доход станции +6%',        eff:{all:1.06}},
 {id:'ar2', n:'Лунный базальт',      ic:'1faa8', r:1, d:'Добыча руды +15%',             eff:{mod:'miner',v:1.15}},
 {id:'ar3', n:'Старый лог дрона',    ic:'1f6f0', r:1, d:'Шанс экспедиций +4%',          eff:{luck:0.04}},
 {id:'ar4', n:'Кристалл гелия-3',    ic:'1f4a0', r:1, d:'Энергия модулей +10%',         eff:{mod:'reactor',v:1.10}},
 {id:'ar5', n:'Печатная плата ИИ',   ic:'1f9ec', r:2, d:'Весь доход станции +12%',      eff:{all:1.12}},
 {id:'ar6', n:'Кристальный шар',     ic:'1f3ac', r:2, d:'Шанс экспедиций +7%',          eff:{luck:0.07}},
 {id:'ar7', n:'Осколок щита',        ic:'26a0',  r:2, d:'Потери в экспедициях −20%',    eff:{def:1.25}},
 {id:'ar8', n:'Крюк торговца',       ic:'1f4bc', r:2, d:'Курс руды +20%',               eff:{sell:1.2}},
 {id:'ar9', n:'Песочные часы эпохи', ic:'1f573', r:3, d:'Оффлайн-доход +40%',           eff:{offline:1.4}},
 {id:'ar10',n:'Алмазный бур',        ic:'1f48e', r:3, d:'Руда модулей +30%',            eff:{mod:'laser',v:1.3}},
 {id:'ar11',n:'Компас древних',      ic:'1f9ed', r:3, d:'Весь доход станции +20%',      eff:{all:1.20}},
 {id:'ar12',n:'Сердце реактора',     ic:'1f525', r:3, d:'Энергия модулей +25%',         eff:{mod:'fusion',v:1.25}},
 {id:'ar13',n:'Слеза туманности',    ic:'1f30c', r:4, d:'Весь доход станции +35%',      eff:{all:1.35}},
 {id:'ar14',n:'Корона галактики',    ic:'1f31f', r:4, d:'Сила тапа ×3 и доход +25%',    eff:{click:3,all:1.25}},
 {id:'ar15',n:'Ковчег цивилизации',  ic:'1f3df', r:4, d:'Весь доход станции +50%',      eff:{all:1.5}},
 {id:'ar16',n:'Якорь времени',       ic:'231b',  r:5, d:'Оффлайн-доход ×1.8, кулдауны −15%', eff:{offline:1.8,cd:0.15}},
 {id:'ar17',n:'Жезл торговцев',      ic:'1f4b0', r:5, d:'Курс руды ×2 и весь доход +18%',  eff:{sell:2,all:1.18}},
 {id:'ar18',n:'Сердце станции',      ic:'1f3d7', r:5, d:'Весь доход станции +70%',         eff:{all:1.7}}
];
function artOwned(s){var n=0;for(var k in (s.art||{}))if(s.art[k])n++;return n;}
function artEff(s,kind,tgt){
  var m=(kind==='luck'||kind==='cd')?0:1;
  var A=s.art; if(!A)return m;
  var B=artB(), list=(kind==='mod')?B.mod:(B[kind]||EFF_NONE);
  for(var i=0;i<list.length;i++){
    var a=list[i]; if(!A[a.id])continue;
    var e=a.eff, v=e[kind];
    if(v===undefined||v===null)continue;
    if(kind==='mod'){ if(e.mod!==tgt)continue; v=e.v; }
    if(kind==='luck'||kind==='cd')m+=v; else m*=v;
  }
  return m;
}
function cdCut(s){ return resEff(s,'cd')+artEff(s,'cd')+shipEff(s,'cd'); }
function rollArtifact(s,tier){
  var pool=ART.filter(function(a){return !s.art[a.id] && a.r<=Math.min(5,tier+2) && a.r>=Math.max(1,tier-1);});
  if(!pool.length)pool=ART.filter(function(a){return !s.art[a.id] && a.r<=Math.min(4,tier+1);});
  if(!pool.length)return null;
  var tot=0,i; for(i=0;i<pool.length;i++)tot+=(5-pool[i].r);
  var r=Math.random()*tot,acc=0;
  for(i=0;i<pool.length;i++){acc+=(5-pool[i].r); if(r<acc)break;}
  var a=pool[Math.min(i,pool.length-1)];
  s.art[a.id]=1; s.stats.artifacts=(s.stats.artifacts||0)+1;
  return a;
}

/* ---- лаборатория: исследования за антиматерию, не сгорают при варп-прыжке ---- */
var RESEARCH=[
 {id:'rs1', t:5, n:'Гидропоника 2.0',        ic:'1f331', cost:1,   req:null,  eff:{mod:'hydro',v:1.6},  d:'Гидропонный отсек даёт ×1.6 кредитов'},
 {id:'rs2', t:8, n:'Лёгкие сплавы',          ic:'2699',  cost:3,   req:'rs1', eff:{all:1.10},           d:'Весь доход станции +10%'},
 {id:'rs3', t:10, n:'Кинетика роя',           ic:'1f916', cost:5,   req:'rs1', eff:{tap:1},              d:'Рой авто-дронов тапает на 1 тап/сек быстрее'},
 {id:'rs4', t:14, n:'Аллоевые буры',          ic:'1f52b', cost:8,   req:'rs2', eff:{mod:'laser',v:1.7},  d:'Плазменный бур добывает руду ×1.7'},
 {id:'rs5', t:18, n:'Навигация маршрутов',    ic:'1f9ed', cost:12,  req:'rs2', eff:{cd:0.15},            d:'Кулдауны экспедиций −15%'},
 {id:'rs6', t:24, n:'Реакторы четвёртой эры', ic:'2622',  cost:16,  req:'rs4', eff:{mod:'reactor',v:1.8},d:'Термоядерный реактор даёт ×1.8 энергии'},
 {id:'rs7', t:30, n:'Торговые привилегии',    ic:'1f4b0', cost:22,  req:'rs5', eff:{sell:1.5},           d:'Курс руды на бирже ×1.5'},
 {id:'rs8', t:36, n:'Глубокий сон',           ic:'1f319', cost:30,  req:'rs6', eff:{offline:1.6},        d:'Оффлайн-доход ×1.6'},
 {id:'rs9', t:45, n:'Гелиосинтез звезды',     ic:'1f31e', cost:40,  req:'rs6', eff:{mod:'dyson',v:1.8},  d:'Сфера Дайсона даёт ×1.8 энергии'},
 {id:'rs10', t:60,n:'Астроинженерия',         ic:'1f3d7', cost:90,  req:'rs7', eff:{all:1.25},           d:'Весь доход станции +25%'},
 {id:'rs11', t:75,n:'Плазменная защита',      ic:'1f6e1', cost:160, req:'rs8', eff:{def:1.5,luck:0.06},  d:'Энергощит эффективнее ×1.5, шанс экспедиций +6%'},
 {id:'rs12', t:90,n:'Квантовый разум',        ic:'1f30c', cost:300, req:'rs10',eff:{all:1.5,click:2},    d:'Весь доход ×1.5 и сила тапа ×2'},
 {id:'rs13', t:105,n:'Гравитонные связки',     ic:'1f9f2', cost:220, req:'rs11',eff:{mod:'ring',v:2},   d:'Кольцо обитания даёт ×2 кредитов'},
 {id:'rs14', t:120,n:'Гипермагистрали',        ic:'1f6e9', cost:320, req:'rs12',eff:{port:1.6,cd:0.12}, d:'Награды порта ×1.6, кулдауны экспедиций −12%'},
 {id:'rs15', t:150,n:'Живые купола',           ic:'1f331', cost:450, req:'rs13',eff:{mod:'habitat',v:2.5,all:1.15}, d:'Жилой купол ×2.5 и весь доход +15%'},
 {id:'rs16', t:180,n:'Сингулярный реактор',    ic:'1f300', cost:700, req:'rs14',eff:{mod:'gate',v:2.2,all:1.3}, d:'Звёздные врата ×2.2 и весь доход +30%'},
 {id:'rs17', t:180,n:'Вечная решётка',      ic:'231b',  cost:900, req:'rs16',et:1,eff:{all:1.6},              d:'Весь доход станции ×1,6 · только в Вечном режиме'},
 {id:'rs18', t:210,n:'Хроно-кузница',       ic:'2697',  cost:1400,req:'rs17',et:1,eff:{mod:'forge',v:3,sell:2},d:'Звёздная кузница ×3 и курс руды ×2'},
 {id:'rs19', t:240,n:'Ядро вечности',       ic:'1f300', cost:2200,req:'rs18',et:1,eff:{all:2,click:4},        d:'Весь доход ×2 и сила тапа ×4'},
 {id:'rs20', t:300,n:'Последняя теорема',   ic:'1f52c', cost:3500,req:'rs19',et:1,eff:{all:2.5,offline:2},    d:'Весь доход ×2,5 и оффлайн-доход ×2'}
];
/* вечные ярусы решётки: после «Последней теоремы» наука не заканчивается,
   а идёт бесконечной лесенкой — новый узел дешевле, чем следующий за ним шаг цепи */
var ET_RES_MAX=24;
(function(){
  var prev='rs20', ics=['1f9e0','2697','1f300','1f311','231b','1f52c','1f30c','1f3a0'];
  for(var i=1;i<=ET_RES_MAX;i++){
    var v=1.10+0.04*(i%5);
    RESEARCH.push({id:'rsx'+i,t:Math.min(420,180+20*i),n:'Вечная решётка · ярус '+i,ic:ics[i%ics.length],
      cost:Math.round(5200*Math.pow(1.75,i-1)),req:prev,et:1,eff:{all:v},
      d:'Весь доход станции \u00d7'+v.toFixed(2)+' \u00b7 вечный узел, доступен в Вечном режиме'});
    prev='rsx'+i;
  }
})();
function resHas(s,id){return !!(s.research&&s.research[id]);}
function resOwned(s){var n=0;RESEARCH.forEach(function(r){if(resHas(s,r.id))n++;});return n;}
function etScale(s){ var e=s.epochs||0; return 1+0.08*Math.min(8,e)+0.02*Math.max(0,Math.min(30,e)-8); }
function resEff(s,kind,tgt){
  var m=(kind==='luck'||kind==='tap'||kind==='cd')?0:1;
  var rs=s.research; if(!rs)return m;
  var k2=etScale(s);
  var B=resB(), list=(kind==='mod')?B.mod:(B[kind]||EFF_NONE);
  for(var i=0;i<list.length;i++){
    var r=list[i]; if(!rs[r.id])continue;
    var e=r.eff, v=e[kind];
    if(v===undefined||v===null)continue;
    if(kind==='mod'){ if(e.mod!==tgt)continue; v=e.v; }
    if(kind==='luck'||kind==='tap'||kind==='cd') m+= r.et? v*k2 : v;
    else m*= r.et? 1+(v-1)*k2 : v;
  }
  return m;
}
function resAvail(s,r){ return !!r && !resHas(s,r.id) && (!r.et||!!s.eternal) && (!r.req || resHas(s,r.req)); }
function resBase(s){ var n=0; RESEARCH.forEach(function(r){ if(!r.et&&resHas(s,r.id))n++; }); return n; }
function resEternal(s){ var n=0; RESEARCH.forEach(function(r){ if(r.et&&resHas(s,r.id))n++; }); return n; }
function resById(id){for(var i=0;i<RESEARCH.length;i++)if(RESEARCH[i].id===id)return RESEARCH[i];return null;}
/* сколько секунд лаборатория будет изучать ещё left узлов — с учётом копания антиматерии */
function resEta(s,left){
  if(left<=0)return 0;
  var am=s.resources.antimatter||0,rate=antiRate(s),t=0,cnt=0,done={},pass=0;
  /* идём по цепочке несколько проходов: только что спланированный узел открывает следующий */
  while(cnt<left&&pass<6){
    pass++; var moved=false;
    for(var i=0;i<RESEARCH.length&&cnt<left;i++){
      var r=RESEARCH[i];
      if(resHas(s,r.id)||done[r.id])continue;
      if(r.et&&!s.eternal)continue;
      if(r.req&&!resHas(s,r.req)&&!done[r.req])continue;
      var tt=timeToR(am,rate,r.cost); if(!isFinite(tt))return Infinity;
      t+=tt+(r.t||30)*60; am=Math.max(0,am-r.cost); done[r.id]=1; cnt++; moved=true;
    }
    if(!moved)break;
  }
  return cnt<left?Infinity:t;
}
/* фактический приток антиматерии: производство ядра + всё, что пришло наградами
   (сундуки, шаги цепи, прыжки, лавка). Без этого узлы науки, облики и уровни
   кораблей выглядели бы вечными «нужен рост производства», хотя антиматерия
   приходит станции и без ядра Варп-станции. */
function antiRate(s){
  var prod=+ratesCalm(s).antimatter||0;
  var play=Math.max(600,+s.stats.playSeconds||600);
  var hist=(+s.stats.antimatter||0)/play;
  var v=Math.max(prod,hist);
  /* Ядро Варп-станции ещё не построено: антиматерия всё равно приходит — с шагов цепи,
     вех уровня и наград дня. Оценка «одна ✦ за 20 минут» держит все сроки конечными. */
  return v>0?v:1/(20*60);
}
/* срок до collection-шага: лавка древностей + находки в экспедициях */
function artEta(s,left){
  if(left<=0)return 0;
  var play=Math.max(120,s.stats.playSeconds||120);
  /* артефакты приходят из лавки (раз в сутки), с сундуков, флагманов и дальних миссий;
     берём фактическую скорость находок, а если их ещё не было — оценку по числу экспедиций */
  var rfind=(s.stats.artifacts||0)/play;
  if(rfind<=0)rfind=((s.stats.totalExpeditions||0)/play)*0.05;
  if(rfind<=0)rfind=1/(ART_SHOP_CD/1000);
  var per=Math.min(ART_SHOP_CD/1000*0.8,Math.max(900,1/rfind));
  return left*per;
}
function resRunInfo(s,now){
  now=tnow(now); var r=s&&s.resRun;
  if(!r||!r.end||r.end<=now)return null;
  var cfg=resById(r.id); if(!cfg||resHas(s,r.id))return null;
  var total=Math.max(1,cfg.t*60000), left=Math.max(0,r.end-now);
  return {id:r.id,cfg:cfg,end:r.end,left:left,total:total,pct:Math.max(0,Math.min(100,(total-left)/total*100))};
}
function researchList(s){
  var run=resRunInfo(s);
  return RESEARCH.map(function(r){
    return {r:r, has:resHas(s,r.id), avail:resAvail(s,r),
            can:resAvail(s,r)&&(s.resources.antimatter||0)>=r.cost&&!run,
            run:!!(run&&run.id===r.id), runLeft:run?run.left:0};
  });
}
/* лаборатория держит в работе только один узел: сначала платишь антиматерию,
   потом ждёшь, пока лаборатория его разрабатывает (и в оффлайне время идёт) */
function buyResearch(s,id,now){
  now=tnow(now);
  var r=resById(id);
  if(!r)return{ok:false,msg:'Узел не найден'};
  if(resHas(s,id))return{ok:false,msg:'Уже изучено'};
  if(!resAvail(s,r))return{ok:false,msg:'Сначала изучи предыдущий узел'};
  if(!gateOpen(s,'lab'))return{ok:false,msg:'Лаборатория ещё не открыта'};
  if(resRunInfo(s,now))return{ok:false,msg:'Лаборатория занята: идёт «'+resRunInfo(s,now).cfg.n+'»'};
  if((s.resources.antimatter||0)<r.cost)return{ok:false,msg:'Нужно '+r.cost+' антиматерии'};
  s.resources.antimatter-=r.cost;
  s.resRun={id:id,end:now+Math.max(60000,(r.t||30)*60000)};
  logAdd(s,'\u{1f52c} Лаборатория взяла узел «'+r.n+'» ('+Math.round((r.t||30)/60*10)/10+' ч)','');
  return{ok:true,started:true,r:r,left:(r.t||30)*60000};
}
function cancelResearch(s,now){
  now=tnow(now);
  var run=resRunInfo(s,now); if(!run)return{ok:false,msg:'Лаборатория свободна'};
  s.resRun=null;
  var back=Math.max(1,Math.floor(run.cfg.cost*0.5));
  s.resources.antimatter=(s.resources.antimatter||0)+back;
  logAdd(s,'\u26a0 Исследование «'+run.cfg.n+'» остановлено, возвращено '+back+' антиматерии','bad');
  return{ok:true,back:back};
}
function resTick(s,now){
  now=tnow(now);
  var run=s.resRun; if(!run||!run.end||run.end>now)return null;
  var r=resById(run.id); s.resRun=null;
  if(!r||resHas(s,run.id))return null;
  if(!s.research)s.research={}; s.research[r.id]=1;
  s.stats.research=(s.stats.research||0)+1;
  logAdd(s,'\u2728 Узел изучен: '+r.n,'gold');
  return r;
}

/* ---- звёздный маршрут: цепочка успешных экспедиций ---- */
var ROUTE=[
 {need:3,  rw:function(s){return {credits:dqCred(s,600)};}},
 {need:6,  rw:function(s){return {minerals:dqMin(s,700),credits:dqCred(s,400)};}},
 {need:10, rw:function(s){return {antimatter:1+Math.floor(stationLevel(s)/15)};}},
 {need:15, rw:function(s){return {energy:dqEng(s,900),credits:dqCred(s,900)};}},
 {need:22, rw:function(s){return {antimatter:2+Math.floor(stationLevel(s)/10)};}}
];
function routeInit(s){ if(!s.route)s.route={n:0,stage:0,cycles:0}; return s.route; }
function routeState(s){
  var rt=routeInit(s), cfg=ROUTE[Math.min(rt.stage,ROUTE.length-1)];
  var mult=1+0.6*(rt.cycles||0), rw={};
  try{ var raw=cfg.rw(s); for(var k in raw)rw[k]=Math.max(1,Math.floor(raw[k]*mult)); }catch(e){rw={credits:1000};}
  return {n:rt.n,stage:rt.stage,need:cfg.need,claim:rt.n>=cfg.need,cycles:rt.cycles||0,
          left:ROUTE.length-rt.stage,rw:rw,mult:mult};
}
function routeClaim(s){
  var st=routeState(s);
  if(!gateOpen(s,'route'))return gateErr('route');
  if(!st.claim)return{ok:false,msg:'Маршрут ещё не пройден'};
  var rw=st.rw;
  for(var k in rw){var v=Math.max(1,rw[k]);s.resources[k]=(s.resources[k]||0)+v;
    if(k==='energy')s.stats.totalEnergy+=v; else if(k==='minerals')s.stats.totalMinerals+=v;
    else if(k==='credits')s.stats.totalCredits+=v;}
  s.stats.routes=(s.stats.routes||0)+1;
  var rt=routeInit(s);
  /* этап требует СВОИХ экспедиций: пока счётчик не сбрасывался, игрок с запасом
     походов мог забрать все пять этапов одним щелчком вместо лесенки из наград */
  rt.n=0; rt.stage++;
  var cyc=false;
  if(rt.stage>=ROUTE.length){rt.stage=0;rt.n=0;rt.cycles=(rt.cycles||0)+1;cyc=true;}
  return{ok:true,rw:rw,cycle:cyc,stage:rt.stage,next:ROUTE[Math.min(rt.stage,ROUTE.length-1)].need};
}

/* ---- пиратский флагман: редкое босс-событие в сцене ---- */
function bossHp(s){return 12+Math.min(26,Math.floor(stationLevel(s)*0.9));}
function bossReward(s){
  return {credits:Math.floor(dqCred(s,2200)),energy:Math.floor(dqEng(s,1500)),
          minerals:Math.floor(dqMin(s,900)),antimatter:1+Math.floor(stationLevel(s)/12)};
}

/* ---- охотник за кораблями: редкий рейд, который гарантированно абордирует ---- */
function hunterHp(s){return 14+Math.min(34,Math.floor(stationLevel(s)*1.2));}
function hunterReward(s){
  return {credits:Math.floor(dqCred(s,5200)),energy:Math.floor(dqEng(s,3600)),
          minerals:Math.floor(dqMin(s,2200)),antimatter:2+Math.floor(stationLevel(s)/10)};
}

/* ---- финал игры: Галактическое ядро + Вечный режим ---- */
var VICTORY={lvl:30,pre:5,art:15,res:12};
function victoryParts(s){
  return [
    {k:'lvl',n:'Уровень станции '+VICTORY.lvl,cur:stationLevel(s),need:VICTORY.lvl},
    {k:'art',n:'Собери все артефакты',cur:artOwned(s),need:Math.min(ART.length,VICTORY.art||ART.length)},
    {k:'res',n:'Изучи все узлы лаборатории',cur:resOwned(s),need:Math.min(RESEARCH.length,VICTORY.res||RESEARCH.length)},
    {k:'pre',n:'Соверши варп-прыжков',cur:s.prestigeCount,need:VICTORY.pre}
  ];
}
function victoryState(s){
  var p=victoryParts(s),done=true;
  p.forEach(function(x){ if(x.cur<x.need)done=false; });
  return {parts:p,done:done,won:!!s.victory,eternal:!!s.eternal,epochs:s.epochs||0};
}
function claimVictory(s){
  var v=victoryState(s);
  if(v.won)return{ok:false,msg:'Станция уже прошла финал'};
  if(!v.done)return{ok:false,msg:'Финал ещё не готов'};
  s.victory=1; s.eternal=1; s.epochs=0; s.stats.epochs=0;
  return{ok:true};
}
function eternalBonus(s){ var e=s.epochs||0;
  return s.eternal ? 1.25+0.05*Math.min(5,e)+0.015*Math.max(0,Math.min(25,e)-5) : 1; }
/* ---- лавка древностей: покупка артефакта за антиматерию ---- */
var ART_SHOP_CD=24*3600*1000;
function artifactShop(s,now){
  now=tnow(now);
  var owned=artOwned(s), left=ART.length-owned;
  return {cost:Math.round(6+owned*5), left:left, owned:owned,
          ready:left>0&&((s.artShopCd||0)<=now), leftMs:Math.max(0,(s.artShopCd||0)-now)};
}
function buyArtifact(s,now){
  now=tnow(now);
  if(!gateOpen(s,'col'))return{ok:false,msg:'Лавка древностей ещё не открыта'};
  var st=artifactShop(s,now);
  if(st.left<=0)return{ok:false,msg:'Все артефакты уже собраны'};
  if(!st.ready)return{ok:false,msg:'Торговец ещё не привёз товар'};
  if((s.resources.antimatter||0)<st.cost)return{ok:false,msg:'Нужно '+st.cost+' антиматерии'};
  var a=rollArtifact(s,2);
  if(!a)return{ok:false,msg:'Все артефакты уже собраны'};
  s.resources.antimatter-=st.cost;
  s.artShopCd=now+ART_SHOP_CD;
  s.stats.artBought=(s.stats.artBought||0)+1;
  return{ok:true,art:a,cost:st.cost};
}

/* ---- ежедневные награды ---- */
function dayKey(t){var d=new Date(t||Date.now());return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function dailyState(s,now){
  var k=dayKey(now);
  if(s.daily.day===k) return {ready:false,key:k,streak:s.daily.streak,next:Math.min(7,(s.daily.streak||0)+1)};
  var y=dayKey(Date.now()-86400000);
  var cont=(s.daily.day===y)?(s.daily.streak||0):0;
  var next=Math.min(7,cont+1);
  return {ready:true,key:k,streak:s.daily.streak,next:next};
}
/* награда дня масштабируется по станции: фиксированные числа из таблицы — это
   «множитель дня», а не приговор: на 30-м уровне день не должен быть бессмысленным */
function dailyReward(s,cfg){
  var rw={},k;
  for(k in cfg.rw){
    var v=cfg.rw[k];
    if(k==='credits')rw.credits=Math.max(v,Math.floor(dqCred(s,v/30)));
    else if(k==='energy')rw.energy=Math.max(v,Math.floor(dqEng(s,v/300)));
    else if(k==='minerals')rw.minerals=Math.max(v,Math.floor(dqMin(s,v/20)));
    else rw[k]=v;
  }
  return rw;
}
function claimDaily(s,now){
  var d=dailyState(s,now);
  if(!gateOpen(s,'daily'))return gateErr('daily');
  if(!d.ready)return{ok:false,msg:'Награда уже забрана',d:d};
  s.daily.day=d.key; s.daily.streak=d.next; s.stats.dailyClaims++;
  var cfg=DAILY[Math.min(DAILY.length-1,d.next-1)], rw=dailyReward(s,cfg);
  for(var k in rw){ s.resources[k]=(s.resources[k]||0)+rw[k];
    if(k==='energy')s.stats.totalEnergy+=rw[k]; else if(k==='minerals')s.stats.totalMinerals+=rw[k]; else if(k==='credits')s.stats.totalCredits+=rw[k]; }
  return{ok:true,cfg:cfg,rw:rw,streak:d.next};
}
/* ---- облики ---- */
function skinById(id){return SKINS.find(function(x){return x.id===id;})||SKINS[0];}
function buySkin(s,id){
  var sk=skinById(id);
  if(s.skins[id])return{ok:false,msg:'Уже открыт'};
  if(!gateOpen(s,'skins'))return{ok:false,msg:'Облики ещё не открыты'};
  if((s.resources.antimatter||0)<sk.cost)return{ok:false,msg:'Нужно '+sk.cost+' антиматерии'};
  s.resources.antimatter-=sk.cost; s.skins[id]=1; s.stats.skinsBought++;
  return{ok:true,skin:sk};
}
function setSkin(s,id){ if(!s.skins[id])return false; s.skin=id; return true; }

function totalModules(s){return MORDER.reduce(function(a,k){return a+(s.modules[k]||0);},0);}
/* Балл модуля для уровня станции: корпус верхнего тира — это не «ещё одна копия»,
   а реальная ступень уровня. Без весов темп уровня держался бы только на дешёвых
   копиях нижнего тира, и лесенка уровней разъезжалась бы с лесенкой открытий. */
var MPTS={solar:1,miner:1,reactor:2,hydro:2,shield:1,drone:1,laser:2,habitat:3,
          fusion:4,dyson:6,forge:6,fleet:7,station:7,ring:9,gate:12};
var LVLW=1;
function modPoints(s){var n=0;MORDER.forEach(function(k){n+=(s.modules[k]||0)*(LVLW?(MPTS[k]||1):1);});return n;}
/* уровень станции: чем выше станция, тем больше баллов стоит следующий уровень
   (6 баллов на уровне 1..10, дальше +1/3 балла за каждый уровень) */
function stationLevel(s){var m=modPoints(s);return Math.max(1,Math.floor((-36+Math.sqrt(1296+24*m))/2)+1);}
var TITLES=['Ремонтный док','Минимальная','Рабочая','Укреплённая','Форпост','Крепость','Орбитальная база','Оперативная группа','Секторный флот','Мегаструктура','Системный хаб','Звёздный порт','Космическая империя','Галактический узел','Титан','Легион','Экзархат','Сингулярность','Вечная станция','Абсолют','Кольцо миров','Владыка орбиты','Звёздный кузнец','Гиперкомплекс','Трон Галактики','Созвездие куполов','Империя света','Вечный регент','Сердце вселенной','Абсолют-2','Наследие звёзд','Вечная династия','Хранитель ядра','За гранью','Передний край','Бесконечность','Вершина бытия','Вершина бытия II','За пределами','Финал всех вещей','Ноль бесконечности','Эон','Вечный эон','Ткань мироздания','Последняя станция','Начало нового','За горизонтом','Вечное возвращение','Абсолют-3','Первопричина','Всё и ничто','Тишина сфер','Последний свет','Первый рассвет','Вечный круг','Неподвижный шар','Дыхание галактик','Колыбель миров','Плотность бытия','Вершина спирали','Конец и начало','Вечный странник','Сквозь эпохи','Тот, кто остался','Последний маяк','Свет над пустотой','Хранитель порога','Вечный архитектор','Зодчий вселенных','Творец орбит','Владыка врат','Станция у края всего','Абсолют-4','Последняя цифра','Ноль','Единство','Вне времени','Вне пространства','Чистый разум','Исток','Вершина','Предел','За пределом','Вечность','Вечность II','Вечность III','Абсолют финальный','Финал','Эпилог','Послесловие','Титры','После титров','За последней дверью','Сквозь последнюю дверь','Там, где кончаются карты','За краем карты','Последний горизонт','Где-то ещё','Начало другой игры','Другая игра','Новая станция','Новое начало','И снова первый киловатт'];
/* ---- цепь задач капитана: строгая линейка «сделай X — получи Y — открой Z» ---- */
var CHAIN=[
 {id:'ch1', tab:'modules', n:'Первый свет', ic:'2600', d:'Построй 3 солнечных паруса', cur:function(s){return s.modules.solar||0;}, need:3, rw:{energy:600}, nx:'астероидный майнер',
  st:'Станция молчала три года: пустые отсеки, холодный контур, только аварийные лампы. Первый парус развернулся — и в рубке снова загорелся свет. Капитан записал: «Начинаем с того, что умеем. Со света».',
  ls:{tab:'modules', t:'Как тут всё устроено', d:'Тапай по станции — каждый тап даёт энергию. Энергия — валюта стройки: открой вкладку «Модули» и построй «Солнечный парус». Он работает сам, даже когда ты закрыл игру.'}},
 {id:'ch2', tab:'modules', n:'Добыча началась', ic:'26cf', d:'Построй 2 астероидных майнера', cur:function(s){return s.modules.miner||0;}, need:2, rw:{minerals:400,credits:600}, nx:'термоядерный реактор и космическая биржа',
  st:'Майнеры подтянули к станции первый астероид и раздробили его в пыль. В трюме появилась руда — а значит, из чего-то можно строить.',
  ls:{tab:'modules', t:'Руду нужно продавать', d:'Руда сама по себе почти ничего не стоит. Открой «Экспедиции» → «Биржа руды» и продай груз в удачный момент: курс дышит, и на пике выходит заметно дороже.'}},
 {id:'ch3', tab:'explore', n:'Первый поход', ic:'1fa90', d:'Отправь первую экспедицию', cur:function(s){return s.stats.totalExpeditions||0;}, need:1, acc:1, rw:{credits:1500}, nx:'гидропонный отсек и автопилот дока',
  st:'Разведчик вернулся не с пустыми руками: на карте сектора появилась первая отмеченная планета. Станция больше не одна в темноте.',
  ls:{tab:'explore', t:'Экспедиции идут сами', d:'Отправь экспедицию — она идёт несколько минут без тебя. Вернётся с грузом и шансом находки. Слотов экспедиций становится больше с ростом уровня станции.'}},
 {id:'ch4', tab:'explore', n:'Груз для корабля', ic:'1f6a2', d:'Закрой первый контракт звёздного порта', cur:function(s){return s.stats.contractsDone||0;}, need:1, acc:1, rw:{credits:2500,chests:1,antimatter:1}, nx:'энергощит и репутация порта',
  st:'К станции пристыковался первый торговый корабль. Капитан торговцев оглядел док и сказал честно: «Груза нет — платить не за что». Через час контракт был закрыт.',
  ls:{tab:'explore', t:'Порт платит за груз', d:'В «Экспедициях» есть Звёздный порт: у корабля на стоянке есть заказ и срок. Собери нужный груз и сдай вовремя — просроченная сделка сгорает.'}},
 {id:'ch5', tab:'modules', n:'Станция крепнет', ic:'1f3f0', d:'Доведи станцию до 5 уровня', cur:function(s){return stationLevel(s);}, need:5, rw:{credits:4000,energy:9000,antimatter:2}, nx:'дрон-сканнер, второй слот экспедиций и лаборатория',
  st:'Пятый уровень. Стыковочный узел выдерживает два корабля одновременно, а в жилым отсеке впервые зазвучал разговор экипажа.',
  ls:{tab:'modules', t:'Уровень станции — это веха', d:'Уровень растёт, когда ты строишь модули. Каждый новый уровень открывает слоты экспедиций, верфь и новые модули. Смотри полоску прямо под названием станции.'}},
 {id:'ch6', tab:'sci', n:'Наука просыпается', ic:'1f52c', d:'Изучи первый узел лаборатории', cur:function(s){return resOwned(s);}, need:1, acc:1,alt:function(s){return !RESEARCH.some(function(r){return resAvail(s,r);});}, rw:{antimatter:2}, nx:'плазменный бур и цепочка исследований',
  st:'Лабораторный стол был законсервирован с самого запуска. Первый узел решётки загорелся — и станция впервые стала не просто стройкой, а исследованием.',
  ls:{tab:'more', sec:'sci', t:'Лаборатория за антиматерию', d:'Во «Ещё» → «Наука» стоят узлы решётки. Они стоят антиматерии и изучаются несколько минут. Каждый узел усиливает станцию навсегда — даже после варп-прыжка.'}},
 {id:'ch7', tab:'upgrades', n:'Рой дронов', ic:'1f916', d:'Купи улучшение «Серво-дрон»', cur:function(s){return s.upgrades['tap1']?1:0;}, need:1, rw:{credits:12000}, nx:'жилой купол',
  st:'Первый серво-дрон сел на корпус и принялся щёлкать контактами. Станция научилась работать без людей у пульта.',
  ls:{tab:'upgrades', t:'Улучшения — это множители', d:'Во «Улучшениях» покупают не станки, а множители: ×2 к тапу, ×2 к модулю, авто-торговец. Они покупаются один раз и действуют навсегда.'}},
 {id:'ch8', tab:'prog', n:'Первый варп-прыжок', ic:'1f680', d:'Соверши первый варп-прыжок', cur:function(s){return s.prestigeCount||0;}, need:1, acc:1, rw:{antimatter:3,chests:1}, nx:'синтезатор гелия-3 и антиматерия на полную',
  st:'Гипердвигатель качнулся раз — и станция оказалась в незнакомом секторе. Половина корпусов уцелела. Капитан записал: «Прыжок — не кнопка ускорения. Это цена».',
  ls:{tab:'more', sec:'prog', t:'Варп-прыжок — решение, не рефлекс', d:'Прыжок сбрасывает модули и резонанс, но даёт антиматерию: каждая ✦ даёт +12% ко всему доходу навсегда. Двигатель после прыжка остывает 15 минут — торопиться некуда.'}},
 {id:'ch9', tab:'explore', n:'Дальний горизонт', ic:'1f3fa', d:'Отправь ещё 4 экспедиции за один шаг', cur:function(s){return s.stats.totalExpeditions||0;}, need:4, acc:1, rw:{antimatter:4,chests:2}, nx:'сфера Дайсона, сундуки находок и артефакты',
  st:'Четыре похода за один отчёт. Капитан сколотил на доске четыре метки и подвёл черту: «Сектор перестал быть неизвестным. Он стал маршрутом».',
  ls:{tab:'explore', t:'Дальше — дольше и дороже', d:'Дальние миссии идут десятки минут, но дают артефакты и антиматерию. Ставь их на ночь: они доходят даже когда игра закрыта (до 8 часов).'}},
 {id:'ch10', tab:'fleet', n:'Свой корабль', ic:'1f6a2', d:'Спусти с верфи первый корабль', cur:function(s){return shipOwned(s);}, need:1, rw:{credits:5e6,chests:1}, nx:'Ядро Варп-станции',
  st:'Первый корпус ушёл со стапелей сам. До этого станция только принимала корабли — теперь у неё свой флот.',
  ls:{tab:'more', sec:'fleet', t:'Корабли остаются навсегда', d:'Верфь во «Ещё» → «Флот». Корабль даёт постоянный бонус и летает вокруг станции; в рейдах он прикрывает станцию. Варп-прыжок корабли не сжигает.'}},
 {id:'ch11', tab:'explore', n:'Караванная цепочка', ic:'1f69a', d:'Проведи караван из 3 контрактов целиком', cur:function(s){return s.stats.caravans||0;}, need:1, acc:1, rw:{antimatter:4,chests:1}, nx:'звёздная кузница',
  st:'Три контракта одним караваном: три корабля ушли одновременно и вернулись одновременно. Порт впервые назвал станцию «узлом», а не «стоянкой».',
  ls:{tab:'explore', t:'Караван — это три сделки сразу', d:'Иногда порт собирает караван из трёх связанных контрактов: награда выше, но если звено сорвётся — сорвётся весь караван. Следи за сроком в ленте «СКОРО».'}},
 {id:'ch12', tab:'explore', n:'Магистраль торговцев', ic:'1f3c6', d:'Закрой ещё 6 контрактов звёздного порта', cur:function(s){return s.stats.contractsDone||0;}, need:6, acc:1, rw:{antimatter:8,chests:2}, nx:'торговый флот',
  st:'Десятая сделка. Через док шёл уже постоянный поток, и диспетчер перестал успевать за всеми. Пришлось открыть второй пост.',
  ls:{tab:'explore', t:'Репутация порта решает', d:'Каждая сданная сделка растит ранг в порту: выше ранг — дороже контракты и чаще срочные чартеры (×4,5). Пропущенная сделка порт помнит.'}},
 {id:'ch13', tab:'modules', n:'Торговый флот', ic:'1f6a2', d:'Построй «Торговый флот»', cur:function(s){return s.modules.fleet||0;}, need:1, rw:{antimatter:10,chests:2}, nx:'кольцо обитания',
  st:'Торговый флот станции вышел первым рейсом. Станция перестала ждать покупателей — теперь она сама ездила к покупателям.',
  ls:{tab:'modules', t:'Высший тир — это надолго', d:'Модули высшего тира стоят очень дорого и дают огромный выпуск. Копить придётся минут двадцать — это нормально: следующие шаги цепи всегда дороже предыдущих.'}},
 {id:'ch14', tab:'modules', n:'Кольцо обитания', ic:'1f3a0', d:'Построй «Кольцо обитания»', cur:function(s){return s.modules.ring||0;}, need:1, rw:{antimatter:12,chests:2}, nx:'звёздные врата и финал первого акта',
  st:'В кольце загорелись окна. Настоящие окна — с занавесками. Станция впервые стала местом, где живут, а не только работают.',
  ls:{tab:'modules', t:'Дальше — врата', d:'«Звёздные врата» — последний модуль первого акта. Он откроется следующим шагом цепи и потребует уровня станции 38: не спеши, к этому времени всё уже будет построено.'}}
];
var ECHAIN=[
 {id:'ch15', tab:'modules', n:'Звёздные врата', ic:'1f6aa', d:'Построй «Звёздные врата»', cur:function(s){return s.modules.gate||0;}, need:1, rw:{antimatter:30,chests:3}, nx:'финал станции и Вечный режим',
  st:'Кольцо гиперперехода раскрутилось до рабочего числа. За ним была не пустота, а другой конец сектора. Капитан записал: «Акт первый окончен. Дальше — не стройка, а жизнь».',
  ls:{tab:'modules', t:'Акт второй: флот, наука, финал', d:'Дальше цепь просит не только строить: нужны все 6 кораблей, все артефакты, вся наука и варп-прыжки. Каждый шаг всё ещё ровно один: сделал — подождал отчёт — забрал.'}},
 {id:'ch16', tab:'explore', n:'Мастер порта', ic:'1f6a2', d:'Закрой ещё 8 контрактов звёздного порта', cur:function(s){return s.stats.contractsDone||0;}, need:8, acc:1, rw:{antimatter:10,chests:2}, nx:'улучшения гильдии перевозчиков и редкие сделки',
  st:'Порт вывесил на щите имя станции. Так здесь ещё не делали.',
  ls:{tab:'explore', t:'Порт — это постоянный доход', d:'Держи слоты порта забитыми: сделки приходят сами, а ты сдаёшь груз. Расширенный пирс даёт четвёртую стоянку.'}},
 {id:'ch17', tab:'fleet', n:'Флот в сборе', ic:'1f6a2', d:'Спусти с верфи все 6 кораблей', cur:function(s){return shipOwned(s);}, need:6, rw:{antimatter:14,chests:2}, nx:'уровни кораблей: каждый бонус можно качать антиматерией',
  st:'Шесть корпусов на орбите. Станция впервые выглядела со стороны как флот, а не как док.',
  ls:{tab:'more', sec:'fleet', t:'Качай уровень корабля', d:'У каждого корабля есть уровень за антиматерию: +15% к его бонусу за уровень, а на 3/6/10/15 уровнях корабль даёт флоту вечный перк.'}},
 {id:'ch18', tab:'fleet', n:'Сеты флота', ic:'1f6e9', d:'Собери все 3 бонус-сета флота', cur:function(s){return setCount(s);}, need:3, rw:{antimatter:18,chests:2}, nx:'перки флота за уровни кораблей',
  st:'Корабли встали в тройки и засветились связками: набор кораблей оказался сильнее, чем те же корабли поодиночке.',
  ls:{tab:'more', sec:'fleet', t:'Сеты — это двойной бонус', d:'Определённые тройки кораблей дают бонус-сет. Смотри раздел «Флот»: там подписано, какие корабли складываются в сет.'}},
 {id:'ch19', tab:'col', n:'Коллекция реликвий', ic:'1f3fa', d:'Найди ещё 5 артефактов древних', cur:function(s){return artOwned(s);}, need:5, acc:1,alt:function(s){return artOwned(s)>=ART.length;}, rw:{antimatter:20,chests:2}, nx:'лавка древностей и редкие артефакты',
  st:'В трюме снова лежали вещи, которым не было объяснения. Пятую капитан положил в витрину и перестал прятать: пусть висит.',
  ls:{tab:'more', sec:'col', t:'Артефакты не сгорают', d:'Артефакты падают в дальних миссиях и сундуках, а часть продаёт лавка древностей. Каждый даёт постоянный бонус и остаётся с тобой даже после варп-прыжка.'}},
 {id:'ch20', tab:'sci', n:'Вся наука станции', ic:'1f52c', d:'Изучи все 12 узлов лаборатории', cur:function(s){return resBase(s);}, need:12, rw:{antimatter:26,chests:3}, nx:'вечная наука после финала',
  st:'Решётка лаборатории замкнулась: последний узел загорелся в одном ряду с первым. Дальше наука кончаться не собиралась.',
  ls:{tab:'more', sec:'sci', t:'Наука — длинная лесенка', d:'Узлы связаны в цепочку: каждый открывает следующий. Ставь в работу сразу, как только хватает антиматерии — лаборатория варит узел минутами.'}},
 {id:'ch21', tab:'prog', n:'Ветеран варпа', ic:'1f680', d:'Соверши ещё 5 варп-прыжков', cur:function(s){return s.prestigeCount||0;}, need:5, acc:1, rw:{antimatter:30,chests:3}, nx:'порог прыжка растёт — копить придётся дольше',
  st:'Пятый прыжок был уже не страшным и совсем не быстрым. Капитан перестал считать их удачей и начал считать деньгами.',
  ls:{tab:'more', sec:'prog', t:'Порог прыжка растёт', d:'Каждый следующий прыжок стоит втрое больше добычи, чем прошлый. Прыгать «как только можно» — терять резонанс и отстраиваться заново.'}},
 {id:'ch22', tab:'prog', n:'Галактическое ядро', ic:'1f31f', d:'Пройди финал станции (Вечный режим)', cur:function(s){return s.victory?1:0;}, need:1, rw:{antimatter:40,chests:3}, nx:'эпохи, вечная наука и вечная цепь капитана',
  st:'Ядро приняло станцию целиком: уровень, флот, коллекцию, науку. Экран на секунду стал белым. Потом снова стал собой — и стал больше.',
  ls:{tab:'more', sec:'prog', t:'Финал — это дверь, не конец', d:'После финала открывается Вечный режим: +25% ко всему доходу, Эпохи и вечная цепь капитана. Игра не заканчивается — она переходит в длинный режим.'}},
 {id:'ch23', tab:'prog', n:'Первая вечная эпоха', ic:'231b', d:'Соверши варп-прыжок в Вечном режиме', cur:function(s){return s.epochs||0;}, need:1, acc:1, rw:{antimatter:45,chests:3}, nx:'множитель эпох и вечные узлы науки',
  st:'Первая Эпоха. Теперь прыжок ничего не отнимал сверх обычного — только добавлял множитель.',
  ls:{tab:'more', sec:'prog', t:'Эпохи дают множитель', d:'Каждая Эпоха — варп-прыжок в Вечном режиме. Множитель эпох растёт и применяется ко всему доходу.'}},
 {id:'ch24', tab:'sci', n:'Вечная решётка', ic:'1f9e0', d:'Изучи 2 вечных узла лаборатории', cur:function(s){return resEternal(s);}, need:2, rw:{antimatter:60,chests:3}, nx:'хроно-кузница и ядро вечности',
  st:'Лаборатория достроила то, чего не было в чертежах: вечные ярусы решётки, которых до финала просто не существовало.',
  ls:{tab:'more', sec:'sci', t:'Вечная наука бесконечна', d:'Вечные узлы стоят очень много антиматерии и дают крупные множители. Они идут один за другим без потолка.'}},
 {id:'ch25', tab:'prog', n:'Пятая эпоха', ic:'1f300', d:'Дойди ещё до 5-й вечной эпохи', cur:function(s){return s.epochs||0;}, need:5, acc:1, rw:{antimatter:90,chests:4}, nx:'дальше цепь не кончается: эпохи идут одна за другой',
  st:'Пятая Эпоха. Журнал кончился местом, а не точкой: дальше капитан писал уже на полях.',
  ls:{tab:'more', sec:'prog', t:'Цепь не кончается', d:'Дальше эпохи идут одна за другой: каждая — своя задача и своя награда. Темп тот же: медленно, по одному шагу.'}}
];
var EPOCH_KIND=[
 {k:'lvl'},{k:'port'},{k:'ships'},{k:'exp'},{k:'mis'},{k:'coll'},{k:'anti'},{k:'lvl2'},{k:'chest'}
];
/* текст задачи пишется из настоящей цели, а не из отдельной таблицы чисел:
   пока формулировка и счётчик жили раздельно, эпоха обещала «22 артефакта»,
   а требовала 15, и «доведи до 42 уровня» при цели в 19 */
var EPOCH_DESC={
 lvl:  function(s,t){return 'Подними уровень станции ещё на '+Math.max(1,t.need-t.cur);},
 lvl2: function(s,t){return 'Доведи станцию до уровня '+t.need;},
 port: function(s,t){return 'Закрой '+t.need+' контрактов звёздного порта';},
 ships:function(s,t){return 'Доведи суммарный уровень флота до '+t.need;},
 exp:  function(s,t){return 'Отправь '+t.need+' экспедиций';},
 mis:  function(s,t){return 'Пройди '+t.need+' дальних миссий (45+ мин)';},
 coll: function(s,t){return 'Собери '+t.need+' артефактов коллекции';},
 anti: function(s,t){return 'Накопи '+t.need+' антиматерии на счету';},
 chest:function(s,t){return 'Вскрой '+t.need+' сундуков находок';}
};
function epochDesc(k,s,t){ var f=EPOCH_DESC[k]; return f?f(s,t):('шаг эпохи: '+t.need); }
/* Цель по уровню станции подбирается по времени, а не по абсолютной цифре.
   «+35 уровня» на 120-м уровне станции — это стена на недели: цена уровня растёт
   квадратично (modsForLevel ~ L^2/6), и вечная цепь вставала. Эпоха обязана стоить
   25-45 минут спокойной стройки — ровно тот же коридор, что и остальная игра. */
var EPOCH_LVL_T=25*60, EPOCH_LVL_TAIL=2*60, EPOCH_LVL_MAX=45*60;
function epochLevelSec(kidx){ return Math.min(EPOCH_LVL_MAX,EPOCH_LVL_T+EPOCH_LVL_TAIL*Math.min(10,Math.max(0,kidx))); }
function levelDeltaForSec(s,sec){
  setCur(s);
  var L=stationLevel(s),d=1,guard=0;
  while(d<400&&guard++<12){ var t=levelEta(s,L+d);
    if(!(isFinite(t)&&t<sec))break; d*=2; }
  var lo=Math.max(1,Math.floor(d/2)),hi=d;
  for(var q=0;q<8;q++){ var mid=Math.floor((lo+hi)/2); if(mid<=lo)break;
    var tt=levelEta(s,L+mid); if(isFinite(tt)&&tt<sec)lo=mid; else hi=mid; }
  return Math.max(1,lo);
}
/* дешёвый счётчик цели эпохи: он нужен каждый кадр UI, а временная цель уровня
   (levelDeltaForSec — около 12 прогонов modsCost) считается только при выборе цели */
function epochCur(s,k){
  if(k==='lvl'||k==='lvl2')return stationLevel(s);
  if(k==='port')return s.stats.contractsDone||0;
  if(k==='ships')return shipLvSum(s);
  if(k==='exp')return s.stats.totalExpeditions||0;
  if(k==='mis')return s.stats.missionsDone||0;
  if(k==='coll')return artOwned(s);
  if(k==='anti')return Math.floor(s.resources.antimatter||0);
  if(k==='chest')return s.stats.chestsOpened||0;
  return 0;
}
function epochTarget(s,k,kidx){
  var cur=0,need=0;
  if(k==='lvl'){cur=epochCur(s,'lvl');need=cur+levelDeltaForSec(s,epochLevelSec(kidx));}
  if(k==='lvl2'){cur=epochCur(s,'lvl2');
    /* абсолютная планка «доведи до уровня N» берётся только пока она ближе временной;
       дальше цель тоже считается по времени, иначе вечная цепь упирается в стену */
    var abs=(34+8*kidx)-cur, dl=levelDeltaForSec(s,epochLevelSec(kidx));
    need=cur+Math.max(1,abs>0?Math.min(abs,dl):dl);}
  if(k==='port'){cur=s.stats.contractsDone||0;need=12+10*kidx;}
  if(k==='ships'){cur=shipLvSum(s);need=8+6*kidx;}
  if(k==='exp'){cur=s.stats.totalExpeditions||0;need=25+15*kidx;}
  if(k==='mis'){cur=s.stats.missionsDone||0;need=3+2*kidx;}
  if(k==='coll'){cur=artOwned(s);need=Math.min(ART.length,10+6*kidx);}
  if(k==='anti'){cur=Math.floor(s.resources.antimatter||0);need=60+40*kidx;}
  if(k==='chest'){cur=s.stats.chestsOpened||0;need=20+15*kidx;}
  return {cur:cur,need:need};
}
function chainEpoch(s,j){
  var k=j+1,r=rates(s),off=j%EPOCH_KIND.length,g=null,tg=null,fallback=null,plan=s.chainPlan,frozen=!!(plan&&plan.i===j&&plan.k);
  /* цель эпохи заморожена: игрок должен видеть ту же задачу, пока не заберёт награду,
     иначе «подними уровень ещё на N» уезжает вперёд быстрее, чем игрок успевает догнать */
  if(frozen){
    /* цель заморожена: считаем только текущий счётчик, а не всю временную цель */
    g={k:plan.k}; tg={cur:epochCur(s,plan.k),need:plan.need};
  } else {
    /* эпоха обязана быть задачей, а не формальностью: берём первый тип,
       цель которого по-настоящему не закрыта (иначе шаг выполнялся бы «на 0 секунд») */
    for(var q=0;q<EPOCH_KIND.length;q++){
      var cand=EPOCH_KIND[(off+q)%EPOCH_KIND.length],t=epochTarget(s,cand.k,k);
      if(!fallback||t.need-t.cur>fallback.need-fallback.cur)fallback={g:cand,t:t};
      if(t.need>t.cur&&t.need-t.cur>=Math.max(1,Math.round(t.need*0.05))){g=cand;tg=t;break;}
    }
    if(!g){g=fallback.g;tg=fallback.t;}
    s.chainPlan={i:j,k:g.k,need:tg.need,d:epochDesc(g.k,s,tg)};
    plan=s.chainPlan;
  }
  var cur=tg.cur,need=frozen?plan.need:Math.max(plan.need,cur+1);
  var TK={lvl:'modules',lvl2:'modules',port:'explore',ships:'fleet',exp:'explore',mis:'explore',coll:'col',anti:'prog',chest:'explore'};
  var ST=['Журнал кончился местом — капитан дописывал на полях и не собирался останавливаться.',
          'Эпоха №'+k+'. Станция перестала быть постройкой и стала средой обитания.',
          'Капитан перестал считать уровни и начал считать годы: столько станция продержалась без единой аварии.',
          'Вечность оказалась не длиной, а глубиной: каждый шаг теперь стоил дороже прошлого.',
          'Дальше карты кончались. Капитан рисовал их сам, по одному шагу цепи за раз.'];
  var LS={lvl:{t:'Уровень — это сумма модулей',d:'Уровень станции растёт, когда ты строишь модули. Никаких отдельных кнопок «прокачать уровень»: есть только очередь модулей и очередь шагов цепи.'},
          port:{t:'Порт кормит станцию',d:'Держи слоты порта забитыми: это самый ровный источник кредитов и антиматерии в вечном режиме.'},
          ships:{t:'Флот качают антиматерией',d:'Уровни кораблей дают вечные перки флота: они не сгорают ни при каком прыжке.'},
          exp:{t:'Экспедиции идут сами',d:'Дальние миссии идут часами и возвращаются, даже когда игра закрыта. Это способ расти ночью.'},
          mis:{t:'Дальние миссии — это терпение',d:'Миссии на 45+ минут дают артефакты. Ставь их перед сном, а не в момент, когда ждёшь отчёт.'},
          coll:{t:'Коллекция не сгорает',d:'Артефакты — единственное, что переживает любой прыжок целиком. Каждый даёт постоянный бонус.'},
          anti:{t:'Антиматерия — длинная валюта',d:'Антиматерия копится ядром Варп-станции и прыжками. Она покупает науку, корабли и облики — то, что остаётся навсегда.'},
          chest:{t:'Сундки приходят сами',d:'Сундуки находок падают в экспедициях и за вехи. Открывай их сразу: внутри буст и шанс артефакта.'}};
  return {id:'chp'+k,n:'Эпоха капитана №'+k,ic:'1f30c',tab:TK[g.k]||'prog',d:plan.d,st:ST[k%ST.length],ls:LS[g.k]||{t:'Один шаг за раз',d:'Цепь капитана — единственная цель, которая действительно ведёт вперёд. Делай ровно то, что написано в шаге.'},cur:function(s){return epochCur(s,g.k);},need:need,
    rw:{credits:Math.floor(120*(r.credits||0)+2000),energy:Math.floor(120*(r.energy||0)+2000),antimatter:4+2*k,chests:2},
    nx:'следующая эпоха: ещё один шаг вечной цепи',kind:g.k,epoch:k};
}
function chainCfg(s,i){
  if(i<CHAIN.length)return CHAIN[i];
  var j=i-CHAIN.length;
  if(j<ECHAIN.length)return ECHAIN[j];
  return chainEpoch(s,j-ECHAIN.length);
}
function chainLen(){return CHAIN.length+ECHAIN.length;}
var CHAIN_ACTS=[{from:0,to:14,n:'Акт I \u00b7 Станция',d:'почти всё заперто: один новый модуль за один шаг цепи'},
                {from:14,to:25,n:'Акт II \u00b7 Флот, наука и финал',d:'врата, верфь, коллекция, Галактическое ядро'},
                {from:25,to:1e9,n:'Акт III \u00b7 Вечность',d:'эпохи идут одна за другой, цепь не кончается'}];
function chainAct(i){ var a=null; CHAIN_ACTS.forEach(function(x){ if(i>=x.from&&i<x.to)a=x; }); return a||CHAIN_ACTS[CHAIN_ACTS.length-1]; }
/* счётчики шагов замораживаются: «10 экспедиций» обязано значить «10 экспедиций
   с того момента, как шаг начался», иначе к моменту награды игрок уже всё сделал
   и половина лестницы открывается одним щелчком. */
function chainBase(s,c){
  if(!s.chainBase)s.chainBase={};
  var b=s.chainBase[c.id];
  if(!b||typeof b!=='object')b=s.chainBase[c.id]={v:0,t:Date.now(),set:0};
  if(!b.set){ try{ b.v=c.acc?c.cur(s):0; }catch(e){ b.v=0; } b.set=1; b.t=Date.now(); }
  return b;
}
/* Отчёт капитана обрабатывается не мгновенно: у каждого шага есть минимальный срок,
   с того момента как шаг стал текущим. Это держит лесенку ровной: ни один шаг
   не «догоняется» пачкой, и внизу экрана почти всегда есть живой таймер награды. */
function chainDwell(i){ return Math.min(9*60000,2*60000+30000*(i||0)); }
function chainState(s){
  var i=(s.chain||0), c=chainCfg(s,i), cur=0;
  try{cur=c.cur(s)-chainBase(s,c).v;}catch(e){cur=0;}
  cur=Math.max(0,Math.floor(cur||0));
  var alt=false; try{ alt=!!(c.alt&&c.alt(s)); }catch(e){alt=false;}
  var endless=i>=chainLen();
  var b0=chainBase(s,c), dwell=chainDwell(i),
      wait=Math.max(0,b0.t+dwell-(Date.now()));
  var work=(cur>=c.need)||alt;
  var halfAt=chainHalfAt(c), halfGot=!!(s.chainHalf&&s.chainHalf[c.id]);
  return {i:i,cfg:c,cur:cur,need:c.need,done:false,endless:endless,ready:work&&wait<=0,
          work:work,wait:wait,dwell:dwell,startedAt:b0.t,
          half:{at:halfAt,need:c.need,got:halfGot,on:(c.need||1)>=3&&cur>=halfAt},
          pct:Math.max(0,Math.min(100,(alt?c.need:cur)/c.need*100)),
          left:endless?Infinity:(chainLen()-(s.chain||0))};
}
function chainClaim(s,now){
  var st=chainState(s);
  if(!st.ready)return {ok:false,wait:st.wait||0,
    msg:st.work?('Отчёт ещё обрабатывается: '+fmtTimeMs(st.wait||0))
                :(st.done?'Цепь капитана уже пройдена':'Шаг ещё не выполнен')};
  var c=st.cfg, rw=c.rw, k;
  for(k in rw){
    var v=Math.max(1,Math.floor(rw[k]));
    if(k==='chests'){ for(var q=0;q<v;q++)pushChest(s,1); continue; }
    s.resources[k]=(s.resources[k]||0)+v;
    if(k==='energy')s.stats.totalEnergy+=v; else if(k==='minerals')s.stats.totalMinerals+=v;
    else if(k==='credits')s.stats.totalCredits+=v; else if(k==='antimatter')s.stats.antimatter=(s.stats.antimatter||0)+v;
  }
  s.chain=(s.chain||0)+1;
  if(s.chainPlan&&s.chainPlan.i!==s.chain-CHAIN.length-ECHAIN.length)s.chainPlan=null;
  s.stats.chainDone=(s.stats.chainDone||0)+1;
  logAdd(s,'🎖 Цепь капитана: '+c.n+' · '+chainRwTxt(rw),'gold');
  var nx=chainCfg(s,s.chain);
  return {ok:true,cfg:c,rw:rw,next:nx,i:s.chain-1,all:false};
}
function chainRwTxt(rw){
  var o=[];for(var k in rw){
    if(k==='chests'){o.push('+'+rw[k]+' сундук');continue;}
    if(k==='antimatter'){o.push('+'+rw[k]+' антиматерии');continue;}
    o.push('+'+fmt(rw[k])+' '+(RES_META[k]?RES_META[k].name.toLowerCase():k));
  }
  return o.join(', ');
}
/* ---- награда за каждый новый уровень станции ---- */
function levelUpReward(s,from,to,now){
  now=tnow(now);
  var rw={credits:0,energy:0,antimatter:0,chests:0}, r=rates(s), i;
  /* уровень — это веха, а не зарплата: ~4 секунды добычи. Основной доход дают модули,
     антиматерия и сундук — только на круглых вехах (каждые 5/10 уровней), их надо дождаться. */
  for(i=from+1;i<=to;i++){
    rw.credits+=Math.floor(Math.max(120,(r.credits||0)*4)+Math.pow(1.04,i)*10);
    rw.energy+=Math.floor(Math.max(160,(r.energy||0)*4)+Math.pow(1.04,i)*12);
    if(i%10===0)rw.antimatter+=1+Math.floor(i/25);
    if(i%10===0)rw.chests+=1;
  }
  for(var k in rw){
    var v=Math.floor(rw[k]); if(!v)continue;
    if(k==='chests'){ for(var q=0;q<v;q++)pushChest(s,1); continue; }
    s.resources[k]=(s.resources[k]||0)+v;
    if(k==='energy')s.stats.totalEnergy+=v; else if(k==='minerals')s.stats.totalMinerals+=v;
    else if(k==='credits')s.stats.totalCredits+=v; else if(k==='antimatter')s.stats.antimatter=(s.stats.antimatter||0)+v;
  }
  s.stats.levels=(s.stats.levels||0)+(to-from);
  return {from:from,to:to,rw:rw};
}
/* что открывается на следующем уровне станции */
function levelUnlockText(L){
  var out=[],i;
  for(i=0;i<EXP_SLOTS.length;i++) if(EXP_SLOTS[i].lvl===L) out.push('ещё '+EXP_SLOTS[i].n+'-й слот экспедиций');
  for(i=0;i<SHIPS.length;i++) if(SHIP_LV[i]===L)
    out.push('верфь: «'+SHIPS[i].n+'»'+(SHIP_CHAIN[i]?(' (нужен ещё и шаг цепи '+SHIP_CHAIN[i]+')'):''));
  for(i=0;i<MORDER.length;i++){ var mm=MODULES[MORDER[i]];
    if(mm.unlock&&mm.unlock.lv===L)
      out.push('модуль «'+mm.name+'»'+(mm.unlock.chain?(' (нужен ещё и шаг цепи '+mm.unlock.chain+')'):'')); }
  if(L===2)out.push('вторая вкладка «Улучшения» и космическая биржа (порт — на шаге цепи 3)');
  if(L===3)out.push('редкие контракты порта');
  if(L%10===0)out.push('антиматерия за веху уровня');
  if(L%10===0)out.push('сундук находок за веху уровня');
  if(L===10)out.push('новая глава фона и награда «Мегаструктура»');
  if(L===20)out.push('награда «Галактический узел»');
  if(!out.length){
    var nx='';
    for(i=0;i<EXP_SLOTS.length;i++) if(EXP_SLOTS[i].lvl>L){ nx='слот экспедиций №'+EXP_SLOTS[i].n+' на ур. '+EXP_SLOTS[i].lvl; break; }
    for(i=0;i<SHIPS.length;i++) if(SHIP_LV[i]>L){ nx+=(nx?' · ':'')+'верфь «'+SHIPS[i].n+'» на ур. '+SHIP_LV[i]; break; }
    if(nx)out.push(nx);
  }
  return out.join(', ');
}

/* ---- «копим на»: одна конкретная стройка, которой игрок ждёт ----
   Лесенка и «СКОРО» показывали самую дешёвую копию модуля: к третьему часу это
   3 секунды, то есть горизонт, которого не чувствуешь. Цель-накопление всегда
   стоит от 2,5 до 25 минут спокойного дохода: её реально ждёшь, и она всегда одна. */
var GOAL_MIN=150, GOAL_MAX=1500;
/* модуль, который просит текущий шаг цепи: его и копим в первую очередь */
function chainBuildKey(s){
  var c=chainCfg(s,s.chain||0)||{}, id=String(c.id||'');
  if(id==='ch1')return 'solar'; if(id==='ch2')return 'miner';
  if(id==='ch13')return 'fleet'; if(id==='ch14')return 'ring'; if(id==='ch15')return 'gate';
  return null;
}
function goalBuild(s,now){
  setCur(s); now=tnow(now);
  /* доход для срока берём тот же, что и в ценнике (payIncome): иначе «сколько ждать
     до цели» считается по одной линейке дохода, а цена — по другой */
  var rc=ratesCalm(s),want=chainBuildKey(s),pre=null,cands=[],i,k,q;
  if(want){
    if(modUnlocked(MODULES[want],s))cands.push(want);
    else{
      /* модуль для шага цепи ещё заперт: цель — добить его замок,
         иначе «копим на» показывает в сторону, а лесенка стоит на месте */
      var uw=MODULES[want].unlock||{};
      if(uw.mod&&(s.modules[uw.mod]||0)<(uw.v||0))pre=uw.mod;
      if(pre)cands.push(pre);
    }
  }
  for(i=MORDER.length-1;i>=0;i--){ k=MORDER[i];
    if(modUnlocked(MODULES[k],s)&&cands.indexOf(k)<0)cands.push(k); }
  var best=null;
  for(i=0;i<cands.length;i++){
    k=cands[i]; var m=MODULES[k],l=s.modules[k]||0,pr=payRes(m),
        have=s.resources[pr]||0,rate=rc[pr]||0;
    /* на первых секундах станция ещё не производит: доход считаем по тапам,
       игрок тапает с первой секунды, и цель у него должна быть сразу */
    if(!(rate>0)&&pr==='energy')rate=Math.max(1,clickPower(s));
    if(!(rate>0))continue;
    rate=payIncome(s,pr,now)||rate;
    var n=1,c=costFor(m,l,s,now),t=(c-have)/rate;
    if(t>0&&t<GOAL_MIN){
      /* копия почти готова: копим пакет, но так, чтобы цель не вылезала за
       GOAL_MAX — иначе «целью» становится абсурд на полдня */
      for(q=0;q<40;q++){
        var c2=bulkCost(m,l,n+1,s,now),t2=(c2-have)/rate;
        if(t2>GOAL_MAX)break;
        n++; c=c2; t=t2;
        if(t>=GOAL_MIN)break;
      }
    }
    if(t<=0){
      /* хватает прямо сейчас: всё равно ищем пакет копий, который влезает в полосу
       2,5–25 минут, — иначе цель выродилась бы в «купи сейчас и всё» */
      var found=null;
      for(q=1;q<40;q++){
        var c3=bulkCost(m,l,q,s,now),t3=(c3-have)/rate;
        if(t3>GOAL_MAX)break;
        if(t3>=GOAL_MIN){found={n:q,c:c3,t:t3};break;}
      }
      if(found){n=found.n;c=found.c;t=found.t;}else{t=0;}
    }
    var band=(t>=GOAL_MIN&&t<=GOAL_MAX)?0:1, ready=(t<=0)?1:0;
    var isw=(k===want||k===pre)?1:0;
    var score=band*1e6+ready*1e5+Math.abs(t-600)-(isw?9000:0);
    /* ВАЖНО: score обязан попадать в объект. Без него best.score === undefined,
       «score < undefined» всегда false, и цель-накопление навсегда оставалась
       ПЕРВЫМ кандидатом (то есть самым дорогим открытым модулем), а не той копией,
       которая реально стоит 2,5-25 минут. Весь коридор темпа ломался молча. */
    if(!best||score<best.score)best={key:k,from:l,to:l+n,n:n,cost:c,have:have,res:pr,
      need:Math.max(0,c-have),eta:t,chain:isw,pre:(k===pre?1:0),ready:ready,score:score};
  }
  if(!best)return null;
  /* Цель-накопление обязана быть неподвижной, пока её ждут. Без этого карточка
     «копим на N копий» раздувается на глазах: копия дорожает вместе с доходом, пакет
     пересобирается в полосу 2,5-25 минут, и игрок догоняет горизонт вместо того,
     чтобы дождаться. Держим состав пакета (модуль, стартовый уровень, число копий),
     а цену и срок пересчитываем честно по текущим ценам. */
  var gp=s.goalPlan;
  if(gp&&gp.key===best.key&&gp.from===best.from&&+gp.n>=1){
    var gm=MODULES[best.key],gl=gp.from,gn=Math.max(1,+gp.n||1),gpr=payRes(gm),
        gc=bulkCost(gm,gl,gn,s,now),gh=s.resources[gpr]||0,grate=payIncome(s,gpr,now)||0,
        gt=grate>0?(gc-gh)/grate:Infinity;
    if(gt<=GOAL_MAX){
      best.n=gn; best.to=gl+gn; best.cost=gc; best.have=gh; best.res=gpr;
      best.need=Math.max(0,gc-gh); best.eta=Math.max(0,gt); best.ready=gt<=0; best.sticky=1;
    } else { s.goalPlan={key:best.key,from:best.from,n:best.n,at:now}; }
  } else { s.goalPlan={key:best.key,from:best.from,n:best.n,at:now}; }
  var m2=MODULES[best.key],nx=nextUnlockLevel(s);
  var utxt=nx?('уровень станции '+nx.lvl+' \u00b7 '+nx.txt):'резонанс станции и выпуск';
  if(best.pre&&want)utxt='замок «'+MODULES[want].name+'»: шаг цепи капитана';
  return {key:best.key,name:m2.name,ic:m2.ic,from:best.from,to:best.to,n:best.n,res:best.res,
    have:best.have,cost:best.cost,need:best.need,eta:best.eta,chain:best.chain,pre:best.pre,
    ready:!!best.ready,
    gain:'+'+fmt(m2.rate*best.n)+' '+RES_META[m2.res].g+'/сек',
    unlock:utxt};
}
/* ---- лесенка: что откроется следующим и сколько этого ждать ---- */
function G_dailyReady(s,now){ try{return dailyState(s,now).ready;}catch(e){return false;} }
function ladder(s,now,full){
  setCur(s); now=tnow(now);
  var out=[],r=rates(s),L=stationLevel(s),i,k;
  /* цепь капитана: самый близкий шаг */
  var ch=chainState(s);
  if(!ch.done){
    var cheta=chainEta(s,ch);
    out.push({ic:ch.cfg.ic,n:'Цепь капитана: '+ch.cfg.n,kind:'Цепь',req:ch.cfg.d,cur:ch.cur,need:ch.need,eta:cheta,
      rw:chainRwTxt(ch.cfg.rw)+(ch.cfg.nx?(' · открывает: '+ch.cfg.nx):''),tab:'more',sec:'prog'});
  }
  /* следующий замок интерфейса: игрок обязан видеть, что появится в следующий раз */
  var ng=nextGate(s);
  if(ng)out.push({ic:'1f30c',n:'Замок: '+gateName(ng.key),kind:'Замок',req:ng.req,cur:ng.cur,need:Math.max(ng.need,ng.cur+1),
    eta:ng.eta,rw:'станция получит новый раздел и новую цель',tab:gateTab(ng.key),sec:gateSec(ng.key)});
  /* следующий модуль */
  for(i=0;i<MORDER.length;i++){
    var m=MODULES[MORDER[i]];
    if(modUnlocked(m,s))continue;
    var g=modGate(s,m);
    out.push({ic:m.ic,n:m.name,kind:'Модуль',req:g.req,cur:g.cur,need:g.need,eta:g.eta,
      rw:m.res==='antimatter'?('+'+m.rate+' антиматерии/сек'):('+'+fmt(m.rate)+' '+RES_META[m.res].name.toLowerCase()+'/сек'),tab:'modules'});
    break;
  }
  /* монтаж крупного модуля: большой скачок силы, которого ждут минутами */
  installList(s,now).forEach(function(it){
    out.push({ic:MODULES[it.key].ic,n:MODULES[it.key].name+' \u00b7 монтаж',kind:'Монтаж',must:1,
      req:'корпус собирают по частям',cur:Math.round(it.pct),need:100,eta:it.left/1000,
      rw:'выпуск вырастет до +'+fmt(MODULES[it.key].rate)+' '+RES_META[MODULES[it.key].res].name.toLowerCase()+'/сек',
      tab:'modules'}); });
  /* ближайшая стройка: самая дешёвая копия, которую ещё нельзя купить. Это самый
     частый горизонт: он обязан быть ближе пяти минут, иначе лесенка пустеет */
  var rc=ratesCalm(s),nb=null;
  MORDER.forEach(function(k){ var m=MODULES[k]; if(!modUnlocked(m,s))return;
    var l=s.modules[k]||0,c=costFor(m,l,s),pr=payRes(m),have=s.resources[pr]||0;
    if(have>=c)return;
    var r=payIncome(s,pr,now);
    var t=r>0?(c-have)/r:Infinity;
    if(!nb||t<nb.eta)nb={ic:m.ic,n:m.name+' \u00b7 ур. '+(l+1),kind:'Стройка',
      req:'ещё '+fmt(c-have)+' '+RES_META[pr].g,cur:have,need:c,eta:t,
      rw:'+'+fmt(m.rate)+' '+RES_META[m.res].name.toLowerCase()+'/сек',tab:'modules'}; });
  if(nb)out.push(nb);
  /* «копим на»: одна конкретная стройка на 2,5–25 минут — её и ждут */
  var gb=goalBuild(s,now);
  if(gb)out.push({ic:gb.ic,n:'Копим на: '+gb.name+' ур. '+(gb.from+1)+(gb.n>1?('\u2026'+gb.to):''),kind:'Заказ',
    req:'ещё '+fmt(gb.need)+' '+RES_META[gb.res].g+' \u00b7 '+pl(gb.n,'копию','копии','копий'),
    cur:gb.have,need:gb.cost,eta:gb.eta,
    rw:gb.gain+(gb.unlock?(' \u00b7 откроет: '+gb.unlock):''),tab:'modules',goal:1});
  /* ближайшая веха модуля: самая частая ступенька прогресса */
  var bm=null;
  MORDER.forEach(function(k){ var l=s.modules[k]||0; if(!l)return; var nx=mileNext(l); if(!nx.at)return;
    var t=costTime(s,(function(){var o={};o[payRes(MODULES[k])]=bulkCost(MODULES[k],l,nx.left,s);return o;})());
    if(!bm||t<bm.eta)bm={ic:MODULES[k].ic,n:MODULES[k].name+' · веха ур. '+nx.at,kind:'Веха',
      req:'построй ещё '+pl(nx.left,'модуль','модуля','модулей')+' «'+MODULES[k].name+'»',
      cur:l,need:nx.at,eta:t,rw:'выпуск модуля \u00d7'+Math.pow(1+MILE_B,nx.i+1).toFixed(2),tab:'modules'}; });
  if(bm)out.push(bm);
  /* следующее улучшение: самое дешёвое из доступных, либо ближайшее по требованию */
  var av=[],lat=null;
  UPGRADES.forEach(function(u){
    if(s.upgrades[u.id])return;
    if(u.req(s)){ var t=costTime(s,u.cost); if(!lat||t<lat.eta)lat={ic:u.ic,n:u.name,kind:'Улучшение',
      req:'купить за '+Object.keys(u.cost).map(function(kk){return fmt(u.cost[kk])+' '+RES_META[kk].g;}).join(' + '),
      cur:0,need:1,eta:t,rw:upText(u),tab:'upgrades'}; }
    else if(!av.length)av.push(u);
  });
  if(lat)out.push(lat);
  /* следующий уровень станции, который что-то открывает */
  var nuL=nextUnlockLevel(s), eL=levelEta(s,nuL.lvl);
  if(isFinite(eL))out.push({ic:nuL.ic,n:'Уровень станции '+nuL.lvl,kind:'Уровень',
    req:'построй ещё '+pl(modCopiesFor(s,nuL.lvl),'модуль','модуля','модулей'),
    cur:L,need:nuL.lvl,eta:eL,rw:'откроет: '+nuL.txt,tab:'modules'});
  /* следующая экспедиция */
  for(i=0;i<EXPLORE.length;i++){ var g=expGate(s,i);
    if(!g.ok){ out.push({ic:EXPLORE[i].ic,n:EXPLORE[i].n,kind:'Экспедиция',
      req:'отправить ещё '+pl(g.need-g.cur,'экспедицию','экспедиции','экспедиций'),cur:g.cur,need:g.need,eta:expGateEta(s,i),
      rw:'новая длинная миссия на '+EXPLORE[i].dur+' мин',tab:'explore'}); break; } }
  /* следующий узел лаборатории */
  var rl=RESEARCH.filter(function(x){return !resHas(s,x.id);});
  for(i=0;i<rl.length;i++){ var rr=rl[i];
    if(!resAvail(s,rr))continue;
    var eta2=timeToR(s.resources.antimatter||0,antiRate(s),rr.cost)+(rr.t||30)*60;
    out.push({ic:rr.ic,n:rr.n,kind:'Наука',req:'нужно '+rr.cost+' антиматерии + '+durTxt((rr.t||30)*60)+' работы лаборатории',
      cur:s.resources.antimatter||0,need:rr.cost,eta:eta2,rw:rr.d,tab:'more',sec:'sci'});
    break; }
  /* следующий корабль верфи */
  for(i=0;i<SHIPS.length;i++){ var sh=SHIPS[i];
    if(s.ships&&s.ships[sh.id])continue;
    var lv=SHIP_LV[i],okPrev=shipOwned(s)>=i,chq=SHIP_CHAIN[i]||0;
    var e1=costTime(s,sh.cost||{credits:1}),e2=levelEta(s,lv),
        e3=(chq>(s.chain||0))?chainStepEta(s,chq):0;
    var etamax=Math.max(e1,isFinite(e2)?e2:0,e3);
    if(!okPrev){ var psh=SHIPS[i-1];
      var ePrev=Math.max(levelEta(s,lv),costTime(s,psh.cost||{credits:1}));
      out.push({ic:'1f6a2',n:sh.n,kind:'Верфь',
      req:'сначала спустить «'+psh.n+'» и достичь ур. станции '+lv,cur:shipOwned(s),need:i+1,
      eta:ePrev,rw:shipText(sh),tab:'more',sec:'fleet'}); break; }
    var pr=[]; if(lv>0)pr.push('уровень станции '+lv);
    if(chq>(s.chain||0))pr.push('шаг цепи '+chq);
    if(sh.cost.credits)pr.push(fmt(sh.cost.credits)+' кредитов');
    if(sh.cost.minerals)pr.push(fmt(sh.cost.minerals)+' руды');
    if(sh.cost.energy)pr.push(fmt(sh.cost.energy)+' энергии');
    if(sh.cost.antimatter)pr.push(sh.cost.antimatter+' антиматерии');
    out.push({ic:'1f6a2',n:sh.n,kind:'Верфь',req:pr.join(' + ')||'спустить с верфи бесплатно',
      cur:Math.max(L,1),need:Math.max(lv,1),eta:etamax,rw:shipText(sh),tab:'more',sec:'fleet'});
    break; }
  /* следующий уровень уже стоящего на службе корабля — вечная короткая цель */
  var nxs=null;
  SHIPS.forEach(function(b){ var l=shipLv(s,b.id); if(!l)return;
    var cc=shipUpCost(s,b.id), t=timeToR(s.resources.antimatter||0,antiRate(s),cc);
    if(!nxs||t<nxs.eta)nxs={ic:'1f6a2',n:b.n+' · ур. '+l+' → '+(l+1),kind:'Флот',
      req:cc+' антиматерии',cur:Math.floor(s.resources.antimatter||0),need:cc,eta:t,
      rw:shipLvText(s,b.id,l+1),tab:'more',sec:'fleet'};
  });
  if(nxs&&isFinite(nxs.eta))out.push(nxs);
  /* следующий ранг порта */
  var rep=portRep(s),nx=rep.next;
  if(nx){ var cd=s.stats.contractsDone||0;
    out.push({ic:'1f6a2',n:'Ранг порта: '+nx.n,kind:'Порт',req:'закрыть ещё '+pl(nx.need-cd,'контракт','контракта','контрактов'),cur:cd,need:nx.need,
      eta:(nx.need-cd)*Math.max(20,(PORT_NEW_MS*(rep.gap||1))/1000),
      rw:'награды порта ×'+nx.m.toFixed(2)+', корабли приходят быстрее',tab:'explore'}); }
  /* варп-прыжок */
  var pg=prestigeGain(s),cool=prestigeCool(s,now);
  if(pg>=1){ out.push({ic:'1f680',n:'Варп-прыжок',kind:'Престиж',
    req:cool.ready?('накопить энергию для +'+(pg+1)+' антиматерии'):('двигатель остывает ещё '+durTxt(cool.left/1000)),
    cur:pg,need:pg+1,
    eta:cool.ready?timeToR(s.stats.totalEnergy||0,ratesCalm(s).energy||0,(s.prestigeThreshold||0)+prestigeNeed(s)):(cool.left/1000),
    rw:'+12% ко всему доходу навсегда',tab:'more',sec:'prog'}); }
  /* если всё далеко — добавляем ближайшую короткую ступеньку, чтобы очередь не пустела */
  var near=Infinity; out.forEach(function(x){ if(isFinite(x.eta)&&x.eta<near)near=x.eta; });
  if(near>600){
    var fi2=flareInfo(s,now), ev=null;
    if(!fi2.active&&fi2.nextIn>0)ev={ic:'1f31e',n:'Солнечная вспышка \u00d7'+fi2.mult,kind:'Событие',
      req:'дождись вспышки и тапай по станции',eta:fi2.nextIn/1000,rw:'энергия \u00d7'+fi2.mult+' на 45 сек',tab:'scene'};
    if((s.chests||[]).length&&(!ev||(s.chests.length?0:1e9)<ev.eta))ev={ic:'1f4e6',n:'Сундук находок \u00d7'+s.chests.length,
      kind:'Событие',req:'вскрой сундук',eta:0,rw:'ресурсы, буст, шанс артефакта',tab:'explore'};
    if(!ev&&G_dailyReady(s,now))ev={ic:'1f4c5',n:'Награда дня',kind:'Событие',req:'забери награду дня',eta:0,
      rw:'серия дней растёт',tab:'more',sec:'prog'};
    if(ev)out.push(ev);
  }
  /* следующий облик */
  for(i=0;i<SKINS.length;i++){ var sk=SKINS[i];
    if(s.skins&&s.skins[sk.id])continue;
    out.push({ic:'1f3a0',n:'Облик: '+sk.n,kind:'Коллекция',req:sk.cost+' антиматерии',cur:s.resources.antimatter||0,need:sk.cost,
      eta:timeToR(s.resources.antimatter||0,antiRate(s),sk.cost),rw:'новая станция в сцене',tab:'more',sec:'col'});
    break; }
  out.sort(function(a,b){return a.eta-b.eta;});
  if(full)return out;
  /* лесенка обязана оставаться линейной: шаг цепи, ближайший замок, цель-накопление
     и монтаж корпуса не имеют права быть вытеснены частыми мелкими ступеньками */
  var spine=[];
  ['Цепь','Замок','Заказ'].forEach(function(kind){
    for(var j=0;j<out.length;j++){ if(out[j].kind===kind){ spine.push(out[j]); out.splice(j,1); break; } }
  });
  var res=spine.concat(out).slice(0,6);
  res.sort(function(a,b){return a.eta-b.eta;});
  return res;
}
/* следующий уровень станции, который реально что-то открывает: слот экспедиций,
   корабль верфи или веха уровня. Это «воздух» между крупными открытиями. */
function nextUnlockLevel(s){
  var L=stationLevel(s),i;
  for(i=0;i<EXP_SLOTS.length;i++) if(EXP_SLOTS[i].lvl>L)
    return {lvl:EXP_SLOTS[i].lvl,txt:(EXP_SLOTS[i].n)+'-й слот экспедиций',ic:'1f9ed'};
  for(i=0;i<SHIPS.length;i++) if(SHIP_LV[i]>L)
    return {lvl:SHIP_LV[i],txt:'верфь: «'+SHIPS[i].n+'»',ic:'1f6a2'};
  var nl=L+10-(L%10);
  return {lvl:nl,txt:'веха уровня: антиматерия и сундук находков',ic:'1f3c6'};
}
function shipLvText(s,id,lv){
  var b=shipById(id),pk=null;
  if(!b)return 'уровень '+(lv||1);
  SHIP_PERKS.forEach(function(p){ if(p.lv===lv)pk=p; });
  var base=b.d;
  return base+' усилен на '+Math.round(15*(lv-1))+'%'+(pk?(' · ОТКРОЕТСЯ: '+pk.t):'');
}
function upText(u){
  if(u.eff==='click')return 'сила тапа ×'+u.v;
  if(u.eff==='mod')return MODULES[u.tgt].name+' ×'+u.v;
  if(u.eff==='all')return 'весь доход ×'+u.v;
  if(u.eff==='offline')return 'оффлайн-доход ×'+u.v;
  if(u.eff==='tapauto')return 'рой +'+u.v+' тапов/сек';
  if(u.eff==='auto'||u.eff==='autosell'||u.eff==='autoexp'||u.eff==='autores'||u.eff==='autochest'||u.eff==='autoroute'||u.eff==='autoport'||u.eff==='autorepair')return 'новая автоматика станции';
  if(u.eff==='port')return 'награды порта ×'+u.v;
  if(u.eff==='sell')return 'курс руды ×'+u.v;
  if(u.eff==='peak')return 'пиковая сделка биржи ×'+u.v;
  if(u.eff==='patrol')return 'патруль флота ×'+u.v;
  if(u.eff==='docksafe')return 'абордажи вдвое реже';
  if(u.eff==='chest')return 'сундуки чаще';
  if(u.eff==='flare')return 'вспышка ×6';
  if(u.eff==='luck')return 'шанс экспедиций +'+Math.round(u.v*100)+'%';
  if(u.eff==='scan')return 'шанс экспедиций выше';
  return 'новое усиление';
}
function shipText(sh){ return sh.d; }
function stationTitle(s){var l=stationLevel(s);return 'Ур. '+l+' · '+(TITLES[Math.min(l-1,TITLES.length-1)]||'Абсолют');}
function offlineHours(s){return MAX_OFFLINE_H*(1+resEff(s,'cap'));}
function offline(s,now){
  var last=s.stats.lastSeen||now;
  var sec=Math.min(offlineHours(s)*3600,Math.max(0,(now-last)/1000));
  if(sec<60)return{seconds:0,earned:{}};
  /* отсутствие не наказывает: корабли у стенки ЖДУТ, а не срываются (иначе
     «ни одной сорванной сделки» невозможно взять, а уход в оффлайн больнее игры) */
  var pp=s.port||{};
  if(pp.list&&pp.list.length){
    if(pp.dealDay&&pp.dealDay!==dayKey(now)) pp.list=pp.list.filter(function(c){return !c||!c.big;});
    pp.list.forEach(function(c){ if(c&&c.exp){c.exp+=sec*1000;c.t=(c.t||now)+sec*1000;} });
  }
  if(pp.nextAt)pp.nextAt+=sec*1000;
  if(pp.carAt)pp.carAt+=sec*1000;
  if(s.flare&&s.flare.nextAt)s.flare.nextAt+=sec*1000;
  var r=rates(s),e={},mm=offlineMult(s);
  /* потолок оффлайна можно расширить исследованиями, но часы сверх базовых идут
     по 40%: иначе одна ночь без игры обгоняет весь дневной прогресс и темп
     перестаёт быть темпом */
  var base=MAX_OFFLINE_H*3600, eff=sec<=base?sec:base+(sec-base)*0.4;
  Object.keys(r).forEach(function(k){e[k]=Math.floor(r[k]*eff*mm);s.resources[k]=(s.resources[k]||0)+e[k];});
  if(e.energy)s.stats.totalEnergy+=e.energy;
  if(e.minerals)s.stats.totalMinerals+=e.minerals;
  if(e.credits)s.stats.totalCredits+=e.credits;
    s.stats.offlineGains++;
  var chests=0;
  if(sec>=2*3600){ pushChest(s,1); chests++; }
  if(sec>=5*3600){ pushChest(s,2); chests++; }
  return{seconds:Math.floor(sec),effSec:Math.floor(eff),earned:e,chests:chests};
}
function save(s){return JSON.stringify(s);}
function load(str){
  try{
    var o=JSON.parse(str); if(!o||!o.resources)return null;
    var s=defaultState();
    Object.keys(s.resources).forEach(function(k){ if(o.resources[k]!==undefined)s.resources[k]=+o.resources[k]||0; });
    MORDER.forEach(function(k){s.modules[k]=+((o.modules||{})[k])||0;});
    s.upgrades=o.upgrades||{}; s.achievements=o.achievements||{}; s.quests=o.quests||{};
    EXPLORE.forEach(function(e){s.exploreCooldown[e.key]=+((o.exploreCooldown||{})[e.key])||0;});
    if(o.resRun&&typeof o.resRun==='object'&&+o.resRun.end>0&&resById(String(o.resRun.id))&&!resHas(s,String(o.resRun.id))){
      s.resRun={id:String(o.resRun.id),end:+o.resRun.end};}
    if(o.expRun&&typeof o.expRun!=='undefined'&&typeof o.expRun==='object'){EXPLORE.forEach(function(e){var r=o.expRun[e.key];
      if(!r||!(+r.end>0))return;
      var c={}; if(r.cost&&typeof r.cost==='object'){for(var ck in r.cost)c[ck]=+r.cost[ck]||0;}
      var rw={}; if(r.rw&&typeof r.rw==='object'){for(var rk in r.rw)rw[rk]=+r.rw[rk]||0;}
      s.expRun[e.key]={end:+r.end,st:+r.st||(Date.now()-e.dur*60000),val:+r.val||0,ch:+r.ch||0.5,cost:c,
        rw:Object.keys(rw).length?rw:expReward(s,e,+r.val||0,Date.now())};});}
    s.stats.antimatter=+((o.stats||{}).antimatter)||0;
    s.prestigeCount=+o.prestigeCount||0; s.prestigeThreshold=+o.prestigeThreshold||0;
    s.prestigeLastBank=+o.prestigeLastBank||0;
    s.prestigeAt=+o.prestigeAt||0;
    s.boostUntil=+o.boostUntil||0;
    s.seenTut=+o.seenTut||0;
    if(o.lessonSeen&&typeof o.lessonSeen==='object')s.lessonSeen=o.lessonSeen;
    if(o.gatesSeen&&typeof o.gatesSeen==='object')s.gatesSeen=o.gatesSeen;
    if(o.skin&&skinById(o.skin).id===o.skin)s.skin=o.skin;
    if(o.skins&&typeof o.skins==='object'){Object.keys(o.skins).forEach(function(k){if(skinById(k).id===k)s.skins[k]=1;});}
    if(o.daily&&typeof o.daily==='object'){s.daily.day=String(o.daily.day||'');s.daily.streak=+o.daily.streak||0;}
    if(o.dq&&o.dq.list&&o.dq.list.length===3){s.dq={day:String(o.dq.day||''),done:+o.dq.done||0,list:o.dq.list.map(function(x){var rw={};if(x.rw&&typeof x.rw==='object')Object.keys(x.rw).forEach(function(k){rw[k]=+x.rw[k]||0;});return{id:String(x.id),base:+x.base||0,need:Math.max(1,+x.need||1),rw:rw,st:(x.st==='done'||x.st==='claim')?x.st:''};}).filter(function(x){return !!dqCfg(x.id);})};
      if(s.dq.list.length!==3)s.dq={day:'',list:[],done:0};}
    if(o.wheel&&typeof o.wheel==='object'){s.wheel.last=+o.wheel.last||0;s.wheel.spins=+o.wheel.spins||0;}
    if(o.art&&typeof o.art==='object'){ART.forEach(function(x){ if(o.art[x.id])s.art[x.id]=1; });}
        s.artShopCd=+o.artShopCd||0;
    if(o.research&&typeof o.research==='object'){RESEARCH.forEach(function(x){ if(o.research[x.id])s.research[x.id]=1; });}
    /* якорь цен и фактический приток антиматерии переживают перезагрузку:
       иначе после закрытия вкладки цены и сроки «прыгали» бы на глазах */
    if(o.anch&&typeof o.anch==='object'){s.anch={};RES.forEach(function(k){ if(+o.anch[k]>0)s.anch[k]=+o.anch[k]; });}
    if(o.anchAt&&typeof o.anchAt==='object'){s.anchAt={};RES.forEach(function(k){ if(+o.anchAt[k]>0)s.anchAt[k]=+o.anchAt[k]; });}
    s.unlocked={}; MORDER.forEach(function(k){ if((s.modules[k]||0)>0)s.unlocked[k]=1; });
    if(o.unlocked&&typeof o.unlocked==='object'){MORDER.forEach(function(k){ if(o.unlocked[k])s.unlocked[k]=1; });}
    if(o.ships&&typeof o.ships==='object'){SHIPS.forEach(function(x){ if(o.ships[x.id])s.ships[x.id]=1; });}
    if(o.shipLv&&typeof o.shipLv==='object'){s.shipLv={};SHIPS.forEach(function(x){
      if(s.ships[x.id])s.shipLv[x.id]=Math.max(1,Math.min(400,+o.shipLv[x.id]||1)); });}
    s.pier=+o.pier||0; s.shipInstall={};
    if(o.dock&&typeof o.dock==='object'){s.dock={};SHIPS.forEach(function(x){ var d=o.dock[x.id];
      if(d&&s.ships[x.id]){ var at=+(d&&d.at)||Date.now(); s.dock[x.id]={at:at,until:+(d&&d.until)||(at+DOCK_AUTO_MS)}; }});}
    if(o.sq&&typeof o.sq==='object'&&o.sq.list&&o.sq.list.length===3&&o.sq.list.every(function(k){return !!sqCfg(k);})){
      s.sq={id:+o.sq.id||0,list:o.sq.list.slice(),base:(o.sq.base||[]).map(function(x){return +x||0;}),
            claimed:(o.sq.claimed||[]).map(function(x){return +x||0;}).filter(function(x){return x>=0&&x<3;})};
      while(s.sq.base.length<3)s.sq.base.push(0);}
    if(o.log&&o.log.length){s.log=[];o.log.slice(0,40).forEach(function(e){ if(e&&typeof e.x==='string')s.log.push({t:+e.t||Date.now(),x:e.x.slice(0,90),k:String(e.k||'')}); });}
    if(o.route&&typeof o.route==='object'){s.route={n:+o.route.n||0,stage:+o.route.stage||0,cycles:+o.route.cycles||0};
      if(s.route.stage>=ROUTE.length)s.route.stage=0;}
    s.victory=+o.victory||0; s.eternal=+o.eternal||0; s.epochs=+o.epochs||0; s.bosses=+o.bosses||0;
    s.seenNews=String(o.seenNews||''); s.peakAt=+o.peakAt||0; s.emgAt=+o.emgAt||0; s.chain=Math.max(0,Math.min(400,+o.chain||0));
    if(o.chainHalf&&typeof o.chainHalf==='object'){Object.keys(o.chainHalf).forEach(function(k){
      if(/^[a-z]+\d*$/.test(String(k)))s.chainHalf[String(k)]=1;});}
    if(o.install&&typeof o.install==='object'){MORDER.forEach(function(k){ var it=o.install[k];
      if(INSTALL[k]&&it&&+it.end>Date.now()&&(+s.modules[k]||0)>0)
        s.install[k]={at:+it.at||Date.now(),end:+it.end,total:+it.total||INSTALL[k]};});}
    if(o.shipInstall&&typeof o.shipInstall==='object'){SHIPS.forEach(function(b){ var it=o.shipInstall[b.id];
      if(it&&+it.end>Date.now()&&s.ships[b.id]){ var tt=+it.total||SHIP_INSTALL[shipIdx(b.id)]||0;
        s.shipInstall[b.id]={at:+it.at||Date.now(),end:+it.end,total:tt};} });}
    if(o.chainPlan&&typeof o.chainPlan==='object'&&+o.chainPlan.i===s.chain-CHAIN.length-ECHAIN.length&&o.chainPlan.k)
      s.chainPlan={i:+o.chainPlan.i,k:String(o.chainPlan.k),need:Math.max(1,+o.chainPlan.need||1),d:String(o.chainPlan.d||'')};
    if(o.season&&typeof o.season==='object'){s.season={id:+o.season.id||0,base:+o.season.base||0,claimed:(o.season.claimed||[]).map(function(x){return +x||0;}).filter(function(x){return x>=0&&x<SEASON_TIERS.length;})};}
    if(o.chests&&o.chests.length){s.chests=[];o.chests.slice(0,6).forEach(function(x){var r=(typeof x==='object')?+x.r:+x;if(r>=1&&r<=3)s.chests.push({r:r,t:Date.now()});});}
    if(o.flare&&typeof o.flare==='object'){s.flare={nextAt:+o.flare.nextAt||0,until:+o.flare.until||0,ext:+o.flare.ext||0};}
    if(o.port&&o.port.list&&o.port.list.length){
      s.port={nextAt:+o.port.nextAt||0,init:+o.port.init||0,dealDay:String(o.port.dealDay||''),
              carAt:+o.port.carAt||0,carQ:[],list:[]};
      var loadCar=function(c){
        if(!c||!c.id||!c.need)return null;
        var need={},ok=true;
        Object.keys(c.need).forEach(function(k){ if(RES.indexOf(k)<0){ok=false;return;} need[k]=Math.max(1,Math.floor(+c.need[k]||0)); });
        if(!ok)return null;
        var rw={};Object.keys(c.rw||{}).forEach(function(k){ if(k==='chests')rw.chests=1; else if(RES.indexOf(k)>=0)rw[k]=Math.max(1,Math.floor(+c.rw[k]||0)); });
        var cc=(c.car&&c.car.chain)?{chain:String(c.car.chain),step:+c.car.step||1,n:+c.car.n||CARAVAN_LEN,last:+c.car.last||0}:0;
        return {id:String(c.id),k:c.k,big:c.big?1:0,urgent:c.urgent?1:0,car:cc,need:need,rw:rw,t:+c.t||Date.now(),exp:+c.exp||Date.now()+PORT_TTL};
      };
      (o.port.carQ||[]).slice(0,CARAVAN_LEN).forEach(function(c){ var x=loadCar(c); if(x)s.port.carQ.push(x); });
      o.port.list.slice(0,portSlots(s)+1).forEach(function(c){
        if(!c||!c.id||!c.need)return;
        var need={},ok=true;
        Object.keys(c.need).forEach(function(k){ if(RES.indexOf(k)<0){ok=false;return;} need[k]=Math.max(1,Math.floor(+c.need[k]||0)); });
        if(!ok)return;
        var rw={};Object.keys(c.rw||{}).forEach(function(k){ if(k==='chests')rw.chests=1; else if(RES.indexOf(k)>=0)rw[k]=Math.max(1,Math.floor(+c.rw[k]||0)); });
        var x=loadCar(c); if(x)s.port.list.push(x);
      });
    }
    var st=o.stats||{};
    Object.keys(s.stats).forEach(function(k){s.stats[k]=(st[k]!==undefined&&typeof st[k]==='number'&&isFinite(st[k]))?st[k]:s.stats[k];});
    s.stats.lastSeen=st.lastSeen||Date.now();
    if(o.chainBase&&typeof o.chainBase==='object'){s.chainBase={};
      Object.keys(o.chainBase).forEach(function(k){var b=o.chainBase[k];
        if(b&&typeof b==='object')s.chainBase[String(k)]={v:+b.v||0,t:+b.t||Date.now(),set:!!b.set};});}
    if(o.prestigeNeeds&&typeof o.prestigeNeeds==='object'){s.prestigeNeeds={};
      Object.keys(o.prestigeNeeds).forEach(function(k){ var r=o.prestigeNeeds[k];
        if(!/^n\d+$/.test(String(k)))return;
        if(r&&typeof r==='object')s.prestigeNeeds[String(k)]={v:+r.v||0,at:+r.at||0};
        else s.prestigeNeeds[String(k)]={v:+r||0,at:0}; });}
    return s;
  }catch(e){return null;}
}
var G={RES:RES,RES_META:RES_META,MODULES:MODULES,MORDER:MORDER,UPGRADES:UPGRADES,ACH:ACH,QUESTS:QUESTS,EXPLORE:EXPLORE,
 SKINS:SKINS,DAILY:DAILY,
 defaultState:defaultState,fmt:fmt,costFor:costFor,payRes:payRes,bulkCost:bulkCost,rates:rates,clickPower:clickPower,
 tick:tick,buyModule:buyModule,buyN:buyN,maxBuy:maxBuy,sellMinerals:sellMinerals,buyUpgrade:buyUpgrade,
 explore:explore,expTick:expTick,expInfo:expInfo,expCost:expCost,expReward:expReward,expChance:expChance,
 expSlots:expSlots,expActive:expActive,expGate:expGate,expGateEta:expGateEta,expReady:expReady,expLeft:expLeft,expArtChance:expArtChance,expChestChance:expChestChance,expLoss:expLoss,expTier:expTier,expGet:expGet,expVal:expVal,EXP_SLOTS:EXP_SLOTS,
 prestige:prestige,prestigeGain:prestigeGain,prestigeNeed:prestigeNeed,PRESTIGE_MIN:PRESTIGE_MIN,
 prestigeCool:prestigeCool,PRESTIGE_CD:PRESTIGE_CD,modGate:modGate,
 ratesCalm:ratesCalm,expPrice:expPrice,marketBase:marketBase,
 timeTo:timeTo,timeToR:timeToR,costTime:costTime,etaText:etaText,ladder:ladder,levelEta:levelEta,
 modsForLevel:modsForLevel,modPoints:modPoints,modCopiesFor:modCopiesFor,MPTS:MPTS,upText:upText,cancelResearch:cancelResearch,pl:pl,durTxt:durTxt,checkAch:checkAch,checkQuests:checkQuests,
 questState:questState,claimQuest:claimQuest,modUnlocked:modUnlocked,stationLevel:stationLevel,
 stationTitle:stationTitle,totalModules:totalModules,offline:offline,save:save,load:load,
 productionMult:productionMult,antiBonus:antiBonus,scanBonus:scanBonus,defense:defense,sellRate:sellRate,
 dailyReward:dailyReward,resTick:resTick,resRunInfo:resRunInfo,resById:resById,offlineMult:offlineMult,cometMult:cometMult,marketWave:marketWave,marketBase:marketBase,marketLevel:marketLevel,upgMult:upgMult,achMult:achMult,luck:luck,TICK_MS:TICK_MS,MAX_OFFLINE_H:MAX_OFFLINE_H,
 ART:ART,artOwned:artOwned,artEff:artEff,rollArtifact:rollArtifact,artifactShop:artifactShop,buyArtifact:buyArtifact,ART_SHOP_CD:ART_SHOP_CD,dayKey:dayKey,dailyState:dailyState,claimDaily:claimDaily,skinById:skinById,buySkin:buySkin,setSkin:setSkin,
 ACHP:ACHP,achState:achState,SCENE:SCENE,sceneFor:sceneFor,DQ:DQ,rollDQ:rollDQ,dqCfg:dqCfg,dqState:dqState,checkDq:checkDq,claimDq:claimDq,
  WHEEL:WHEEL,WHEEL_CD:WHEEL_CD,wheelState:wheelState,wheelSpin:wheelSpin,
 FLARE_MS:FLARE_MS,flareActive:flareActive,flareMult:flareMult,flareInfo:flareInfo,maybeFlare:maybeFlare,extendFlare:extendFlare,
 CHESTS:CHESTS,CHEST_BY_R:CHEST_BY_R,chestMult:chestMult,pushChest:pushChest,chestReward:chestReward,openChest:openChest,
  autoTapRate:autoTapRate,raidHp:raidHp,raidReward:raidReward,
 RESEARCH:RESEARCH,resHas:resHas,resOwned:resOwned,resEff:resEff,resAvail:resAvail,researchList:researchList,buyResearch:buyResearch,
 ROUTE:ROUTE,routeState:routeState,routeClaim:routeClaim,routeInit:routeInit,
 bossHp:bossHp,bossReward:bossReward,
 SEASON_LEN:SEASON_LEN,SEASON_TIERS:SEASON_TIERS,seasonInfo:seasonInfo,seasonClaim:seasonClaim,
 VICTORY:VICTORY,victoryParts:victoryParts,victoryState:victoryState,claimVictory:claimVictory,eternalBonus:eternalBonus,
 offlineHours:offlineHours,
 PORT_KIND:PORT_KIND,PORT_SLOTS:PORT_SLOTS,PORT_TTL:PORT_TTL,PORT_NEW_MS:PORT_NEW_MS,
 portCfg:portCfg,portState:portState,portGapCut:portGapCut,portGen:portGen,portGenDeal:portGenDeal,portMakeUrgent:portMakeUrgent,portCan:portCan,portReward:portReward,portDeliver:portDeliver,
 portCheapest:portCheapest,portPrice:portPrice,cdCut:cdCut,portReroll:portReroll,portRerollCost:portRerollCost,
 PORT_REP:PORT_REP,portRep:portRep,
 SHIPS:SHIPS,shipOwned:shipOwned,shipEff:shipEff,shipById:shipById,buyShip:buyShip,shipUnlocked:shipUnlocked,shipReqText:shipReqText,SHIP_LV:SHIP_LV,logAdd:logAdd,
 SHIP_SETS:SHIP_SETS,setHas:setHas,setCount:setCount,setParts:setParts,fleetDps:fleetDps,
 DOCK_AUTO_MS:DOCK_AUTO_MS,shipDmg:shipDmg,dockList:dockList,dockCount:dockCount,shipFit:shipFit,
 dockState:dockState,boardShip:boardShip,boardRandom:boardRandom,repairShip:repairShip,repairCost:repairCost,dockTick:dockTick,
 SQ_POOL:SQ_POOL,seasonQuests:seasonQuests,seasonQuestClaim:seasonQuestClaim,sqRoll:sqRoll,
 resBase:resBase,resEternal:resEternal,etScale:etScale,resEta:resEta,artEta:artEta,chainAct:chainAct,CHAIN_ACTS:CHAIN_ACTS,
 MILE:MILE,MILE_B:MILE_B,mileIdx:mileIdx,mileMult:mileMult,mileNext:mileNext,mileInfo:mileInfo,
 CHAIN:CHAIN,ECHAIN:ECHAIN,chainLen:chainLen,EPOCH_KIND:EPOCH_KIND,epochTarget:epochTarget,epochDesc:epochDesc,EPOCH_DESC:EPOCH_DESC,chainCfg:chainCfg,chainState:chainState,chainClaim:chainClaim,chainRwTxt:chainRwTxt,
 SHIP_UP:SHIP_UP,SHIP_PERKS:SHIP_PERKS,shipLv:shipLv,shipLvSum:shipLvSum,shipUpCost:shipUpCost,shipLvMult:shipLvMult,
 upShip:upShip,shipPerkCount:shipPerkCount,shipPerksOf:shipPerksOf,shipNextPerk:shipNextPerk,shipLvText:shipLvText,
 levelUpReward:levelUpReward,levelUnlockText:levelUnlockText,chainEta:chainEta,nextUnlockLevel:nextUnlockLevel,
 hunterHp:hunterHp,hunterReward:hunterReward,dockSafe:dockSafe,
 EMG_CD:EMG_CD,emgState:emgState,emergencyRepair:emergencyRepair,
 PEAK_CD:PEAK_CD,PEAK_WAVE:PEAK_WAVE,peakDeal:peakDeal,peakDealState:peakDealState,peakBonus:peakBonus,
 PIER_COST:PIER_COST,pierSlots:portSlots,portSlots:portSlots,buyPier:buyPier,
 RESON:RESON,RESON_KNEE:RESON_KNEE,resonanceMult:resonanceMult,resonanceInfo:resonanceInfo,
 GATES:GATES,openAll:openAll,INSTALL:INSTALL,installInfo:installInfo,installList:installList,
 SHIP_INSTALL:SHIP_INSTALL,shipInstallStart:shipInstallStart,shipInstallInfo:shipInstallInfo,
 shipInstallList:shipInstallList,shipInstallTick:shipInstallTick,shipInService:shipInService,
 goalBuild:goalBuild,GOAL_MIN:GOAL_MIN,GOAL_MAX:GOAL_MAX,chainBuildKey:chainBuildKey,
 chainStepEta:chainStepEta,expCadence:expCadence,shipUpEtaSec:shipUpEtaSec,
 installTick:installTick,installFactor:installFactor,chainHalfTick:chainHalfTick,chainHalfAt:chainHalfAt,gateErr:gateErr,gateOpen:gateOpen,gateInfo:gateInfo,gateCfg:gateCfg,gateName:gateName,gateTab:gateTab,gateSec:gateSec,nextGate:nextGate,newGates:newGates,UPG_CHAIN:UPG_CHAIN,SHIP_CHAIN:SHIP_CHAIN,
 ANTI_K:ANTI_K,ANTI_SOFT:ANTI_SOFT,ANTI_TAIL:ANTI_TAIL,tune:tune,COSTM:COSTM,
 anchUpdate:anchUpdate,anchRate:anchRate,payIncome:payIncome,antiRate:antiRate,setCur:setCur,
 copySec:copySec,T0:T0,TRAMP:TRAMP,TRAMP_KNEE:TRAMP_KNEE,TRAMP_SLOPE:TRAMP_SLOPE,
 rateFor:rateFor,PRESTIGE_T:PRESTIGE_T,chainEta:chainEta,chainEtaWork:chainEtaWork,
 MILE_TAIL:MILE_TAIL,MILE_TAIL_B:MILE_TAIL_B,mileAt:mileAt,mileTableIdx:mileTableIdx,mileTailIdx:mileTailIdx,
 PORT_TAIL_STEP:PORT_TAIL_STEP,PORT_TAIL_B:PORT_TAIL_B,portRankAt:portRankAt,portRankTail:portRankTail,
 EPOCH_LVL_T:EPOCH_LVL_T,EPOCH_LVL_MAX:EPOCH_LVL_MAX,levelDeltaForSec:levelDeltaForSec,epochLevelSec:epochLevelSec,
 ANCH_TICK:ANCH_TICK,ANCH_STEP:ANCH_STEP,
 GROW_TAIL:GROW_TAIL,GROW_KNEE:GROW_KNEE,PRESTIGE_KEEP:PRESTIGE_KEEP,
 PORT_URG_TTL:PORT_URG_TTL,PORT_URG_MULT:PORT_URG_MULT,
 CARAVAN_LEN:CARAVAN_LEN,CARAVAN_CD:CARAVAN_CD,CARAVAN_MIN_REP:CARAVAN_MIN_REP,
 caravanActive:caravanActive,caravanMake:caravanMake,caravanBonus:caravanBonus,caravanTxt:caravanTxt};
root.Game=G;
})(typeof window!=='undefined'?window:this);
