"use client";
import React, { useState, useEffect, useRef } from "react";
import { kioskBootstrap, kioskOps, kioskSaveLogs, kioskTokens } from "../../lib/kioskClient";
import {
  Coffee,
  CheckCircle,
  Users,
  LogOut,
  Camera,
  MessageSquare,
  CheckSquare,
  ListOrdered,
  Send,
  ShieldAlert,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Sparkles,
  Check,
  X,
  BookOpen,
  PlusCircle,
  Trash2,
  Utensils,
  Beaker,
  Package,
  DollarSign,
  Image as ImageIcon,
  Wallet,
  Banknote,
  Crown,
  Receipt,
  ShoppingCart,
  ChefHat,
  Smartphone,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EN_TO_MN_DICT, STATIC_DICT } from "../../lib/autoReconcile";
import { SignedImg } from "../../components/shared/SignedImg";
// =========================================================================
// 🇲🇳 1. КИРИЛЛ ТООГ ЦИФР БОЛГОХ
// =========================================================================
const MN_NUMBERS = [
  { w: "нэг зуун", v: 100 },
  { w: "хоёр зуун", v: 200 },
  { w: "гурван зуун", v: 300 },
  { w: "арван есөн", v: 19 },
  { w: "арван ес", v: 19 },
  { w: "арван найман", v: 18 },
  { w: "арван найм", v: 18 },
  { w: "арван долоон", v: 17 },
  { w: "арван долоо", v: 17 },
  { w: "арван зургаан", v: 16 },
  { w: "арван зургаа", v: 16 },
  { w: "арван таван", v: 15 },
  { w: "арван тав", v: 15 },
  { w: "арван дөрвөн", v: 14 },
  { w: "арван дөрөв", v: 14 },
  { w: "арван гурван", v: 13 },
  { w: "арван гурав", v: 13 },
  { w: "арван хоёр", v: 12 },
  { w: "арван нэгэн", v: 11 },
  { w: "арван нэг", v: 11 },
  { w: "арван", v: 10 },
  { w: "арав", v: 10 },
  { w: "хорин", v: 20 },
  { w: "хорь", v: 20 },
  { w: "гучин", v: 30 },
  { w: "гуч", v: 30 },
  { w: "дөчин", v: 40 },
  { w: "дөч", v: 40 },
  { w: "тавин", v: 50 },
  { w: "тавь", v: 50 },
  { w: "жаран", v: 60 },
  { w: "жар", v: 60 },
  { w: "далан", v: 70 },
  { w: "дал", v: 70 },
  { w: "наян", v: 80 },
  { w: "ная", v: 80 },
  { w: "ерэн", v: 90 },
  { w: "ер", v: 90 },
  { w: "нэгэн", v: 1 },
  { w: "нэг", v: 1 },
  { w: "ганц", v: 1 },
  { w: "хоёр", v: 2 },
  { w: "гурав", v: 3 },
  { w: "дөрвөн", v: 4 },
  { w: "дөрөв", v: 4 },
  { w: "таван", v: 5 },
  { w: "тав", v: 5 },
  { w: "зургаан", v: 6 },
  { w: "зургаа", v: 6 },
  { w: "долоон", v: 7 },
  { w: "долоо", v: 7 },
  { w: "найман", v: 8 },
  { w: "найм", v: 8 },
  { w: "есөн", v: 9 },
  { w: "ес", v: 9 },
  { w: "хагас", v: 0.5 },
  { w: "тал", v: 0.5 },
];

// =========================================================================
// 🚀 3. АЯНГА ШИГ ХУРДАН ОНООНЫ МАШИН + АВТОМАТ СУРАЛЦАХ СИСТЕМ
// =========================================================================
function advancedMongolianVoiceParser(
  rawText: string,
  ingredients: any[],
  learnedAliases: { phrase: string; ingredient_id: string }[] = [],
) {
  let text = rawText.toLowerCase().trim();

  // 1. Амаар хэлсэн тоог цифр болгох
  for (const { w, v } of MN_NUMBERS) {
    const reg = new RegExp(`(^|[\\s,.:;!?])${w}(?=[\\s,.:;!?]|$)`, "gi");
    text = text.replace(reg, `$1${v} `);
  }

  // 2. Тоо ба нэгжийг ялгах
  const numMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(л|литр|l|мл|ml|кг|kg|гр|грамм|gram|ш|ширхэг|хайрцаг|уут|багц|сав)?/,
  );
  if (!numMatch) return null;

  let qty = parseFloat(numMatch[1]);
  const unitStr = numMatch[2] || "";
  if (["л", "литр", "l", "кг", "kg"].includes(unitStr)) {
    qty *= 1000;
  }

  // 3. Үйлдлийг язгуураар нь таних
  let type: "spoilage" | "purchase" | "staff_meal" | "testing" | null = null;
  if (/асг|мууд|гаш|хая|цуц|хагар|уна|дуус|эвд|алд|урс|түлс/.test(text))
    type = "spoilage";
  else if (/ава|авс|татан|ирл|нэм|худалд|оруул|авчир/.test(text))
    type = "purchase";
  else if (/хоол|идс|уус|ажилчдын|цайны/.test(text)) type = "staff_meal";
  else if (/турш|амт|шалга/.test(text)) type = "testing";

  if (!type) return null;

  // 4. 🧠 FEEDBACK LOOP: Өмнө нь Gemini-аас суралцсан үгсийг хамгийн түрүүнд шалгах! (0.001ms)
  for (const alias of learnedAliases) {
    if (text.includes(alias.phrase.toLowerCase().trim())) {
      const matched = ingredients.find((i) => i.id === alias.ingredient_id);
      if (matched) {
        return {
          is_transaction: true,
          success: true,
          item_id: matched.id,
          item_name: matched.name,
          unit: matched.unit,
          quantity: type === "purchase" ? Math.abs(qty) : -Math.abs(qty),
          type: type,
          notes: `${rawText} (🧠 Суралцсан үг)`,
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
          const safeReg = new RegExp(
            `(^|[\\s,.:;!?])${syn}(?=[\\s,.:;!?]|$)`,
            "i",
          );
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
    quantity: type === "purchase" ? Math.abs(qty) : -Math.abs(qty),
    type: type,
    notes: `${rawText} (⚡ Local Parser)`,
  };
}

// ⚡ Зургийг 10 дахин хөнгөн болгож шахах функц
async function compressImageForUpload(
  file: File,
): Promise<{ file: File; base64: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 850;
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
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, width, height);

        const base64Url = canvas.toDataURL("image/jpeg", 0.6);
        const cleanBase64 = base64Url.split(",")[1];
        canvas.toBlob(
          (blob) => {
            const compressedFile = blob
              ? new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                })
              : file;
            resolve({ file: compressedFile, base64: cleanBase64 });
          },
          "image/jpeg",
          0.75,
        );
      };
      img.onerror = () => resolve({ file, base64: "" });
    };
    reader.onerror = () => resolve({ file, base64: "" });
  });
}

