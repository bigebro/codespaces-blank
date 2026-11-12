import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AppRole = "owner" | "manager" | "staff";

export type TenantSession = {
  userId: string;
  email: string | null;
  clientId: string;
  role: AppRole;
  fullName: string;
};

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "owner") return "owner";
  if (role === "manager") return "manager";
  return "staff";
}

/**
 * Resolves the tenant from the logged-in user. Never trusts a clientId
 * sent in a form body, query string, or header.
 */
export async function resolveTenantFromRequest(
  request: Request,
): Promise<TenantSession | null> {
  const token = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("client_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.client_id) return null;

  return {
    userId: user.id,
    email: user.email || null,
    clientId: profile.client_id,
    role: normalizeRole(profile.role),
    fullName: profile.full_name || "Ажилтан",
  };
}

export function bearerToken(request: Request): string {
  return (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}
