export function kioskTokens() {
  if (typeof window === "undefined") return { deviceToken: "", workerToken: "" };
  return {
    deviceToken: localStorage.getItem("kiosk_device_token") || "",
    workerToken: localStorage.getItem("kiosk_worker_token") || "",
  };
}

export async function kioskOps(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch("/api/kiosk/ops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...kioskTokens(), action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const error = new Error(data.message || "Хадгалж чадсангүй.") as Error & { status?: number; data?: unknown };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data as Record<string, any>;
}

let confirmDuplicate: (message: string) => Promise<boolean> = async () => false;

export function setKioskConfirm(fn: (message: string) => Promise<boolean>) {
  confirmDuplicate = fn;
}

export async function kioskSaveLogs(logs: Record<string, unknown>[], aliases: Record<string, unknown>[] = []) {
  try {
    return await kioskOps("logs.insert", { logs, aliases });
  } catch (error) {
    const err = error as Error & { status?: number; data?: { code?: string } };
    if (err.status === 409 && err.data?.code === "duplicate" && await confirmDuplicate(`${err.message}\n\nДавхардаж хадгалах уу?`)) {
      return kioskOps("logs.insert", { logs, aliases, confirmDuplicate: true });
    }
    throw error;
  }
}

export async function kioskBootstrap() {
  const res = await fetch("/api/kiosk/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(kioskTokens()),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || "Киоск дата татаж чадсангүй.");
  }
  return data as Record<string, any>;
}

export async function kioskTrust() {
  const res = await fetch("/api/kiosk/trust", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceToken: kioskTokens().deviceToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || "Итгэлийн тоо татаж чадсангүй.");
  }
  return data as { ok: true; purchase_pct: number; missing: number; check: number };
}
