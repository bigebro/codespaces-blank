import { cooSkills } from "@/ai/tools/skills.network";
import { getVitals } from "@/core/packages/pkg_vitals";
import { AgentContext } from "@/types/agent.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exactClientId } from "@/core/auth/tenant";
import { runToolLoop } from "./runToolLoop";

export async function runCooAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const now = new Date();
  const currentIsoDate = now.toISOString().split("T")[0];
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(now.getFullYear());
  const clientId = exactClientId(context.clientId);
  const vitals = await getVitals(clientId);

  const { data: rules } = await supabaseAdmin
    .from("business_memory")
    .select("topic, fact")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(8);

  const businessRulesText = rules && rules.length > 0
    ? "\n[UNVERIFIED STORED CLAIMS (Auto-observed)]:\n" +
      rules.map((r) => `- ${r.topic}: ${r.fact}`).join("\n") +
      "\n*CONFLICT RULE: If a stored claim conflicts with a tool result or the numbers above, trust the tool and the numbers. State that the stored claim may be outdated.*"
    : "";

  const { data: openLessons } = await supabaseAdmin
    .from("business_experiences")
    .select("situation, lesson")
    .eq("client_id", clientId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(3);

  const openLessonsText = openLessons && openLessons.length > 0
    ? "\n[OPEN DATA LESSONS (From Nightly Audits)]:\n" +
      openLessons.map((l) => `- Situation: ${l.situation}\n  Lesson: ${l.lesson}`).join("\n") +
      "\n*CONFLICT RULE: If an open lesson conflicts with a tool result or live data, trust the tool and the live data.*"
    : "";

  const cooSystemPrompt = `
You are the Operlink AI Chief Operating Officer for "${clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You manage inventory waste, staff accountability, and operational efficiency. If you detect unlogged waste, suggest checking CCTV or confronting the shift worker. If a new SOP is needed, call action_create_staff_task. For the next 7 days of prep, call skill_forecast_demand. For what to buy, call skill_forecast_procurement then action_propose_purchase_order. For star/plowhorse/puzzle/dog, call skill_menu_matrix. Answer in professional Mongolian.

[OPERATIONAL CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}
- MTD LOGGED WASTE: ${vitals.totalLoggedWasteMNT.toLocaleString()} ₮
- ACTIVE SHIFT: ${vitals.activeShiftStatus.isOpen ? `Open (${vitals.activeShiftStatus.workerRole || "Staff"})` : "Closed"}
${businessRulesText}
${openLessonsText}

[FORENSIC LEAKAGE LOGIC]:
1. Proportional multi-item depletion with 0 POS sales -> Flag as potential cash theft / un-rung sales (recommend CCTV audit).
2. Recurring small deficits per unit -> Overpouring / grinder calibration error.
3. 1-2 random units missing -> Unlogged staff meal / dropped item on Kiosk.
4. Sudden bulk loss (carton/kg) -> Large spill or physical theft.

[CATALOG RULE]:
If asked for a recipe, menu, selling price, ingredient unit price, current stock, or stock at the start of the month, call the tool first: action_get_recipes, action_get_menu, action_get_current_stock, or action_get_opening_counts.
If the tool returns [], say that list is empty. Never say the table is missing before the tool runs.
openingQty null means no count was logged. Never use currentStock as the opening count.
`.trim();

  return runToolLoop({
    context: { ...context, clientId },
    userMessage,
    systemInstruction: cooSystemPrompt,
    tools: cooSkills,
    targetYear,
  });
}
