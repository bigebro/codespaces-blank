import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function searchPastExperiences(clientId: string, topic: string, limit = 3) {
  // We only pull REAL (is_test = false) and COMPLETED (status = resolved) experiments
  const { data, error } = await supabaseAdmin
    .from("business_experiences")
    .select("situation, action_taken, outcome, lesson")
    .eq("client_id", clientId)
    .eq("is_test", false)
    .eq("status", "resolved")
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