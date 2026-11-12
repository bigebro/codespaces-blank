import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, TaskType } from "../src/ai/geminiClient";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "../src/ai/config/models";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
if (!url || !key || !geminiKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY");
}

const db = createClient(url, key);
const ai = new GoogleGenerativeAI(geminiKey);
const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });

async function main() {
  const { data, error } = await db.from("business_memory").select("id, topic, fact, embedding_model");
  if (error) throw error;
  let updated = 0;
  for (const row of data || []) {
    if (row.embedding_model === EMBEDDING_MODEL) continue;
    const text = `${row.topic || ""}: ${row.fact || ""}`.trim();
    if (!text) continue;
    const embedded = await model.embedContent({
      content: { parts: [{ text }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
    if (embedded.embedding.values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Row ${row.id} embedding length ${embedded.embedding.values.length}, expected ${EMBEDDING_DIMENSIONS}`);
    }
    const { error: updateError } = await db.from("business_memory").update({
      embedding: embedded.embedding.values,
      embedding_model: EMBEDDING_MODEL,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (updateError) throw updateError;
    updated += 1;
  }
  console.log(`Re-embedded ${updated} business_memory rows at ${EMBEDDING_DIMENSIONS} dimensions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
