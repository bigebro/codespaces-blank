import { FunctionDeclaration, SchemaType } from "@/lib/ai/genai";

export const hrDefs: FunctionDeclaration[] = [
  {
    name: "skill_analyze_staff_performance",
    description:
      "TRIGGER THIS WHEN the user asks about: 'цалин' (payroll), 'ажилчдын цаг' (staff hours worked), 'НДШ' (social insurance/taxes), or worker mistakes/incidents.",
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
    name: "action_create_staff_task",
    description:
      "CALL THIS to assign a training, disciplinary, or operational task to a specific staff member or department.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        role: { type: SchemaType.STRING, description: "Target worker name or role" },
        taskName: { type: SchemaType.STRING, description: "Concise task description" },
        weight: { type: SchemaType.INTEGER, description: "Priority weight points (1-50)" },
        reason: { type: SchemaType.STRING, description: "HR reasoning" },
      },
      required: ["role", "taskName", "reason"],
    },
  },
  {
    name: "skill_propose_shift_plan",
    description:
      "CALL THIS to propose next week's staff schedule from hourly sales and hourly rates, staying inside a labor-cost target. The owner approves it on the alerts panel.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        laborTarget: {
          type: SchemaType.NUMBER,
          description: "Labor cost as a fraction of forecast revenue, default 0.28",
        },
      },
    },
  },
];