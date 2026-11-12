import { AgentContext } from "@/types/agent.types";
import { getProfitabilityPackage, getCashflowPackage } from "@/core/packages/pkg_finance";
import { getPricingStrategyPackage, getProcurementForecastPackage } from "@/core/packages/pkg_inventory";
import {
  getFraudAndLeakagePackage,
  getStaffPerformancePackage,
  getShiftHandoversPackage,
  getIngredientStock,
  getRecipes,
  getMenu,
  getOpeningCounts,
} from "@/core/packages/pkg_operations";
import {
  searchBusinessMemory,
  saveBusinessRule,
  recordBusinessLesson,
} from "@/ai/memory/memory.service";
import { forecastDemand, menuMatrix, proposeShiftPlan } from "@/core/packages/pkg_planning";
import { TOOL_SCHEMAS } from "@/types/tool.schemas";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exactClientId } from "@/core/auth/tenant";

async function propose(clientId: string, kind: string, title: string, body: string, payload: Record<string, unknown>, actionType: string) {
  const { data, error } = await supabaseAdmin.from("alerts").insert({
    client_id: exactClientId(clientId),
    kind,
    title,
    body,
    payload,
    status: "pending",
  }).select("id").single();
  if (error) throw error;
  return {
    success: true,
    data: {
      type: "PROPOSAL",
      actionType,
      status: "pending_human_approval",
      alertId: data.id,
      payload,
    },
  };
}

export async function executeAiTool(context: AgentContext, toolName: string, args: unknown) {
  try {
    const schema = TOOL_SCHEMAS[toolName];
    if (!schema) {
      return { success: false, error: `Tool '${toolName}' has no schema.` };
    }
    const parsed = schema.safeParse(args || {});
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid tool arguments" };
    }
    const safe = parsed.data as Record<string, any>;

    switch (toolName) {
      case "skill_analyze_profitability":
        return { success: true, data: await getProfitabilityPackage(context.clientId, safe.startDate, safe.endDate) };
      case "skill_evaluate_pricing_strategy":
        return { success: true, data: await getPricingStrategyPackage(context.clientId) };
      case "skill_reconcile_cashflow":
        return { success: true, data: await getCashflowPackage(context.clientId, safe.startDate, safe.endDate) };
      case "action_propose_price_change":
        return propose(context.clientId, "price_change", safe.productName, safe.reason, {
          productName: safe.productName,
          currentPrice: Number(safe.currentPrice) || 0,
          proposedPrice: Number(safe.proposedPrice),
          reason: safe.reason,
          marginImpact: safe.marginImpact || "",
        }, "UPDATE_MENU_PRICE");
      case "skill_detect_fraud_and_leakage":
        return { success: true, data: await getFraudAndLeakagePackage(context.clientId, safe.startDate, safe.endDate) };
      case "skill_forecast_procurement":
        return { success: true, data: await getProcurementForecastPackage(context.clientId) };
      case "skill_review_shift_handovers":
        return { success: true, data: await getShiftHandoversPackage(context.clientId, safe.limit || 5) };
      case "action_create_staff_task":
        return propose(context.clientId, "task", safe.taskName, safe.reason, {
          role: safe.role,
          taskName: safe.taskName,
          weight: Number(safe.weight) || 10,
          reason: safe.reason,
        }, "CREATE_STAFF_TASK");
      case "skill_analyze_staff_performance":
        return { success: true, data: await getStaffPerformancePackage(context.clientId, safe.startDate, safe.endDate) };
      case "skill_search_business_memory":
        return { success: true, data: await searchBusinessMemory(context.clientId, safe.query, safe.matchCount || 5) };
      case "action_save_business_rule":
        return { success: true, data: await saveBusinessRule(context.clientId, safe.topic, safe.fact) };
      case "action_record_business_lesson":
        return { success: true, data: await recordBusinessLesson(context.clientId, {
          situation: String(safe.situation),
          actionTaken: safe.actionTaken,
          outcome: safe.outcome,
          lesson: safe.lesson,
          prediction: safe.prediction,
          confidence: safe.confidence,
          evidenceLogIds: safe.evidenceLogIds,
        }) };
      case "action_get_current_stock":
        return { success: true, data: await getIngredientStock(context.clientId) };
      case "action_get_recipes":
        return { success: true, data: await getRecipes(context.clientId) };
      case "action_get_menu":
        return { success: true, data: await getMenu(context.clientId) };
      case "action_get_opening_counts":
        return { success: true, data: await getOpeningCounts(context.clientId, safe.asOfDate) };
      case "skill_forecast_demand":
        return { success: true, data: await forecastDemand(context.clientId) };
      case "skill_menu_matrix":
        return { success: true, data: await menuMatrix(context.clientId) };
      case "action_propose_purchase_order":
        return propose(context.clientId, "purchase_order", safe.supplierName, safe.note || "Purchase order", {
          supplierName: safe.supplierName,
          lines: safe.lines,
          note: safe.note || "",
        }, "ORDER_STOCK");
      case "skill_propose_shift_plan":
        return propose(
          context.clientId,
          "shift_plan",
          "Дараа 7 хоногийн ээлж",
          "Хөдөлмөрийн зардал",
          await proposeShiftPlan(context.clientId, safe.laborTargetPct || 25),
          "SHIFT_PLAN"
        );
      default:
        return { success: false, error: `Tool '${toolName}' is not recognized in the switchboard.` };
    }
  } catch (err: any) {
    console.error(`[EXECUTION SWITCHBOARD ERROR] Tool '${toolName}':`, err);
    return { success: false, error: err.message || "Internal execution error" };
  }
}
