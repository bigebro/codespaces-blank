import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Шөнийн аудитын сургамж 60 хоногоос хуучин бол хуучирсан гэж үзэж AI-д өгөхгүй. Асуудал давтагдвал аудитор шинэ мөр нэмдэг тул шинэ өгөгдөл баталсан сургамж үлдэнэ. */
export const LESSON_MAX_AGE_DAYS = 60;

export function lessonCutoffIso(now: number = Date.now()) {
  return new Date(now - LESSON_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function isLessonFresh(createdAt: string | null | undefined, now: number = Date.now()) {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && t >= now - LESSON_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export async function searchPastExperiences(clientId: string, topic: string, limit = 3) {
  // We only pull REAL (is_test = false) and COMPLETED (status = resolved) experiments
  const { data, error } = await supabaseAdmin
    .from("business_experiences")
    .select("situation, action_taken, outcome, lesson")
    .eq("client_id", clientId)
    .eq("is_test", false)
    .eq("status", "resolved")
    .gte("resolved_at", lessonCutoffIso())
    .order("resolved_at", { ascending: false })
    .limit(limit * 3); // Pull extra to filter locally

  if (error || !data || data.length === 0) return [];

  // Simple keyword relevance ranking
  const keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  const ranked = data.map((exp) => {
    const text = `${exp.situation} ${exp.action_taken} ${exp.outcome} ${exp.lesson}`.toLowerCase();
    const score = keywords.reduce((acc, k) => (text.includes(k) ? acc + 1 : acc), 0);
    return { ...exp, score };
  });

  // Return the top most relevant experiments
  return ranked
    .filter(exp => exp.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(exp => ({
      situation: exp.situation,
      action_taken: exp.action_taken,
      outcome: exp.outcome,
      lesson_learned: exp.lesson
    }));
}