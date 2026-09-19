"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Coffee, CheckCircle, Users, LogOut, Camera, 
  MessageSquare, CheckSquare, ListOrdered, Send, ShieldAlert,
  ChevronRight, AlertTriangle, RotateCcw, ShieldCheck, 
  Mic, MicOff, Wifi, WifiOff, Sparkles, Check, X,BookOpen, PlusCircle 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link'; 
// =========================================================================
// 🇲🇳 1. КИРИЛЛ ТООГ ЦИФР БОЛГОХ
// =========================================================================
const MN_NUMBERS = [
  { w: "нэг зуун", v: 100 }, { w: "хоёр зуун", v: 200 }, { w: "гурван зуун", v: 300 },
  { w: "арван есөн", v: 19 }, { w: "арван ес", v: 19 },
  { w: "арван найман", v: 18 }, { w: "арван найм", v: 18 },
  { w: "арван долоон", v: 17 }, { w: "арван долоо", v: 17 },
  { w: "арван зургаан", v: 16 }, { w: "арван зургаа", v: 16 },
  { w: "арван таван", v: 15 }, { w: "арван тав", v: 15 },
  { w: "арван дөрвөн", v: 14 }, { w: "арван дөрөв", v: 14 },
  { w: "арван гурван", v: 13 }, { w: "арван гурав", v: 13 },
  { w: "арван хоёр", v: 12 }, { w: "арван нэгэн", v: 11 }, { w: "арван нэг", v: 11 },
  { w: "арван", v: 10 }, { w: "арав", v: 10 },
  { w: "хорин", v: 20 }, { w: "хорь", v: 20 },
  { w: "гучин", v: 30 }, { w: "гуч", v: 30 },
  { w: "дөчин", v: 40 }, { w: "дөч", v: 40 },
  { w: "тавин", v: 50 }, { w: "тавь", v: 50 },
  { w: "жаран", v: 60 }, { w: "жар", v: 60 },
  { w: "далан", v: 70 }, { w: "дал", v: 70 },
  { w: "наян", v: 80 }, { w: "ная", v: 80 },
  { w: "ерэн", v: 90 }, { w: "ер", v: 90 },
  { w: "нэгэн", v: 1 }, { w: "нэг", v: 1 }, { w: "ганц", v: 1 },
  { w: "хоёр", v: 2 }, { w: "гурав", v: 3 }, { w: "дөрвөн", v: 4 }, { w: "дөрөв", v: 4 },
  { w: "таван", v: 5 }, { w: "тав", v: 5 }, { w: "зургаан", v: 6 }, { w: "зургаа", v: 6 },
  { w: "долоон", v: 7 }, { w: "долоо", v: 7 }, { w: "найман", v: 8 }, { w: "найм", v: 8 },
  { w: "есөн", v: 9 }, { w: "ес", v: 9 },
  { w: "хагас", v: 0.5 }, { w: "тал", v: 0.5 }
];

// =========================================================================
// 🇲🇳 2. ТАНЫ ЖАГСААЛТЫН БҮХ БАРАА БАГТСАН АВАРГА ТОЛЬ БИЧИГ (100% COMPLETE)
// =========================================================================
const EN_TO_MN_DICT: Record<string, string[]> = {
  // Товчлолууд
  "syr": ["сироп", "шүүс", "бурам"],
  "fr": ["жимс", "жимсний", "жимстэй"],
  "cr": ["крем", "цөцгий", "хөөс"],
  "bl": ["хар", "үхрийн нүд", "хөх"],
  "veg": ["ногоо", "ургамлын"],
  "vegg": ["ногоо", "хүнсний ногоо"],
  "veggies": ["ногоо", "хүнсний ногоо"],
  "c": ["цуу", "алимны цуу"],
  "can": ["лаазтай", "нөөшилсөн", "лааз"],
  "canned": ["лаазтай", "нөөшилсөн"],
  "chick": ["тахиа", "тахианы"],
  "pickl": ["дарсан", "даршилсан"],
  "mascarp": ["маскарпоне"],
  "boulillon": ["бульон", "шөл"],

  // Сүү, Өндөг, Цөцгий, Бяслаг
  "milk": ["сүү", "сү", "милк"],
  "egg": ["өндөг", "өндөгний"],
  "eggs": ["өндөг", "өндөгний"],
  "butter": ["масло", "цөцгийн тос"],
  "cheese": ["бяслаг", "сыр", "чеддер", "зүссэн бяслаг"],
  "cream": ["өрөм", "крем", "балун", "цөцгий", "вип", "зөөхий"],
  "creamy": ["цөцгийтэй", "кремтэй"],
  "sauer": ["зөөхий", "исгэлэн"],
  "sour": ["зөөхий"],
  "balloon": ["балун", "бөмбөлөг"],
  "yogurt": ["тараг", "иогурт"],
  "moloko": ["молоко", "өтгөрүүлсэн сүү"],
  "whipped": ["хөөсрүүлсэн", "вип", "хутгасан"],

  // Кофе, Цай, Ундаанууд
  "bean": ["үр", "үрэл", "кофе", "шош"],
  "beans": ["үр", "үрэл", "кофе", "шош"],
  "coffee": ["кофе", "эспрессо"],
  "espresso": ["эспрессо", "кофе"],
  "kick": ["кик", "хүчтэй кофе"],
  "tea": ["цай", "байхуу", "хөндмөл", "ханд"],
  "teas": ["цай", "цайнууд"],
  "brew": ["ханд", "хандалсан", "чанасан"],
  "matcha": ["матча", "ногоон цай"],
  "chai": ["чай", "цай", "масала"],
  "rooibos": ["ройбос", "улаан цай"],
  "hibis": ["хибискус", "сарнай"],
  "butterfl": ["эрвээхэй", "цэнхэр цай"],
  "green": ["ногоон", "ногоон цай"],
  "bulbous": ["булцуут", "ургамал"],
  "water": ["ус", "цэвэр ус", "рашаан"],
  "bonaque": ["ус", "бонакуа"],
  "soda": ["сода", "хийжүүлсэн", "хийтэй"],
  "cola": ["кола", "ундаа"],
  "laaztai": ["лаазтай", "лааз"],
  "craft": ["крафт"],
  "soft": ["ундаа", "хийжүүлсэн"],
  "drink": ["ундаа", "жүүс"],
  "juice": ["шүүс", "жүүс", "цэвэр шүүс"],
  "calpis": ["калпис"],
  "tonic": ["тоник"],
  "orice": ["орис", "будааны"],

  // Сироп, Чихэрлэг
  "syrup": ["сироп", "шүүс", "бурам"],
  "sugar": ["сахар", "элсэн чихэр"],
  "sweetener": ["сахар орлуулагч", "чихэрлэг"],
  "honey": ["зөгийн бал", "бал"],
  "caramel": ["карамель", "чихэр"],
  "vanilla": ["ваниль", "ваниллийн"],
  "hazelnut": ["самар", "самрын", "хазелнат"],
  "pistacchio": ["пистачио", "фисташка"],
  "pistachio": ["пистачио", "фисташка"],
  "cinnamon": ["шанц", "синнамон", "савхан шанц"],
  "chocolate": ["шоколад", "шоко", "какао", "халуун шоколад"],
  "choco": ["шоко", "шоколад"],
  "cocoa": ["какао"],
  "mocha": ["мока"],
  "mint": ["гаа", "гааны", "минт"],
  "curasao": ["кюрасао", "курасао"],
  "grenade": ["анар", "гренадин"],

  // Мах, Уураг
  "beef": ["үхэр", "үхрийн мах", "үхрийн"],
  "pork": ["гахай", "гахайн мах"],
  "chicken": ["тахиа", "тахианы мах", "цээж мах"],
  "sheep": ["хонь", "хонины мах", "хонины"],
  "lamb": ["хурга", "хурганы мах"],
  "bacon": ["бекон", "гахайн мах"],
  "salami": ["салями", "хиам", "зайдас"],
  "patty": ["таташ", "махан таташ", "бургерын мах"],
  "tuna": ["туна", "загас", "загасны мах"],
  "ground": ["татсан", "татсан мах"],

  // Жимс
  "apple": ["алим", "алимны"],
  "banana": ["гадил", "банан"],
  "lemon": ["нимбэг", "лимон", "нимбэгний"],
  "orange": ["жүрж", "апельсин"],
  "grapefruit": ["бэрсүүт жүрж", "грейпфрут"],
  "kiwi": ["киви"],
  "peach": ["тоор", "тоорын"],
  "mango": ["манго", "мангоны"],
  "passion": ["пашн", "маркуяа"],
  "cherry": ["интоор", "интоорын"],
  "berry": ["жимс", "жимсгэнэ"],
  "strawberry": ["гүзээлзгэнэ", "гүзээлзгэний"],
  "raspberry": ["бөөрөлзгөнө", "бөөрөлзгөний"],
  "blueberry": ["нэрс", "нэрсний"],
  "currant": ["үхрийн нүд", "үхрийн нүдний"],
  "buckthorn": ["чацаргана", "чацарганы"],
  "fruits": ["жимс", "жимснүүд"],
  "wildberry": ["зэрлэг жимс", "ойн жимс"],
  "sea": ["чацаргана", "далайн"],

  // Ногоо, Ургамал
  "tomato": ["улаан лооль", "помидор", "лооль"],
  "tomatoes": ["улаан лооль", "помидор"],
  "cucumber": ["өргөст хэмх", "огурцы"],
  "carrot": ["лууван", "луувангийн"],
  "onion": ["сонгино", "сонгинын"],
  "garlic": ["сармис", "сармисны"],
  "lettuce": ["салат", "салатны навч", "байцаа"],
  "celery": ["селерей", "яншуй"],
  "selleries": ["селерей", "яншуй"],
  "parsley": ["яншуй", "яншуйны"],
  "pepper": ["чинжүү", "перец", "чинжүүний"],
  "sweet": ["амтат", "чихэрлэг"],
  "corn": ["эрдэнэ шиш", "кукуруз"],
  "pumpkin": ["хулуу", "хулууны"],
  "ginger": ["цагаан гаа", "гаа"],
  "herbs": ["өвс", "ургамал", "хатаасан ногоо"],
  "farm": ["фермийн", "ногооны"],
  "plant": ["ургамал", "булцуут"],

  // Гурил, Сүмс, Нарийн боов
  "bread": ["талх", "хэрчсэн", "зүссэн"],
  "bun": ["талх", "булочка", "бургерын талх"],
  "flour": ["гурил", "гурилан"],
  "powder": ["нунтаг", "паудэр", "пудр", "хөөлгөгч"],
  "power": ["нунтаг", "паудэр"],
  "sauce": ["соус", "сүмс", "амтлагч"],
  "burger": ["бургер", "бургерын"],
  "ketchup": ["кетчуп"],
  "mayo": ["майонез"],
  "mustard": ["гич", "мустард"],
  "oil": ["тос", "ургамлын тос", "олив", "чидун"],
  "olive": ["олив", "чидун"],
  "vinegar": ["уксус", "цуу"],
  "salt": ["давс"],
  "tabasco": ["табаско"],
  "worchest": ["ворчестер"],
  "seasonings": ["амтлагч", "хольц"],
  "various": ["төрөл бүрийн", "холимог"],
  "chips": ["үртэс", "чипс"],
  "slice": ["хэрчим", "зүсэм"],
  "piece": ["хэсэг", "хэрчим"],
  "stick": ["савх", "мод"],
  "velvet": ["велвет", "хамба"],
  "ladies": ["савоярди", "хуруу", "жигнэмэг"],
  "finger": ["хуруу", "савоярди"],
  "baking": ["жигнэх", "хөөлгөгч"],
  "dried": ["хатаасан"],
  "fresh": ["шинэ", "шинэхэн"],
  "sliced": ["зүссэн", "хэрчсэн"],
  "hot": ["халуун"],
  "black": ["хар", "үхрийн нүд"],
  "blue": ["хөх", "цэнхэр"],
  "red": ["улаан"],

  // Сав баглаа
  "cup": ["аяга", "стакан"],
  "lid": ["таг", "бөглөө"],
  "straw": ["соруул", "гуурс"],
  "napkin": ["сальфетка", "арчуур", "цаас"],
  "bag": ["уут", "тор", "хүүдий"]
};

