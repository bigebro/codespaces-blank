import { GoogleGenerativeAI } from '@google/generative-ai';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseOperationalText(text: string, ingredientsList: string[]) {
  const model = ai.getGenerativeModel({ model: 'gemini-3.6-flash' });

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

    Example 1: "10 л сүү асгав" -> {"is_transaction": true, "success": true, "error_message": null, "item_name": "Milk", "quantity": -10000, "type": "spoilage", "notes": "10 литр сүү асгасан"}
    Example 2: "Сүүний хаягдал сүүлийн үед яагаад өндөр байна?" -> {"is_transaction": false, "success": true, "error_message": null, "item_name": null, "quantity": null, "type": null, "notes": null}
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
  const model = ai.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const systemPrompt = `
    You are an expert F&B data entry assistant. Read the provided receipt or invoice image.
    Extract the purchased items, their quantities, and total costs.
    Map the extracted items ONLY to the closest match in this allowed ingredients list: [${ingredientsList.join(', ')}].
    If an item clearly does not match any food ingredient, you can keep its original name (it will be logged as non-food OPEX).
    
    Respond STRICTLY with a JSON object containing an array "purchases":
    {
      "success": true,
      "error_message": null,
      "purchases": [
        {
          "item_name": "Milk",
          "quantity": 10,
          "total_cost": 35000,
          "notes": "E-barimt scan"
        }
      ]
    }
    If you cannot read the image at all, set "success": false and explain in "error_message" in Mongolian.
  `;

  try {
    const response = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: systemPrompt },
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]
      }]
    });

    const responseText = response.response.text();
    return JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse receipt image:", e);
    return { success: false, error_message: "Зургийг уншиж чадсангүй. Арай тод дарж дахин илгээнэ үү." };
  }
}