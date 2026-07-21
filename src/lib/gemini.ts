import { GoogleGenerativeAI  } from '@google/generative-ai';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseOperationalText(text: string, ingredientsList: string[]) {
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `
    You are an expert F&B operations assistant. Your job is to parse unstructured text messages written by baristas or cooks in Mongolian or English, and convert them into a structured JSON log.
    
    You must map the ingredient mentioned to one of these exact allowed ingredient names:
    [${ingredientsList.join(', ')}]

    Rules:
    1. If the message is about waste/spoilage (e.g., "крем асгарчихлаа", "муудсан өндөг"), the quantity must be NEGATIVE.
    2. If the message is a new purchase (e.g., "Сүү авлаа", "bought milk"), the quantity must be POSITIVE.
    3. Standardize units: "литр/l" to "ml" (multiply by 1000), "кг/kg" to "gram" (multiply by 1000).
    4. Respond ONLY with a clean JSON object containing:
       - "item_name": (string, must match an allowed ingredient exactly)
       - "quantity": (number, negative for waste, positive for purchases)
       - "type": (string, either "spoilage", "purchase", "testing", or "staff_meal")
       - "notes": (string, brief explanation of the event in Mongolian)

    Example: "Оройн хоолонд 2 өндөг хэрэглэв" -> {"item_name": "Eggs", "quantity": -2, "type": "staff_meal", "notes": "Оройн хоолонд хэрэглэсэн"}
  `;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `System: ${systemPrompt}\n\nUser Message: "${text}"` }] }]
  });

  const responseText = response.response.text();
  try {
    return JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse Gemini response:", responseText);
    return null;
  }
}