// =========================================================================
// 📸 2. UPLOAD EVIDENCE PHOTO TO SUPABASE STORAGE
// =========================================================================
async function uploadEvidencePhoto(
  file: File,
  folder: string = "logs",
): Promise<string | null> {
  try {
    const { file: compressedFile } = await compressImageForUpload(file);
    const deviceToken =
      typeof window !== "undefined"
        ? localStorage.getItem("kiosk_device_token") || ""
        : "";
    if (!deviceToken) return null;
    const form = new FormData();
    form.append("deviceToken", deviceToken);
    form.append("folder", folder);
    form.append("file", compressedFile);
    const res = await fetch("/api/kiosk/upload", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.path) return null;
    return json.path as string;
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
  onBack,
}: {
  selectedWorker: any;
  activeShift: any;
  ingredients: any[];
  learnedAliases?: any[];
  onBack: () => void;
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { sender: "worker" | "ai"; text: string; logId?: string }[]
  >([]);
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
    { label: "500мл Сүү", text: "500 мл сүү асгарсан" },
    { label: "1л Сүү", text: "1 литр сүү асгарсан" },
    { label: " 18г Кофе", text: "18 грамм кофе асгарсан" },
    { label: " 1ш Өндөг", text: "1 ширхэг өндөг хагарсан" },
    { label: "1ш Талх", text: "1 ширхэг талх муудсан" },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [chatHistory, isAiLoading]);

  // 📱 ТӨХӨӨРӨМЖ ТАНИГЧ: iOS (iPhone/iPad) мөн эсэхийг шалгах
  const isAppleDevice = () => {
    if (typeof window === "undefined") return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  };

  // ❌ INSTANT CANCEL & RESET: Aborts network fetch and removes ghost bubbles
  const cancelVoiceRecording = () => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort(); // ⚡ Kills any in-flight request!

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.onstop = null; // Do not send to API!
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }

    setIsListening(false);
    setIsAiLoading(false);

    // ⚡ Erase the temporary "sending..." bubble so the screen looks clean
    setChatHistory((prev) => {
      const updated = [...prev];
      if (
        updated.length > 0 &&
        updated[updated.length - 1].text.includes("Дуут бүртгэл илгээж байна")
      ) {
        updated.pop();
      }
      return updated;
    });
  };
  // 🎙️ УХААЛАГ ДУУТ БҮРТГЭЛ (Android ба Apple хоёуланг нь бүрэн агуулсан)
  const startVoiceRecording = async () => {
    // ⚡ 1. If already listening, tap to stop immediately
    if (isListening) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
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
        alert(
          "iPad/iOS дээр дуу бичихийн тулд заавал HTTPS эсвэл localhost байх шаардлагатай.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        let chosenMime = "audio/webm";
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          chosenMime = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          chosenMime = "audio/mp4";
        }

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: chosenMime,
        });
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
            stream.getTracks().forEach((track) => track.stop());
          }, 100);

          if (audioChunks.length === 0 || isCancelledRef.current) {
            setIsAiLoading(false);
            return;
          }

          const cleanMime = chosenMime.split(";")[0];
          const ext = cleanMime.includes("webm") ? "webm" : "mp4";
          const audioBlob = new Blob(audioChunks, { type: cleanMime });

          const slangHints = (learnedAliases || [])
            .map((a) => a.phrase)
            .slice(0, 15)
            .join(", ");

          const formData = new FormData();
          formData.append("file", audioBlob, `audio.${ext}`);
          formData.append("mimeType", cleanMime); // ⚡ Sends real MIME so Gemini never crashes
          formData.append("slangHints", slangHints);

          try {
            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
              signal: abortControllerRef.current?.signal,
            });
            if (isCancelledRef.current) return;

            const data = await res.json();
            if (isCancelledRef.current) return;

            if (data.text && data.text.trim()) {
              handleAiChatSubmit(undefined, undefined, data.text.trim());
            } else {
              setIsAiLoading(false);
              setChatHistory((prev) => [
                ...prev,
                {
                  sender: "ai",
                  text: data.error
                    ? `${data.error}`
                    : "Дуу сонсогдсонгүй. Дахин тод ярина уу.",
                },
              ]);
            }
          } catch (err: any) {
            if (err.name === "AbortError" || isCancelledRef.current) return;
            setIsAiLoading(false);
            setChatHistory((prev) => [
              ...prev,
              {
                sender: "ai",
                text: `❌ Алдаа: ${err.message || "Сервертэй холбогдож чадсангүй."}`,
              },
            ]);
          }
        };

        mediaRecorder.start();

        setTimeout(() => {
          if (mediaRecorder.state === "recording") mediaRecorder.stop();
        }, 3500);
      } catch (err: any) {
        setIsListening(false);
        setIsAiLoading(false);
        alert("Микрофоны зөвшөөрөл өгнө үү: " + err.message);
      }
      return;
    }

    // 🤖 АЛХАМ 2: ХЭРЭВ ANDROID / CHROME БАЙВАЛ (Одоо буцаж орсон!)
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Энэ хөтөч дээр дуу таних боломжгүй байна.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "mn-MN";
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

  const handleAiChatSubmit = async (
    e?: React.FormEvent,
    file?: File,
    directText?: string,
  ) => {
    if (e) e.preventDefault();
    const textToProcess = directText || chatInput.trim();
    if (!textToProcess && !file) return;

    // ⚡ Optimistic Bubble: Хэрэглэгчийн бичсэн зүйл дэлгэцэнд 0 миллисекундэд шууд гарна!
    setChatHistory((prev) => [
      ...prev,
      {
        sender: "worker",
        text: file ? "Зураг илгээлээ (E-Barimt/Бараа)" : textToProcess,
      },
    ]);

    setChatInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsAiLoading(true);

    // 📶 ОФЛАЙН ГОРИМ ШАЛГАЛТ (Интернэт тасарсан бол LocalStorage-д хадгалах)
    if (!navigator.onLine && !file) {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Интернэт тасарсан тул бүртгэл хадгалагдаагүй. Сүлжээ ормогц дахин илгээнэ үү.",
        },
      ]);
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
              const canvas = document.createElement("canvas");
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
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.75).split(",")[1]);
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
      const localMatch = advancedMongolianVoiceParser(
        textToProcess,
        ingredients,
        learnedAliases,
      );
      if (localMatch && localMatch.success) {
        try {
          const saved = await kioskSaveLogs([
              {
                ingredient_id: localMatch.item_id,
                quantity: localMatch.quantity,
                type: localMatch.type,
                notes: localMatch.notes,
                input_unit: localMatch.unit,
              },
            ],
          );
          const newLogId = saved.ids?.[0];
          // 🧠 FEEDBACK LOOP: Clean numbers/units and save the spoken phrase to learned_aliases
          let cleanPhrase = textToProcess.toLowerCase();

          // 1. Remove spoken numbers
          for (const { w } of MN_NUMBERS) {
            cleanPhrase = cleanPhrase.replace(
              new RegExp(`(^|[\\s,.:;!?])${w}(?=[\\s,.:;!?]|$)`, "gi"),
              " ",
            );
          }

          // 2. Remove digits, units, and all verb conjugations
          cleanPhrase = cleanPhrase
            .replace(/[\d\.]+/g, "")
            .replace(
              /\b(литр|мл|кг|гр|грамм|грам|ш|ширхэг|хайрцаг|уут|сав|боодол)\b/gi,
              "",
            )
            .replace(
              /\b(асг|ав|мууд|гаш|хая|цуц|хагар|уна|дуус|эвд|алд|урс|түл)[а-яөү]*\b/gi,
              "",
            ) // ⚡ Strips "авав", "аву", "асгачихсан"
            .replace(/\s+/g, " ")
            .trim();

          const words = cleanPhrase.split(" ").filter((w) => w.length >= 2);
          const finalAlias = words.slice(0, 2).join(" "); // Keeps only the item noun

          if (finalAlias && finalAlias.length >= 2) {
            await kioskOps("alias.upsert", {
              phrase: finalAlias,
              ingredient_id: localMatch.item_id,
            });
          }

          setChatHistory((prev) => [
            ...prev,
            {
              sender: "ai",
              text: `Бүртгэгдлээ:\n• Бараа: **${localMatch.item_name}**\n• Хэмжээ: **${Math.abs(localMatch.quantity)} ${localMatch.unit}**`,
              logId: newLogId,
            },
          ]);
          setIsAiLoading(false);
          return;
        } catch (saveErr: any) {
          setChatHistory((prev) => [
            ...prev,
            { sender: "ai", text: `Хадгалж чадсангүй: ${saveErr.message}` },
          ]);
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

      const tokens = kioskTokens();
      const res = await fetch("/api/kiosk-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-device": tokens.deviceToken,
          "x-kiosk-worker": tokens.workerToken,
        },
        body: JSON.stringify({
          text: textToProcess,
          imageBase64: base64Data,
          imageUrl: uploadedImageUrl,
        }),
        signal: abortControllerRef.current.signal,
      });
      if (isCancelledRef.current) return; // ⚡ Exit instantly if canceled!

      const data = await res.json();
      if (isCancelledRef.current) return;

      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.message || "Гүйлгээ боловсруулагдлаа.",
          logId: data.log_id,
          learnedAliasId: data.learned_alias_id, // 👈 Баазад шинээр сурсан үгийн ID хадгалах
        },
      ]);
    } catch (err: any) {
      if (err.name === "AbortError" || isCancelledRef.current) return; // ⚡ Stay completely silent if user clicked cancel!
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `❌ Алдаа: ${err.message || "Сервертэй холбогдож чадсангүй."}`,
        },
      ]);
    } finally {
      if (!isCancelledRef.current) setIsAiLoading(false);
    }
  };

  // 2. handleUndo функцийг шинэчлэх (learnedAliasId хүлээн авдаг болгоно):
  const handleUndo = async (
    logId: string,
    index: number,
    learnedAliasId?: string,
  ) => {
    setIsAiLoading(true);
    try {
      // А. Агуулахын лог устгах
      await kioskOps("logs.delete", { id: logId, aliasId: learnedAliasId || null });

      const newHistory = [...chatHistory];
      newHistory[index] = {
        sender: "ai",
        text: "↩️ Бүртгэл цуцлагдаж, буруу таасан үгийг систем санах ойгоосоо устгалаа.",
      };
      setChatHistory(newHistory);
    } catch (err) {
      alert("Буцаах үйлдэл амжилтгүй.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl p-3 sm:p-4 overflow-hidden">
      {/* Дэд толгой */}
      <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-zinc-300" />
          <h2 className="font-bold text-zinc-300 text-sm sm:text-base">
            AI Туслах & Зарлага
          </h2>
          {!isOnline && (
            <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Офлайн
            </span>
          )}
        </div>
        <button
          onClick={onBack}
          className="bg-zinc-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-800 hover:bg-zinc-800 text-zinc-300 active:scale-95 transition"
        >
          ← Буцах
        </button>
      </div>

      {/* Мессежүүд гүйх талбар */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-3 overscroll-contain pr-1">
        {chatHistory.length === 0 && (
          <div className="text-center text-zinc-400 text-xs sm:text-sm mt-4 space-y-2">
            <div className="bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-700/20 w-fit mx-auto">
              <Mic className="h-7 w-7 text-zinc-300" />
            </div>
            <p className="font-black text-white text-base">
              Монголоор ярьж эсвэл зураг дарж бүртгэнэ үү
            </p>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Микрофон товчийг дараад <strong>"2 литр сүү асгарсан"</strong> гэж
              хэлэхэд л AI шууд ойлгоно!
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "worker" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "worker"
                  ? "bg-white text-zinc-950 rounded-tr-none font-medium shadow-md"
                  : "bg-zinc-900 text-zinc-100 rounded-tl-none border border-zinc-800/80 shadow-md"
              }`}
            >
              {msg.sender === "worker" ? (
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
                  onClick={() =>
                    handleUndo(msg.logId!, i, (msg as any).learnedAliasId)
                  }
                  className="mt-2.5 w-full bg-zinc-950 border border-zinc-700 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-300 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="h-3 w-3" /> Буцаах
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold px-2 py-1 bg-zinc-800/60 rounded-xl w-fit">
            <span className="animate-spin text-sm"></span>
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
            onClick={() =>
              handleAiChatSubmit(undefined, undefined, preset.text)
            }
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition flex items-center gap-1 shrink-0"
          >
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Оруулах талбар + Зураг + Дуу хоолой (Mic) */}
      <div className="pt-1.5 shrink-0 w-full">
        <form
          onSubmit={(e) => handleAiChatSubmit(e)}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-2.5 flex flex-col gap-2 shadow-lg focus-within:border-zinc-700 w-full"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim()) handleAiChatSubmit();
              }
            }}
            placeholder={
              isListening
                ? "🎙️ Ярьж байна... '2 литр сүү асгасан' гэж хэлнэ үү"
                : "Зарлага бичих эсвэл микрофоноор ярих..."
            }
            className={`w-full bg-transparent text-white text-[15px] leading-relaxed resize-none outline-none placeholder:text-zinc-500 px-1 ${isListening ? " text-zinc-200 font-bold" : ""}`}
            style={{ minHeight: "38px", maxHeight: "100px" }}
          />

          <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800/60 shrink-0 w-full gap-1">
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
                    e.target.value = ""; // iOS дээр дахин зураг сонгоход гацахаас сэргийлнэ
                  }
                }}
              />
              <label
                htmlFor="kiosk-ai-camera"
                className="h-8 sm:h-9 px-2 sm:px-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 rounded-xl flex items-center gap-1 cursor-pointer text-zinc-200 font-bold text-xs sm:text-xs transition shrink-0 select-none"
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
                    e.target.value = ""; // iOS reset
                  }
                }}
              />
              <label
                htmlFor="kiosk-ai-gallery"
                className="h-8 sm:h-9 px-2 sm:px-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 rounded-xl flex items-center gap-1 cursor-pointer text-zinc-300 font-bold text-xs sm:text-xs transition shrink-0 select-none"
                title="iPad эсвэл утасны цомгоос сонгох"
              >
                <span className="text-xs shrink-0">🖼️</span>
                <span className="hidden min-[360px]:inline">Цомог</span>
              </label>

              {/* 🎙️ 3. Монгол дуу хоолойгоор ярих (Mic) */}
              <button
                type="button"
                onClick={startVoiceRecording}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1 font-bold text-xs sm:text-xs active:scale-95 transition-all shrink-0 select-none ${
                  isListening
                    ? "bg-rose-600 text-white  shadow-[0_0_12px_rgba(225,29,72,0.6)]"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}
                title={isListening ? "Дуу бичихийг зогсоох" : "Дуугаар ярих"}
              >
                {isListening ? (
                  <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                ) : (
                  <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                )}
                <span>{isListening ? "Сонсож байна..." : "Ярих"}</span>
              </button>

              {/* ❌ 4. Цуцлах товч (Зөвхөн ярьж эсвэл AI ажиллаж байх үед гарна) */}
              {(isListening || isAiLoading) && (
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="h-8 sm:h-9 px-2 sm:px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl flex items-center gap-1 font-bold text-xs sm:text-xs active:scale-95 transition shrink-0 select-none"
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
              className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-xs flex items-center gap-1.5 transition-all shrink-0 select-none ml-1 ${
                chatInput.trim() && !isAiLoading
                  ? "bg-white hover:bg-zinc-200 text-zinc-950 shadow-md active:scale-95 cursor-pointer"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
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
  const [step, setStep] = useState<
    | "initializing"
    | "pairing"   
    | "select_worker"
    | "pin_code"
    | "shift_handover"
    | "menu"
    | "ai_chat"
    | "tasks"
    | "incident_report"
    | "close_shift"
  >("pairing");
// 🔐 ХОЛБОЛТЫН СТЭЙТ (PAIRING)
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  const [isPairing, setIsPairing] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState(""); 
  const [tenantClientId, setTenantClientId] = useState<string>("");
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [isLoadingKiosk, setIsLoadingKiosk] = useState<boolean>(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [learnedAliases, setLearnedAliases] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [activeShift, setActiveShift] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 🌐 ХОС ХЭЛНИЙ ТОХИРГОО (tenantClientId-ийн дараа байрлана)
  const [lang, setLang] = useState<"mn" | "en">("mn");
  const [translationsCache, setTranslationsCache] = useState<
    Record<string, string>
  >({});
  // 1. Системийн 4 горимын текстүүд
  const UI_TEXT = {
    mn: {
      spoilage: "Хаягдал",
      meal: "Хоол",
      test: "Туршилт",
      purchase: "Орлого",
    },
    en: {
      spoilage: "Waste",
      meal: "Meal",
      test: "Test",
      purchase: "Purchase",
    },
  };

  // 2. Баазад хадгалагдсан орчуулгыг татах
  useEffect(() => {
    if (!tenantClientId) return;
    kioskBootstrap()
      .then((data) => {
        const map: Record<string, string> = {};
        (data.translations || []).forEach((row: any) => {
          if (row.original_text) map[String(row.original_text).toLowerCase()] = row.translated_text;
        });
        setTranslationsCache(map);
      })
      .catch(() => {});
  }, [tenantClientId]);



  // 3. УХААЛАГ НЭР ХӨРВҮҮЛЭГЧ (Толинд байхгүй бол AI-аар шууд орчуулж баазад цээжилнэ)

  // 3. УХААЛАГ НЭР ХӨРВҮҮЛЭГЧ (Эхний үгээр тасдаж алдаа гаргахгүй хувилбар)
  const tName = (rawName: string) => {
    if (!rawName) return "";

    // Англи горим: Хаалтыг арилгаж цэвэр англи нэр гаргана
    if (lang === "en") {
      const m = rawName.match(/^(.*?)\s*\(/);
      return m ? m[1].trim() : rawName;
    }

    // 🇲🇳 Монгол горим:
    // 1. Хаалтад монгол нэр байвал ХААЛТАН ДОТОРХЫГ ШУУД АВНА (Хамгийн зөв хувилбар)
    const bracketMatch = rawName.match(/\((.*?)\)/);
    if (bracketMatch && bracketMatch[1]) return bracketMatch[1].trim();

    const clean = rawName.toLowerCase().trim();

    // 2. Баазад өмнө нь зөв хадгалсан орчуулга байвал тэрийг авна
    if (translationsCache[clean]) return translationsCache[clean];

    // 3. ЗӨВХӨН БҮХЭЛ НЭРЭЭРЭЭ толь бичигт байвал авна
    if (typeof STATIC_DICT !== "undefined" && STATIC_DICT[clean]) {
      return STATIC_DICT[clean]; //
    }

    // 4. Аль нь ч биш бол AI-аар БҮТЭН НЭРЭЭР НЬ зөв орчуулж баазад цээжилнэ
    if (!translationsCache[clean]) {
      const tokens = kioskTokens();
      fetch("/api/kiosk-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-device": tokens.deviceToken,
          "x-kiosk-worker": tokens.workerToken,
        },
        body: JSON.stringify({ action: "translate", text: rawName }),
      })
          .then((res) => res.json())
          .then((d) => {
            if (d.success && d.translation) {
              setTranslationsCache((prev) => ({
                ...prev,
                [clean]: d.translation,
              }));
            }
          })
          .catch(() => {});
    }

    return rawName;
  };

  const tUnit = (u: string) => {
    if (!u) return "";
    if (lang === "en")
      return u === "ш" ? "pc" : u === "мл" ? "ml" : u === "гр" ? "g" : u;
    return u.includes("ml")
      ? "мл"
      : u.includes("gram") || u === "g"
        ? "гр"
        : u.includes("pc") || u.includes("item")
          ? "ш"
          : u;
  };
  // Shift Handover Start States
  const [handoverNote, setHandoverNote] = useState("");
  const [handoverFile, setHandoverFile] = useState<File | null>(null);

  // Incident Report States (Previous Shift Damage)
  const [incidentWorker, setIncidentWorker] = useState("");
  const [incidentItem, setIncidentItem] = useState("");
  const [incidentQty, setIncidentQty] = useState("");
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentFile, setIncidentFile] = useState<File | null>(null);

  // Tasks & Shift Close States
  const [tasks, setTasks] = useState<any[]>([]);
  const [inventoryToCount, setInventoryToCount] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [posZFile, setPosZFile] = useState<File | null>(null);
  // ⚡ ШИНЭ: Kiosk 2-Tap Горим & Numpad State-үүд
  const [kioskMode, setKioskMode] = useState<
    "spoilage" | "staff_meal" | "testing" | "purchase"| "count"
  >("spoilage");
  const [quickItemModal, setQuickItemModal] = useState<any | null>(null);
  const [numpadTarget, setNumpadTarget] = useState<"qty" | "cost">("qty");
  const [kioskBulkStock, setKioskBulkStock] = useState<Record<string, string>>({});
   // ⚡ 1. Заагч (Cursor)-ийг удирдах рефүүд:
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const costInputRef = useRef<HTMLInputElement>(null);

// ⚡ 0ms Чичиргээ үүсгэгч (Тооны машин шиг хурдан мэдрэмж)
  const triggerHaptic = (ms = 8) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(ms);
    }
  };



const handleKioskBulkSave = async () => {
    setIsAiLoading(true);

    try {
      // 1. ХАДГАЛАХААС ӨМНӨХ УХААЛАГ ШАЛГАЛТУУД (Грамм/Кг андуурах, илүү 0 дарахыг барих)
      for (const id of Object.keys(kioskBulkStock)) {
        let val = kioskBulkStock[id];
        if (val === undefined || val.trim() === "") continue;

        let qty = parseFloat(val);
        const ing = ingredients.find((i) => i.id === id);
        if (!ing) continue;

        // Хамгаалалт 1: Хасах тоог шууд хориглох
        if (qty < 0) {
          alert(`Алдаа: [${tName(ing.name)}] дээр хасах тоо (${qty}) оруулсан байна. Үлдэгдэл 0-ээс бага байж болохгүй!`);
          setIsAiLoading(false);
          return;
        }

        // Хамгаалалт 2: Грамм / Килограмм андуурах алдааг барих (Жишээ нь 2 кг-ийг 2 гр гэж бичвэл)
        if ((ing.unit === "гр" || ing.unit === "мл") && qty > 0 && qty < 10) {
          const confirmUnit = window.confirm(
            `САНУУЛГА: Та [${tName(ing.name)}]-ийг ердөө "${qty} ${ing.unit}" гэж орууллаа.\n\nТа үүнийг ${qty} КИЛОГРАММ/ЛИТР (${qty * 1000} ${ing.unit}) гэж бичих гэсэн юм биш биз?\n\nТийм бол [OK] дарна уу. Үгүй бол [Cancel].`
          );
          if (confirmUnit) {
            qty = qty * 1000;
            kioskBulkStock[id] = qty.toString(); // Санах ойд автоматаар засаж хадгална
          }
        }

        // Хамгаалалт 3: Хуруу андуурч хэт их тоо бичих (15 гэх гэж байгаад 1500 гээд дарчихвал)
        const prevStock = parseFloat(ing.current_stock) || 0;
        if (prevStock > 0 && qty > (prevStock * 3) && (qty - prevStock) > 500) {
          const confirmVariance = window.confirm(
            `АНХААР: [${tName(ing.name)}] дээр "${qty} ${ing.unit}" гэж маш их хэмжээгээр бичсэн байна. (Өмнөх үлдэгдэл: ${prevStock} ${ing.unit})\n\nТа 100% зөв тоолсон гэдэгтээ итгэлтэй байна уу?`
          );
          if (!confirmVariance) {
            setIsAiLoading(false);
            return;
          }
        }
      }

      // 2. БААЗ РУУ ХАДГАЛАХ (Таны баталсан ЦЭВЭРХЭН логик: Зөвхөн "kiosk_count")
      const logsToInsert: any[] = [];
      const currentDate = new Date().toISOString();
      const currentWorkerName = activeShift?.character_role || selectedWorker?.full_name || "Ажилтан";

      Object.keys(kioskBulkStock).forEach((id) => {
        const val = kioskBulkStock[id];
        if (val !== undefined && val.trim() !== "") {
          logsToInsert.push({
            client_id: tenantClientId,
            ingredient_id: id,
            quantity: parseFloat(val) || 0,
            type: "count",
            incident_type: "kiosk_count", // 👈 ЗӨВХӨН ЭНЭ Л БАЙНА, ӨӨР ИЛҮҮ ДУТУУ ТААМАГЛАЛ БАЙХГҮЙ
            notes: `Kiosk Тооллого: ${val}`, 
            date: currentDate,
            worker_name: currentWorkerName,
          });
        }
      });

      if (logsToInsert.length === 0) {
        alert("Та тоолох барааны тоо хэмжээг оруулна уу.");
        setIsAiLoading(false);
        return;
      }

      const { data: insertedData, errorMessage } = await (async () => {
        try {
          const saved = await kioskOps("logs.insert", { logs: logsToInsert.map((row) => ({
            ingredient_id: row.ingredient_id,
            quantity: row.quantity,
            type: row.type,
            incident_type: row.incident_type,
            notes: row.notes,
          })) });
          return { data: (saved.ids || []).map((id: string) => ({ id })), errorMessage: "" };
        } catch (err: any) {
          return { data: null, errorMessage: err.message };
        }
      })();

      if (errorMessage) {
        alert(`Алдаа: ${errorMessage}`);
      } else {
        alert(`Амжилттай! ${insertedData?.length || logsToInsert.length} барааны тооллого хадгалагдлаа.`);
        setKioskBulkStock({});
        await fetchKioskData(tenantClientId);
      }
    } catch (e: any) {
      alert(`Алдаа гарлаа: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };
  // ⚡ Хуруу хүрэх тэр агшинд 0ms-д тоо оруулах
  const handleFastInsert = (digit: string) => {
    triggerHaptic(8);
    const isQty = numpadTarget === "qty";
    const input = isQty ? qtyInputRef.current : costInputRef.current;
    const setVal = isQty ? setQuickQty : setPurchaseCost;

    if (input) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const prev = input.value;
      if (digit === "." && prev.includes(".")) return;

      const next = prev.substring(0, start) + digit + prev.substring(end);
      setVal(next);

      requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
        input.setSelectionRange(start + digit.length, start + digit.length);
      });
    } else {
      setVal((prev) => prev + digit);
    }
  };


  // ⚡ 1 тоо устгах суурь функц
  const executeSingleDelete = () => {
    triggerHaptic(6);
    const isQty = numpadTarget === "qty";
    const input = isQty ? qtyInputRef.current : costInputRef.current;
    const setVal = isQty ? setQuickQty : setPurchaseCost;

    if (input) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const prev = input.value;

      if (start === end) {
        if (start === 0) return;
        const next = prev.substring(0, start - 1) + prev.substring(end);
        setVal(next);
        requestAnimationFrame(() => {
          input.focus({ preventScroll: true });
          input.setSelectionRange(start - 1, start - 1);
        });
      } else {
        const next = prev.substring(0, start) + prev.substring(end);
        setVal(next);
        requestAnimationFrame(() => {
          input.focus({ preventScroll: true });
          input.setSelectionRange(start, start);
        });
      }
    } else {
      setVal((prev) => prev.slice(0, -1));
    }
  };

  // ⚡ ДАРААД БАЙВАЛ ТОНЫ МАШИН ШИГ ХУРДАН ТАСРАЛТГҮЙ УСТГАХ
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const deleteIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startContinuousDelete = () => {
    executeSingleDelete();
    // 250ms дарсны дараа 50ms тутамд зогсолтгүй устгана:
    deleteTimerRef.current = setTimeout(() => {
      deleteIntervalRef.current = setInterval(() => {
        executeSingleDelete();
      }, 50);
    }, 250);
  };

  const stopContinuousDelete = () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
  };

  // ⚡ "C" (Бүгдийг арилгах) товч
  const handleClearAll = () => {
    triggerHaptic(15);
    if (numpadTarget === "qty") {
      setQuickQty("");
      qtyInputRef.current?.focus({ preventScroll: true });
    } else {
      setPurchaseCost("");
      costInputRef.current?.focus({ preventScroll: true });
    }
  };
  const [quickQty, setQuickQty] = useState<string>("");
  const [purchaseCost, setPurchaseCost] = useState<string>("");
  const [kioskSearch, setKioskSearch] = useState<string>("");
  const [recentToast, setRecentToast] = useState<{
    id: string;
    text: string;
  } | null>(null);
  // 🛒 САГСНЫ STATE (Олон барааг бөөнд нь зураг дарахад зориулав)
  const [purchaseCart, setPurchaseCart] = useState<
    Array<{
      ing_id: string;
      name: string;
      unit: string;
      qty: number;
      cost: number;
    }>
  >([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [cartFile, setCartFile] = useState<File | null>(null);
  // 💵 Бэлэн мөнгө гаргах (Cash Out) & Хаалтын касс тоолох State-үүд
  const [cashOutModal, setCashOutModal] = useState(false);
  const [cashOutType, setCashOutType] = useState<"owner_draw" | "petty_cash">(
    "owner_draw",
  );
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [cashOutNote, setCashOutNote] = useState("");
  const [cashOutFile, setCashOutFile] = useState<File | null>(null);
  const [actualCashDrawer, setActualCashDrawer] = useState(""); // Ээлж хаах үеийн бодит бэлэн мөнгө
  // 📖 1. Дижитал Жор (SOP) харах State-үүд
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipesList, setRecipesList] = useState<any[]>([]);
  const [selectedProductRecipe, setSelectedProductRecipe] = useState<
    string | null
  >(null);
  // 📸 1. E-Barimt-гүй үед барааны зураг хавсаргах State
  const [noEbarimtFile, setNoEbarimtFile] = useState<File | null>(null);
  const [purchasePayMethod, setPurchasePayMethod] = useState<"bank" | "cash">(
    "bank",
  );
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  // 📋 Өнөөдрийн бүх үйлдлүүдийн гүйдэг жагсаалт:
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [previewLogImage, setPreviewLogImage] = useState<string | null>(null);
  // ➕ ШИНЭ БАРАА НЭМЭХЭД ДУТАГДАЖ БАЙСАН STATE-ҮҮД:
  const [showAddNewItemModal, setShowAddNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("ш");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  // 🧾 2. E-Barimt уншсаны дараа ШАЛГАХ / ЗАСАХ (Preview/Approve) Modal-ийн State
  const [ebarimtReview, setEbarimtReview] = useState<{
    file: File;
    previewUrl: string;
    items: Array<{
      item_name: string;
      quantity: number;
      total_cost: number;
      is_food: boolean;
      ingredient_id?: string | null;
      unit?: string | null;
    }>;
    payMethod: "bank" | "cash";
  } | null>(null);

  useEffect(() => {
    initKioskContext();
    fetch("/api/dashboard/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!recentToast) return;

    const timer = setTimeout(() => {
      setRecentToast(null);
    }, 4000); // 4 seconds

    return () => clearTimeout(timer);
  }, [recentToast]);
  const fetchTodayLogs = async () => {
    try {
      const data = await kioskBootstrap();
      if (data.todayLogs) setTodayLogs(data.todayLogs);
    } catch {
      setTodayLogs([]);
    }
  };

// ⚡ DEEP HARDWARE & DEVICE MODEL PROFILER
  const getDeepDeviceInfo = async (): Promise<string> => {
    if (typeof window === "undefined") return "Үл мэдэгдэх төхөөрөмж";

    const ua = navigator.userAgent;
    const width = window.screen.width;
    const height = window.screen.height;
    const dpr = window.devicePixelRatio || 1;
    const isTouch = navigator.maxTouchPoints > 0;

    // 1. WebGL Graphics Renderer (Reveals M1/M2/M3 chips, Intel Iris, Nvidia, Adreno)
    let gpu = "";
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          gpu = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
          // Clean up common vendor noise
          gpu = gpu.replace(/ANGLE \(|Direct3D.*|vs_.*|\)/gi, "").trim();
        }
      }
    } catch (e) {}

    // 2. High-Entropy Client Hints (Works on Chrome / Android to get exact OEM models)
    let modelName = "";
    try {
      if ((navigator as any).userAgentData?.getHighEntropyValues) {
        const hints = await (navigator as any).userAgentData.getHighEntropyValues(["model", "platformVersion"]);
        if (hints.model) modelName = hints.model;
      }
    } catch (e) {}

    // 3. Apple Hardware Matrix (iPad & iPhone model resolution matching)
    if (/iPad/i.test(ua) || (navigator.platform === "MacIntel" && isTouch)) {
      const maxDim = Math.max(width, height);
      const minDim = Math.min(width, height);

      if (maxDim === 1366 && minDim === 1024) modelName = "iPad Pro 12.9\"";
      else if (maxDim === 1194 && minDim === 834) modelName = "iPad Pro 11\"";
      else if (maxDim === 1180 && minDim === 820) modelName = "iPad Air (10.9\")";
      else if (maxDim === 1080 && minDim === 810) modelName = "iPad (10.2\")";
      else if (maxDim === 1133 && minDim === 744) modelName = "iPad mini";
      else modelName = "Apple iPad";
    } else if (/iPhone/i.test(ua)) {
      const maxDim = Math.max(width, height);
      const minDim = Math.min(width, height);

      if (maxDim === 932 && minDim === 430) modelName = "iPhone 15/14 Pro Max";
      else if (maxDim === 852 && minDim === 393) modelName = "iPhone 15/14 Pro";
      else if (maxDim === 844 && minDim === 390) modelName = "iPhone 14/13/12";
      else if (maxDim === 926 && minDim === 428) modelName = "iPhone 13/12 Pro Max";
      else if (maxDim === 812 && minDim === 375) modelName = "iPhone X/11/12 mini";
      else modelName = "Apple iPhone";
    }

    // 4. Fallback OS categorization
    let osLabel = "PC / Төхөөрөмж";
    if (/Windows/i.test(ua)) osLabel = "Windows PC";
    else if (/Android/i.test(ua)) osLabel = modelName ? `Android (${modelName})` : "Android Таблет";
    else if (/Macintosh/i.test(ua) && !isTouch) osLabel = "Mac Компьютер";
    else if (modelName) osLabel = modelName;

    // 5. Construct deep display signature
    const parts = [modelName || osLabel];
    if (gpu) parts.push(gpu.split(",")[0].trim());
    parts.push(`${width}×${height} @${dpr}x`);

    return parts.join(" • ");
  };

