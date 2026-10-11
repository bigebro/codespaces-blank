// src/app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { getAnalyticsData } from '../../../lib/analytics';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔒 ШИНЭ: createClient үүсгэхгүйгээр supabaseAdmin-аар токенийг шууд шалгана
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('client_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.client_id || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const data = await getAnalyticsData(
      profile.client_id,
      searchParams.get('startDate') || undefined,
      searchParams.get('endDate') || undefined
    );
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}