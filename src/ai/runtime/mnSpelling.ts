/** Монгол үгийн нийтлэг алдаа. UI биш, зөвхөн AI хариултын текстэд хэрэглэнэ. */
export const MN_BUSINESS_SPELLING_NOTE =
  "Монгол үсэг: «бизнес», «бизнесийн» гэж бич. «бизнис», «бизнисийн», «бизнсийн» гэж хэзээ ч бичиж болохгүй. «тайлбаргүй» гэж бич, «тайбаргүй» гэж бичиж болохгүй.";

const PAIRS: Array<[string, string]> = [
  ["тайбаргүй", "тайлбаргүй"],
  ["бизнис", "бизнес"],
  ["бизнс", "бизнес"],
];

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyCase(sample: string, replacement: string) {
  if (sample && sample === sample.toUpperCase()) return replacement.toUpperCase();
  if (sample && sample[0] === sample[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function fixMnBusinessSpelling(text: string) {
  let s = String(text || "");
  for (const [from, to] of PAIRS) {
    const re = new RegExp(escapeRe(from), "gi");
    s = s.replace(re, (match) => applyCase(match, to));
  }
  return s;
}

function pendingPrefixLength(text: string) {
  const lower = text.toLowerCase();
  let hold = 0;
  for (const [from] of PAIRS) {
    const typo = from.toLowerCase();
    const max = typo.length - 1;
    for (let i = max; i >= 1; i--) {
      if (lower.endsWith(typo.slice(0, i))) {
        hold = Math.max(hold, i);
        break;
      }
    }
  }
  return hold;
}

export function createSpellingFixer() {
  let tail = "";
  return {
    push(chunk: string) {
      if (!chunk) return "";
      const s = tail + chunk;
      const hold = pendingPrefixLength(s);
      if (s.length <= hold) {
        tail = s;
        return "";
      }
      const out = fixMnBusinessSpelling(s.slice(0, s.length - hold));
      tail = s.slice(s.length - hold);
      return out;
    },
    flush() {
      const out = fixMnBusinessSpelling(tail);
      tail = "";
      return out;
    },
  };
}
