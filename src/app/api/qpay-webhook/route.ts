import { NextResponse } from "next/server";

// Do not trust a clientId on the query string. Payment is confirmed only by
// POST /api/qpay/confirm, which checks QPay's payment/check API and extends
// the subscription once. Manual admin approval stays as the backup.
export async function GET() {
  return NextResponse.json(
    { message: "Use POST /api/qpay/confirm after the logged-in owner pays." },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
