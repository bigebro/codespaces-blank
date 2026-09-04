import { GoogleGenerativeAI } from '@google/generative-ai';

// =========================================================================
// 🇲🇳 1. КИРИЛЛ ТООГ ЦИФР БОЛГОХ
// =========================================================================
const MN_NUMBERS = [
  { w: "нэг зуун", v: 100 }, { w: "хоёр зуун", v: 200 }, { w: "гурван зуун", v: 300 },
  { w: "арван есөн", v: 19 }, { w: "арван ес", v: 19 },
  { w: "арван найман", v: 18 }, { w: "арван найм", v: 18 },
  { w: "арван долоон", v: 17 }, { w: "арван долоо", v: 17 },
  { w: "арван зургаан", v: 16 }, { w: "арван зургаа", v: 16 },
  { w: "арван таван", v: 15 }, { w: "арван тав", v: 15 },
  { w: "арван дөрвөн", v: 14 }, { w: "арван дөрөв", v: 14 },
  { w: "арван гурван", v: 13 }, { w: "арван гурав", v: 13 },
  { w: "арван хоёр", v: 12 }, { w: "арван нэгэн", v: 11 }, { w: "арван нэг", v: 11 },
  { w: "арван", v: 10 }, { w: "арав", v: 10 },
  { w: "хорин", v: 20 }, { w: "хорь", v: 20 },
  { w: "гучин", v: 30 }, { w: "гуч", v: 30 },
  { w: "дөчин", v: 40 }, { w: "дөч", v: 40 },
  { w: "тавин", v: 50 }, { w: "тавь", v: 50 },
  { w: "жаран", v: 60 }, { w: "жар", v: 60 },
  { w: "далан", v: 70 }, { w: "дал", v: 70 },
  { w: "наян", v: 80 }, { w: "ная", v: 80 },
  { w: "ерэн", v: 90 }, { w: "ер", v: 90 },
  { w: "нэгэн", v: 1 }, { w: "нэг", v: 1 }, { w: "ганц", v: 1 },
  { w: "хоёр", v: 2 }, { w: "гурав", v: 3 }, { w: "дөрвөн", v: 4 }, { w: "дөрөв", v: 4 },
  { w: "таван", v: 5 }, { w: "тав", v: 5 }, { w: "зургаан", v: 6 }, { w: "зургаа", v: 6 },
  { w: "долоон", v: 7 }, { w: "долоо", v: 7 }, { w: "найман", v: 8 }, { w: "найм", v: 8 },
  { w: "есөн", v: 9 }, { w: "ес", v: 9 },
  { w: "хагас", v: 0.5 }, { w: "тал", v: 0.5 }
];

