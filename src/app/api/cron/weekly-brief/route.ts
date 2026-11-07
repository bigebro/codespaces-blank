import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createEmbedding } from "@/ai/memory/memory.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("client_id")
      .eq("status", "active");

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: "No active tenants" });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    for (const tenant of tenants) {
      const clientId = tenant.client_id;

      // 1. Сүүлийн 7 хоногийн өгөгдлийг татах
      const [{ data: sales }, { data: logs }] = await Promise.all([
        supabaseAdmin
          .from("sales_logs")
          .select("total_revenue, quantity_sold")
          .ilike("client_id", clientId)
          .gte("date", sevenDaysAgo),
        supabaseAdmin
          .from("inventory_logs")
          .select("total_cost, type, notes, ingredient_id")
          .ilike("client_id", clientId)
          .gte("date", sevenDaysAgo),
      ]);

      const rev = (sales || []).reduce((s, x) => s + (Number(x.total_revenue) || 0), 0);
      const waste = (logs || [])
        .filter((l) => ["spoilage", "other"].includes(l.type))
        .reduce((s, x) => s + Math.abs(Number(x.total_cost) || 0), 0);

      const briefPrompt = `
You are an executive operational auditor. Summarize this cafe's past 7 days into EXACTLY 2-3 concise Mongolian sentences:
- 7-Day Revenue: ${rev.toLocaleString()} MNT
- 7-Day Logged Waste: ${waste.toLocaleString()} MNT
- Waste event count: ${(logs || []).filter((l) => l.type === "spoilage").length}
State revenue trend, waste scale, and the #1 focus for next week. NO EMOJIS.
`;

      const aiRes = await model.generateContent(briefPrompt);
      const briefText = aiRes.response.text().trim();

      // 2. Хуучин 7 хоногийн товч дүгнэлтийг устгаад, шинийг оруулах (Хуучин хог үүсгэхгүй)
      await supabaseAdmin
        .from("business_memory")
        .delete()
        .ilike("client_id", clientId)
        .eq("topic", "WEEKLY_BRIEF");

      const embedding = await createEmbedding(briefText);

      await supabaseAdmin.from("business_memory").insert([
        {
          client_id: clientId,
          topic: "WEEKLY_BRIEF",
          fact: briefText,
          embedding,
          embedding_model: "text-embedding-004",
          updated_at: new Date().toISOString(),
        },
      ]);
    }

    return NextResponse.json({ success: true, processed: tenants.length });
  } catch (err: any) {
    console.error("Weekly brief cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}