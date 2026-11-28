// Жорын Excel хуулбар. Түүхий эд, цэсийг өөрөө үүсгэхгүй.

import { cleanName, parseLooseNumber, splitPasteLine } from "./ingredientPaste";

export type RecipePasteRow = {
  lineNo: number;
  productName: string;
  ingredientName: string;
  amount: number;
  ingredientKnown: boolean;
  menuKnown: boolean;
};

export type RecipePasteResult = {
  rows: RecipePasteRow[];
  errors: string[];
  missingIngredients: string[];
  missingMenus: string[];
  duplicateKeys: string[];
  singleColumn: boolean;
};

export function foldRecipeName(value: string) {
  return cleanName(value).replace(/["'.]/g, "").toLowerCase();
}

function headerToken(value: string) {
  return foldRecipeName(value).replace(/[\s_\-]/g, "");
}

function columnIndex(cells: string[], words: string[]) {
  return cells.findIndex((cell) => {
    const token = headerToken(cell);
    return words.some((word) => token.includes(word));
  });
}

export function matchIngredientName(pasted: string, catalogNames: string[]) {
  const full = foldRecipeName(pasted);
  const english = foldRecipeName(pasted.split("(")[0]);
  for (const name of catalogNames) {
    const catalog = String(name || "");
    if (!cleanName(catalog)) continue;
    if (foldRecipeName(catalog) === full) return catalog;
    const catalogEnglish = foldRecipeName(catalog.split("(")[0]);
    if (english && catalogEnglish === full) return catalog;
    if (english && foldRecipeName(catalog) === english) return catalog;
    const mongolian = catalog.match(/\((.*?)\)/);
    if (mongolian?.[1] && foldRecipeName(mongolian[1]) === full) return catalog;
  }
  return null;
}

export function parseRecipePaste(
  text: string,
  catalog: { ingredientNames: string[]; productNames: string[] },
): RecipePasteResult {
  const lines = String(text || "").replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
  const occupied: { lineNo: number; cols: string[] }[] = [];
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    const cols = splitPasteLine(line, 3);
    if (cols.every((cell) => !cleanName(cell))) return;
    occupied.push({ lineNo: idx + 1, cols });
  });

  let prodIdx = 0;
  let ingIdx = 1;
  let amtIdx = 2;
  let start = 0;
  if (occupied.length > 0) {
    const head = occupied[0].cols.map(headerToken);
    const foundProd = columnIndex(head, ["бүтээгдэхүүн", "product", "цэс", "хоол", "menu"]);
    const foundIng = columnIndex(head, ["орц", "түүхий", "ingredient", "item", "материал"]);
    const foundAmt = columnIndex(head, ["хэмжээ", "тоо", "amount", "qty", "грамм", "мл"]);
    const hits = [foundProd, foundIng, foundAmt].filter((idx) => idx !== -1).length;
    if (hits >= 2) {
      if (foundProd !== -1) prodIdx = foundProd;
      if (foundIng !== -1) ingIdx = foundIng;
      if (foundAmt !== -1) amtIdx = foundAmt;
      start = 1;
    }
  }

  const errors: string[] = [];
  const byKey = new Map<string, RecipePasteRow>();
  const duplicateKeys = new Set<string>();
  const missingIngredients: string[] = [];
  const missingMenus: string[] = [];
  const seenMissingIng = new Set<string>();
  const seenMissingMenu = new Set<string>();
  let singleColumn = false;

  for (let i = start; i < occupied.length; i++) {
    const { lineNo, cols } = occupied[i];
    if (cols.length !== 3) {
      if (cols.length === 1) singleColumn = true;
      errors.push(
        `${lineNo}-р мөр: 3 багана хэрэгтэй (Бүтээгдэхүүн, Орц, Хэмжээ). Одоо ${cols.length} багана байна.`,
      );
      continue;
    }

    let productCell = cleanName(cols[prodIdx] || "");
    let ingredientCell = cleanName(cols[ingIdx] || "");
    let amountCell = cleanName(cols[amtIdx] || "");
    const ingredientNumber = parseLooseNumber(ingredientCell);
    const amountNumber = parseLooseNumber(amountCell);
    if (Number.isFinite(ingredientNumber) && !Number.isFinite(amountNumber)) {
      const swap = ingredientCell;
      ingredientCell = amountCell;
      amountCell = swap;
    }

    if (!productCell) {
      errors.push(`${lineNo}-р мөр: Бүтээгдэхүүний нэр хоосон байна.`);
      continue;
    }
    if (!ingredientCell) {
      errors.push(`${lineNo}-р мөр: Орцын нэр хоосон байна.`);
      continue;
    }
    const amount = parseLooseNumber(amountCell);
    if (!Number.isFinite(amount)) {
      errors.push(`${lineNo}-р мөр: Хэмжээ тоо биш байна. Жишээ: 1.5 эсвэл 1,5.`);
      continue;
    }
    if (amount <= 0) {
      errors.push(`${lineNo}-р мөр: Хэмжээ 0-ээс их байх ёстой.`);
      continue;
    }

    const matchedIngredient = matchIngredientName(ingredientCell, catalog.ingredientNames);
    const matchedProduct = matchIngredientName(productCell, catalog.productNames);
    const productName = matchedProduct || productCell;
    const ingredientName = matchedIngredient || ingredientCell;
    if (!matchedIngredient && !seenMissingIng.has(foldRecipeName(ingredientCell))) {
      seenMissingIng.add(foldRecipeName(ingredientCell));
      missingIngredients.push(ingredientCell);
    }
    if (!matchedProduct && !seenMissingMenu.has(foldRecipeName(productCell))) {
      seenMissingMenu.add(foldRecipeName(productCell));
      missingMenus.push(productCell);
    }

    const key = `${foldRecipeName(productName)}|${foldRecipeName(ingredientName)}`;
    const row: RecipePasteRow = {
      lineNo,
      productName,
      ingredientName,
      amount,
      ingredientKnown: Boolean(matchedIngredient),
      menuKnown: Boolean(matchedProduct),
    };
    if (byKey.has(key)) duplicateKeys.add(`${productName} / ${ingredientName}`);
    byKey.set(key, row);
  }

  return {
    rows: Array.from(byKey.values()),
    errors,
    missingIngredients,
    missingMenus,
    duplicateKeys: Array.from(duplicateKeys),
    singleColumn,
  };
}