// =========================================================================
// 🇲🇳 2. ТАНЫ ЖАГСААЛТЫН БҮХ БАРАА БАГТСАН АВАРГА ТОЛЬ БИЧИГ (100% COMPLETE)
// =========================================================================
const EN_TO_MN_DICT: Record<string, string[]> = {
  // Товчлолууд
  "syr": ["сироп", "шүүс", "бурам"],
  "fr": ["жимс", "жимсний", "жимстэй"],
  "cr": ["крем", "цөцгий", "хөөс"],
  "bl": ["хар", "үхрийн нүд", "хөх"],
  "veg": ["ногоо", "ургамлын"],
  "vegg": ["ногоо", "хүнсний ногоо"],
  "veggies": ["ногоо", "хүнсний ногоо"],
  "c": ["цуу", "алимны цуу"],
  "can": ["лаазтай", "нөөшилсөн", "лааз"],
  "canned": ["лаазтай", "нөөшилсөн"],
  "chick": ["тахиа", "тахианы"],
  "pickl": ["дарсан", "даршилсан"],
  "mascarp": ["маскарпоне"],
  "boulillon": ["бульон", "шөл"],

  // Сүү, Өндөг, Цөцгий, Бяслаг
  "milk": ["сүү", "сү", "милк"],
  "egg": ["өндөг", "өндөгний"],
  "eggs": ["өндөг", "өндөгний"],
  "butter": ["масло", "цөцгийн тос"],
  "cheese": ["бяслаг", "сыр", "чеддер", "зүссэн бяслаг"],
  "cream": ["өрөм", "крем", "балун", "цөцгий", "вип", "зөөхий"],
  "creamy": ["цөцгийтэй", "кремтэй"],
  "sauer": ["зөөхий", "исгэлэн"],
  "sour": ["зөөхий"],
  "balloon": ["балун", "бөмбөлөг"],
  "yogurt": ["тараг", "иогурт"],
  "moloko": ["молоко", "өтгөрүүлсэн сүү"],
  "whipped": ["хөөсрүүлсэн", "вип", "хутгасан"],

  // Кофе, Цай, Ундаанууд
  "bean": ["үр", "үрэл", "кофе", "шош"],
  "beans": ["үр", "үрэл", "кофе", "шош"],
  "coffee": ["кофе", "эспрессо"],
  "espresso": ["эспрессо", "кофе"],
  "kick": ["кик", "хүчтэй кофе"],
  "tea": ["цай", "байхуу", "хөндмөл", "ханд"],
  "teas": ["цай", "цайнууд"],
  "brew": ["ханд", "хандалсан", "чанасан"],
  "matcha": ["матча", "ногоон цай"],
  "chai": ["чай", "цай", "масала"],
  "rooibos": ["ройбос", "улаан цай"],
  "hibis": ["хибискус", "сарнай"],
  "butterfl": ["эрвээхэй", "цэнхэр цай"],
  "green": ["ногоон", "ногоон цай"],
  "bulbous": ["булцуут", "ургамал"],
  "water": ["ус", "цэвэр ус", "рашаан"],
  "bonaque": ["ус", "бонакуа"],
  "soda": ["сода", "хийжүүлсэн", "хийтэй"],
  "cola": ["кола", "ундаа"],
  "laaztai": ["лаазтай", "лааз"],
  "craft": ["крафт"],
  "soft": ["ундаа", "хийжүүлсэн"],
  "drink": ["ундаа", "жүүс"],
  "juice": ["шүүс", "жүүс", "цэвэр шүүс"],
  "calpis": ["калпис"],
  "tonic": ["тоник"],
  "orice": ["орис", "будааны"],

  // Сироп, Чихэрлэг
  "syrup": ["сироп", "шүүс", "бурам"],
  "sugar": ["сахар", "элсэн чихэр"],
  "sweetener": ["сахар орлуулагч", "чихэрлэг"],
  "honey": ["зөгийн бал", "бал"],
  "caramel": ["карамель", "чихэр"],
  "vanilla": ["ваниль", "ваниллийн"],
  "hazelnut": ["самар", "самрын", "хазелнат"],
  "pistacchio": ["пистачио", "фисташка"],
  "pistachio": ["пистачио", "фисташка"],
  "cinnamon": ["шанц", "синнамон", "савхан шанц"],
  "chocolate": ["шоколад", "шоко", "какао", "халуун шоколад"],
  "choco": ["шоко", "шоколад"],
  "cocoa": ["какао"],
  "mocha": ["мока"],
  "mint": ["гаа", "гааны", "минт"],
  "curasao": ["кюрасао", "курасао"],
  "grenade": ["анар", "гренадин"],

  // Мах, Уураг
  "beef": ["үхэр", "үхрийн мах", "үхрийн"],
  "pork": ["гахай", "гахайн мах"],
  "chicken": ["тахиа", "тахианы мах", "цээж мах"],
  "sheep": ["хонь", "хонины мах", "хонины"],
  "lamb": ["хурга", "хурганы мах"],
  "bacon": ["бекон", "гахайн мах"],
  "salami": ["салями", "хиам", "зайдас"],
  "patty": ["таташ", "махан таташ", "бургерын мах"],
  "tuna": ["туна", "загас", "загасны мах"],
  "ground": ["татсан", "татсан мах"],

  // Жимс
  "apple": ["алим", "алимны"],
  "banana": ["гадил", "банан"],
  "lemon": ["нимбэг", "лимон", "нимбэгний"],
  "orange": ["жүрж", "апельсин"],
  "grapefruit": ["бэрсүүт жүрж", "грейпфрут"],
  "kiwi": ["киви"],
  "peach": ["тоор", "тоорын"],
  "mango": ["манго", "мангоны"],
  "passion": ["пашн", "маркуяа"],
  "cherry": ["интоор", "интоорын"],
  "berry": ["жимс", "жимсгэнэ"],
  "strawberry": ["гүзээлзгэнэ", "гүзээлзгэний"],
  "raspberry": ["бөөрөлзгөнө", "бөөрөлзгөний"],
  "blueberry": ["нэрс", "нэрсний"],
  "currant": ["үхрийн нүд", "үхрийн нүдний"],
  "buckthorn": ["чацаргана", "чацарганы"],
  "fruits": ["жимс", "жимснүүд"],
  "wildberry": ["зэрлэг жимс", "ойн жимс"],
  "sea": ["чацаргана", "далайн"],

  // Ногоо, Ургамал
  "tomato": ["улаан лооль", "помидор", "лооль"],
  "tomatoes": ["улаан лооль", "помидор"],
  "cucumber": ["өргөст хэмх", "огурцы"],
  "carrot": ["лууван", "луувангийн"],
  "onion": ["сонгино", "сонгинын"],
  "garlic": ["сармис", "сармисны"],
  "lettuce": ["салат", "салатны навч", "байцаа"],
  "celery": ["селерей", "яншуй"],
  "selleries": ["селерей", "яншуй"],
  "parsley": ["яншуй", "яншуйны"],
  "pepper": ["чинжүү", "перец", "чинжүүний"],
  "sweet": ["амтат", "чихэрлэг"],
  "corn": ["эрдэнэ шиш", "кукуруз"],
  "pumpkin": ["хулуу", "хулууны"],
  "ginger": ["цагаан гаа", "гаа"],
  "herbs": ["өвс", "ургамал", "хатаасан ногоо"],
  "farm": ["фермийн", "ногооны"],
  "plant": ["ургамал", "булцуут"],

  // Гурил, Сүмс, Нарийн боов
  "bread": ["талх", "хэрчсэн", "зүссэн"],
  "bun": ["талх", "булочка", "бургерын талх"],
  "flour": ["гурил", "гурилан"],
  "powder": ["нунтаг", "паудэр", "пудр", "хөөлгөгч"],
  "power": ["нунтаг", "паудэр"],
  "sauce": ["соус", "сүмс", "амтлагч"],
  "burger": ["бургер", "бургерын"],
  "ketchup": ["кетчуп"],
  "mayo": ["майонез"],
  "mustard": ["гич", "мустард"],
  "oil": ["тос", "ургамлын тос", "олив", "чидун"],
  "olive": ["олив", "чидун"],
  "vinegar": ["уксус", "цуу"],
  "salt": ["давс"],
  "tabasco": ["табаско"],
  "worchest": ["ворчестер"],
  "seasonings": ["амтлагч", "хольц"],
  "various": ["төрөл бүрийн", "холимог"],
  "chips": ["үртэс", "чипс"],
  "slice": ["хэрчим", "зүсэм"],
  "piece": ["хэсэг", "хэрчим"],
  "stick": ["савх", "мод"],
  "velvet": ["велвет", "хамба"],
  "ladies": ["савоярди", "хуруу", "жигнэмэг"],
  "finger": ["хуруу", "савоярди"],
  "baking": ["жигнэх", "хөөлгөгч"],
  "dried": ["хатаасан"],
  "fresh": ["шинэ", "шинэхэн"],
  "sliced": ["зүссэн", "хэрчсэн"],
  "hot": ["халуун"],
  "black": ["хар", "үхрийн нүд"],
  "blue": ["хөх", "цэнхэр"],
  "red": ["улаан"],

  // Сав баглаа
  "cup": ["аяга", "стакан"],
  "lid": ["таг", "бөглөө"],
  "straw": ["соруул", "гуурс"],
  "napkin": ["сальфетка", "арчуур", "цаас"],
  "bag": ["уут", "тор", "хүүдий"]
};

