import { NextResponse } from 'next/server';
import { getAnalyticsData } from '../../../lib/analytics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || 'SF Coffee';
    // 💡 Хатуу заасан 2026-05-30-г арилгаж, одоогийн бодит хугацааг авна
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await getAnalyticsData(clientId, startDate, endDate);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}