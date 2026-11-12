type Base = "ml" | "g" | "pc";

const UNITS: Record<string, { base: Base; factor: number }> = {
  мл: { base: "ml", factor: 1 },
  ml: { base: "ml", factor: 1 },
  л: { base: "ml", factor: 1000 },
  l: { base: "ml", factor: 1000 },
  литр: { base: "ml", factor: 1000 },
  гр: { base: "g", factor: 1 },
  г: { base: "g", factor: 1 },
  g: { base: "g", factor: 1 },
  кг: { base: "g", factor: 1000 },
  kg: { base: "g", factor: 1000 },
  ш: { base: "pc", factor: 1 },
  ширхэг: { base: "pc", factor: 1 },
  pc: { base: "pc", factor: 1 },
};

function norm(unit: string) {
  return UNITS[unit.trim().toLowerCase()] || null;
}

/** Convert a spoken or printed quantity into the ingredient's unit. Unknown units are left unchanged. */
export function convertToIngredientUnit(qty: number, fromUnit: string | null | undefined, ingredientUnit: string) {
  if (!Number.isFinite(qty)) return qty;
  if (!fromUnit) return qty;
  const from = norm(fromUnit);
  const to = norm(ingredientUnit || "");
  if (!from || !to || from.base !== to.base) return qty;
  return (qty * from.factor) / to.factor;
}
