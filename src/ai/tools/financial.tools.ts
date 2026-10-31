import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const financialToolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_financial_summary",
    description: "Fetches P&L, Revenue, COGS, EBIT, and Margins for a given date range.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        endDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "get_waste_and_inventory_audit",
    description: "Fetches variance between theoretical recipe usage and physical inventory counts.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        endDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
      },
      required: ["startDate", "endDate"],
    },
  },
];