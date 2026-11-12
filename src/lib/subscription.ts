import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type TenantBilling = {
  status: string;
  plan: string | null;
  subscriptionEnd: string | null;
  daysLeft: number | null;
  pastDue: boolean;
  expiringSoon: boolean;
};

export async function getTenantBilling(clientId: string): Promise<TenantBilling | null> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("status, plan, subscription_end_date")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!data) return null;

  const end = data.subscription_end_date ? new Date(data.subscription_end_date) : null;
  const daysLeft = end ? Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const ended = daysLeft !== null && daysLeft < 0;
  const pastDue = data.status === "past_due" || ended;

  return {
    status: pastDue ? "past_due" : data.status || "active",
    plan: data.plan,
    subscriptionEnd: data.subscription_end_date,
    daysLeft,
    pastDue,
    expiringSoon: daysLeft !== null && daysLeft >= 0 && daysLeft <= 3,
  };
}

export async function subscriptionBlockMessage(clientId: string): Promise<string | null> {
  const billing = await getTenantBilling(clientId);
  if (!billing?.pastDue) return null;
  return "Таны багцын хугацаа дууссан байна. AI болон автомат ажиллагааг үргэлжлүүлэхийн тулд эрхээ сунгана уу.";
}

/** Nightly: flip active tenants whose end date has passed. */
export async function markPastDueTenants(): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update({ status: "past_due" })
    .lt("subscription_end_date", now)
    .neq("status", "past_due")
    .select("client_id");
  if (error) throw error;
  return data?.length || 0;
}
