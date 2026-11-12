// src/ai/memory/data_auditor.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createEmbedding } from "./memory.service";
import { MODELS } from "@/lib/ai/models";
import { calculateMatchScore } from "@/lib/autoReconcile";

export type AuditFinding = {
  title: string;
  body: string;
  impact: number;
  evidenceLogIds: string[];
};

export async function runNightlyAuditForTenant(clientId: string): Promise<{ anomalies: number; evidence: number; findings: AuditFinding[] }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Өнгөрсөн 24 цагийн БҮХ төрлийн гүйлгээ (Хаягдал, Зөрчил, Татан авалт)-г татах
  const [
    { data: logs },
    { data: ingredients }
  ] = await Promise.all([
    supabaseAdmin
      .from("inventory_logs")
      .select("id, worker_name, ingredient_id, quantity, total_cost, type, incident_type, reported_against_worker, notes, date")
      .eq("client_id", clientId)
      .gte("date", twentyFourHoursAgo),
    supabaseAdmin
      .from("ingredients")
      .select("id, name, unit, unit_price")
      .eq("client_id", clientId),
  ]);

  if (!logs || logs.length === 0) return { anomalies: 0, evidence: 0, findings: [] };

  const ingMap = new Map((ingredients || []).map((i) => [i.id, i]));
  let anomalyCount = 0;
  let evidenceCount = 0;
  const findings: AuditFinding[] = [];

  // ============================================================================
  // ЧИГЛЭЛ 1: ТАЙЛБАРГҮЙ ҮЛДЭГДЛИЙН ЗӨРҮҮ (хаягдал бүртгэснийг буруутгахгүй)
  // ============================================================================
  const [{ data: recipes }, { data: sales }, { data: priorCounts }] = await Promise.all([
    supabaseAdmin.from("recipes").select("product_name, ingredient_id, amount").eq("client_id", clientId),
    supabaseAdmin.from("sales_logs").select("product_name, quantity_sold").eq("client_id", clientId).gte("date", twentyFourHoursAgo),
    supabaseAdmin
      .from("inventory_logs")
      .select("ingredient_id, quantity, date")
      .eq("client_id", clientId)
      .eq("type", "count")
      .lt("date", twentyFourHoursAgo)
      .gte("date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order("date", { ascending: false }),
  ]);

  const recipeByProduct = new Map<string, { ingredientId: string; amount: number }[]>();
  for (const recipe of recipes || []) {
    const key = String(recipe.product_name || "").trim().toLowerCase();
    if (!key || !recipe.ingredient_id) continue;
    const rows = recipeByProduct.get(key) || [];
    rows.push({ ingredientId: recipe.ingredient_id, amount: Number(recipe.amount) || 0 });
    recipeByProduct.set(key, rows);
  }
  const recipeKeys = Array.from(recipeByProduct.keys());
  const usedByIng = new Map<string, number>();
  for (const sale of sales || []) {
    const name = String(sale.product_name || "").trim().toLowerCase();
    const key = recipeByProduct.has(name)
      ? name
      : recipeKeys.find((candidate) => calculateMatchScore(name, candidate) >= 0.8);
    if (!key) continue;
    const sold = Number(sale.quantity_sold) || 0;
    for (const row of recipeByProduct.get(key) || []) {
      usedByIng.set(row.ingredientId, (usedByIng.get(row.ingredientId) || 0) + sold * row.amount);
    }
  }

  const startByIng = new Map<string, number>();
  for (const row of priorCounts || []) {
    if (!row.ingredient_id || startByIng.has(row.ingredient_id)) continue;
    startByIng.set(row.ingredient_id, Number(row.quantity) || 0);
  }

  const endByIng = new Map<string, { qty: number; time: number }>();
  const purchaseByIng = new Map<string, number>();
  const wasteByIng = new Map<string, number>();
  const evidenceByIng = new Map<string, string[]>();
  for (const log of logs) {
    if (!log.ingredient_id) continue;
    const ids = evidenceByIng.get(log.ingredient_id) || [];
    if (ids.length < 20) ids.push(log.id);
    evidenceByIng.set(log.ingredient_id, ids);
    if (log.type === "count") {
      const time = new Date(log.date).getTime();
      const prev = endByIng.get(log.ingredient_id);
      if (!prev || time >= prev.time) endByIng.set(log.ingredient_id, { qty: Number(log.quantity) || 0, time });
    } else if (log.type === "purchase") {
      purchaseByIng.set(log.ingredient_id, (purchaseByIng.get(log.ingredient_id) || 0) + Math.abs(Number(log.quantity) || 0));
    } else if (["spoilage", "staff_meal", "testing", "other"].includes(log.type)) {
      wasteByIng.set(log.ingredient_id, (wasteByIng.get(log.ingredient_id) || 0) + Math.abs(Number(log.quantity) || 0));
    }
  }

  for (const [ingredientId, end] of endByIng) {
    if (!startByIng.has(ingredientId)) continue;
    const ing = ingMap.get(ingredientId);
    if (!ing) continue;
    const start = startByIng.get(ingredientId) || 0;
    const purchased = purchaseByIng.get(ingredientId) || 0;
    const loggedOut = wasteByIng.get(ingredientId) || 0;
    const used = usedByIng.get(ingredientId) || 0;
    const gap = start + purchased - loggedOut - used - end.qty;
    const price = Number(ing.unit_price) || 0;
    const money = Math.abs(gap) * price;
    if (Math.abs(gap) < 0.01) continue;
    if (money < 10000 && !(price === 0 && Math.abs(gap) >= 50)) continue;

    const unit = ing.unit || "ш";
    const situation = "Тайлбаргүй үлдэгдлийн зөрүү илэрлээ.";
    const prediction = `${ing.name}: эхлэл ${start} ${unit}, орлого ${purchased}, бүртгэсэн зарлага ${loggedOut}, борлуулалтын онол ${Math.round(used)}, тооллого ${end.qty}. Зөрүү ${Math.round(gap * 100) / 100} ${unit}.`;
    const lesson = "Хаягдал бүртгэсэн ажилтныг буруутгахгүй. Зөрүүг дараагийн тооллого, орлого, орцоор шалгана.";

    let embedding: number[] | null = null;
    try {
      embedding = await createEmbedding(`${situation}\n${prediction}\n${lesson}`);
    } catch (e) {}

    const { data: exp } = await supabaseAdmin
      .from("business_experiences")
      .insert([
        {
          client_id: clientId,
          situation,
          prediction,
          action_taken: "Шөнийн аудитор тайлбаргүй зөрүүг бүртгэв. Хаягдлын бүртгэлийг шийтгэсэнгүй.",
          outcome: "Тооллого, орлого, зарлагын баримт холбогдсон.",
          lesson,
          confidence: 0.8,
          status: "open",
          evidence_status: "reported",
          is_test: false,
          embedding: embedding || null,
          embedding_model: embedding ? MODELS.embedding : null,
        },
      ])
      .select("id")
      .single();

    if (exp) {
      anomalyCount++;
      const evidenceLogIds = evidenceByIng.get(ingredientId) || [];
      findings.push({
        title: `Тайлбаргүй зөрүү: ${ing.name}`,
        body: `${prediction} ${lesson}`,
        impact: Math.round(money),
        evidenceLogIds,
      });
      if (evidenceLogIds.length > 0) {
        const evidenceRows = evidenceLogIds.map((logId) => ({
          client_id: clientId,
          experience_id: exp.id,
          inventory_log_id: logId,
          evidence_type: "stock_gap",
          note: `Тайлбаргүй зөрүү: ${ing.name}`,
        }));
        await supabaseAdmin.from("business_experience_evidence").insert(evidenceRows);
        evidenceCount += evidenceRows.length;
      }
    }
  }

  // ============================================================================
  // ЧИГЛЭЛ 2: ЭЭЛЖ ХООРОНДЫН ЗӨРЧИЛ, ГОМДЛЫН АУДИТ (CROSS-SHIFT INCIDENTS)
  // ============================================================================
  const incidentLogs = logs.filter((l) => l.incident_type === "previous_shift_damage");
  for (const inc of incidentLogs) {
    const reporter = inc.worker_name || "Ажилтан";
    const accused = inc.reported_against_worker || "Өмнөх ээлж";
    const ing = ingMap.get(inc.ingredient_id);
    const itemName = ing ? ing.name : "Тоног төхөөрөмж/Бараа";

    const situation = "Ээлж хүлээлцэх үеийн зөрчил, гэмтэл бүртгэгдлээ.";
    const prediction = `${reporter} ажилтан өмнөх ээлжийн ${accused}-ийг [${itemName}] дээр дараах зөрчил гаргасан гэж нотолсон: "${inc.notes || "Тайлбаргүй"}"`;
    const lesson = `${accused} ажилтантай ээлж хүлээлцэх хариуцлагын асуудлаар тусгайлан уулзаж ярилцах шаардлагатай.`;

    let embedding: number[] | null = null;
    try {
      embedding = await createEmbedding(`${situation}\n${prediction}\n${lesson}`);
    } catch (e) {}

    const { data: exp } = await supabaseAdmin
      .from("business_experiences")
      .insert([
        {
          client_id: clientId,
          situation,
          prediction,
          action_taken: "Ээлж хоорондын маргаан, эвдрэлийг шөнийн аудитор бүртгэж авав.",
          outcome: "Нотлох зураг ба лог холбогдсон.",
          lesson,
          confidence: 0.9,
          status: "open",
          evidence_status: "reported",
          is_test: false,
          embedding: embedding || null,
          embedding_model: embedding ? MODELS.embedding : null,
        },
      ])
      .select("id")
      .single();

    if (exp) {
      anomalyCount++;
      findings.push({
        title: `Ээлжийн зөрчил: ${itemName}`,
        body: prediction,
        impact: Math.abs(Number(inc.total_cost) || 0),
        evidenceLogIds: [inc.id],
      });
      await supabaseAdmin.from("business_experience_evidence").insert([
        {
          client_id: clientId,
          experience_id: exp.id,
          inventory_log_id: inc.id,
          evidence_type: "incident_damage_proof", // 👈 Төрөл 2: Зөрчлийн нотлох баримт
          note: `Гомдол: ${reporter} -> ${accused}`,
        },
      ]);
      evidenceCount++;
    }
  }

  // ============================================================================
  // ЧИГЛЭЛ 3: ТҮҮХИЙ ЭДИЙН ҮНИЙН ОГЦОМ ӨСӨЛТИЙН АУДИТ (PRICE SPIKES)
  // ============================================================================
  const purchaseLogs = logs.filter((l) => l.type === "purchase" && l.ingredient_id && l.quantity > 0 && l.total_cost > 0);
  for (const pur of purchaseLogs) {
    const ing = ingMap.get(pur.ingredient_id);
    if (!ing || !ing.unit_price || Number(ing.unit_price) <= 0) continue;

    const boughtUnitPrice = Math.round(Number(pur.total_cost) / Number(pur.quantity));
    const oldUnitPrice = Number(ing.unit_price);

    // Хэрэв үнэ нь хуучин үнээсээ 15%-иас дээш өссөн байвал:
    if (boughtUnitPrice >= oldUnitPrice * 1.15) {
      const hikePct = Math.round(((boughtUnitPrice - oldUnitPrice) / oldUnitPrice) * 100);
      const situation = "Түүхий эдийн татан авалтын үнэ огцом өссөн байна.";
      const prediction = `[${ing.name}] түүхий эдийн хуучин өртөг ${oldUnitPrice.toLocaleString()}₮ байсан бол өнөөдрийн татан авалтаар ${boughtUnitPrice.toLocaleString()}₮ болж +${hikePct}% өсчээ.`;
      const lesson = `Энэ түүхий эд ордог цэсүүдийн зарах үнийг даруй шалгаж, маржин хамгаалагчаар үнэ нэмэх санал гаргах шаардлагатай.`;

      let embedding: number[] | null = null;
      try {
        embedding = await createEmbedding(`${situation}\n${prediction}\n${lesson}`);
      } catch (e) {}

      const { data: exp } = await supabaseAdmin
        .from("business_experiences")
        .insert([
          {
            client_id: clientId,
            situation,
            prediction,
            action_taken: "Нийлүүлэгчийн үнийн өсөлтийн дохиог шөнийн аудитор бүртгэж авав.",
            outcome: "Татан авалтын баримт холбогдсон.",
            lesson,
            confidence: 0.99,
            status: "open",
            evidence_status: "verified",
            is_test: false,
            embedding: embedding || null,
            embedding_model: embedding ? MODELS.embedding : null,
          },
        ])
        .select("id")
        .single();

      if (exp) {
        anomalyCount++;
        findings.push({
          title: `${ing.name} үнэ +${hikePct}%`,
          body: prediction,
          impact: Math.abs(boughtUnitPrice - oldUnitPrice) * Number(pur.quantity),
          evidenceLogIds: [pur.id],
        });
        await supabaseAdmin.from("business_experience_evidence").insert([
          {
            client_id: clientId,
            experience_id: exp.id,
            inventory_log_id: pur.id,
            evidence_type: "price_spike_evidence", // 👈 Төрөл 3: Үнийн өсөлтийн нотлох баримт
            note: `Үнийн өсөлт: ${oldUnitPrice}₮ -> ${boughtUnitPrice}₮ (+${hikePct}%)`,
          },
        ]);
        evidenceCount++;
      }
    }
  }

  findings.sort((a, b) => b.impact - a.impact);
  return { anomalies: anomalyCount, evidence: evidenceCount, findings: findings.slice(0, 3) };
}