import { ubDay, ubDayEndIso, ubDayStartIso } from "@/lib/ubDate";
import { cfoSkills } from "@/ai/tools/skills.network";
import { getVitals } from "@/core/packages/pkg_vitals";
import { AgentContext } from "@/types/agent.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runToolAgent } from "@/ai/runtime/agentLoop";
import { buildOverviewSnapshot, isOverviewQuestion, overviewDateLine, resolveOverviewPeriod } from "@/ai/agents/overview";
import { MN_BUSINESS_SPELLING_NOTE } from "@/ai/runtime/mnSpelling";


export async function runCfoAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const now = new Date();
  const currentIsoDate = ubDay(now); // Asia/Ulaanbaatar өдөр, UTC биш
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(currentIsoDate.slice(0, 4));

  const overviewPeriod = resolveOverviewPeriod(
    userMessage,
    context.activeStartDate,
    context.activeEndDate,
    now,
  );
  const overviewOnly = isOverviewQuestion(userMessage);
  const todaySnapshot = await buildOverviewSnapshot(context.clientId, overviewPeriod);

  let businessRulesText = "";
  let weeklyBriefPromptText = "";
  let vitalsBlock = "";
  if (!overviewOnly) {
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
    businessRulesText = rules && rules.length > 0
      ? "\n[UNVERIFIED STORED CLAIMS (Auto-observed)]:\n" +
        rules.map((r) => `- ${r.topic}: ${r.fact}`).join("\n") +
        "\n*CONFLICT RULE: If a stored claim conflicts with a tool result or the numbers above, trust the tool and the numbers. State that the stored claim may be outdated.*"
      : "";
    const briefBody = briefResult.data?.body || "";
    weeklyBriefPromptText = briefBody
      ? `\n[LAST SAVED WEEK BRIEF (Note: Saved operational snapshot, NOT live numbers)]:\n${briefBody}\n`
      : "";
    vitalsBlock = `
[FINANCIAL VITALS]:
- (MTD = сарын эхнээс өнөөдрийг хүртэл. Сонгосон хугацааны тоог MTD-тай бүү холь. «Өнөөдөр» гэсэн асуултад MTD-г өнөөдрийн тоо гэж хэлж болохгүй.)
- MTD figures below are NOT the selected period. Do not quote them as facts for the question.
- MTD Revenue (сарын эхнээс өнөөдрийг хүртэл, жишиг биш): ${vitals.monthToDateRevenue.toLocaleString()} ₮
- Est. Net Profit (WARNING: Rough 15% margin guess, NOT actual audited profit): ${vitals.estimatedNetProfit.toLocaleString()} ₮
- Opening balances (NOT live till): Cash ${vitals.currentCashBalance.toLocaleString()} ₮, Bank ${vitals.currentBankBalance.toLocaleString()} ₮
`;
  }

  const catalogRule = overviewOnly
    ? ""
    : `
[CATALOG RULE]:
If asked for a recipe, menu, selling price, ingredient unit price, current stock, or stock at the start of the month, call the tool first: action_get_recipes, action_get_menu, action_get_current_stock, or action_get_opening_counts.
If the tool returns [], say that list is empty. Never say the table is missing before the tool runs.
openingQty null means no count was logged. Never use currentStock as the opening count.
`;

  const cfoSystemPrompt = `
You are the Operlink AI Chief Financial Officer for "${context.clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You analyze revenue, profitability, and margins. Use 'MNT' or '₮' for currency. Translate raw JSON keys into professional Mongolian text. Keep responses clinical, analytical, and highly structured using Markdown tables. ${overviewOnly ? "Do not call tools. Answer only from the snapshot. Keep the answer short." : "If a price change is needed, call action_propose_price_change."}
${MN_BUSINESS_SPELLING_NOTE}

[TEMPORAL CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}
- OVERVIEW PERIOD: ${overviewPeriod.label} (${overviewPeriod.startDay} – ${overviewPeriod.endDay}, Asia/Ulaanbaatar)
- If OVERVIEW PERIOD is not today, do not write a «Өнөөдөр (YYYY-MM-DD)» heading. The system already prepends the period.
- Cite only the OVERVIEW PERIOD. Never name a second period (do not write both «Өнөөдөр» and «энэ сар»).
${vitalsBlock}
${todaySnapshot ? "\n" + todaySnapshot + "\n" : ""}
${weeklyBriefPromptText}
${businessRulesText}

[PERIOD NUMBERS]:
The overview snapshot already has the selected period's dashboard numbers, including logged waste and unexplained gap separately, plus start/end stock from the same function the dashboard uses. Do not add those two together into one gap. Do not label a count or variance as «бодит үлдэгдэл». If the snapshot has the numbers you need, do not call tools just to restate them. Period totals in төгрөг exclude Check/Missing (yellow) rows; read the item line for a yellow item instead of treating the period total as 0.
${catalogRule}
`.trim();

  return runToolAgent({
    context,
    userMessage,
    systemInstruction: cfoSystemPrompt,
    tools: overviewOnly ? [] : cfoSkills as never,
    disableTools: overviewOnly,
    historyLimit: overviewOnly ? 2 : 6,
    maxOutputTokens: overviewOnly ? 2048 : 3072,
    sanitizeArgs: (raw) => ({
      ...raw,
      startDate: ubDayStartIso(overviewPeriod.startDay),
      endDate: ubDayEndIso(overviewPeriod.endDay),
    }),
    preamble: `${overviewDateLine(overviewPeriod)}\n\n`,
  });
}
