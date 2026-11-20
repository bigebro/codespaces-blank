/** Зөвхөн нэрний эхэнд байгаа дүрс/тэмдэгийг хасна. Эхний үгийг хасаж болохгүй. */
export function categoryDisplayName(name: string): string {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const stripped = raw.replace(/^[\p{Extended_Pictographic}\p{So}\p{Sk}\s]+/u, "").trim();
  return stripped || raw;
}

/** Ангиллын нэрийг том/жижиг үсэг үл харгалзан нэг мөр болгоно. Эхний хэлбэрийг үлдээнэ. */
export function dedupeCategoryNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = categoryDisplayName(String(raw || ""));
    if (!name) continue;
    const key = name.toLocaleLowerCase("mn");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
