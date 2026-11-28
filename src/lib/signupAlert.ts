const DEFAULT_ALERT_TO = "bigeservice@gmail.com";
const DEFAULT_FROM = "Operlink <onboarding@resend.dev>";

export function signupAlertRecipient(): string {
  const raw = (process.env.SIGNUP_ALERT_EMAIL ?? "").trim();
  return raw || DEFAULT_ALERT_TO;
}

/** Asia/Ulaanbaatar (UTC+8), e.g. 2026-11-28 19:20:00 (UTC+8). */
export function formatSignupTime(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}:${pick("second")} (UTC+8)`;
}

export function signupAlertText(input: {
  cafeName: string;
  ownerName: string;
  phone: string;
  email: string;
  signedUpAt: string;
}): string {
  const lines = [
    "Шинэ кафе бүртгэл.",
    `Кафе: ${input.cafeName || "оруулаагүй"}`,
    `Эзэн: ${input.ownerName || "оруулаагүй"}`,
  ];
  if (input.phone) lines.push(`Утас: ${input.phone}`);
  if (input.email) lines.push(`Имэйл: ${input.email}`);
  lines.push(`Бүртгэсэн цаг: ${input.signedUpAt}`);
  return lines.join("\n");
}

export async function sendSignupAlert(input: {
  cafeName: string;
  ownerName: string;
  phone: string;
  email: string;
  signedUpAt: string;
}): Promise<"sent" | "skipped"> {
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) {
    console.info("[signup-alert] RESEND_API_KEY unset, skipping email");
    return "skipped";
  }

  const from = (process.env.RESEND_FROM ?? "").trim() || DEFAULT_FROM;
  const subjectName = (input.cafeName || "нэргүй").replace(/[\r\n]+/g, " ").slice(0, 120);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [signupAlertRecipient()],
      subject: `Шинэ кафе бүртгэл: ${subjectName}`,
      text: signupAlertText(input),
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const payload = (await res.json()) as { message?: string; name?: string };
      detail = String(payload?.message || payload?.name || "");
    } catch {
      detail = "";
    }
    console.error("[signup-alert] Resend error", res.status, detail.slice(0, 200));
    return "skipped";
  }

  return "sent";
}
