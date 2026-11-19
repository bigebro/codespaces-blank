// Хэрэглэгчид дотоод хэрэгслийн нэр (skill_..., action_...), router, CFO/COO/HR агентын нэр
// харагдахгүй байхаар AI-ийн текстийг цэвэрлэнэ. Stream дээр үг тасрахаас сэргийлж
// сүүлийн дутуу үгийг дараагийн хэсэг иртэл хүлээнэ.

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scrubInternalNames(text: string, toolNames: string[] = []): string {
  if (!text) return text;
  const names = Array.from(new Set(toolNames.filter(Boolean))).sort((a, b) => b.length - a.length);
  let out = text;
  if (names.length) {
    const re = new RegExp("`?\\b(?:" + names.map(escapeRegExp).join("|") + ")\\b(?:\\(\\))?`?", "g");
    out = out.replace(re, "");
  }
  out = out
    .replace(/`?\b(?:skill|action|tool|get|run|fetch|calc|calculate|create|update)_[a-z0-9_]+\b(?:\(\))?`?/gi, "")
    .replace(/\b(?:CFO|COO|HR)[\s-]*(?:agent|агент)\b/gi, "OP AI")
    .replace(/\brouter(?:\.agent)?\b/gi, "");
  if (out === text) return text;
  return out
    .replace(/(\S)[ \t]{2,}(?=\S)/g, "$1 ")
    .replace(/(\S) +([.,:;!?])/g, "$1$2");
}

export function createNameScrubber(toolNames: string[] = []) {
  let pending = "";
  return {
    push(delta: string): string {
      pending += delta;
      const cut = Math.max(pending.lastIndexOf(" "), pending.lastIndexOf("\n"));
      if (cut < 0) return "";
      const ready = pending.slice(0, cut + 1);
      pending = pending.slice(cut + 1);
      return scrubInternalNames(ready, toolNames);
    },
    flush(): string {
      const rest = scrubInternalNames(pending, toolNames);
      pending = "";
      return rest;
    },
  };
}
