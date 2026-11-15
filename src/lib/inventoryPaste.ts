function cleanHeader(str: string) {
  return (str || "").toLowerCase().replace(/[\r\n\s\-_.]/g, "").trim();
}

function cleanCell(str: string) {
  return (str || "").replace(/[\u00a0\s]+/g, " ").trim();
}

export function splitPasteRow(line: string) {
  const trimmed = line.trim();
  if (trimmed.includes("\t")) return trimmed.split("\t").map((cell) => cell.trim());
  if (/\s{2,}/.test(trimmed)) return trimmed.split(/\s{2,}/).map((cell) => cell.trim());
  return [trimmed];
}

export type ParsedCountRow = { itemName: string; qty: number; explicitDate: string | null };

export function parseInventoryCountPaste(text: string): { ok: true; rows: ParsedCountRow[] } | { ok: false; badRow: string } {
  const rows = text.trim().split("\n");
  if (!rows.length || !text.trim()) return { ok: true, rows: [] };

  const headerCols = splitPasteRow(rows[0]).map(cleanHeader);
  const nameIdx = headerCols.findIndex(
    (cell) => cell.includes("бараа") || cell.includes("item") || cell.includes("нэр") || cell.includes("ингредиент") || cell.includes("product"),
  );
  const qtyIdx = headerCols.findIndex(
    (cell) => cell.includes("тоо") || cell.includes("хэмжээ") || cell.includes("qty") || cell.includes("count") || cell.includes("үлдэгдэл") || cell.includes("amount"),
  );
  const dateIdx = headerCols.findIndex((cell) => cell.includes("огноо") || cell.includes("date") || cell.includes("өдөр"));
  const hasSmartHeader = nameIdx !== -1 && qtyIdx !== -1;
  const parsed: ParsedCountRow[] = [];

  for (let index = hasSmartHeader ? 1 : 0; index < rows.length; index++) {
    const row = rows[index].trim();
    if (!row) continue;
    const cols = splitPasteRow(row).map((cell) => cell.trim());
    if (cols.length < 2) return { ok: false, badRow: row };

    let itemName = "";
    let qty = 0;
    let explicitDate: string | null = null;

    if (hasSmartHeader) {
      itemName = cleanCell(cols[nameIdx] || "");
      qty = parseFloat((cols[qtyIdx] || "0").replace(/[^0-9.-]/g, "")) || 0;
      if (dateIdx !== -1 && cols[dateIdx] && /\d{4}[./-]\d{2}/.test(cols[dateIdx])) explicitDate = cols[dateIdx];
    } else {
      const col0IsNum = !isNaN(Number(cols[0]?.replace(/[^0-9.-]/g, "")));
      const col1IsText = isNaN(Number(cols[1]));
      if (cols.length >= 2 && col0IsNum && col1IsText) {
        qty = parseFloat(cols[0].replace(/[^0-9.-]/g, "")) || 0;
        itemName = cleanCell(cols[1]);
      } else if (cols.length >= 2) {
        itemName = cleanCell(cols[0]);
        qty = parseFloat(cols[1].replace(/[^0-9.-]/g, "")) || 0;
      }
      if (cols[2] && /\d{4}[./-]\d{2}/.test(cols[2])) explicitDate = cols[2];
    }

    if (!itemName || Number.isNaN(qty)) continue;
    parsed.push({ itemName, qty, explicitDate });
  }

  return { ok: true, rows: parsed };
}

export function inventoryImportMessage(saved: number, auditDate: string, unmatched: string[]) {
  const missing = unmatched.length ? `\nОлдоогүй бараа (хадгалагдаагүй): ${unmatched.join(", ")}` : "";
  return ` Амжилттай! Нийт ${saved} барааны тооллого (${auditDate}) хадгалагдлаа.${missing}`;
}
