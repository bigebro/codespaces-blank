// Түүхий эдийн Excel хуулбар. Файл уншихгүй, зөвхөн наасан текстийг задална.

export type ParsedIngredient = {
  lineNo: number;
  name: string;
  unit: string;
  unitPrice: number;
  parLevel: number;
  unitRecognized: boolean;
};

export type IngredientPasteResult = {
  items: ParsedIngredient[];
  errors: string[];
  duplicateNames: string[];
  unknownUnits: { lineNo: number; name: string; unit: string }[];
  singleColumn: boolean;
};

const UNIT_MAP: Record<string, string> = {
  гр: "гр",
  г: "гр",
  g: "гр",
  gr: "гр",
  gram: "гр",
  grams: "гр",
  gramm: "гр",
  грамм: "гр",
  мл: "мл",
  ml: "мл",
  milliliter: "мл",
  millilitre: "мл",
  миллилитр: "мл",
  ш: "ш",
  ширхэг: "ш",
  ширх: "ш",
  pc: "ш",
  pcs: "ш",
  piece: "ш",
  pieces: "ш",
  item: "ш",
  ea: "ш",
  each: "ш",
  кг: "кг",
  kg: "кг",
  kilogram: "кг",
  килограмм: "кг",
  кило: "кг",
  л: "л",
  l: "л",
  lt: "л",
  liter: "л",
  litre: "л",
  литр: "л",
  порц: "порц",
  portion: "порц",
  portions: "порц",
};

const HEADER_FIRST = new Set([
  "нэр",
  "барааны нэр",
  "түүхий эд",
  "түүхий эдийн нэр",
  "item",
  "name",
  "ingredient",
]);

export const INGREDIENT_TEMPLATE_ROWS: (string | number)[][] = [
  ["Барааны нэр", "Нэгж", "Нэгжийн үнэ", "Хэвийн нөөц"],
  ["Сүү", "мл", 5.8, 20000],
  ["Кофе үр", "гр", 85, 5000],
  ["Өндөг", "ш", 500, 30],
];

const MAX_PRICE = 99_999_999.99;

export function nameKey(name: string) {
  return cleanName(name).toLowerCase();
}

export function cleanName(value: string) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unquote(cell: string) {
  const t = cell.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/""/g, '"').trim();
  }
  return t;
}

export function splitPasteLine(line: string): string[] {
  const raw = line.replace(/^\uFEFF/, "");
  let cells: string[];
  if (raw.includes("\t")) cells = raw.split("\t");
  else if (/[ ]{2,}|\u00a0{2,}/.test(raw.trim())) cells = raw.trim().split(/\s{2,}/);
  else if (raw.split(";").length >= 4) cells = raw.split(";");
  else cells = [raw.trim()];
  const trimmed = cells.map((cell) => unquote(cell.replace(/\u00a0/g, " ")));
  while (trimmed.length > 4 && trimmed[trimmed.length - 1] === "") trimmed.pop();
  return trimmed;
}

/** 5,8 → 5.8. 5,800 болон 1.234.567 → мянгатын тусгаарлагч. 5.8 хэвээр. */
export function parseLooseNumber(cell: string): number {
  let s = String(cell ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[₮¥$€]/g, "")
    .trim();
  if (!s || s === "—" || s === "-" || s === "–") return NaN;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^-/, "").replace(/\s/g, "");
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return NaN;

  const commas = (s.match(/,/g) || []).length;
  const dots = (s.match(/\./g) || []).length;

  if (commas > 0 && dots > 0) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (commas === 1) {
    const [head, tail] = s.split(",");
    s = tail.length > 0 && tail.length <= 2 ? `${head}.${tail}` : `${head}${tail}`;
  } else if (commas > 1) {
    s = s.replace(/,/g, "");
  } else if (dots > 1) {
    const parts = s.split(".");
    if (!parts.slice(1).every((part) => part.length === 3)) return NaN;
    s = parts.join("");
  }

  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return neg ? -n : n;
}

export function normalizeUnit(raw: string): { unit: string; recognized: boolean } {
  let s = String(raw || "")
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/^per\s+/i, "")
    .replace(/^1\s+/, "")
    .replace(/^1(?=[^\d\s])/i, "")
    .replace(/\.+$/, "")
    .trim();
  if (!s) return { unit: "", recognized: false };
  const mapped = UNIT_MAP[s.toLowerCase()];
  if (mapped) return { unit: mapped, recognized: true };
  return { unit: s, recognized: false };
}

