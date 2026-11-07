// src/features/ai-cfo/AiCfoChat.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect   } from "react";
import { 
  CheckCircle2, ArrowUpRight, PlusCircle, 
  Send, Clock, TerminalSquare, ShieldAlert,
  Brain, FileText, Activity, RotateCcw, ArrowDown 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabase";

interface AiCfoChatProps {
  activeClient: string;
  startDate: string;
  endDate: string;
}

interface ChatMessage {
  id: string;
  sender: "owner" | "ai";
  text: string;
  timeTakenMs?: number; 
}

// 🛡️ THE EMOJI SHIELD: Mathematically strips all Unicode emojis
const stripEmojis = (str: string) => {
  if (!str) return "";
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
};

export default function AiCfoChat({
  activeClient,
  startDate,
  endDate,
}: AiCfoChatProps) {
  const [cfoChatInput, setCfoChatInput] = useState("");
  const [cfoChatHistory, setCfoChatHistory] = useState<ChatMessage[]>([]);
  const [isCfoLoading, setIsCfoLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [executedProposals, setExecutedProposals] = useState<Record<string, string>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
const isScrolledUpRef = useRef(false); 
  const [showScrollButton, setShowScrollButton] = useState(false); // 👈 Доошлуулах товчийг харуулах эсэх
const [correctingMsgIndex, setCorrectingMsgIndex] = useState<number | null>(null);
const [correctionTopic, setCorrectionTopic] = useState("");
const [correctionFact, setCorrectionFact] = useState("");
const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    isScrolledUpRef.current = false;
    setShowScrollButton(false);
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Хамгийн доод цэгээс 150px дээшээ явсан бол сумыг харуулна
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(isScrolledUp);
  };
const fetchChatHistory = useCallback(async () => {
    if (!activeClient) return;
    setIsHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_chat_messages")
        .select("id, role, content, created_at")
        .ilike("client_id", activeClient.trim())
        .order("created_at", { ascending: false }) // 👈 1. Хамгийн сүүлийн ШИНЭ мессежүүдийг татна
        .limit(40);

      if (!error && data && data.length > 0) {
    
        const latestInOrder = [...data].reverse();

        setCfoChatHistory(
          latestInOrder.map((msg) => ({
            id: msg.id,
            sender: msg.role === "owner" ? "owner" : "ai",
            text: stripEmojis(msg.content),
          }))
        );
      }
    } catch (err) {
      console.error("Chat history load error:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [activeClient]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

   useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // 1. Чат дэлгэцэнд бодитоор ил гарсан үед л ажиллана (height > 0)
      if (container.clientHeight > 0) {
        // 2. Хэрэв хэрэглэгч өөрөө дээшээ гараараа гүйлгээгүй бол ҮРГЭЛЖ хамгийн доор нь байлгана
        if (!isScrolledUpRef.current) {
          container.scrollTop = container.scrollHeight;
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [cfoChatHistory.length, isHistoryLoading]);


    // Шинээр өөрөө мессеж илгээх үед зөөлөн доошлуулах
  useEffect(() => {
    if (isCfoLoading) {
      scrollToBottom("smooth");
    }
  }, [isCfoLoading]);

  const handleApproveProposal = async (proposal: any, cardKey: string) => {
    try {
      if (proposal.actionType === "UPDATE_MENU_PRICE") {
        const { productName, proposedPrice } = proposal.payload;
        const { error } = await supabase
          .from("products")
          .update({ selling_price: proposedPrice })
          .ilike("name", productName)
          .eq("client_id", activeClient);

        if (error) throw error;
        setExecutedProposals((prev) => ({
          ...prev,
          [cardKey]: `Зөвшөөрөгдлөө: ${productName}-ийн үнэ ${proposedPrice.toLocaleString()}₮ боллоо.`,
        }));
      } else if (proposal.actionType === "CREATE_STAFF_TASK") {
        const { role, taskName, weight } = proposal.payload;
        const { error } = await supabase.from("tasks").insert([
          {
            client_id: activeClient,
            role,
            task_name: taskName,
            weight: weight || 10,
            is_active: true,
          },
        ]);

        if (error) throw error;
        setExecutedProposals((prev) => ({
          ...prev,
          [cardKey]: `Зөвшөөрөгдлөө: "${taskName}" даалгавар үүслээ.`,
        }));
      }
    } catch (err: any) {
      alert(`Алдаа гарлаа: ${err.message}`);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const text = directText || cfoChatInput.trim();
    if (!text) return;

    const msgId = Date.now().toString();
    
    // 🛡️ Strip emojis from user input too, maintaining the strict terminal vibe
    setCfoChatHistory((prev) => [...prev, { id: `u-${msgId}`, sender: "owner", text: stripEmojis(text) }]);
    setCfoChatInput("");
    setIsCfoLoading(true);

    const startTime = performance.now();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch("/api/kiosk-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantClientId: activeClient,
          workerName: "Owner",
          text,
          userRole: "owner",
          startDate: `${startDate}T00:00:00.000Z`,
          endDate: `${endDate}T23:59:59.999Z`,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} алдаа`);
      }

      if (res.body) {
        setCfoChatHistory((prev) => [...prev, { id: `ai-${msgId}`, sender: "ai", text: "" }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // 🛡️ Immediately strip emojis from the incoming stream chunks
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += stripEmojis(chunk);

          setCfoChatHistory((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].text = accumulatedText;
            return updated;
          });
        }
      }
    } catch (err: any) {
      setCfoChatHistory((prev) => [
        ...prev,
        { id: `err-${msgId}`, sender: "ai", text: `[SYSTEM ERROR]: ${err.message}` },
      ]);
    } finally {
      const endTime = performance.now();
      setCfoChatHistory((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].sender === "ai") {
          updated[updated.length - 1].timeTakenMs = endTime - startTime;
        }
        return updated;
      });
      setIsCfoLoading(false);
    }
  };

  const handleSaveCorrection = async () => {
  if (!correctionFact.trim()) return;
  setIsSavingCorrection(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";

    const res = await fetch("/api/kiosk-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "save_correction",
        topic: correctionTopic || "Эзний дүрэм",
        fact: correctionFact.trim(),
      }),
    });

    const data = await res.json();
    if (data.success) {
      alert("Шинэ дүрэм амжилттай хадгалагдлаа! AI дараагийн асуултад энэ дүрмийг шууд дагана.");
      setCorrectingMsgIndex(null);
      setCorrectionTopic("");
      setCorrectionFact("");
    } else {
      alert(`Алдаа: ${data.message}`);
    }
  } catch (err: any) {
    alert(`Сүлжээний алдаа: ${err.message}`);
  } finally {
    setIsSavingCorrection(false);
  }
};

  const renderMessageContent = (fullText: string, messageIndex: number) => {
    // 🛡️ Final safeguard: Double check the full text has no emojis before rendering
    const cleanText = stripEmojis(fullText);
    
    const proposalRegex = /:::PROPOSAL_CARD\n([\s\S]*?)\n:::/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const markdownComponents = {
      table: ({ node, ...props }: any) => (
        <table className="w-full my-3 border-collapse border border-zinc-800 text-[15px] rounded-xl overflow-hidden" {...props} />
      ),
      thead: ({ node, ...props }: any) => (
        <thead className="bg-zinc-900 text-zinc-300 border-b border-zinc-800 font-bold" {...props} />
      ),
      th: ({ node, ...props }: any) => (
        <th className="border border-zinc-800 px-3 py-2 text-left font-black" {...props} />
      ),
      td: ({ node, ...props }: any) => (
        <td className="border border-zinc-800/80 px-3 py-1.5 text-zinc-300 font-mono text-sm" {...props} />
      ),
      strong: ({ node, ...props }: any) => (
        <strong className="text-white font-black" {...props} />
      ),
    };

    while ((match = proposalRegex.exec(cleanText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <div key={`md-${lastIndex}`} className="prose prose-invert max-w-none text-[15px] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {cleanText.substring(lastIndex, match.index)}
            </ReactMarkdown>
          </div>
        );
      }
      
      const proposalRaw = match[1];
      const cardKey = `card-${messageIndex}-${match.index}`;
      try {
        const proposal = JSON.parse(proposalRaw);
        const isExecuted = executedProposals[cardKey];

        parts.push(
          <div
            key={cardKey}
            className="my-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-700/80 shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                {proposal.actionType === "UPDATE_MENU_PRICE" ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-zinc-400" /> Үнийн Өөрчлөлтийн Санал
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 text-zinc-400" /> Шинэ Даалгавар
                  </>
                )}
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                Зөвшөөрөл хүлээгдэж байна
              </span>
            </div>

            {proposal.actionType === "UPDATE_MENU_PRICE" && (
              <div className="text-sm space-y-1">
                <p className="text-white font-bold text-[15px]">
                  {proposal.payload.productName}
                </p>
                <div className="flex items-center gap-3 text-zinc-300">
                  <span>
                    Одоогийн:{" "}
                    <del className="text-zinc-500 font-mono">
                      {proposal.payload.currentPrice?.toLocaleString()} ₮
                    </del>
                  </span>
                  <span>➔</span>
                  <span className="font-bold text-white font-mono">
                    Санал болгох: {proposal.payload.proposedPrice?.toLocaleString()} ₮
                  </span>
                </div>
                {proposal.payload.marginImpact && (
                  <p className="text-sm text-zinc-400 font-mono">{proposal.payload.marginImpact}</p>
                )}
                <p className="text-zinc-400 text-sm italic mt-1">
                  Анализ: {proposal.payload.reason}
                </p>
              </div>
            )}

            {proposal.actionType === "CREATE_STAFF_TASK" && (
              <div className="text-sm space-y-1">
                <p className="text-white font-bold text-[15px]">
                  {proposal.payload.taskName}
                </p>
                <p className="text-zinc-300">
                  Хэнд: <span className="font-bold text-white">{proposal.payload.role}</span> | Ачаалал:{" "}
                  {proposal.payload.weight} оноо
                </p>
                <p className="text-zinc-400 text-sm italic mt-1">
                  Анализ: {proposal.payload.reason}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800 flex justify-end gap-2">
              {isExecuted ? (
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {isExecuted}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApproveProposal(proposal, cardKey)}
                  className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-1.5 rounded-xl text-sm transition active:scale-95 flex items-center gap-1 shadow cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Зөвшөөрөх
                </button>
              )}
            </div>
          </div>
        );
      } catch (err) {
        // Fallback if parsing fails
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleanText.length) {
      parts.push(
        <div key={`md-${lastIndex}`} className="prose prose-invert max-w-none text-[15px] leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {cleanText.substring(lastIndex)}
          </ReactMarkdown>
        </div>
      );
    }

    return parts;
  };

  return (
    <div className="w-full mx-auto bg-zinc-950 rounded-2xl border border-zinc-800/80 flex flex-col h-[87vh] shadow-2xl relative overflow-hidden font-sans">
        {showScrollButton && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-24 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-8 z-50 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 p-2 rounded-full border border-zinc-700 shadow-2xl transition-all active:scale-95 animate-in fade-in zoom-in-95 cursor-pointer"
          title="Хамгийн сүүлийн мессеж рүү очих"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      )}
      {/* CHAT HISTORY (Auto-scrolls) */}
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 p-4 space-y-6 sm:p-6 overflow-y-auto space-y-6 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {/* ========================================================= */}
        {/* 📚 THE EMPTY STATE GUIDANCE (Only shows at the start) */}
        {/* ========================================================= */}
        {cfoChatHistory.length === 0 && (
          <div className="max-w-2xl mx-auto mt-4 sm:mt-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-3">
              <TerminalSquare className="h-10 w-10 mx-auto text-zinc-700 mb-2 opacity-50" />
              <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Систем бэлэн</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-inner">
              <h3 className="text-sm font-black text-zinc-300 mb-5 uppercase tracking-wider border-b border-zinc-800/60 pb-3">
                Хийж чадах үйлдлүүд
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <div className="text-white font-bold text-[15px] flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-500"/> 1. Санхүү & Өртөг
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Цэвэр ашиг, P&L, касс/дансны зөрүү болон түүхий эдийн өртгийн хуваарилалтыг шинжлэх.
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-white font-bold text-[15px] flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-zinc-500"/> 2. Алдагдал & Хяналт
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Тайлбаргүй алдагдал, ажилчдын хаягдал болон хулгайн эрсдэлийг илрүүлэх.
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-white font-bold text-[15px] flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500"/> 3. Үйлдэл гүйцэтгэх
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Алдагдалтай цэсний үнийг нэмэх санал гаргах, ажилтнуудад шинэ даалгавар (SOP) үүсгэх.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-white font-bold text-[15px] flex items-center gap-2">
                    <Brain className="h-4 w-4 text-zinc-500"/> 4. Санах ой & Дүрэм
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Өмнө гарч байсан асуудлуудын түүхийг санах, нийлүүлэгчийн мэдээлэл хадгалах/сэргээх.
                  </p>
                </div>
              </div>
            </div>

            {/* 🎯 CLICKABLE QUICK PROMPTS */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 text-center">Шууд асуух жишээнүүд:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => handleChatSubmit(undefined, "Энэ сарын цэвэр ашиг ба P&L тайланг задалж харуул")}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer"
                >
                  "Энэ сарын цэвэр ашиг ба P&L тайланг задалж харуул"
                </button>
                <button 
                  onClick={() => handleChatSubmit(undefined, "Өртөг өссөнөөс болж алдагдалтай байгаа цэс байна уу? Үнэ нэмэх санал гарга")}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer"
                >
                  "Өртөг өссөн цэс байна уу? Үнэ нэмэх санал гарга"
                </button>
                <button 
                  onClick={() => handleChatSubmit(undefined, "Сүүлийн үед хамгийн их алдагдаж, хаягдаж байгаа бараа юу байна?")}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer"
                >
                  "Хамгийн их алдагдаж, хаягдаж байгаа бараа юу байна?"
                </button>
              </div>
            </div>
          </div>
        )}

        {cfoChatHistory.map((msg, i) => (
          <div key={msg.id} className="flex flex-col w-full">
            {msg.sender === "owner" ? (
              // USER MESSAGE
              <div className="self-end max-w-[85%] bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] shadow-sm">
                {msg.text}
              </div>
            ) : (
              // AI MESSAGE
              <div className="self-start w-full pr-10 text-[15px] text-zinc-300 space-y-2 mt-2">
                <div className="pl-4 border-l-2 border-zinc-800/80">
                  {renderMessageContent(msg.text, i)}
                </div>

                {/* ⏱️ GROK-STYLE TIMER */}
                {msg.timeTakenMs && (
                  <div className="pl-4 pt-2 flex items-center gap-1.5 text-xs font-mono text-zinc-600">
                   
                    <span>{(msg.timeTakenMs / 1000).toFixed(2)}s ажилласан</span>
                  </div>
                )}
                {/* AI мессежийн цагийн доор байрлана: */}
<div className="pl-4 pt-1 flex items-center gap-2">
  <button
    type="button"
    onClick={() => {
      setCorrectingMsgIndex(correctingMsgIndex === i ? null : i);
      setCorrectionTopic("Үйл ажиллагаа");
      setCorrectionFact("");
    }}
    className="text-[11px] text-zinc-500 hover:text-zinc-300 font-bold transition flex items-center gap-1 cursor-pointer"
  >
    <span>Буруу байна уу? (Засвар / Дүрэм хадгалах)</span>
  </button>
</div>

{/* Залруулга бичих хөнгөн форм */}
{correctingMsgIndex === i && (
  <div className="ml-4 mt-2 p-3 bg-zinc-900 border border-zinc-700 rounded-xl space-y-2 max-w-lg">
    <p className="text-xs font-bold text-white">Cануулах үнэн зөв дүрмийг оруулна уу:</p>
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Сэдэв (жнь: Сүү)"
        value={correctionTopic}
        onChange={(e) => setCorrectionTopic(e.target.value)}
        className="w-1/3 bg-zinc-950 border border-zinc-700 px-2.5 py-1.5 rounded-lg text-xs text-white outline-none"
      />
      <input
        type="text"
        placeholder="Бодит үнэн"
        value={correctionFact}
        onChange={(e) => setCorrectionFact(e.target.value)}
        className="flex-1 bg-zinc-950 border border-zinc-700 px-2.5 py-1.5 rounded-lg text-xs text-white outline-none"
      />
    </div>
    <div className="flex justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={() => setCorrectingMsgIndex(null)}
        className="px-2.5 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold cursor-pointer"
      >
        Болих
      </button>
      <button
        type="button"
        disabled={isSavingCorrection || !correctionFact.trim()}
        onClick={handleSaveCorrection}
        className="px-3 py-1 bg-white hover:bg-zinc-200 text-zinc-950 rounded-lg text-xs font-black transition cursor-pointer"
      >
        {isSavingCorrection ? "Хадгалж байна..." : "✓ Дүрэм болгох"}
      </button>
    </div>
  </div>
)}
              </div>
            )}
          </div>
        ))}
        
        {/* GROK-STYLE THINKING INDICATOR */}
        {isCfoLoading && (
          <div className="self-start w-full pr-10 text-[15px] text-zinc-300 mt-4">
            <div className="flex items-center gap-3 text-zinc-500 font-mono text-sm pl-4 border-l-2 border-zinc-800/80">
              <div className="h-3.5 w-3.5 border-[2px] border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              <span>Ажиллаж байна</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* GROK-STYLE INPUT STICKY AT BOTTOM */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800/50 shrink-0">
        <form 
          onSubmit={(e) => handleChatSubmit(e)} 
          className="flex gap-2 items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 focus-within:border-zinc-600 transition-colors shadow-inner"
        >
          <input
            type="text"
            value={cfoChatInput}
            onChange={(e) => setCfoChatInput(e.target.value)}
            placeholder="Асуулт асуух"
            className="flex-1 bg-transparent px-4 py-3 text-white focus:outline-none text-[15px] placeholder:text-zinc-600 font-mono"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isCfoLoading || !cfoChatInput.trim()}
            className="bg-white text-zinc-950 p-3 rounded-xl transition hover:scale-95 disabled:opacity-30 disabled:hover:scale-100 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}