const QPAY_URL = process.env.QPAY_URL || "https://merchant.qpay.mn/v2";

function requiredEnv(name: string): string {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function getQPayToken(): Promise<string> {
  const username = requiredEnv("QPAY_USERNAME");
  const password = requiredEnv("QPAY_PASSWORD");
  const res = await fetch(`${QPAY_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || data.error || "QPay auth failed");
  }
  return data.access_token as string;
}

export async function createQPayInvoice(opts: {
  clientId: string;
  amount: number;
  description: string;
  senderInvoiceNo: string;
}) {
  const token = await getQPayToken();
  const invoiceCode = requiredEnv("QPAY_INVOICE_CODE");
  const res = await fetch(`${QPAY_URL}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      invoice_code: invoiceCode,
      sender_invoice_no: opts.senderInvoiceNo,
      invoice_receiver_code: opts.clientId,
      invoice_description: opts.description,
      amount: opts.amount,
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/qpay/confirm?invoice_id=`,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.invoice_id) {
    throw new Error(data.message || "QPay invoice failed");
  }
  return data as {
    invoice_id: string;
    qr_text?: string;
    qr_image?: string;
    urls?: unknown;
  };
}

export async function checkQPayInvoice(invoiceId: string) {
  const token = await getQPayToken();
  const res = await fetch(`${QPAY_URL}/payment/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "QPay payment check failed");

  const rows = Array.isArray(data.rows) ? data.rows : [];
  const paidRow = rows.find(
    (row: { payment_status?: string }) => row.payment_status === "PAID",
  );
  const paidAmount = Number(data.paid_amount) || rows.reduce((sum: number, row: { payment_status?: string; payment_amount?: number; amount?: number }) => {
    if (row.payment_status && row.payment_status !== "PAID") return sum;
    return sum + (Number(row.payment_amount ?? row.amount) || 0);
  }, 0);
  return {
    paid: Boolean(paidRow) || paidAmount > 0,
    paidAmount,
    paymentId: paidRow?.payment_id || null,
    raw: data,
  };
}
