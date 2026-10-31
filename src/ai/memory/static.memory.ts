import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function searchStoreRules(clientId: string, query: string, limit = 5) {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  

  
  // Convert the text query into a mathematical vector
  const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const { embedding } = await embeddingModel.embedContent({
    content: { role: "user", parts: [{ text: query }] }, 
    taskType: TaskType.RETRIEVAL_QUERY,
  });
  // Call the pgvector RPC in Supabase
  const { data, error } = await supabaseAdmin.rpc("match_ai_memory", {
    p_client_id: clientId,
    p_query_embedding: embedding.values,
    p_match_count: limit,
    p_match_threshold: 0.3, // 30% similarity threshold
  });

  if (error || !data) {
    console.error("Vector search error:", error);
    return [];
  }

  // Filter out only the "fact" type memories
  return data
    .filter((m: any) => m.memory_type === "fact")
    .map((m: any) => ({ topic: m.topic, fact: m.content }));
}