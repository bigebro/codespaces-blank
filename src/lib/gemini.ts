import { GoogleGenerativeAI } from '@google/generative-ai';

// 💡 Түлхүүрүүдийг таслалаар аюулгүй салгаж авах
const API_KEYS = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;
export async function parseOperationalText(text: string, ingredientsList: string[]) {
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