// =========================================================================
// 🚀 3. АЯНГА ШИГ ХУРДАН ОНООНЫ МАШИН + АВТОМАТ СУРАЛЦАХ СИСТЕМ
// =========================================================================
function advancedMongolianVoiceParser(
  rawText: string, 
  ingredients: any[], 
  learnedAliases: { phrase: string; ingredient_id: string }[] = []
) {
  let text = rawText.toLowerCase().trim();

  // 1. Амаар хэлсэн тоог цифр болгох
  for (const { w, v } of MN_NUMBERS) {
    const reg = new RegExp(`(^|[\\s,.:;!?])${w}(?=[\\s,.:;!?]|$)`, 'gi');
    text = text.replace(reg, `$1${v} `);
  }

  // 2. Тоо ба нэгжийг ялгах
  const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(л|литр|l|мл|ml|кг|kg|гр|грамм|gram|ш|ширхэг|хайрцаг|уут|багц|сав)?/);
  if (!numMatch) return null;

  let qty = parseFloat(numMatch[1]);
  const unitStr = numMatch[2] || '';
  if (['л', 'литр', 'l', 'кг', 'kg'].includes(unitStr)) {
    qty *= 1000;
  }

  // 3. Үйлдлийг язгуураар нь таних
  let type: 'spoilage' | 'purchase' | 'staff_meal' | 'testing' | null = null;
  if (/асг|мууд|гаш|хая|цуц|хагар|уна|дуус|эвд|алд|урс|түлс/.test(text)) type = 'spoilage';
  else if (/ава|авс|татан|ирл|нэм|худалд|оруул|авчир/.test(text)) type = 'purchase';
  else if (/хоол|идс|уус|ажилчдын|цайны/.test(text)) type = 'staff_meal';
  else if (/турш|амт|шалга/.test(text)) type = 'testing';

  if (!type) return null;

  // 4. 🧠 FEEDBACK LOOP: Өмнө нь Gemini-аас суралцсан үгсийг хамгийн түрүүнд шалгах! (0.001ms)
  for (const alias of learnedAliases) {
    if (text.includes(alias.phrase.toLowerCase().trim())) {
      const matched = ingredients.find(i => i.id === alias.ingredient_id);
      if (matched) {
        return {
          is_transaction: true,
          success: true,
          item_id: matched.id,
          item_name: matched.name,
          unit: matched.unit,
          quantity: type === 'purchase' ? Math.abs(qty) : -Math.abs(qty),
          type: type,
          notes: `${rawText} (🧠 Суралцсан үг)`
        };
      }
    }
  }

  // 5. ОНООНЫ МАШИН: Таны 100+ барааг үг үгээр нь шалгах
  let bestMatch: any = null;
  let highestScore = 0;

  for (const ing of ingredients) {
    let currentScore = 0;
    const dbNameLower = ing.name.toLowerCase();

    // Бүтэн нэрээрээ байвал шууд 100 оноо!
    if (text.includes(dbNameLower)) {
      currentScore += 100;
    }

    const dbWords = dbNameLower.split(/[\s.\-\/]+/);

    for (const word of dbWords) {
      if (word.length < 2) continue;

      if (text.includes(word)) {
        currentScore += 15;
      }

      const mnSynonyms = EN_TO_MN_DICT[word] || [];
      for (const syn of mnSynonyms) {
        if (syn.length <= 2) {
          const safeReg = new RegExp(`(^|[\\s,.:;!?])${syn}(?=[\\s,.:;!?]|$)`, 'i');
          if (safeReg.test(text)) currentScore += 20;
        } else if (text.includes(syn)) {
          currentScore += 20;
        }
      }
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = ing;
    }
  }

  // Багадаа 1 үг бүтэн таарсан (20 оноо) байх ёстой
  if (highestScore < 20 || !bestMatch) {
    return null; // Олсонгүй -> Gemini руу илгээнэ!
  }

  return {
    is_transaction: true,
    success: true,
    item_id: bestMatch.id,
    item_name: bestMatch.name,
    unit: bestMatch.unit,
    quantity: type === 'purchase' ? Math.abs(qty) : -Math.abs(qty),
    type: type,
    notes: `${rawText} (⚡ Local Parser)`
  };
}

// ⚡ Зургийг 10 дахин хөнгөн болгож шахах функц
async function compressImageForUpload(file: File): Promise<{ file: File; base64: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH =  850;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else if (height > MAX_WIDTH) {
          width = Math.round((width * MAX_WIDTH) / height);
          height = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);

        const base64Url = canvas.toDataURL('image/jpeg', 0.6);
        const cleanBase64 = base64Url.split(',')[1];
        canvas.toBlob((blob) => {
          const compressedFile = blob 
            ? new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' })
            : file;
          resolve({ file: compressedFile, base64: cleanBase64 });
        }, 'image/jpeg', 0.75);
      };
      img.onerror = () => resolve({ file, base64: "" });
    };
    reader.onerror = () => resolve({ file, base64: "" });
  });
}

// =========================================================================
// 📸 2. UPLOAD EVIDENCE PHOTO TO SUPABASE STORAGE
// =========================================================================
async function uploadEvidencePhoto(file: File, folder: string = 'logs'): Promise<string | null> {
  try {
    const { file: compressedFile } = await compressImageForUpload(file);
    const fileExt = 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('receipts_evidence')
      .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('receipts_evidence').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Storage upload error:", err);
    return null;
  }
}
// =========================================================================
// 🎙️ 3. KIOSK AI CHAT & VOICE RECORDING SECTION
// =========================================================================
function KioskAiChatSection({ 
  selectedWorker, 
  activeShift, 
  ingredients,
  learnedAliases = [],
  onBack 
}: { 
  selectedWorker: any; 
  activeShift: any; 
  ingredients: any[];
  learnedAliases?: any[];
  onBack: () => void; 
}) 
{  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'worker' | 'ai'; text: string; logId?: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // 1-Tap Quick Action Presets (Хамгийн түгээмэл 5 хаягдал)
  const QUICK_SPILLS = [
    { label: "🥛 500мл Сүү", text: "500 мл сүү асгарсан" },
    { label: "🥛 1л Сүү", text: "1 литр сүү асгарсан" },
    { label: "☕ 18г Кофе", text: "18 грамм кофе асгарсан" },
    { label: "🥚 1ш Өндөг", text: "1 ширхэг өндөг хагарсан" },
    { label: "🥪 1ш Талх", text: "1 ширхэг талх муудсан" }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [chatHistory, isAiLoading]);


// 📱 ТӨХӨӨРӨМЖ ТАНИГЧ: iOS (iPhone/iPad) мөн эсэхийг шалгах
  const isAppleDevice = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

// ❌ INSTANT CANCEL & RESET: Aborts network fetch and removes ghost bubbles
  const cancelVoiceRecording = () => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort(); // ⚡ Kills any in-flight request!

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = null; // Do not send to API!
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    
    setIsListening(false);
    setIsAiLoading(false);

    // ⚡ Erase the temporary "sending..." bubble so the screen looks clean
    setChatHistory(prev => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].text.includes('Дуут бүртгэл илгээж байна')) {
        updated.pop();
      }
      return updated;
    });
  };
