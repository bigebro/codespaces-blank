export type GradeLike = {
  status?: string;
  name?: string;
  purchase_value?: number;
  theo_money?: number;
  action?: string | null;
  ingredient_id?: string;
  fixable?: boolean;
};

export type ItemStatusName = "Verified" | "Check" | "Missing";

export const STATUS_LABEL: Record<ItemStatusName, string> = {
  Verified: "Баталгаажсан",
  Check: "Шалгах",
  Missing: "Дутуу",
};

export type ItemStatus = {
  name: string;
  status: ItemStatusName;
  label: string;
  ingredient_id?: string;
};

export function normalizeStatus(status?: string): ItemStatusName {
  if (status === "Verified" || status === "Баталгаажсан") return "Verified";
  if (status === "Missing" || status === "Дутуу") return "Missing";
  return "Check";
}

/** Самбар болон OP AI хоёулаа энэ жагсаалтаар барааны статусыг харуулж, тоог бодно. */
export function itemStatusList(grades: GradeLike[] = []): ItemStatus[] {
  return (grades || []).map((row) => {
    const status = normalizeStatus(row.status);
    return {
      name: String(row.name || "").trim() || "Нэргүй бараа",
      status,
      label: STATUS_LABEL[status],
      ingredient_id: row.ingredient_id,
    };
  });
}

export function itemStatusLines(items: ItemStatus[]): string {
  if (!items.length) return "Хэмжигдсэн бараа алга.";
  return items.map((row) => `- ${row.name}: ${row.label}`).join("\n");
}

export type DataTrust = {
  verified: number;
  total: number;
  missing: number;
  check: number;
  remaining: number;
  unverified_theo: number;
  purchase_pct: number;
  has_purchase_value: boolean;
};

/** Самбар болон OP AI хоёулаа энэ тооллогоор «баталгаажсан / дутуу / шалгах»-ыг бодно. */
export function buildDataTrust(grades: GradeLike[] = [], purchasePct?: number): DataTrust {
  const normalized = (grades || []).map((row) => ({ ...row, status: normalizeStatus(row.status) }));
  const verifiedRows = normalized.filter((row) => row.status === "Verified");
  const missing = normalized.filter((row) => row.status === "Missing").length;
  const check = normalized.filter((row) => row.status === "Check").length;
  const purchaseAll = normalized.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const purchaseVerified = verifiedRows.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const has_purchase_value = purchaseAll > 0;
  const purchase_pct = purchasePct ?? (
    has_purchase_value ? Math.round((purchaseVerified / purchaseAll) * 100) : 0
  );
  const unverified_theo = normalized
    .filter((row) => row.status !== "Verified")
    .reduce((sum, row) => sum + (Number(row.theo_money) || 0), 0);
  return {
    verified: verifiedRows.length,
    total: normalized.length,
    missing,
    check,
    remaining: missing + check,
    unverified_theo,
    purchase_pct,
    has_purchase_value,
  };
}

