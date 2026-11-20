import { getCachedAnalytics } from "@/lib/analyticsCache";
import { dashboardTrust, overviewStatusBlock, purchasePctLabel } from "@/lib/honestDashboard";
import { gradeFactLines } from "@/lib/gradeGuide";
import { ubDayEndIso, ubDayStartIso } from "@/lib/ubDate";
import { MN_BUSINESS_SPELLING_NOTE } from "@/ai/runtime/mnSpelling";
import type { OverviewPeriod } from "@/lib/overviewPeriod";

export type { OverviewPeriod } from "@/lib/overviewPeriod";
export { hasNamedPeriod, overviewDateLine, resolveOverviewPeriod } from "@/lib/overviewPeriod";
export { gradeFactLines } from "@/lib/gradeGuide";

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
  "юу болсон",
  "юу болов",
  "what happened",
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
    const data: any = await getCachedAnalytics(clientId, ubDayStartIso(startDay), ubDayEndIso(endDay));
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
        "Хариултын эхэнд хугацааг систем нэмнэ, чи давхар бичиж хэрэггүй. Сонгосон хугацаа өнөөдөр биш бол «Өнөөдөр (огноо)» гэсэн гарчиг битигий нэм.",
        MN_BUSINESS_SPELLING_NOTE,
      ].join("\n");
    }

    return [
      `[БОДИТ ТОО, ${label}, Asia/Ulaanbaatar. Самбартай ижил эх сурвалж, ижил хүрээ]`,
      `- Орлого: ${mnt(revenue)}`,
      `- Өртөг (баталгаажсан барааны бодит): ${mnt(fin.actual_cogs)}; онолын өртөг: ${mnt(fin.theo_cogs)}`,
      `- Баталгаажсан барааны цэвэр зөрүү: ${mnt(fin.verified_gap)}`,
      `- Баталгаажсан барааны хаягдлын алдагдал (шар болон дутуу мөр ороогүй, төгрөг): ${mnt(waste)}`,
      `- Баталгаажсан барааны тайлбаргүй зөрүү (шар болон дутуу мөр ороогүй, төгрөг): ${mnt(unexplained)}`,
      overviewStatusBlock(board),
      `- Худалдан авалтын үнийн дүнгийн хувь: ${purchasePctLabel(trust)}`,
      "Бараа тус бүрийн тоо (самбарын картай ижил өгүүлбэр. Энд байхгүй тоог битгий нэм):",
      gradeFactLines(data?.grades || []),
      "ДҮРЭМ: Зөвхөн дээрх тоо болон барааны мөрийг иш тат. Tool битгий дууд: эдгээр тоо самбартай ижил. Өөр хугацааны эсвэл MTD vitals-ийн тоог энэ хариултад бичиж болохгүй. Тооны эх сурвалж олдохгүй бол «—» эсвэл «өгөгдөл алга» гэж хэл, 0 гэж таамаглаж болохгүй. Хариултад зөвхөн нэг хугацаа нэрлэ (систем эхэнд нэмсэн хугацаа). Самбар «Шалгах» гэж байвал зөрүү 0 байлаа ч «Баталгаажсан» гэж битгий өөрчил. Сонгосон хугацаа өнөөдөр биш бол «Өнөөдөр (огноо)» гэсэн гарчиг битигий нэм. Дутуу эсвэл шалгах бараа байвал зөрүү бүрэн биш гэдгийг дурд. Бүртгэгдсэн хаягдал болон «Тайлбаргүй зөрүү» хоёрыг хэзээ ч нэг тоо болгон нэмж болохгүй, тусад нь хэл. Эхлэх болон эцсийн тоог тусад нь хэл. Нийт төгрөгийн дүн нь зөвхөн баталгаажсан (ногоон) мөр. Шалгах (шар) барааны хаягдал, тайлбаргүй зөрүүг нийт дүнгээс 0 гэж бүү үз — тухайн барааны мөрийг унш. Хүснэгтэд «бодит үлдэгдэл» гэж битгий нэрлэ. Хариултыг богино байлга, 2-3 зөвлөгөөөр төгсгө.",
      MN_BUSINESS_SPELLING_NOTE,
    ].join("\n");
  } catch (err) {
    console.error("[overview snapshot]", err);
    return `[ТОО ТАТАЖ ЧАДСАНГҮЙ, ${label}]\nХэрэглэгчид энэ хугацааны тоог одоогоор татаж чадаагүй гэж хэл. Тоо зохиож болохгүй. Хариултын эхэнд хугацааг систем нэмнэ, чи давхар бичиж хэрэггүй. Сонгосон хугацаа өнөөдөр биш бол «Өнөөдөр (огноо)» гэсэн гарчиг битигий нэм.`;
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
