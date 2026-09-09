import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { advancedMongolianVoiceParser } from '../../../lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getApiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY || "";
  return raw.replace(/["']/g, "").split(",").map(k => k.trim()).filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const clientId = (formData.get('clientId') as string) || 'SF Coffee';
    const mimeType = (formData.get('mimeType') as string) || (file.type ? file.type.split(';')[0] : 'audio/webm');

    if (!file) return NextResponse.json({ error: 'Дуут файл олдсонгүй' }, { status: 400 });

    const [{ data: ingredients }, { data: learnedAliases }] = await Promise.all([
      supabaseAdmin.from('ingredients').select('id, name, unit').eq('client_id', clientId),
      supabaseAdmin.from('learned_aliases').select('phrase, ingredient_id').eq('client_id', clientId)
    ]);

    let groqText = '';

    // =========================================================================
    // ⚡ STAGE 1: Try Groq Whisper (150ms)
    // =========================================================================
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const slangHints = (formData.get('slangHints') as string) || '';
        const basePrompt = 'SF Coffee: 1 литр сүү, латте, эспрессо, американо, сироп, цөцгий, өндөг, талх, хаягдал, асгасан, авсан, муудсан';
        const dynamicPrompt = slangHints ? `${basePrompt}, ${slangHints}` : basePrompt;

        const groqData = new FormData();
        groqData.append('file', file);
        groqData.append('model', 'whisper-large-v3');
        groqData.append('language', 'mn');
        groqData.append('prompt', dynamicPrompt.substring(0, 300));

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${groqKey}` },
          body: groqData,
        });

        const data = await res.json();
        if (data.text && data.text.trim()) {
          groqText = data.text.trim();
        }
      } catch (err) {}
    }

    // Check if Groq's text is a valid transaction
    let match = groqText ? advancedMongolianVoiceParser(groqText, ingredients || [], learnedAliases || []) : null;

    // If Groq heard it cleanly, return immediately (0.15s)
    if (match && match.success) {
      return NextResponse.json({ text: groqText });
    }

    // =========================================================================
    // 🚨 STAGE 2: Gemini Audio Listener (Runs if Groq hallucinated "мэллэйтэрс")
    // =========================================================================
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Audio = buffer.toString('base64');
    const keys = getApiKeys();
    let geminiText = '';

    for (let i = 0; i < keys.length; i++) {
      try {
        const ai = new GoogleGenerativeAI(keys[i]);
        const model = ai.getGenerativeModel({
          model: 'gemini-3.6-flash',
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
            thinkingConfig: { thinkingLevel: 'MINIMAL' }
          } as any
        });

        const response = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: 'Listen to this spoken Mongolian voice audio. Output ONLY the transcribed Mongolian Cyrillic words. Do not reply or converse.' },
              { inlineData: { mimeType: mimeType, data: base64Audio } } // ⚡ Fixed real MIME
            ]
          }]
        });

        geminiText = response.response.text().trim();
        if (geminiText) break;
      } catch (e: any) {
        console.error("Gemini Stage 2 Error:", e.message || e);
        continue;
      }
    }

    if (geminiText) {
      return NextResponse.json({ text: geminiText }); // ⚡ Gemini fixed Groq's mistake!
    }

    if (groqText) {
      return NextResponse.json({ text: groqText });
    }

    return NextResponse.json({ error: 'Дууг сонсож чадсангүй. Дахин тод ярина уу.' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}