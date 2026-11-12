import { z } from "zod";

const dates = {
  startDate: z.string().optional(),
  endDate: z.string().optional(),
};

export const FinancialSummarySchema = z.object({
  startDate: z.string().describe("ISO format YYYY-MM-DD or full timestamp"),
  endDate: z.string().describe("ISO format YYYY-MM-DD or full timestamp"),
});

export const InventoryAuditSchema = z.object({
  itemCategory: z.enum(["A", "B", "C", "ALL"]).optional().default("ALL"),
  onlyWaste: z.boolean().optional().default(false),
});

export const SemanticMemorySchema = z.object({
  query: z.string().min(1),
  matchCount: z.number().int().min(1).max(10).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

export const ExperienceLedgerSchema = z.object({
  topicOrSituation: z.string(),
  limit: z.number().int().min(1).max(5).optional(),
});

export const ProposedActionSchema = z.object({
  actionType: z.enum(["UPDATE_MENU_PRICE", "ORDER_STOCK", "CREATE_SOP_TASK"]),
  details: z.record(z.string(), z.any()),
  reasoning: z.string(),
});

const empty = z.object(dates).passthrough();

export const TOOL_SCHEMAS: Record<string, z.ZodTypeAny> = {
  skill_analyze_profitability: FinancialSummarySchema,
  skill_evaluate_pricing_strategy: empty,
  skill_reconcile_cashflow: FinancialSummarySchema,
  action_propose_price_change: z.object({
    productName: z.string().min(1),
    currentPrice: z.coerce.number().optional(),
    proposedPrice: z.coerce.number(),
    reason: z.string().min(1),
    marginImpact: z.string().optional(),
  }),
  skill_detect_fraud_and_leakage: FinancialSummarySchema.partial(),
  skill_forecast_procurement: empty,
  skill_review_shift_handovers: z.object({ limit: z.coerce.number().int().optional() }).passthrough(),
  action_create_staff_task: z.object({
    role: z.string().min(1),
    taskName: z.string().min(1),
    weight: z.coerce.number().optional(),
    reason: z.string().min(1),
  }),
  skill_analyze_staff_performance: FinancialSummarySchema.partial(),
  skill_search_business_memory: SemanticMemorySchema,
  action_save_business_rule: z.object({ topic: z.string().min(1), fact: z.string().min(1) }),
  action_record_business_lesson: z.object({
    situation: z.string().min(1),
    actionTaken: z.string().optional(),
    outcome: z.string().optional(),
    lesson: z.string().optional(),
    prediction: z.string().optional(),
    confidence: z.coerce.number().optional(),
    evidenceLogIds: z.array(z.string()).optional(),
  }),
  action_get_current_stock: empty,
  action_get_recipes: empty,
  action_get_menu: empty,
  action_get_opening_counts: z.object({ asOfDate: z.string().optional() }).passthrough(),
  skill_forecast_demand: empty,
  skill_menu_matrix: empty,
  action_propose_purchase_order: z.object({
    supplierName: z.string().min(1),
    lines: z.array(z.object({
      name: z.string().min(1),
      qty: z.coerce.number(),
      unit: z.string().optional(),
    })).min(1),
    note: z.string().optional(),
  }),
  skill_propose_shift_plan: z.object({
    laborTargetPct: z.coerce.number().min(5).max(60).optional(),
  }).passthrough(),
};
