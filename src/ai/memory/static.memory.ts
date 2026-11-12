import { GoogleGenerativeAI, TaskType } from "@/ai/geminiClient";
import { EMBEDDING_MODEL } from "@/ai/config/models";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exactClientId } from "@/core/auth/tenant";

export async function searchStoreRules(clientId: string, query: string, limit = 5) {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const { embedding } = await embeddingModel.embedContent({
    content: { parts: [{ text: query }] },
    taskType: TaskType.RETRIEVAL_QUERY,
  });
  const { data, error } = await supabaseAdmin.rpc("match_ai_memory", {
    p_client_id: exactClientId(clientId),
    p_query_embedding: embedding.values,
    p_match_count: limit,
    p_match_threshold: 0.3,
  });
  if (error || !data) return [];
  return data
    .filter((m: { memory_type?: string }) => !m.memory_type || m.memory_type === "fact")
    .map((m: { topic?: string; fact?: string; content?: string }) => ({ topic: m.topic, fact: m.fact || m.content }));
}
