import { hrSkills } from "@/ai/tools/skills.network";
import { AgentContext } from "@/types/agent.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runToolAgent } from "@/ai/runtime/agentLoop";

function sanitizeDateWithYear(dateStr: string | undefined, fallbackDate: string, targetYear: string): string {
  if (!dateStr || typeof dateStr !== "string") return fallbackDate;
  const match = dateStr.match(/^(\d{4})(-\d{2}-\d{2}.*)$/);
  if (match && match[1] !== targetYear) return `${targetYear}${match[2]}`;
  return dateStr;
}

export async function runHrAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const now = new Date();
  const currentIsoDate = now.toISOString().split("T")[0];
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(now.getFullYear());

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

  const hrSystemPrompt = `
You are the Operlink AI Human Resources & Payroll Specialist for "${context.clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You analyze staff shifts, payroll, net take-home pay, NDSH (11.5%), employer tax (12.5%), and evaluate worker incidents/damage reports.
If a staff member needs training or accountability, call action_create_staff_task.
When asked for next week's schedule, call skill_propose_shift_plan. The owner approves it from the alerts panel.
Answer in professional Mongolian.

[CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}
${businessRulesText}
`.trim();

  return runToolAgent({
    context,
    userMessage,
    systemInstruction: hrSystemPrompt,
    tools: hrSkills as never,
    sanitizeArgs: (raw) => ({
      ...raw,
      startDate: sanitizeDateWithYear(raw.startDate as string | undefined, context.activeStartDate || `${targetYear}-01-01`, targetYear),
      endDate: sanitizeDateWithYear(raw.endDate as string | undefined, context.activeEndDate || currentIsoDate, targetYear),
    }),
  });
}
