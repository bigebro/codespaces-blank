// src/ai/memory/data_auditor.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createEmbedding } from "./memory.service";
import { MODELS } from "@/lib/ai/models";

interface AuditGroup {
  workerName: string;
  ingredientId: string;
  ingredientName: string;
  totalCost: number;
  totalQuantity: number;
  unit: string;
  logIds: string[];
}

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
  // ЧИГЛЭЛ 1: АЖИЛТНЫ ХАЯГДАЛ, АСГАРАЛТЫН АУДИТ
  // ============================================================================
  const wasteLogs = logs.filter((l) => ["spoilage", "staff_meal", "testing", "other"].includes(l.type));
  const groupedWaste = new Map<string, AuditGroup>();

  wasteLogs.forEach((log) => {
    const worker = (log.worker_name || "Үл мэдэгдэх").trim();
    const ingId = log.ingredient_id || "non_food";
    const groupKey = `${worker}::${ingId}`;
    const ing = ingMap.get(ingId);

    const current = groupedWaste.get(groupKey) || {
      workerName: worker,
      ingredientId: ingId,
      ingredientName: ing ? ing.name : "Бусад бараа",
      totalCost: 0,
      totalQuantity: 0,
      unit: ing ? ing.unit : "ш",
      logIds: [] as string[],
    };

    current.totalCost += Math.abs(Number(log.total_cost) || 0);
    current.totalQuantity += Math.abs(Number(log.quantity) || 0);
    current.logIds.push(log.id);

    groupedWaste.set(groupKey, current);
  });

  for (const group of Array.from(groupedWaste.values())) {
    const isCostAnomaly = group.totalCost > 10000; // 10,000₮-с дээш алдагдал
    const isCountAnomaly = group.logIds.length >= 3; // 3 ба түүнээс дээш хаягдал

    if (isCostAnomaly || isCountAnomaly) {
      const situation = "Хэвийн бус хаягдлын өсөлт илэрлээ.";
      const prediction = `${group.workerName} ажилтны ээлжинд ${group.ingredientName} их хэмжээгээр (${group.totalQuantity} ${group.unit}, нийт ${Math.round(group.totalCost).toLocaleString()}₮) хаягдсан байна.`;
      const lesson = `${group.workerName} ажилтны ${group.ingredientName} хэрэглээ, орцын стандарт болон Kiosk бүртгэлийг шалгах шаардлагатай.`;

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
            action_taken: "Шөнийн дата аудитор хаягдлын эрсдэлийг илрүүлж бүртгэв.",
            outcome: "Хаягдлын баримтууд холбогдсон.",
            lesson,
            confidence: isCostAnomaly && isCountAnomaly ? 0.95 : 0.8,
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
          title: `${group.ingredientName} хаягдал`,
          body: `${group.workerName}: ${group.totalQuantity} ${group.unit}, ${Math.round(group.totalCost).toLocaleString()}₮. ${lesson}`,
          impact: group.totalCost,
          evidenceLogIds: group.logIds,
        });
        const evidenceRows = group.logIds.map((logId) => ({
          client_id: clientId,
          experience_id: exp.id,
          inventory_log_id: logId,
          evidence_type: "spoilage_log", // 👈 Төрөл 1: Хаягдлын нотлох баримт
          note: `Хаягдал: ${group.ingredientName} (${group.workerName})`,
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