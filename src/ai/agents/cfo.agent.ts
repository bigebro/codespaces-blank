import { cfoSkills } from "@/ai/tools/skills.network";
import { getVitals } from "@/core/packages/pkg_vitals";
import { AgentContext } from "@/types/agent.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runWeeklyBrief } from "@/core/packages/pkg_weekly_brief";
import { runToolAgent } from "@/ai/runtime/agentLoop";

function sanitizeDateWithYear(dateStr: string | undefined, fallbackDate: string, targetYear: string): string {
  if (!dateStr || typeof dateStr !== "string") return fallbackDate;
  const match = dateStr.match(/^(\d{4})(-\d{2}-\d{2}.*)$/);
  if (match && match[1] !== targetYear) return `${targetYear}${match[2]}`;
  return dateStr;
}

export async function runCfoAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const now = new Date();
  const currentIsoDate = now.toISOString().split("T")[0];
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(now.getFullYear());

  const vitals = await getVitals(context.clientId);

  const { data: rules } = await supabaseAdmin
    .from("business_memory")
    .select("topic, fact")
    .eq("client_id", context.clientId.trim())
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
      .eq("client_id", context.clientId.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const isStale = !latestBrief || (Date.now() - new Date(latestBrief.created_at).getTime() > 7 * 24 * 60 * 60 * 1000);
    briefBody = isStale ? await runWeeklyBrief(context.clientId.trim()) : (latestBrief?.body || "");
  } catch (err) {
    console.warn("[WEEKLY BRIEF] skip:", err);
  }

  const weeklyBriefPromptText = briefBody
    ? `\n[LAST SAVED WEEK BRIEF (Note: Saved operational snapshot, NOT live numbers)]:\n${briefBody}\n`
    : "";

  const cfoSystemPrompt = `
You are the Operlink AI Chief Financial Officer for "${context.clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You analyze revenue, profitability, and margins. Use 'MNT' or '₮' for currency. Translate raw JSON keys into professional Mongolian text. Keep responses clinical, analytical, and highly structured using Markdown tables. If a price change is needed, call action_propose_price_change.

[TEMPORAL CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}

[FINANCIAL VITALS]:
- MTD Revenue: ${vitals.monthToDateRevenue.toLocaleString()} ₮
- Est. Net Profit: ${vitals.estimatedNetProfit.toLocaleString()} ₮ (WARNING: Rough 15% margin guess, NOT actual audited profit)
- Opening balances (NOT live till): Cash ${vitals.currentCashBalance.toLocaleString()} ₮, Bank ${vitals.currentBankBalance.toLocaleString()} ₮
${weeklyBriefPromptText}
${businessRulesText}

[CATALOG RULE]:
If asked for a recipe, menu, selling price, ingredient unit price, current stock, or stock at the start of the month, call the tool first: action_get_recipes, action_get_menu, action_get_current_stock, or action_get_opening_counts.
If the tool returns [], say that list is empty. Never say the table is missing before the tool runs.
openingQty null means no count was logged. Never use currentStock as the opening count.
`.trim();

  return runToolAgent({
    context,
    userMessage,
    systemInstruction: cfoSystemPrompt,
    tools: cfoSkills as never,
    sanitizeArgs: (raw) => ({
      ...raw,
      startDate: sanitizeDateWithYear(
        raw.startDate as string | undefined,
        context.activeStartDate || `${targetYear}-01-01`,
        targetYear,
      ),
      endDate: sanitizeDateWithYear(
        raw.endDate as string | undefined,
        context.activeEndDate || currentIsoDate,
        targetYear,
      ),
    }),
  });
}
