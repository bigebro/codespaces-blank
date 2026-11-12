import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { embedText, TaskType } from "@/lib/ai/genai";
import { MODELS } from "@/lib/ai/models";
import { filterEvidenceLogIds } from "@/ai/memory/evidence";

let cachedDim: number | null = null;

/** Reads the vector width `match_ai_memory` actually compares against. */
export async function embeddingDimensions(): Promise<number> {
  if (cachedDim) return cachedDim;
  const { data, error } = await supabaseAdmin.rpc("ai_memory_vector_dim");
  const dim = Number(data);
  cachedDim = !error && Number.isFinite(dim) && dim > 0 ? dim : MODELS.embeddingDim;
  return cachedDim;
}

export async function createEmbedding(
  text: string,
  taskType: string = TaskType.RETRIEVAL_DOCUMENT,
): Promise<number[]> {
  const dim = await embeddingDimensions();
  return embedText(text, taskType, dim);
}

export async function searchBusinessMemory(
  clientId: string,
  query: string,
  matchCount = 5,
  threshold = 0.3,
) {
  const embedding = await createEmbedding(query, TaskType.RETRIEVAL_QUERY);
  const { data, error } = await supabaseAdmin.rpc("match_ai_memory", {
    p_client_id: clientId,
    p_query_embedding: embedding,
    p_match_count: matchCount,
    p_match_threshold: threshold,
  });
  if (error || !data) {
    console.error("Vector search RPC error:", error);
    return [];
  }
  return data;
}

export async function saveBusinessRule(clientId: string, topic: string, fact: string) {
  const cleanTopic = topic.trim();
  const cleanFact = fact.trim();
  const embedding = await createEmbedding(`${cleanTopic}: ${cleanFact}`, TaskType.RETRIEVAL_DOCUMENT);

  const { data: existingRows } = await supabaseAdmin
    .from("business_memory")
    .select("id")
    .eq("client_id", clientId.trim())
    .eq("topic", cleanTopic)
    .order("updated_at", { ascending: false })
    .limit(1);

  const existing = existingRows?.[0] || null;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("business_memory")
      .update({
        fact: cleanFact,
        embedding,
        embedding_model: MODELS.embedding,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    await supabaseAdmin
      .from("business_memory")
      .delete()
      .eq("client_id", clientId.trim())
      .eq("topic", cleanTopic)
      .neq("id", existing.id);
    return { id: data.id, topic: cleanTopic, fact: cleanFact, action: "updated" };
  }

  const { data, error } = await supabaseAdmin
    .from("business_memory")
    .insert({
      client_id: clientId.trim(),
      topic: cleanTopic,
      fact: cleanFact,
      embedding,
      embedding_model: MODELS.embedding,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id, topic: cleanTopic, fact: cleanFact, action: "inserted" };
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
  const fullText = `Situation: ${exp.situation}\nAction: ${exp.actionTaken || ""}\nOutcome: ${exp.outcome || ""}\nLesson: ${exp.lesson || ""}`;
  let embedding: number[] | null = null;
  try {
    embedding = await createEmbedding(fullText, TaskType.RETRIEVAL_DOCUMENT);
  } catch (err) {
    console.warn("Embedding generation failed in recordBusinessLesson:", err);
  }

  const evidence = await filterEvidenceLogIds(clientId, exp.evidenceLogIds);

  const { data: insertedExp, error: expError } = await supabaseAdmin
    .from("business_experiences")
    .insert({
      client_id: clientId,
      situation: exp.situation,
      action_taken: exp.actionTaken || null,
      outcome: exp.outcome || null,
      lesson: exp.lesson || null,
      prediction: exp.prediction || null,
      confidence: exp.confidence || null,
      status: "resolved",
      evidence_status: evidence.verified ? "verified" : "reported",
      is_test: false,
      resolved_at: new Date().toISOString(),
      embedding,
      embedding_model: embedding ? MODELS.embedding : null,
    })
    .select("id")
    .single();

  if (expError || !insertedExp) throw expError;

  let linkedCount = 0;
  if (evidence.ids.length > 0) {
    const evidenceRows = evidence.ids.map((logId) => ({
      client_id: clientId,
      experience_id: insertedExp.id,
      inventory_log_id: logId,
      evidence_type: "agent_linked_evidence",
      note: "Evidence linked after owner approval",
    }));
    const { error: evidenceError } = await supabaseAdmin
      .from("business_experience_evidence")
      .insert(evidenceRows);
    if (evidenceError) console.error("Failed to insert evidence:", evidenceError);
    else linkedCount = evidenceRows.length;
  }

  return {
    id: insertedExp.id,
    situation: exp.situation,
    lesson: exp.lesson,
    evidenceLinked: linkedCount,
    verified: evidence.verified,
  };
}
