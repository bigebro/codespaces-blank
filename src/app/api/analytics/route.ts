import { NextResponse } from 'next/server';
import { getAnalyticsData } from '../../../lib/analytics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || 'SF Coffee';
    const startDate = searchParams.get('startDate') || '2026-05-30T00:00:00.000Z';
    const endDate = searchParams.get('endDate') || '2026-06-30T23:59:59.999Z';

    const data = await getAnalyticsData(clientId, startDate, endDate);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}