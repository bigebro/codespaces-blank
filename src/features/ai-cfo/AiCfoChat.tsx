// src/features/ai-cfo/AiCfoChat.tsx
"use client";

import React, { useState } from "react";
import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabase";

interface AiCfoChatProps {
  activeClient: string;
  startDate: string;
  endDate: string;
}

export default function AiCfoChat({
  activeClient,
  startDate,
  endDate,
}: AiCfoChatProps) {
  const [cfoChatInput, setCfoChatInput] = useState("");
  const [cfoChatHistory, setCfoChatHistory] = useState<
    { sender: "owner" | "ai"; text: string }[]
  >([]);
  const [isCfoLoading, setIsCfoLoading] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfoChatInput.trim()) return;

    const text = cfoChatInput;
    setCfoChatHistory((prev) => [...prev, { sender: "owner", text }]);
    setCfoChatInput("");
    setIsCfoLoading(true);

    try {
     // 🔒 1. ЭНД SUPABASE-ИЙГ ДУУДАЖ ТОКЕН АВНА (Ингэснээр unused алдаа арилна!):
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";  
      const res = await fetch("/api/kiosk-ai", {
        method: "POST",
          headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          tenantClientId: activeClient,
          workerName: "Owner",
          text: text,
          userRole: "owner",
          // 💡 Сонгосон сарын огноог AI руу илгээнэ:
          startDate: `${startDate}T00:00:00.000Z`,
          endDate: `${endDate}T23:59:59.999Z`,
        }),
      });

      // 💡 1. Хэрэв сервер 400, 429, 500 алдаа буцаасан бол JSON-оор алдааг нь уншина:
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: `HTTP ${res.status} алдаа` }));
        setCfoChatHistory((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `❌ Алдаа: ${errorData.message || res.statusText}`,
          },
        ]);
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      // 2. Хэрэв шууд JSON ирвэл:
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setCfoChatHistory((prev) => [
          ...prev,
          { sender: "ai", text: data.message },
        ]);
      }
      // 3. Хэрэв Stream (Урсгал) ирвэл:
      else if (res.body) {
        setCfoChatHistory((prev) => [...prev, { sender: "ai", text: "" }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setCfoChatHistory((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                sender: "ai",
                text: accumulatedText,
              };
            }
            return updated;
          });
        }
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      // 💡 Бодит алдааны тайлбарыг дэлгэцэнд харуулна
      setCfoChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: `❌ Сүлжээний алдаа: ${err.message}` },
      ]);
    } finally {
      setIsCfoLoading(false);
    }
  };

  return (
      <div className="max-w-6xl w-full mx-auto bg-slate-900/40 rounded-3xl border border-slate-800 flex flex-col h-[82vh] shadow-2xl">
         <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-900 rounded-t-3xl">
           <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
             <Bot className="h-6 w-6 text-blue-400" />
           </div>
           <div>
             <h2 className="font-bold text-white">Operlink - Санхүүгийн Зөвлөх</h2>
             <p className="text-sm text-slate-400">
               Орлого, хаягдал, үнийн бодлогын талаар юу ч асууж болно.
             </p>
           </div>
         </div>
   
         <div className="flex-1 p-6 overflow-y-auto space-y-6">
           {cfoChatHistory.length === 0 && (
             <div className="text-center text-slate-500 text-sm mt-10">
               <p className="mb-4">Жишээ асуултууд:</p>
               <ul className="space-y-2 inline-block text-left">
                 <li>👉 "Энэ сарын нийт хаягдал хэдэн төгрөг болсон бэ?"</li>
                 <li>👉 "Латтены ашгийн маржин хэд байна?"</li>
                 <li>👉 "Гүзээлзгэнэтэй шинэ цайны жор зохиож өг"</li>
               </ul>
             </div>
           )}
           {/* Чатны түүх харуулах хэсэг */}
           {cfoChatHistory.map((msg, i) => (
             <div
               key={i}
               className={`flex ${msg.sender === "owner" ? "justify-end" : "justify-start"}`}
             >
               <div
                 className={`max-w-[90%] p-4 text-sm leading-relaxed ${
                   msg.sender === "owner"
                     ? "bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-lg"
                     : "bg-slate-900 text-slate-200 rounded-2xl rounded-tl-none border border-slate-800 shadow-xl overflow-x-auto"
                 }`}
               >
                 {msg.sender === "owner" ? (
                   msg.text
                 ) : (
                   /* 🚀 MARKDOWN ХҮСНЭГТИЙГ ГОЁМСОГ БОЛГОН ХУВИРГАХ ХЭСЭГ */
                   <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                     <ReactMarkdown
                       remarkPlugins={[remarkGfm]}
                       components={{
                         table: ({ node, ...props }) => (
                           <table
                             className="w-full my-3 border-collapse border border-slate-800 text-sm rounded-xl overflow-hidden"
                             {...props}
                           />
                         ),
                         thead: ({ node, ...props }) => (
                           <thead
                             className="bg-slate-950 text-emerald-400 border-b border-slate-800 font-bold"
                             {...props}
                           />
                         ),
                         th: ({ node, ...props }) => (
                           <th
                             className="border border-slate-800 px-3 py-2 text-left font-black"
                             {...props}
                           />
                         ),
                         td: ({ node, ...props }) => (
                           <td
                             className="border border-slate-800/80 px-3 py-1.5 text-slate-300 font-medium"
                             {...props}
                           />
                         ),
                         h3: ({ node, ...props }) => (
                           <h3
                             className="text-sm font-black text-white mt-3 mb-1 flex items-center gap-1.5"
                             {...props}
                           />
                         ),
                         ul: ({ node, ...props }) => (
                           <ul
                             className="list-disc list-inside space-y-1 my-2"
                             {...props}
                           />
                         ),
                         strong: ({ node, ...props }) => (
                           <strong className="font-bold text-white" {...props} />
                         ),
                       }}
                     >
                       {msg.text}
                     </ReactMarkdown>
                   </div>
                 )}
               </div>
             </div>
           ))}
           {isCfoLoading && (
             <div className="text-blue-400 text-sm animate-pulse font-bold">
               AI бичиж байна...
             </div>
           )}
         </div>
   
         <div className="p-4 bg-slate-900 rounded-b-3xl border-t border-slate-800">
           <form onSubmit={handleChatSubmit} className="flex gap-3">
             <input
               type="text"
               value={cfoChatInput}
               onChange={(e) => setCfoChatInput(e.target.value)}
               placeholder="Асуултаа энд бичнэ үү..."
               className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
             />
             <button
               type="submit"
               disabled={isCfoLoading || !cfoChatInput.trim()}
               className="bg-blue-500 text-white px-5 py-3 rounded-xl disabled:opacity-50 transition shadow-lg hover:bg-blue-400 font-bold text-sm"
             >
               Илгээх
             </button>
           </form>
         </div>
       </div>
  );
}