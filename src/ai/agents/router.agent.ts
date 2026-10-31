import { AgentContext } from "@/types/agent.types";
import { runCfoAgent } from "./cfo.agent";

export async function routeAiRequest(context: AgentContext, payload: any) {
  // If owner is chatting -> Route to CFO reasoning agent with tools
  if (context.userRole === "owner") {
    return await runCfoAgent(context, payload.text);
  }

  // If worker is using Kiosk -> Handled by the fast deterministic parser
  throw new Error("Worker Kiosk routing handled by fast transaction parser");
}