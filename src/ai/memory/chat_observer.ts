// src/ai/memory/chat_observer.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveBusinessRule, recordBusinessLesson } from "./memory.service";

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

Did the user state a permanent operational fact/rule? Or did they resolve an operational incident/lesson learned from real experience?

Return ONLY a valid JSON object matching this schema:
{
  "type": "NONE" | "RULE" | "LESSON",
  "topic": "<category/topic if RULE, e.g. 'Татан авалт', 'Бүртгэл'>",
  "fact": "<Clear standalone fact/rule in Mongolian if RULE>",
  "situation": "<Context of the incident if LESSON>",
  "actionTaken": "<Action taken or decided if LESSON>",
  "outcome": "<Result or outcome if LESSON>",
  "lessonLearned": "<Permanent business rule/lesson in Mongolian if LESSON>"
}

Rules:
- If no persistent knowledge is present, return { "type": "NONE" }.
- Do not invent facts not explicitly stated or confirmed by the user.
- Text must be in clean, professional Mongolian.
`.trim();

export async function extractAndSaveMemoryInBackground(
  clientId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!apiKey || !userMessage.trim()) return;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
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

    const raw = result.response.text().trim();
    const parsed = JSON.parse(raw) as ObserverExtractionResponse;

    if (parsed.type === "RULE" && parsed.topic && parsed.fact) {
      console.log(`[CHAT OBSERVER] Captured RULE for ${clientId}: [${parsed.topic}] ${parsed.fact}`);
      await saveBusinessRule(clientId, parsed.topic, parsed.fact);
    } else if (parsed.type === "LESSON" && parsed.situation && parsed.lessonLearned) {
      console.log(`[CHAT OBSERVER] Captured LESSON for ${clientId}: ${parsed.situation} -> ${parsed.lessonLearned}`);
      await recordBusinessLesson(clientId, {
        situation: parsed.situation,
        actionTaken: parsed.actionTaken || undefined,
        outcome: parsed.outcome || undefined,
        lesson: parsed.lessonLearned,
        evidenceLogIds: [], // Conversational memory starts with zero attached physical log IDs
      });
    }
  } catch (err) {
    // Non-blocking: background memory operations must never interrupt or throw to user threads
    console.warn("[CHAT OBSERVER] Silent background extraction skip:", err);
  }
}