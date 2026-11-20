/** Supabase болон сүлжээний англи алдааг хэрэглэгчид харагдах монгол мессеж болгоно. */

export const AUTH_EMAIL_PASSWORD = "Имэйл эсвэл нууц үг буруу байна";
export const AUTH_EMAIL_UNCONFIRMED = "Имэйл баталгаажаагүй байна. Имэйлээ шалгана уу.";
export const AUTH_RATE_LIMIT = "Хэт олон оролдлого хийгдлээ. Түр хүлээгээд дахин оролдоно уу.";
export const AUTH_NETWORK = "Сүлжээний алдаа гарлаа. Холболтоо шалгаад дахин оролдоно уу.";
export const AUTH_ALREADY_REGISTERED = "Энэ имэйлээр бүртгэлтэй хэрэглэгч байна.";
export const AUTH_WEAK_PASSWORD = "Нууц үг хэт богино эсвэл сул байна.";
export const AUTH_SAME_PASSWORD = "Шинэ нууц үг нь хуучнаасаа өөр байх ёстой.";
export const AUTH_INVALID_LINK = "Холбоос эсвэл код хүчингүй болсон байна. Дахин илгээнэ үү.";
export const AUTH_SIGNUP_DISABLED = "Шинэ бүртгэл түр хаагдсан байна.";
export const AUTH_GENERIC = "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";

const RULES: Array<{ re: RegExp; message: string }> = [
  { re: /invalid login credentials|invalid.*(email|password|credentials)|wrong password|user not found|invalid_credentials/i, message: AUTH_EMAIL_PASSWORD },
  { re: /email not confirmed|not confirmed|confirm (your )?email|email_not_confirmed/i, message: AUTH_EMAIL_UNCONFIRMED },
  { re: /rate limit|too many requests|over_request|email rate|429/i, message: AUTH_RATE_LIMIT },
  { re: /failed to fetch|network|timeout|offline|fetch failed|load failed|networkerror/i, message: AUTH_NETWORK },
  { re: /user already registered|already registered|already exists|email.*already/i, message: AUTH_ALREADY_REGISTERED },
  { re: /password should|password.*least|weak password|password is too/i, message: AUTH_WEAK_PASSWORD },
  { re: /same password|should be different|different from the old/i, message: AUTH_SAME_PASSWORD },
  { re: /invalid.*(token|otp|link|code)|otp expired|link.*(expired|invalid)|expired.?otp/i, message: AUTH_INVALID_LINK },
  { re: /signup is disabled|signups not allowed/i, message: AUTH_SIGNUP_DISABLED },
];

function extractMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err.trim();
  if (typeof err === "object") {
    const anyErr = err as { message?: unknown; error_description?: unknown; error?: unknown; code?: unknown };
    const parts = [anyErr.message, anyErr.error_description, typeof anyErr.error === "string" ? anyErr.error : ""];
    return parts.map((p) => String(p || "").trim()).filter(Boolean).join(" ");
  }
  return String(err).trim();
}

const CYRILLIC = /[А-Яа-яӨөҮүЁё]/;
const LONG_ENGLISH = /[A-Za-z]{4,}/;

/** Англи алдааны текстийг хэзээ ч шууд харуулахгүй. */
export function mapAuthError(err: unknown, fallback = AUTH_GENERIC): string {
  const raw = extractMessage(err);
  if (!raw) return fallback;
  for (const rule of RULES) {
    if (rule.re.test(raw)) return rule.message;
  }
  // Аль хэдийн монгол, англи үггүй мессежийг хэвээр үлдээнэ.
  if (CYRILLIC.test(raw) && !LONG_ENGLISH.test(raw)) return raw;
  return fallback;
}
