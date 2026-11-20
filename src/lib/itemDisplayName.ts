const TEST_TAG_RE =
  /(?:\s*[\(\[（]\s*(туршилт|testing|test|demo|sample)\s*[\)\]）]\s*)$/i;

export function isTestBadgeText(value: string): boolean {
  return /^(туршилт|testing|test|demo|sample)$/i.test(String(value || "").trim());
}

/** «Сүү (ТУРШИЛТ)»-ээс жинхэнэ нэр болон туршилтын тэмдгийг ялгана. */
export function splitItemName(raw: string | null | undefined): { name: string; isTest: boolean } {
  const s = String(raw || "").trim();
  if (!s) return { name: "", isTest: false };
  const tagged = s.match(/^(.*?)(?:\s*[\(\[（]\s*(туршилт|testing|test|demo|sample)\s*[\)\]）]\s*)$/i);
  if (tagged && tagged[1].trim()) {
    return { name: tagged[1].trim(), isTest: true };
  }
  if (isTestBadgeText(s)) return { name: s, isTest: true };
  return { name: s.replace(TEST_TAG_RE, "").trim() || s, isTest: TEST_TAG_RE.test(s) };
}

export function itemDisplayName(raw: string | null | undefined): string {
  return splitItemName(raw).name;
}

/**
 * Хаалтан доторхыг монгол нэр гэж үзнэ, гэхдээ «ТУРШИЛТ» зэрэг тэмдэг биш.
 * «Milk (Сүү)» → «Сүү»; «Сүү (ТУРШИЛТ)» → «Сүү».
 */
export function localizedItemName(raw: string | null | undefined, lang: "mn" | "en" = "mn"): string {
  const { name } = splitItemName(raw);
  if (!name) return "";
  if (lang === "en") {
    const m = name.match(/^(.*?)\s*\(/);
    return (m ? m[1] : name).trim();
  }
  const bracket = name.match(/\((.*?)\)/);
  if (bracket && bracket[1] && !isTestBadgeText(bracket[1])) return bracket[1].trim();
  return name;
}
