import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Дуут файл олдсонгүй' }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'GROQ_API_KEY олдсонгүй (.env.local шалгана уу)' }, { status: 500 });

    // 🧠 Combine base coffee terms with dynamic shop slang
    const slangHints = (formData.get('slangHints') as string) || '';
    const basePrompt = 'SF Coffee: сүү, латте, эспрессо, американо, капучино, сироп, карамель, ваниль, цөцгий, өндөг, талх, хаягдал, асгасан, авсан, муудсан, хоол, грамм, литр, мл, кг, ширхэг';
    const dynamicPrompt = slangHints ? `${basePrompt}, ${slangHints}` : basePrompt;

    const groqData = new FormData();
    groqData.append('file', file);
    groqData.append('model', 'whisper-large-v3');
    groqData.append('language', 'mn'); // 🇲🇳 Mongolian transcription
    groqData.append('prompt', dynamicPrompt.substring(0, 300)); // ⚡ Appended once cleanly

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqData,
    });

    const data = await res.json();

    // Catch API key or network errors explicitly
    if (!res.ok || data.error) {
      console.error("Groq Error:", data.error);
      return NextResponse.json({ error: data.error?.message || 'Дуу танихад алдаа гарлаа' }, { status: 500 });
    }

    return NextResponse.json({ text: data.text || '' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}