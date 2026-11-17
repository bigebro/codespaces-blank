import { displayUnit } from "@/lib/shiftCycle";

export type GradeGuideInput = {
  status?: string;
  unit?: string;
  action?: string | null;
  partial?: boolean;
  has_start?: boolean;
  has_end?: boolean;
  start_qty?: number | null;
  end_qty?: number | null;
  purchased_qty?: number | null;
  theoretical_qty?: number | null;
  actual_qty?: number | null;
  gap_qty?: number | null;
  gap_money?: number | null;
  measured_from?: string | null;
  waste_spoilage?: number | null;
  waste_testing?: number | null;
  waste_staff_meal?: number | null;
  waste_other?: number | null;
};

export type GradeGuide = {
  facts: string[];
  steps: string[];
  countTask: boolean;
};

function qty(value: number) {
  const rounded = Math.round((Number(value) || 0) * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return String(rounded);
}

function money(value: number) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("en-US")}₮`;
}

function near(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(0.05, Math.abs(a) * 0.02);
}

function known(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(Number(value));
}

export function gradeGuide(row: GradeGuideInput): GradeGuide {
  const unit = displayUnit(row.unit || "");
  const unitText = unit ? ` ${unit}` : "";
  const action = row.action || null;
  const partial = Boolean(row.partial || row.measured_from);
  const hasStart = row.has_start === true;
  const hasEnd = row.has_end === true;
  const wasteKnown = [row.waste_spoilage, row.waste_testing, row.waste_staff_meal, row.waste_other].every(known);
  const spoilage = wasteKnown ? Number(row.waste_spoilage) : 0;
  const testing = wasteKnown ? Number(row.waste_testing) : 0;
  const staffMeal = wasteKnown ? Number(row.waste_staff_meal) : 0;
  const other = wasteKnown ? Number(row.waste_other) : 0;
  const logged = spoilage + testing + staffMeal + other;
  const theo = known(row.theoretical_qty) ? Number(row.theoretical_qty) : null;
  const actual = known(row.actual_qty) ? Number(row.actual_qty) : null;
  const gap = known(row.gap_qty) ? Number(row.gap_qty) : (actual != null && theo != null ? actual - theo : null);
  const start = known(row.start_qty) ? Number(row.start_qty) : null;
  const end = known(row.end_qty) ? Number(row.end_qty) : null;
  const bought = known(row.purchased_qty) ? Number(row.purchased_qty) : null;

  const facts: string[] = [];
  if (hasStart && hasEnd && start != null && end != null) {
    const boughtText = bought == null ? "Мэдээлэл дутуу" : qty(bought);
    facts.push(`Эхлэх тоо ${qty(start)}${unitText}, орлого ${boughtText}${unitText}, одоогийн тоо ${qty(end)}${unitText}.`);
  }
  if (theo != null) {
    facts.push(Math.abs(theo) <= 0.0001
      ? `Борлуулалт алга, жор 0${unitText}.`
      : `Жор ${qty(theo)}${unitText} зарцуулсан гэж тооцсон.`);
  }
  if (actual != null && gap != null) {
    facts.push(`Бодитоор ${qty(actual)}${unitText} гарсан. Зөрүү ${qty(gap)}${unitText}.`);
  }
  if (!wasteKnown) {
    facts.push("Хаягдлын бүртгэл энэ мөрөнд ирээгүй. Мэдээлэл дутуу.");
  } else if (logged <= 0.0001) {
    facts.push(`Хаягдал бүртгэл 0${unitText}.`);
  } else {
    facts.push(`Хаягдал бүртгэгдсэн ${qty(logged)}${unitText}. Муудсан ${qty(spoilage)}, Туршилт ${qty(testing)}, Ажилтны хоол ${qty(staffMeal)}, Бусад ${qty(other)}.`);
  }
  if (gap == null) facts.push("Тооны зөрүүг тооцоолоогүй.");
  else if (Math.abs(gap) <= 0.05) facts.push("Тооны зөрүү алга.");
  else if (!known(row.gap_money) || Math.abs(Number(row.gap_money)) < 1) facts.push("Үнэ алга. Тооны зөрүүг мөнгөөр харуулахгүй.");
  else facts.push(`Мөнгөн зөрүү ${money(Number(row.gap_money))}.`);

  if (action === "date") {
    return {
      facts,
      countTask: false,
      steps: [
        "Тоолох даалгавар үүсгэхгүй. Тоо аль хэдийн байгаа.",
        "Энэ мөрний огноо засах товчийг дар.",
        "Бүртгэлийн жинхэнэ өдрийг сонгоод хадгал. Ирээдүйн өдөр үлдээхгүй.",
      ],
    };
  }
  if (action === "price") {
    return {
      facts,
      countTask: false,
      steps: [
        "Тоолох даалгавар үүсгэхгүй.",
        "Үнэ оруулах товчийг дар.",
        "Тухайн орлогын нийт төгрөгийг бичээд хадгал. Нэгжийн үнийг битгий таа.",
      ],
    };
  }
  if (action === "duplicate") {
    return {
      facts,
      countTask: false,
      steps: [
        "Тоолох даалгавар үүсгэхгүй.",
        "Хоёр орлогын мөрийг нээ.",
        "Жинхэнэ мөрийг үлдээгээд нөгөөг нь устга. Хоёуланг нь үлдээвэл орлого хоёр дахин тооцогдоно.",
      ],
    };
  }
  if (partial) {
    return {
      facts: [
        "Тооллого хугацааны дундаас эхэлсэн.",
        ...facts,
        "Жорын тоо бүтэн хугацааны тоо. Хэмжсэн богино хугацааны бодит тоотой шууд зөрүү гэж бүү харьцуул.",
      ],
      countTask: false,
      steps: [
        "Одоо дахин тоолох нь энэ шарыг арилгахгүй.",
        "Хэрэв хугацааны эхний тоо цаас эсвэл Excel дээр байвал Бөөнөөр импортлох хэсгийн агуулахын тооллогоор яг тэр өдрөөр оруул.",
        "Эхний тоо олдохгүй бол энэ хугацаа шар хэвээр үлдэнэ. Дараагийн хугацааны эхэнд тоол.",
      ],
    };
  }
  if (!hasStart || !hasEnd) {
    const missing = !hasStart && !hasEnd
      ? "Эхлэх тоо болон одоогийн тоо хоёул алга."
      : !hasStart
        ? "Эхлэх тоо алга."
        : "Одоогийн тоо алга.";
    return {
      facts: [missing, ...facts],
      countTask: !hasEnd,
      steps: [
        !hasEnd
          ? "Киоск дээр энэ барааг одоо тоол, эсвэл Тоолох даалгавар үүсгэ."
          : "Одоогийн тоо байна. Шинэ тооллого энэ мөрийг засахгүй.",
        !hasStart
          ? "Хугацааны эхний тоо цаас эсвэл Excel дээр байвал Бөөнөөр импортлох хэсгээр яг тэр өдрөөр оруул."
          : "Эхлэх тоо байна. Түүнийг бүү дарж бич.",
        "Хоёр тоо хоёул орсон хойно л зөрүүг уншина.",
      ],
    };
  }

  const unexplained = gap == null || !wasteKnown ? null : gap - logged;
  if (unexplained != null && gap != null && gap >= -0.0001 && near(unexplained, 0) && logged > 0.0001) {
    return {
      facts: [...facts, "Бууралт бүртгэсэн хаягдалтай таарсан. Тайлбаргүй үлдэгдэл 0."],
      countTask: false,
      steps: [
        "Тоолох даалгавар хэрэггүй. Эхлэх тоо болон одоогийн тоо аль хэдийн байна.",
        "Хаягдал дээр нэмж бүртгэх зүйл алга.",
        "Мөр шар хэвээр үлдэнэ. Жор 0 үед ямар ч бууралт 30%-иас их гэж тэмдэглэгддэг. Өнгө нь засах ажил гэсэн үг биш.",
      ],
    };
  }
  if (unexplained != null && unexplained > 0.05) {
    return {
      facts: [...facts, `Тайлбаргүй ${qty(unexplained)}${unitText}.`],
      countTask: false,
      steps: [
        "Тоолох даалгавар бүү үүсгэ. Эхлэх тоо болон одоогийн тоо аль хэдийн байна.",
        `Киоск дээр Хаягдал цэсийг нээ. Тайлбаргүй ${qty(unexplained)}${unitText}-ийг нэг шалтгаанаар бүртгэ: Муудсан, Туршилт, Ажилтны хоол, Асгарсан, эсвэл Бусад.`,
        theo != null && Math.abs(theo) <= 0.0001
          ? "Жор 0 байгаа тул борлуулалт энэ барааг олоогүй. Зарагдсан гэж үзэж байвал жорын нэрийг борлуулалтын нэртэй тулга."
          : "Хэрэв жор бага байгаа бол жорыг нээж нэг борлуулалтын орцыг шалга. Тоог таахгүй.",
        "Тооллого буруу байсан бол цаасан дээрх тоог тухайн өдрөөр импортолно. Өнөөдрийн шинэ тоо энэ хугацааг засахгүй.",
      ],
    };
  }
  if (unexplained != null && unexplained < -0.05 && gap != null && gap >= -0.0001) {
    return {
      facts: [...facts, `Хаягдал бодит бууралтаас ${qty(Math.abs(unexplained))}${unitText} их байна.`],
      countTask: false,
      steps: [
        "Тоолох даалгавар бүү үүсгэ.",
        "Киоскын түүхээс энэ барааны хаягдлыг нээ. Давхардсан эсвэл буруу тоотой мөрийг засаарай.",
        "Хаягдал зөв бол эхлэх эсвэл одоогийн тооллогын цаасан тоог тухайн өдрөөр импортолно.",
      ],
    };
  }
  if (gap != null && gap < -0.05) {
    return {
      facts: [...facts, `Үлдэгдэл хүлээгдэж байснаас ${qty(Math.abs(gap))}${unitText} их байна.`],
      countTask: false,
      steps: [
        "Тоолох даалгавар бүү үүсгэ. Хоёр тоо аль хэдийн байна.",
        "Энэ хугацааны орлого бүртгэлээ нээ. Бараа ирсэн мөртлөө орлого алга бол киоск дээр орлогоор яг ирсэн тоог бүртгэ.",
        "Орлого зөв бол жорыг нээж нэг борлуулалтын орцыг шалга. Жор хэт их бол бодит үлдэгдэл их харагдана.",
        "Тооллого буруу байсан бол цаасан тоог тухайн өдрөөр импортолно. Өнөөдрийн шинэ тоо энэ хугацааг засахгүй.",
      ],
    };
  }
  return {
    facts: facts.length ? facts : ["Мэдээлэл дутуу."],
    countTask: false,
    steps: [
      "Тоолох даалгавар бүү үүсгэ.",
      "Дээрх тоонуудаас аль нь хоосон байгааг хар. Хоосон тоог бүү 0 гэж үз.",
      "Цаасан бүртгэл байвал тухайн өдрөөр импортолно. Байхгүй бол энэ мөрийг таахгүйгээр үлдээнэ.",
    ],
  };
}
