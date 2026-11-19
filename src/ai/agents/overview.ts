import { getAnalyticsData } from "@/lib/analytics";

// «Өнөөдөр бизнес ямар байна вэ?» төрлийн ерөнхий асуулт.
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
 * Өнөөдрийн бодит тоонуудыг самбартай ижил эх сурвалжаас (getAnalyticsData) авч, AI-д өгөх текст болгоно.
 * Өгөгдөл байхгүй бол «өгөгдөл алга» гэж тодорхой бичнэ, тоо зохиохгүй.
 */
export async function buildTodaySnapshot(clientId: string, today: string): Promise<string> {
  try {
    const data: any = await getAnalyticsData(clientId, today, today);
    const fin = data?.financial_ladder || {};
    const trust = fin.data_trust || data?.data_trust || {};
    const revenue = Number(fin.revenue) || 0;
    const waste = Number(data?.total_waste_loss) || 0;
    const unexplained = Number(data?.total_unexplained_waste) || 0;
    const measured = Number(trust.total) || 0;
    const hasData = revenue > 0 || waste > 0 || unexplained > 0 || measured > 0;

    if (!hasData) {
      return [
        `[ӨНӨӨДРИЙН БОДИТ ТОО, ${today}, Asia/Ulaanbaatar]`,
        "Өнөөдөр борлуулалт, хаягдал, хэмжигдсэн бараа бүртгэгдээгүй байна: ӨГӨГДӨЛ АЛГА.",
        "Үүнийг хэрэглэгчид шууд хэл. Тоо зохиож болохгүй. Юуг бүртгэвэл тоо гарахыг (борлуулалт, ээлжийн тооллого, хаягдал) нэг өгүүлбэрээр зөвлө.",
      ].join("\n");
    }

    return [
      `[ӨНӨӨДРИЙН БОДИТ ТОО, ${today}, Asia/Ulaanbaatar. Самбартай ижил эх сурвалж]`,
      `- Орлого: ${mnt(revenue)}`,
      `- Өртөг (баталгаажсан барааны бодит): ${mnt(fin.actual_cogs)}; онолын өртөг: ${mnt(fin.theo_cogs)}`,
      `- Баталгаажсан барааны цэвэр зөрүү: ${mnt(fin.verified_gap)}`,
      `- Хаягдлын алдагдал: ${mnt(waste)}`,
      `- Тайлбаргүй зөрүү: ${mnt(unexplained)}`,
      `- Хэмжилтийн байдал: ${Number(trust.verified) || 0} баталгаажсан, ${Number(trust.missing) || 0} дутуу, ${Number(trust.check) || 0} шалгах, нийт ${measured} бараа`,
      "ДҮРЭМ: Зөвхөн дээрх тоог ашигла. 0 нь өгөгдөл байхгүй гэсэн утгатай байж болно, тэгвэл «өгөгдөл алга» гэж хэл. Дутуу эсвэл шалгах бараа байвал зөрүү бүрэн биш гэдгийг дурд. Эцэст нь 2-3 богино зөвлөгөө өг.",
    ].join("\n");
  } catch (err) {
    console.error("[overview snapshot]", err);
    return `[ӨНӨӨДРИЙН ТОО ТАТАЖ ЧАДСАНГҮЙ, ${today}]\nХэрэглэгчид өнөөдрийн тоог одоогоор татаж чадаагүй гэж хэл. Тоо зохиож болохгүй.`;
  }
}
