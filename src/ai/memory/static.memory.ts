import { searchBusinessMemory } from "./memory.service";

export async function searchStoreRules(clientId: string, query: string, limit = 5) {
  const data = await searchBusinessMemory(clientId, query, limit, 0.3);
  return (data as { memory_type?: string; topic?: string; content?: string; fact?: string }[])
    .filter((m) => !m.memory_type || m.memory_type === "fact")
    .map((m) => ({ topic: m.topic, fact: m.fact || m.content }));
}
