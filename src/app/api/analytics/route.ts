// src/app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { getAnalyticsData } from '../../../lib/analytics';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createServerSupabase } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify token validity via Admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Create SECURE client bounded by RLS
    const supabaseSecure = createServerSupabase(token);

    // 3. Fetch profile securely
    const { data: profile } = await supabaseSecure
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