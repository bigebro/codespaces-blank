import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (clientId) {
      // Extend subscription by 30 days in database
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      await supabaseAdmin
        .from('tenants')
        .update({
          status: 'active',
          subscription_end_date: newExpiry.toISOString()
        })
        .eq('client_id', clientId);
    }

    return NextResponse.json({ success: true, message: "Subscription activated" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}