// src/lib/autoReconcile.ts

// 1. ТАНЫ ӨГСӨН АВАРГА ТОЛЬ БИЧИГ (Бүрэн эхээрээ)
export const EN_TO_MN_DICT: Record<string, string[]> = {
  // Товчлолууд
  syr: ["сироп", "шүүс", "бурам"],
  fr: ["жимс", "жимсний", "жимстэй"],
  cr: ["крем", "цөцгий", "хөөс"],
  bl: ["хар", "үхрийн нүд", "хөх"],
  veg: ["ногоо", "ургамлын"],
  vegg: ["ногоо", "хүнсний ногоо"],
  veggies: ["ногоо", "хүнсний ногоо"],
  c: ["цуу", "алимны цуу"],
  can: ["лаазтай", "нөөшилсөн", "лааз"],
  canned: ["лаазтай", "нөөшилсөн"],
  chick: ["тахиа", "тахианы"],
  pickl: ["дарсан", "даршилсан"],
  mascarp: ["маскарпоне"],
  boulillon: ["бульон", "шөл"],

  // Сүү, Өндөг, Цөцгий, Бяслаг
  milk: ["сүү", "сү", "милк"],
  egg: ["өндөг", "өндөгний"],
  eggs: ["өндөг", "өндөгний"],
  butter: ["масло", "цөцгийн тос"],
  cheese: ["бяслаг", "сыр", "чеддер", "зүссэн бяслаг"],
  cream: ["өрөм", "крем", "балун", "цөцгий", "вип", "зөөхий"],
  creamy: ["цөцгийтэй", "кремтэй"],
  sauer: ["зөөхий", "исгэлэн"],
  sour: ["зөөхий"],
  balloon: ["балун", "бөмбөлөг"],
  yogurt: ["тараг", "иогурт"],
  moloko: ["молоко", "өтгөрүүлсэн сүү"],
  whipped: ["хөөсрүүлсэн", "вип", "хутгасан"],

  // Кофе, Цай, Ундаанууд
  bean: ["үр", "үрэл", "кофе", "шош"],
  beans: ["үр", "үрэл", "кофе", "шош"],
  coffee: ["кофе", "эспрессо"],
  espresso: ["эспрессо", "кофе"],
  kick: ["кик", "хүчтэй кофе"],
  tea: ["цай", "байхуу", "хөндмөл", "ханд"],
  teas: ["цай", "цайнууд"],
  brew: ["ханд", "хандалсан", "чанасан"],
  matcha: ["матча", "ногоон цай"],
  chai: ["чай", "цай", "масала"],
  rooibos: ["ройбос", "улаан цай"],
  hibis: ["хибискус", "сарнай"],
  butterfl: ["эрвээхэй", "цэнхэр цай"],
  green: ["ногоон", "ногоон цай"],
  bulbous: ["булцуут", "ургамал"],
  water: ["ус", "цэвэр ус", "рашаан"],
  bonaque: ["ус", "бонакуа"],
  soda: ["сода", "хийжүүлсэн", "хийтэй"],
  cola: ["кола", "ундаа"],
  laaztai: ["лаазтай", "лааз"],
  craft: ["крафт"],
  soft: ["ундаа", "хийжүүлсэн"],
  drink: ["ундаа", "жүүс"],
  juice: ["шүүс", "жүүс", "цэвэр шүүс"],
  calpis: ["калпис"],
  tonic: ["тоник"],
  orice: ["орис", "будааны"],
  smoothie: ["смүүти", "смути"],

  // Сироп, Чихэрлэг
  syrup: ["сироп", "шүүс", "бурам"],
  sugar: ["сахар", "элсэн чихэр"],
  sweetener: ["сахар орлуулагч", "чихэрлэг"],
  honey: ["зөгийн бал", "бал"],
  caramel: ["карамель", "чихэр"],
  vanilla: ["ваниль", "ваниллийн"],
  hazelnut: ["самар", "самрын", "хазелнат"],
  pistacchio: ["пистачио", "фисташка"],
  pistachio: ["пистачио", "фисташка"],
  cinnamon: ["шанц", "синнамон", "савхан шанц"],
  chocolate: ["шоколад", "шоко", "какао", "халуун шоколад"],
  choco: ["шоко", "шоколад"],
  cocoa: ["какао"],
  mocha: ["мока"],
  mint: ["гаа", "гааны", "минт"],
  curasao: ["кюрасао", "курасао"],
  grenade: ["анар", "гренадин"],

  // Мах, Уураг
  beef: ["үхэр", "үхрийн мах", "үхрийн"],
  pork: ["гахай", "гахайн мах"],
  chicken: ["тахиа", "тахианы мах", "цээж мах"],
  sheep: ["хонь", "хонины мах", "хонины"],
  lamb: ["хурга", "хурганы мах"],
  bacon: ["бекон", "гахайн мах"],
  salami: ["салями", "хиам", "зайдас"],
  patty: ["таташ", "махан таташ", "бургерын мах"],
  tuna: ["туна", "загас", "загасны мах"],
  ground: ["татсан", "татсан мах"],

  // Жимс
  apple: ["алим", "алимны"],
  banana: ["гадил", "банан"],
  lemon: ["нимбэг", "лимон", "нимбэгний"],
  orange: ["жүрж", "апельсин"],
  grapefruit: ["бэрсүүт жүрж", "грейпфрут"],
  kiwi: ["киви"],
  peach: ["тоор", "тоорын"],
  mango: ["манго", "мангоны"],
  passion: ["пашн", "маркуяа"],
  cherry: ["интоор", "интоорын"],
  berry: ["жимс", "жимсгэнэ"],
  strawberry: ["гүзээлзгэнэ", "гүзээлзгэний"],
  raspberry: ["бөөрөлзгөнө", "бөөрөлзгөний"],
  blueberry: ["нэрс", "нэрсний"],
  currant: ["үхрийн нүд", "үхрийн нүдний"],
  buckthorn: ["чацаргана", "чацарганы"],
  fruits: ["жимс", "жимснүүд"],
  wildberry: ["зэрлэг жимс", "ойн жимс"],
  sea: ["чацаргана", "далайн"],

  // Ногоо, Ургамал
  tomato: ["улаан лооль", "помидор", "лооль"],
  tomatoes: ["улаан лооль", "помидор"],
  cucumber: ["өргөст хэмх", "огурцы"],
  carrot: ["лууван", "луувангийн"],
  onion: ["сонгино", "сонгинын"],
  garlic: ["сармис", "сармисны"],
  lettuce: ["салат", "салатны навч", "байцаа"],
  celery: ["селерей", "яншуй"],
  selleries: ["селерей", "яншуй"],
  parsley: ["яншуй", "яншуйны"],
  pepper: ["чинжүү", "перец", "чинжүүний"],
  sweet: ["амтат", "чихэрлэг"],
  corn: ["эрдэнэ шиш", "кукуруз"],
  pumpkin: ["хулуу", "хулууны"],
  ginger: ["цагаан гаа", "гаа"],
  herbs: ["өвс", "ургамал", "хатаасан ногоо"],
  farm: ["фермийн", "ногооны"],
  plant: ["ургамал", "булцуут"],

  // Гурил, Сүмс, Нарийн боов
  bread: ["талх", "хэрчсэн", "зүссэн"],
  bun: ["талх", "булочка", "бургерын талх"],
  flour: ["гурил", "гурилан"],
  powder: ["нунтаг", "паудэр", "пудр", "хөөлгөгч"],
  power: ["нунтаг", "паудэр"],
  sauce: ["соус", "сүмс", "амтлагч"],
  burger: ["бургер", "бургерын"],
  ketchup: ["кетчуп"],
  mayo: ["майонез"],
  mustard: ["гич", "мустард"],
  oil: ["тос", "ургамлын тос", "олив", "чидун"],
  olive: ["олив", "чидун"],
  vinegar: ["уксус", "цуу"],
  salt: ["давс"],
  tabasco: ["табаско"],
  worchest: ["ворчестер"],
  seasonings: ["амтлагч", "хольц"],
  various: ["төрөл бүрийн", "холимог"],
  chips: ["үртэс", "чипс"],
  slice: ["хэрчим", "зүсэм"],
  piece: ["хэсэг", "хэрчим"],
  stick: ["савх", "мод"],
  velvet: ["велвет", "хамба"],
  ladies: ["савоярди", "хуруу", "жигнэмэг"],
  finger: ["хуруу", "савоярди"],
  baking: ["жигнэх", "хөөлгөгч"],
  dried: ["хатаасан"],
  fresh: ["шинэ", "шинэхэн"],
  sliced: ["зүссэн", "хэрчсэн"],
  hot: ["халуун"],
  black: ["хар", "үхрийн нүд"],
  blue: ["хөх", "цэнхэр"],
  red: ["улаан"],
  soup: ["шөл", "зутан"],

  // Сав баглаа
  cup: ["аяга", "стакан"],
  lid: ["таг", "бөглөө"],
  straw: ["соруул", "гуурс"],
  napkin: ["сальфетка", "арчуур", "цаас"],
  bag: ["уут", "тор", "хүүдий"]
};

