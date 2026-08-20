import { NextResponse } from 'next/server';

const QPAY_URL = "https://merchant.qpay.mn/v2";
const QPAY_USERNAME = process.env.QPAY_USERNAME || "TEST_MERCHANT";
const QPAY_PASSWORD = process.env.QPAY_PASSWORD || "123456";
const QPAY_INVOICE_CODE = process.env.QPAY_INVOICE_CODE || "TEST_INVOICE";

// 1. Authenticate with QPay to get Access Token
async function getQPayToken() {
  const res = await fetch(`${QPAY_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: QPAY_USERNAME, password: QPAY_PASSWORD })
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const { clientId, amount, description } = await request.json();
    const token = await getQPayToken();

    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/qpay-webhook?clientId=${encodeURIComponent(clientId)}`;
    const invoiceNo = `INV-${Date.now()}`;

    // 2. Generate QPay Invoice
    const invoiceRes = await fetch(`${QPAY_URL}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        invoice_code: QPAY_INVOICE_CODE,
        sender_invoice_no: invoiceNo,
        invoice_receiver_code: clientId,
        invoice_description: description || `Smart BoH Subscription - ${clientId}`,
        amount: amount,
        callback_url: callbackUrl
      })
    });

    const invoiceData = await invoiceRes.json();

    return NextResponse.json({
      success: true,
      invoice_id: invoiceData.invoice_id,
      qr_text: invoiceData.qr_text,
      qr_image: invoiceData.qr_image, // Base64 QR Image string
      deep_links: invoiceData.urls     // Direct bank app links (Khan, Golomt, State Bank, SocialPay)
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}