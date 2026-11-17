export type GradeLike = {
  status?: string;
  name?: string;
  purchase_value?: number;
  theo_money?: number;
  action?: string | null;
  ingredient_id?: string;
  fixable?: boolean;
};

export const IMPOSSIBLE_TITLE = "Энэ тоо бодит биш байж магадгүй: өгөгдөл дутуу";
export const SURPLUS_NOTE = "Илүүдэл: тооллого эсвэл худалдан авалт дутуу байж магадгүй";
export const COMPLETE_PERIOD = "Энэ хугацааны өгөгдөл бүрэн";

export function trustTone(pct: number): "red" | "yellow" | "green" {
  if (pct < 50) return "red";
  if (pct < 90) return "yellow";
  return "green";
}

export function parsePct(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseFloat(String(value ?? "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeTrust(input: { grades?: GradeLike[]; data_trust?: { purchase_pct?: number } | null }) {
  const grades = input.grades || [];
  const verified = grades.filter((row) => row.status === "Verified");
  const missing = grades.filter((row) => row.status === "Missing").length;
  const check = grades.filter((row) => row.status === "Check").length;
  const purchaseAll = grades.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const purchaseVerified = verified.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const purchase_pct = input.data_trust?.purchase_pct ?? (
    purchaseAll > 0
      ? Math.round((purchaseVerified / purchaseAll) * 100)
      : (grades.length ? Math.round((verified.length / grades.length) * 100) : 0)
  );
  const remaining = grades.filter((row) => row.status !== "Verified" && row.fixable !== false).length;
  const unverified_theo = grades
    .filter((row) => row.status !== "Verified")
    .reduce((sum, row) => sum + (Number(row.theo_money) || 0), 0);
  return {
    purchase_pct,
    missing,
    check,
    remaining,
    unverified_theo,
    tone: trustTone(purchase_pct),
    meter: `Үнэн зөв байдал: ${purchase_pct}%`,
    counts: `${missing} бараа дутуу, ${check} бараа шалгах`,
    estimate: `Тооцоолсон, ${purchase_pct}% баталгаажсан, ${remaining} ажил үлдсэн`,
  };
}

export function impossibleReasons(actual: number, theoretical: number, grossMarginPct: number) {
  const reasons: string[] = [];
  if (actual < theoretical) reasons.push("Баталгаажсан барааны бодит өртөг онолын өртгөөс бага байна");
  if (grossMarginPct > 80) reasons.push("Бохир ашиг 80%-иас өндөр байна");
  return reasons;
}

export function unlockLine(purchaseValue: number, theoMoney = 0) {
  if (!(Number(purchaseValue) > 0) && Number(theoMoney) > 0) {
    return `Худалдан авалт алга. Борлуулалтад ${Math.round(Number(theoMoney)).toLocaleString()}₮-ийн орц зарцуулсан, түүнийг баталгаажуулна`;
  }
  return `Энэ засвар ${Math.round(Number(purchaseValue) || 0).toLocaleString()}₮-ийн өртгийг баталгаажуулна`;
  
}

export function topFixActions<T extends GradeLike>(rows: T[], limit = 3) {
  return [...rows]
    .filter((row) => row.status !== "Verified" && row.fixable !== false)
    .sort((a, b) => (Number(b.purchase_value) || 0) - (Number(a.purchase_value) || 0))
    .slice(0, limit);
}

export function likelyCauses(gapQty: number | null | undefined) {
  if (gapQty == null || !Number.isFinite(Number(gapQty)) || Number(gapQty) === 0) return "";
  return Number(gapQty) < 0
    ? "Үлдэгдэл хүлээгдэж байснаас их. Магадгүй: орлого бүртгээгүй, тооллого буруу, эсвэл жор хэт их орцтой."
    : "Үлдэгдэл хүлээгдэж байснаас бага. Магадгүй: хаягдал бүртгээгүй, орлого давхар эсвэл илүү бүртгэсэн, тооллого буруу, эсвэл жор хэт бага орцтой.";
}
