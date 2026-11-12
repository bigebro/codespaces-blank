// src/ai/tools/domains/memory.tools.ts
import { FunctionDeclaration, SchemaType } from "@/lib/ai/genai";

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
      "CALL THIS to commit a persistent, permanent rule about the business (e.g. 'Сүү 3 дахь өдөр ирдэг') into vector memory.",
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
      "CALL THIS to record a completed business incident, experiment, outcome, and concluding rule learned for future audits. Hard evidence logs can be attached via evidenceLogIds.",
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