// =========================================================================
// 🚀 3. АЯНГА ШИГ ХУРДАН ОНООНЫ МАШИН + АВТОМАТ СУРАЛЦАХ СИСТЕМ
// =========================================================================
export function advancedMongolianVoiceParser(
  rawText: string, 
  ingredients: any[], 
  learnedAliases: { phrase: string; ingredient_id: string }[] = []
) {
  let text = rawText.toLowerCase().trim();

  // 1. Амаар хэлсэн тоог цифр болгох
  for (const { w, v } of MN_NUMBERS) {
    const reg = new RegExp(`(^|[\\s,.:;!?])${w}(?=[\\s,.:;!?]|$)`, 'gi');
    text = text.replace(reg, `$1${v} `);
  }

  // 2. Тоо ба нэгжийг ялгах
  const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(л|литр|l|мл|ml|кг|kg|гр|грамм|gram|ш|ширхэг|хайрцаг|уут|багц|сав)?/);
  if (!numMatch) return null;

  let qty = parseFloat(numMatch[1]);
  const unitStr = numMatch[2] || '';
  if (['л', 'литр', 'l', 'кг', 'kg'].includes(unitStr)) {
    qty *= 1000;
  }

  // 3. Үйлдлийг язгуураар нь таних
  let type: 'spoilage' | 'purchase' | 'staff_meal' | 'testing' | null = null;
  if (/асг|мууд|гаш|хая|цуц|хагар|уна|дуус|эвд|алд|урс|түлс/.test(text)) type = 'spoilage';
  else if (/ава|авс|татан|ирл|нэм|худалд|оруул|авчир/.test(text)) type = 'purchase';
  else if (/хоол|идс|уус|ажилчдын|цайны/.test(text)) type = 'staff_meal';
  else if (/турш|амт|шалга/.test(text)) type = 'testing';

  if (!type) return null;

  // 4. 🧠 FEEDBACK LOOP: Өмнө нь Gemini-аас суралцсан үгсийг хамгийн түрүүнд шалгах! (0.001ms)
  for (const alias of learnedAliases) {
    if (text.includes(alias.phrase.toLowerCase().trim())) {
      const matched = ingredients.find(i => i.id === alias.ingredient_id);
      if (matched) {
        return {
          is_transaction: true,
          success: true,
          item_id: matched.id,
          item_name: matched.name,
          unit: matched.unit,
          quantity: type === 'purchase' ? Math.abs(qty) : -Math.abs(qty),
          type: type,
          notes: `${rawText} (🧠 Суралцсан үг)`
        };
      }
    }
  }

  // 5. ОНООНЫ МАШИН: Таны 100+ барааг үг үгээр нь шалгах
  let bestMatch: any = null;
  let highestScore = 0;

  for (const ing of ingredients) {
    let currentScore = 0;
    const dbNameLower = ing.name.toLowerCase();

    // Бүтэн нэрээрээ байвал шууд 100 оноо!
    if (text.includes(dbNameLower)) {
      currentScore += 100;
    }

    const dbWords = dbNameLower.split(/[\s.\-\/]+/);

    for (const word of dbWords) {
      if (word.length < 2) continue;

      if (text.includes(word)) {
        currentScore += 15;
      }

      const mnSynonyms = EN_TO_MN_DICT[word] || [];
      for (const syn of mnSynonyms) {
        if (syn.length <= 2) {
          const safeReg = new RegExp(`(^|[\\s,.:;!?])${syn}(?=[\\s,.:;!?]|$)`, 'i');
          if (safeReg.test(text)) currentScore += 20;
        } else if (text.includes(syn)) {
          currentScore += 20;
        }
      }
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = ing;
    }
  }

  // Багадаа 1 үг бүтэн таарсан (20 оноо) байх ёстой
  if (highestScore < 20 || !bestMatch) {
    return null; // Олсонгүй -> Gemini руу илгээнэ!
  }

  return {
    is_transaction: true,
    success: true,
    item_id: bestMatch.id,
    item_name: bestMatch.name,
    unit: bestMatch.unit,
    quantity: type === 'purchase' ? Math.abs(qty) : -Math.abs(qty),
    type: type,
    notes: `${rawText} (⚡ Local Parser)`
  };
}

