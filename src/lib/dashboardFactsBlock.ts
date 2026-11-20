import { dashboardItemFactsText, gradeFactLines, itemVarianceFacts, type GradeGuideInput } from "@/lib/gradeGuide";
import { dashboardTrust, overviewStatusBlock, purchasePctLabel, STATUS_LABEL, normalizeStatus } from "@/lib/honestDashboard";

export type GradeRow = GradeGuideInput & {
  name?: string;
  unit_price?: number;
  price?: number;
  status?: string;
};

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const rounded = Math.round(Number(value));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("en-US")}₮`;
}

function qty(value: number | null | undefined, unitText = "") {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const rounded = Math.round((Number(value) || 0) * 1000) / 1000;
  const n = Math.abs(rounded - Math.round(rounded)) < 1e-9 ? String(Math.round(rounded)) : String(rounded);
  return `${n}${unitText}`;
}

export function unexplainedMoney(row: GradeRow) {
  const v = itemVarianceFacts(row);
  if (v.unexplainedQty == null) return null;
  const price = Number(row.unit_price || row.price || 0);
  if (!(price > 0)) return null;
  return v.unexplainedQty * price;
}

/** Самбарын барааны картыг сервер дээр бэлэн текст болгоно. Загварчлалгүй, тоо таамаглахгүй. */
export function renderItemFactsBlock(row: GradeRow): string {
  const name = String(row?.name || "").trim() || "Нэргүй бараа";
  const status = STATUS_LABEL[normalizeStatus(row?.status)];
  const v = itemVarianceFacts(row);
  const unitText = v.unitText;
  const unexplainedMnt = unexplainedMoney(row);
  const lines = [
    `${name} (${status})`,
    dashboardItemFactsText(row),
  ];
  if (v.unexplainedQty != null && v.unexplainedQty > 0.05 && unexplainedMnt != null) {
    const extra = `Тайлбаргүй зөрүү ${qty(v.unexplainedQty, unitText)} / ${money(unexplainedMnt)}.`;
    if (!lines[1].includes(String(Math.round(unexplainedMnt)))) lines.push(extra);
  }
  return lines.filter(Boolean).join("\n");
}

function mnt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString("en-US")} ₮` : "—";
}

/** Хугацааны баталгаажсан нийт дүн + барааны мөр. Шар мөрийг нийт дүнгээс 0 гэж үзэхгүй. */
export function renderOverviewFactsBlock(data: any, label: string): string {
  const fin = data?.financial_ladder || {};
  const board = dashboardTrust({
    grades: data?.grades,
    data_trust: data?.data_trust || fin.data_trust,
  });
  const waste = Number(data?.total_waste_loss);
  const unexplained = Number(data?.total_unexplained_waste);
  const lines = [
    `Самбарын тоо (${label}, Asia/Ulaanbaatar)`,
    `Орлого: ${mnt(fin.revenue)}`,
    `Өртөг (баталгаажсан барааны бодит): ${mnt(fin.actual_cogs)}; онолын өртөг: ${mnt(fin.theo_cogs)}`,
    `Баталгаажсан барааны цэвэр зөрүү: ${mnt(fin.verified_gap)}`,
    `Баталгаажсан барааны хаягдлын алдагдал (шар болон дутуу мөр ороогүй, төгрөг): ${Number.isFinite(waste) ? mnt(waste) : "—"}`,
    `Баталгаажсан барааны тайлбаргүй зөрүү (шар болон дутуу мөр ороогүй, төгрөг): ${Number.isFinite(unexplained) ? mnt(unexplained) : "—"}`,
    overviewStatusBlock(board),
    `Худалдан авалтын үнийн дүнгийн хувь: ${purchasePctLabel(board.summary)}`,
    "Бараа тус бүрийн тоо (самбарын картай ижил):",
    gradeFactLines(data?.grades || []),
  ];
  return lines.filter(Boolean).join("\n");
}

export function findNamedGrade(grades: GradeRow[] = [], userMessage: string): GradeRow | null {
  const text = String(userMessage || "").toLowerCase();
  if (!text) return null;
  const named = (grades || [])
    .map((row) => ({ row, name: String(row?.name || "").trim() }))
    .filter((item) => item.name && text.includes(item.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);
  return named[0]?.row || null;
}

export function isGradeStatusQuestion(text: string) {
  const t = String(text || "").toLowerCase();
  return /шалгах|тайлбаргүй|тооны зөрүү|яагаад шар|мянгэн зөрүү|мөнгөн зөрүү/.test(t);
}

function normalizeNumberToken(raw: string) {
  const s = String(raw || "").replace(/[₮\s]/gi, "").replace(/,/g, "");
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? String(Math.round(n)) : "";
}

export function officialNumberTokens(text: string): Set<string> {
  const found = new Set<string>();
  const matches = String(text || "").match(/[+-]?\d[\d\s,]*\.?\d*/g) || [];
  for (const m of matches) {
    const n = normalizeNumberToken(m);
    if (n) found.add(n);
  }
  return found;
}

/**
 * Моделийн тоотой мөрийг самбарын блоктой зөрсөн үед хасна.
 * Зөвхөн зөвлөмж үлдэнэ. Тоо дахин бичихийг зөвшөөрөхгүй.
 */
export function stripContradictingNumberLines(
  modelText: string,
  officialText: string,
  itemName?: string,
): string {
  const official = officialNumberTokens(officialText);
  const item = String(itemName || "").trim().toLowerCase();
  return String(modelText || "")
    .split("\n")
    .filter((line) => {
      const tokens = officialNumberTokens(line);
      if (tokens.size === 0) return true;
      const talksAboutItem = !item || line.toLowerCase().includes(item) || /хаягдал|тайлбаргүй|зөрүү|мл|₮|эхлэх|эцсийн|муудсан|туршилт/.test(line.toLowerCase());
      if (!talksAboutItem) return true;
      for (const token of tokens) {
        if (!official.has(token)) return false;
      }
      // Самбартай ижил тоо ч моделийн дахин бичилт хэрэггүй.
      return false;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
