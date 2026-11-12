import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { GoogleGenerativeAI, TaskType } from "@/ai/geminiClient";
import { EMBEDDING_MODEL } from "@/ai/config/models";
import { exactClientId } from "@/core/auth/tenant";

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");
  return new GoogleGenerativeAI(apiKey);
}

export async function createEmbedding(
  text: string,
  taskType: string = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    taskType,
  });
  return result.embedding.values;
}

export async function searchBusinessMemory(
  clientId: string,
  query: string,
  matchCount = 5,
  threshold = 0.3
) {
  const id = exactClientId(clientId);
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const { embedding } = await model.embedContent({
    content: { parts: [{ text: query }] },
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  const { data, error } = await supabaseAdmin.rpc("match_ai_memory", {
    p_client_id: id,
    p_query_embedding: embedding.values,
    p_match_count: matchCount,
    p_match_threshold: threshold,
  });

  if (error || !data) {
    console.error("Vector search RPC error:", error);
    return [];
  }
  return data;
}

async function insertAlert(clientId: string, kind: string, title: string, body: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("alerts")
    .insert({
      client_id: exactClientId(clientId),
      kind,
      title,
      body,
      payload,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Does not write business_memory. The owner approves the alert first. */
export async function saveBusinessRule(clientId: string, topic: string, fact: string) {
  const cleanTopic = topic.trim();
  const cleanFact = fact.trim();
  const id = await insertAlert(
    clientId,
    "rule",
    cleanTopic,
    cleanFact,
    { topic: cleanTopic, fact: cleanFact }
  );
  return { id, topic: cleanTopic, fact: cleanFact, action: "pending", status: "pending" };
}

export interface BusinessLessonInput {
  situation: string;
  actionTaken?: string;
  outcome?: string;
  lesson?: string;
  prediction?: string;
  confidence?: number;
  evidenceLogIds?: string[];
}

export async function recordBusinessLesson(clientId: string, exp: BusinessLessonInput) {
  const id = exactClientId(clientId);
  const evidenceLogIds = (exp.evidenceLogIds || []).filter((x) => typeof x === "string" && x.trim());
  if (evidenceLogIds.length > 0) {
    const { data: rows, error } = await supabaseAdmin
      .from("inventory_logs")
      .select("id")
      .eq("client_id", id)
      .in("id", evidenceLogIds);
    if (error) throw error;
    const found = new Set((rows || []).map((r) => r.id));
    const missing = evidenceLogIds.filter((logId) => !found.has(logId));
    if (missing.length > 0) {
      throw new Error("Evidence logs do not belong to this business");
    }
  }

  const alertId = await insertAlert(id, "lesson", exp.situation, exp.lesson || "", {
    situation: exp.situation,
    actionTaken: exp.actionTaken || null,
    outcome: exp.outcome || null,
    lesson: exp.lesson || null,
    prediction: exp.prediction || null,
    confidence: exp.confidence || null,
    evidenceLogIds,
    evidenceStatus: "reported",
  });

  return {
    id: alertId,
    situation: exp.situation,
    lesson: exp.lesson,
    status: "pending",
    evidenceLinked: evidenceLogIds.length,
    evidenceStatus: "reported",
  };
}

export async function approveBusinessRule(clientId: string, topic: string, fact: string) {
  const id = exactClientId(clientId);
  const fullContent = `${topic}: ${fact}`;
  const embedding = await createEmbedding(fullContent, TaskType.RETRIEVAL_DOCUMENT);
  const { data, error } = await supabaseAdmin
    .from("business_memory")
    .insert({
      client_id: id,
      topic: topic.trim(),
      fact: fact.trim(),
      embedding,
      embedding_model: EMBEDDING_MODEL,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
