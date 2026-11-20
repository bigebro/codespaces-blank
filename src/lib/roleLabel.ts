const ROLE_LABELS: Record<string, string> = {
  owner: "Эзэн",
  эзэн: "Эзэн",
  manager: "Менежер",
  менежер: "Менежер",
  staff: "Ажилтан",
  ажилтан: "Ажилтан",
};

/** Үүрэг мэдэгдэх хүртэл null буцаана (скелетон харуулахад). */
export function roleLabel(role: string | null | undefined): string | null {
  if (role == null) return null;
  const raw = String(role).trim();
  if (!raw) return null;
  return ROLE_LABELS[raw.toLowerCase()] || raw;
}
