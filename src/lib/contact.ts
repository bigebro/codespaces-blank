function publicHttpUrl(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch {
    return "";
  }
}

/** Public contact links. Empty or invalid values are omitted so the UI can hide them. */
export function contactLinks() {
  return {
    messengerUrl: publicHttpUrl(process.env.NEXT_PUBLIC_MESSENGER_URL),
    linkedinUrl: publicHttpUrl(process.env.NEXT_PUBLIC_LINKEDIN_URL),
  };
}
