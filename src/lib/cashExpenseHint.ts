const AMOUNT = /(?:\d[\d\s]*)(?:[.,]\d+)?\s*(?:₮|төгрөг|togrog|mnt)/i;
const EXPENSE_WORDS = /зардал|зарлага|төлсөн|төлөв|авсан|худалдаж|cash|expense/i;

/** Чатны текст жижиг мөнгөн зардал мэт харагдах эсэх (барааны хаягдал биш). */
export function looksLikeCashExpense(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return false;
  if (!AMOUNT.test(t) && !/\d+\s*₮/.test(t) && !/\d{3,}/.test(t)) return false;
  if (AMOUNT.test(t) || /₮/.test(t)) return true;
  return EXPENSE_WORDS.test(t);
}

export const CASH_EXPENSE_HINT =
  "Энэ бол барааны хаягдал биш, жижиг зардал. «Мөнгө гаргах» товчоор, «Жижиг зардал» хэсэгт бүртгэнэ үү.";
