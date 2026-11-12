import { cfoSkills } from "@/ai/tools/skills.network";
import { getVitals } from "@/core/packages/pkg_vitals";
import { AgentContext } from "@/types/agent.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runWeeklyBrief } from "@/core/packages/pkg_weekly_brief";
import { exactClientId } from "@/core/auth/tenant";
import { runToolLoop } from "./runToolLoop";

export async function runCfoAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
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

  let briefBody = "";
  try {
    const { data: latestBrief } = await supabaseAdmin
      .from("weekly_briefs")
      .select("body, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const isStale = !latestBrief || (Date.now() - new Date(latestBrief.created_at).getTime() > 7 * 24 * 60 * 60 * 1000);
    briefBody = isStale ? await runWeeklyBrief(clientId) : (latestBrief?.body || "");
  } catch (err) {
    console.warn("[WEEKLY BRIEF] skip:", err);
  }

  const weeklyBriefPromptText = briefBody
    ? `\n[LAST SAVED WEEK BRIEF (Note: Saved operational snapshot, NOT live numbers)]:\n${briefBody}\n`
    : "";

  const cfoSystemPrompt = `
You are the Operlink AI Chief Financial Officer for "${clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You analyze revenue, profitability, and margins. Use 'MNT' or '₮' for currency. Translate raw JSON keys into professional Mongolian text. Keep responses clinical, analytical, and highly structured using Markdown tables. If a price change is needed, call action_propose_price_change. Saving a rule creates a pending approval, not a live fact.

[TEMPORAL CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}

[FINANCIAL VITALS]:
- MTD Revenue: ${vitals.monthToDateRevenue.toLocaleString()} ₮
- Est. Net Profit: ${vitals.estimatedNetProfit.toLocaleString()} ₮ (WARNING: Rough 15% margin guess, NOT actual audited profit)
- Opening balances (NOT live till): Cash: ${vitals.currentCashBalance.toLocaleString()} ₮ | Bank: ${vitals.currentBankBalance.toLocaleString()} ₮
${weeklyBriefPromptText}
${businessRulesText}

[CATALOG RULE]:
If asked for a recipe, menu, selling price, ingredient unit price, current stock, or stock at the start of the month, call the tool first: action_get_recipes, action_get_menu, action_get_current_stock, or action_get_opening_counts.
If the tool returns [], say that list is empty. Never say the table is missing before the tool runs.
openingQty null means no count was logged. Never use currentStock as the opening count.
`.trim();

  return runToolLoop({
    context: { ...context, clientId },
    userMessage,
    systemInstruction: cfoSystemPrompt,
    tools: cfoSkills,
    targetYear,
  });
}