// 2. КИРИЛЛ -> ЛАТИН АВИА ЗҮЙН ХӨРВҮҮЛЭГЧ
const MN_CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'ө': 'u', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
  'у': 'u', 'ү': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
  'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': 'i', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

// 3. ҮСГИЙН АЛДАА ШАЛГАГЧ (Levenshtein)
export function getSimilarity(s1: string, s2: string): number {
  let longer = (s1 || "").toLowerCase().trim();
  let shorter = (s2 || "").toLowerCase().trim();
  if (longer.length < shorter.length) {
    const temp = longer;
    longer = shorter;
    shorter = temp;
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / parseFloat(longerLength.toString());
}

export function transliterate(text: string): string {
  return (text || '').toLowerCase().split('').map(c => MN_CYRILLIC_MAP[c] || c).join('');
}

export function sanitizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[«»"'\(\)\[\]\/\\#\.,\+&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 4. МОНГОЛ ҮГЭЭС АНГЛИ ҮГИЙГ ТОЛЬ БИЧГЭЭС ОЛОХ
export function getEnglishTranslations(mnWord: string): string[] {
  const clean = mnWord.toLowerCase().replace(/(тай|тэй|той|ын|ийн|ийг|аар|ээр|оор|өөр)$/g, '');
  const matches: string[] = [];

  for (const [enKey, mnList] of Object.entries(EN_TO_MN_DICT)) {
    if (mnList.some(mn => mn.includes(clean) || clean.includes(mn))) {
      matches.push(enKey);
    }
  }
  return matches;
}

// 5. НЭРИЙГ ТОКЕН БОЛГОЖ ЗАДЛАХ
export function extractFnbTokens(name: string): Set<string> {
  const clean = sanitizeName(name);
  const rawWords = clean.split(' ').filter(w => w.length >= 2);
  const tokens = new Set<string>();

  for (const word of rawWords) {
    const root = word.replace(/(тай|тэй|той|ын|ийн|ийг|аар|ээр|оор|өөр)$/g, '');
    tokens.add(root);
    tokens.add(transliterate(root));

    // Толь бичгээс бүх хувилбарыг нэмнэ:
    const enEquivalents = getEnglishTranslations(root);
    enEquivalents.forEach(en => tokens.add(en));
  }

  return tokens;
}

// 6. ХОЁР БҮТЭЭГДЭХҮҮНИЙ ТААРАХ ОНООГ ТООЦООЛОХ (0.0 - 1.0)
export function calculateMatchScore(posName: string, targetName: string): number {
  const posClean = sanitizeName(posName);
  const targetClean = sanitizeName(targetName);

  if (posClean === targetClean) return 1.0;
  if (transliterate(posClean) === transliterate(targetClean)) return 0.99;

  // Шууд үсгийн төстэй байдал (Жишээ: tymbark vs tymbarko -> 0.88)
  const sim = getSimilarity(posClean, targetClean);
  if (sim >= 0.85) return sim;

  const posTokens = extractFnbTokens(posName);
  const targetTokens = extractFnbTokens(targetName);
  if (posTokens.size === 0 || targetTokens.size === 0) return 0;

  let intersection = 0;
  posTokens.forEach(token => {
    if (targetTokens.has(token)) {
      intersection++;
    } else {
      for (const tToken of targetTokens) {
        if (tToken.includes(token) || token.includes(tToken)) {
          intersection += 0.7;
          break;
        }
      }
    }
  });

  const score = intersection / posTokens.size;
  return Math.min(1.0, Math.max(score, sim));
}

// 7. МЕНЮН ДОТРООС ХАМГИЙН ТӨСТЭЙ БАРААГ ОЛОХ ҮНДСЭН ФУНКЦ
export function findBestMenuMatch(
  posProductName: string,
  availableMenuNames: string[]
): { matchedName: string | null; confidence: number } {
  let bestMatch: string | null = null;
  let highestScore = 0;

  for (const menuName of availableMenuNames) {
    const score = calculateMatchScore(posProductName, menuName);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = menuName;
    }
  }

  return {
    matchedName: bestMatch,
    confidence: highestScore
  };
}