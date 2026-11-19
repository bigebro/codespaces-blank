import { getAnalyticsData } from "@/lib/analytics";
import { dashboardTrust, overviewStatusBlock } from "@/lib/honestDashboard";
import { ubDayEndIso, ubDayStartIso } from "@/lib/ubDate";
import { MN_BUSINESS_SPELLING_NOTE } from "@/ai/runtime/mnSpelling";
import type { OverviewPeriod } from "@/lib/overviewPeriod";

export type { OverviewPeriod } from "@/lib/overviewPeriod";
export { overviewDateLine, resolveOverviewPeriod } from "@/lib/overviewPeriod";

// «Бизнес ямар байна вэ?» төрлийн ерөнхий асуулт.
const OVERVIEW_PATTERNS = [
  "бизнес ямар",
  "бизнес хэр",
  "ямар байна",
  "хэр байна",
  "өнөөдрийн байдал",
  "өнөөдрийн тойм",
  "өнөөдрийн дүн",
  "тойм",
  "дүгнэлт",
  "overview",
  "summary",
];

export function isOverviewQuestion(text: string) {
  const t = String(text || "").toLowerCase();
  return OVERVIEW_PATTERNS.some((p) => t.includes(p));
}

function mnt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString("en-US")} ₮` : "мэдээлэл алга";
}

/**
 * Сонгосон хугацааны бодит тоог самбартай ижил эх сурвалж, ижил UB өдрийн хүрээ,
 * ижил summarizeTrust тооллогоор авч AI-д өгнө. Өгөгдөл байхгүй бол «өгөгдөл алга», тоо зохиохгүй.
 */
export async function buildOverviewSnapshot(clientId: string, range: OverviewPeriod): Promise<string> {
  const { startDay, endDay, label } = range;
  try {
    const data: any = await getAnalyticsData(clientId, ubDayStartIso(startDay), ubDayEndIso(endDay));
    const fin = data?.financial_ladder || {};
    const board = dashboardTrust({
      grades: data?.grades,
      data_trust: data?.data_trust || fin.data_trust,
    });
    const trust = board.summary;
    const revenue = Number(fin.revenue) || 0;
    const waste = Number(data?.total_waste_loss) || 0;
    const unexplained = Number(data?.total_unexplained_waste) || 0;
    const measured = trust.total;
    const hasData = revenue > 0 || waste > 0 || unexplained > 0 || measured > 0;

    if (!hasData) {
      return [
        `[БОДИТ ТОО, ${label}, Asia/Ulaanbaatar]`,
        `${label} хугацаанд борлуулалт, хаягдал, хэмжигдсэн бараа бүртгэгдээгүй байна: ӨГӨГДӨЛ АЛГА.`,
        "Үүнийг хэрэглэгчид шууд хэл. Тоо зохиож болохгүй. Юуг бүртгэвэл тоо гарахыг (борлуулалт, ээлжийн тооллого, хаягдал) нэг өгүүлбэрээр зөвлө.",
        "Хариултын эхэнд хугацааг систем нэмнэ, чи давхар бичиж хэрэггүй.",
        MN_BUSINESS_SPELLING_NOTE,
      ].join("\n");
    }

    return [
      `[БОДИТ ТОО, ${label}, Asia/Ulaanbaatar. Самбартай ижил эх сурвалж, ижил хүрээ]`,
      `- Орлого: ${mnt(revenue)}`,
      `- Өртөг (баталгаажсан барааны бодит): ${mnt(fin.actual_cogs)}; онолын өртөг: ${mnt(fin.theo_cogs)}`,
      `- Баталгаажсан барааны цэвэр зөрүү: ${mnt(fin.verified_gap)}`,
      `- Хаягдлын алдагдал: ${mnt(waste)}`,
      `- Тайлбаргүй зөрүү: ${mnt(unexplained)}`,
      overviewStatusBlock(board),
      "ДҮРЭМ: Зөвхөн дээрх тоо болон бараа тус бүрийн статусыг ашигла. Самбар «Шалгах» гэж байвал зөрүү 0 байлаа ч «Баталгаажсан» гэж битгий өөрчил. Хариултын эхэнд хугацааг систем нэмнэ, чи давхар бичиж хэрэггүй. 0 нь өгөгдөл байхгүй гэсэн утгатай байж болно, тэгвэл «өгөгдөл алга» гэж хэл. Дутуу эсвэл шалгах бараа байвал зөрүү бүрэн биш гэдгийг дурд. Эцэст нь 2-3 богино зөвлөгөө өг.",
      MN_BUSINESS_SPELLING_NOTE,
    ].join("\n");
  } catch (err) {
    console.error("[overview snapshot]", err);
    return `[ТОО ТАТАЖ ЧАДСАНГҮЙ, ${label}]\nХэрэглэгчид энэ хугацааны тоог одоогоор татаж чадаагүй гэж хэл. Тоо зохиож болохгүй. Хариултын эхэнд хугацааг систем нэмнэ, чи давхар бичиж хэрэггүй.`;
  }
}

/** @deprecated use buildOverviewSnapshot */
export async function buildTodaySnapshot(clientId: string, today: string): Promise<string> {
  return buildOverviewSnapshot(clientId, {
    startDay: today,
    endDay: today,
    label: `Өнөөдөр (${today})`,
    source: "today",
  });
}
