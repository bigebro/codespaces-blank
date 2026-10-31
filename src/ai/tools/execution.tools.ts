import { getAnalyticsData } from "@/lib/analytics";
import { searchStoreRules } from "@/ai/memory/static.memory";        // 👈 NEW
import { searchPastExperiences } from "@/ai/memory/ledger.memory";   // 👈 NEW
import { AgentContext } from "@/types/agent.types";

export async function executeAiTool(
  context: AgentContext,
  toolName: string,
  args: any
) {
  console.log(`🤖 AI is executing tool: ${toolName} with args:`, args);

  try {
    switch (toolName) {
      case "get_financial_summary":
        const pnlData = await getAnalyticsData(context.clientId, args.startDate, args.endDate);
        return {
          success: true,
          data: {
            financial_ladder: pnlData.financial_ladder,
            tax_summary: pnlData.tax_summary,
            margin_alerts: pnlData.margin_guard_alerts
          }
        };

      case "get_waste_and_inventory_audit":
        const auditData = await getAnalyticsData(context.clientId, args.startDate, args.endDate);
        return {
          success: true,
          data: {
            logged_spoilage_list: auditData.logged_spoilage_items || [],
            total_logged_spoilage_amount: auditData.total_logged_spoilage || 0,
            top_wasters: auditData.top_wasters,
            unexplained_waste: auditData.total_unexplained_waste,
            top_unexplained_wasters: auditData.top_wasters || [],
            worker_incidents: auditData.worker_fraud_matrix
          }
        };

      // ⚡ NEW: AI searches for static rules (Tier 2)
      case "search_store_rules":
        const rules = await searchStoreRules(context.clientId, args.query);
        return { success: true, data: rules };

      // ⚡ NEW: AI searches the empirical ledger (Tier 3)
      case "search_past_experiences":
        const experiences = await searchPastExperiences(context.clientId, args.topic);
        return { success: true, data: experiences };

      default:
        return { success: false, error: `Tool ${toolName} is not recognized.` };
    }
  } catch (err: any) {
    console.error(`Error executing tool ${toolName}:`, err);
    return { success: false, error: err.message };
  }
}