const initKioskContext = async () => {
  setIsLoadingKiosk(true);

  const savedToken = localStorage.getItem("kiosk_device_token");
  const savedClient = localStorage.getItem("kiosk_client_id");

  // 1. Цоо шинэ төхөөрөмж бол холболтын код нэхнэ:
  if (!savedToken || !savedClient) {
    setStep("pairing");
    setIsLoadingKiosk(false);
    return;
  }

  // 2. Өмнө нь холбогдсон л бол ШУУД нэвтрүүлнэ (Сүлжээ тасарсан ч хэзээ ч код нэхэхгүй):
  setTenantClientId(savedClient);
  setStep("select_worker");

  // 3. Цаана нь чимээгүйхэн шалгах (Background Verification):
  try {
    const res = await fetch("/api/kiosk/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken: savedToken }),
    });

    if (res.ok) {
      const data = await res.json();
      // ЗӨВХӨН админ Dashboard-аас тухайн таблетыг зориуд устгасан үед л салгана:
      if (data.valid === false) {
        localStorage.removeItem("kiosk_device_token");
        localStorage.removeItem("kiosk_client_id");
        setStep("pairing");
        return;
      }
    }

    // Хэвийн үед датагаа татна:
    await fetchKioskData(savedClient);
  } catch (err) {
    // Сүлжээ унасан, сервер гацсан ч түлхүүрийг ХЭЗЭЭ Ч УСТГАХГҮЙ, ажилласаар байна!
    console.warn("Kiosk verify skipped due to network, using offline session.");
    await fetchKioskData(savedClient);
  } finally {
    setIsLoadingKiosk(false);
  }
};
  const matchIngredient = (name: string) => {
    const key = String(name || "").toLowerCase().trim();
    const alias = learnedAliases.find((row: any) => String(row.phrase || "").toLowerCase() === key);
    if (alias) return ingredients.find((ing) => ing.id === alias.ingredient_id) || null;
    return ingredients.find((ing) => String(ing.name || "").toLowerCase().trim() === key) || null;
  };

  const fetchKioskData = async (_client?: string) => {
    const brandingRes = await fetch("/api/kiosk/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken: localStorage.getItem("kiosk_device_token") || "" }),
    });
    const branding = await brandingRes.json().catch(() => ({}));
    setClientLogo(branding?.logoUrl || null);

    const data = await kioskBootstrap();
    if (data.staff) setWorkers(data.staff);
    if (data.ingredients) setIngredients(data.ingredients);
    if (data.aliases) setLearnedAliases(data.aliases);
    if (data.recipes) setRecipesList(data.recipes);
    if (data.todayLogs) setTodayLogs(data.todayLogs);
    if (data.translations) {
      const map: Record<string, string> = {};
      data.translations.forEach((row: any) => {
        if (row.original_text) map[String(row.original_text).toLowerCase()] = row.translated_text;
      });
      setTranslationsCache(map);
    }
    return data;
  };

 const loadLiveTodayTasks = async (tenantId: string, worker: any, pre?: any) => {
    const data = pre || (await kioskBootstrap());
    const allTasks = data.tasks || [];
    const workerName = worker?.email
      ? worker.email.split("@")[0]
      : worker?.full_name || "Ажилтан";
    const workerDisplayName = (worker.full_name || workerName).trim();
    const workerRoleLower = (worker.role || "").toLowerCase().trim();
    const workerNameLower = workerDisplayName.toLowerCase().trim();
    const isBarista =
      workerRoleLower.includes("barista") ||
      workerRoleLower.includes("бариста");
    const isCook =
      workerRoleLower.includes("cook") ||
      workerRoleLower.includes("chef") ||
      workerRoleLower.includes("тогооч");

    const matchedTemplateTasks = (allTasks || [])
      .filter((t: any) => {
        if (t.is_active === false) return false;
        const tRole = (t.role || "").toLowerCase().trim();
        if (tRole === "бүх ажилтан" || tRole.includes("бүх")) return true;
        if (tRole === workerNameLower || tRole.includes(workerNameLower))
          return true;
        if (
          isBarista &&
          (tRole.includes("бариста") || tRole.includes("barista"))
        )
          return true;
        if (
          isCook &&
          (tRole.includes("тогооч") ||
            tRole.includes("cook") ||
            tRole.includes("chef"))
        )
          return true;
        return false;
      })
      .map((t: any) => ({
        id: t.id,
        name: t.task_name,
        weight: t.weight || 10,
        done: false,
      }));

    const completedTasksToday = new Set<string>();
    (data.todayShifts || []).forEach((s: any) => {
      let list = s.daily_tasks_checklist;
      if (typeof list === "string") list = JSON.parse(list);
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item.done && item.name)
            completedTasksToday.add(item.name.toLowerCase().trim());
        });
      }
    });

    return matchedTemplateTasks.map((t: any) => ({
      ...t,
      done: completedTasksToday.has(t.name.toLowerCase().trim()),
    }));
  };

  const openTasksScreen = () => {
    // ⚡ Шууд дэлгэцийг нээнэ (0ms)
    setStep("tasks");

    // Цаана нь датаг сэмхэн шинэчлэх (Background sync)
    if (selectedWorker) {
      loadLiveTodayTasks(tenantClientId, selectedWorker).then((liveTasks) => {
        setTasks(liveTasks);
        if (activeShift) {
          kioskOps("shift.patch", { id: activeShift.id, daily_tasks_checklist: liveTasks }).catch((err) => {
            setMsg(err.message || "Даалгавар хадгалагдсангүй.");
          });
        }
      });
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(8);
    }
    setPin((p) => (p.length < 4 ? p + digit : p));
  };

  const handleVerifyPin = async () => {
    if (!selectedWorker) return;

    const pinRes = await fetch("/api/kiosk/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: selectedWorker.id,
        pin,
        deviceToken: localStorage.getItem("kiosk_device_token") || "",
      }),
    });
    const pinJson = await pinRes.json().catch(() => ({ valid: false }));

    if (!pinRes.ok || !pinJson.valid) {
      setMsg(pinJson.message || "❌ Буруу PIN код!");
      setPin("");
      return;
    }
    if (pinJson.workerToken) localStorage.setItem("kiosk_worker_token", pinJson.workerToken);
        const session = await kioskBootstrap();
    if (session.ingredients) setIngredients(session.ingredients);
    if (session.aliases) setLearnedAliases(session.aliases);
    if (session.recipes) setRecipesList(session.recipes);
    if (session.todayLogs) setTodayLogs(session.todayLogs);
    const liveTasks = await loadLiveTodayTasks(tenantClientId, selectedWorker, session);
    setTasks(liveTasks);
    if (!session.activeShift) {
      setStep("shift_handover");
    } else {
      setActiveShift(session.activeShift);
      setStep("menu");
    }

    setPin("");
    setMsg("");
  };
  const handleStartShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiLoading(true);

    let startImgUrl = null;
    if (handoverFile) {
      startImgUrl = await uploadEvidencePhoto(handoverFile, "handover_starts");
    }

    try {
      const saved = await kioskOps("shift.start", {
        start_notes: handoverNote || "Ээлж хэвийн хүлээн авсан.",
        start_evidence_image: startImgUrl,
        daily_tasks_checklist: tasks,
      });
      setActiveShift(saved.shift);
      setIsAiLoading(false);
      setStep("menu");
    } catch (err: any) {
      setMsg(`❌ Алдаа: ${err.message || "Ээлж үүсгэж чадсангүй."}`);
      setIsAiLoading(false);
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentItem || !incidentQty) return;
    setIsAiLoading(true);

    let damageImgUrl = null;
    if (incidentFile) {
      damageImgUrl = await uploadEvidencePhoto(incidentFile, "damage_proofs");
    }

    const ing = ingredients.find((i) => i.id === incidentItem);
    const qty = parseFloat(incidentQty) || 0;
    const lossCost = ing ? qty * (parseFloat(ing.unit_price) || 0) : 0;

    try {
      await kioskOps("logs.insert", {
        logs: [
          {
            ingredient_id: ing ? ing.id : null,
            quantity: -Math.abs(qty),
            total_cost: lossCost,
            type: "spoilage",
            incident_type: "previous_shift_damage",
            reported_against_worker: incidentWorker || "Өмнөх ээлжийн ажилтан",
            image_url: damageImgUrl,
            notes: `Өмнөх ээлжийн алдагдал: ${incidentNote || "Шалтгаангүй хаягдал илэрсэн"}`,
            is_food: false,
          },
        ],
      });
    } catch (err: any) {
      setIsAiLoading(false);
      alert(err.message || "Бүртгэж чадсангүй.");
      return;
    }

    setIsAiLoading(false);
    alert("Өмнөх ээлжийн алдагдал менежерийн хяналтад бүртгэгдлээ!");
    setIncidentItem("");
    setIncidentQty("");
    setIncidentNote("");
    setIncidentFile(null);
    setStep("menu");
  };

  const completeTask = async (index: number) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[index].done) return;
    updatedTasks[index].done = true;
    setTasks(updatedTasks);
    if (activeShift) {
      try {
        await kioskOps("shift.patch", { id: activeShift.id, daily_tasks_checklist: updatedTasks });
      } catch (err: any) {
        setMsg(err.message || "Даалгавар хадгалагдсангүй.");
      }
    }
  };

  const loadInventoryToCount = () => {
    setMsg("");
    const twelveHoursAgo = new Date(
      Date.now() - 12 * 60 * 60 * 1000,
    ).toISOString();

    // 1. А-Class (Чухал) бараанууд түрүүлж орно
    const criticalItems = ingredients.filter(
      (i) =>
        i.is_critical &&
        (!i.last_counted_at || i.last_counted_at < twelveHoursAgo),
    );

    // 2. Үлдсэн 5 суудлыг хамгийн удаан тоологдоогүй бараануудаар нөхнө
    const remainingSlots = Math.max(0, 5 - criticalItems.length);
    const cycleItems = ingredients
      .filter(
        (i) =>
          !i.is_critical &&
          (!i.last_counted_at || i.last_counted_at < twelveHoursAgo),
      )
      .sort(
        (a, b) =>
          new Date(a.last_counted_at || "2000-01-01").getTime() -
          new Date(b.last_counted_at || "2000-01-01").getTime(),
      )
      .slice(0, remainingSlots);

    // ⚡ Аналитик дуудаж хүлээхгүй шууд дэлгэцийг нээнэ!
    setInventoryToCount([...criticalItems, ...cycleItems]);
    setCounts({});
    setActualCashDrawer("");
    setPosZFile(null);
    setStep("close_shift");
  };

  // ⚡ 0 МИЛЛИСЕКУНДЭД ШУУД ХААГДАЖ ГАРДАГ ХАМГИЙН ХУРДАН ХААЛТ