export const TRUST_PENDING_LINE = "—";
export const TRUST_EMPTY_LINE = "Хэмжигдсэн бараа алга";

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
export const COMPLETE_PERIOD = "Энэ хугацааны өгөгдөл бүрэн байна";
export const INCOMPLETE_PERIOD = "Энэ хугацааны өгөгдөл бүрэн биш байна";

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
  // Барааны жагсаалт байвал түүний статус л эх сурвалж. data_trust-ийг зөвхөн grades хоосон үед авна.
  const trust = grades.length === 0 && hasTrustCounts(input.data_trust)
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
        has_purchase_value: input.data_trust.has_purchase_value ?? fromGrades.has_purchase_value,
      }
    : fromGrades;
  // «ажил үлдсэн»: grades байвал засварлаж болох мөр, үгүй бол data_trust.remaining.
  const remaining = grades.length
    ? grades.filter((row) => normalizeStatus(row.status) !== "Verified" && row.fixable !== false).length
    : trust.remaining;
  // Тоогоор: баталгаажсан бараа / нийт бараа. 100% зөвхөн бүгд баталгаажсан үед (floor).
  const verified_pct = trust.total ? Math.floor((trust.verified / trust.total) * 100) : 0;
  return {
    purchase_pct: trust.purchase_pct,
    has_purchase_value: Boolean(trust.has_purchase_value),
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

/** Самбар болон overview-ийн нэг эх сурвалж: бараа тус бүрийн статус + түүнээс гарсан тоо. */
export function dashboardTrust(analytics: { grades?: GradeLike[] | null; data_trust?: Partial<DataTrust> | null } | null | undefined) {
  const grades = analytics?.grades || [];
  const items = itemStatusList(grades);
  const summary = summarizeTrust({
    grades,
    data_trust: grades.length ? { purchase_pct: analytics?.data_trust?.purchase_pct } : analytics?.data_trust,
  });
  return { items, summary };
}

/** grades эсвэл data_trust ирсэн үед л тоо мэдэгдэж байгаа. Ачааллах/хоосон объект дээр 0 гэж үзэхгүй. */
export function isTrustReady(
  analytics: { grades?: GradeLike[] | null; data_trust?: Partial<DataTrust> | null } | null | undefined,
): boolean {
  if (!analytics) return false;
  if (Array.isArray(analytics.grades)) return true;
  return hasTrustCounts(analytics.data_trust);
}

/** Самбар дээр харуулах мөр: тоо мэдэгдээгүй бол «—», бараа алга бол «Хэмжигдсэн бараа алга». */
export function trustEstimateDisplay(
  analytics: { grades?: GradeLike[] | null; data_trust?: Partial<DataTrust> | null } | null | undefined,
  loading = false,
): string {
  // Ачааллаж байгаа ч бэлэн өгөгдөл байвал түүнийг харуулна. Зөвхөн мэдэгдэхгүй үед «—».
  if (loading && !isTrustReady(analytics)) return TRUST_PENDING_LINE;
  if (!isTrustReady(analytics)) return TRUST_PENDING_LINE;
  const summary = dashboardTrust(analytics).summary;
  if (summary.total === 0) return TRUST_EMPTY_LINE;
  return summary.estimate;
}

export function overviewStatusBlock(board: { items: ItemStatus[]; summary: ReturnType<typeof summarizeTrust> }) {
  return [
    `- Хэмжилтийн байдал: ${trustStatusLine(board.summary)}`,
    `- Самбарын мөр: ${board.summary.estimate}`,
    `- Бараа тус бүр (самбар дээрх статус. Энэ жагсаалтаас тоол. Статусыг битгий өөрчил):`,
    itemStatusLines(board.items),
  ].join("\n");
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
    .filter((row) => normalizeStatus(row.status) !== "Verified" && row.fixable !== false)
    .sort((a, b) => (Number(b.purchase_value) || 0) - (Number(a.purchase_value) || 0))
    .slice(0, limit);
}

export function likelyCauses(gapQty: number | null | undefined) {
  if (gapQty == null || !Number.isFinite(Number(gapQty)) || Number(gapQty) === 0) return "";
  return Number(gapQty) < 0
    ? "Үлдэгдэл хүлээгдэж байснаас их. Магадгүй: орлого бүртгээгүй, тооллого буруу, эсвэл жор хэт их орцтой."
    : "Үлдэгдэл хүлээгдэж байснаас бага. Магадгүй: хаягдал бүртгээгүй, орлого давхар эсвэл илүү бүртгэсэн, тооллого буруу, эсвэл жор хэт бага орцтой.";
}

/** Худалдан авалтын үнийн дүн байхгүй үед 0%-ийг «—» гэж харуулна. */
export function purchasePctLabel(trust: { purchase_pct?: number; has_purchase_value?: boolean } | null | undefined): string {
  if (!trust) return "—";
  if (trust.has_purchase_value === false) return "—";
  const pct = trust.purchase_pct;
  if (pct == null || !Number.isFinite(Number(pct))) return "—";
  if (Number(pct) === 0 && trust.has_purchase_value !== true) return "—";
  return `${Math.round(Number(pct))}%`;
}

/** «N бараанаас M нь баталгаажсан». Баталгаажаагүй эсвэл хувь нь «—»/0% үед хаалтыг хасна. */
export function trustConfirmedLine(trust: {
  total?: number;
  verified?: number;
  purchase_pct?: number;
  has_purchase_value?: boolean;
} | null | undefined): string {
  if (!trust || !Number(trust.total)) return "—";
  const total = Number(trust.total) || 0;
  const verified = Number(trust.verified) || 0;
  const base = `${total} бараанаас ${verified} нь баталгаажсан`;
  if (verified === 0) return base;
  const pct = purchasePctLabel(trust);
  if (pct === "—" || pct === "0%") return base;
  return `${base} (худалдан авалтын үнийн дүнгийн ${pct})`;
}
