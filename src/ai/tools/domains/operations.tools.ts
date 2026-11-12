import { FunctionDeclaration, SchemaType } from "@/ai/geminiClient";

export const operationsDefs: FunctionDeclaration[] = [
  {
    name: "skill_detect_fraud_and_leakage",
    description:
      "TRIGGER THIS WHEN the user asks about: 'хаягдал' (waste/spoilage), 'хэн юу асгасан' (spills by worker), 'хулгай' (theft), 'зөрүү' (discrepancies). Audits inventory variances and unlogged losses.",
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
    name: "skill_forecast_procurement",
    description:
      "TRIGGER THIS WHEN the user asks about: 'юу захиалах' (what to order), 'нөөц дуусч байгаа' (low stock), 'PAR түвшин', or procurement forecasting based on 30-day velocity.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "skill_review_shift_handovers",
    description:
      "TRIGGER THIS WHEN the user asks about: 'ээлж' (shifts), 'Z-тайлан' (Z-reports), 'ээлж хүлээлцэлт', or shift checklist completions.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.INTEGER, description: "Number of recent shifts to inspect (default 5)" },
      },
    },
  },
  {
    name: "action_create_staff_task",
    description:
      "CALL THIS to propose creating a mandatory operational SOP task for restaurant staff. Generates an approval card for the owner.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        role: { type: SchemaType.STRING, description: "Target role (e.g. 'Бариста', 'Тогооч', 'Бүх ажилтан')" },
        taskName: { type: SchemaType.STRING, description: "Concise task description" },
        weight: { type: SchemaType.INTEGER, description: "Priority weight points (1-50)" },
        reason: { type: SchemaType.STRING, description: "Operational reasoning based on audit findings" },
      },
      required: ["role", "taskName", "reason"],
    },
  },
{
  name: "action_get_current_stock",
  description:
    "CALL THIS for current ingredient stock. Returns name, unit, unitPrice, and currentStock. Use it for ingredient prices and how much is left. Never guess.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
},
{
  name: "action_get_recipes",
  description:
    "CALL THIS for recipes. Returns each product with lines of ingredientName, amount, unit, and unitPrice. Never guess a recipe.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
},
{
  name: "action_get_menu",
  description:
    "CALL THIS for the menu: product name, category, and selling price. Never guess menu prices.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
},
{
  name: "action_get_opening_counts",
  description:
    "CALL THIS for the stock count at the start of a month. openingQty is the latest inventory count on or before asOfDate. null means no count exists. currentStock is today, not the opening count.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      asOfDate: { type: SchemaType.STRING, description: "YYYY-MM-DD. Use the 1st of the month. Omit for the 1st of this month." },
    },
  },
},
{
  name: "skill_forecast_demand",
  description: "CALL THIS to predict units per product for the next 7 days from weekday sales, skipping Mongolian holidays, and convert those units into prep quantities through recipes.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
},
{
  name: "skill_menu_matrix",
  description: "CALL THIS to classify each dish as star, plowhorse, puzzle, or dog from recipe cost and 30-day sales.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
},
{
  name: "action_propose_purchase_order",
  description: "CALL THIS to propose a purchase order. It is not sent until the owner approves it on the alerts panel.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      supplierName: { type: SchemaType.STRING },
      lines: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            qty: { type: SchemaType.NUMBER },
            unit: { type: SchemaType.STRING },
          },
          required: ["name", "qty"],
        },
      },
      note: { type: SchemaType.STRING },
    },
    required: ["supplierName", "lines"],
  },
},
];
