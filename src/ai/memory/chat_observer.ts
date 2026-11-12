// src/ai/memory/chat_observer.ts файлыг бүхэлд нь үүгээр солино:

import { GoogleGenerativeAI } from "@/lib/ai/genai";
import { MODELS } from "@/lib/ai/models";
import { createAlert } from "@/lib/alerts";

interface ObserverExtractionResponse {
  type: "NONE" | "RULE" | "LESSON";
  topic?: string;
  fact?: string;
  situation?: string;
  actionTaken?: string;
  outcome?: string;
  lessonLearned?: string;
}

const OBSERVER_PROMPT = `
You are a passive Memory Observer for a restaurant operating system.
Analyze the latest interaction between the Owner and the AI.

RULES:
1. If the user indicates a previous statement was wrong or provides a correction (e.g., uses words like "буруу", "биш", "үнэндээ", "засах"), extract the corrected standalone truth as "RULE" ONLY if the user explicitly provided the new fact. 
2. If the user only said "буруу" or complained without providing the corrected fact, return {"type": "NONE"}. NEVER INVENT OR GUESS THE FACT.
3. If no persistent rule or lesson is present, return {"type": "NONE"}.
4. Return STRICTLY a JSON object matching this schema:
{
  "type": "NONE" | "RULE" | "LESSON",
  "topic": "<short category e.g. 'Сүү', 'Татан авалт', 'Цагийн хуваарь'>",
  "fact": "<Clear, verified standalone rule in Mongolian>",
  "situation": "<Context if LESSON>",
  "lessonLearned": "<Permanent lesson in Mongolian if LESSON>"
}
`.trim();

export async function extractAndSaveMemoryInBackground(
  clientId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!apiKey || !userMessage.trim()) return;

  const isCorrectionKeyword = /буруу|биш|үнэндээ|засах/i.test(userMessage);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODELS.flash,
      systemInstruction: OBSERVER_PROMPT,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const promptPayload = `User said: "${userMessage}"\nAI replied: "${aiResponse}"`;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptPayload }] }],
    });

// chat_observer.ts доторх parsed авсны дараах хэсэг:
    const parsed = JSON.parse(result.response.text().trim()) as ObserverExtractionResponse;

   //  Хэрэв хэрэглэгч засвар хэлсэн бөгөөд дүрэм нь тодорхой байвал AI 'NONE' гэж буцаасан ч заавал хадгална:
    if (isCorrectionKeyword) {
      if (userMessage.trim().length < 12) return; //  12 тэмдэгтээс богино "Буруу" гэсэн үгийг хадгалахгүй!
      if (!parsed.topic || !parsed.fact || parsed.fact.trim().length < 4) return;
      await createAlert({
        clientId,
        kind: "memory_rule",
        title: `Дүрэм: ${parsed.topic}`,
        body: parsed.fact,
        payload: { topic: parsed.topic, fact: parsed.fact },
      });
      return;
    }

    if (parsed.type === "RULE" && parsed.topic && parsed.fact) {
      await createAlert({
        clientId,
        kind: "memory_rule",
        title: `Дүрэм: ${parsed.topic}`,
        body: parsed.fact,
        payload: { topic: parsed.topic, fact: parsed.fact },
      });
    } else if (parsed.type === "LESSON" && parsed.situation && parsed.lessonLearned) {
      await createAlert({
        clientId,
        kind: "memory_lesson",
        title: "Сургамж батлах",
        body: parsed.lessonLearned,
        payload: {
          situation: parsed.situation,
          actionTaken: parsed.actionTaken,
          outcome: parsed.outcome,
          lesson: parsed.lessonLearned,
          evidenceLogIds: [],
        },
      });
    }

  
  } catch (err) {
    console.warn("[CHAT OBSERVER] Silent background extraction skip:", err);
  }
}