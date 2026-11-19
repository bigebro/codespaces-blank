export type GradeLike = {
  status?: string;
  name?: string;
  purchase_value?: number;
  theo_money?: number;
  action?: string | null;
  ingredient_id?: string;
  fixable?: boolean;
};

export type DataTrust = {
  verified: number;
  total: number;
  missing: number;
  check: number;
  remaining: number;
  unverified_theo: number;
  purchase_pct: number;
};

/** Самбар болон OP AI хоёулаа энэ тооллогоор «баталгаажсан / дутуу / шалгах»-ыг бодно. */
export function buildDataTrust(grades: GradeLike[] = [], purchasePct?: number): DataTrust {
  const verifiedRows = grades.filter((row) => row.status === "Verified");
  const missing = grades.filter((row) => row.status === "Missing").length;
  const check = grades.filter((row) => row.status === "Check").length;
  const purchaseAll = grades.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const purchaseVerified = verifiedRows.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const purchase_pct = purchasePct ?? (
    purchaseAll > 0
      ? Math.round((purchaseVerified / purchaseAll) * 100)
      : (grades.length ? Math.round((verifiedRows.length / grades.length) * 100) : 0)
  );
  const unverified_theo = grades
    .filter((row) => row.status !== "Verified")
    .reduce((sum, row) => sum + (Number(row.theo_money) || 0), 0);
  return {
    verified: verifiedRows.length,
    total: grades.length,
    missing,
    check,
    remaining: missing + check,
    unverified_theo,
    purchase_pct,
  };
}

export function estimateLine(t: { total: number; verified: number; remaining: number }) {
  return `Тооцоолсон, ${t.total} бараанаас ${t.verified} баталгаажсан, ${t.remaining} ажил үлдсэн`;
}

export function trustStatusLine(t: { verified: number; missing: number; check: number; total: number }) {
  return `${t.verified} баталгаажсан, ${t.missing} дутуу, ${t.check} шалгах, нийт ${t.total} бараа`;
}

function hasTrustCounts(t?: Partial<DataTrust> | null): t is Partial<DataTrust> {
  return Boolean(t && (t.total != null || t.verified != null));
}

export const IMPOSSIBLE_TITLE = "Энэ тоо бодит биш байж магадгүй: өгөгдөл дутуу";
export const SURPLUS_NOTE = "Илүүдэл: тооллого эсвэл худалдан авалт дутуу байж магадгүй, эсвэл жорын норм бодит хэрэглээнээс их, эсвэл порц бага өгч байна";
export const COMPLETE_PERIOD = "Энэ хугацааны өгөгдөл бүрэн";

export function trustTone(pct: number): "red" | "yellow" | "green" {
  if (pct < 50) return "red";
  if (pct < 90) return "yellow";
  return "green";
}

// Өнгө нь статусаар: Дутуу байвал улаан, Шалгах байвал шар, бүгд баталгаажсан үед л ногоон.
export function statusTone(missing: number, check: number, total: number): "red" | "yellow" | "green" {
  if (missing > 0) return "red";
  if (check > 0 || total === 0) return "yellow";
  return "green";
}

export function parsePct(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseFloat(String(value ?? "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeTrust(input: { grades?: GradeLike[]; data_trust?: Partial<DataTrust> | null }) {
  const grades = input.grades || [];
  const fromGrades = buildDataTrust(grades, input.data_trust?.purchase_pct);
  // data_trust байвал самбар ч, AI ч нэг эх сурвалжийн тоог харуулна (grades ирээгүй үед ч).
  const trust = hasTrustCounts(input.data_trust)
    ? {
        ...fromGrades,
        verified: Number(input.data_trust.verified ?? fromGrades.verified) || 0,
        total: Number(input.data_trust.total ?? fromGrades.total) || 0,
        missing: Number(input.data_trust.missing ?? fromGrades.missing) || 0,
        check: Number(input.data_trust.check ?? fromGrades.check) || 0,
        remaining: Number(
          input.data_trust.remaining ??
            ((input.data_trust.missing != null || input.data_trust.check != null)
              ? (Number(input.data_trust.missing) || 0) + (Number(input.data_trust.check) || 0)
              : fromGrades.remaining),
        ) || 0,
        unverified_theo: Number(input.data_trust.unverified_theo ?? fromGrades.unverified_theo) || 0,
        purchase_pct: input.data_trust.purchase_pct ?? fromGrades.purchase_pct,
      }
    : fromGrades;
  // «ажил үлдсэн»: grades байвал засварлаж болох мөр, үгүй бол data_trust.remaining.
  const remaining = grades.length
    ? grades.filter((row) => row.status !== "Verified" && row.fixable !== false).length
    : trust.remaining;
  // Тоогоор: баталгаажсан бараа / нийт бараа. 100% зөвхөн бүгд баталгаажсан үед (floor).
  const verified_pct = trust.total ? Math.floor((trust.verified / trust.total) * 100) : 0;
  return {
    purchase_pct: trust.purchase_pct,
    verified_pct,
    verified: trust.verified,
    total: trust.total,
    missing: trust.missing,
    check: trust.check,
    remaining,
    unverified_theo: trust.unverified_theo,
    tone: statusTone(trust.missing, trust.check, trust.total),
    meter: `Үнэн зөв байдал: ${verified_pct}%`,
    counts: `${trust.missing} бараа дутуу, ${trust.check} бараа шалгах`,
    estimate: estimateLine({ total: trust.total, verified: trust.verified, remaining }),
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
  if (!(Number(purchaseValue) > 0)) {
    return "Худалдан авалт алга. Энэ мөр үнэ баталгаажуулах ажил биш.";
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