// ⚡ LOCAL FAST PARSER (0.01ms Local Deterministic Matching)
export function fastLocalParse(text: string, ingredientsList: string[]) {
  const lower = text.toLowerCase().trim();

  // 1. Тоо болон нэгж олох
  const numMatch = lower.match(/(\d+(?:\.\d+)?)\s*(л|литр|l|мл|ml|кг|kg|гр|грамм|gram|ш|ширхэг)?/);
  if (!numMatch) return null;

  let rawQty = parseFloat(numMatch[1]);
  const rawUnit = numMatch[2] || '';

  // Нэгж стандартчилах (литр -> мл, кг -> грамм)
  if (rawUnit === 'л' || rawUnit === 'литр' || rawUnit === 'l') rawQty *= 1000;
  if (rawUnit === 'кг' || rawUnit === 'kg') rawQty *= 1000;

  // 2. Үйлдлийн төрөл олох
  let type: 'spoilage' | 'purchase' | 'staff_meal' | 'testing' | null = null;
  if (/асга|мууд|гашил|хая/.test(lower)) type = 'spoilage';
  else if (/ава|авсан|татан/.test(lower)) type = 'purchase';
  else if (/хоол|идсэн/.test(lower)) type = 'staff_meal';
  else if (/турш|амт/.test(lower)) type = 'testing';

  if (!type) return null;

  // 3. Барааны нэр тааруулах
  const matchedIng = (ingredientsList || []).find(ing => lower.includes(ing.toLowerCase().trim()));
  if (!matchedIng) return null;

  const finalQty = (type === 'purchase') ? Math.abs(rawQty) : -Math.abs(rawQty);

  return {
    is_transaction: true,
    success: true,
    error_message: null,
    item_name: matchedIng,
    quantity: finalQty,
    type: type,
    notes: `${text} (Local Fast Match)`
  };
}

