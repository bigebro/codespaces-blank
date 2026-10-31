// src/ai/memory/thread.manager.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getConversationThread(clientId: string, limit: number = 8) {
  const { data, error } = await supabaseAdmin
    .from("ai_chat_messages")
    .select("role, content")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];

  // Хуучнаас шинэ рүү эрэмбэлэх
  const raw = data.reverse();
  const sanitized: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];

  let expectedRole: "user" | "model" = "user";

  for (const msg of raw) {
    const role = msg.role === "owner" ? "user" : "model";
    if (!msg.content || !msg.content.trim()) continue;

    // Түүхийн эхний мессеж заавал "user" байх ёстой
    if (sanitized.length === 0 && role !== "user") continue;

    // Зөвхөн ээлжилж байгааг нь түүхэнд авна (user -> model -> user -> model)
    if (role === expectedRole) {
      sanitized.push({
        role,
        parts: [{ text: msg.content.trim() }],
      });
      expectedRole = expectedRole === "user" ? "model" : "user";
    }
  }

  // Түүхийн сүүлчийн мессеж заавал "model" байх ёстой (Шинэ мессеж нь "user" болох тул)
  if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === "user") {
    sanitized.pop();
  }

  return sanitized;
}

export async function recordChatMessage(clientId: string, role: "owner" | "ai", content: string) {
  if (!content || !content.trim()) return;
  await supabaseAdmin.from("ai_chat_messages").insert([{ client_id: clientId, role, content: content.trim() }]);
}