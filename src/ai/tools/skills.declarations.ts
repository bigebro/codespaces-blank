// src/ai/tools/skills.declarations.ts
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const allCfoSkills: FunctionDeclaration[] = [
  // A. Analytical Skills
  {
    name: "skill_analyze_profitability",
    description: "TRIGGER THIS WHEN the user asks about: 'цэвэр ашиг' (net profit), 'орлого' (revenue), 'P&L', 'COGS', 'татвар' (tax), 'зардлын бүтэц', or overall business health. Returns the financial ladder.",
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
    description: "TRIGGER THIS WHEN the user asks about: 'маржин' (margins), 'үнэ нэмэх' (price hikes), 'өртөг өссөн' (cost increases), or menu item profitability. Evaluates cost-per-cup vs selling price.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "skill_reconcile_cashflow",
    description: "TRIGGER THIS WHEN the user asks about: 'бэлэн мөнгө' (cash), 'касс' (cash register), 'данс' (bank balance), 'таталт' (owner draws), or where the physical money went.",
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
    name: "skill_detect_fraud_and_leakage",
    description: "TRIGGER THIS WHEN the user asks about: 'хаягдал' (waste), 'хэн юу асгасан' (spills), 'хулгай' (theft), 'зөрүү' (discrepancy). DO NOT use for revenue. Audits inventory waste.",
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
    name: "skill_analyze_staff_performance",
    description: "TRIGGER THIS WHEN the user asks about: 'цалин' (payroll), 'ажилчдын цаг' (staff hours), 'НДШ' (taxes), or worker mistakes/incidents.",
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
    description: "TRIGGER THIS WHEN the user asks about: 'юу захиалах' (what to order), 'үлдэгдэл' (stock levels), 'PAR', 'дуусч байгаа' (running out). Calculates suggested orders.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "skill_review_shift_handovers",
    description: "TRIGGER THIS WHEN the user asks about: 'ээлж' (shifts), 'Z-тайлан' (Z-reports), or 'ажлын даалгавар хийсэн үү' (SOP checklists).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.INTEGER, description: "Number of recent shifts to inspect (default 5)" },
      },
    },
  },

  // B. Memory Skills
  {
    name: "skill_search_business_memory",
    description: "TRIGGER THIS WHEN the user asks about past history, previous issues, supplier rules, or 'өмнө нь яасан бэ' (what did we do before). Searches vector memory.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "The concept or past issue to search for" },
        matchCount: { type: SchemaType.INTEGER, description: "Number of matches (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "action_save_business_rule",
    description: "CALL THIS to save a persistent, permanent rule about the business (e.g. 'Milk arrives at 9 AM'). Saves to vector memory.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: { type: SchemaType.STRING, description: "Brief title/topic" },
        fact: { type: SchemaType.STRING, description: "Detailed rule or fact to store" },
      },
      required: ["topic", "fact"],
    },
  },
  {
    name: "action_record_business_lesson",
    description: "CALL THIS to record a completed experiment or issue that was resolved, including the lesson learned for the future.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        situation: { type: SchemaType.STRING, description: "Context of the issue" },
        actionTaken: { type: SchemaType.STRING, description: "Action that was taken" },
        outcome: { type: SchemaType.STRING, description: "What happened" },
        lesson: { type: SchemaType.STRING, description: "The rule learned" },
      },
      required: ["situation", "lesson"],
    },
  },

  // C. Actuation Skills (Human-in-the-Loop UI Proposals)
  {
    name: "action_propose_price_change",
    description: "CALL THIS to generate a UI button for the owner to approve a menu price increase/change.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productName: { type: SchemaType.STRING, description: "Exact menu product name" },
        currentPrice: { type: SchemaType.NUMBER, description: "Current price in MNT" },
        proposedPrice: { type: SchemaType.NUMBER, description: "Recommended new price in MNT" },
        reason: { type: SchemaType.STRING, description: "Forensic reasoning for the proposed change" },
        marginImpact: { type: SchemaType.STRING, description: "e.g. 'Margin increases from 55% to 78%'" },
      },
      required: ["productName", "proposedPrice", "reason"],
    },
  },
  {
    name: "action_create_staff_task",
    description: "CALL THIS to generate a UI button for the owner to assign a new mandatory task (SOP) to staff.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        role: { type: SchemaType.STRING, description: "Target role (e.g. 'Бариста', 'Тогооч')" },
        taskName: { type: SchemaType.STRING, description: "Concise task description" },
        weight: { type: SchemaType.INTEGER, description: "Priority weight points (1-50)" },
        reason: { type: SchemaType.STRING, description: "Why this task is required" },
      },
      required: ["role", "taskName", "reason"],
    },
  },
];