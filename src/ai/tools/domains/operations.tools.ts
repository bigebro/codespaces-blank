import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

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
    "CALL THIS when you need to retrieve the current recorded stock quantities of ingredients for the authenticated business. Returns each ingredient's name, unit of measurement, and current_stock quantity. Use this action when answering questions about how much of an ingredient is currently available, remaining ingredient quantities, or which ingredients are running low. Always use the returned data when reporting stock quantities. Never guess or assume stock levels.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
},

{
  name: "action_get_recipes",
  description:
    "CALL THIS when you need to retrieve the recorded recipes for the authenticated business. Returns each recipe's product name, ingredient ID, and ingredient amount. Use this action when answering questions about product recipes, which ingredients are used in a product, or how much of each ingredient is required. Always use the returned data when reporting recipe information. Never guess or assume recipe ingredients or quantities.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
}
];