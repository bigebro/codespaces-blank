/** Owner and kiosk chat: never show raw HTTP/system errors to the user. */
export const CHAT_RETRY_MESSAGE =
  "Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.";

export const CHAT_TIMEOUT_MESSAGE =
  "Хариулт боловсруулах хугацаа хэтэрлээ. Та асуултаа дахин илгээнэ үү.";

export function isTransientChatFailure(error: unknown): boolean {
  const s = rawChatError(error).toLowerCase();
  return (
    /\b(504|503|429|timeout|timed out|econnreset|network|fetch failed|overload|high demand|unavailable|too many requests|quota|rate limit|ai_failed|хариу өгсөнгүй)\b/i.test(
      s,
    ) || s.includes("хариу өгсөнгүй")
  );
}

export function chatErrorMessage(error: unknown): string {
  const s = rawChatError(error).toLowerCase();
  if (
    s.includes("504") ||
    s.includes("timeout") ||
    s.includes("timed out") ||
    s.includes("хугацаа хэтэр")
  ) {
    return CHAT_TIMEOUT_MESSAGE;
  }
  if (
    s.includes("503") ||
    s.includes("high demand") ||
    s.includes("unavailable") ||
    s.includes("overloaded")
  ) {
    return "AI зөвлөхийн ачаалал түр ихэссэн байна. Та хэдхэн секундын дараа дахин асууна уу.";
  }
  if (
    s.includes("429") ||
    s.includes("quota") ||
    s.includes("rate limit") ||
    s.includes("too many requests")
  ) {
    return "Асуултын өдрийн хязгаар түр хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.";
  }
  if (/\[system error\]|http \d{3}|system error/i.test(s)) {
    return CHAT_RETRY_MESSAGE;
  }
  if (s.includes("хариу өгсөнгүй") || s.includes("ai_failed")) {
    return "AI одоогоор хариу өгсөнгүй. Хэсэг хүлээгээд дахин илгээнэ үү.";
  }
  return CHAT_RETRY_MESSAGE;
}

function rawChatError(error: unknown): string {
  if (error instanceof Error) return error.message || "";
  return String(error || "");
}
