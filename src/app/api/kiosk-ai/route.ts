import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';

export async function POST(request: Request) {
  try {
    const { tenantClientId, workerName, text, imageBase64 } = await request.json();

    // 1. Fetch Ingredients for this Coffee Shop
    const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', tenantClientId);
    const allowedNames = ingredients ? ingredients.map(i => i.name) : [];

    // ==========================================
    // SCENARIO A: THEY SENT A PHOTO (E-BARIMT)
    // ==========================================
    if (imageBase64) {
      const aiAnalysis = await parseReceiptImage(imageBase64, allowedNames);
      if (!aiAnalysis || !aiAnalysis.success) {
        return NextResponse.json({ success: false, message: aiAnalysis?.error_message || "❌ Зургийг уншиж чадсангүй." });
      }

      const logsToInsert: any[] = [];
      let successMsg = "✅ **Татан авалт бүртгэгдлээ:**\n";

      for (const item of aiAnalysis.purchases) {
        const ing = ingredients?.find((i: any) => i.name === item.item_name);
        if (ing) {
          logsToInsert.push({ client_id: tenantClientId, ingredient_id: ing.id, quantity: Math.abs(item.quantity), type: 'purchase', total_cost: item.total_cost || 0, notes: item.notes || "E-Barimt (Kiosk)", worker_name: workerName, date: new Date().toISOString() });
          successMsg += `• ${ing.name}: ${item.quantity} ${ing.unit}\n`;
        } else {
          logsToInsert.push({ client_id: tenantClientId, non_food_item: item.item_name, quantity: Math.abs(item.quantity), type: 'purchase', total_cost: item.total_cost || 0, notes: "E-Barimt OPEX (Kiosk)", worker_name: workerName, date: new Date().toISOString() });
          successMsg += `• ${item.item_name} (Бусад): ${item.quantity}\n`;
        }
      }

      if (logsToInsert.length > 0) await supabase.from('inventory_logs').insert(logsToInsert);
      return NextResponse.json({ success: true, message: successMsg });
    }

    // ==========================================
    // SCENARIO B: THEY TYPED TEXT (WASTE/STAFF MEAL)
    // ==========================================
    if (text) {
      const aiAnalysis = await parseOperationalText(text, allowedNames);
      
      if (aiAnalysis && aiAnalysis.is_transaction && aiAnalysis.success) {
        const ingredient = ingredients?.find(i => i.name === aiAnalysis.item_name);
        if (!ingredient) {
          return NextResponse.json({ success: false, message: `❌ Алдаа: '${aiAnalysis.item_name}' олдсонгүй.` });
        }

        await supabase.from('inventory_logs').insert([{
          client_id: tenantClientId,
          ingredient_id: ingredient.id,
          quantity: aiAnalysis.quantity,
          type: aiAnalysis.type,
          notes: aiAnalysis.notes || 'Kiosk AI Log',
          worker_name: workerName,
          date: new Date().toISOString()
        }]);

        return NextResponse.json({ success: true, message: `✅ Бүртгэгдлээ:\n${aiAnalysis.item_name} (${Math.abs(aiAnalysis.quantity)} ${ingredient.unit})` });
      } else {
        return NextResponse.json({ success: false, message: aiAnalysis?.error_message || "❌ Үйлдлийг ойлгосонгүй. Тодорхой бичнэ үү." });
      }
    }

    return NextResponse.json({ success: false, message: "No input provided." });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Системийн алдаа: ${error.message}` });
  }
}