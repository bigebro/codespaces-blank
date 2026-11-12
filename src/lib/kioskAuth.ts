import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WorkerClaims = { did: string; cid: string; wid: string; exp: number };

export type KioskWorker = {
  deviceId: string;
  clientId: string;
  workerId: string;
  workerName: string;
  role: string;
  fullName: string;
};

function secret() {
  const value = process.env.KIOSK_TOKEN_SECRET || "";
  if (!value) throw new Error("KIOSK_TOKEN_SECRET missing");
  return value;
}

export function signWorkerToken(claims: Omit<WorkerClaims, "exp">, hours = 16) {
  const body = Buffer.from(
    JSON.stringify({ ...claims, exp: Date.now() + hours * 60 * 60 * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readWorkerToken(token: string): WorkerClaims | null {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as WorkerClaims;
    if (!claims.did || !claims.cid || !claims.wid || claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function requireKioskDevice(deviceToken: string) {
  const token = String(deviceToken || "").trim();
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("kiosk_devices")
    .select("id, client_id, is_active")
    .eq("device_token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (!data?.client_id) return null;
  return { deviceId: data.id as string, clientId: data.client_id as string };
}

export async function requireKioskWorker(deviceToken: string, workerToken: string): Promise<KioskWorker | null> {
  const device = await requireKioskDevice(deviceToken);
  const claims = readWorkerToken(workerToken);
  if (!device || !claims || claims.did !== device.deviceId || claims.cid !== device.clientId) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, client_id, email")
    .eq("id", claims.wid)
    .maybeSingle();
  if (!profile || profile.client_id !== device.clientId) return null;
  const fullName = String(profile.full_name || profile.email?.split("@")[0] || "Ажилтан").trim();
  const role = String(profile.role || "Ажилтан").trim();
  return {
    deviceId: device.deviceId,
    clientId: device.clientId,
    workerId: profile.id,
    role,
    fullName,
    workerName: `${role} (${fullName})`,
  };
}