const handleCloseShift = async () => {
    // 1. ШАЛГАЛТУУД (Дутуу зүйл байвал шууд анхааруулна) - 100% ORIGINAL
    const uncountedItems = inventoryToCount.filter(
      (i) =>
        counts[i.id] === undefined || counts[i.id].toString().trim() === "",
    );
    if (uncountedItems.length > 0) {
      setMsg(
        `Тооллого дутуу байна: ${uncountedItems.map((i) => i.name).join(", ")}`,
      );
      return;
    }

    if (!posZFile) {
      setMsg("ПОС-ын Z-Тайлангийн зургийг заавал дарж оруулна уу!");
      return;
    }

    if (
      actualCashDrawer.trim() === "" ||
      isNaN(Number(actualCashDrawer)) ||
      Number(actualCashDrawer) < 0
    ) {
      setMsg("Кассын бэлэн мөнгийг бичнэ үү (Байхгүй бол 0)!");
      return;
    }

    // ⚡ 2. ӨГӨГДЛҮҮДИЙГ БЭЛТГЭХ - 100% ORIGINAL
    const endTime = new Date().toISOString();
    const fileToUpload = posZFile;
    const cashVal = actualCashDrawer;
    const currentShift = activeShift;
    const itemsCounted = [...inventoryToCount];
    const itemCounts = { ...counts };
    const completedTaskIds = tasks
      .filter((t: any) => t.done && t.id)
      .map((t: any) => t.id);

    setIsAiLoading(true);
    setMsg("");

    // ⚡ 3. ЗУРАГ ХУУЛАХ БА БААЗАД ХАДГАЛАХ
    try {
      let posZUrl = null;
      if (fileToUpload) {
        posZUrl = await uploadEvidencePhoto(fileToUpload, "pos_z_reports");
      }

      const badCount = itemsCounted.find((item) => !Number.isFinite(parseFloat(itemCounts[item.id])));
      if (badCount) {
        setMsg(`${badCount.name} дээрх тоо буруу байна.`);
        setIsAiLoading(false);
        return;
      }

      await kioskOps("shift.close", {
        id: currentShift?.id,
        pos_z_image_url: posZUrl,
        cash: parseFloat(cashVal),
        counts: itemsCounted.map((item) => ({
          ingredient_id: item.id,
          name: item.name,
          quantity: parseFloat(itemCounts[item.id]),
        })),
        closing_checklist: itemsCounted.map((item) => ({
          ingredient_id: item.id,
          name: item.name,
          quantity: parseFloat(itemCounts[item.id]) || 0,
          unit: item.unit,
          count_category: "daily_cycle_count",
          counted_at: endTime,
        })),
      });

      // ⚡ 4. БААЗАД АМЖИЛТТАЙ ХАДГАЛАГДСАНЫ ДАРАА Л ДЭЛГЭЦИЙГ ЦЭВЭРЛЭХ
      setMsg("🌙 Ээлж амжилттай хаагдлаа!");
      setStep("select_worker");
      setSelectedWorker(null);
      localStorage.removeItem("kiosk_worker_token");
      setActiveShift(null);
      setTasks([]);
      setCounts({});
      setPosZFile(null);
      setActualCashDrawer("");

      await fetchKioskData(tenantClientId);
    } catch (e: any) {
      console.error("Close shift error:", e);
      setMsg(`Хадгалахад алдаа гарлаа: ${e?.message || "Сүлжээ шалгана уу"}`);
    } finally {
      setIsAiLoading(false);
    }
  };
  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-zinc-100 flex flex-col items-center p-2.5 sm:p-4 select-none overflow-hidden touch-none">
      {/* 🔝 HEADER */}
      <header className="w-full max-w-2xl lg:max-w-3xl flex justify-between items-center border-b border-zinc-800/80 pb-2.5 mb-2 shrink-0 px-1">
        <div className="flex items-center gap-2.5">
          {
            isLoadingKiosk ? (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-zinc-800/80  shrink-0" />
            ) : clientLogo ? (
              /* 2. Зөвхөн эзэн лого оруулсан үед л зургийг харуулна */
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 flex items-center justify-center shrink-0">
                <img
                  src={clientLogo}
                  alt={`${tenantClientId} Logo`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null /* 3. Хэрэв лого оруулаагүй бол ямар ч дүрс гарахгүй, хоосон байна */
          }

          <div>
            {/* Салбарын нэр */}
            {tenantClientId ? (
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase leading-none">
                {tenantClientId} KIOSK
              </h1>
            ) : (
              <div className="h-4 w-28 bg-zinc-800  rounded" />
            )}
            <p className="text-xs sm:text-xs text-zinc-200 font-bold uppercase mt-1">
              Smart Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 🌐 ХЭЛ СОЛИХ ТОВЧ */}
          <button
            type="button"
            onClick={() => setLang(lang === "mn" ? "en" : "mn")}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-2.5 py-1.5 rounded-xl text-xs font-black uppercase transition active:scale-95 cursor-pointer shadow-sm"
          >
            {lang === "mn" ? "🇲🇳 MN" : "🇺🇸 EN"}
          </button>
          <Link
            href="/login?from=kiosk"
            className="text-zinc-300 hover:text-white text-xs font-bold bg-zinc-900 px-2 py-1.5 rounded-xl border border-zinc-800 active:scale-95 transition"
          >
            Самбар
          </Link>
          {/* 🟢 ЭНЭ НЬ button ХЭВЭЭРЭЭ БАЙНА (Хуудас солихгүй тул): */}
          {selectedWorker && (
            <button
              onClick={() => {
                setSelectedWorker(null);
                localStorage.removeItem("kiosk_worker_token");
                setStep("select_worker");
                setMsg("");
              }}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition flex items-center gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Гарах</span>
            </button>
          )}
        </div>
      </header>

      {/* 🚀 MAIN CONTENT */}
       <main className="w-full max-w-2xl lg:max-w-3xl flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* ⚡ 1. CLEAN LOADING SCREEN WHILE VERIFYING (Eliminates the glimpse!) */}
        {isLoadingKiosk || step === "initializing" ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 select-none">
            <div className="h-8 w-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
        
            </p>
          </div>
        ) : (
          <>
            {msg && (
              <div className="bg-rose-500/10 text-rose-400 p-2.5 rounded-xl mb-2 w-full text-center font-bold text-xs border border-rose-500/20 flex items-center justify-center gap-2 shrink-0">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{msg}</span>
              </div>
            )}

        {/* 0. PAIRING SCREEN (АЖИЛЛАХААС ӨМНӨ 1 УДАА КОД НЭХЭХ) */}
        {step === "pairing" && (
          <div className="w-full h-full bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl flex flex-col items-center justify-center text-center">
            <div className="bg-zinc-800/60 p-4 rounded-full mb-6 border border-zinc-700/50">
              <Smartphone className="h-10 w-10 text-zinc-300" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Шинэ төхөөрөмж</h2>
            <p className="text-sm text-zinc-400 mb-8 max-w-sm">
              Таблетыг холбохын тулд Dashboard-ийн <strong>Тохиргоо</strong> цэснээс үүсгэсэн 6 оронтой кодыг оруулна уу.
            </p>

            <input
              type="text"
              maxLength={6}
              value={pairingCodeInput}
              onChange={(e) => setPairingCodeInput(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="bg-zinc-950 border border-zinc-700 focus:border-zinc-500 rounded-2xl px-6 py-4 text-center text-3xl text-white font-mono font-black tracking-[0.5em] w-64 outline-none mb-6 shadow-inner"
            />

            <button
              type="button"
              disabled={pairingCodeInput.length !== 6 || isPairing}
                onClick={async () => {
                  setIsPairing(true);
                  setMsg("");
                  try {
                    // ⚡ Await the deep hardware inspection
                    const deepHardwareInfo = await getDeepDeviceInfo();

                    const res = await fetch("/api/kiosk/pair", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        code: pairingCodeInput,
                        deviceInfo: deepHardwareInfo
                      }),
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                      localStorage.setItem("kiosk_device_token", data.deviceToken);
                      localStorage.setItem("kiosk_client_id", data.clientId);
                      setTenantClientId(data.clientId);
                      await fetchKioskData(data.clientId);
                      setStep("select_worker");
                    } else {
                      setMsg(data.message || "Код буруу байна.");
                    }
                  } catch (err) {
                    setMsg("Сүлжээнд алдаа гарлаа.");
                  } finally {
                    setIsPairing(false);
                  }
                }}
              className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black px-8 py-3.5 rounded-xl text-sm transition shadow-lg w-64"
            >
              {isPairing ? "Холбогдож байна..." : "Холбох"}
            </button>
          </div>
        )}

        {/* 1. SELECT WORKER */}
        {step === "select_worker" && (
          <div className="w-full h-full bg-zinc-900 p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="text-center pt-2 shrink-0">
              <div className="bg-zinc-800/60 p-3 rounded-2xl border border-zinc-700/20 w-fit mx-auto mb-2">
                <Users className="text-zinc-200 h-7 w-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Ээлж эхлүүлэх
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Өөрийн нэр дээр дарж ээлжиндээ нэвтэрнэ үү
              </p>
            </div>

            <div className="space-y-3 w-full my-auto overflow-y-auto max-h-[60vh] px-1">
              {/* ⚡ 1. Хэрэв дата ачаалж байгаа бол түр зуур 2 саарал товчлуур лугшина (Гацалтгүй шууд онгойно) */}
              {isLoadingKiosk ? (
                <div className="space-y-3 ">
                  <div className="h-20 bg-zinc-900/60 border border-zinc-800 rounded-2xl w-full" />
                  <div className="h-20 bg-zinc-900/60 border border-zinc-800 rounded-2xl w-full" />
                </div>
              ) : workers.length === 0 ? (
                /* 2. Ажилтан байхгүй бол */
                <div className="text-center text-zinc-500 text-xs py-8">
                  Энэ салбарт ажилтан бүртгэгдээгүй байна.
                  <br />
                  (Dashboard-аас ажилтан нэмнэ үү)
                </div>
              ) : (
                /* 3. Ажилтнууд бэлэн болмогц товчлуурууд гарна */
                workers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setSelectedWorker(w);
                      setStep("pin_code");
                    }}
                    className="bg-zinc-950 hover:bg-zinc-800 active:scale-95 border-2 border-zinc-800 hover:border-zinc-700/50 p-4 rounded-2xl text-left transition-all shadow-md flex justify-between items-center group w-full cursor-pointer"
                  >
                    <div>
                      <span className="text-base sm:text-lg font-black text-white uppercase block group-hover:text-zinc-200 transition">
                        {w.full_name ||
                          (w.email ? w.email.split("@")[0] : "Ажилтан")}
                      </span>
                      <span className="text-xs text-zinc-200 font-bold uppercase mt-0.5 block">
                        {w.role}
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-xl text-zinc-500 group-hover:text-zinc-200 font-black text-xs">
                      ➔
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="text-center text-xs text-zinc-500 pb-1 shrink-0">
              {tenantClientId} Kitchen Kiosk • Voice & AI Powered
            </div>
          </div>
        )}

        {/* 2. PIN PAD */}
        {step === "pin_code" && (
          <div className="w-full h-full bg-zinc-900 p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between items-center overflow-hidden touch-none">
            <div className="text-center w-full shrink-0 pt-1">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-200 tracking-tight">
                PIN код оруулна уу
              </h2>
              <p className="text-xs text-zinc-300 font-medium mt-0.5">
                Өөрийн хувийн нууц кодыг оруулна уу
              </p>
              <div className="mt-1.5 inline-block bg-zinc-950 px-3.5 py-1 rounded-xl border border-zinc-800">
                <span className="text-xs sm:text-sm text-zinc-300 font-black">
                  👤{" "}
                  {selectedWorker?.full_name ||
                    selectedWorker?.email.split("@")[0]}{" "}
                  ({selectedWorker?.role})
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl py-2 px-6 flex justify-center items-center gap-4 w-full max-w-[200px] my-1 shrink-0">
              {[0, 1, 2, 3].map((dotIndex) => (
                <div
                  key={dotIndex}
                  className={`h-3.5 w-3.5 rounded-full transition-all duration-75 ${
                    pin.length > dotIndex
                      ? "bg-zinc-200  scale-110"
                      : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full flex-1 max-h-[50vh] sm:max-h-[52vh] my-1 px-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleKeypadPress(num);
                  }}
                  className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 active:scale-95 border border-zinc-800 rounded-xl text-2xl sm:text-3xl font-semibold text-white shadow-md flex items-center justify-center select-none transition-transform"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setPin("");
                }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-zinc-300 rounded-2xl text-sm sm:text-base font-black shadow-md flex items-center justify-center select-none transition-transform cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleKeypadPress("0");
                }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 active:scale-95 border border-zinc-800 rounded-2xl text-2xl sm:text-3xl font-black text-white shadow-md flex items-center justify-center select-none transition-transform"
              >
                0
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleVerifyPin();
                }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-white hover:bg-zinc-200 active:scale-95 text-zinc-950 rounded-2xl text-base sm:text-lg font-black  flex items-center justify-center select-none transition-transform cursor-pointer"
              >
                OK
              </button>
            </div>
            <p className="text-center text-xs text-zinc-500 pt-2">
              PIN мартсан бол эзэн самбараас солино.
            </p>
            <div className="text-center space-y-1 w-full pt-1 shrink-0">
              <button
                onClick={() => {
                  setStep("select_worker");
                  setPin("");
                  setMsg("");
                }}
                className="text-xs text-zinc-400 hover:text-white font-bold"
              >
                ← Буцах
              </button>
            </div>
          </div>
        )}

        {/* 3. SHIFT START HANDOVER */}
        {step === "shift_handover" && (
          <div className="w-full h-full bg-zinc-900 p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="text-center shrink-0">
              <div className="bg-zinc-800/60 p-3 rounded-2xl border border-zinc-700/20 w-fit mx-auto mb-2">
                <ShieldCheck className="text-zinc-300 h-7 w-7" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Шинэ Ээлж Эхлүүлэх
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Гал тогооны цэвэрлэгээ, хөргөгчийн төлөвийг шалгаж хүлээн авна
                уу
              </p>
            </div>

            <form
              onSubmit={handleStartShiftSubmit}
              className="space-y-4 my-auto"
            >
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Ээлж хүлээж авах үеийн зураг (Нотлох зураг)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="handover-start-cam"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        setHandoverFile(e.target.files[0]);
                    }}
                  />
                  <label
                    htmlFor="handover-start-cam"
                    className="flex-1 bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-zinc-300 hover:border-zinc-700 transition"
                  >
                    <Camera className="h-4 w-4 text-zinc-300" />
                    <span>
                      {handoverFile
                        ? ` ${handoverFile.name.substring(0, 20)}...`
                        : "Гал тогооны зураг дарах"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                   Тэмдэглэл / Хүлээлцэх тайлбар
                </label>
                <textarea
                  rows={3}
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="Жишээ: Өмнөх ээлжээс хөргөгч цэвэрхэн, сүү 4 хайрцаг үлдсэн..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-xs font-medium outline-none focus:border-zinc-700"
                />
              </div>

              <button
                type="submit"
                disabled={isAiLoading}
                className="w-full bg-white hover:bg-zinc-200 active:scale-95 text-zinc-950 font-black py-3.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>
                  {isAiLoading
                    ? "Эхлүүлж байна..."
                    : "Ээлж Албан Ёсоор Эхлүүлэх"}
                </span>
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => {
                  setStep("select_worker");
                  setSelectedWorker(null);
                  localStorage.removeItem("kiosk_worker_token");
                }}
                className="text-xs text-zinc-400 hover:text-white font-bold"
              >
                ← Буцах
              </button>
            </div>
          </div>
        )}

        {/* 4. MAIN ACTION MENU & DIGITAL KITCHEN */}
        {step === "menu" && (
          <div className="w-full h-full bg-zinc-900 p-3 sm:p-4 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between overflow-hidden relative">
            {/* 🟢 СҮҮЛИЙН ҮЙЛДЭЛ (ХЭЗЭЭ Ч АЛГА БОЛОХГҮЙ, ХҮССЭН ЦАГТАА БУЦААХ БОЛОМЖТОЙ) */}

            {recentToast && (
              <div className="absolute bottom-20 left-3 right-3 z-30 bg-white text-zinc-950 px-3.5 py-2.5 rounded-2xl font-black text-xs shadow-2xl flex items-center justify-between border-2 border-zinc-700 animate-in fade-in duration-150">
                {/* 👈 ЭНДӨӨС truncate-ИЙГ УСТГАЖ flex-wrap НЭМЛЭЭ */}
                <div className="flex flex-wrap items-center gap-1.5 pr-2 flex-1 min-w-0">
                  <span className="bg-zinc-950 text-zinc-200 px-2 py-0.5 rounded-lg text-xs font-mono shrink-0">
                    Бүртгэгдсэн:
                  </span>
                  <span className="font-black text-xs sm:text-xs leading-snug whitespace-normal break-words">
                    {recentToast.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const idToUndo = recentToast.id;
                      setRecentToast(null);
                      try {
                        await kioskOps("logs.delete", { id: idToUndo });
                        await fetchKioskData(tenantClientId);
                        setMsg("Бүртгэл цуцлагдлаа.");
                      } catch (err: any) {
                        setMsg(err.message || "Буцааж чадсангүй.");
                      }
                      setTimeout(() => setMsg(""), 3000);
                    }}
                    className="bg-zinc-950 text-zinc-200 hover:text-white px-2.5 py-1.5 rounded-xl text-xs sm:text-xs font-black transition active:scale-95 shadow cursor-pointer shrink-0"
                  >
                    ↩️ Буцаах
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecentToast(null)}
                    className="text-zinc-900 hover:text-black font-bold p-1 text-sm hidden sm:block"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* 🔝 ТОЛГОЙ БА ШУУРХАЙ ТОХИРГОО */}
            <div className="shrink-0 space-y-2">
              {/* 🔝 1-Р ЭГНЭЭ: АЖИЛТАН ТУСДАА + 3 АВСААРХАН ТОВЧ */}
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800/80 mb-3 px-1">
                {/* 👤 Ажилтан тусдаа тод статус пайзтай */}

                <div className="flex items-center gap-2 bg-zinc-900  rounded-xl shadow-inner">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className=" absolute inline-flex h-full w-full rounded-full bg-zinc-200 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate max-w-[100px] sm:max-w-[150px]">
                    {selectedWorker?.full_name ||
                      selectedWorker?.email.split("@")[0]}
                  </span>
                </div>

                {/* Авсаархан 3 товч (Үгсийг богиносгосон) */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      fetchTodayLogs();
                      setShowLogsDrawer(true);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span className="hidden min-[360px]:inline">Түүх</span>
                    <span>({todayLogs.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRecipeModal(true);
                      setSelectedProductRecipe(null);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="hidden min-[360px]:inline">Жор</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("ai_chat")}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    <span className="hidden min-[360px]:inline">Чат</span>
                  </button>
                </div>
              </div>

              {/* 4 ГОРИМ: Хаягдал / Хоол / Туршилт / Орлого */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800/80">
                
                 {/* 5. ТОOЛОХ (Нэмэх) */}
          <button
            type="button"
            onClick={() => setKioskMode("count")}
            className={`py-2 sm:py-2.5 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              kioskMode === "count"
                ? "bg-white text-zinc-950 font-black shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ListOrdered className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-xs font-bold leading-none">
              {lang === "mn" ? "Тоолох" : "Count"}
            </span>
          </button>
                {/* ХАЯГДАЛ */}
                <button
                  type="button"
                  onClick={() => setKioskMode("spoilage")}
                  className={`py-2 sm:py-2.5 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                    kioskMode === "spoilage"
                      ? "bg-white text-zinc-950 font-black shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-xs font-bold leading-none">
                    {UI_TEXT[lang].spoilage}
                  </span>
                </button>

                {/* ХООЛ */}
                <button
                  type="button"
                  onClick={() => setKioskMode("staff_meal")}
                  className={`py-2 sm:py-2.5 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                    kioskMode === "staff_meal"
                      ? "bg-white text-zinc-950 font-black shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Utensils className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-xs font-bold leading-none">
                    {UI_TEXT[lang].meal}
                  </span>
                </button>

                {/* ТУРШИЛТ */}
                <button
                  type="button"
                  onClick={() => setKioskMode("testing")}
                  className={`py-2 sm:py-2.5 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                    kioskMode === "testing"
                      ? "bg-white text-zinc-950 font-black shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Beaker className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-xs font-bold leading-none">
                    {UI_TEXT[lang].test}
                  </span>
                </button>

                {/* ОРЛОГО */}
                <button
                  type="button"
                  onClick={() => setKioskMode("purchase")}
                  className={`py-2 sm:py-2.5 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                    kioskMode === "purchase"
                      ? "bg-white text-zinc-950 font-black shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Package className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-xs font-bold leading-none">
                    {UI_TEXT[lang].purchase}
                  </span>
                </button>
              </div>
            </div>

            {/* 📦 1. ОЛОН БАРААТАЙ E-BARIMT УНШУУЛАХ КАРТ */}
    {kioskMode === "purchase" && (
  <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl my-2 shrink-0 flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>Олон бараатай E-Barimt уншуулах</span>
                  </h4>
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
                        const { file: compressedFile, base64 } =
                          await compressImageForUpload(rawFile);

                        try {
                          const tokens = kioskTokens();
                          const res = await fetch("/api/kiosk-ai", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "x-kiosk-device": tokens.deviceToken,
                              "x-kiosk-worker": tokens.workerToken,
                            },
                            body: JSON.stringify({ imageBase64: base64 }),
                          });
                          const data = await res.json();
                          setIsScanningReceipt(false);

                          if (data.success && data.purchases) {
                            setEbarimtReview({
                              file: compressedFile, // 👈 Жижигхэн шахсан файлыг хадгалалтад бэлдэнэ
                              previewUrl: URL.createObjectURL(compressedFile),
                              items: data.purchases,
                              payMethod: "bank",
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
                    className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1 active:scale-95 shadow"
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
                          const base64 = (reader.result as string).split(
                            ",",
                          )[1];
                          try {
                            const tokens = kioskTokens();
                            const res = await fetch("/api/kiosk-ai", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "x-kiosk-device": tokens.deviceToken,
                                "x-kiosk-worker": tokens.workerToken,
                              },
                              body: JSON.stringify({ imageBase64: base64 }),
                            });
                            const data = await res.json();
                            setIsScanningReceipt(false); // 👈 Уншиж дуусмагц сканнерыг хаах

                            if (data.success && data.purchases) {
                              setEbarimtReview({
                                file: file,
                                previewUrl: URL.createObjectURL(file),
                                items: data.purchases,
                                payMethod: "bank",
                              });
                            } else {
                              alert(
                                data.message || "Баримтыг уншиж чадсангүй.",
                              );
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
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-2.5 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1 active:scale-95 border border-zinc-700"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Цомог</span>
                  </label>
                </div>
              </div>
            )}

{kioskMode === "count" ? (
  /* ⚡ ХУРДАН ТООЛЛОГЫН ХҮСНЭГТ (DASHBOARD ШИГ ШУУД ШИВЭХ) */
  <div className="flex-1 min-h-0 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden p-2">
    <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
      <span className="text-xs font-bold text-zinc-400">Бодит тоогоо бичээд "Хадгалах" дарна уу:</span>
      <button
        type="button"
        onClick={handleKioskBulkSave}
        disabled={isAiLoading || Object.keys(kioskBulkStock).length === 0}
        className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-1.5 rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-40"
      >
        {isAiLoading ? "Хадгалж байна..." : "✓ Хадгалах"}
      </button>
    </div>

    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 pr-1">
      {ingredients
        .filter((ing) => !kioskSearch || tName(ing.name).toLowerCase().includes(kioskSearch.toLowerCase().trim()))
        .map((ing) => (
          <div key={ing.id} className="py-2 flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-sm text-white block">{tName(ing.name)}</span>
              <span className="text-xs text-zinc-500 font-mono">Нэгж: {tUnit(ing.unit)}</span>
            </div>
            <input
              type="number"
              step="any"
              placeholder="Тоо..."
              value={kioskBulkStock[ing.id] ?? ""}
              onChange={(e) => setKioskBulkStock({ ...kioskBulkStock, [ing.id]: e.target.value })}
              className="w-24 bg-zinc-900 border border-zinc-700 focus:border-white rounded-xl py-1.5 px-2 text-right text-white font-mono font-black text-sm outline-none"
            />
          </div>
        ))}
    </div>
  </div>
) : (
 <>
   {/*  А-CLASS БАРААНУУД БА ХАЙЛТ */}
            <div className="flex-1 min-h-0 my-1 flex flex-col overflow-hidden">
              <div className="pb-1.5 shrink-0">
                <input
                  type="text"
                  value={kioskSearch}
                  onChange={(e) => setKioskSearch(e.target.value)}
                  placeholder="Бараа хайх (нэг товшилтоор бүртгэнэ)..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700"
                />
                {/* ➕ ХЭРЭВ БААЗАД БАЙХГҮЙ БАРАА ХАЙВАЛ ШУУД НЭМЭХ ТОВЧ ГАРНА */}
                {kioskSearch.trim() &&
                  !ingredients.some((i) => {
                    const q = kioskSearch.toLowerCase().trim();
                    return tName(i.name).toLowerCase().trim() === q; // 👈 Зөвхөн идэвхтэй хэлээрээ шалгана
                  }) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewItemName(kioskSearch.trim());
                        setNewItemQty("");
                        setNewItemCost("");
                        setNewItemFile(null);
                        setShowAddNewItemModal(true);
                      }}
                      className="w-full bg-zinc-800/60 hover:bg-zinc-800 border-2 border-dashed border-zinc-700/40 text-zinc-200 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Шинэ түүхий эд: "{kioskSearch.trim()}" үүсгэх</span>
                    </button>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-max">
                {ingredients
                  .filter((ing) => {
                    if (kioskSearch.trim()) {
                      const q = kioskSearch.toLowerCase().trim();
                      // 💡 Зөвхөн тухайн сонгосон хэлнийхээ (MN эсвэл EN) нэрээр л хайна!
                      return tName(ing.name).toLowerCase().includes(q);
                    }
                    return true;
                  })

                  .sort((a, b) => {
                    if (a.is_critical && !b.is_critical) return -1;
                    if (!a.is_critical && b.is_critical) return 1;
                    return (
                      (parseFloat(b.current_stock) || 0) -
                      (parseFloat(a.current_stock) || 0)
                    );
                  })
                  .slice(0, 15)
                  .map((ing) => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => {
                        setQuickItemModal(ing);
                        setQuickQty("");
                        setPurchaseCost("");
                      }}
                      className="bg-zinc-950 hover:bg-zinc-800 active:scale-95 border border-zinc-800 hover:border-zinc-700 p-3 rounded-2xl flex flex-col justify-between text-left transition shadow-sm min-h-[80px]"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug">
                          {tName(ing.name)}
                        </span>
                        {ing.is_critical && (
                          <span className="text-[11px] font-black bg-zinc-800 text-zinc-300 border border-zinc-700 px-1 py-0.2 rounded shrink-0">
                            ★ A
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-zinc-400 font-medium">
                          {tUnit(ing.unit)}
                        </span>
                        <span
                          className={`text-[11px] font-black uppercase px-1.5 py-0.5 rounded ${
                            kioskMode === "spoilage"
                              ? "bg-rose-500/10 text-rose-400"
                              : kioskMode === "staff_meal"
                                ? "bg-zinc-800/60 text-zinc-300"
                                : kioskMode === "testing"
                                  ? "bg-zinc-800/60 text-zinc-300"
                                  : "bg-zinc-800/60 text-zinc-200"
                          }`}
                        >
                          {kioskMode === "spoilage"
                            ? "Хасах"
                            : kioskMode === "staff_meal"
                              ? "Хоол"
                              : kioskMode === "testing"
                                ? "Туршилт"
                                : "Нэмэх"}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
 </>
)}

          

            {/* 🔘 ДООД 3 ТОМ ТОВЧ: Даалгавар / Мөнгө гаргах / Ээлж хаах */}
            <div className="grid grid-cols-3 gap-1.5 pt-1.5 shrink-0 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={openTasksScreen}
                className="p-2.5 bg-zinc-800/60 hover:bg-zinc-800 active:scale-95 rounded-2xl border border-zinc-800/30 text-zinc-300 font-black text-xs flex flex-col items-center justify-center gap-1 transition cursor"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Даалгавар</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCashOutModal(true);
                  setCashOutAmount("");
                  setCashOutNote("");
                  setCashOutFile(null);
                }}
                className="p-2.5 bg-zinc-800/60 hover:bg-zinc-800 active:scale-95 rounded-2xl border border-zinc-800 text-zinc-300 font-black text-xs flex flex-col items-center justify-center gap-1 transition"
              >
                <Banknote className="h-4 w-4" />
                <span>Мөнгө гаргах</span>
              </button>

              <button
                type="button"
                onClick={loadInventoryToCount}
                className="p-2.5 bg-zinc-800/60 hover:bg-zinc-800 active:scale-95 rounded-2xl border border-zinc-800 text-zinc-200 font-black text-xs flex flex-col items-center justify-center gap-1 transition"
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
                  className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-zinc-800/60 p-2 rounded-xl border border-zinc-700/20">
                        <BookOpen className="h-5 w-5 text-zinc-200" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base">
                          Стандарт Жор & Заавар (SOP)
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Хэнээс ч асуухгүйгээр жороо яг граммаар нь хийнэ үү
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRecipeModal(false)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      ✕ Хаах
                    </button>
                  </div>

                  {/* Бүтээгдэхүүн сонгох хэсэг */}
                 {/* Бүтээгдэхүүн сонгох хэсэг */}
                  {!selectedProductRecipe ? (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {/* 🔍 ХАЙЛТЫН ТАЛБАР */}
                      <input
                        type="text"
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        placeholder="Цэс, жорын нэрээр хайх..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none transition"
                      />

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {Array.from(
                          new Set(recipesList.map((r: any) => r.product_name)),
                        )
                          .filter((pName: any) =>
                            !recipeSearch.trim() ||
                            pName.toLowerCase().includes(recipeSearch.toLowerCase().trim())
                          )
                          .map((pName: any) => (
                            <button
                              key={pName}
                              type="button"
                              onClick={() => {
                                setSelectedProductRecipe(pName);
                                setRecipeSearch("");
                              }}
                              className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 p-3 rounded-2xl text-left font-bold text-xs text-white flex justify-between items-center active:scale-95 transition cursor-pointer"
                            >
                              <span className="truncate pr-1">{pName}</span>
                              <span className="text-zinc-400 text-xs shrink-0">➔</span>
                            </button>
                          ))}
                      </div>

                      {/* Илэрц олдоогүй үед */}
                      {recipeSearch.trim() &&
                        Array.from(new Set(recipesList.map((r: any) => r.product_name)))
                          .filter((pName: any) =>
                            pName.toLowerCase().includes(recipeSearch.toLowerCase().trim())
                          ).length === 0 && (
                          <p className="text-xs text-zinc-500 italic text-center py-8">
                            "{recipeSearch}" нэртэй жор олдсонгүй.
                          </p>
                        )}
                    </div>
                  )  : (
                    /* Сонгосон жорын орцын задаргаа */
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                        <div>
                          <span className="text-xs text-zinc-200 font-bold uppercase tracking-wider">
                            Сонгосон Жор:
                          </span>
                          <h4 className="text-base font-black text-white">
                            {selectedProductRecipe}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProductRecipe(null)}
                          className="text-xs text-zinc-400 hover:text-white underline font-bold cursor-pointer"
                        >
                          ← Бусад цэс
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Орц, хэмжээ (Граммаар):
                        </p>
                        <div className="divide-y divide-slate-800/80 bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                          {recipesList
                            .filter(
                              (r: any) =>
                                r.product_name === selectedProductRecipe,
                            )
                            .map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-3 text-xs"
                              >
                                <span className="font-bold text-zinc-200">
                                  {tName(item.ingredients?.name || "Орц")}
                                </span>
                                <span className="font-mono font-black text-zinc-200 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-700/20">
                                  {item.amount}{" "}
                                  {tUnit(item.ingredients?.unit || "гр/мл")}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-zinc-800/60 border border-zinc-700/20 p-3 rounded-2xl text-xs text-zinc-300 space-y-1">
                        <p className="font-bold">💡 Санамж:</p>
                        <p>
                          Дээрх граммыг яг баримталснаар кофены амт үргэлж
                          стандартын дагуу 100% жигд гарна.
                        </p>
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
                  className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 w-full max-w-sm shadow-2xl space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-zinc-100" />
                      <span>Касснаас Бэлэн Мөнгө Гаргах</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCashOutModal(false)}
                      className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-xl text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                    {/* 👑 ЭЗНИЙ ТАТАЛТ (Яг голдоо тэгшхэн байрлана) */}
                    <button
                      type="button"
                      onClick={() => setCashOutType("owner_draw")}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                        cashOutType === "owner_draw"
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Crown className="h-4 w-4 shrink-0" />
                      <span>Эзний таталт</span>
                    </button>

                    {/* 🧾 ЖИЖИГ ЗАРДАЛ (Яг голдоо тэгшхэн байрлана) */}
                    <button
                      type="button"
                      onClick={() => setCashOutType("petty_cash")}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                        cashOutType === "petty_cash"
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Receipt className="h-4 w-4 shrink-0" />
                      <span>Жижиг зардал (CU)</span>
                    </button>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-center">
                    <span className="text-3xl font-black text-white font-mono">
                      {cashOutAmount
                        ? Number(cashOutAmount).toLocaleString()
                        : "0"}
                    </span>
                    <span className="ml-1 text-sm font-bold text-zinc-300">
                      ₮
                    </span>
                  </div>

                  <input
                    type="text"
                    value={cashOutNote}
                    onChange={(e) => setCashOutNote(e.target.value)}
                    placeholder={
                      cashOutType === "owner_draw"
                        ? "Тайлбар (Захирал хувийн хэрэгцээнд авсан)"
                        : "Юу авсан бэ? (Саван, уут)"
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-amber-500"
                  />

                  {cashOutType === "petty_cash" && (
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="petty-cash-receipt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setCashOutFile(e.target.files[0]);
                        }}
                      />
                      <label
                        htmlFor="petty-cash-receipt"
                        className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-zinc-300 hover:border-zinc-700 transition"
                      >
                        <Camera className="h-4 w-4 text-zinc-300" />
                        <span>
                          {cashOutFile
                            ? ` ${cashOutFile.name.substring(0, 18)}...`
                            : "Баримт/Барааны зураг заавал дарах"}
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "000",
                      "0",
                    ].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setCashOutAmount((prev) => prev + digit)}
                        className="bg-zinc-950 hover:bg-zinc-800 active:scale-95 text-white font-black text-lg py-2.5 rounded-2xl border border-zinc-800 transition"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setCashOutAmount((prev) => prev.slice(0, -1))
                      }
                      className="bg-rose-500/10 text-rose-400 font-bold text-xs py-2.5 rounded-2xl border border-rose-500/20 active:scale-95 flex items-center justify-center"
                    >
                      ← Засах
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !cashOutAmount ||
                      parseFloat(cashOutAmount) <= 0 ||
                      (cashOutType === "petty_cash" && !cashOutFile) ||
                      isAiLoading
                    }
                    onClick={() => {
                      const amount = parseFloat(cashOutAmount);
                      const fileToUpload = cashOutFile;
                      const typeToSave = cashOutType;
                      const noteToSave = cashOutNote;

                      // ⚡ 1. ЦОНХ ТЭР ДОРОО АЛГА БОЛНО (0 миллисекунд!)
                      setCashOutModal(false);
                      setCashOutAmount("");
                      setCashOutNote("");
                      setCashOutFile(null);

                      // ⚡ 2. ДЭЭД ТАЛД МЭДЭЭЛЭЛ ШУУД ГАРНА
                      setRecentToast({
                        id: "temp-" + Date.now(),
                        text: `💵 Касснаас гарсан: ${amount.toLocaleString()}₮ (${typeToSave === "owner_draw" ? "Эзний таталт" : "Жижиг зардал"})`,
                      });

                      // ⚡ 3. ЗУРАГ БА ДАТАГ ЦААНА НЬ ЧИМЭЭГҮЙ ХАДГАЛАХ (Background)
                      (async () => {
                        try {
                          let uploadedImg = null;
                          if (fileToUpload)
                            uploadedImg = await uploadEvidencePhoto(
                              fileToUpload,
                              "petty_cash",
                            );

                          const noteText =
                            typeToSave === "owner_draw"
                              ? `Эзний хувийн таталт (Cash Draw): ${noteToSave || "Бэлнээр авсан"}`
                              : `Жижиг зардал (Petty Cash): ${noteToSave || "Ахуйн хэрэгсэл"}`;

                          const saved = await kioskSaveLogs([
                            {
                              ingredient_id: null,
                              non_food_item:
                                typeToSave === "owner_draw"
                                  ? "Эзний таталт"
                                  : noteToSave || "Ахуйн зардал",
                              quantity: 1,
                              total_cost: amount,
                              type: typeToSave === "owner_draw" ? "other" : "purchase",
                              payment_method: "cash",
                              notes: noteText,
                              image_url: uploadedImg,
                              is_food: false,
                            },
                          ]);
                          const newId = saved.ids?.[0];
                          if (newId) {
                            setRecentToast({
                              id: newId,
                              text: `💵 Касснаас гарсан: ${amount.toLocaleString()}₮ (${typeToSave === "owner_draw" ? "Эзний таталт" : "Жижиг зардал"})`,
                            });
                          }
                        } catch (e: any) {
                          alert(e.message || "Кассын бүртгэл хадгалагдсангүй.");
                        }
                      })();
                    }}
                    className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95"
                  >
                    {isAiLoading
                      ? "Хадгалж байна..."
                      : cashOutType === "petty_cash" && !cashOutFile
                        ? "ЗУРАГ ДАРНА УУ"
                        : "МӨНГӨ ГАРГАХЫГ БАТЛАХ"}
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
                  className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 w-full max-w-sm shadow-2xl space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <div>
                      <span
                        className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                          kioskMode === "spoilage"
                            ? "bg-rose-500/20 text-rose-400"
                            : kioskMode === "staff_meal"
                              ? "bg-zinc-200/20 text-zinc-300"
                              : kioskMode === "testing"
                                ? "bg-zinc-800/60 text-zinc-300"
                                : "bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        {kioskMode === "spoilage"
                          ? "🗑️ Хаягдал бүртгэх"
                          : kioskMode === "staff_meal"
                            ? "🍽️ Ажилтны хоолонд"
                            : kioskMode === "testing"
                              ? "🧪 Туршилт / Тохируулга"
                              : "📦 Орлого авах"}
                      </span>
                      <h3 className="text-base font-black text-white mt-1">
                        {quickItemModal.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickItemModal(null)}
                      className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-xl text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

         {/* 1. ТОO ХЭМЖЭЭ (Хуруугаараа хүссэн тоон дээрээ дарж Cursor аваачна) */}
                  <div 
                    onClick={() => {
                      setNumpadTarget("qty");
                      qtyInputRef.current?.focus({ preventScroll: true });
                    }}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition select-none ${
                      numpadTarget === "qty" 
                        ? "bg-zinc-900 border-white shadow-sm ring-1 ring-white/20" 
                        : "bg-zinc-950 border-zinc-800 opacity-60"
                    }`}
                  >
                    <span className="text-xs text-zinc-400 font-bold uppercase block mb-0.5">
                      Тоо хэмжээ ({quickItemModal.unit}):
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        ref={qtyInputRef}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        value={quickQty}
                        onFocus={() => setNumpadTarget("qty")}
                        onChange={(e) => setQuickQty(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-2xl sm:text-3xl font-black text-white font-mono text-center outline-none cursor-text tracking-wider caret-emerald-400 selection:bg-zinc-700"
                      />
                      <span className="text-xs font-bold text-zinc-400 shrink-0">
                        {quickItemModal.unit}
                      </span>
                    </div>
                  </div>

                  {/* 2. НИЙТ ҮНЭ (Хуруугаараа хүссэн тоон дээрээ дарж Cursor аваачна) */}
                  {kioskMode === "purchase" && (
                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      <div 
                        onClick={() => {
                          setNumpadTarget("cost");
                          costInputRef.current?.focus({ preventScroll: true });
                        }}
                        className={`p-3 rounded-2xl border text-center cursor-pointer transition select-none ${
                          numpadTarget === "cost" 
                            ? "bg-zinc-900 border-white shadow-sm ring-1 ring-white/20" 
                            : "bg-zinc-950 border-zinc-800 opacity-60"
                        }`}
                      >
                        <span className="text-xs text-zinc-400 font-bold uppercase block mb-0.5">
                          Нийт төлсөн үнэ (₮):
                        </span>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            ref={costInputRef}
                            type="text"
                            inputMode="none"
                            autoComplete="off"
                            value={purchaseCost}
                            onFocus={() => setNumpadTarget("cost")}
                            onChange={(e) => setPurchaseCost(e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent text-2xl sm:text-3xl font-black text-white font-mono text-center outline-none cursor-text tracking-wider caret-emerald-400 selection:bg-zinc-700"
                          />
                          <span className="text-sm font-bold text-zinc-400 shrink-0">₮</span>
                        </div>
                      </div>

                      {/* Үнийн өсөлт / бууралтын дохио */}
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
                              <div className="bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl text-center">
                                <span className="text-xs font-black text-rose-400">
                                  🔺 ҮНЭ ӨССӨН: {oldPrice.toLocaleString()}₮ ➔ {currentUnitPrice.toLocaleString()}₮ (+{pct}%)
                                </span>
                              </div>
                            );
                          } else if (diff < 0) {
                            return (
                              <div className="bg-zinc-800/60 border border-zinc-800 p-2 rounded-xl text-center">
                                <span className="text-xs font-black text-zinc-200">
                                  🟢 ҮНЭ ХЯМДАРСАН: {oldPrice.toLocaleString()}₮ ➔ {currentUnitPrice.toLocaleString()}₮ ({pct}%)
                                </span>
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}

                      {/* Камер ба Зураг авах хэсэг */}
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            id="single-pur-cam"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) setNoEbarimtFile(e.target.files[0]);
                            }}
                          />
                          <label
                            htmlFor="single-pur-cam"
                            className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-zinc-300 transition"
                          >
                            <Camera className="h-4 w-4 text-zinc-200" />
                            <span>Камер</span>
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            id="single-pur-gallery"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) setNoEbarimtFile(e.target.files[0]);
                            }}
                          />
                          <label
                            htmlFor="single-pur-gallery"
                            className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-zinc-300 transition"
                          >
                            <ImageIcon className="h-4 w-4 text-zinc-200" />
                            <span>Цомог</span>
                          </label>
                        </div>

                        <p className={`text-xs font-bold text-center ${noEbarimtFile ? "text-zinc-200" : "text-rose-400"}`}>
                          {noEbarimtFile
                            ? `✅ Зураг бэлэн: ${noEbarimtFile.name.substring(0, 15)}...`
                            : "⚠️ Баримт эсвэл барааны зургийг заавал хийнэ үү!"}
                        </p>
                      </div>
                    </div>
                  )}

              {/* ⚡ ХУРДАН ХЭРЭГСЛҮҮД: [ C Арилгах ] болон [ Дараах: Үнэ ➔ ] */}
                  <div className="flex items-center justify-between gap-2 pt-1 pb-1">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        handleClearAll();
                      }}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 active:scale-95 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700/60 transition cursor-pointer flex items-center gap-1.5 touch-manipulation select-none"
                    >
                      <span className="font-mono font-black text-rose-400">C</span>
                      <span className="text-[11px] text-zinc-400">Бүгдийг арилгах</span>
                    </button>

                    {/* Хэрэв Орлого горимд байвал автоматаар ҮНЭ рүү шилжих товч */}
                    {kioskMode === "purchase" && (
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          triggerHaptic(10);
                          if (numpadTarget === "qty") {
                            setNumpadTarget("cost");
                            costInputRef.current?.focus({ preventScroll: true });
                          } else {
                            setNumpadTarget("qty");
                            qtyInputRef.current?.focus({ preventScroll: true });
                          }
                        }}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 active:scale-95 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700 transition cursor-pointer flex items-center gap-1.5 touch-manipulation select-none"
                      >
                        <span>{numpadTarget === "qty" ? "Дараах: Үнэ ➔" : "Буцах: Хэмжээ ➔"}</span>
                      </button>
                    )}
                  </div>

                  {/* 🔢 ДЭЛГЭЦИЙН ТОМ ТООВЧЛУУР (Хуруу хүрэхэд шууд 0ms-д бичнэ + Чичирнэ) */}
                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleFastInsert(digit);
                        }}
                        className="bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-800 active:scale-95 text-white font-black text-xl py-2.5 rounded-2xl border border-zinc-800 transition-transform cursor-pointer select-none touch-manipulation"
                      >
                        {digit}
                      </button>
                    ))}

                    {/* ← Засах товч (ДАРЖ БАЙВАЛ ЗОГСОЛТГҮЙ ХУРДАН АРИЛГАНА) */}
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startContinuousDelete();
                      }}
                      onPointerUp={stopContinuousDelete}
                      onPointerLeave={stopContinuousDelete}
                      onPointerCancel={stopContinuousDelete}
                      className="bg-rose-500/10 active:bg-rose-500/25 text-rose-400 font-bold text-sm py-2.5 rounded-2xl border border-rose-500/20 active:scale-95 flex items-center justify-center cursor-pointer select-none touch-manipulation"
                    >
                      ← Засах
                    </button>
                  </div>
                  {/*  УХААЛАГ БАТЛАХ ТОВЧ (Дарахад автоматаар камер нээгдэнэ) */}
                  <button
                    type="button"
                    disabled={
                      !quickQty ||
                      parseFloat(quickQty) <= 0 ||
                      (kioskMode === "purchase" &&
                        (!purchaseCost || parseFloat(purchaseCost) <= 0)) ||
                      isAiLoading
                    }
                 onClick={() => {
  const costVal = parseFloat(purchaseCost) || 0;

  // 💡 1. 10,000₮ давсан мөртлөө зураггүй бол ДАРМАГЦ КАМЕР ШУУД НЭЭГДЭНЭ! (Таны бичсэнээр хэвээрээ)
  if (
    kioskMode === "purchase" &&
    costVal >= 10000 &&
    !noEbarimtFile
  ) {
    document.getElementById("single-pur-cam")?.click();
    return; // Зураг дартал хадгалахгүй түр хүлээнэ
  }

  const qtyNum = parseFloat(quickQty);
  
  // ⚡ 2. Тооллого болон Орлого бол заавал ЭЕРЭГ (+), хаягдал бол ХАСАХ (-):
  const finalQty =
    kioskMode === "purchase" || kioskMode === "count"
      ? Math.abs(qtyNum)
      : -Math.abs(qtyNum);

  const itemToSave = quickItemModal;
  const fileToUpload = noEbarimtFile;
  const payMethod = purchasePayMethod;

  setQuickItemModal(null);
  setQuickQty("");
  setPurchaseCost("");
  setNoEbarimtFile(null);

  // 🏷️ 3. Бүх 5 горимын нэршил (Таны бичсэнээр хэвээрээ):
  const modeLabel =
    kioskMode === "spoilage"
      ? "Хаягдал"
      : kioskMode === "staff_meal"
        ? "Хоол"
        : kioskMode === "testing"
          ? "Туршилт"
          : kioskMode === "count"
            ? "Тооллого"
            : "Орлого";

  (async () => {
    try {
      let uploadedUrl = null;
      if (kioskMode === "purchase" && fileToUpload) {
        uploadedUrl = await uploadEvidencePhoto(
          fileToUpload,
          "purchases_proofs",
        );
      }

      const saved = await kioskSaveLogs([
        {
          ingredient_id: itemToSave.id,
          quantity: finalQty,
          total_cost: costVal,
          type: kioskMode,
          payment_method: kioskMode === "purchase" ? payMethod : null,
          image_url: uploadedUrl,
          is_ebarimt: false,
          incident_type: kioskMode === "count" ? "kiosk_count" : null,
          notes: kioskMode === "count" ? `Kiosk тооллого: ${itemToSave.name}` : `Kiosk (${modeLabel})`,
          input_unit: itemToSave.unit,
        },
      ]);
      const newId = saved.ids?.[0];
      if (newId) {
        setRecentToast({
          id: newId,
          text: `${itemToSave.name}: ${qtyNum} ${itemToSave.unit} (${costVal > 0 ? costVal.toLocaleString() + "₮" : modeLabel})`,
        });
        fetchKioskData(tenantClientId);
      }
    } catch (err: any) {
      alert(`❌ Серверийн алдаа: ${err.message || err}`);
      console.error("Background save failed:", err);
    }
  })();
}}
                    className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3.5 rounded-2xl text-[13px] sm:text-sm transition shadow-lg active:scale-95"
                       >
                    {isAiLoading
                      ? "Хадгалж байна..."
                      : kioskMode === "purchase" &&
                          (parseFloat(purchaseCost) || 0) >= 10000 &&
                          !noEbarimtFile
                        ? "ЗУРАГ ДАРЖ БАТЛАХ"
                        : kioskMode === "purchase" && !noEbarimtFile
                          ? "БАТЛАХ (Зураггүй оруулах)"
                          : "БАТЛАХ (OK)"}
                  </button>
                  {/* 🛒 ШИНЭ: САГСАНД НЭМЭХ ТОВЧ (Зөвхөн Орлого горимд гарна) */}
                  {kioskMode === "purchase" && (
                    <button
                      type="button"
                      disabled={
                        !quickQty ||
                        parseFloat(quickQty) <= 0 ||
                        !purchaseCost ||
                        parseFloat(purchaseCost) <= 0
                      }
                      onClick={() => {
                        setPurchaseCart((prev) => [
                          ...prev,
                          {
                            ing_id: quickItemModal.id,
                            name: quickItemModal.name,
                            unit: quickItemModal.unit,
                            qty: parseFloat(quickQty),
                            cost: parseFloat(purchaseCost),
                          },
                        ]);
                        setQuickItemModal(null);
                        setQuickQty("");
                        setPurchaseCost("");
                        setNoEbarimtFile(null);
                      }}
                      className="w-full bg-zinc-800/60 hover:bg-zinc-200/20 disabled:opacity-40 text-zinc-300 border border-zinc-800 font-black py-3 rounded-2xl text-[13px] sm:text-sm transition active:scale-95 mt-2"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span> САГСАНД ХАДГАЛАХ (Бөөнд нь зураг дарах)</span>
                      </span>
                    </button>
                  )}
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
                  className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 w-full max-w-md shadow-2xl space-y-3 max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Толгой хэсэг */}
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-1.5">
                        <span>🧾 E-Barimt Шалгах</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        AI-ийн таньсан тоо, үнийг шалгаж засна уу
                      </p>
                    </div>
                    {/* ЦУЦЛАХ ТОВЧ (Баазад юу ч хадгалагдахгүй, цэвэрхэн хаагдана) */}
                    <button
                      type="button"
                      onClick={() => setEbarimtReview(null)}
                      className="bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-xl text-xs font-bold text-zinc-300"
                    >
                      ✕ Цуцлах
                    </button>
                  </div>

                  {/* Эх баримтын зургийн thumbnail */}
                  <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800 shrink-0">
                    <img
                      src={ebarimtReview.previewUrl}
                      alt="Receipt"
                      className="h-12 w-12 object-cover rounded-xl border border-zinc-700 shrink-0"
                    />
                    <div className="text-xs">
                      <span className="text-zinc-200 font-bold block">
                        Баримтын эх зураг бэлэн
                      </span>
                      <span className="text-zinc-400">
                        Нийт {ebarimtReview.items.length} бараа илэрсэн
                      </span>
                    </div>
                  </div>

                  {/* Төлбөрийн хэлбэр сонгох */}
                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setEbarimtReview({
                          ...ebarimtReview,
                          payMethod: "bank",
                        })
                      }
                      className={`py-1.5 rounded-xl text-xs font-bold transition ${
                        ebarimtReview.payMethod === "bank"
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "bg-zinc-950 text-zinc-400"
                      }`}
                    >
                      💳 Банк / Дансаар
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEbarimtReview({
                          ...ebarimtReview,
                          payMethod: "cash",
                        })
                      }
                      className={`py-1.5 rounded-xl text-xs font-bold transition ${
                        ebarimtReview.payMethod === "cash"
                          ? "bg-white text-zinc-950 font-black shadow-sm"
                          : "bg-zinc-950 text-zinc-400"
                      }`}
                    >
                      💵 Кассын бэлнээр
                    </button>
                  </div>

                  {/* ✏️ ТАНЬСАН БАРААНУУДЫН ЖАГСААЛТ (ШУУД ЗАСАХ БОЛОМЖТОЙ) */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/80">
                    {ebarimtReview.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="pt-2 flex justify-between items-center gap-2 text-xs"
                      >
                        {/* Буруу уншсан барааг устгах [✕] товч */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = ebarimtReview.items.filter(
                              (_, i) => i !== idx,
                            );
                            setEbarimtReview({
                              ...ebarimtReview,
                              items: updated,
                            });
                          }}
                          className="text-rose-400 hover:text-rose-300 font-black p-1 text-sm shrink-0"
                          title="Энэ барааг хасах"
                        >
                          ✕
                        </button>

                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-white block truncate">
                            {item.item_name}
                          </span>
                          {item.is_food !== false && (
                            <select
                              value={item.ingredient_id || matchIngredient(item.item_name)?.id || ""}
                              onChange={(e) => {
                                const updated = [...ebarimtReview.items];
                                updated[idx] = { ...updated[idx], ingredient_id: e.target.value };
                                setEbarimtReview({ ...ebarimtReview, items: updated });
                              }}
                              className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-200"
                            >
                              <option value="">Аль орц вэ?</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>{ing.name}</option>
                              ))}
                            </select>
                          )}
                          {/* Нийт үнийг засах input */}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-zinc-500">Үнэ:</span>
                            <input
                              type="number"
                              value={item.total_cost || ""}
                              onChange={(e) => {
                                const newCost = parseFloat(e.target.value) || 0;
                                const updated = [...ebarimtReview.items];
                                updated[idx].total_cost = newCost;
                                setEbarimtReview({
                                  ...ebarimtReview,
                                  items: updated,
                                });
                              }}
                              className="w-20 bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-zinc-200 font-mono text-xs outline-none"
                            />
                            <span className="text-xs text-zinc-500">₮</span>
                          </div>
                        </div>

                        {/* Тоо ширхэгийг засах input */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-zinc-500">Тоо:</span>
                          <input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => {
                              const newQty = parseFloat(e.target.value) || 0;
                              const updated = [...ebarimtReview.items];
                              updated[idx].quantity = newQty;
                              setEbarimtReview({
                                ...ebarimtReview,
                                items: updated,
                              });
                            }}
                            className="w-14 bg-zinc-950 border border-zinc-700 rounded-lg py-1 text-center text-white font-bold text-xs outline-none focus:border-zinc-700"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Нийт дүн */}
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center text-xs shrink-0">
                    <span className="text-zinc-400 font-medium">
                      Нийт баримтын дүн:
                    </span>
                    <span className="font-mono font-black text-zinc-200 text-sm">
                      {ebarimtReview.items
                        .reduce((sum, it) => sum + (it.total_cost || 0), 0)
                        .toLocaleString()}{" "}
                      ₮
                    </span>
                  </div>

                  {/*  БАТЛАХ ТОВЧ (ДАРСНЫ ДАРАА САЯ БААЗАД ОРЖ, UNDO БОЛОМЖТОЙ БОЛНО) */}
                  <button
                    type="button"
                    disabled={isAiLoading || ebarimtReview.items.length === 0}
                    onClick={() => {
                      const reviewData = ebarimtReview;
                      const unresolved = reviewData.items.find(
                        (it) => it.is_food !== false && !(it.ingredient_id || matchIngredient(it.item_name)?.id),
                      );
                      if (unresolved) {
                        alert(`"${unresolved.item_name}" аль орц болохыг сонгоно уу.`);
                        return;
                      }

                      setEbarimtReview(null);

                      // ⚡ 2. ДЭЭД ТАЛД TOAST МЭДЭЭЛЭЛ ШУУД ГАРНА
                      setRecentToast({
                        id: "temp-" + Date.now(),
                        text: `⚡ ${reviewData.items.length} бараа E-Barimt-аар хадгалагдаж байна...`,
                      });

                      // ⚡ 3. ЗУРАГ БА ЛОГИЙГ ЦААНА НЬ ЧИМЭЭГҮЙ ХАДГАЛАХ
                      (async () => {
                        try {
                          const uploadedImgUrl = await uploadEvidencePhoto(
                            reviewData.file,
                            "receipts_evidence",
                          );

                          const logsToInsert = reviewData.items.map((it) => {
                            const isFood = it.is_food !== false;
                            const matchedIng = isFood
                              ? ingredients.find((ing) => ing.id === (it.ingredient_id || matchIngredient(it.item_name)?.id))
                              : null;
                            return {
                              ingredient_id: matchedIng ? matchedIng.id : null,
                              non_food_item: matchedIng ? null : it.item_name,
                              quantity: Math.abs(it.quantity),
                              total_cost: it.total_cost || 0,
                              type: "purchase",
                              payment_method: reviewData.payMethod,
                              image_url: uploadedImgUrl,
                              is_ebarimt: true,
                              is_food: isFood,
                              input_unit: it.unit || null,
                              notes: isFood ? "E-Barimt (хүнс)" : "E-Barimt (хүнсний бус)",
                            };
                          });
                          const aliases = reviewData.items
                            .filter((it) => it.is_food !== false)
                            .map((it) => ({
                              phrase: it.item_name,
                              ingredient_id: it.ingredient_id || matchIngredient(it.item_name)?.id,
                            }))
                            .filter((row) => row.ingredient_id);

                          const saved = await kioskSaveLogs(logsToInsert, aliases);
                          setRecentToast({
                            id: saved.ids?.[0] || "bulk",
                            text: `${logsToInsert.length} бараа E-Barimt-аар орлогод орлоо.`,
                          });
                          fetchKioskData(tenantClientId);
                        } catch (e: any) {
                          alert(e.message || "E-Barimt хадгалагдсангүй.");
                        }
                      })();
                    }}
                    className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95 shrink-0"
                  >
                    {isAiLoading
                      ? "Баазад хадгалж байна..."
                      : " ШАЛГААД БҮГДИЙГ БАТЛАХ"}
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
                  className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 w-full max-w-sm shadow-2xl space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <div>
                      <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
                        Шинэ бараа үүсгэх
                      </span>
                      <h3 className="text-base font-black text-white mt-1">
                        {newItemName}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddNewItemModal(false)}
                      className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-xl text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Нэгж сонгох: мл, гр, ш */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">
                      Хэмжих нэгж:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                      {["ш", "мл", "гр"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setNewItemUnit(u)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition ${
                            newItemUnit === u
                              ? "bg-white text-zinc-950 font-black"
                              : "text-zinc-400"
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
                      <label className="block text-xs font-bold text-zinc-400 mb-1">
                        Авсан тоо:
                      </label>
                      <input
                        type="number"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        placeholder="Жишээ: 5"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center text-xs text-white font-bold outline-none focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">
                        Нийт үнэ (₮):
                      </label>
                      <input
                        type="number"
                        value={newItemCost}
                        onChange={(e) => setNewItemCost(e.target.value)}
                        placeholder="Жишээ: 25000"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center text-xs text-zinc-200 font-mono font-bold outline-none focus:border-zinc-700"
                      />
                    </div>
                  </div>

                  {/* Зураг заавал шаардах хэсэг */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-400">
                      Шинэ барааны зураг (Заавал):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        id="new-item-cam"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setNewItemFile(e.target.files[0]);
                        }}
                      />
                      <label
                        htmlFor="new-item-cam"
                        className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-zinc-300 transition"
                      >
                        <Camera className="h-4 w-4 text-zinc-200" />
                        <span>Камер</span>
                      </label>

                      <input
                        type="file"
                        accept="image/*"
                        id="new-item-gallery"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setNewItemFile(e.target.files[0]);
                        }}
                      />
                      <label
                        htmlFor="new-item-gallery"
                        className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-zinc-300 transition"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Цомог</span>
                      </label>
                    </div>

                    <p
                      className={`text-xs font-bold text-center ${newItemFile ? "text-zinc-200" : "text-rose-400 "}`}
                    >
                      {newItemFile
                        ? ` Зураг бэлэн: ${newItemFile.name.substring(0, 15)}...`
                        : "Зургийг заавал дарна уу!"}
                    </p>
                  </div>

                  {/*  ШИНЭ БАРААНЫ УХААЛАГ БАТЛАХ ТОВЧ (Камер автоматаар нээгдэнэ) */}
                  <button
                    type="button"
                    disabled={
                      !newItemQty ||
                      parseFloat(newItemQty) <= 0 ||
                      !newItemCost ||
                      parseFloat(newItemCost) <= 0 ||
                      isAiLoading
                    }
                    onClick={() => {
                      const cost = parseFloat(newItemCost) || 0;

                      // 💡 10,000₮ давсан мөртлөө зураггүй бол ДАРМАГЦ КАМЕР ШУУД НЭЭГДЭНЭ!
                      if (cost >= 10000 && !newItemFile) {
                        document.getElementById("new-item-cam")?.click();
                        return;
                      }

                      // ... (Цаашаа хуучин хадгалах ложик хэвээрээ үргэлжилнэ)
                      const nameToSave = newItemName;
                      const qty = parseFloat(newItemQty);
                      const unitToSave = newItemUnit;
                      const fileToUpload = newItemFile;
                      const unitPrice = qty > 0 ? Math.round(cost / qty) : 0;

                      setShowAddNewItemModal(false);
                      setNewItemName("");
                      setNewItemQty("");
                      setNewItemCost("");
                      setNewItemFile(null);
                      setKioskSearch("");

                      (async () => {
                        try {
                          let uploadedUrl = null;
                          if (fileToUpload) {
                            uploadedUrl = await uploadEvidencePhoto(
                              fileToUpload,
                              "new_items",
                            );
                          }

                          const saved = await kioskOps("ingredient.create", {
                            name: nameToSave,
                            unit: unitToSave,
                            qty,
                            cost,
                            image_url: uploadedUrl,
                          });
                          if (saved.logId) {
                            setRecentToast({
                              id: saved.logId,
                              text: `Шинэ бараа: ${nameToSave} (${qty} ${unitToSave})`,
                            });
                            fetchKioskData(tenantClientId);
                          }
                        } catch (err: any) {
                          alert(err.message || "Шинэ бараа хадгалагдсангүй.");
                        }
                      })();
                    }}
                    className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3 rounded-2xl text-[13px] sm:text-xs transition shadow-lg active:scale-95"
                  >
                    {isAiLoading
                      ? "Үүсгэж байна..."
                      : (parseFloat(newItemCost) || 0) >= 10000 && !newItemFile
                        ? "ЗУРАГ ДАРЖ ҮҮСГЭХ"
                        : !newItemFile
                          ? "БАТЛАХ (Зураггүй үүсгэх)"
                          : "ШИНЭ БАРААГ БАТЛАХ"}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 📸 БАРИМТЫГ УНШИЖ БАЙГААГ МЭДЭГДЭХ ТОМ ХӨДӨЛГӨӨНТ ЦОНХ */}
            {/* ========================================================================= */}
            {isScanningReceipt && (
              <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none">
                <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl max-w-xs w-full text-center shadow-2xl space-y-4">
                  {/* Лугших хөдөлгөөнт лого */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 bg-zinc-800 rounded-full " />
                    <div className="relative bg-zinc-800 p-5 rounded-full border-2 border-zinc-700/40 ">
                      <Camera className="h-8 w-8 text-zinc-200 " />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">
                      AI Баримтыг Уншиж Байна...
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Түр хүлээнэ үү. Бараа, тоо, үнийг ялгаж байна.
                    </p>
                  </div>

                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full w-2/3  rounded-full" />
                  </div>
                </div>
              </div>
            )}
            {/* ========================================================================= */}
            {/* 📋 ӨНӨӨДРИЙН БҮХ БҮРТГЭЛИЙГ ДЭЛГЭРЭНГҮЙ ХАРУУЛАХ ТУХТАЙ ЦОНХ (DRAWER)        */}
            {/* ========================================================================= */}
            {showLogsDrawer && (
              <div
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
                onClick={() => setShowLogsDrawer(false)}
              >
                <div
                  className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 w-full max-w-md shadow-2xl space-y-3 max-h-[85vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>📋 Өнөөдрийн бүх бүртгэлүүд</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Нийт {todayLogs.length} үйлдэл хийгдсэн байна. Буруу
                        бичсэн бол буцаана уу.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLogsDrawer(false)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      ✕ Хаах
                    </button>
                  </div>

                  {/* ГҮЙДЭГ КАРТУУДЫН ЖАГСААЛТ */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60">
                    {todayLogs.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic text-center py-8">
                        Өнөөдөр хараахан ямар нэг бүртгэл хийгдээгүй байна.
                      </p>
                    ) : (
                      todayLogs.map((log) => {
                        const isPurchase = log.type === "purchase";
                        const isSpoilage = log.type === "spoilage";
                        const isStaffMeal = log.type === "staff_meal";
                        const isTesting = log.type === "testing";
                        const isCashOut =
                          log.type === "count" &&
                          log.non_food_item?.includes("Касс");

                        const itemName =
                          log.ingredients?.name ||
                          log.non_food_item ||
                          "Тодорхойгүй";
                        const unit = log.ingredients?.unit || "ш";
                        const cost = parseFloat(log.total_cost) || 0;
                        const qty = Math.abs(parseFloat(log.quantity) || 0);
                        const timeStr = log.date
                          ? new Date(log.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "";

                        return (
                          <div
                            key={log.id}
                            className="pt-2 flex justify-between items-center gap-2 text-xs"
                          >
                            {/* Зүүн тал: Барааны нэр, төрөл, зураг */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              {log.image_url ? (
                                <SignedImg
                                  stored={log.image_url}
                                  alt="receipt"
                                  deviceToken={
                                    typeof window === "undefined"
                                      ? null
                                      : localStorage.getItem("kiosk_device_token")
                                  }
                                  onClick={(url) => setPreviewLogImage(url)}
                                  className="h-10 w-10 object-cover rounded-xl border border-zinc-700 cursor-pointer shrink-0 hover:scale-105 transition"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm shrink-0">
                                  {isPurchase
                                    ? "📦"
                                    : isSpoilage
                                      ? "🗑️"
                                      : isStaffMeal
                                        ? "🍽️"
                                        : isTesting
                                          ? "🧪"
                                          : "💵"}
                                </div>
                              )}

                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-sm truncate">
                                    {itemName}
                                  </span>
                                  <span
                                    className={`text-[11px] font-black px-1.5 py-0.2 rounded uppercase ${
                                      isPurchase
                                        ? "bg-zinc-800/60 text-zinc-200 border border-zinc-700/20"
                                        : isSpoilage
                                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                          : isStaffMeal
                                            ? "bg-zinc-800/60 text-zinc-300 border border-zinc-700/20"
                                            : "bg-zinc-800/60 text-zinc-300 border border-zinc-800/20"
                                    }`}
                                  >
                                    {isPurchase
                                      ? "Орлого"
                                      : isSpoilage
                                        ? "Хаягдал"
                                        : isStaffMeal
                                          ? "Хоол"
                                          : isTesting
                                            ? "Туршилт"
                                            : "Зардал"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs mt-0.5">
                                  <span>
                                    {qty} {unit}
                                  </span>
                                  {cost > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-zinc-200 font-bold">
                                        {cost.toLocaleString()} ₮
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="text-zinc-500 font-sans">
                                    {timeStr}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Баруун тал: Буцаах (Устгах) товч */}
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `"${itemName}" бүртгэлийг устгаж буцаах уу?`,
                                  )
                                )
                                  return;
                                setTodayLogs((prev) =>
                                  prev.filter((l) => l.id !== log.id),
                                );
                                try {
                                  await kioskOps("logs.delete", { id: log.id });
                                  await fetchKioskData(tenantClientId);
                                } catch (err: any) {
                                  alert(err.message || "Буцааж чадсангүй.");
                                  fetchKioskData(tenantClientId);
                                }
                              }}
                              className="bg-zinc-900 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 border border-zinc-800 hover:border-rose-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shrink-0"
                              title="Бүртгэлийг цуцлах"
                            >
                              ↩️ Буцаах
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 🖼️ Зургийг томоор харах цонх */}
            {previewLogImage && (
              <div
                className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
                onClick={() => setPreviewLogImage(null)}
              >
                <div className="max-w-md w-full max-h-[80vh] flex flex-col items-center">
                  <img
                    src={previewLogImage}
                    alt="preview"
                    className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-2xl"
                  />
                  <span className="text-xs text-zinc-400 mt-2 font-bold">
                    Дэлгэц дээр дарж хаана
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. AI CHAT INTERFACE */}
        {step === "ai_chat" && (
          <KioskAiChatSection
            selectedWorker={selectedWorker}
            activeShift={activeShift}
            ingredients={ingredients}
            learnedAliases={learnedAliases}
            onBack={() => setStep("menu")}
          />
        )}

        {/* 6. DAILY TASKS */}
        {step === "tasks" && (
          <div className="w-full h-full bg-zinc-900 p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <h2 className="text-lg sm:text-xl font-black text-zinc-300 mb-2 flex items-center gap-2 shrink-0">
              <CheckSquare className="h-5 w-5" /> Өнөөдрийн Даалгавар (SOP)
            </h2>

            {tasks.length === 0 ? (
              <p className="text-center text-zinc-400 py-8 text-sm my-auto">
                Өнөөдөр хийх даалгавар байхгүй байна.
              </p>
            ) : (
              <div className="space-y-2 py-2 flex-1 overflow-y-auto overscroll-contain pr-1">
                {tasks.map((t, idx) => (
                  <button
                    key={idx}
                    disabled={t.done}
                    onClick={() => completeTask(idx)}
                    className={`w-full p-3.5 rounded-xl flex items-center justify-between border transition active:scale-95 ${
                      t.done
                        ? "bg-zinc-800/60 border-zinc-800 text-zinc-200 opacity-60"
                        : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.done ? (
                        <CheckCircle className="h-5 w-5 text-zinc-200 shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-lg border-2 border-zinc-600 shrink-0" />
                      )}
                      <span className="font-bold text-sm text-left">
                        {t.name}
                      </span>
                    </div>
                    {t.done && (
                      <span className="text-xs font-black text-zinc-200 shrink-0">
                        Хийсэн
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep("menu")}
              className="w-full mt-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white font-bold py-3 rounded-xl text-xs transition shrink-0 active:scale-95"
            >
              ← Буцах
            </button>
          </div>
        )}

        {/* 7. INCIDENT REPORTING */}
        {step === "incident_report" && (
          <div className="w-full h-full bg-zinc-900 p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="shrink-0 mb-3">
              <h2 className="text-lg font-black text-zinc-300 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Өмнөх Ээлжийн Алдагдал
                Бүртгэх
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Өмнөх ээлжийн ажилтны хаягдал эсвэл гэмтсэн барааг менежерт
                тайлагнана
              </p>
            </div>

            <form
              onSubmit={handleReportIncident}
              className="space-y-3 flex-1 overflow-y-auto pr-1"
            >
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  1. Өмнөх ээлжинд ажилласан ажилтан
                </label>
                <select
                  value={incidentWorker}
                  onChange={(e) => setIncidentWorker(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="">-- Ажилтан сонгох --</option>
                  {workers
                    .filter((w) => w.id !== selectedWorker?.id)
                    .map((w) => (
                      <option
                        key={w.id}
                        value={w.full_name || w.email.split("@")[0]}
                      >
                        {w.full_name || w.email.split("@")[0]} ({w.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  2. Алдагдсан / Муудсан түүхий эд
                </label>
                <select
                  required
                  value={incidentItem}
                  onChange={(e) => setIncidentItem(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="">-- Түүхий эд сонгох --</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  3. Алдагдсан тоо хэмжээ
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={incidentQty}
                  onChange={(e) => setIncidentQty(e.target.value)}
                  placeholder="Тоо оруулна уу (жнь: 2)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  4. Нотлох зураг авах (Evidence Photo)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  id="incident-camera-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setIncidentFile(e.target.files[0]);
                  }}
                />
                <label
                  htmlFor="incident-camera-input"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-zinc-300 hover:border-amber-500 transition"
                >
                  <Camera className="h-4 w-4 text-zinc-300" />
                  <span>
                    {incidentFile
                      ? ` ${incidentFile.name.substring(0, 18)}...`
                      : "Зураг дарах"}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  5. Тайлбар
                </label>
                <input
                  type="text"
                  value={incidentNote}
                  onChange={(e) => setIncidentNote(e.target.value)}
                  placeholder="Жишээ: Шөнө хөргөгчний хаалга дутуу хаагдсан..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("menu")}
                  className="flex-1 bg-zinc-950 border border-zinc-800 py-3 rounded-xl text-xs font-bold text-zinc-300"
                >
                  Буцах
                </button>
                <button
                  type="submit"
                  disabled={isAiLoading}
                  className="flex-1 bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3 rounded-xl text-xs transition"
                >
                  {isAiLoading ? "Хадгалж байна..." : "Бүртгэх"}
                </button>
              </div>
            </form>
          </div>
        )}
        {/* 8. CLOSE SHIFT & POS Z-REPORT */}
        {step === "close_shift" && (
          <div className="w-full h-full bg-zinc-900 p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="shrink-0 mb-2">
              <h2 className="text-lg sm:text-xl font-black text-zinc-200 mb-0.5 flex items-center gap-2">
                <ListOrdered className="h-5 w-5" /> Ээлжийн Тооллого & Z-Тайлан
              </h2>
              <p className="text-xs text-zinc-400">
                Хөргөгч/лангуун дахь үлдэгдлийг тоолж, Z-тайлангийн зураг
                оруулна уу.
              </p>
            </div>

            <div className="space-y-2 py-1 flex-1 overflow-y-auto overscroll-contain pr-1">
              {/* 🔄 САРЫН ЦИКЛИЙН ЯВЦ (KIOSK ДЭЭР АЖИЛТАНД ХАРАГДАХ) */}
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 mb-2 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 font-sans">
                  Энэ сарын циклийн гүйцэтгэл:
                </span>
                <span className="text-zinc-200 font-bold flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                  <span>
                    {
                      ingredients.filter(
                        (i) =>
                          i.last_counted_at &&
                          new Date(i.last_counted_at) >=
                            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                      ).length
                    }{" "}
                    / {ingredients.length} бараа
                  </span>
                </span>
              </div>
              {/* POS Z-REPORT UPLOAD */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-2">
                <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-zinc-400" />
                  ПОС-ын Z-Тайлангийн зураг (End-of-day Z-Report)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  id="pos-z-camera"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPosZFile(e.target.files[0]);
                  }}
                />
                <label
                  htmlFor="pos-z-camera"
                  className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-zinc-200 hover:border-zinc-700 transition"
                >
                  <Camera className="h-4 w-4" />
                  <span>
                    {posZFile
                      ? ` ${posZFile.name.substring(0, 20)}...`
                      : "Z-Тайлангийн зураг дарах"}
                  </span>
                </label>
              </div>

              {/* 💵 ШИНЭ: КАССЫН БЭЛЭН МӨНГӨНИЙ БОДИТ ТООЛЛОГО */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-2">
                <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-zinc-400" />
                  Кассанд байгаа бэлэн мөнгө (Тоолсон дүн)
                </p>
                <div className="relative">
                  <input
                    type="number"
                    value={actualCashDrawer}
                    onChange={(e) => setActualCashDrawer(e.target.value)}
                    placeholder="Кассын шүүгээнд яг хэдэн төгрөг байна вэ? (Байхгүй бол 0)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 font-mono font-black outline-none focus:border-zinc-700"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                    ₮
                  </span>
                </div>
              </div>

              {/* PARETO 80/20 CYCLE COUNT ITEMS */}
              {inventoryToCount.map((item) => {
                const stock = parseFloat(
                  item.current_stock ?? item.live_stock ?? 0,
                );
                const par = parseFloat(item.par_level ?? 0);
                const isUrgent = par > 0 && stock <= par;

                return (
                  <div
                    key={item.id}
                    className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex justify-between items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-sm text-white">
                          {item.name}
                        </p>

                        {/* 🏷️ ПАЙЗНУУД */}
                        {isUrgent ? (
                          <span className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded font-black ">
                            🚨 Яаралтай (Нөөц бага)
                          </span>
                        ) : item.todayUsage > 0 ? (
                          <span className="text-xs bg-zinc-800 text-zinc-200 border border-zinc-800 px-1.5 py-0.5 rounded font-black">
                            ⚡ Өдрийн эргэлт (
                            {Math.round(item.moneyMoved || 0).toLocaleString()}
                            ₮)
                          </span>
                        ) : (
                          <span className="text-xs bg-zinc-900 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
                            <RotateCcw className="h-2.5 w-2.5 text-zinc-400" />
                            <span>Сар бүрийн цикл</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 mt-0.5">
                        Тоолох нэгж:{" "}
                        <strong className="text-zinc-300 font-bold">
                          {item.unit}
                        </strong>
                      </p>
                    </div>

                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Тоо..."
                      value={
                        counts[item.id] !== undefined ? counts[item.id] : ""
                      }
                      onChange={(e) =>
                        setCounts({ ...counts, [item.id]: e.target.value })
                      }
                      className="w-24 h-10 bg-zinc-900 px-3 rounded-xl text-center text-white border border-zinc-700 font-bold text-base focus:border-zinc-700 outline-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 mt-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setStep("menu")}
                className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-3 rounded-xl text-xs transition active:scale-95"
              >
                Буцах
              </button>

              {/* 🔒 ЗӨВХӨН ЭНЭ ТОВЧ ДЭЭР Z-ТАЙЛАН БА КАССЫН БЭЛЭН МӨНГӨНИЙ ШАЛГАЛТ НЭМЭГДСЭН: */}
              <button
                type="button"
                onClick={handleCloseShift}
                disabled={
                  isAiLoading ||
                  inventoryToCount.some(
                    (i) =>
                      counts[i.id] === undefined ||
                      counts[i.id].toString().trim() === "",
                  ) ||
                  !posZFile || // 👈 Z-Тайлангийн зураггүй бол цоожтой
                  actualCashDrawer.trim() === "" // 👈 Кассын мөнгө хоосон бол цоожтой (0 байвал зөвшөөрнө)
                }
                className="flex-1 bg-white hover:bg-zinc-200 active:scale-95 text-zinc-950 font-black py-3 rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {isAiLoading
                  ? "Хааж байна..."
                  : !posZFile
                    ? "Z-ТАЙЛАНГИЙН ЗУРАГ ДАРНА УУ"
                    : actualCashDrawer.trim() === ""
                      ? "💵 КАССЫН МӨНГӨӨ БИЧНЭ ҮҮ"
                      : "Хаах & Илгээх"}
              </button>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* 🛒 ХӨВӨГЧ САГСНЫ ТОВЧЛУУР (Бараа нэмэгдсэн үед л гарч ирнэ) */}
        {/* ========================================================================= */}
        {purchaseCart.length > 0 && !showCartModal && !quickItemModal && (
          <div
            onClick={() => setShowCartModal(true)}
            className="absolute bottom-20 left-4 right-4 z-40 bg-white hover:bg-zinc-200 text-zinc-950 p-3.5 rounded-2xl  flex justify-between items-center border border-zinc-700 cursor-pointer  transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-xl">
                <ShoppingCart className="h-5 w-5 text-zinc-200" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  {purchaseCart.length} бараа сагсанд байна
                </p>
                <p className="text-xs text-blue-200 font-mono font-bold">
                  Нийт:{" "}
                  {purchaseCart
                    .reduce((s, i) => s + i.cost, 0)
                    .toLocaleString()}{" "}
                  ₮
                </p>
              </div>
            </div>
            <span className="bg-zinc-950/40 px-3.5 py-2 rounded-xl text-xs font-black uppercase">
              Батлах ➔
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🛒 САГСНЫ ДЭЛГЭРЭНГҮЙ ЦОНХ (Бөөнд нь зураг дарж батлах) */}
        {/* ========================================================================= */}
        {showCartModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-zinc-400" />
                    <span>Олон барааны сагс</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Гаднаас бөөндөж авсан барааг 1 зургаар батлах
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCartModal(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-xl text-xs font-bold"
                >
                  ✕ Хаах
                </button>
              </div>

              {/* Сагсан дахь бараанууд */}
              <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 divide-y divide-slate-800/50">
                {purchaseCart.map((item, idx) => (
                  <div
                    key={idx}
                    className="pt-2 flex justify-between items-center text-sm"
                  >
                    <div>
                      <p className="font-bold text-zinc-200">{item.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">
                        {item.qty} {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-200 font-black font-mono">
                        {item.cost.toLocaleString()} ₮
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPurchaseCart((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-rose-400 hover:text-rose-300 bg-rose-500/10 h-7 w-7 rounded-lg font-bold flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Нийт дүн ба Зураг дарах хэсэг */}
              {(() => {
                const totalCartCost = purchaseCart.reduce(
                  (s, i) => s + i.cost,
                  0,
                );
                return (
                  <div className="shrink-0 space-y-3 pt-3 border-t border-zinc-800">
                    <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider">
                        Нийт төлсөн дүн:
                      </span>
                      <span className="font-mono font-black text-zinc-200 text-lg">
                        {totalCartCost.toLocaleString()} ₮
                      </span>
                    </div>

                    {/* Зураг дарах (10,000₮-өөс дээш бол заавал) */}
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        id="cart-cam"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setCartFile(e.target.files[0]);
                        }}
                      />
                      <label
                        htmlFor="cart-cam"
                        className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-zinc-300 transition"
                      >
                        <Camera className="h-4 w-4 text-zinc-300" />
                        <span>Камер</span>
                      </label>

                      <input
                        type="file"
                        accept="image/*"
                        id="cart-gallery"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setCartFile(e.target.files[0]);
                        }}
                      />
                      <label
                        htmlFor="cart-gallery"
                        className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-zinc-300 transition"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Цомог</span>
                      </label>
                    </div>

                    <p
                      className={`text-xs font-bold text-center ${cartFile ? "text-zinc-200" : totalCartCost >= 10000 ? "text-rose-400 " : "text-zinc-500"}`}
                    >
                      {cartFile
                        ? ` Зураг бэлэн: ${cartFile.name.substring(0, 15)}...`
                        : totalCartCost >= 10000
                          ? "баримт/барааны зураг заавал дарна уу!"
                          : "Зураг хавсаргах нь сайн дурынх"}
                    </p>

                    <button
                      type="button"
                      //  1. ЗӨВХӨН УНШИЖ БАЙХАД Л ТҮГЖИНЭ (Камер нээгдэхэд саад болохгүй)
                      disabled={purchaseCart.length === 0 || isAiLoading}
                      onClick={() => {
                        // 💡 2. 10,000₮ давсан мөртлөө зураггүй бол ДАРМАГЦ КАМЕР ШУУД НЭЭГДЭНЭ!
                        if (totalCartCost >= 10000 && !cartFile) {
                          document.getElementById("cart-cam")?.click();
                          return;
                        }

                        const itemsToProcess = [...purchaseCart];
                        const fileToUpload = cartFile;

                        setShowCartModal(false);
                        setPurchaseCart([]);
                        setCartFile(null);

                        setRecentToast({
                          id: "temp-" + Date.now(),
                          text: `🛒 Сагсан дахь ${itemsToProcess.length} бараа хадгалагдаж байна...`,
                        });

                        (async () => {
                          try {
                            let uploadedUrl = null;
                            if (fileToUpload) {
                              uploadedUrl = await uploadEvidencePhoto(
                                fileToUpload,
                                "purchases_proofs",
                              );
                            }

                            const saved = await kioskSaveLogs(
                              itemsToProcess.map((it) => ({
                                ingredient_id: it.ing_id,
                                quantity: Math.abs(it.qty),
                                total_cost: it.cost,
                                type: "purchase",
                                payment_method: purchasePayMethod,
                                image_url: uploadedUrl,
                                is_ebarimt: false,
                                input_unit: it.unit,
                                notes: "Бөөний сагсаар",
                              })),
                            );
                            if (saved.ids?.length) {
                              setRecentToast({
                                id: saved.ids[0],
                                text: `Сагсан дахь ${itemsToProcess.length} бараа бүртгэгдлээ.`,
                              });
                              fetchKioskData(tenantClientId);
                            }
                          } catch (err: any) {
                            alert(err.message || "Сагс хадгалагдсангүй.");
                          }
                        })();
                      }}
                      className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3.5 rounded-2xl text-[13px] sm:text-sm transition shadow-lg active:scale-95"
                    >
                      {isAiLoading
                        ? "Хадгалж байна..."
                        : totalCartCost >= 10000 && !cartFile
                          ? "ЗУРАГ ДАРЖ БАТЛАХ"
                          : `САГСЫГ БАТЛАХ (${totalCartCost.toLocaleString()}₮)`}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
       
       )}

       
              </>
            )}
      </main>
    </div>
  );
}

export default function Page() {
  return <KioskPage />;
}
