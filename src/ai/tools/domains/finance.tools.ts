import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const financeDefs: FunctionDeclaration[] = [
  {
    name: "skill_analyze_profitability",
    description:
      "TRIGGER THIS WHEN the user asks about: 'цэвэр ашиг' (net profit), 'орлого' (revenue), 'P&L', 'COGS', 'татвар' (tax), 'зардлын бүтэц', or overall business health. Returns the complete financial ladder.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: "Start date in YYYY-MM-DD" },
        endDate: { type: SchemaType.STRING, description: "End date in YYYY-MM-DD" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "skill_evaluate_pricing_strategy",
    description:
      "TRIGGER THIS WHEN the user asks about: 'маржин' (margins), 'үнэ нэмэх' (price hikes), 'өртөг өссөн' (cost increases), or menu item profitability. Evaluates recipe cost-per-cup vs selling price and margin gaps.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "skill_reconcile_cashflow",
    description:
      "TRIGGER THIS WHEN the user asks about: 'бэлэн мөнгө' (cash), 'касс' (cash drawer), 'данс' (bank balance), 'таталт' (owner draws), or physical cash outflow/inflow reconciliation.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: "Start date in YYYY-MM-DD" },
        endDate: { type: SchemaType.STRING, description: "End date in YYYY-MM-DD" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "action_propose_price_change",
    description:
      "CALL THIS to propose updating a product's menu selling price. Generates an interactive approval proposal card for the owner.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productName: { type: SchemaType.STRING, description: "Exact menu product name" },
        currentPrice: { type: SchemaType.NUMBER, description: "Current price in MNT" },
        proposedPrice: { type: SchemaType.NUMBER, description: "Recommended new price in MNT" },
        reason: { type: SchemaType.STRING, description: "Forensic/financial reasoning for the change" },
        marginImpact: { type: SchemaType.STRING, description: "e.g. 'Margin increases from 55% to 78%'" },
      },
      required: ["productName", "proposedPrice", "reason"],
    },
  },
];