// 🎙️ УХААЛАГ ДУУТ БҮРТГЭЛ (Android ба Apple хоёуланг нь бүрэн агуулсан)
  const startVoiceRecording = async () => {
    // ⚡ 1. If already listening, tap to stop immediately
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // 🍏 АЛХАМ 1: ХЭРЭВ IPAD / IPHONE БАЙВАЛ
    if (isAppleDevice()) {
      isCancelledRef.current = false;
      abortControllerRef.current = new AbortController();

      if (!navigator.mediaDevices?.getUserMedia) {
        alert("iPad/iOS дээр дуу бичихийн тулд заавал HTTPS эсвэл localhost байх шаардлагатай.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });

        let chosenMime = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          chosenMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          chosenMime = 'audio/mp4';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType: chosenMime });
        mediaRecorderRef.current = mediaRecorder;
        const audioChunks: Blob[] = [];

        setIsListening(true);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onerror = () => {
          setIsListening(false);
          setIsAiLoading(false);
        };

        mediaRecorder.onstop = async () => {
          setIsListening(false);
          setIsAiLoading(true);
          setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
          }, 100);

          if (audioChunks.length === 0 || isCancelledRef.current) {
            setIsAiLoading(false);
            return;
          }

         const cleanMime = chosenMime.split(';')[0];
         const ext = cleanMime.includes('webm') ? 'webm' : 'mp4';
         const audioBlob = new Blob(audioChunks, { type: cleanMime });

          const slangHints = (learnedAliases || []).map(a => a.phrase).slice(0, 15).join(', ');

          const formData = new FormData();
          formData.append('file', audioBlob, `audio.${ext}`);
          formData.append('mimeType', cleanMime); // ⚡ Sends real MIME so Gemini never crashes
          formData.append('slangHints', slangHints);

          try {
            const res = await fetch('/api/transcribe', { 
              method: 'POST', 
              body: formData,
              signal: abortControllerRef.current?.signal 
            });
            if (isCancelledRef.current) return;

            const data = await res.json();
            if (isCancelledRef.current) return;

            if (data.text && data.text.trim()) {
              handleAiChatSubmit(undefined, undefined, data.text.trim());
            } else {
              setIsAiLoading(false);
              setChatHistory(prev => [
                ...prev,
                { sender: 'ai', text: data.error ? `⚠️ ${data.error}` : "🎙️ Дуу сонсогдсонгүй. Дахин тод ярина уу." }
              ]);
            }
          } catch (err: any) {
            if (err.name === 'AbortError' || isCancelledRef.current) return;
            setIsAiLoading(false);
            setChatHistory(prev => [
              ...prev,
              { sender: 'ai', text: `❌ Алдаа: ${err.message || "Сервертэй холбогдож чадсангүй."}` }
            ]);
          }
        };

        mediaRecorder.start();

        setTimeout(() => {
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        }, 3500);

      } catch (err: any) {
        setIsListening(false);
        setIsAiLoading(false);
        alert("Микрофоны зөвшөөрөл өгнө үү: " + err.message);
      }
      return;
    }

    // 🤖 АЛХАМ 2: ХЭРЭВ ANDROID / CHROME БАЙВАЛ (Одоо буцаж орсон!)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Энэ хөтөч дээр дуу таних боломжгүй байна.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'mn-MN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) handleAiChatSubmit(undefined, undefined, transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setIsAiLoading(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  const handleAiChatSubmit = async (e?: React.FormEvent, file?: File, directText?: string) => {
    if (e) e.preventDefault();
    const textToProcess = directText || chatInput.trim();
    if (!textToProcess && !file) return;

    // ⚡ Optimistic Bubble: Хэрэглэгчийн бичсэн зүйл дэлгэцэнд 0 миллисекундэд шууд гарна!
    setChatHistory(prev => [...prev, { 
      sender: 'worker', 
      text: file ? '📸 Зураг илгээлээ (E-Barimt/Бараа)' : textToProcess 
    }]);

    setChatInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsAiLoading(true);

    // 📶 ОФЛАЙН ГОРИМ ШАЛГАЛТ (Интернэт тасарсан бол LocalStorage-д хадгалах)
    if (!navigator.onLine && !file) {
      const offlineItem = {
        client_id: selectedWorker.client_id,
        notes: `${textToProcess} (Офлайн хадгалав)`,
        date: new Date().toISOString(),
        worker_name: activeShift?.character_role || selectedWorker.full_name
      };
      const queue = JSON.parse(localStorage.getItem('kiosk_offline_queue') || '[]');
      queue.push(offlineItem);
      localStorage.setItem('kiosk_offline_queue', JSON.stringify(queue));

      setChatHistory(prev => [...prev, { 
        sender: 'ai', 
        text: "📶 **Интернэт тасарсан байна.** Мэдээллийг төхөөрөмжид түр хадгаллаа. Сүлжээ ормогц бааз руу автоматаар бүртгэгдэнэ." 
      }]);
      setIsAiLoading(false);
      return;
    }

    let uploadedImageUrl: string | null = null;
    let base64Data: string | null = null;

   if (file) {
      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onerror = () => resolve(null); // ⚡ Never freeze
        reader.onload = (event) => {
          const img = new Image();
          img.onerror = () => resolve(null); // ⚡ Never freeze on HEIC/Safari
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1000;
              let width = img.width;
              let height = img.height;
              if (width > height && width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              } else if (height > MAX_WIDTH) {
                width = Math.round((width * MAX_WIDTH) / height);
                height = MAX_WIDTH;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1]);
            } catch (err) {
              resolve(null);
            }
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      if (!base64Data) {
        setIsAiLoading(false);
        alert("Зургийг боловсруулж чадсангүй. Дахин дарна уу.");
        return;
      }
    } else {
      // ⚡ 0.01ms LOCAL MONGOLIAN MATCH (Сервер, AI дуудахгүйгээр шууд баазад хадгалах)
      const localMatch = advancedMongolianVoiceParser(textToProcess, ingredients, learnedAliases);
      if (localMatch && localMatch.success) {
        const { data: newLog, error } = await supabase.from('inventory_logs').insert([{
          client_id: selectedWorker.client_id,
          ingredient_id: localMatch.item_id,
          quantity: localMatch.quantity,
          type: localMatch.type,
          notes: localMatch.notes,
          worker_name: activeShift?.character_role || selectedWorker.full_name || 'Ажилтан',
          date: new Date().toISOString()
        }]).select().single();

     if (!error && newLog) {
          // 🧠 FEEDBACK LOOP: Clean numbers/units and save the spoken phrase to learned_aliases
           let cleanPhrase = textToProcess.toLowerCase();

          // 1. Remove spoken numbers
          for (const { w } of MN_NUMBERS) {
            cleanPhrase = cleanPhrase.replace(new RegExp(`(^|[\\s,.:;!?])${w}(?=[\\s,.:;!?]|$)`, 'gi'), ' ');
          }

          // 2. Remove digits, units, and all verb conjugations
          cleanPhrase = cleanPhrase
            .replace(/[\d\.]+/g, '')
            .replace(/\b(литр|мл|кг|гр|грамм|грам|ш|ширхэг|хайрцаг|уут|сав|боодол)\b/gi, '')
            .replace(/\b(асг|ав|мууд|гаш|хая|цуц|хагар|уна|дуус|эвд|алд|урс|түл)[а-яөү]*\b/gi, '') // ⚡ Strips "авав", "аву", "асгачихсан"
            .replace(/\s+/g, ' ')
            .trim();

      const words = cleanPhrase.split(' ').filter(w => w.length >= 2);
        const finalAlias = words.slice(0, 2).join(' '); // Keeps only the item noun

          if (finalAlias && finalAlias.length >= 2) {
            await supabase.from('learned_aliases').upsert([{
              client_id: selectedWorker.client_id,
              phrase: finalAlias, // 👈 Saves ONLY clean item word(s)
              ingredient_id: localMatch.item_id
            }], { onConflict: 'client_id,phrase' });
          }

          setChatHistory(prev => [...prev, { 
            sender: 'ai', 
            text: `⚡ **Бүртгэгдлээ (Шуурхай 0.01s):**\n• Бараа: **${localMatch.item_name}**\n• Төрөл: \`${localMatch.type}\`\n• Хэмжээ: **${Math.abs(localMatch.quantity)} ${localMatch.unit}**`,
            logId: newLog.id
          }]);
          setIsAiLoading(false);
          return;
        }
      }
    }

    // Хэрэв шууд танигдаагүй бол Gemini API руу илгээх
      try {
      // If triggered by typing text instead of voice, ensure we have an abort controller
      if (!abortControllerRef.current) {
        isCancelledRef.current = false;
        abortControllerRef.current = new AbortController();
      }

      const res = await fetch('/api/kiosk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantClientId: selectedWorker.client_id,
          workerName: activeShift?.character_role || selectedWorker.full_name || "Ажилтан",
          text: textToProcess,
          imageBase64: base64Data,
          imageUrl: uploadedImageUrl,
          userRole: 'staff'
        }),
        signal: abortControllerRef.current.signal // ⚡ CONNECTS THE KILL SWITCH!
      });
      if (isCancelledRef.current) return; // ⚡ Exit instantly if canceled!

      const data = await res.json();
      if (isCancelledRef.current) return; // ⚡ Exit instantly if canceled!

      setChatHistory(prev => [...prev, { sender: 'ai', text: data.message || "Гүйлгээ боловсруулагдлаа.", logId: data.log_id }]);
    } catch (err: any) {
      if (err.name === 'AbortError' || isCancelledRef.current) return; // ⚡ Stay completely silent if user clicked cancel!
      setChatHistory(prev => [...prev, { sender: 'ai', text: `❌ Алдаа: ${err.message || 'Сервертэй холбогдож чадсангүй.'}` }]);
    } finally {
      if (!isCancelledRef.current) setIsAiLoading(false);
    }
  };

  const handleUndo = async (logId: string, index: number) => {
    setIsAiLoading(true);
    try {
      const { error } = await supabase.from('inventory_logs').delete().eq('id', logId);
      if (error) throw error;
      const newHistory = [...chatHistory];
      newHistory[index] = { sender: 'ai', text: "↩️ Бүртгэл амжилттай цуцлагдаж, агуулахын үлдэгдэл буцаж сэргэлээ." };
      setChatHistory(newHistory);
    } catch (err) {
      alert("Буцаах үйлдэл амжилтгүй.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1527] rounded-3xl border border-slate-800 shadow-xl p-3 sm:p-4 overflow-hidden">
      {/* Дэд толгой */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <h2 className="font-bold text-blue-400 text-sm sm:text-base">AI Туслах & Зарлага</h2>
          {!isOnline && (
            <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Офлайн
            </span>
          )}
        </div>
        <button 
          onClick={onBack} 
          className="bg-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-800 hover:bg-slate-800 text-slate-300 active:scale-95 transition"
        >
          ← Буцах
        </button>
      </div>

      {/* Мессежүүд гүйх талбар */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-3 overscroll-contain pr-1">
        {chatHistory.length === 0 && (
          <div className="text-center text-slate-400 text-xs sm:text-sm mt-4 space-y-2">
            <div className="bg-blue-500/10 p-3.5 rounded-2xl border border-blue-500/20 w-fit mx-auto">
              <Mic className="h-7 w-7 text-blue-400" />
            </div>
            <p className="font-black text-white text-base">Монголоор ярьж эсвэл зураг дарж бүртгэнэ үү</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Микрофон товчийг дараад <strong>"2 литр сүү асгарсан"</strong> гэж хэлэхэд л AI шууд ойлгоно!
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
              msg.sender === 'worker' 
                ? 'bg-blue-600 text-white rounded-tr-none font-medium shadow-md' 
                : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800/80 shadow-md'
            }`}>
              {msg.sender === 'worker' ? (
                msg.text
              ) : (
                <div className="prose prose-invert max-w-none text-xs leading-relaxed font-normal">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              
              {msg.logId && (
                <button 
                  onClick={() => handleUndo(msg.logId!, i)}
                  className="mt-2.5 w-full bg-slate-950 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="h-3 w-3" /> Буцаах 
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold px-2 py-1 bg-blue-500/10 rounded-xl w-fit">
            <span className="animate-spin text-sm">☕</span>
            <span>AI бүртгэж байна...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ⚡ 1-TAP ХУРДАН ХАЯГДАЛ СОНГОХ ТОВЧНУУД (Гар бохир үед шууд товших) */}
      <div className="flex gap-1.5 overflow-x-auto py-1.5 shrink-0 no-scrollbar">
        {QUICK_SPILLS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAiChatSubmit(undefined, undefined, preset.text)}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition flex items-center gap-1 shrink-0"
          >
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Оруулах талбар + Зураг + Дуу хоолой (Mic) */}
      <div className="pt-1.5 shrink-0 w-full">
        <form 
          onSubmit={(e) => handleAiChatSubmit(e)} 
          className="bg-[#1e293b] border border-slate-700 rounded-2xl p-2.5 flex flex-col gap-2 shadow-lg focus-within:border-blue-500 w-full"
        >
          <textarea 
            ref={textareaRef}
            rows={1}
            value={chatInput} 
            onChange={e => {
              setChatInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }} 
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim()) handleAiChatSubmit();
              }
            }}
            placeholder={isListening ? "🎙️ Ярьж байна... '2 литр сүү асгасан' гэж хэлнэ үү" : "Зарлага бичих эсвэл микрофоноор ярих..."} 
            className={`w-full bg-transparent text-white text-[15px] leading-relaxed resize-none outline-none placeholder:text-slate-500 px-1 ${isListening ? 'animate-pulse text-emerald-400 font-bold' : ''}`} 
            style={{ minHeight: '38px', maxHeight: '100px' }}
          />

    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/60 shrink-0 w-full gap-1">
            {/* ⬅️ Зүүн талын товчнууд: Камер, Цомог, Ярих, Цуцлах */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
              
              {/* 📸 1. Камераар шууд зураг дарах */}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                id="kiosk-ai-camera" 
                className="hidden" 
                onChange={(e) => { 
                  if (e.target.files && e.target.files[0]) {
                    handleAiChatSubmit(undefined, e.target.files[0]);
                    e.target.value = ''; // iOS дээр дахин зураг сонгоход гацахаас сэргийлнэ
                  } 
                }}
              />
              <label 
                htmlFor="kiosk-ai-camera" 
                className="h-8 sm:h-9 px-2 sm:px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl flex items-center gap-1 cursor-pointer text-emerald-400 font-bold text-[11px] sm:text-xs transition shrink-0 select-none"
                title="Шууд камераар зураг дарах"
              >
                <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden min-[360px]:inline">Камер</span>
              </label>

              {/* 🖼️ 2. Галерей / Утасны цомгоос зураг оруулах */}
              <input 
                type="file" 
                accept="image/*" 
                id="kiosk-ai-gallery" 
                className="hidden" 
                onChange={(e) => { 
                  if (e.target.files && e.target.files[0]) {
                    handleAiChatSubmit(undefined, e.target.files[0]);
                    e.target.value = ''; // iOS reset
                  } 
                }}
              />
              <label 
                htmlFor="kiosk-ai-gallery" 
                className="h-8 sm:h-9 px-2 sm:px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl flex items-center gap-1 cursor-pointer text-slate-300 font-bold text-[11px] sm:text-xs transition shrink-0 select-none"
                title="iPad эсвэл утасны цомгоос сонгох"
              >
                <span className="text-xs shrink-0">🖼️</span>
                <span className="hidden min-[360px]:inline">Цомог</span>
              </label>

              {/* 🎙️ 3. Монгол дуу хоолойгоор ярих (Mic) */}
              <button
                type="button"
                onClick={startVoiceRecording}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1 font-bold text-[11px] sm:text-xs active:scale-95 transition-all shrink-0 select-none ${
                  isListening 
                    ? 'bg-rose-600 text-white animate-bounce shadow-[0_0_12px_rgba(225,29,72,0.6)]' 
                    : 'bg-slate-800 hover:bg-slate-700 text-blue-400'
                }`}
                title={isListening ? "Дуу бичихийг зогсоох" : "Дуугаар ярих"}
              >
                {isListening ? <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> : <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />}
                <span>{isListening ? "Сонсож байна..." : "Ярих"}</span>
              </button>

              {/* ❌ 4. Цуцлах товч (Зөвхөн ярьж эсвэл AI ажиллаж байх үед гарна) */}
              {(isListening || isAiLoading) && (
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="h-8 sm:h-9 px-2 sm:px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl flex items-center gap-1 font-bold text-[11px] sm:text-xs active:scale-95 transition shrink-0 select-none"
                  title="Цуцлах / Дахин ярих"
                >
                  <X className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden min-[380px]:inline">Болих</span>
                </button>
              )}
            </div>

            {/* ➡️ Баруун талын Илгээх товч (Хэзээ ч доошоо унахгүй, байрандаа цэвэрхэн үлдэнэ) */}
            <button 
              type="submit" 
              disabled={isAiLoading || !chatInput.trim()} 
              className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all shrink-0 select-none ml-1 ${
                chatInput.trim() && !isAiLoading 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95 cursor-pointer' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{isAiLoading ? "..." : "Илгээх"}</span>
              <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 📱 4. MAIN COMPONENT: KIOSK PAGE
// =========================================================================
function KioskPage() {
  const router = useRouter(); 
  const [step, setStep] = useState<'select_worker' | 'pin_code' | 'shift_handover' | 'menu' | 'ai_chat' | 'tasks' | 'incident_report' | 'close_shift'>('select_worker');
  
  const [tenantClientId, setTenantClientId] = useState<string>('SF Coffee');
  const [workers, setWorkers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [learnedAliases, setLearnedAliases] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Shift Handover Start States
  const [handoverNote, setHandoverNote] = useState('');
  const [handoverFile, setHandoverFile] = useState<File | null>(null);

  // Incident Report States (Previous Shift Damage)
  const [incidentWorker, setIncidentWorker] = useState('');
  const [incidentItem, setIncidentItem] = useState('');
  const [incidentQty, setIncidentQty] = useState('');
  const [incidentNote, setIncidentNote] = useState('');
  const [incidentFile, setIncidentFile] = useState<File | null>(null);

  // Tasks & Shift Close States
  const [tasks, setTasks] = useState<any[]>([]);
  const [inventoryToCount, setInventoryToCount] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [posZFile, setPosZFile] = useState<File | null>(null);
  // ⚡ ШИНЭ: Kiosk 2-Tap Горим & Numpad State-үүд
  const [kioskMode, setKioskMode] = useState<'spoilage' | 'staff_meal' | 'testing' | 'purchase'>('spoilage');
  const [quickItemModal, setQuickItemModal] = useState<any | null>(null);
  const [quickQty, setQuickQty] = useState<string>('');
  const [purchaseCost, setPurchaseCost] = useState<string>('');
  const [kioskSearch, setKioskSearch] = useState<string>('');
  const [recentToast, setRecentToast] = useState<{ id: string; text: string } | null>(null);
  // 💵 Бэлэн мөнгө гаргах (Cash Out) & Хаалтын касс тоолох State-үүд
  const [cashOutModal, setCashOutModal] = useState(false);
  const [cashOutType, setCashOutType] = useState<'owner_draw' | 'petty_cash'>('owner_draw');
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutNote, setCashOutNote] = useState('');
  const [cashOutFile, setCashOutFile] = useState<File | null>(null);
  const [actualCashDrawer, setActualCashDrawer] = useState(''); // Ээлж хаах үеийн бодит бэлэн мөнгө
  // 📖 1. Дижитал Жор (SOP) харах State-үүд
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipesList, setRecipesList] = useState<any[]>([]);
  const [selectedProductRecipe, setSelectedProductRecipe] = useState<string | null>(null);
// 📸 1. E-Barimt-гүй үед барааны зураг хавсаргах State
  const [noEbarimtFile, setNoEbarimtFile] = useState<File | null>(null);
  const [purchasePayMethod, setPurchasePayMethod] = useState<'bank' | 'cash'>('bank');
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);

   // ➕ ШИНЭ БАРАА НЭМЭХЭД ДУТАГДАЖ БАЙСАН STATE-ҮҮД:
  const [showAddNewItemModal, setShowAddNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('ш');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  // 🧾 2. E-Barimt уншсаны дараа ШАЛГАХ / ЗАСАХ (Preview/Approve) Modal-ийн State
  const [ebarimtReview, setEbarimtReview] = useState<{
    file: File;
    previewUrl: string;
    items: Array<{ item_name: string; quantity: number; total_cost: number; is_food: boolean }>;
    payMethod: 'bank' | 'cash';
  } | null>(null);

  useEffect(() => { 
    initKioskContext();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kiosk_device_locked', 'true');
    }

    // 📶 ОФЛАЙН ГОРИМ ДЭЭР ХАДГАЛАГДСАН ӨГӨГДЛИЙГ АВТОМАТААР БААЗ РУУ СИНХРОНЧЛОХ
    const syncOfflineLogs = async () => {
      const offlineQueue = JSON.parse(localStorage.getItem('kiosk_offline_queue') || '[]');
      if (offlineQueue.length === 0 || !navigator.onLine) return;

      try {
        const { error } = await supabase.from('inventory_logs').insert(offlineQueue);
        if (!error) {
          localStorage.removeItem('kiosk_offline_queue');
          console.log("Офлайн үед хадгалсан логууд амжилттай баазад синк хийгдлээ.");
        }
      } catch (err) {
        console.warn("Sync failed, will retry later:", err);
      }
    };

    window.addEventListener('online', syncOfflineLogs);
    syncOfflineLogs();

    return () => window.removeEventListener('online', syncOfflineLogs);
  }, []);

  const initKioskContext = async () => {
    let detectedClient = 'SF Coffee';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlClient = urlParams.get('clientId');
      const savedClient = localStorage.getItem('kiosk_client_id');
      if (urlClient) {
        detectedClient = urlClient;
        localStorage.setItem('kiosk_client_id', urlClient);
      } else if (savedClient) {
        detectedClient = savedClient;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.client_id) {
      detectedClient = session.user.user_metadata.client_id;
      localStorage.setItem('kiosk_client_id', detectedClient);
    }

    setTenantClientId(detectedClient);
    fetchKioskData(detectedClient);
  };

  const fetchKioskData = async (client: string) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('client_id', client)
      .neq('role', 'owner');
    
    if (profiles) setWorkers(profiles);

    const { data: ingData } = await supabase
      .from('ingredients')
      .select('id, name, unit, current_stock, is_critical, last_counted_at, client_id, is_suspicious_promoted, promoted_until')
      .ilike('client_id', client)
      .order('name', { ascending: true });

    if (ingData) setIngredients(ingData);

    const { data: aliasesData } = await supabase
    .from('learned_aliases')
    .select('phrase, ingredient_id')
    .ilike('client_id', client);

    if (aliasesData) setLearnedAliases(aliasesData);
    // 📖 Жоруудыг түүхий эдийн нэртэй нь хамт татах
    const { data: recData } = await supabase
      .from('recipes')
      .select('product_name, amount, ingredient_id, ingredients(name, unit)')
      .ilike('client_id', client);
    if (recData) setRecipesList(recData);
  };

  const loadLiveTodayTasks = async (tenantId: string, worker: any) => {
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
      .ilike('client_id', tenantId)
      .eq('is_active', true);

    const workerName = worker.email.split('@')[0];
    const workerDisplayName = (worker.full_name || workerName).trim();
    const workerRoleLower = (worker.role || '').toLowerCase().trim();
    const workerNameLower = workerDisplayName.toLowerCase().trim();
    const isBarista = workerRoleLower.includes('barista') || workerRoleLower.includes('бариста');
    const isCook = workerRoleLower.includes('cook') || workerRoleLower.includes('chef') || workerRoleLower.includes('тогооч');

    const matchedTemplateTasks = (allTasks || []).filter((t: any) => {
      if (t.is_active === false) return false;
      const tRole = (t.role || '').toLowerCase().trim();
      if (tRole === 'бүх ажилтан' || tRole.includes('бүх')) return true;
      if (tRole === workerNameLower || tRole.includes(workerNameLower)) return true;
      if (isBarista && (tRole.includes('бариста') || tRole.includes('barista'))) return true;
      if (isCook && (tRole.includes('тогооч') || tRole.includes('cook') || tRole.includes('chef'))) return true;
      return false;
    }).map((t: any) => ({ id: t.id, name: t.task_name, weight: t.weight || 10, done: false }));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('daily_tasks_checklist')
      .eq('client_id', tenantId)
      .gte('start_time', todayStart.toISOString());

    const completedTasksToday = new Set<string>();
    (todayShifts || []).forEach((s: any) => {
      let list = s.daily_tasks_checklist;
      if (typeof list === 'string') list = JSON.parse(list);
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item.done && item.name) completedTasksToday.add(item.name.toLowerCase().trim());
        });
      }
    });

    return matchedTemplateTasks.map(t => ({
      ...t,
      done: completedTasksToday.has(t.name.toLowerCase().trim())
    }));
  };

