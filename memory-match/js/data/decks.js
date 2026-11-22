/* ===== Колоды и уровни (21 колода, 4 уровня в каждой = 84 уровня) =====
   Каждая колода: 4 уровня — 3/4/5/6 пар, режимы classic → classic → combo/blitz → blitz.
   req/next — цепочка разблокировки. */
const DECKS = [
  { id:'animals', req:null, next:'safari', levels:[
    { id:'animals_1', title:{ru:'Разминка', en:'Warm-up'},        pairs:3, mode:'classic', imgs:['lion','tiger','panda'] },
    { id:'animals_2', title:{ru:'Охота',    en:'Hunt'},           pairs:4, mode:'classic', imgs:['lion','tiger','panda','zebra'] },
    { id:'animals_3', title:{ru:'Пять зверей', en:'Five Beasts'}, pairs:5, mode:'combo',   imgs:['lion','tiger','panda','zebra','elephant'] },
    { id:'animals_4', title:{ru:'Большая стая', en:'The Pack'},   pairs:6, mode:'blitz',   imgs:['lion','tiger','panda','zebra','elephant','giraffe'] },
  ]},
  { id:'safari', req:'animals', next:'ocean', levels:[
    { id:'safari_1', title:{ru:'Саванна',  en:'Savanna'},  pairs:3, mode:'classic', imgs:['elephant','giraffe','bear'] },
    { id:'safari_2', title:{ru:'Водопой',  en:'Waterhole'},pairs:4, mode:'classic', imgs:['elephant','giraffe','bear','gazelle'] },
    { id:'safari_3', title:{ru:'Переход',  en:'Crossing'}, pairs:5, mode:'combo',   imgs:['elephant','giraffe','bear','gazelle','lion'] },
    { id:'safari_4', title:{ru:'Тропой',   en:'On Track'}, pairs:6, mode:'blitz',   imgs:['elephant','giraffe','bear','gazelle','lion','zebra'] },
  ]},
  { id:'ocean', req:'safari', next:'space', levels:[
    { id:'ocean_1', title:{ru:'Прибрежье', en:'Shore'},   pairs:3, mode:'classic', imgs:['whale','orca','octopus'] },
    { id:'ocean_2', title:{ru:'Риф',       en:'Reef'},    pairs:4, mode:'classic', imgs:['whale','orca','octopus','dolphin'] },
    { id:'ocean_3', title:{ru:'Глубина',   en:'Deep'},    pairs:5, mode:'combo',   imgs:['whale','orca','octopus','dolphin','seahorse'] },
    { id:'ocean_4', title:{ru:'Течение',   en:'Current'}, pairs:6, mode:'blitz',   imgs:['whale','orca','octopus','dolphin','seahorse','shark'] },
  ]},
  { id:'space', req:'ocean', next:'sweets', levels:[
    { id:'space_1', title:{ru:'Орбита',     en:'Orbit'},    pairs:3, mode:'classic', imgs:['galaxy','nebula','rocket'] },
    { id:'space_2', title:{ru:'Станция',    en:'Station'},  pairs:4, mode:'classic', imgs:['galaxy','nebula','rocket','saturn'] },
    { id:'space_3', title:{ru:'Туманность', en:'Nebula'},   pairs:5, mode:'combo',   imgs:['galaxy','nebula','rocket','saturn','comet'] },
    { id:'space_4', title:{ru:'Дальний космос', en:'Deep Space'}, pairs:6, mode:'blitz', imgs:['galaxy','nebula','rocket','saturn','comet','ufo'] },
  ]},
  { id:'sweets', req:'space', next:'food', levels:[
    { id:'sweets_1', title:{ru:'Завтрак',       en:'Breakfast'}, pairs:3, mode:'classic', imgs:['cake','croissant','strawberry'] },
    { id:'sweets_2', title:{ru:'Кондитерская',  en:'Bakery'},    pairs:4, mode:'classic', imgs:['cake','croissant','strawberry','coffee'] },
    { id:'sweets_3', title:{ru:'Праздник',      en:'Party'},     pairs:5, mode:'combo',   imgs:['cake','croissant','strawberry','coffee','donut'] },
    { id:'sweets_4', title:{ru:'Сладкий стол',  en:'Sweet Table'},pairs:6, mode:'blitz',  imgs:['cake','croissant','strawberry','coffee','donut','lollipop'] },
  ]},
  { id:'food', req:'sweets', next:'fruits', levels:[
    { id:'food_1', title:{ru:'Перекус',    en:'Snack'},    pairs:3, mode:'classic', imgs:['sushi','pizza','burger'] },
    { id:'food_2', title:{ru:'Пиццерия',   en:'Pizzeria'}, pairs:4, mode:'classic', imgs:['sushi','pizza','burger','taco'] },
    { id:'food_3', title:{ru:'Шеф-повар',  en:'Chef'},     pairs:5, mode:'combo',   imgs:['sushi','pizza','burger','taco','fries'] },
    { id:'food_4', title:{ru:'Банкет',     en:'Banquet'},  pairs:6, mode:'blitz',   imgs:['sushi','pizza','burger','taco','fries','icecream'] },
  ]},
  { id:'fruits', req:'food', next:'vehicles', levels:[
    { id:'fruits_1', title:{ru:'Фруктовая корзина', en:'Fruit Basket'}, pairs:3, mode:'classic', imgs:['apple','banana','orange'] },
    { id:'fruits_2', title:{ru:'Ягодный сад',       en:'Berry Garden'}, pairs:4, mode:'classic', imgs:['apple','strawberry','orange','cherry'] },
    { id:'fruits_3', title:{ru:'Смузи',             en:'Smoothie'},     pairs:5, mode:'combo',   imgs:['apple','grapes','banana','cherry','pineapple'] },
    { id:'fruits_4', title:{ru:'Витрина',           en:'Grocery'},      pairs:6, mode:'blitz',   imgs:['orange','cherry','watermelon','grapes','pineapple','strawberry'] },
  ]},
  { id:'vehicles', req:'fruits', next:'sport', levels:[
    { id:'vehicles_1', title:{ru:'Город',   en:'City'},    pairs:3, mode:'classic', imgs:['car','train','ship'] },
    { id:'vehicles_2', title:{ru:'Гонка',   en:'Race'},    pairs:4, mode:'classic', imgs:['car','train','plane','ship'] },
    { id:'vehicles_3', title:{ru:'Драг',    en:'Drag'},    pairs:5, mode:'combo',   imgs:['car','bike','train','plane','truck'] },
    { id:'vehicles_4', title:{ru:'Поток',   en:'Traffic'}, pairs:6, mode:'blitz',   imgs:['car','bike','train','plane','truck','ship'] },
  ]},
  { id:'sport', req:'vehicles', next:'farm', levels:[
    { id:'sport_1', title:{ru:'Разминка', en:'Warm-up'},  pairs:3, mode:'classic', imgs:['soccer','basketball','tennis'] },
    { id:'sport_2', title:{ru:'Команда',  en:'Team'},     pairs:4, mode:'classic', imgs:['baseball','volleyball','golf','hockey'] },
    { id:'sport_3', title:{ru:'Чемпион',  en:'Champion'}, pairs:5, mode:'combo',   imgs:['bowling','boxing','rugby','cycling','swimming'] },
    { id:'sport_4', title:{ru:'Десять видов', en:'Ten Sports'}, pairs:6, mode:'blitz', imgs:['soccer','hockey','boxing','cycling','swimming','golf'] },
  ]},
  { id:'farm', req:'sport', next:'music', levels:[
    { id:'farm_1', title:{ru:'Ферма',        en:'Farm'},     pairs:3, mode:'classic', imgs:['farm_cow','farm_horse','farm_pig'] },
    { id:'farm_2', title:{ru:'Амбар',        en:'Barn'},     pairs:4, mode:'classic', imgs:['farm_cow','farm_horse','farm_pig','farm_sheep'] },
    { id:'farm_3', title:{ru:'Ярмарка',      en:'Fair'},     pairs:5, mode:'combo',   imgs:['farm_cow','farm_horse','farm_pig','farm_sheep','farm_chicken'] },
    { id:'farm_4', title:{ru:'Большая ферма',en:'Big Farm'}, pairs:6, mode:'blitz',   imgs:['farm_cow','farm_horse','farm_pig','farm_sheep','farm_chicken','farm_duck'] },
  ]},
  { id:'music', req:'farm', next:'architecture', levels:[
    { id:'music_1', title:{ru:'Аккорд',  en:'Chord'},     pairs:3, mode:'classic', imgs:['music_guitar','music_piano','music_violin'] },
    { id:'music_2', title:{ru:'Оркестр', en:'Orchestra'}, pairs:4, mode:'classic', imgs:['music_guitar','music_piano','music_violin','music_drums'] },
    { id:'music_3', title:{ru:'Бит',     en:'Beat'},      pairs:5, mode:'combo',   imgs:['music_guitar','music_piano','music_violin','music_drums','music_sax'] },
    { id:'music_4', title:{ru:'Концерт', en:'Concert'},   pairs:6, mode:'blitz',   imgs:['music_guitar','music_piano','music_violin','music_drums','music_sax','music_trumpet'] },
  ]},
  { id:'architecture', req:'music', next:'winter', levels:[
    { id:'architecture_1', title:{ru:'Крепость',  en:'Fortress'},  pairs:3, mode:'classic', imgs:['arch_castle','arch_pyramid','arch_lighthouse'] },
    { id:'architecture_2', title:{ru:'Мегаполис', en:'Megacity'},  pairs:4, mode:'classic', imgs:['arch_castle','arch_pyramid','arch_lighthouse','arch_skyscraper'] },
    { id:'architecture_3', title:{ru:'Мосты',     en:'Bridges'},   pairs:5, mode:'combo',   imgs:['arch_pyramid','arch_lighthouse','arch_bridge','arch_skyscraper','arch_cathedral'] },
    { id:'architecture_4', title:{ru:'Скайлайн',  en:'Skyline'},   pairs:6, mode:'blitz',   imgs:['arch_castle','arch_pyramid','arch_lighthouse','arch_skyscraper','arch_bridge','arch_cathedral'] },
  ]},
  { id:'winter', req:'architecture', next:'dinosaurs', levels:[
    { id:'winter_1', title:{ru:'Тихий лес',      en:'Silent Forest'}, pairs:3, mode:'classic', imgs:['winter_forest','winter_peak','winter_cabin'] },
    { id:'winter_2', title:{ru:'Зимнее небо',    en:'Winter Sky'},    pairs:4, mode:'classic', imgs:['winter_aurora','winter_forest','winter_peak','winter_frozen'] },
    { id:'winter_3', title:{ru:'Ледяной кристалл',en:'Ice Crystal'},  pairs:5, mode:'combo',   imgs:['winter_aurora','winter_forest','winter_cabin','winter_frozen','winter_snowflake'] },
    { id:'winter_4', title:{ru:'Полярная ночь',  en:'Polar Night'},   pairs:6, mode:'blitz',   imgs:['winter_aurora','winter_forest','winter_peak','winter_cabin','winter_frozen','winter_snowflake'] },
  ]},
  { id:'dinosaurs', req:'winter', next:'pets', levels:[
    { id:'dino_1', title:{ru:'Мел',     en:'Cretaceous'}, pairs:3, mode:'classic', imgs:['dino_rex','dino_tri','dino_stego'] },
    { id:'dino_2', title:{ru:'Юра',     en:'Jurassic'},   pairs:4, mode:'classic', imgs:['dino_rex','dino_tri','dino_stego','dino_raptor'] },
    { id:'dino_3', title:{ru:'Стая',    en:'The Pack'},   pairs:5, mode:'combo',   imgs:['dino_rex','dino_tri','dino_stego','dino_raptor','dino_anky'] },
    { id:'dino_4', title:{ru:'Мезозой', en:'Mesozoic'},   pairs:6, mode:'blitz',   imgs:['dino_rex','dino_tri','dino_stego','dino_raptor','dino_anky','dino_ptero'] },
  ]},
  { id:'pets', req:'dinosaurs', next:'birds', levels:[
    { id:'pets_1', title:{ru:'Малыши',   en:'Little Ones'}, pairs:3, mode:'classic', imgs:['pet_cat','pet_dog','pet_hamster'] },
    { id:'pets_2', title:{ru:'Дома',     en:'At Home'},     pairs:4, mode:'classic', imgs:['pet_cat','pet_dog','pet_hamster','pet_rabbit'] },
    { id:'pets_3', title:{ru:'Зооуголок',en:'Menagerie'},   pairs:5, mode:'combo',   imgs:['pet_cat','pet_dog','pet_hamster','pet_rabbit','pet_parrot'] },
    { id:'pets_4', title:{ru:'Выставка', en:'Show'},        pairs:6, mode:'blitz',   imgs:['pet_cat','pet_dog','pet_hamster','pet_rabbit','pet_parrot','pet_pony'] },
  ]},
  { id:'birds', req:'pets', next:'insects', levels:[
    { id:'birds_1', title:{ru:'Хищники', en:'Raptors'}, pairs:3, mode:'classic', imgs:['eagle','owl','bird_flamingo'] },
    { id:'birds_2', title:{ru:'Полюс',   en:'Polar'},   pairs:4, mode:'classic', imgs:['eagle','owl','bird_flamingo','bird_penguin'] },
    { id:'birds_3', title:{ru:'Яркие',   en:'Bright'},  pairs:5, mode:'combo',   imgs:['eagle','owl','bird_flamingo','bird_penguin','bird_peacock'] },
    { id:'birds_4', title:{ru:'Тропики', en:'Tropics'}, pairs:6, mode:'blitz',   imgs:['eagle','owl','bird_flamingo','bird_penguin','bird_peacock','bird_toucan'] },
  ]},
  { id:'insects', req:'birds', next:'reef', levels:[
    { id:'bugs_1', title:{ru:'Сад',         en:'Garden'},   pairs:3, mode:'classic', imgs:['bug_bee','bug_butterfly','bug_ladybug'] },
    { id:'bugs_2', title:{ru:'Крылья',      en:'Wings'},    pairs:4, mode:'classic', imgs:['bug_bee','bug_butterfly','bug_ladybug','bug_dragonfly'] },
    { id:'bugs_3', title:{ru:'Муравейник',  en:'Anthill'},  pairs:5, mode:'combo',   imgs:['bug_bee','bug_butterfly','bug_ladybug','bug_dragonfly','bug_ant'] },
    { id:'bugs_4', title:{ru:'Жужелицы',    en:'Critters'}, pairs:6, mode:'blitz',   imgs:['bug_bee','bug_butterfly','bug_ladybug','bug_dragonfly','bug_ant','bug_spider'] },
  ]},
  { id:'reef', req:'insects', next:'flowers', levels:[
    { id:'reef_1', title:{ru:'Риф',       en:'Reef'},      pairs:3, mode:'classic', imgs:['clownfish','sea_turtle','crab'] },
    { id:'reef_2', title:{ru:'Отлив',     en:'Low Tide'},  pairs:4, mode:'classic', imgs:['clownfish','sea_turtle','crab','jellyfish'] },
    { id:'reef_3', title:{ru:'Охотники',  en:'Hunters'},   pairs:5, mode:'combo',   imgs:['clownfish','sea_turtle','crab','jellyfish','manta'] },
    { id:'reef_4', title:{ru:'Синяя бездна', en:'Deep Blue'}, pairs:6, mode:'blitz', imgs:['clownfish','sea_turtle','crab','jellyfish','manta','shark'] },
  ]},
  { id:'flowers', req:'reef', next:'mushrooms', levels:[
    { id:'flower_1', title:{ru:'Букет',     en:'Bouquet'},    pairs:3, mode:'classic', imgs:['flower_rose','flower_tulip','flower_daisy'] },
    { id:'flower_2', title:{ru:'Поле',      en:'Meadow'},     pairs:4, mode:'classic', imgs:['flower_rose','flower_tulip','flower_daisy','flower_sunflower'] },
    { id:'flower_3', title:{ru:'Оранжерея', en:'Greenhouse'}, pairs:5, mode:'combo',   imgs:['flower_rose','flower_tulip','flower_daisy','flower_sunflower','flower_orchid'] },
    { id:'flower_4', title:{ru:'Лаванда',   en:'Lavender'},   pairs:6, mode:'blitz',   imgs:['flower_rose','flower_tulip','flower_daisy','flower_sunflower','flower_orchid','flower_lavender'] },
  ]},
  { id:'mushrooms', req:'flowers', next:'wonders', levels:[
    { id:'mush_1', title:{ru:'Боровик',   en:'Porcini'},      pairs:3, mode:'classic', imgs:['mush_porcini','mush_flyagaric','mush_chanterelle'] },
    { id:'mush_2', title:{ru:'Съедобные', en:'Edible'},       pairs:4, mode:'classic', imgs:['mush_porcini','mush_flyagaric','mush_chanterelle','mush_champignon'] },
    { id:'mush_3', title:{ru:'Опята',     en:'Honey Fungus'}, pairs:5, mode:'combo',   imgs:['mush_porcini','mush_flyagaric','mush_chanterelle','mush_champignon','mush_honey'] },
    { id:'mush_4', title:{ru:'Тихая охота',en:'Mushroom Hunt'},pairs:6, mode:'blitz',  imgs:['mush_porcini','mush_flyagaric','mush_chanterelle','mush_champignon','mush_honey','mush_puffball'] },
  ]},
  { id:'wonders', req:'mushrooms', next:'reptiles', levels:[
    { id:'wonder_1', title:{ru:'Древний мир', en:'Ancient'},   pairs:3, mode:'classic', imgs:['wonder_colosseum','wonder_petra','wonder_stonehenge'] },
    { id:'wonder_2', title:{ru:'Классика',    en:'Classic'},   pairs:4, mode:'classic', imgs:['wonder_colosseum','wonder_petra','wonder_stonehenge','wonder_taj'] },
    { id:'wonder_3', title:{ru:'Путешествие', en:'Voyage'},    pairs:5, mode:'combo',   imgs:['wonder_colosseum','wonder_petra','wonder_stonehenge','wonder_taj','wonder_eiffel'] },
    { id:'wonder_4', title:{ru:'Кругосветка', en:'Around'},    pairs:6, mode:'blitz',   imgs:['wonder_colosseum','wonder_petra','wonder_stonehenge','wonder_taj','wonder_eiffel','wonder_machu'] },
  ]},
  { id:'reptiles', req:'wonders', next:null, levels:[
    { id:'reptile_1', title:{ru:'Хамелеон', en:'Chameleon'}, pairs:3, mode:'classic', imgs:['reptile_chameleon','reptile_gecko','reptile_python'] },
    { id:'reptile_2', title:{ru:'Чешуя',    en:'Scales'},    pairs:4, mode:'classic', imgs:['reptile_chameleon','reptile_gecko','reptile_python','reptile_iguana'] },
    { id:'reptile_3', title:{ru:'Древние',  en:'Ancients'},  pairs:5, mode:'combo',   imgs:['reptile_chameleon','reptile_gecko','reptile_python','reptile_iguana','reptile_croc'] },
    { id:'reptile_4', title:{ru:'Засуха',   en:'Dry Season'},pairs:6, mode:'blitz',   imgs:['reptile_chameleon','reptile_gecko','reptile_python','reptile_iguana','reptile_croc','reptile_tortoise'] },
  ]},
];
const LEVELS_ALL = DECKS.flatMap(d => d.levels.map(lv => ({ ...lv, deck: d.id })));
