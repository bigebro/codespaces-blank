import { ubDay, ubDayEndIso, ubDayStartIso } from "@/lib/ubDate";
import { cfoSkills } from "@/ai/tools/skills.network";
import { getVitals } from "@/core/packages/pkg_vitals";
import { AgentContext } from "@/types/agent.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runToolAgent } from "@/ai/runtime/agentLoop";
import { isOverviewQuestion, overviewDateLine, resolveOverviewPeriod } from "@/ai/agents/overview";
import { MN_BUSINESS_SPELLING_NOTE } from "@/ai/runtime/mnSpelling";
import { getCachedAnalytics } from "@/lib/analyticsCache";
import {
  findNamedGrade,
  isGradeStatusQuestion,
  renderItemFactsBlock,
  renderOverviewFactsBlock,
  stripContradictingNumberLines,
} from "@/lib/dashboardFactsBlock";

export async function runCfoAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const now = new Date();
  const currentIsoDate = ubDay(now);
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(currentIsoDate.slice(0, 4));

  const overviewPeriod = resolveOverviewPeriod(
    userMessage,
    context.activeStartDate,
    context.activeEndDate,
    now,
  );
  const factsFirst = isOverviewQuestion(userMessage) || isGradeStatusQuestion(userMessage);
  const periodLine = overviewDateLine(overviewPeriod);

  const official = { text: "", itemName: "" };

  if (factsFirst) {
    return runToolAgent({
      context,
      userMessage,
      disableTools: true,
      historyLimit: 0,
      maxOutputTokens: 256,
      modelTimeoutMs: 15000,
      tools: [],
      preamble: "",
      numberGuard: (modelText) => stripContradictingNumberLines(modelText, official.text, official.itemName),
      prepareLeadingText: async () => {
        const data: any = await getCachedAnalytics(
          context.clientId,
          ubDayStartIso(overviewPeriod.startDay),
          ubDayEndIso(overviewPeriod.endDay),
        );
        const named = findNamedGrade(data?.grades || [], userMessage);
        official.itemName = named?.name || "";
        const body = named
          ? renderItemFactsBlock(named)
          : renderOverviewFactsBlock(data, overviewPeriod.label);
        official.text = `${periodLine}\n\n${body}`;
        return official.text;
      },
      systemInstruction: `
You are the Operlink AI Chief Financial Officer for "${context.clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. The user already sees the period's dashboard numbers above your reply. Do not repeat any figure, table, quantity, percent, or money amount. Do not write the item's start, end, waste, or unexplained gap again. Write at most two short Mongolian advice sentences. If you have nothing to add, write nothing.
${MN_BUSINESS_SPELLING_NOTE}
[TEMPORAL CONTEXT]: TODAY: ${currentIsoDate}. PERIOD: ${overviewPeriod.label} (${overviewPeriod.startDay} – ${overviewPeriod.endDay}, Asia/Ulaanbaatar).
`.trim(),
      sanitizeArgs: (raw) => ({
        ...raw,
        startDate: ubDayStartIso(overviewPeriod.startDay),
        endDate: ubDayEndIso(overviewPeriod.endDay),
      }),
    });
  }

  const [vitals, rulesResult, briefResult] = await Promise.all([
    getVitals(context.clientId),
    supabaseAdmin
      .from("business_memory")
      .select("topic, fact")
      .eq("client_id", context.clientId.trim())
      .order("updated_at", { ascending: false })
      .limit(8),
    supabaseAdmin
      .from("weekly_briefs")
      .select("body")
      .eq("client_id", context.clientId.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const rules = rulesResult.data;
  const businessRulesText = rules && rules.length > 0
    ? "\n[UNVERIFIED STORED CLAIMS (Auto-observed)]:\n" +
      rules.map((r) => `- ${r.topic}: ${r.fact}`).join("\n") +
      "\n*CONFLICT RULE: If a stored claim conflicts with a tool result or the numbers above, trust the tool and the numbers. State that the stored claim may be outdated.*"
    : "";
  const briefBody = briefResult.data?.body || "";
  const weeklyBriefPromptText = briefBody
    ? `\n[LAST SAVED WEEK BRIEF (Note: Saved operational snapshot, NOT live numbers)]:\n${briefBody}\n`
    : "";

  const cfoSystemPrompt = `
You are the Operlink AI Chief Financial Officer for "${context.clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You analyze revenue, profitability, and margins. Use 'MNT' or '₮' for currency. Translate raw JSON keys into professional Mongolian text. Keep responses clinical, analytical, and highly structured using Markdown tables. If a price change is needed, call action_propose_price_change.
${MN_BUSINESS_SPELLING_NOTE}

[TEMPORAL CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}
- OVERVIEW PERIOD: ${overviewPeriod.label} (${overviewPeriod.startDay} – ${overviewPeriod.endDay}, Asia/Ulaanbaatar)
- If OVERVIEW PERIOD is not today, do not write a «Өнөөдөр (YYYY-MM-DD)» heading. The system already prepends the period.
${weeklyBriefPromptText}
${businessRulesText}

[FINANCIAL VITALS]:
- MTD figures below are NOT the selected period. Do not quote them as facts for the question.
- MTD Revenue: ${vitals.monthToDateRevenue.toLocaleString()} ₮
- Est. Net Profit (WARNING: Rough 15% margin guess): ${vitals.estimatedNetProfit.toLocaleString()} ₮
- Opening balances (NOT live till): Cash ${vitals.currentCashBalance.toLocaleString()} ₮, Bank ${vitals.currentBankBalance.toLocaleString()} ₮

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
      startDate: ubDayStartIso(overviewPeriod.startDay),
      endDate: ubDayEndIso(overviewPeriod.endDay),
    }),
    preamble: `${periodLine}\n\n`,
  });
}
