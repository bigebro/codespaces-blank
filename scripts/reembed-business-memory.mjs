/**
 * Re-embed business_memory with gemini-embedding-001.
 * Width comes from public.ai_memory_vector_dim() (768 for the old text-embedding-004 column).
 *
 *   GEMINI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reembed-business-memory.mjs
 */
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
if (!url || !key || !apiKey) {
  console.error("Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const ai = new GoogleGenAI({ apiKey });

const { data: dimRaw } = await supabase.rpc("ai_memory_vector_dim");
const dim = Number(dimRaw) > 0 ? Number(dimRaw) : 768;
console.log(`match_ai_memory / business_memory.embedding width = ${dim}`);

const { data: rows, error } = await supabase
  .from("business_memory")
  .select("id, topic, fact")
  .limit(5000);
if (error) throw error;

let updated = 0;
for (const row of rows || []) {
  const text = `${row.topic}: ${row.fact}`;
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: dim },
  });
  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) {
    console.warn("empty embedding", row.id);
    continue;
  }
  const { error: updateError } = await supabase
    .from("business_memory")
    .update({
      embedding,
      embedding_model: "gemini-embedding-001",
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (updateError) console.error(row.id, updateError.message);
  else updated += 1;
}

console.log(`re-embedded ${updated} rows at ${dim} dimensions`);
