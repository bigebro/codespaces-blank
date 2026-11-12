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
import { searchBusinessMemory } from "@/ai/memory/memory.service";
import { createAlert } from "@/lib/alerts";
import { parseToolArgs } from "@/types/tool.schemas";
import {
  forecastDemand,
  menuMatrix,
  proposeShiftPlan,
  buildPurchaseProposal,
} from "@/ai/skills/restaurantSkills";

export async function executeAiTool(
  context: AgentContext,
  toolName: string,
  args: any
) {
  const parsed = parseToolArgs(toolName, args);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }
  const safe = parsed.data as Record<string, any>;

  try {
    switch (toolName) {
      case "skill_analyze_profitability": {
        const data = await getProfitabilityPackage(context.clientId, safe.startDate, safe.endDate);
        return { success: true, data };
      }

      case "skill_evaluate_pricing_strategy": {
        const data = await getPricingStrategyPackage(context.clientId);
        return { success: true, data };
      }

      case "skill_reconcile_cashflow": {
        const data = await getCashflowPackage(context.clientId, safe.startDate, safe.endDate);
        return { success: true, data };
      }

      case "action_propose_price_change": {
        const payload = {
          productName: safe.productName,
          currentPrice: Number(safe.currentPrice) || 0,
          proposedPrice: Number(safe.proposedPrice),
          reason: safe.reason,
          marginImpact: safe.marginImpact || "",
        };
        await createAlert({
          clientId: context.clientId,
          kind: "price_change",
          title: `Үнэ: ${payload.productName}`,
          body: payload.reason,
          payload,
        });
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "UPDATE_MENU_PRICE",
            status: "pending_human_approval",
            payload,
          },
        };
      }

      case "skill_detect_fraud_and_leakage": {
        const data = await getFraudAndLeakagePackage(context.clientId, safe.startDate, safe.endDate);
        return { success: true, data };
      }

      case "skill_forecast_procurement": {
        const data = await getProcurementForecastPackage(context.clientId);
        return { success: true, data };
      }

      case "skill_review_shift_handovers": {
        const data = await getShiftHandoversPackage(context.clientId, safe.limit || 5);
        return { success: true, data };
      }

      case "action_create_staff_task": {
        const payload = {
          role: safe.role,
          taskName: safe.taskName,
          weight: Number(safe.weight) || 10,
          reason: safe.reason,
        };
        await createAlert({
          clientId: context.clientId,
          kind: "staff_task",
          title: payload.taskName,
          body: payload.reason,
          payload,
        });
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "CREATE_STAFF_TASK",
            status: "pending_human_approval",
            payload,
          },
        };
      }

      case "skill_analyze_staff_performance": {
        const data = await getStaffPerformancePackage(context.clientId, safe.startDate, safe.endDate);
        return { success: true, data };
      }

      case "skill_search_business_memory": {
        const data = await searchBusinessMemory(context.clientId, safe.query, safe.matchCount || 5);
        return { success: true, data };
      }

      case "action_save_business_rule": {
        const payload = { topic: safe.topic, fact: safe.fact };
        await createAlert({
          clientId: context.clientId,
          kind: "memory_rule",
          title: `Дүрэм: ${safe.topic}`,
          body: safe.fact,
          payload,
        });
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "SAVE_BUSINESS_RULE",
            status: "pending_human_approval",
            payload,
          },
        };
      }

      case "action_record_business_lesson": {
        const payload = {
          situation: safe.situation,
          actionTaken: safe.actionTaken,
          outcome: safe.outcome,
          lesson: safe.lesson,
          prediction: safe.prediction,
          confidence: safe.confidence,
          evidenceLogIds: safe.evidenceLogIds || [],
        };
        await createAlert({
          clientId: context.clientId,
          kind: "memory_lesson",
          title: "Сургамж батлах",
          body: safe.lesson || safe.situation,
          payload,
          evidence: payload.evidenceLogIds,
        });
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "RECORD_BUSINESS_LESSON",
            status: "pending_human_approval",
            payload,
          },
        };
      }

      case "action_get_current_stock": {
        const data = await getIngredientStock(context.clientId);
        return { success: true, data };
      }

      case "action_get_recipes": {
        const data = await getRecipes(context.clientId);
        return { success: true, data };
      }

      case "action_get_menu": {
        return { success: true, data: await getMenu(context.clientId) };
      }

      case "action_get_opening_counts": {
        return { success: true, data: await getOpeningCounts(context.clientId, safe.asOfDate) };
      }

      case "skill_forecast_demand": {
        return { success: true, data: await forecastDemand(context.clientId) };
      }

      case "skill_menu_matrix": {
        return { success: true, data: await menuMatrix(context.clientId) };
      }

      case "skill_propose_shift_plan": {
        const plan = await proposeShiftPlan(context.clientId, safe.laborTarget);
        await createAlert({
          clientId: context.clientId,
          kind: "shift_plan",
          title: "Дараа долоо хоногийн ээлж",
          body: `Хөдөлмөрийн зардал ${plan.estimatedLaborCost.toLocaleString()}₮ / төсөв ${plan.laborBudget.toLocaleString()}₮`,
          payload: { ...plan, taskName: "Батлагдсан ээлжийн хуваарь", role: "Бүх ажилтан" },
        });
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "SHIFT_PLAN",
            status: "pending_human_approval",
            payload: plan,
          },
        };
      }

      case "action_propose_purchase_order": {
        const proposal = await buildPurchaseProposal(context.clientId, safe.supplierId);
        await createAlert({
          clientId: context.clientId,
          kind: "purchase_order",
          title: "Худалдан авалтын санал",
          body: `${proposal.lines.length} мөр, нийт ${proposal.totalCost.toLocaleString()}₮`,
          payload: {
            supplierId: proposal.supplier?.id || safe.supplierId || null,
            lines: proposal.lines,
            totalCost: proposal.totalCost,
            note: safe.note || "",
          },
        });
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "PURCHASE_ORDER",
            status: "pending_human_approval",
            payload: proposal,
          },
        };
      }

      default:
        return { success: false, error: `Tool '${toolName}' is not recognized in the switchboard.` };
    }
  } catch (err: any) {
    console.error(`[EXECUTION SWITCHBOARD ERROR] Tool '${toolName}':`, err);
    return { success: false, error: err.message || "Internal execution error" };
  }
}
