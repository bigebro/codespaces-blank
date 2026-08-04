import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Telegram-тай холбогдсон бүх эздийн профайлыг татах
    const { data: profiles } = await supabase
      .from('profiles')
      .select('client_id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No active telegram clients found." });
    }

    // Vercel дээрх өөрийн API-г дуудах URL-ийг тодорхойлох
    const reqUrl = new URL(request.url);
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;

    // 2. Харилцагч (Кофе шоп) тус бүрээр давтаж шалгах
    for (const profile of profiles) {
      const chatId = profile.telegram_chat_id;
      const clientId = profile.client_id;

      // Тухайн харилцагчийн амьд датаг татаж авах
      const response = await fetch(`${baseUrl}/api/analytics?clientId=${encodeURIComponent(clientId)}`, { cache: 'no-store' });
      
      if (!response.ok) continue;
      const analyticsData = await response.json();

      // Нөөц нь доод хэмжээнээс (Par level) буурсан, захиалах шаардлагатай бараануудыг шүүх
      const lowItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_low && i.suggested_order > 0);

      // Хэрэв захиалах бараа байвал Telegram руу нь автоматаар мессеж илгээх
      if (lowItems && lowItems.length > 0) {
        let alertMessage = `🚨 **ӨГЛӨӨНИЙ САНУУЛГА: АГУУЛАХЫН НӨӨЦ БАГАССАН БАЙНА**\n\nТаны өнөөдрийн үйл ажиллагааг тасалдуулахгүйн тулд дараах бараануудыг яаралтай захиалахыг санал болгож байна:\n\n`;
        
       lowItems.forEach((item: any) => {
  alertMessage += `🛒 **${item.name}**\n - Үлдэгдэл: ${Math.round(item.live_stock * 10) / 10} ${item.unit}\n - Захиалах хэмжээ: ${item.suggested_order} ${item.unit}\n\n`;
});

        alertMessage += `*(Дээрх хэмжээг таны сүүлийн 30 хоногийн борлуулалтын хурдад тулгуурлан систем автоматаар бодож гаргав)*`;

        // Telegram API руу илгээх
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




