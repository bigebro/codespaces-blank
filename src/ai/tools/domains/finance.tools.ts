import { FunctionDeclaration, SchemaType } from "@/lib/ai/genai";

export const financeDefs: FunctionDeclaration[] = [
  {
    name: "skill_analyze_profitability",
    description:
      "TRIGGER THIS WHEN the user asks about: 'цэвэр ашиг' (net profit), 'орлого' (revenue), 'P&L', 'COGS', 'татвар' (tax), 'зардлын бүтэц', 'recipes' or overall business health. Returns the complete financial ladder and recipes.",
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
  {
    name: "action_get_current_stock",
    description: "CALL THIS for current ingredient stock and unit price. Returns name, unit, unitPrice, currentStock. Never guess.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "action_get_recipes",
    description: "CALL THIS for recipes. Returns each product with ingredientName, amount, unit, and unitPrice. Never guess a recipe.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "action_get_menu",
    description: "CALL THIS for the menu: product name, category, and selling price. Never guess menu prices.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "action_get_opening_counts",
    description: "CALL THIS for stock at the start of a month. openingQty null means no count. currentStock is today, not the opening count.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        asOfDate: { type: SchemaType.STRING, description: "YYYY-MM-DD. Use the 1st of the month. Omit for the 1st of this month." },
      },
    },
  },
];
