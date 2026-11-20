const PLAN_LABELS: Record<string, string> = {
  trial: "Туршилт",
  starter: "Эхлэл",
  standard: "Стандарт",
  professional: "Мэргэжлийн",
  pro: "Мэргэжлийн",
  premium: "Премиум",
  business: "Бизнес",
};

/** Багцын англи кодыг монгол нэрээр харуулна. TRIAL гэх мэт том үсгийг үлдээнэ үгүй. */
export function planLabel(plan?: string | null, isTrial?: boolean): string {
  const raw = String(plan || "").trim();
  const key = raw.toLowerCase();
  if (isTrial || key === "trial") return PLAN_LABELS.trial;
  if (key && PLAN_LABELS[key]) return PLAN_LABELS[key];
  if (!raw) return "—";
  return raw;
}
