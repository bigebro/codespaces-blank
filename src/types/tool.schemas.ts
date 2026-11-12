import { z } from "zod";

export const FinancialSummarySchema = z.object({
  startDate: z.string().describe("ISO format YYYY-MM-DD or full timestamp"),
  endDate: z.string().describe("ISO format YYYY-MM-DD or full timestamp"),
});

export const InventoryAuditSchema = z.object({
  itemCategory: z.enum(["A", "B", "C", "ALL"]).optional().default("ALL"),
  onlyWaste: z.boolean().optional().default(false),
});

export const SemanticMemorySchema = z.object({
  query: z.string().describe("Search query for store habits, rules, or supplier facts"),
  threshold: z.number().min(0).max(1).optional().default(0.4),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export const ExperienceLedgerSchema = z.object({
  topicOrSituation: z.string().describe("Keywords or situation to match past experiments against"),
  limit: z.number().int().min(1).max(5).optional().default(3),
});

export const ProposedActionSchema = z.object({
  actionType: z.enum(["UPDATE_MENU_PRICE", "ORDER_STOCK", "CREATE_SOP_TASK"]),
  details: z.record(z.string(), z.any()),
  reasoning: z.string().describe("Why this action is proposed based on evidence"),
});

const DateRange = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ToolSchemas = {
  skill_analyze_profitability: DateRange,
  skill_evaluate_pricing_strategy: z.object({}).passthrough(),
  skill_reconcile_cashflow: DateRange,
  action_propose_price_change: z.object({
    productName: z.string().min(1),
    currentPrice: z.number().optional(),
    proposedPrice: z.number(),
    reason: z.string().min(1),
    marginImpact: z.string().optional(),
  }),
  skill_detect_fraud_and_leakage: DateRange,
  skill_forecast_procurement: z.object({}).passthrough(),
  skill_review_shift_handovers: z.object({ limit: z.number().int().optional() }),
  action_create_staff_task: z.object({
    role: z.string().min(1),
    taskName: z.string().min(1),
    weight: z.number().optional(),
    reason: z.string().min(1),
  }),
  skill_analyze_staff_performance: DateRange,
  skill_search_business_memory: z.object({
    query: z.string().min(1),
    matchCount: z.number().int().optional(),
  }),
  action_save_business_rule: z.object({
    topic: z.string().min(1),
    fact: z.string().min(1),
  }),
  action_record_business_lesson: z.object({
    situation: z.string().min(1),
    actionTaken: z.string().optional(),
    outcome: z.string().optional(),
    lesson: z.string().optional(),
    prediction: z.string().optional(),
    confidence: z.number().optional(),
    evidenceLogIds: z.array(z.string()).optional(),
  }),
  action_get_current_stock: z.object({}).passthrough(),
  action_get_recipes: z.object({}).passthrough(),
  action_get_menu: z.object({}).passthrough(),
  action_get_opening_counts: z.object({ asOfDate: z.string().optional() }),
  skill_forecast_demand: z.object({}).passthrough(),
  skill_menu_matrix: z.object({}).passthrough(),
  skill_propose_shift_plan: z.object({
    laborTarget: z.number().min(0.05).max(0.8).optional(),
  }),
  action_propose_purchase_order: z.object({
    supplierId: z.string().optional(),
    note: z.string().optional(),
  }),
} as const;

export type ToolName = keyof typeof ToolSchemas;

export function parseToolArgs(toolName: string, args: unknown) {
  const schema = ToolSchemas[toolName as ToolName];
  if (!schema) return { ok: false as const, error: `No schema for tool '${toolName}'` };
  const parsed = schema.safeParse(args || {});
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true as const, data: parsed.data };
}
