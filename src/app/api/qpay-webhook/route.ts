import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Use /api/qpay/check after payment" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "Use /api/qpay/check after payment" }, { status: 410 });
}