// 💡 Түлхүүрүүдийг таслалаар аюулгүй салгаж авах
function getApiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY || "";
  return raw.replace(/["']/g, "").split(",").map(k => k.trim()).filter(Boolean);
}

let geminiLibKeyIndex = 0;
export async function parseOperationalText(
   text: string, 
  ingredientsList: string[], 
  learnedAliases: { phrase: string; ingredient_id: string }[] = []
)

{
  const localResult = advancedMongolianVoiceParser(text, ingredientsList, learnedAliases);
  if (localResult) return localResult;
  const systemPrompt = `
    You are an expert F&B operations assistant and router. Your job is to classify and parse incoming messages written by baristas or cooks.

    You must respond strictly with a JSON object.

    First, classify if the message is a transaction attempt (the user is explicitly logging/recording waste, a purchase, a staff meal, or testing) or a general conversation (asking a question, greeting you, or requesting a report).

    Keys you must return in JSON:
    - "is_transaction": (boolean. Set to true ONLY if the message is a command to record/log an operation. Set to false if it is a question, greeting, chat, or report request)
    - "success": (boolean. Set to true if is_transaction is true AND you successfully parsed the entry. Set to false if language is unreadable, gibberish, or has errors)
    - "error_message": (string or null. Mongolian error message if success is false)
    - "item_name": (string or null. Must match one of the allowed ingredients list exactly)
    - "quantity": (number or null. Negative for waste/meals/testing, positive for purchases)
    - "type": (string or null. Either "spoilage", "purchase", "testing", or "staff_meal")
    - "extracted_phrase": (string. The exact raw Mongolian words user called this item, without numbers or action verbs. E.g. for "нэг алимны сироп аву" return "алимны сироп")
    - "notes": (string or null. Brief description in Mongolian)

    Allowed ingredients list:
    [${ingredientsList.join(', ')}]

    Rules:
    1. Standardize units: "литр/l" to "ml" (multiply by 1000), "кг/kg" to "gram" (multiply by 1000).
    2. Spoilage/Waste (e.g., "асгав", "асгарсан", "муудсан"): quantity must be NEGATIVE, type must be "spoilage".
    3. Purchase (e.g., "авав", "авсан", "татан авалт"): quantity must be POSITIVE, type must be "purchase".
    4. Staff Meal (e.g., "хоолонд орсон", "хооллосон"): quantity must be NEGATIVE, type must be "staff_meal".
    5. Testing (e.g., "туршилт", "амталгаа"): quantity must be NEGATIVE, type must be "testing".
    6. Count / Audit (e.g., "Тооллого хийлээ", "үлдэгдэл байна", "тооллого"): Quantity must be POSITIVE (the exact amount left). Type must be "count".
    Example 1: "10 л сүү асгав" -> {"is_transaction": true, "success": true, "error_message": null, "item_name": "Milk", "quantity": -10000, "type": "spoilage", "notes": "10 литр сүү асгасан"}
    Example 2: "Сүүний хаягдал сүүлийн үед яагаад өндөр байна?" -> {"is_transaction": false, "success": true, "error_message": null, "item_name": null, "quantity": null, "type": null, "notes": null}
  `;

  
const keys = getApiKeys();
  let responseText = "";
  let lastError = "";

  // 🚀 Түлхүүрүүд дундуур гүйж 401/429 алдаанаас сэргийлэх
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIdx = (geminiLibKeyIndex + attempt) % keys.length;
    const currentKey = keys[keyIdx];

    try {
      const ai = new GoogleGenerativeAI(currentKey);
      const model = ai.getGenerativeModel({ 
        model: 'gemini-3.6-flash',
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      });
        const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `System: ${systemPrompt}\n\nUser Message: "${text}"` }] }]
      });
      responseText = response.response.text();
      if (responseText) {
        geminiLibKeyIndex  = keyIdx;
        break;
      }
    } catch (e: any) {
           lastError = e.message || String(e);
            console.warn(`parseOperationalText: Түлхүүр #${keyIdx + 1} 429 алдаа, дараагийн түлхүүр...`);
            geminiLibKeyIndex = (keyIdx + 1) % keys.length;
            continue;
    }
  }

  if (!responseText) {
    return { is_transaction: false, success: false, error_message: lastError };
  }

  try {
        return JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (e) {
      return { is_transaction: false, success: false, error_message: "JSON уншиж чадсангүй." };
  }
}

