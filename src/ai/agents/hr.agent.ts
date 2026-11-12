import { hrSkills } from "@/ai/tools/skills.network";
import { AgentContext } from "@/types/agent.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exactClientId } from "@/core/auth/tenant";
import { runToolLoop } from "./runToolLoop";

export async function runHrAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const now = new Date();
  const currentIsoDate = now.toISOString().split("T")[0];
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(now.getFullYear());
  const clientId = exactClientId(context.clientId);

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

  const hrSystemPrompt = `
You are the Operlink AI Human Resources & Payroll Specialist for "${clientId}".
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You analyze staff shifts, payroll, net take-home pay, NDSH (11.5%), employer tax (12.5%), and evaluate worker incidents/damage reports. If a staff member needs training or accountability, call action_create_staff_task. For next week's schedule, call skill_propose_shift_plan. Answer in professional Mongolian. Auth roles are only owner, manager, and staff. Job titles such as barista stay on the task, not as a new auth role.

[CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}
${businessRulesText}
`.trim();

  return runToolLoop({
    context: { ...context, clientId },
    userMessage,
    systemInstruction: hrSystemPrompt,
    tools: hrSkills,
    targetYear,
  });
}
