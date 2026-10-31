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