const openTasksScreen = () => {
    // ⚡ Шууд дэлгэцийг нээнэ (0ms)
    setStep('tasks');

    // Цаана нь датаг сэмхэн шинэчлэх (Background sync)
    if (selectedWorker) {
      loadLiveTodayTasks(tenantClientId, selectedWorker).then((liveTasks) => {
        setTasks(liveTasks);
        if (activeShift) {
          supabase.from('shifts').update({ daily_tasks_checklist: liveTasks }).eq('id', activeShift.id);
        }
      });
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(8);
    }
    setPin(p => p.length < 4 ? p + digit : p);
  };

const handleVerifyPin = async () => {
    if (!selectedWorker) return;
    const validPin = selectedWorker.pin_code || '1234';

    if (pin !== validPin) {
      setMsg("❌ Буруу PIN код!");
      setPin('');
      return;
    }

    // ⚡ Хоёр хүсэлтийг зэрэг дуудаж хугацааг хэмнэнэ
    const [shiftRes, liveTasks] = await Promise.all([
      supabase
        .from('shifts')
        .select('*')
        .eq('client_id', tenantClientId)
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle(),
      loadLiveTodayTasks(tenantClientId, selectedWorker)
    ]);

    setTasks(liveTasks);

    if (!shiftRes.data) {
      setStep('shift_handover');
    } else {
      setActiveShift(shiftRes.data);
      setStep('menu');
    }

    setPin('');
    setMsg('');
  };
  const handleStartShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiLoading(true);

    let startImgUrl = null;
    if (handoverFile) {
      startImgUrl = await uploadEvidencePhoto(handoverFile, 'handover_starts');
    }

    const workerName = selectedWorker.email.split('@')[0];
    const workerDisplayName = (selectedWorker.full_name || workerName).trim();
    const fullNameRole = `${selectedWorker.role} (${workerDisplayName})`;

    const { data: newShift, error } = await supabase.from('shifts').insert([{
      client_id: tenantClientId,
      character_role: fullNameRole,
      is_active: true,
      start_notes: handoverNote || 'Ээлж хэвийн хүлээн авсан.',
      start_evidence_image: startImgUrl,
      daily_tasks_checklist: tasks,
      telegram_chat_id: selectedWorker.telegram_chat_id || 0
    }]).select().single();

    if (error || !newShift) {
      setMsg(`❌ Алдаа: ${error?.message || 'Ээлж үүсгэж чадсангүй.'}`);
      setIsAiLoading(false);
      return;
    }

    setActiveShift(newShift);
    setIsAiLoading(false);
    setStep('menu');
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentItem || !incidentQty) return;
    setIsAiLoading(true);

    let damageImgUrl = null;
    if (incidentFile) {
      damageImgUrl = await uploadEvidencePhoto(incidentFile, 'damage_proofs');
    }

    const ing = ingredients.find(i => i.id === incidentItem);
    const qty = parseFloat(incidentQty) || 0;
    const lossCost = ing ? qty * (parseFloat(ing.unit_price) || 0) : 0;

    await supabase.from('inventory_logs').insert([{
      client_id: tenantClientId,
      ingredient_id: ing ? ing.id : null,
      quantity: -Math.abs(qty),
      total_cost: lossCost,
      type: 'spoilage',
      incident_type: 'previous_shift_damage',
      reported_against_worker: incidentWorker || 'Өмнөх ээлжийн ажилтан',
      image_url: damageImgUrl,
      notes: `Өмнөх ээлжийн алдагдал: ${incidentNote || 'Шалтгаангүй хаягдал илэрсэн'}`,
      worker_name: activeShift?.character_role || selectedWorker.full_name,
      date: new Date().toISOString()
    }]);

    setIsAiLoading(false);
    alert("⚠️ Өмнөх ээлжийн алдагдал менежерийн хяналтад бүртгэгдлээ!");
    setIncidentItem('');
    setIncidentQty('');
    setIncidentNote('');
    setIncidentFile(null);
    setStep('menu');
  };

  const completeTask = async (index: number) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[index].done) return;
    updatedTasks[index].done = true;
    setTasks(updatedTasks);
    if (activeShift) {
      await supabase.from('shifts').update({ daily_tasks_checklist: updatedTasks }).eq('id', activeShift.id);
    }
  };

  

const loadInventoryToCount = () => {
    setMsg('');
    const twelveHoursAgo = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();

    // 1. А-Class (Чухал) бараанууд түрүүлж орно
    const criticalItems = ingredients.filter(
      (i) => i.is_critical && (!i.last_counted_at || i.last_counted_at < twelveHoursAgo)
    );

    // 2. Үлдсэн 5 суудлыг хамгийн удаан тоологдоогүй бараануудаар нөхнө
    const remainingSlots = Math.max(0, 5 - criticalItems.length);
    const cycleItems = ingredients
      .filter((i) => !i.is_critical && (!i.last_counted_at || i.last_counted_at < twelveHoursAgo))
      .sort((a, b) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime())
      .slice(0, remainingSlots);

    // ⚡ Аналитик дуудаж хүлээхгүй шууд дэлгэцийг нээнэ!
    setInventoryToCount([...criticalItems, ...cycleItems]);
    setCounts({});
    setActualCashDrawer('');
    setPosZFile(null);
    setStep('close_shift');
  };



// ⚡ 0 МИЛЛИСЕКУНДЭД ШУУД ХААГДАЖ ГАРДАГ ХАМГИЙН ХУРДАН ХААЛТ
 
