import { GoogleGenerativeAI } from '@google/generative-ai';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseOperationalText(text: string, ingredientsList: string[]) {
  const model = ai.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const systemPrompt = `
    You are an expert F&B operations assistant. Your job is to parse unstructured text messages written by baristas or cooks in Mongolian or English, and convert them into a structured JSON log.
    
    You must map the ingredient mentioned to one of these exact allowed ingredient names:
    [${ingredientsList.join(', ')}]

    Rules:
    1. LANGUAGE & VALIDATION CHECK:
       - The input message MUST be written in Mongolian or English. If the language is unsupported, completely unreadable, or gibberish, return JSON with "success": false and a helpful error message in Mongolian in "error_message".
       - If the message does not contain any recognizable operational intent (like waste, purchase, staff meal, or testing), set "success": false and provide a helpful instructions message in "error_message".

    2. INGREDIENT MATCHING:
       - Try your best to match the ingredient to the allowed list. 
       - If you cannot find a reasonable match, set "success": false and set "error_message" to "Уучлаарай, '[user's item]' нэртэй түүхий эд бүртгэгдээгүй байна."

    3. COMMAND MAPPING & QUANTITY:
       - Spoilage / Waste (e.g., "крем асгарчихлаа", "хаягдал сүү", "муудсан өндөг"): Quantity must be NEGATIVE. Type must be "spoilage".
       - Purchase (e.g., "Сүү авлаа", "bought milk", "татан авалт"): Quantity must be POSITIVE. Type must be "purchase".
       - Staff Meal (e.g., "оройн хоолонд", "ажилчид хооллов"): Quantity must be NEGATIVE. Type must be "staff_meal".
       - Testing (e.g., "туршилтанд", "амталгаанд"): Quantity must be NEGATIVE. Type must be "testing".

    4. Standardize units: "литр/l" to "ml" (multiply by 1000), "кг/kg" to "gram" (multiply by 1000).

    5. Respond ONLY with a clean JSON object containing these exact keys:
       - "success": (boolean)
       - "error_message": (string or null, Mongolian error description if success is false)
       - "item_name": (string or null, must match allowed list exactly)
       - "quantity": (number or null, negative for waste/meals, positive for purchases)
       - "type": (string or null, "spoilage", "purchase", "testing", or "staff_meal")
       - "notes": (string or null, brief explanation of the event in Mongolian)

    Example: "Оройн хоолонд 2 өндөг хэрэглэв" -> {"success": true, "error_message": null, "item_name": "Eggs", "quantity": -2, "type": "staff_meal", "notes": "Оройн хоолонд хэрэглэсэн"}
  `;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `System: ${systemPrompt}\n\nUser Message: "${text}"` }] }]
  });

  const responseText = response.response.text();
  try {
    return JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse Gemini response:", responseText);
    return {
      success: false,
      error_message: "Уучлаарай, системийн алдаа гарлаа. Гүйлгээг уншиж чадсангүй.",
      item_name: null,
      quantity: null,
      type: null,
      notes: null
    };
  }
}