function headerCell(value: string) {
  return cleanName(value)
    .toLowerCase()
    .replace(/[._\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeaderRow(cols: string[]) {
  const first = headerCell(cols[0] || "");
  const second = headerCell(cols[1] || "");
  if (HEADER_FIRST.has(first)) return true;
  if (second === "нэгж" || second.startsWith("нэгж ") || second === "unit") return true;
  return false;
}

export function parseIngredientPaste(text: string): IngredientPasteResult {
  const rows = String(text || "").replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
  const byKey = new Map<string, ParsedIngredient>();
  const duplicateKeys = new Set<string>();
  const errors: string[] = [];
  const unknownUnits: IngredientPasteResult["unknownUnits"] = [];
  let singleColumn = false;

  rows.forEach((row, idx) => {
    if (!row.trim()) return;
    const lineNo = idx + 1;
    const cols = splitPasteLine(row);
    if (cols.every((cell) => !cleanName(cell))) return;
    if (isHeaderRow(cols)) return;

    const name = cleanName(cols[0] || "");
    if (cols.length !== 4) {
      if (cols.length === 1) singleColumn = true;
      errors.push(
        `${lineNo}-р мөр: 4 багана хэрэгтэй (Барааны нэр, Нэгж, Нэгжийн үнэ, Хэвийн нөөц). Одоо ${cols.length} багана байна.`,
      );
      return;
    }
    if (!name) {
      errors.push(`${lineNo}-р мөр: Барааны нэр хоосон байна.`);
      return;
    }
    if (name.length > 255) {
      errors.push(`${lineNo}-р мөр: Нэр 255 тэмдэгтээс урт байна.`);
      return;
    }

    const unitRaw = cols[1] || "";
    if (!cleanName(unitRaw) || /^[0-9\s.,₮\-–—]+$/.test(cleanName(unitRaw))) {
      errors.push(
        `${lineNo}-р мөр: Нэгж хоосон эсвэл тоо байна. мл, гр, ш, кг, л, порц гэж бичнэ үү.`,
      );
      return;
    }
    const { unit, recognized } = normalizeUnit(unitRaw);
    if (!unit || unit.length > 50) {
      errors.push(`${lineNo}-р мөр: Нэгж хоосон эсвэл хэт урт байна.`);
      return;
    }

    const priceCell = cleanName(cols[2] || "");
    if (!priceCell) {
      errors.push(`${lineNo}-р мөр: Нэгжийн үнэ хоосон байна. Жишээ: 5.8 эсвэл 5,8.`);
      return;
    }
    const price = parseLooseNumber(priceCell);
    if (!Number.isFinite(price)) {
      errors.push(`${lineNo}-р мөр: Нэгжийн үнэ тоо биш байна. Жишээ: 5.8 эсвэл 5,8.`);
      return;
    }
    if (price < 0) {
      errors.push(`${lineNo}-р мөр: Нэгжийн үнэ хасах тоо байна.`);
      return;
    }
    if (price > MAX_PRICE) {
      errors.push(`${lineNo}-р мөр: Нэгжийн үнэ хэт их байна.`);
      return;
    }

    const parCell = cleanName(cols[3] || "");
    const par = parCell === "" ? 0 : parseLooseNumber(parCell);
    if (!Number.isFinite(par)) {
      errors.push(`${lineNo}-р мөр: Хэвийн нөөц тоо биш байна. Хоосон бол 0.`);
      return;
    }
    if (par < 0) {
      errors.push(`${lineNo}-р мөр: Хэвийн нөөц хасах тоо байна.`);
      return;
    }

    if (!recognized) unknownUnits.push({ lineNo, name, unit });
    const item: ParsedIngredient = {
      lineNo,
      name,
      unit,
      unitPrice: Math.round(price * 100) / 100,
      parLevel: par,
      unitRecognized: recognized,
    };
    const key = nameKey(name);
    if (byKey.has(key)) duplicateKeys.add(key);
    byKey.set(key, item);
  });

  return {
    items: Array.from(byKey.values()),
    errors,
    duplicateNames: Array.from(duplicateKeys).map((key) => byKey.get(key)?.name || key),
    unknownUnits,
    singleColumn,
  };
}

export function ingredientSaveError(message: string) {
  const text = String(message || "").trim();
  if (/unique_ingredient|duplicate key|23505/i.test(text)) {
    return "Хадгалаагүй. Ижил нэр давхардсан тул хадгалж чадсангүй.";
  }
  if (/value too long|22001/i.test(text)) {
    return "Хадгалаагүй. Нэр эсвэл нэгж хэт урт байна.";
  }
  if (/numeric field overflow|22003/i.test(text)) {
    return "Хадгалаагүй. Үнэ эсвэл нөөц хэт их байна.";
  }
  return text ? `Хадгалаагүй. ${text}` : "Хадгалаагүй.";
}
