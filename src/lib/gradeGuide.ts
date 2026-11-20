import { displayUnit, UNEXPLAINED_GAP_HINT } from "@/lib/shiftCycle";
import { STATUS_LABEL, normalizeStatus } from "@/lib/honestDashboard";

export type GradeGuideInput = {
  status?: string;
  unit?: string;
  action?: string | null;
  fixable?: boolean;
  reasons?: string[];
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
  waste_spill?: number | null;
  waste_testing?: number | null;
  waste_staff_meal?: number | null;
  waste_other?: number | null;
  unexplained_event_qty?: number | null;
  unexplained_event_money?: number | null;
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

/** Самбар болон AI-ийн барааны тооны нэг эх сурвалж. */
export type ItemVarianceFacts = {
  unit: string;
  unitText: string;
  hasStart: boolean;
  hasEnd: boolean;
  partial: boolean;
  wasteKnown: boolean;
  spoilage: number;
  spill: number;
  testing: number;
  staffMeal: number;
  other: number;
  logged: number;
  theo: number | null;
  actual: number | null;
  gapQty: number | null;
  gapMoney: number | null;
  start: number | null;
  end: number | null;
  purchased: number | null;
  unexplainedQty: number | null;
  eventUnexplainedQty: number | null;
  eventUnexplainedMoney: number | null;
};

export function itemVarianceFacts(row: GradeGuideInput): ItemVarianceFacts {
  const unit = displayUnit(row.unit || "");
  const unitText = unit ? ` ${unit}` : "";
  const partial = Boolean(row.partial || row.measured_from);
  const hasStart = row.has_start === true;
  const hasEnd = row.has_end === true;
  const wasteKnown = [row.waste_spoilage, row.waste_testing, row.waste_staff_meal, row.waste_other].every(known);
  const spoilage = wasteKnown ? Number(row.waste_spoilage) : 0;
  const spill = wasteKnown && known(row.waste_spill) ? Number(row.waste_spill) : wasteKnown ? 0 : 0;
  const testing = wasteKnown ? Number(row.waste_testing) : 0;
  const staffMeal = wasteKnown ? Number(row.waste_staff_meal) : 0;
  const other = wasteKnown ? Number(row.waste_other) : 0;
  const logged = spoilage + spill + testing + staffMeal + other;
  const theo = known(row.theoretical_qty) ? Number(row.theoretical_qty) : null;
  const actual = known(row.actual_qty) ? Number(row.actual_qty) : null;
  // Хэсэгчилсэн хугацаанд gap_qty null. Бүтэн хугацааны жортой хасаж хуурамч зөрүү гаргахгүй.
  const gapQty = known(row.gap_qty) ? Number(row.gap_qty) : null;
  const gapMoney = known(row.gap_money) ? Number(row.gap_money) : null;
  const start = known(row.start_qty) ? Number(row.start_qty) : null;
  const end = known(row.end_qty) ? Number(row.end_qty) : null;
  const purchased = known(row.purchased_qty) ? Number(row.purchased_qty) : null;
  const unexplainedQty = gapQty == null || !wasteKnown ? null : gapQty - logged;
  return {
    unit,
    unitText,
    hasStart,
    hasEnd,
    partial,
    wasteKnown,
    spoilage,
    spill,
    testing,
    staffMeal,
    other,
    logged,
    theo,
    actual,
    gapQty,
    gapMoney,
    start,
    end,
    purchased,
    unexplainedQty,
    eventUnexplainedQty: known(row.unexplained_event_qty) ? Number(row.unexplained_event_qty) : null,
    eventUnexplainedMoney: known(row.unexplained_event_money) ? Number(row.unexplained_event_money) : null,
  };
}

/** Самбарын барааны картай ижил өгүүлбэрүүд. AI үүнийг шууд хэрэглэнэ. */
export function dashboardItemFactsText(row: GradeGuideInput): string {
  return gradeGuide(row).facts.join(" ");
}

function isNotableGrade(row: any) {
  const v = itemVarianceFacts(row);
  if (v.logged > 0.0001) return true;
  if (v.unexplainedQty != null && Math.abs(v.unexplainedQty) > 0.05) return true;
  if (v.gapQty != null && Math.abs(v.gapQty) > 0.05) return true;
  return normalizeStatus(row?.status) !== "Verified";
}

/** Самбарын барааны картын өгүүлбэрийг яг тэр хэлбэрээр AI-д өгнө. */
export function gradeFactLines(grades: any[] = []): string {
  const rows = (grades || []).filter(isNotableGrade);
  if (!rows.length) return "Зөрүүтэй, хаягдалтай, эсвэл шалгах барааны мөр алга.";
  return rows.map((row) => {
    const name = String(row?.name || "").trim() || "Нэргүй бараа";
    const status = STATUS_LABEL[normalizeStatus(row?.status)];
    return `- ${name} (${status}): ${dashboardItemFactsText(row)}`;
  }).join("\n");
}


export function gradeGuide(row: GradeGuideInput): GradeGuide {
  const action = row.action || null;
  const v = itemVarianceFacts(row);
  const unit = v.unit;
  const unitText = v.unitText;
  const partial = v.partial;
  const hasStart = v.hasStart;
  const hasEnd = v.hasEnd;
  const wasteKnown = v.wasteKnown;
  const spoilage = v.spoilage;
  const spill = v.spill;
  const testing = v.testing;
  const staffMeal = v.staffMeal;
  const other = v.other;
  const logged = v.logged;
  const theo = v.theo;
  const actual = v.actual;
  const gap = v.gapQty;
  const ended = row.fixable === false;
  const lateEnd = (row.reasons || []).some((r) => r.includes("7 хоног өнгөрсний дараа"));
  const start = v.start;
  const end = v.end;
  const bought = v.purchased;

  const facts: string[] = [];
  if (hasStart && hasEnd && start != null && end != null) {
    const boughtText = bought == null ? "Мэдээлэл дутуу" : qty(bought);
    facts.push(`Эхлэх тоо ${qty(start)}${unitText}, орлого ${boughtText}${unitText}, эцсийн тоо ${qty(end)}${unitText}.`);
  } else if (hasStart && start != null) {
    facts.push(`Эхлэх тоо ${qty(start)}${unitText}.`);
  } else if (hasEnd && end != null && !partial) {
    facts.push(`Эцсийн тоо ${qty(end)}${unitText}.`);
  }
  if (theo != null) {
    facts.push(Math.abs(theo) <= 0.0001
      ? `Борлуулалт алга, жор 0${unitText}.`
      : `Жор ${qty(theo)}${unitText} зарцуулсан гэж тооцсон.`);
  }
  if (actual != null && gap != null) {
    facts.push(`Бодитоор ${qty(actual)}${unitText} гарсан. Зөрүү ${qty(gap)}${unitText}.`);
  } else if (actual != null && partial) {
    facts.push(`Хэмжсэн хугацаанд бодитоор ${qty(actual)}${unitText} гарсан.`);
  }
  if (!wasteKnown) {
    facts.push("Хаягдлын бүртгэл энэ мөрөнд ирээгүй. Мэдээлэл дутуу.");
  } else if (logged <= 0.0001) {
    facts.push(`Хаягдал бүртгэл 0${unitText}.`);
  } else {
    facts.push(`Хаягдал бүртгэгдсэн ${qty(logged)}${unitText}. Муудсан ${qty(spoilage)}, Асгарсан/Алдаа ${qty(spill)}, Туршилт ${qty(testing)}, Ажилтны хоол ${qty(staffMeal)}, Бусад ${qty(other)}.`);
  }
  if (gap == null) facts.push("Тооны зөрүүг тооцоолоогүй.");
  else if (Math.abs(gap) <= 0.05) facts.push("Тооны зөрүү алга.");
  else if (!known(row.gap_money)) facts.push("Мөнгөн зөрүүг тооцоолоогүй.");
  else if (Number(row.gap_money) === 0) facts.push("Үнэ алга. Тооны зөрүүг мөнгөөр харуулахгүй.");
  else facts.push(`Мөнгөн зөрүү ${money(Number(row.gap_money))}.`);
  if (row.status === "Check" && gap != null && Math.abs(gap) > 0.05) {
    facts.push("Шар мөр тул энэ зөрүү Алдагдал, Илүүдэл, Тайлбаргүй зөрүүгийн нийт дүнд ороогүй.");
  }
  if (v.unexplainedQty == null && v.eventUnexplainedQty != null && v.eventUnexplainedQty > 0.05) {
    const moneyBit = v.eventUnexplainedMoney != null
      ? ` / ${Math.round(v.eventUnexplainedMoney).toLocaleString("en-US")}₮`
      : "";
    facts.push(`Тайлбаргүй зөрүү ${qty(v.eventUnexplainedQty)}${unitText}${moneyBit}.`);
  }

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
      ? "Эхлэх тоо болон эцсийн тоо хоёул алга."
      : !hasStart
        ? "Эхлэх тоо алга."
        : "Эцсийн тоо алга.";
    return {
      facts: [missing, ...facts],
      countTask: !hasEnd && !ended,
      steps: [
        !hasEnd
          ? ended
            ? "Хугацаа дууссан. Одоо тоолох нь энэ хугацааг засахгүй. Хугацааны сүүлийн өдрийн тоо цаас эсвэл Excel дээр байвал Бөөнөөр импортлох хэсгээр яг тэр өдрөөр оруул."
            : "Таблет дээр энэ барааг одоо тоол, эсвэл Тоолох даалгавар үүсгэ."
          : "Эцсийн тоо байна. Шинэ тооллого энэ мөрийг засахгүй.",
        !hasStart
          ? "Хугацааны эхний тоо цаас эсвэл Excel дээр байвал Бөөнөөр импортлох хэсгээр яг тэр өдрөөр оруул."
          : "Эхлэх тоо байна. Түүнийг бүү дарж бич.",
        "Хоёр тоо хоёул орсон хойно л зөрүүг уншина.",
      ],
    };
  }

  if (lateEnd) {
    return {
      facts: [...facts, "Эцсийн тооллого хугацаа дууссанаас 7 хоногоос хойш хийгдсэн. Энэ хооронд орсон зарлага, орлого зөрүүг бүдгэрүүлнэ."],
      countTask: false,
      steps: [
        "Тоолох даалгавар бүү үүсгэ.",
        "Хугацааны сүүлийн өдрийн тоо цаас эсвэл Excel дээр байвал Бөөнөөр импортлох хэсгээр яг тэр өдрөөр оруул.",
        "Олдохгүй бол энэ хугацаа шар хэвээр үлдэнэ. Дараагийн хугацааны сүүлийн өдөр тоол.",
      ],
    };
  }

  const unexplained = gap == null || !wasteKnown ? null : gap - logged;
  if (unexplained != null && gap != null && gap >= -0.0001 && near(unexplained, 0) && logged > 0.0001) {
    return {
      facts: [...facts, "Бууралт бүртгэсэн хаягдалтай таарсан. Тайлбаргүй үлдэгдэл 0."],
      countTask: false,
      steps: [
        "Тоолох даалгавар хэрэггүй. Эхлэх тоо болон эцсийн тоо аль хэдийн байна.",
        "Хаягдал дээр нэмж бүртгэх зүйл алга.",
        theo != null && Math.abs(theo) <= 0.0001
          ? "Мөр шар хэвээр үлдэнэ. Жор 0 үед ямар ч бууралт 30%-иас их гэж тэмдэглэгддэг. Өнгө нь засах ажил гэсэн үг биш."
          : "Мөр шар хэвээр үлдэнэ. Хаягдал жорын зарцуулалтаас 30%-иас их байна. Өнгө нь засах ажил гэсэн үг биш.",
      ],
    };
  }
  if (unexplained != null && unexplained > 0.05) {
    return {
      facts: [...facts, `Тайлбаргүй ${qty(unexplained)}${unitText}.`],
      countTask: false,
      steps: [
        "Тоолох даалгавар бүү үүсгэ. Эхлэх тоо болон эцсийн тоо аль хэдийн байна.",
        UNEXPLAINED_GAP_HINT,
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
        "Таблетын түүхээс энэ барааны хаягдлыг нээ. Давхардсан эсвэл буруу тоотой мөрийг засаарай.",
        "Хаягдал зөв бол эхлэх эсвэл эцсийн тооллогын цаасан тоог тухайн өдрөөр импортолно.",
      ],
    };
  }
  if (gap != null && gap < -0.05) {
    return {
      facts: [...facts, `Үлдэгдэл хүлээгдэж байснаас ${qty(Math.abs(gap))}${unitText} их байна.`],
      countTask: false,
      steps: [
        "Тоолох даалгавар бүү үүсгэ. Хоёр тоо аль хэдийн байна.",
        "Энэ хугацааны орлого бүртгэлээ нээ. Бараа ирсэн мөртлөө орлого алга бол таблет дээр орлогоор яг ирсэн тоог бүртгэ.",
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
