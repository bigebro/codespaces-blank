import { FunctionDeclaration } from "@/ai/geminiClient";
import { financeDefs } from "./domains/finance.tools";
import { operationsDefs } from "./domains/operations.tools";
import { hrDefs } from "./domains/hr.tools";
import { memoryDefs } from "./domains/memory.tools";

// Deduplicate helper based on tool name
function deduplicateTools(...toolArrays: FunctionDeclaration[][]): FunctionDeclaration[] {
  const map = new Map<string, FunctionDeclaration>();
  toolArrays.forEach((arr) => {
    arr.forEach((tool) => {
      if (tool.name && !map.has(tool.name)) {
        map.set(tool.name, tool);
      }
    });
  });
  return Array.from(map.values());
}

/**
 * THE SUBCONSCIOUS: The master repository of all skills in the platform.
 */
export const ALL_SKILLS: FunctionDeclaration[] = deduplicateTools(
  financeDefs,
  operationsDefs,
  hrDefs,
  memoryDefs
);

/**
 * CONSCIOUS AGENT SUBSETS:
 * Agent-specific slices preventing context window bloat and routing hallucinations.
 */

// CFO: Finance domain + Memory capabilities
export const cfoSkills: FunctionDeclaration[] = deduplicateTools(
  financeDefs,
  memoryDefs
);

// COO: Operations domain + Memory capabilities
export const cooSkills: FunctionDeclaration[] = deduplicateTools(
  operationsDefs,
  memoryDefs
);

// HR: HR domain + Memory capabilities
export const hrSkills: FunctionDeclaration[] = deduplicateTools(
  hrDefs,
  memoryDefs
);