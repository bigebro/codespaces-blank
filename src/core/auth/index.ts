import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AgentContext } from "@/types/agent.types";

/**
 * Securely extracts tenant identity and user role from the Bearer Token.
 * Never trusts client-supplied tenant headers.
 */
export async function resolveTenantContext(bearerToken: string): Promise<AgentContext | null> {
  if (!bearerToken) return null;

  const cleanToken = bearerToken.replace(/^Bearer\s+/i, "").trim();

  // 1. Verify token with Supabase Auth
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(cleanToken);
  if (authError || !user) return null;

  // 2. Fetch authenticated profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("client_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.client_id) return null;

  return {
    clientId: profile.client_id,
    userId: user.id,
    userRole: profile.role === "owner" ? "owner" : "staff",
    workerName: profile.full_name || "Ажилтан",
  };
}