export async function parseReceiptImage(base64Image: string, ingredientsList: string[]) {
 const systemPrompt = `
    You are an expert F&B data entry assistant. Read the provided receipt or image carefully.

    1. IMAGE CLASSIFICATION:
       - If it contains a QR code, barcode, or printed thermal receipt text -> "image_type": "E-Barimt", "is_ebarimt": true.
       - If it is a physical photo of product packaging/goods without receipt -> "image_type": "Product Photo", "is_ebarimt": false.

    2. FOOD VS NON-FOOD:
       - FOOD INGREDIENTS (Milk, Coffee, Syrup, Puree, Fruits, Meat, Eggs, Flour, Sugar, Bread, Cheese):
         * Map to closest match in: [${ingredientsList.join(', ')}]. If not in list, keep the raw food name (it will be auto-created in inventory).
         * Set "is_food": true.
       - NON-FOOD CONSUMABLES (Napkins, dish soap, detergent, trash bags, cups, lids, cleaning sponge):
         * Keep original name.
         * Set "is_food": false (This goes directly to OPEX).

    3. PAYMENT METHOD:
       - If receipt states Cash ("Бэлнээр", "Бэлэн") -> "payment_method": "cash".
       - If Card / QPay / Bank ("Бэлэн бус", "Карт", "Хаан банк") -> "payment_method": "bank".
       - Default to "bank" if not specified.

    Respond STRICTLY with a JSON object:
    {
      "success": true,
      "error_message": null,
      "purchases": [
        {
          "item_name": "Raspberry Puree",
          "quantity": 2,
          "total_cost": 45000,
          "is_food": true,
          "is_ebarimt": true,
          "payment_method": "bank",
          "image_type": "E-Barimt",
          "notes": ""
        }
      ]
    }
  `;

  const keys = getApiKeys();
  let responseText = "";
  let lastError = "";

  // 🚀 Түлхүүрүүд дундуур гүйж 401/429 алдаанаас сэргийлэх
 for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIdx = (geminiLibKeyIndex + attempt) % keys.length;
    const currentKey = keys[keyIdx];
  // 
    try {
      const ai = new GoogleGenerativeAI(currentKey);
      const model = ai.getGenerativeModel({ 
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.1, // Баримт үнэн зөв, хурдан уншихад хамгийн тохиромжтой
          responseMimeType: "application/json" // Илүү текст үүсгэхгүй шууд 0.8с-д JSON буцаана
        }
      });

      const response = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: systemPrompt },
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
          ]
        }]
      });

      responseText = response.response.text();
      if (responseText) {
        geminiLibKeyIndex = keyIdx;
        break;
      }
    } catch (e: any) {
      lastError = e.message || String(e);
      console.warn(`parseOperationalText: Түлхүүр #${keyIdx + 1} 429 алдаа, дараагийн түлхүүр...`);
      geminiLibKeyIndex = (keyIdx + 1) % keys.length;
      continue;
    }
  }

  if (!responseText) {
    return { success: false, error_message: lastError };
  }

  try {
    return JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse receipt image:", e);
    return { success: false, error_message: "Зургийг уншиж чадсангүй. Арай тод дарж дахин илгээнэ үү." };
  }
}