import { resolveTenantFromRequest, normalizeRole } from "@/lib/tenant";
import { AgentContext } from "@/types/agent.types";

/**
 * Securely extracts tenant identity and user role from the Bearer Token.
 * Never trusts client-supplied tenant headers.
 */
export async function resolveTenantContext(bearerToken: string): Promise<AgentContext | null> {
  const request = new Request("http://localhost", {
    headers: { authorization: bearerToken },
  });
  const session = await resolveTenantFromRequest(request);
  if (!session) return null;
  return {
    clientId: session.clientId,
    userId: session.userId,
    userRole: normalizeRole(session.role),
    workerName: session.fullName,
  };
}