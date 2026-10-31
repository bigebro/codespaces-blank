import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const memoryToolDeclarations: FunctionDeclaration[] = [
  {
    name: "search_store_memory",
    description: "Searches verified persistent store habits, supplier schedules, and rules using semantic vector search.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Topic to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_past_experiences",
    description: "Retrieves past business experiments, recorded outcomes, and lessons learned.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topicOrSituation: { type: SchemaType.STRING, description: "The issue or experiment context" },
      },
      required: ["topicOrSituation"],
    },
  },
];