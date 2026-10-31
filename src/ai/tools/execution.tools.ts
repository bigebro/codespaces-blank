// src/ai/tools/execution.tools.ts
import { AgentContext } from "@/types/agent.types";
import { getProfitabilityPackage, getCashflowPackage } from "@/core/packages/pkg_finance";
import { getPricingStrategyPackage, getProcurementForecastPackage } from "@/core/packages/pkg_inventory";
import {
  getFraudAndLeakagePackage,
  getStaffPerformancePackage,
  getShiftHandoversPackage,
} from "@/core/packages/pkg_operations";
import {
  searchBusinessMemory,
  saveBusinessRule,
  recordBusinessLesson,
} from "@/ai/memory/memory.service";

export async function executeAiTool(
  context: AgentContext,
  toolName: string,
  args: any
) {
  try {
    switch (toolName) {
      // 1. Profitability
      case "skill_analyze_profitability": {
        const data = await getProfitabilityPackage(context.clientId, args.startDate, args.endDate);
        return { success: true, data };
      }

      // 2. Pricing & Margins
      case "skill_evaluate_pricing_strategy": {
        const data = await getPricingStrategyPackage(context.clientId);
        return { success: true, data };
      }

      // 3. Cashflow
      case "skill_reconcile_cashflow": {
        const data = await getCashflowPackage(context.clientId, args.startDate, args.endDate);
        return { success: true, data };
      }

      // 4. Fraud & Leakage
      case "skill_detect_fraud_and_leakage": {
        const data = await getFraudAndLeakagePackage(context.clientId, args.startDate, args.endDate);
        return { success: true, data };
      }

      // 5. Staff Performance & Payroll
      case "skill_analyze_staff_performance": {
        const data = await getStaffPerformancePackage(context.clientId, args.startDate, args.endDate);
        return { success: true, data };
      }

      // 6. Procurement & Stock Levels
      case "skill_forecast_procurement": {
        const data = await getProcurementForecastPackage(context.clientId);
        return { success: true, data };
      }

      // 7. Shift Handovers
      case "skill_review_shift_handovers": {
        const data = await getShiftHandoversPackage(context.clientId, args.limit || 5);
        return { success: true, data };
      }

      // 8. Vector Memory Search
      case "skill_search_business_memory": {
        const data = await searchBusinessMemory(context.clientId, args.query, args.matchCount || 5);
        return { success: true, data };
      }

      // 9. Save Rule
      case "action_save_business_rule": {
        const data = await saveBusinessRule(context.clientId, args.topic, args.fact);
        return { success: true, data };
      }

      // 10. Record Lesson
      case "action_record_business_lesson": {
        const data = await recordBusinessLesson(context.clientId, {
          situation: args.situation,
          actionTaken: args.actionTaken,
          outcome: args.outcome,
          lesson: args.lesson,
        });
        return { success: true, data };
      }

      // 11. Propose Price Change (HUMAN-IN-THE-LOOP)
      case "action_propose_price_change": {
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "UPDATE_MENU_PRICE",
            status: "pending_human_approval",
            payload: {
              productName: args.productName,
              currentPrice: Number(args.currentPrice) || 0,
              proposedPrice: Number(args.proposedPrice),
              reason: args.reason,
              marginImpact: args.marginImpact || "",
            },
          },
        };
      }

      // 12. Create Staff Task (HUMAN-IN-THE-LOOP)
      case "action_create_staff_task": {
        return {
          success: true,
          data: {
            type: "PROPOSAL",
            actionType: "CREATE_STAFF_TASK",
            status: "pending_human_approval",
            payload: {
              role: args.role,
              taskName: args.taskName,
              weight: Number(args.weight) || 10,
              reason: args.reason,
            },
          },
        };
      }

      default:
        return { success: false, error: `Tool ${toolName} not recognized.` };
    }
  } catch (err: any) {
    console.error(`Tool Execution Error (${toolName}):`, err);
    return { success: false, error: err.message || "Execution error" };
  }
}