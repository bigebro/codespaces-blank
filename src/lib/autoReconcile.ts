// src/lib/autoReconcile.ts

// =========================================================================
// 1. АВАРГА ТОЛЬ БИЧИГ (100% Complete F&B Dictionary)
// =========================================================================
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

// =========================================================================
// 2. ХЭМЖЭЭ, ХЯМДРАЛЫН ҮГС (Эдгээр үг орсон бол эцэг бүтээгдэхүүнийг солихгүй!)
// =========================================================================
export const VARIANT_WORDS = new Set([
  'big', 'small', 'jijig', 'tom', 'mini', 'large', 'medium', 'sale', 'хямдрал', 'discount'
]);

// 3. КИРИЛЛ -> ЛАТИН ХӨРВҮҮЛЭГЧ
const MN_CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'ө': 'u', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
  'у': 'u', 'ү': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
  'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': 'i', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

export function transliterate(text: string): string {
  return (text || '').toLowerCase().split('').map(c => MN_CYRILLIC_MAP[c] || c).join('');
}

// ⚡ ХААЛТ () БОЛОН ТЭМДЭГТҮҮДИЙГ БҮРЭН ЦЭВЭРЛЭХ:
// "Tiramisu (sale)" -> "tiramisu sale"
export function sanitizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[«»"'\(\)\[\]\/\\#\.,\+&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Үсгийн төстэй байдал тооцоолох (Levenshtein)
export function getSimilarity(s1: string, s2: string): number {
  let longer = (s1 || "").toLowerCase().trim();
  let shorter = (s2 || "").toLowerCase().trim();
  if (longer.length < shorter.length) {
    const temp = longer;
    longer = shorter;
    shorter = temp;
  }
  if (longer.length === 0) return 1.0;
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
  return (longer.length - costs[shorter.length]) / parseFloat(longer.length.toString());
}

// Нэрэн дотор хэмжээ, хямдралын үг байгаа эсэхийг ялгах
export function getVariantModifier(cleanName: string): string | null {
  const words = cleanName.split(' ');
  for (const w of words) {
    if (VARIANT_WORDS.has(w)) return w;
  }
  return null;
}

// Мөстэй, хүйтнийг ялгах
export function checkIcedModifier(text: string): boolean {
  const clean = sanitizeName(text);
  return /мөстэй|мөст|хүйтэн|ice|iced|cold/.test(clean);
}

// ҮГЭЭС ТОКЕН САЛГАХ & ОРЧУУЛАХ
export function extractFnbTokens(name: string): Set<string> {
  const clean = sanitizeName(name);
  const rawWords = clean.split(' ').filter(w => w.length >= 2);
  const tokens = new Set<string>();

  for (const word of rawWords) {
    const root = word.replace(/(тай|тэй|той|ын|ийн|ийг|аар|ээр|оор|өөр)$/g, '');
    if (root.length < 2) continue;

    tokens.add(root);
    tokens.add(transliterate(root));

    // Толь бичгээс англи хувилбарыг олох
    for (const [enKey, mnList] of Object.entries(EN_TO_MN_DICT)) {
      if (mnList.some(mn => mn.includes(root) || root.includes(mn))) {
        tokens.add(enKey);
      }
    }
  }
  return tokens;
}
// 5. ТААРАХ ОНООГ ТОГТООХ (80% босго ба Төгсгөлийн 1 үсгийн зөрүүг таних дүрэм)
export function calculateMatchScore(posName: string, candidateName: string): number {
  const posClean = sanitizeName(posName);
  const candClean = sanitizeName(candidateName);

  // Яг ижил нэр
  if (posClean === candClean) return 1.0;
  if (transliterate(posClean) === transliterate(candClean)) return 0.99;

  // ⚡ ШИНЭ ДҮРЭМ: Хэрэв Tymbark ба Tymbarko шиг нэг нь нөгөөгөөрөө эхэлсэн, 
  // зөрүү нь ердөө 1 үсэг (o, a) байвал шууд 90% (0.90) гэж найдвартай үзнэ!
  if (
    Math.abs(posClean.length - candClean.length) <= 1 &&
    (posClean.startsWith(candClean) || candClean.startsWith(posClean))
  ) {
    return 0.90;
  }

  // ⚡ БОСГЫГ 0.80 (80%) БОЛГОЖ ЗӨӨЛЛӨВ:
  const sim = getSimilarity(posClean, candClean);
  if (sim >= 0.8) return sim;

  // Токен огтлолцол
  const posTokens = extractFnbTokens(posName);
  const candTokens = extractFnbTokens(candidateName);
  if (posTokens.size === 0 || candTokens.size === 0) return 0;

  let intersection = 0;
  posTokens.forEach(t => {
    if (candTokens.has(t)) {
      intersection++;
    } else {
      for (const ct of candTokens) {
        if (ct.includes(t) || t.includes(ct)) {
          intersection += 0.7;
          break;
        }
      }
    }
  });

  const posIsIced = checkIcedModifier(posName);
  const candIsIced = checkIcedModifier(candidateName);
  if (posIsIced === candIsIced) {
    intersection += 0.3;
  }

  const score = intersection / posTokens.size;
  return Math.min(1.0, Math.max(score, sim));
}
// [1-р ХАМГААЛАЛТ] ҮНИЙН ОГЦОМ ЗӨРҮҮНИЙ БАМБАЙ (Price Spike Shield)
export function isPriceChangeSafe(menuPrice: number, posPrice: number): boolean {
  if (!menuPrice || menuPrice <= 0 || !posPrice || posPrice <= 0) return true;
  const ratio = posPrice / menuPrice;
  return ratio >= 0.70 && ratio <= 1.50; // 30%-иас их хямдрал эсвэл 50%-иас их өсөлтийг хамгаална
}

// =========================================================================
// 7. [БҮХ ЗОХИЦУУЛАЛТЫГ ХИЙХ ГАНЦХАН ТАРХИ]
// =========================================================================
export interface ReconciliationResult {
  decision: 'AUTO_MERGE' | 'TIE_BREAK' | 'NEW_PRODUCT';
  action?: 'EXACT_MATCH' | 'VARIANT_PRODUCT' | 'TYPO_MERGE' | 'NEW_PRODUCT'; 
  matchedProduct?: any;
  targetProduct?: any;
  canonicalName: string;
  posPrice: number;
  shouldUpdateMenuPrice: boolean;
  shouldUpdatePrice?: boolean;
  tieCandidates?: string[];
  reason: string;
  isVariant?: boolean;
}

export function evaluateSaleItem(
  rawPosName: string,
  posPrice: number,
  productsList: any[],
  aliasMap: Record<string, string> = {}
): ReconciliationResult {
  const cleanPos = sanitizeName(rawPosName);
  const posIsIced = checkIcedModifier(rawPosName);
  const posModifier = getVariantModifier(cleanPos);

  // А. Яг ижил нэр байна уу? (Хаалт үл тооцогдоно: "Tiramisu (sale)" == "Tiramisu sale")
  const exactProd = productsList.find(p => sanitizeName(p.name) === cleanPos);
  if (exactProd) {
    const isSafe = isPriceChangeSafe(Number(exactProd.selling_price), posPrice);
    return {
      decision: 'AUTO_MERGE',
      matchedProduct: exactProd,
      targetProduct: exactProd,
      canonicalName: exactProd.name,
      posPrice,
      shouldUpdateMenuPrice: isSafe,
      shouldUpdatePrice: isSafe,
      isVariant: false,
      reason: `Ижил бүтээгдэхүүн олдсон`
    };
  }

  // Б. aliasMap санах ойд заасан эсэх
  const directAlias = aliasMap[cleanPos];
  if (directAlias) {
    const prod = productsList.find(p => sanitizeName(p.name) === sanitizeName(directAlias));
    if (prod) {
      const isSafe = isPriceChangeSafe(Number(prod.selling_price), posPrice);
      return {
        decision: 'AUTO_MERGE',
        matchedProduct: prod,
        targetProduct: prod,
        canonicalName: prod.name,
        posPrice,
        shouldUpdateMenuPrice: isSafe,
        shouldUpdatePrice: isSafe,
        isVariant: false,
        reason: `Санах ойн холбоос: ${prod.name}`
      };
    }
  }

  // В. Меню дотроос хамгийн өндөр оноотойг хайх
  const scored = productsList.map(prod => {
    let score = calculateMatchScore(rawPosName, prod.name);
    
    // Халуун хувилбарт давуу эрх өгөх
    const prodIsIced = checkIcedModifier(prod.name);
    if (!posIsIced && !prodIsIced) {
      score += 0.05;
    } else if (posIsIced && prodIsIced) {
      score += 0.10;
    } else if (posIsIced !== prodIsIced) {
      score -= 0.20;
    }

    return { prod, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];

  // Г. [2-р Хамгаалалт] Тэнцсэн үед дур мэдэн шийдэхгүй (Tie-Break)
  if (top && second && top.score >= 0.75 && Math.abs(top.score - second.score) < 0.05) {
    return {
      decision: 'TIE_BREAK',
      canonicalName: rawPosName,
      posPrice,
      shouldUpdateMenuPrice: false,
      shouldUpdatePrice: false,
      tieCandidates: [top.prod.name, second.prod.name],
      isVariant: false,
      reason: `Хоёр өөр бүтээгдэхүүний оноо тэнцсэн (${top.prod.name} vs ${second.prod.name})`
    };
  }

  // Д. Өндөр оноотой таарсан үед
  if (top && top.score >= 0.80) {
    const isSafe = isPriceChangeSafe(Number(top.prod.selling_price), posPrice);
    const menuModifier = getVariantModifier(sanitizeName(top.prod.name));

    // ⚡ АЛТАН ДҮРЭМ: Хэрэв нэг нь 'Big', 'jijig', 'sale' үгтэй бол ЭЦЭГ Tiramisu-Г УСТГАХГҮЙ, ХУВИЛБАР БОЛГОНО:
    const isVariant = posModifier !== menuModifier;

    return {
      decision: 'AUTO_MERGE',
      matchedProduct: top.prod,
      targetProduct: top.prod,
      canonicalName: top.prod.name,
      posPrice,
      shouldUpdateMenuPrice: isSafe,
      shouldUpdatePrice: isSafe,
      isVariant: isVariant, // 👈 ТУСДАА ХУВИЛБАР МӨН ЭСЭХ ТЭМДЭГ!
      reason: isVariant 
        ? `${top.prod.name}-ийн хувилбар (${posModifier})` 
        : `Ижил бараа олдсон (${top.prod.name})`
    };
  }

  // Е. Огт таараагүй цоо шинэ бараа
  return {
    decision: 'NEW_PRODUCT',
    canonicalName: rawPosName,
    posPrice,
    shouldUpdateMenuPrice: true,
    shouldUpdatePrice: true,
    isVariant: false,
    reason: `Менюд байхгүй шинэ бараа`
  };
}

// Хуучин кодтой нийцүүлэх нөөц Export:
export const findBestRecipeMatch = (posName: string, availableNames: string[], aliasMap: Record<string, string> = {}) => {
  const res = evaluateSaleItem(posName, 0, availableNames.map(n => ({ name: n })), aliasMap);
  return {
    matchedName: res.matchedProduct?.name || null,
    confidence: res.decision === 'AUTO_MERGE' ? 0.90 : 0
  };
};