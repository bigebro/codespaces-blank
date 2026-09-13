import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getAnalyticsData } from '../../../../lib/analytics';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 🔒 1. Гадны халдлагаас хамгаалах
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('client_id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No active telegram clients found." });
    }

    for (const profile of profiles) {
      const chatId = profile.telegram_chat_id;
      const clientId = profile.client_id;

      // ⚡ HTTP fetch хийхгүйгээр шууд функцээ дуудна (10 дахин хурдан, найдвартай)
      const analyticsData = await getAnalyticsData(clientId);
      const lowItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_low && i.suggested_order > 0);

      if (lowItems && lowItems.length > 0) {
        let alertMessage = `🚨 **ӨГЛӨӨНИЙ САНУУЛГА: АГУУЛАХЫН НӨӨЦ БАГАССАН БАЙНА**\n\nТаны өнөөдрийн үйл ажиллагааг тасалдуулахгүйн тулд дараах бараануудыг яаралтай захиалахыг санал болгож байна:\n\n`;
        
        lowItems.forEach((item: any) => {
          alertMessage += `🛒 **${item.name}**\n - Үлдэгдэл: ${Math.round(item.live_stock * 10) / 10} ${item.unit}\n - Захиалах хэмжээ: ${item.suggested_order} ${item.unit}\n\n`;
        });

        alertMessage += `*(Дээрх хэмжээг таны сүүлийн 30 хоногийн борлуулалтын хурдад тулгуурлан систем автоматаар бодож гаргав)*`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: alertMessage, parse_mode: "Markdown" })
        });
      }
    }

    return NextResponse.json({ success: true, message: "Alerts processed successfully" });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}