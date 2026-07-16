import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize the secure, server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { message, callback_query } = payload;

    // A. Handle "Undo" Button Clicks (Callback Queries)
    if (callback_query) {
      const callbackData = callback_query.data; // e.g. "undo_UUID"
      const chatId = callback_query.message.chat.id;
      const messageId = callback_query.message.message_id;

      if (callbackData.startsWith("undo_")) {
        const logId = callbackData.replace("undo_", "");

        // Delete the log from Supabase (Trigger will automatically restore stock!)
        const { error: deleteError } = await supabase
          .from('inventory_logs')
          .delete()
          .eq('id', logId);

        if (deleteError) {
          await sendTelegramMessage(chatId, "❌ Алдаа: Цуцлахад алдаа гарлаа.");
        } else {
          // Edit the original message to show it was successfully cancelled
          await editTelegramMessage(chatId, messageId, "❌ Бүртгэл амжилттай цуцлагдлаа (Таны агуулахын үлдэгдэл буцаж сэргэсэн).");
        }
      }
      return NextResponse.json({ status: 'ok' });
    }

    // B. Handle Normal Text Messages
    if (!message || !message.text) {
      return NextResponse.json({ status: 'ok' });
    }

    const chatId = message.chat.id;
    const incomingText = message.text.trim();

    // 1. Handle /start command
    if (incomingText === "/start") {
      const welcomeText = "Сайн байна уу? 'SF Coffee' ухаалаг туслах ботод тавтай морилно уу! ☕✨\n\nЭнэхүү ботоор дамжуулан ажилчид өдөр тутмын зардлыг бүртгэх боломжтой.\n\nЖишээ:\n• 'Хаягдал: Сүү 500'\n• 'Худалдан авалт: Сүү 10000'";
      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ status: 'ok' });
    }

    // 2. Handle Spoilage / Waste logs (Хаягдал)
    if (incomingText.toLowerCase().includes("хаягдал")) {
      const parts = incomingText.split(/[:\s]+/);
      if (parts.length >= 3) {
        const localName = parts[1].trim().toLowerCase();
        let itemName = localName === "сүү" ? "Milk" : localName === "крэм" ? "Whipped cream" : parts[1].trim();
        const rawQty = parseFloat(parts[2]) || 0;
        const qty = -Math.abs(rawQty); // Force negative for waste
        const notes = parts.length > 3 ? parts.slice(3).join(" ") : "Баристагийн тэмдэглэлтэй хаягдал";

        // Find ingredient ID in Supabase
        const { data: ingredient, error: findError } = await supabase
          .from('ingredients')
          .select('id, unit')
          .eq('name', itemName)
          .single();

        if (findError || !ingredient) {
          await sendTelegramMessage(chatId, `❌ Алдаа: '${itemName}' нэртэй түүхий эд олдсонгүй.`);
          return NextResponse.json({ status: 'ok' });
        }

        // Insert the transaction log
        const { data: log, error: logError } = await supabase
          .from('inventory_logs')
          .insert([
            { ingredient_id: ingredient.id, quantity: qty, type: 'spoilage', notes: notes }
          ])
          .select()
          .single();

        if (logError || !log) {
          await sendTelegramMessage(chatId, "❌ Алдаа: Базарт бүртгэж чадсангүй.");
          return NextResponse.json({ status: 'ok' });
        }

        // Send confirmation with the functional "Undo" button
        const confirmText = `📝 Хаягдал бүртгэгдлээ:\n• Бараа: ${itemName}\n• Хэмжээ: ${Math.abs(qty)} ${ingredient.unit}\n• Тайлбар: ${notes}`;
        await sendTelegramMessageWithUndo(chatId, confirmText, log.id);
      }
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Send standard Telegram Message
async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}

// Helper: Send Telegram Message with "Undo" Callback Button
async function sendTelegramMessageWithUndo(chatId: number, text: string, logId: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        inline_keyboard: [[
          { text: "Буцаах ↩️ (Undo)", callback_data: `undo_${logId}` }
        ]]
      }
    })
  });
}

// Helper: Edit existing Telegram Message (Used after clicking Undo)
async function editTelegramMessage(chatId: number, messageId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text
    })
  });
}