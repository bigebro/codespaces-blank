import { GoogleGenerativeAI } from '@google/generative-ai';



// 🇲🇳 МОНГОЛ ХЭЛНИЙ ДУУ ХООЛОЙГ ТӨГС ТАНИХ СИСТЕМ
const MN_NUMBER_WORDS: Record<string, number> = {
  "тал": 0.5, "хагас": 0.5, "нэг": 1, "нэгэн": 1, "ганц": 1,
  "хоёр": 2, "гурав": 3, "дөрөв": 4, "тав": 5, "зургаа": 6,
  "долоо": 7, "найм": 8, "ес": 9, "арав": 10, "хорь": 20, "гуч": 30
};

export function advancedMongolianVoiceParser(rawText: string, ingredients: any[]) {
  let text = rawText.toLowerCase().trim();

  // 1. Амаар хэлсэн монгол тоог тоон цифр болгож хувиргах ("хоёр литр" -> "2 литр")
  for (const [word, val] of Object.entries(MN_NUMBER_WORDS)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(reg, val.toString());
  }

  // 2. Тоо болон нэгжийг салгах
  const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(л|литр|l|мл|ml|кг|kg|гр|грамм|gram|ш|ширхэг|хайрцаг|уут)?/);
  if (!numMatch) return null;

  let qty = parseFloat(numMatch[1]);
  const unitStr = numMatch[2] || '';
  if (['л', 'литр', 'l', 'кг', 'kg'].includes(unitStr)) {
    qty *= 1000;
  }

  // 3. Үйлдлийн төрлийг язгуураар таних (ямар ч нөхцөл залгагдсан ойлгоно)
  let type: 'spoilage' | 'purchase' | 'staff_meal' | 'testing' | null = null;
  if (/асг|мууд|гаш|хая|цуц|хагар|уна|дуус/.test(text)) type = 'spoilage';
  else if (/ава|авс|татан|ирл|нэм/.test(text)) type = 'purchase';
  else if (/хоол|идс|уусан/.test(text)) type = 'staff_meal';
  else if (/турш|амт/.test(text)) type = 'testing';

  if (!type) return null;

  // 4. Түүхий эдийг Монгол ба Англи нэршлээр олох
  let matchedIng = ingredients.find(ing => text.includes(ing.name.toLowerCase().trim()));
  
  if (!matchedIng) {
    const MN_SYNONYMS: Record<string, string[]> = {
      "Milk": ["сүү", "сү", "милк"],
      "Beans": ["кофе", "үр", "үрэл"],
      "Eggs": ["өндөг", "өндөгний"],
      "Bread": ["талх", "талхны", "булочка"],
      "Butter": ["масло", "цөцгийн тос"],
      "Sugar": ["сахар", "элсэн чихэр"],
      "Syrup": ["сироп", "чихэрлэг"],
      "Cheese": ["бяслаг", "чеддер", "сыр"]
    };

    for (const [engName, syns] of Object.entries(MN_SYNONYMS)) {
      if (syns.some(s => text.includes(s))) {
        matchedIng = ingredients.find(ing => ing.name.toLowerCase().includes(engName.toLowerCase()));
        if (matchedIng) break;
      }
    }
  }

  if (!matchedIng) return null;

  return {
    is_transaction: true,
    success: true,
    item_id: matchedIng.id,
    item_name: matchedIng.name,
    unit: matchedIng.unit,
    quantity: type === 'purchase' ? Math.abs(qty) : -Math.abs(qty),
    type: type,
    notes: `${rawText} (🎙️ Монгол дуут бүртгэл)`
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
const API_KEYS = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;
export async function parseOperationalText(text: string, ingredientsList: string[]) {

  const localResult = fastLocalParse(text, ingredientsList);
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

  let responseText = "";

  // 🚀 Түлхүүрүүд дундуур гүйж 401/429 алдаанаас сэргийлэх
  for (const key of API_KEYS) {
    const keyIdx = (currentKeyIndex + API_KEYS.indexOf(key)) % API_KEYS.length;
        const currentKey = API_KEYS[keyIdx];
    try {
      const ai = new GoogleGenerativeAI(currentKey);
      const model = ai.getGenerativeModel({ 
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
  }
});
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `System: ${systemPrompt}\n\nUser Message: "${text}"` }] }]
      });
      responseText = response.response.text();
      if (responseText) {
        currentKeyIndex = keyIdx;
        break;
      }
    } catch (e: any) {
      console.warn("parseOperationalText: Key failed, trying next key...", e.message);
    }
  }

  if (!responseText) {
    return {
      is_transaction: false,
      success: false,
      error_message: "Уучлаарай, гүйлгээг уншиж чадсангүй.",
      item_name: null,
      quantity: null,
      type: null,
      notes: null
    };
  }

  try {
    return JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse Gemini response:", responseText);
    return {
      is_transaction: false,
      success: false,
      error_message: "Уучлаарай, гүйлгээг уншиж чадсангүй.",
      item_name: null,
      quantity: null,
      type: null,
      notes: null
    };
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
  let responseText = "";

  // 🚀 Түлхүүрүүд дундуур гүйж 401/429 алдаанаас сэргийлэх
  for (const key of API_KEYS) {
    const keyIdx = (currentKeyIndex + API_KEYS.indexOf(key)) % API_KEYS.length;
        const currentKey = API_KEYS[keyIdx];
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
        currentKeyIndex = keyIdx;
        break;
      }
    } catch (e: any) {
      console.warn("parseReceiptImage: Key failed, trying next key...", e.message);
    }
  }

  if (!responseText) {
    return { success: false, error_message: "Зургийг уншиж чадсангүй." };
  }

  try {
    return JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse receipt image:", e);
    return { success: false, error_message: "Зургийг уншиж чадсангүй. Арай тод дарж дахин илгээнэ үү." };
  }
}