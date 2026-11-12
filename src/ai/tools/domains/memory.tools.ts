// src/ai/tools/domains/memory.tools.ts
import { FunctionDeclaration, SchemaType } from "@/ai/geminiClient";

export const memoryDefs: FunctionDeclaration[] = [
  {
    name: "skill_search_business_memory",
    description:
      "TRIGGER THIS WHEN the user asks about past history, previous issues, supplier rules, or 'өмнө нь яасан бэ' (what happened previously). Searches semantic vector memory.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "The concept, supplier, rule, or past experiment to search for",
        },
        matchCount: {
          type: SchemaType.INTEGER,
          description: "Number of matches (default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "action_save_business_rule",
    description:
      "CALL THIS to propose a business rule. It stays pending until the owner approves it. Do not tell the user it is already saved.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: {
          type: SchemaType.STRING,
          description: "Brief title/category (e.g. 'Татан авалт')",
        },
        fact: {
          type: SchemaType.STRING,
          description: "Detailed rule or verified operational fact to store permanently",
        },
      },
      required: ["topic", "fact"],
    },
  },
  {
    name: "action_record_business_lesson",
    description:
      "CALL THIS to propose a lesson. Evidence log ids are checked against this business. Nothing is marked verified until the owner approves it.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        situation: {
          type: SchemaType.STRING,
          description: "Context of the issue or discrepancy",
        },
        actionTaken: {
          type: SchemaType.STRING,
          description: "Action taken",
        },
        outcome: {
          type: SchemaType.STRING,
          description: "What happened",
        },
        lesson: {
          type: SchemaType.STRING,
          description: "The permanent rule learned",
        },
        evidenceLogIds: {
          type: SchemaType.ARRAY,
          description:
            "An array of specific inventory_log_id UUIDs that serve as hard evidence for this lesson. Pass these if you discovered anomalous logs during this conversation.",
          items: {
            type: SchemaType.STRING,
          },
        },
      },
      required: ["situation", "lesson"],
    },
  },
];