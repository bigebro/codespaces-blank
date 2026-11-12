import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function runWeeklyBrief(rawClientId: string): Promise<string> {
  const clientId = (rawClientId || "").trim();
  if (!clientId) return "";

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: currSales },
    { data: prevSales },
    { data: currLogs },
    { data: prevLogs },
    { data: activeShift },
    { data: ingredients },
  ] = await Promise.all([
    supabaseAdmin.from("sales_logs").select("total_revenue").eq("client_id", clientId).gte("date", sevenDaysAgo),
    supabaseAdmin.from("sales_logs").select("total_revenue").eq("client_id", clientId).gte("date", fourteenDaysAgo).lt("date", sevenDaysAgo),
    supabaseAdmin.from("inventory_logs").select("total_cost, ingredient_id").eq("client_id", clientId).in("type", ["spoilage", "other", "testing", "staff_meal"]).gte("date", sevenDaysAgo),
    supabaseAdmin.from("inventory_logs").select("total_cost").eq("client_id", clientId).in("type", ["spoilage", "other", "testing", "staff_meal"]).gte("date", fourteenDaysAgo).lt("date", sevenDaysAgo),
    supabaseAdmin.from("shifts").select("character_role").eq("client_id", clientId).eq("is_active", true).limit(1).maybeSingle(),
    supabaseAdmin.from("ingredients").select("id, name").eq("client_id", clientId),
  ]);

  const currRev = (currSales || []).reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0);
  const prevRev = (prevSales || []).reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0);
  const revDiffPct = prevRev > 0 ? (((currRev - prevRev) / prevRev) * 100).toFixed(1) : "0";

  const currWaste = (currLogs || []).reduce((sum, l) => sum + Math.abs(Number(l.total_cost) || 0), 0);
  const prevWaste = (prevLogs || []).reduce((sum, l) => sum + Math.abs(Number(l.total_cost) || 0), 0);

  const ingMap = new Map((ingredients || []).map((i) => [i.id, i.name]));
  const itemWasteMap: Record<string, number> = {};
  (currLogs || []).forEach((l) => {
    const name = ingMap.get(l.ingredient_id) || "Бусад";
    itemWasteMap[name] = (itemWasteMap[name] || 0) + Math.abs(Number(l.total_cost) || 0);
  });
  const topWasteItem = Object.entries(itemWasteMap).sort((a, b) => b[1] - a[1])[0];
  const shiftStatus = activeShift ? `Нээлттэй (${activeShift.character_role})` : "Бүх ээлж хаагдсан";

  const briefBody = [
    `1. 7 хоногийн орлого: ${currRev.toLocaleString()}₮ (Өмнөх 7 хоногоос ${Number(revDiffPct) >= 0 ? "+" : ""}${revDiffPct}%)`,
    `2. Нийт хаягдал: ${currWaste.toLocaleString()}₮ (Өмнөх 7 хоногт: ${prevWaste.toLocaleString()}₮)`,
    `3. Хамгийн их хаягдсан: ${topWasteItem ? `${topWasteItem[0]} (${topWasteItem[1].toLocaleString()}₮)` : "Бүртгэгдээгүй"}`,
    `4. Идэвхтэй ээлж: ${shiftStatus}`,
    `5. Шалгах зүйл: ${currWaste > 50000 ? "Хаягдал 50,000₮ давсан. Kiosk бүртгэлээ шалга." : "Хаягдал 50,000₮-өөс доош."}`,
  ].join("\n");

  const weekStart = sevenDaysAgo.split("T")[0];

  await supabaseAdmin.from("weekly_briefs").delete().eq("client_id", clientId);
  await supabaseAdmin.from("weekly_briefs").insert([{
    client_id: clientId,
    week_start: weekStart,
    body: briefBody,
  }]);

  return briefBody;
}