const handleCloseShift = () => {
    // 1. ШАЛГАЛТУУД (Дутуу зүйл байвал шууд анхааруулна)
    const uncountedItems = inventoryToCount.filter(
      (i) => counts[i.id] === undefined || counts[i.id].toString().trim() === ""
    );
    if (uncountedItems.length > 0) {
      setMsg(`⚠️ Тооллого дутуу байна: ${uncountedItems.map((i) => i.name).join(", ")}`);
      return;
    }

    if (!posZFile) {
      setMsg("⚠️ ПОС-ын Z-Тайлангийн зургийг заавал дарж оруулна уу!");
      return;
    }

    if (actualCashDrawer.trim() === "" || isNaN(Number(actualCashDrawer)) || Number(actualCashDrawer) < 0) {
      setMsg("⚠️ Кассын бэлэн мөнгийг бичнэ үү (Байхгүй бол 0)!");
      return;
    }

    // ⚡ 2. ӨГӨГДЛҮҮДИЙГ БЭЛТГЭХ
    const endTime = new Date().toISOString();
    const fileToUpload = posZFile;
    const cashVal = actualCashDrawer;
    const currentShift = activeShift;
    const itemsCounted = [...inventoryToCount];
    const itemCounts = { ...counts };
    const completedTaskIds = tasks.filter((t: any) => t.done && t.id).map((t: any) => t.id);

    // ⚡ 3. ДЭЛГЭЦ ШУУД 0 МИЛЛИСЕКУНДЭД АМЖИЛТТАЙ ГЭЖ СОЛИГДОНО! (Хүлээхгүй)
    setMsg("🌙 Ээлж амжилттай хаагдлаа!");
    setStep("select_worker");
    setSelectedWorker(null);
    setActiveShift(null);
    setTasks([]);
    setCounts({});
    setPosZFile(null);
    setActualCashDrawer("");

    // ⚡ 4. ЗУРАГ ХУУЛАХ БА БААЗАД ХИЙХИЙГ ЦААНА НЬ ЧИМЭЭГҮЙ АЖИЛЛУУЛАХ (Background)
    (async () => {
      try {
        let posZUrl = null;
        if (fileToUpload) {
          posZUrl = await uploadEvidencePhoto(fileToUpload, "pos_z_reports");
        }

        const countLogsToInsert: any[] = itemsCounted.map((item) => ({
          client_id: tenantClientId,
          ingredient_id: item.id,
          quantity: parseFloat(itemCounts[item.id]) || 0,
          type: "count",
          notes: "Ээлж хаалтын бодит тооллого (Kiosk)",
          worker_name: currentShift?.character_role || selectedWorker?.full_name,
          date: endTime,
        }));

        if (cashVal && parseFloat(cashVal) >= 0) {
          countLogsToInsert.push({
            client_id: tenantClientId,
            ingredient_id: null,
            non_food_item: "Кассын хаалтын үлдэгдэл",
            quantity: 1,
            total_cost: parseFloat(cashVal) || 0,
            type: "count",
            notes: `Кассын тоолсон бэлэн мөнгө: ${(parseFloat(cashVal) || 0).toLocaleString()}₮`,
            payment_method: "cash",
            worker_name: currentShift?.character_role || selectedWorker?.full_name,
            date: endTime,
          });
        }

        const logsPromise = supabase.from("inventory_logs").insert(countLogsToInsert);
        
        const shiftPromise = currentShift ? supabase.from("shifts").update({
          is_active: false,
          end_time: endTime,
          pos_z_image_url: posZUrl,
        }).eq("id", currentShift.id) : Promise.resolve();

        const tasksPromise = completedTaskIds.length > 0
          ? supabase.from("tasks").update({ is_active: false }).in("id", completedTaskIds)
          : Promise.resolve();

        // 🚀 Бүгдийг зэрэг гүйцэтгэнэ
        await Promise.all([logsPromise, shiftPromise, tasksPromise]);
        fetchKioskData(tenantClientId);
      } catch (e) {
        console.error("Close shift background error:", e);
      }
    })();
  };

  return (
    <div className="h-[100dvh] w-full bg-[#070b14] text-slate-100 flex flex-col items-center p-2.5 sm:p-4 select-none overflow-hidden touch-none">
      
      {/* 🔝 HEADER */}
      <header className="w-full max-w-md flex justify-between items-center border-b border-slate-800/80 pb-2.5 mb-2 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 p-1.5 rounded-xl border border-emerald-500/20">
            <Coffee className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">{tenantClientId} KIOSK</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase">Smart Operations</p>
          </div>
        </div>

    <div className="flex items-center gap-2">
       <Link 
        href="/login?from=kiosk"
        className="text-slate-300 hover:text-white text-xs font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 active:scale-95 transition"
      >
        🔒 Dashboard
      </Link>
          {/* 🟢 ЭНЭ НЬ button ХЭВЭЭРЭЭ БАЙНА (Хуудас солихгүй тул): */}
          {selectedWorker && (
            <button 
              onClick={() => { setSelectedWorker(null); setStep('select_worker'); setMsg(''); }} 
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition flex items-center gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Гарах</span>
            </button>
          )}
        </div>

      </header>

      {/* 🚀 MAIN CONTENT */}
      <main className="w-full max-w-md flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {msg && (
          <div className="bg-rose-500/10 text-rose-400 p-2.5 rounded-xl mb-2 w-full text-center font-bold text-xs border border-rose-500/20 animate-pulse flex items-center justify-center gap-2 shrink-0">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* 1. SELECT WORKER */}
        {step === 'select_worker' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="text-center pt-2 shrink-0">
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 w-fit mx-auto mb-2">
                <Users className="text-emerald-400 h-7 w-7"/>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Ажилтнаа сонгоно уу</h2>
              <p className="text-xs text-slate-400 mt-0.5">Өөрийн нэр дээр дарж ээлжиндээ нэвтэрнэ үү</p>
            </div>

            <div className="space-y-3 w-full my-auto overflow-y-auto max-h-[60vh] px-1">
              {workers.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  Энэ салбарт ажилтан бүртгэгдээгүй байна.<br />(Dashboard-аас ажилтан нэмнэ үү)
                </div>
              ) : (
                workers.map(w => (
                  <button 
                    key={w.id} 
                    onClick={() => { setSelectedWorker(w); setStep('pin_code'); }} 
                    className="bg-[#0b1329] hover:bg-slate-800 active:scale-95 border-2 border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl text-left transition-all shadow-md flex justify-between items-center group w-full"
                  >
                    <div>
                      <span className="text-base sm:text-lg font-black text-white uppercase block group-hover:text-emerald-400 transition">
                        {w.full_name || w.email.split('@')[0]}
                      </span>
                      <span className="text-xs text-emerald-400 font-bold uppercase mt-0.5 block">
                        🏷️ {w.role}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl text-slate-500 group-hover:text-emerald-400 font-black text-xs">
                      ➔
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="text-center text-[10px] text-slate-500 pb-1 shrink-0">
              {tenantClientId} Kitchen Kiosk • Voice & AI Powered
            </div>
          </div>
        )}

        {/* 2. PIN PAD */}
        {step === 'pin_code' && (
      
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between items-center overflow-hidden touch-none">
            
            <div className="text-center w-full shrink-0 pt-1">
              <h2 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">PIN код оруулна уу</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Өөрийн хувийн нууц кодыг оруулна уу</p>
              <div className="mt-1.5 inline-block bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-800">
                <span className="text-xs sm:text-sm text-emerald-300 font-black">
                  👤 {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]} ({selectedWorker?.role})
                </span>
              </div>
            </div>
            

            <div className="bg-[#060b17] border border-slate-800 rounded-2xl py-2 px-6 flex justify-center items-center gap-4 w-full max-w-[200px] my-1 shrink-0">
              {[0, 1, 2, 3].map((dotIndex) => (
                <div 
                  key={dotIndex} 
                  className={`h-3.5 w-3.5 rounded-full transition-all duration-75 ${
                    pin.length > dotIndex ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)] scale-110' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full flex-1 max-h-[50vh] sm:max-h-[52vh] my-1 px-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} 
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); handleKeypadPress(num); }}
                  className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border-2 border-slate-800/90 rounded-2xl text-2xl sm:text-3xl font-black text-white shadow-md flex items-center justify-center select-none transition-transform"
                >
                  {num}
                </button>
              ))}
              
              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setPin(''); }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#2a0e1c] hover:bg-[#3d1429] active:scale-95 border-2 border-rose-900/40 text-rose-400 rounded-2xl text-sm sm:text-base font-black shadow-md flex items-center justify-center select-none transition-transform"
              >
                Clear
              </button>

              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleKeypadPress('0'); }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border-2 border-slate-800/90 rounded-2xl text-2xl sm:text-3xl font-black text-white shadow-md flex items-center justify-center select-none transition-transform"
              >
                0
              </button>

              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleVerifyPin(); }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#059669] hover:bg-emerald-500 active:scale-95 text-slate-950 rounded-2xl text-base sm:text-lg font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center select-none transition-transform"
              >
                OK
              </button>
              
            </div>
                                    {/* 🔐 PIN МАРТСАН ЭСВЭЛ СОЛИХ ТОВЧНУУД */}
          <div className="flex gap-4 justify-center items-center pt-2">
            
            {/* 1. Хуучин PIN-ээ мэдэж байгаа үед өөрөө солих */}
            <button
              type="button"
              onClick={async () => {
                const oldPin = prompt("Одоогийн 4 оронтой PIN-ээ оруулна уу:");
                if (!oldPin) return;
                if (oldPin !== (selectedWorker.pin_code || '1234')) {
                  alert("❌ Одоогийн PIN буруу байна!");
                  return;
                }
                const newPin = prompt("Шинэ 4 оронтой PIN оруулна уу:");
                if (!newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
                  alert("❌ Шинэ PIN заавал 4 оронтой тоо байх ёстой!");
                  return;
                }
                const { error } = await supabase.from('profiles').update({ pin_code: newPin }).eq('id', selectedWorker.id);
                if (error) alert(error.message);
                else {
                  alert("✅ Таны PIN код амжилттай солигдлоо!");
                  fetchKioskData(tenantClientId);
                }
              }}
              className="text-xs text-slate-400 hover:text-white underline font-semibold"
            >
              PIN солих
            </button>

            <span className="text-slate-700">•</span>

            {/* 2. Бүр мартчихсан үед Менежер/Эзнээр сэргээлгэх */}
            <button
              type="button"
              onClick={async () => {
                const masterCode = prompt("Менежер эсвэл Эзний зөвшөөрлийн Master код (9999) оруулна уу:");
                if (masterCode !== '9999' && masterCode !== '0000') {
                  alert("❌ Менежерийн код буруу байна!");
                  return;
                }
                const newPin = prompt(`${selectedWorker.full_name}-д зориулсан шинэ 4 оронтой PIN оруулна уу:`);
                if (!newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
                  alert("❌ PIN заавал 4 оронтой тоо байх ёстой!");
                  return;
                }
                const { error } = await supabase.from('profiles').update({ pin_code: newPin }).eq('id', selectedWorker.id);
                if (error) alert(error.message);
                else {
                  alert(`✅ ${selectedWorker.full_name}-ийн PIN сэргээгдэж шинэчлэгдлээ!`);
                  fetchKioskData(tenantClientId);
                }
              }}
              className="text-xs text-rose-400/80 hover:text-rose-400 underline font-semibold"
            >
              PIN мартсан
            </button>

          </div>
            <div className="text-center space-y-1 w-full pt-1 shrink-0">
              
              <p className="text-[11px] text-slate-400">💡 Анхдагч PIN: <strong className="text-white">1234</strong></p>
              
              <button 
                onClick={() => { setStep('select_worker'); setPin(''); setMsg(''); }} 
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ← Буцах
              </button>
              
            </div>
 
          </div>
 
        )}

        {/* 3. SHIFT START HANDOVER */}
        {step === 'shift_handover' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="text-center shrink-0">
              <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20 w-fit mx-auto mb-2">
                <ShieldCheck className="text-blue-400 h-7 w-7"/>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">Шинэ Ээлж Эхлүүлэх</h2>
              <p className="text-xs text-slate-400 mt-0.5">Гал тогооны цэвэрлэгээ, хөргөгчийн төлөвийг шалгаж хүлээн авна уу</p>
            </div>

            <form onSubmit={handleStartShiftSubmit} className="space-y-4 my-auto">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  📸 Ээлж хүлээж авах үеийн зураг (Нотлох зураг)
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    id="handover-start-cam" 
                    className="hidden" 
                    onChange={e => { if (e.target.files?.[0]) setHandoverFile(e.target.files[0]); }}
                  />
                  <label 
                    htmlFor="handover-start-cam" 
                    className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:border-blue-500 transition"
                  >
                    <Camera className="h-4 w-4 text-blue-400" />
                    <span>{handoverFile ? `✅ ${handoverFile.name.substring(0, 20)}...` : "Гал тогооны зураг дарах"}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  📝 Тэмдэглэл / Хүлээлцэх тайлбар
                </label>
                <textarea 
                  rows={3}
                  value={handoverNote}
                  onChange={e => setHandoverNote(e.target.value)}
                  placeholder="Жишээ: Өмнөх ээлжээс хөргөгч цэвэрхэн, сүү 4 хайрцаг үлдсэн..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              <button 
                type="submit" 
                disabled={isAiLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-3.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>{isAiLoading ? "Эхлүүлж байна..." : "☀️ Ээлж Албан Ёсоор Эхлүүлэх"}</span>
              </button>
            </form>

            <div className="text-center">
              <button 
                onClick={() => { setStep('select_worker'); setSelectedWorker(null); }} 
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ← Буцах
              </button>
            </div>
          </div>
        )}

{/* 4. MAIN ACTION MENU & DIGITAL KITCHEN */}
        {step === 'menu' && (
          <div className="w-full h-full bg-[#0d1527] p-3 sm:p-4 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden relative">
            
       {/* 🟢 СҮҮЛИЙН ҮЙЛДЭЛ (ХЭЗЭЭ Ч АЛГА БОЛОХГҮЙ, ХҮССЭН ЦАГТАА БУЦААХ БОЛОМЖТОЙ) */}
            {recentToast && (
              <div className="absolute top-2 left-3 right-3 z-30 bg-emerald-500 text-slate-950 px-3.5 py-2.5 rounded-2xl font-black text-xs shadow-2xl flex items-center justify-between border-2 border-emerald-400 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="bg-slate-950 text-emerald-400 px-2 py-0.5 rounded-lg text-[10px] font-mono shrink-0">Сүүлийнх:</span>
                  <span className="truncate font-black">{recentToast.text}</span>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* ↩️ БУЦААХ ТОВЧ (Баазаас шууд устгана) */}
                  <button
                    type="button"
                    onClick={async () => {
                      const idToUndo = recentToast.id;
                      setRecentToast(null);
                      await supabase.from('inventory_logs').delete().eq('id', idToUndo);
                      await fetchKioskData(tenantClientId);
                      setMsg('↩️ Бүртгэл цуцлагдаж, агуулахын үлдэгдэл сэргэлээ.');
                      setTimeout(() => setMsg(''), 4000);
                    }}
                    className="bg-slate-950 text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shadow"
                  >
                    ↩️ Буцаах 
                  </button>

                  {/* ✕ Карт хаах товч */}
                  <button
                    type="button"
                    onClick={() => setRecentToast(null)}
                    className="text-slate-900 hover:text-black font-bold p-1 text-sm"
                    title="Мэдэгдлийг хаах"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* 🔝 ТОЛГОЙ БА ШУУРХАЙ ТОХИРГОО */}
            <div className="shrink-0 space-y-2">
              <div className="flex justify-between items-center px-1">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Ажилтан:</span>
                  <h2 className="text-sm sm:text-base font-black text-white uppercase leading-tight">
                    {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* 📖 ДИЖИТАЛ ЖОР (SOP) ХАРАХ ТОВЧ */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecipeModal(true);
                      setSelectedProductRecipe(null);
                    }}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Жор (SOP)</span>
                  </button>

                  <button
                    onClick={() => setStep('ai_chat')}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    <span>Чат/Дуу</span>
                  </button>
                </div>
              </div>

              {/* 4 ГОРИМ: Хаягдал / Хоол / Туршилт / Орлого */}
              <div className="grid grid-cols-4 gap-1 bg-[#060b17] p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setKioskMode('spoilage')}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
                    kioskMode === 'spoilage' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🗑️ Хаягдал</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKioskMode('staff_meal')}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
                    kioskMode === 'staff_meal' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🍽️ Хоол</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKioskMode('testing')}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
                    kioskMode === 'testing' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🧪 Туршилт</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKioskMode('purchase')}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
                    kioskMode === 'purchase' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📦 Орлого</span>
                </button>
              </div>
            </div>

     {/* 📦 1. ОЛОН БАРААТАЙ E-BARIMT УНШУУЛАХ КАРТ */}
            {kioskMode === 'purchase' && (
              <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border-2 border-emerald-500/40 p-3 rounded-2xl my-2 shrink-0 flex items-center justify-between shadow-lg">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>🧾 Олон бараатай E-Barimt уншуулах</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Батлахын өмнө танд шалгуулна</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
              {/* Шууд камераар зураг авах */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="kiosk-receipt-cam"
                    className="hidden"
                onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              const rawFile = e.target.files[0];
                              setIsScanningReceipt(true);

                              // ⚡ iPad дээр зургийг 0.05 секундэд 97% жижигрүүлж авна:
                              const { file: compressedFile, base64 } = await compressImageForUpload(rawFile);

                              try {
                                const res = await fetch('/api/kiosk-ai', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ imageBase64: base64, tenantClientId, userRole: 'staff' })
                                });
                                const data = await res.json();
                                setIsScanningReceipt(false);

                                if (data.success && data.purchases) {
                                  setEbarimtReview({
                                    file: compressedFile, // 👈 Жижигхэн шахсан файлыг хадгалалтад бэлдэнэ
                                    previewUrl: URL.createObjectURL(compressedFile),
                                    items: data.purchases,
                                    payMethod: 'bank'
                                  });
                                } else {
                                  alert(data.message || "Баримтыг уншиж чадсангүй.");
                                }
                              } catch (err) {
                                setIsScanningReceipt(false);
                                alert("Сүлжээний алдаа гарлаа.");
                              }
                            }
                          }}
                
                
                  />
                  <label
                    htmlFor="kiosk-receipt-cam"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1 active:scale-95 shadow"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Камер</span>
                  </label>

                    {/* Галерей / Цомгоос сонгох */}
                  <input
                    type="file"
                    accept="image/*"
                    id="kiosk-receipt-gallery"
                    className="hidden"
                 onChange={async (e) => {
              if (e.target.files?.[0]) {
                const file = e.target.files[0];
                setIsScanningReceipt(true); // 👈 Сканнерын дэлгэцийг нээх

                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = (reader.result as string).split(',')[1];
                  try {
                    const res = await fetch('/api/kiosk-ai', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ imageBase64: base64, tenantClientId, userRole: 'staff' })
                    });
                    const data = await res.json();
                    setIsScanningReceipt(false); // 👈 Уншиж дуусмагц сканнерыг хаах

                        if (data.success && data.purchases) {
                          setEbarimtReview({
                            file: file,
                            previewUrl: URL.createObjectURL(file),
                            items: data.purchases,
                            payMethod: 'bank'
                          });
                        } else {
                          alert(data.message || "Баримтыг уншиж чадсангүй.");
                        }
                      } catch (err) {
                        setIsScanningReceipt(false);
                        alert("Холболтын алдаа гарлаа.");
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                  />
                  <label
                    htmlFor="kiosk-receipt-gallery"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1 active:scale-95 border border-slate-700"
                  >
                    <span>🖼️ Цомог</span>
                  </label>
                </div>
              </div>
            )}

            {/* 🔍 А-CLASS БАРААНУУД БА ХАЙЛТ */}
            <div className="flex-1 min-h-0 my-1 flex flex-col overflow-hidden">
              <div className="pb-1.5 shrink-0">
                <input
                  type="text"
                  value={kioskSearch}
                  onChange={(e) => setKioskSearch(e.target.value)}
                  placeholder="🔍 Бараа хайх (нэг товшилтоор бүртгэнэ)..."
                  className="w-full bg-[#060b17] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                />
                   {/* ➕ ХЭРЭВ БААЗАД БАЙХГҮЙ БАРАА ХАЙВАЛ ШУУД НЭМЭХ ТОВЧ ГАРНА */}
                {kioskSearch.trim() && !ingredients.some(i => i.name.toLowerCase().trim() === kioskSearch.toLowerCase().trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewItemName(kioskSearch.trim());
                      setNewItemQty('');
                      setNewItemCost('');
                      setNewItemFile(null);
                      setShowAddNewItemModal(true);
                    }}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-dashed border-emerald-500/40 text-emerald-400 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Шинэ түүхий эд: "{kioskSearch.trim()}" үүсгэх</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-max">
                {ingredients
                  .filter((ing) => {
                    if (kioskSearch.trim()) return ing.name.toLowerCase().includes(kioskSearch.toLowerCase().trim());
                    return true;
                  })
                  .sort((a, b) => {
                    if (a.is_critical && !b.is_critical) return -1;
                    if (!a.is_critical && b.is_critical) return 1;
                    return (parseFloat(b.current_stock) || 0) - (parseFloat(a.current_stock) || 0);
                  })
                  .slice(0, 15)
                  .map((ing) => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => {
                        setQuickItemModal(ing);
                        setQuickQty('');
                        setPurchaseCost('');
                      }}
                      className="bg-[#0b1329] hover:bg-slate-800 active:scale-95 border border-slate-800 hover:border-slate-700 p-2.5 rounded-2xl flex flex-col justify-between text-left transition shadow-sm min-h-[64px]"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-snug">
                          {ing.name}
                        </span>
                        {ing.is_critical && (
                          <span className="text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded shrink-0">
                            ★ A
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-slate-400 font-medium">{ing.unit}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          kioskMode === 'spoilage' ? 'bg-rose-500/10 text-rose-400' : kioskMode === 'staff_meal' ? 'bg-blue-500/10 text-blue-400' : kioskMode === 'testing' ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {kioskMode === 'spoilage' ? 'Хасах' : kioskMode === 'staff_meal' ? 'Хоол' : kioskMode === 'testing' ? 'Туршилт' : 'Нэмэх'}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* 🔘 ДООД 3 ТОМ ТОВЧ: Даалгавар / Мөнгө гаргах / Ээлж хаах */}
            <div className="grid grid-cols-3 gap-1.5 pt-1.5 shrink-0 border-t border-slate-800/80">
              <button
                type="button"
                onClick={openTasksScreen}
                className="p-2.5 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 rounded-2xl border border-purple-500/30 text-purple-400 font-black text-[11px] flex flex-col items-center justify-center gap-1 transition"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Даалгавар</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCashOutModal(true);
                  setCashOutAmount('');
                  setCashOutNote('');
                  setCashOutFile(null);
                }}
                className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 rounded-2xl border border-amber-500/30 text-amber-400 font-black text-[11px] flex flex-col items-center justify-center gap-1 transition"
              >
                <span className="text-sm">💵</span>
                <span>Мөнгө гаргах</span>
              </button>

              <button
                type="button"
                onClick={loadInventoryToCount}
                className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 rounded-2xl border border-emerald-500/30 text-emerald-400 font-black text-[11px] flex flex-col items-center justify-center gap-1 transition"
              >
                <ListOrdered className="h-4 w-4" />
                <span>Ээлж Хаах</span>
              </button>
            </div>

            {/* ========================================================================= */}
            {/* 📖 ДИЖИТАЛ ЖОР (SOP) ХАРАХ МОДАЛ (Ээжийн оролцоог бүрэн хаах хэсэг) */}
            {/* ========================================================================= */}
            {showRecipeModal && (
              <div
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3"
                onClick={() => setShowRecipeModal(false)}
              >
                <div
                  className="bg-[#0d1527] border border-slate-700 rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                        <BookOpen className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base">Стандарт Жор & Заавар (SOP)</h3>
                        <p className="text-[11px] text-slate-400">Хэнээс ч асуухгүйгээр жороо яг граммаар нь хийнэ үү</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRecipeModal(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs font-bold"
                    >
                      ✕ Хаах
                    </button>
                  </div>

                  {/* Бүтээгдэхүүн сонгох хэсэг */}
                  {!selectedProductRecipe ? (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      <p className="text-xs font-bold text-slate-400 mb-2">Цэс сонгоно уу:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from(new Set(recipesList.map((r: any) => r.product_name))).map((pName: any) => (
                          <button
                            key={pName}
                            type="button"
                            onClick={() => setSelectedProductRecipe(pName)}
                            className="bg-[#0b1329] hover:bg-slate-800 border border-slate-800 p-3 rounded-2xl text-left font-bold text-xs text-white flex justify-between items-center active:scale-95 transition"
                          >
                            <span>{pName}</span>
                            <span className="text-emerald-400 text-sm">➔</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Сонгосон жорын орцын задаргаа */
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      <div className="flex justify-between items-center bg-[#060b17] p-3 rounded-2xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Сонгосон Жор:</span>
                          <h4 className="text-base font-black text-white">{selectedProductRecipe}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProductRecipe(null)}
                          className="text-xs text-slate-400 hover:text-white underline font-bold"
                        >
                          ← Бусад цэс
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Орц, хэмжээ (Граммаар):</p>
                        <div className="divide-y divide-slate-800/80 bg-[#060b17] rounded-2xl border border-slate-800 overflow-hidden">
                          {recipesList
                            .filter((r: any) => r.product_name === selectedProductRecipe)
                            .map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-3 text-xs">
                                <span className="font-bold text-slate-200">
                                  {item.ingredients?.name || "Орц"}
                                </span>
                                <span className="font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                  {item.amount} {item.ingredients?.unit || "гр/мл"}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl text-[11px] text-blue-300 space-y-1">
                        <p className="font-bold">💡 Санамж:</p>
                        <p>Дээрх граммыг яг баримталснаар кофены амт үргэлж стандартын дагуу 100% жигд гарна.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 💵 БИЕ ДААСАН МӨНГӨ ГАРГАХ МОДАЛ (Гадаа гарч бие даасан) */}
            {/* ========================================================================= */}
            {cashOutModal && (
              <div
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
                onClick={() => setCashOutModal(false)}
              >
                <div
                  className="bg-[#0d1527] border border-slate-700 rounded-3xl p-4 w-full max-w-sm shadow-2xl space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      💵 Касснаас Бэлэн Мөнгө Гаргах
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCashOutModal(false)}
                      className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-xl text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#060b17] p-1 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCashOutType('owner_draw')}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        cashOutType === 'owner_draw' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👑 Эзний таталт
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashOutType('petty_cash')}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        cashOutType === 'petty_cash' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🧼 Жижиг зардал (CU)
                    </button>
                  </div>

                  <div className="bg-[#060b17] border border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-3xl font-black text-white font-mono">
                      {cashOutAmount ? Number(cashOutAmount).toLocaleString() : '0'}
                    </span>
                    <span className="ml-1 text-sm font-bold text-amber-400">₮</span>
                  </div>

                  <input
                    type="text"
                    value={cashOutNote}
                    onChange={(e) => setCashOutNote(e.target.value)}
                    placeholder={cashOutType === 'owner_draw' ? 'Тайлбар (Захирал хувийн хэрэгцээнд авсан)' : 'Юу авсан бэ? (Саван, уут)'}
                    className="w-full bg-[#060b17] border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
                  />

                  {cashOutType === 'petty_cash' && (
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="petty-cash-receipt"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setCashOutFile(e.target.files[0]); }}
                      />
                      <label
                        htmlFor="petty-cash-receipt"
                        className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:border-blue-500 transition"
                      >
                        <Camera className="h-4 w-4 text-blue-400" />
                        <span>{cashOutFile ? `✅ ${cashOutFile.name.substring(0, 18)}...` : 'Баримт/Барааны зураг заавал дарах'}</span>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setCashOutAmount((prev) => prev + digit)}
                        className="bg-[#0b1329] hover:bg-slate-800 active:scale-95 text-white font-black text-lg py-2.5 rounded-2xl border border-slate-800 transition"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashOutAmount((prev) => prev.slice(0, -1))}
                      className="bg-rose-500/10 text-rose-400 font-bold text-xs py-2.5 rounded-2xl border border-rose-500/20 active:scale-95 flex items-center justify-center"
                    >
                      ← Засах
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!cashOutAmount || parseFloat(cashOutAmount) <= 0 || (cashOutType === 'petty_cash' && !cashOutFile) || isAiLoading}
                  onClick={() => {
                        const amount = parseFloat(cashOutAmount);
                        const fileToUpload = cashOutFile;
                        const typeToSave = cashOutType;
                        const noteToSave = cashOutNote;

                        // ⚡ 1. ЦОНХ ТЭР ДОРОО АЛГА БОЛНО (0 миллисекунд!)
                        setCashOutModal(false);
                        setCashOutAmount('');
                        setCashOutNote('');
                        setCashOutFile(null);

                        // ⚡ 2. ДЭЭД ТАЛД МЭДЭЭЛЭЛ ШУУД ГАРНА
                        setRecentToast({
                          id: 'temp-' + Date.now(),
                          text: `💵 Касснаас гарсан: ${amount.toLocaleString()}₮ (${typeToSave === 'owner_draw' ? 'Эзний таталт' : 'Жижиг зардал'})`
                        });

                        // ⚡ 3. ЗУРАГ БА ДАТАГ ЦААНА НЬ ЧИМЭЭГҮЙ ХАДГАЛАХ (Background)
                        (async () => {
                          try {
                            let uploadedImg = null;
                            if (fileToUpload) uploadedImg = await uploadEvidencePhoto(fileToUpload, 'petty_cash');

                            const noteText = typeToSave === 'owner_draw'
                              ? `Эзний хувийн таталт (Cash Draw): ${noteToSave || 'Бэлнээр авсан'}`
                              : `Жижиг зардал (Petty Cash): ${noteToSave || 'Ахуйн хэрэгсэл'}`;

                            const { data: newLog } = await supabase.from('inventory_logs').insert([{
                              client_id: tenantClientId,
                              ingredient_id: null,
                              non_food_item: typeToSave === 'owner_draw' ? 'Эзний таталт' : (noteToSave || 'Ахуйн зардал'),
                              quantity: 1,
                              total_cost: amount,
                              type: typeToSave === 'owner_draw' ? 'other' : 'purchase',
                              payment_method: 'cash',
                              notes: noteText,
                              image_url: uploadedImg,
                              worker_name: activeShift?.character_role || selectedWorker.full_name,
                              date: new Date().toISOString()
                            }]).select().single();

                            if (newLog) {
                              setRecentToast({
                                id: newLog.id,
                                text: `💵 Касснаас гарсан: ${amount.toLocaleString()}₮ (${typeToSave === 'owner_draw' ? 'Эзний таталт' : 'Жижиг зардал'})`
                              });
                            }
                          } catch (e) {
                            console.error("Cash out background error:", e);
                          }
                        })();
                      }}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95"
                  >
                    {isAiLoading ? 'Хадгалж байна...' : (cashOutType === 'petty_cash' && !cashOutFile) ? '📸 ЗУРАГ ДАРНА УУ' : 'МӨНГӨ ГАРГАХЫГ БАТЛАХ'}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 🔢 NUMPAD ЦОНХ (Бараан дээр дарахад гарах тооны машин) */}
            {/* ========================================================================= */}
            {quickItemModal && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
                onClick={() => setQuickItemModal(null)}
              >
                <div
                  className="bg-[#0d1527] border border-slate-700 rounded-3xl p-4 w-full max-w-sm shadow-2xl space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        kioskMode === 'spoilage' ? 'bg-rose-500/20 text-rose-400' : kioskMode === 'staff_meal' ? 'bg-blue-500/20 text-blue-400' : kioskMode === 'testing' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {kioskMode === 'spoilage' ? '🗑️ Хаягдал бүртгэх' : kioskMode === 'staff_meal' ? '🍽️ Ажилтны хоолонд' : kioskMode === 'testing' ? '🧪 Туршилт / Тохируулга' : '📦 Орлого авах'}
                      </span>
                      <h3 className="text-base font-black text-white mt-1">{quickItemModal.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickItemModal(null)}
                      className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-xl text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="bg-[#060b17] border border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-3xl font-black text-white font-mono">
                      {quickQty || '0'}
                    </span>
                    <span className="ml-2 text-xs font-bold text-slate-400">
                      {quickItemModal.unit}
                    </span>
                  </div>

     {/* Хэрэв ОРЛОГО бол: Үнэ бичих ба Үнийн өсөлтийг бодитоор харуулах */}
                  {kioskMode === 'purchase' && (
                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Нийт төлсөн үнэ (₮):</label>
                        <input
                          type="number"
                          value={purchaseCost}
                          onChange={(e) => setPurchaseCost(e.target.value)}
                          placeholder="Төлсөн нийт үнийг бичнэ үү..."
                          className="w-full bg-[#060b17] border border-slate-800 rounded-xl p-2.5 text-center text-xs text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* 🚨 ШУУД ҮНИЙН ӨСӨЛТ/БУУРАЛТЫГ ТООЦОЖ ХАРУУЛАХ БАДЖ */}
                      {(() => {
                        const qtyNum = parseFloat(quickQty) || 0;
                        const costNum = parseFloat(purchaseCost) || 0;
                        const oldPrice = parseFloat(quickItemModal.unit_price) || 0;
                        if (qtyNum > 0 && costNum > 0 && oldPrice > 0) {
                          const currentUnitPrice = Math.round(costNum / qtyNum);
                          const diff = currentUnitPrice - oldPrice;
                          const pct = Math.round((diff / oldPrice) * 100);

                          if (diff > 0) {
                            return (
                              <div className="bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl text-center animate-pulse">
                                <span className="text-[11px] font-black text-rose-400">
                                  🔺 ҮНЭ ӨССӨН БАЙНА: {oldPrice.toLocaleString()}₮ ➔ {currentUnitPrice.toLocaleString()}₮ (+{pct}%)
                                </span>
                              </div>
                            );
                          } else if (diff < 0) {
                            return (
                              <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl text-center">
                                <span className="text-[11px] font-black text-emerald-400">
                                  🟢 ҮНЭ ХЯМДАРСАН: {oldPrice.toLocaleString()}₮ ➔ {currentUnitPrice.toLocaleString()}₮ ({pct}%)
                                </span>
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}

                      {/* 📸 ЭНД ЗУРГИЙГ ЗААВАЛ ДАРУУЛНА */}
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            id="single-pur-cam"
                            className="hidden"
                            onChange={(e) => { if (e.target.files?.[0]) setNoEbarimtFile(e.target.files[0]); }}
                          />
                          <label
                            htmlFor="single-pur-cam"
                            className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-500 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-slate-300 transition"
                          >
                            <Camera className="h-4 w-4 text-emerald-400" />
                            <span>Камер</span>
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            id="single-pur-gallery"
                            className="hidden"
                            onChange={(e) => { if (e.target.files?.[0]) setNoEbarimtFile(e.target.files[0]); }}
                          />
                          <label
                            htmlFor="single-pur-gallery"
                            className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-500 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-slate-300 transition"
                          >
                            <span>🖼️ Цомог</span>
                          </label>
                        </div>

                        <p className={`text-[10px] font-bold text-center ${noEbarimtFile ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                          {noEbarimtFile ? `✅ Зураг бэлэн: ${noEbarimtFile.name.substring(0, 15)}...` : '⚠️ Баримт эсвэл барааны зургийг заавал хийнэ үү!'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setQuickQty((prev) => prev + digit)}
                        className="bg-[#0b1329] hover:bg-slate-800 active:scale-95 text-white font-black text-xl py-3 rounded-2xl border border-slate-800 transition"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuickQty((prev) => prev.slice(0, -1))}
                      className="bg-rose-500/10 text-rose-400 font-bold text-sm py-3 rounded-2xl border border-rose-500/20 transition active:scale-95 flex items-center justify-center"
                    >
                      ← Засах
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={
                      !quickQty || 
                      parseFloat(quickQty) <= 0 || 
                      (kioskMode === 'purchase' && !noEbarimtFile) || // 🔒 Зураггүй бол дарагдахгүй!
                      isAiLoading
                    }
               onClick={() => {
                    const qtyNum = parseFloat(quickQty);
                    const finalQty = kioskMode === 'purchase' ? Math.abs(qtyNum) : -Math.abs(qtyNum);
                    const costVal = parseFloat(purchaseCost) || 0;
                    const itemToSave = quickItemModal;
                    const fileToUpload = noEbarimtFile;
                    const payMethod = purchasePayMethod;

                    // ⚡ 1. ЦОНХ ТЭР ДОРОО ХААГДАНА (0 миллисекунд!)
                    setQuickItemModal(null);
                    setQuickQty('');
                    setPurchaseCost('');
                    setNoEbarimtFile(null);

                      // ⚡ 2. БАРИСТАД ШУУД БҮРТГЭГДСЭН МЭДЭЭ БАЙНГА ХАРАГДАНА
                      const modeLabel = kioskMode === 'spoilage' ? 'Хаягдал' : kioskMode === 'staff_meal' ? 'Хоол' : kioskMode === 'testing' ? 'Туршилт' : 'Орлого';
                      setRecentToast({
                        id: 'temp-' + Date.now(),
                        text: `⚡ ${itemToSave.name}: ${qtyNum} ${itemToSave.unit} (${modeLabel})`
                      });

                      // ⚡ 3. ЗУРАГ БА ДАТАГ ЦААНА НЬ ЧИМЭЭГҮЙ ХАДГАЛАХ (Background Worker)
                      (async () => {
                        try {
                          let uploadedUrl = null;
                          if (kioskMode === 'purchase' && fileToUpload) {
                            uploadedUrl = await uploadEvidencePhoto(fileToUpload, 'purchases_proofs');
                          }

                          const { data: newLog, error } = await supabase.from('inventory_logs').insert([{
                            client_id: tenantClientId,
                            ingredient_id: itemToSave.id,
                            quantity: finalQty,
                            total_cost: costVal,
                            type: kioskMode,
                            payment_method: kioskMode === 'purchase' ? payMethod : 'bank',
                            image_url: uploadedUrl,
                            is_ebarimt: false,
                            notes: `Kiosk 2-Tap (${kioskMode})`,
                            worker_name: activeShift?.character_role || selectedWorker?.full_name,
                            date: new Date().toISOString()
                          }]).select().single();

                          if (!error && newLog) {
                            // Баазаас жинхэнэ ID ирмэгц Undo товчийг жинхэнэ болгож шинэчлэх
                            setRecentToast({
                              id: newLog.id,
                              text: `✅ ${itemToSave.name}: ${qtyNum} ${itemToSave.unit} (${modeLabel})`
                            });
                            fetchKioskData(tenantClientId); // Баазыг ард нь сэргээнэ
                          }
                        } catch (err) {
                          console.error("Background save failed:", err);
                        }
                      })();
                    }}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-3.5 rounded-2xl text-sm transition shadow-lg active:scale-95"
                  >
                    {isAiLoading ? 'Хадгалж байна...' : (kioskMode === 'purchase' && !noEbarimtFile) ? '📸 ЗУРГАА ДАРЖ БАТАЛГААЖУУЛНА УУ' : 'БАТЛАХ (OK)'}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
    {/* 2. ТАНЫ ХОЁР ДАХЬ ЦОНХ: E-BARIMT ШАЛГАХ БИЕ ДААСАН МОДАЛ    */}
    {/* ========================================================= */}
    {/* ========================================================================= */}
            {/* 🧾 E-BARIMT ШАЛГАХ, ЗАСАХ, БАТЛАХ & БУЦААХ (UNDO) МОДАЛ */}
            {/* ========================================================================= */}
            {ebarimtReview && (
              <div
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
                onClick={() => setEbarimtReview(null)}
              >
                <div
                  className="bg-[#0d1527] border border-slate-700 rounded-3xl p-4 w-full max-w-md shadow-2xl space-y-3 max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Толгой хэсэг */}
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-1.5">
                        <span>🧾 E-Barimt Шалгах</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">AI-ийн таньсан тоо, үнийг шалгаж засна уу</p>
                    </div>
                    {/* ЦУЦЛАХ ТОВЧ (Баазад юу ч хадгалагдахгүй, цэвэрхэн хаагдана) */}
                    <button
                      type="button"
                      onClick={() => setEbarimtReview(null)}
                      className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-xl text-xs font-bold text-slate-300"
                    >
                      ✕ Цуцлах
                    </button>
                  </div>

                  {/* Эх баримтын зургийн thumbnail */}
                  <div className="flex items-center gap-3 bg-[#060b17] p-2.5 rounded-2xl border border-slate-800 shrink-0">
                    <img
                      src={ebarimtReview.previewUrl}
                      alt="Receipt"
                      className="h-12 w-12 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                    <div className="text-[11px]">
                      <span className="text-emerald-400 font-bold block">📸 Баримтын эх зураг бэлэн</span>
                      <span className="text-slate-400">Нийт {ebarimtReview.items.length} бараа илэрсэн</span>
                    </div>
                  </div>

                  {/* Төлбөрийн хэлбэр сонгох */}
                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEbarimtReview({ ...ebarimtReview, payMethod: 'bank' })}
                      className={`py-1.5 rounded-xl text-xs font-bold transition ${
                        ebarimtReview.payMethod === 'bank' ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#060b17] text-slate-400'
                      }`}
                    >
                      💳 Банк / Дансаар
                    </button>
                    <button
                      type="button"
                      onClick={() => setEbarimtReview({ ...ebarimtReview, payMethod: 'cash' })}
                      className={`py-1.5 rounded-xl text-xs font-bold transition ${
                        ebarimtReview.payMethod === 'cash' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'bg-[#060b17] text-slate-400'
                      }`}
                    >
                      💵 Кассын бэлнээр
                    </button>
                  </div>

                  {/* ✏️ ТАНЬСАН БАРААНУУДЫН ЖАГСААЛТ (ШУУД ЗАСАХ БОЛОМЖТОЙ) */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/80">
                    {ebarimtReview.items.map((item, idx) => (
                      <div key={idx} className="pt-2 flex justify-between items-center gap-2 text-xs">
                        {/* Буруу уншсан барааг устгах [✕] товч */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = ebarimtReview.items.filter((_, i) => i !== idx);
                            setEbarimtReview({ ...ebarimtReview, items: updated });
                          }}
                          className="text-rose-400 hover:text-rose-300 font-black p-1 text-sm shrink-0"
                          title="Энэ барааг хасах"
                        >
                          ✕
                        </button>

                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-white block truncate">{item.item_name}</span>
                          {/* Нийт үнийг засах input */}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-500">Үнэ:</span>
                            <input
                              type="number"
                              value={item.total_cost || ''}
                              onChange={(e) => {
                                const newCost = parseFloat(e.target.value) || 0;
                                const updated = [...ebarimtReview.items];
                                updated[idx].total_cost = newCost;
                                setEbarimtReview({ ...ebarimtReview, items: updated });
                              }}
                              className="w-20 bg-[#060b17] border border-slate-800 rounded px-1 py-0.5 text-emerald-400 font-mono text-[11px] outline-none"
                            />
                            <span className="text-[10px] text-slate-500">₮</span>
                          </div>
                        </div>

                        {/* Тоо ширхэгийг засах input */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-500">Тоо:</span>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => {
                              const newQty = parseFloat(e.target.value) || 0;
                              const updated = [...ebarimtReview.items];
                              updated[idx].quantity = newQty;
                              setEbarimtReview({ ...ebarimtReview, items: updated });
                            }}
                            className="w-14 bg-[#060b17] border border-slate-700 rounded-lg py-1 text-center text-white font-bold text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Нийт дүн */}
                  <div className="bg-[#060b17] p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs shrink-0">
                    <span className="text-slate-400 font-medium">Нийт баримтын дүн:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {ebarimtReview.items.reduce((sum, it) => sum + (it.total_cost || 0), 0).toLocaleString()} ₮
                    </span>
                  </div>

                  {/* ✅ БАТЛАХ ТОВЧ (ДАРСНЫ ДАРАА САЯ БААЗАД ОРЖ, UNDO БОЛОМЖТОЙ БОЛНО) */}
                  <button
                    type="button"
                    disabled={isAiLoading || ebarimtReview.items.length === 0}
                    onClick={() => {
                      const reviewData = ebarimtReview;

                      // ⚡ 1. ЦОНХ ТЭР ДОРОО АЛГА БОЛНО (0 миллисекунд!)
                      setEbarimtReview(null);

                      // ⚡ 2. ДЭЭД ТАЛД TOAST МЭДЭЭЛЭЛ ШУУД ГАРНА
                      setRecentToast({
                        id: 'temp-' + Date.now(),
                        text: `⚡ ${reviewData.items.length} бараа E-Barimt-аар хадгалагдаж байна...`
                      });

                      // ⚡ 3. ЗУРАГ БА ЛОГИЙГ ЦААНА НЬ ЧИМЭЭГҮЙ ХАДГАЛАХ
                      (async () => {
                        try {
                          const uploadedImgUrl = await uploadEvidencePhoto(reviewData.file, 'receipts_evidence');

                          const logsToInsert = reviewData.items.map((it) => {
                            const matchedIng = ingredients.find(
                              (ing) => ing.name.toLowerCase().trim() === it.item_name.toLowerCase().trim()
                            );
                            return {
                              client_id: tenantClientId,
                              ingredient_id: matchedIng ? matchedIng.id : null,
                              non_food_item: matchedIng ? null : it.item_name,
                              quantity: Math.abs(it.quantity),
                              total_cost: it.total_cost || 0,
                              type: 'purchase',
                              payment_method: reviewData.payMethod,
                              image_url: uploadedImgUrl,
                              is_ebarimt: true,
                              notes: 'E-Barimt Баталгаажсан татан авалт',
                              worker_name: activeShift?.character_role || selectedWorker.full_name,
                              date: new Date().toISOString()
                            };
                          });

                          const { data: insertedData } = await supabase
                            .from('inventory_logs')
                            .insert(logsToInsert)
                            .select('id');

                          const insertedIds = (insertedData || []).map((d: any) => d.id);
                          setRecentToast({
                            id: insertedIds[0] || 'bulk',
                            text: `✅ ${logsToInsert.length} бараа E-Barimt-аар орлогод орлоо.`
                          });

                          fetchKioskData(tenantClientId);
                              } catch (e) {
                                console.error("E-barimt save error:", e);
                              }
                            })();
                          }}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-3 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95 shrink-0"
                  >
                    {isAiLoading ? 'Баазад хадгалж байна...' : '✅ ШАЛГААД БҮГДИЙГ БАТЛАХ'}
                  </button>
                </div>
              </div>
            )}
                {/* ========================================================================= */}
    {/* 5. 👉 ЭНД ТАНЫ showAddNewItemModal (ШИНЭ БАРАА ҮҮСГЭХ) ЦОНХ БАЙРЛАНА:       */}
    {/* ========================================================================= */}
    {showAddNewItemModal && (
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
        onClick={() => setShowAddNewItemModal(false)}
      >
        <div
          className="bg-[#0d1527] border border-slate-700 rounded-3xl p-4 w-full max-w-sm shadow-2xl space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                Шинэ бараа үүсгэх
              </span>
              <h3 className="text-base font-black text-white mt-1">{newItemName}</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddNewItemModal(false)}
              className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-xl text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Нэгж сонгох: мл, гр, ш */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Хэмжих нэгж:</label>
            <div className="grid grid-cols-3 gap-1.5 bg-[#060b17] p-1 rounded-xl border border-slate-800">
              {['ш', 'мл', 'гр'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setNewItemUnit(u)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    newItemUnit === u ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Тоо хэмжээ ба Нийт үнэ */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Авсан тоо:</label>
              <input
                type="number"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                placeholder="Жишээ: 5"
                className="w-full bg-[#060b17] border border-slate-800 rounded-xl p-2.5 text-center text-xs text-white font-bold outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Нийт үнэ (₮):</label>
              <input
                type="number"
                value={newItemCost}
                onChange={(e) => setNewItemCost(e.target.value)}
                placeholder="Жишээ: 25000"
                className="w-full bg-[#060b17] border border-slate-800 rounded-xl p-2.5 text-center text-xs text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 📸 Зураг заавал шаардах хэсэг */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">Шинэ барааны зураг (Заавал):</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="new-item-cam"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) setNewItemFile(e.target.files[0]); }}
              />
              <label
                htmlFor="new-item-cam"
                className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-500 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-slate-300 transition"
              >
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>Камер</span>
              </label>

              <input
                type="file"
                accept="image/*"
                id="new-item-gallery"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) setNewItemFile(e.target.files[0]); }}
              />
              <label
                htmlFor="new-item-gallery"
                className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-500 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-slate-300 transition"
              >
                <span>🖼️ Цомог</span>
              </label>
            </div>

            <p className={`text-[10px] font-bold text-center ${newItemFile ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
              {newItemFile ? `✅ Зураг бэлэн: ${newItemFile.name.substring(0, 15)}...` : '⚠️ Зургийг заавал дарна уу!'}
            </p>
          </div>

          {/* Батлах товч */}
          <button
            type="button"
            disabled={!newItemQty || !newItemCost || !newItemFile || isAiLoading}
            onClick={async () => {
              const qty = parseFloat(newItemQty);
              const cost = parseFloat(newItemCost);
              const unitPrice = qty > 0 ? Math.round(cost / qty) : 0;
              setIsAiLoading(true);

              const uploadedUrl = await uploadEvidencePhoto(newItemFile!, 'new_items');

              const { data: createdIng, error: ingErr } = await supabase.from('ingredients').insert([{
                client_id: tenantClientId,
                name: newItemName,
                unit: newItemUnit,
                unit_price: unitPrice,
                current_stock: qty
              }]).select().single();

              if (ingErr || !createdIng) {
                alert("Шинэ бараа үүсгэж чадсангүй.");
                setIsAiLoading(false);
                return;
              }

              const { data: newLog } = await supabase.from('inventory_logs').insert([{
                client_id: tenantClientId,
                ingredient_id: createdIng.id,
                quantity: qty,
                total_cost: cost,
                type: 'purchase',
                payment_method: 'bank',
                image_url: uploadedUrl,
                is_ebarimt: false,
                notes: 'Kiosk дээр шинээр үүсгэж орлого авсан',
                worker_name: activeShift?.character_role || selectedWorker.full_name,
                date: new Date().toISOString()
              }]).select().single();

              setIsAiLoading(false);
              setShowAddNewItemModal(false);
              setKioskSearch('');

              setRecentToast({
                id: newLog?.id,
                text: `✅ Шинэ бараа орлогод орлоо: ${newItemName} (${qty} ${newItemUnit})`
              });
              await fetchKioskData(tenantClientId);
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-3 rounded-2xl text-xs transition shadow-lg active:scale-95"
          >
            {isAiLoading ? 'Үүсгэж байна...' : !newItemFile ? '📸 ЗУРАГ ОРУУЛНА УУ' : 'ШИНЭ БАРААГ БАТЛАХ'}
          </button>
        </div>
      </div>
    )}

            {/* ========================================================================= */}
            {/* 📸 БАРИМТЫГ УНШИЖ БАЙГААГ МЭДЭГДЭХ ТОМ ХӨДӨЛГӨӨНТ ЦОНХ */}
            {/* ========================================================================= */}
            {isScanningReceipt && (
              <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none">
                <div className="bg-[#0d1527] border border-slate-700 p-8 rounded-3xl max-w-xs w-full text-center shadow-2xl space-y-4">
                  
                  {/* Лугших хөдөлгөөнт лого */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="relative bg-emerald-500/20 p-5 rounded-full border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <Camera className="h-8 w-8 text-emerald-400 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">AI Баримтыг Уншиж Байна...</h3>
                    <p className="text-xs text-slate-400 mt-1">Түр хүлээнэ үү. Бараа, тоо, үнийг ялгаж байна.</p>
                  </div>

                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                </div>
              </div>
            )}


          </div>
        )}

        {/* 5. AI CHAT INTERFACE */}
        {step === 'ai_chat' && (
          <KioskAiChatSection 
            selectedWorker={selectedWorker} 
            activeShift={activeShift} 
            ingredients={ingredients}
            learnedAliases={learnedAliases}
            onBack={() => setStep('menu')} 
          />
        )}

        {/* 6. DAILY TASKS */}
        {step === 'tasks' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <h2 className="text-lg sm:text-xl font-black text-purple-400 mb-2 flex items-center gap-2 shrink-0">
              <CheckSquare className="h-5 w-5" /> Өнөөдрийн Даалгавар (SOP)
            </h2>

            {tasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm my-auto">Өнөөдөр хийх даалгавар байхгүй байна.</p>
            ) : (
              <div className="space-y-2 py-2 flex-1 overflow-y-auto overscroll-contain pr-1">
                {tasks.map((t, idx) => (
                  <button
                    key={idx}
                    disabled={t.done}
                    onClick={() => completeTask(idx)}
                    className={`w-full p-3.5 rounded-xl flex items-center justify-between border transition active:scale-95 ${
                      t.done 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-60' 
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.done ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-lg border-2 border-slate-600 shrink-0" />
                      )}
                      <span className="font-bold text-sm text-left">{t.name}</span>
                    </div>
                    {t.done && <span className="text-xs font-black text-emerald-400 shrink-0">Хийсэн ✅</span>}
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={() => setStep('menu')} 
              className="w-full mt-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-3 rounded-xl text-xs transition shrink-0 active:scale-95"
            >
              ← Буцах
            </button>
          </div>
        )}

        {/* 7. INCIDENT REPORTING */}
        {step === 'incident_report' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="shrink-0 mb-3">
              <h2 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Өмнөх Ээлжийн Алдагдал Бүртгэх
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Өмнөх ээлжийн ажилтны хаягдал эсвэл гэмтсэн барааг менежерт тайлагнана
              </p>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  1. Өмнөх ээлжинд ажилласан ажилтан
                </label>
                <select 
                  value={incidentWorker}
                  onChange={e => setIncidentWorker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="">-- Ажилтан сонгох --</option>
                  {workers.filter(w => w.id !== selectedWorker?.id).map(w => (
                    <option key={w.id} value={w.full_name || w.email.split('@')[0]}>
                      {w.full_name || w.email.split('@')[0]} ({w.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  2. Алдагдсан / Муудсан түүхий эд
                </label>
                <select 
                  required
                  value={incidentItem}
                  onChange={e => setIncidentItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="">-- Түүхий эд сонгох --</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  3. Алдагдсан тоо хэмжээ
                </label>
                <input 
                  type="number" 
                  step="any" 
                  required
                  value={incidentQty}
                  onChange={e => setIncidentQty(e.target.value)}
                  placeholder="Тоо оруулна уу (жнь: 2)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  4. Нотлох зураг авах (Evidence Photo)
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  id="incident-camera-input" 
                  className="hidden" 
                  onChange={e => { if (e.target.files?.[0]) setIncidentFile(e.target.files[0]); }}
                />
                <label 
                  htmlFor="incident-camera-input" 
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:border-amber-500 transition"
                >
                  <Camera className="h-4 w-4 text-amber-400" />
                  <span>{incidentFile ? `✅ ${incidentFile.name.substring(0, 18)}...` : "Зураг дарах"}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  5. Тайлбар
                </label>
                <input 
                  type="text" 
                  value={incidentNote}
                  onChange={e => setIncidentNote(e.target.value)}
                  placeholder="Жишээ: Шөнө хөргөгчний хаалга дутуу хаагдсан..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setStep('menu')} 
                  className="flex-1 bg-slate-950 border border-slate-800 py-3 rounded-xl text-xs font-bold text-slate-300"
                >
                  Буцах
                </button>
                <button 
                  type="submit" 
                  disabled={isAiLoading}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition"
                >
                  {isAiLoading ? "Хадгалж байна..." : "Бүртгэх"}
                </button>
              </div>
            </form>
          </div>
        )}
{/* 8. CLOSE SHIFT & POS Z-REPORT */}
        {step === 'close_shift' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="shrink-0 mb-2">
              <h2 className="text-lg sm:text-xl font-black text-emerald-400 mb-0.5 flex items-center gap-2">
                <ListOrdered className="h-5 w-5" /> Ээлжийн Тооллого & Z-Тайлан
              </h2>
              <p className="text-xs text-slate-400">Хөргөгч/лангуун дахь үлдэгдлийг тоолж, Z-тайлангийн зураг оруулна уу.</p>
            </div>
            
            <div className="space-y-2 py-1 flex-1 overflow-y-auto overscroll-contain pr-1">
              {/* POS Z-REPORT UPLOAD */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-2">
                <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  🧾 ПОС-ын Z-Тайлангийн зураг (End-of-day Z-Report)
                </p>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  id="pos-z-camera" 
                  className="hidden" 
                  onChange={e => { if (e.target.files?.[0]) setPosZFile(e.target.files[0]); }}
                />
                <label 
                  htmlFor="pos-z-camera" 
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-emerald-400 hover:border-emerald-500 transition"
                >
                  <Camera className="h-4 w-4" />
                  <span>{posZFile ? `✅ ${posZFile.name.substring(0, 20)}...` : "Z-Тайлангийн зураг дарах"}</span>
                </label>
              </div>

              {/* 💵 ШИНЭ: КАССЫН БЭЛЭН МӨНГӨНИЙ БОДИТ ТООЛЛОГО */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-2">
                <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  💵 Кассанд байгаа бэлэн мөнгө (Тоолсон дүн)
                </p>
                <div className="relative">
                  <input
                    type="number"
                    value={actualCashDrawer}
                    onChange={(e) => setActualCashDrawer(e.target.value)}
                    placeholder="Кассын шүүгээнд яг хэдэн төгрөг байна вэ? (Байхгүй бол 0)"
                    className="w-full bg-[#060b17] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-mono font-black outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₮</span>
                </div>
              </div>

              {/* PARETO 80/20 CYCLE COUNT ITEMS */}
              {inventoryToCount.map(item => {
                const stock = parseFloat(item.current_stock ?? item.live_stock ?? 0);
                const par = parseFloat(item.par_level ?? 0);
                const isUrgent = par > 0 && stock <= par;

                return (
                  <div key={item.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-sm text-white">{item.name}</p>
                        
                        {/* 🏷️ ПАЙЗНУУД */}
                        {isUrgent ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-black animate-pulse">
                            🚨 Яаралтай (Нөөц бага)
                          </span>
                        ) : item.todayUsage > 0 ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black">
                            ⚡ Өдрийн эргэлт ({Math.round(item.moneyMoved || 0).toLocaleString()}₮)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                            🔄 Сар бүрийн цикл
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Тоолох нэгж: <strong className="text-slate-300 font-bold">{item.unit}</strong>
                      </p>
                    </div>

                    <input 
                      type="number" 
                      step="any" 
                      required 
                      placeholder="Тоо..." 
                      value={counts[item.id] !== undefined ? counts[item.id] : ''} 
                      onChange={e => setCounts({...counts, [item.id]: e.target.value})} 
                      className="w-24 h-10 bg-slate-900 px-3 rounded-xl text-center text-white border border-slate-700 font-bold text-base focus:border-emerald-500 outline-none" 
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 mt-2.5 shrink-0">
              <button 
                type="button" 
                onClick={() => setStep('menu')} 
                className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs transition active:scale-95"
              >
                Буцах
              </button>
              
              {/* 🔒 ЗӨВХӨН ЭНЭ ТОВЧ ДЭЭР Z-ТАЙЛАН БА КАССЫН БЭЛЭН МӨНГӨНИЙ ШАЛГАЛТ НЭМЭГДСЭН: */}
              <button 
                type="button"
                onClick={handleCloseShift} 
                disabled={
                  isAiLoading || 
                  inventoryToCount.some(i => counts[i.id] === undefined || counts[i.id].toString().trim() === '') ||
                  !posZFile ||                     // 👈 Z-Тайлангийн зураггүй бол цоожтой
                  actualCashDrawer.trim() === ''   // 👈 Кассын мөнгө хоосон бол цоожтой (0 байвал зөвшөөрнө)
                } 
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black py-3 rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {isAiLoading 
                  ? 'Хааж байна...' 
                  : !posZFile 
                  ? '📸 Z-ТАЙЛАНГИЙН ЗУРАГ ДАРНА УУ' 
                  : actualCashDrawer.trim() === '' 
                  ? '💵 КАССЫН МӨНГӨӨ БИЧНЭ ҮҮ' 
                  : 'Хаах & Илгээх'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function Page() {
  return <KioskPage />;
}