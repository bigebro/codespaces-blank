import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No audio' }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });

    const groqData = new FormData();
    groqData.append('file', file);
    groqData.append('model', 'whisper-large-v3');
    groqData.append('language', 'mn'); // 🇲🇳 Mongolian transcription
      // ⚡ Coffee shop vocabulary hint (Helps Whisper not mishear terms):
    groqData.append('prompt', 'SF Coffee: сүү, латте, эспрессо, американо, капучино, сироп, карамель, ваниль, цөцгий, өндөг, талх, хаягдал, асгасан, авсан, муудсан, хоол, грамм, литр, мл, кг, ширхэг');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqData,
    });

    const data = await res.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}