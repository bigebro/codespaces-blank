/**
 * Single source of truth for model ids.
 *
 * Embeddings: `text-embedding-004` was shut down in January 2026.
 * `gemini-embedding-001` replaces it. That model defaults to 3072 dimensions,
 * but `match_ai_memory` was built for the 768-d vectors produced by
 * text-embedding-004 (see supabase/migrations/20261112180000_security_billing_ops.sql,
 * function `ai_memory_vector_dim()`). We request that same width via
 * `outputDimensionality` so existing pgvector columns stay valid.
 * Values are NOT compatible across models — re-embed with
 * `node scripts/reembed-business-memory.mjs`.
 */
export const MODELS = {
  flash: process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash",
  embedding: "gemini-embedding-001",
  /** Fallback if `ai_memory_vector_dim()` is not deployed yet. */
  embeddingDim: 768,
} as const;
