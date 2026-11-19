/** Монгол «бизнес»-ийн нийтлэг алдаа. UI биш, зөвхөн AI хариултын текстэд хэрэглэнэ. */
export const MN_BUSINESS_SPELLING_NOTE =
  "Монгол үсэг: «бизнес», «бизнесийн» гэж бич. «бизнис», «бизнисийн» гэж хэзээ ч бичиж болохгүй.";

const TYPO = "бизнис";
const FIX = "бизнес";

export function fixMnBusinessSpelling(text: string) {
  return String(text || "").replaceAll(TYPO, FIX);
}

export function createSpellingFixer() {
  let tail = "";
  const keep = TYPO.length - 1;
  return {
    push(chunk: string) {
      if (!chunk) return "";
      const s = tail + chunk;
      if (s.length <= keep) {
        tail = s;
        return "";
      }
      const out = s.slice(0, -keep).replaceAll(TYPO, FIX);
      tail = s.slice(-keep);
      return out;
    },
    flush() {
      const out = tail.replaceAll(TYPO, FIX);
      tail = "";
      return out;
    },
  };
}
