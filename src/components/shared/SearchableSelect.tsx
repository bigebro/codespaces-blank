// src/components/shared/SearchableSelect.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

// Бусад файлуудад хэрэг болж магадгүй тул Type-ийг нь бас export хийж өгнө
export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  allowCustom?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Сонгоно уу --",
  className = "",
  allowCustom = true,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Гадуур дарахад цэсийг автоматаар хаах
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Хайлт өөрчлөгдөх бүрд курсорыг хамгийн эхний үр дүн дээр аваачна
  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

 // ⚡ АВТОМАТ SCROLL: Сумаар ⬇️ ⬆️ явахад гүйлгэгч нь сонгосон бараагаа дагаж доошилно!
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);


  const selectedOption = options.find((o) => o.value === value);
  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

   const exactMatch = filtered.some(o => o.label.toLowerCase() === search.trim().toLowerCase());

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Сонгогдсон утгыг харуулах товчлуур */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="w-full bg-[#060b17] border border-slate-700 hover:border-purple-500 rounded-xl px-3 py-2 text-sm text-left text-white flex items-center justify-between gap-2 transition cursor-pointer shadow-sm"
      >
        <span className="truncate font-bold">
           {selectedOption ? selectedOption.label : value ? value : <span className="text-slate-500 font-normal">{placeholder}</span>}
        </span>
        <span className="text-xs text-slate-500 shrink-0">▼</span>
      </button>

       {/* Хайлттай цэс */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[300px] max-w-[380px] bg-[#0d1527] border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in duration-100">
          
          {/* Хайлтын Input */}
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered.length > 0 && filtered[activeIndex]) {
                  onChange(filtered[activeIndex].value);
                  setIsOpen(false);
                  setSearch("");
                } else if (allowCustom && search.trim()) {
                  onChange(search.trim());
                  setIsOpen(false);
                  setSearch("");
                }
              } else if (e.key === "Escape") {
                setIsOpen(false);
              }
            }}
            placeholder="🔍 Бичих (Сумаар ⬆️⬇️ гүйлгээд Enter дар)..."
            className="w-full bg-[#060b17] border border-purple-500/60 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none font-bold placeholder:text-slate-500"
          />

          {/* 📜 БАРААНУУДЫН ГҮЙДЭГ ХЭСЭГ (max-h-72 буюу 290px өндөртэй болсон) */}
          <div 
            ref={listRef}
            className="max-h-72 overflow-y-auto space-y-1 pr-1 overscroll-contain"
          >
            {/* Шинээр нэмэх товч (Байхгүй бараа бичсэн үед) */}
            {allowCustom && search.trim() && !exactMatch && (
              <button
                type="button"
                onClick={() => {
                  onChange(search.trim());
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition flex items-center justify-between cursor-pointer mb-1"
              >
                <span>➕ Шинээр үүсгэх: "{search.trim()}"</span>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded font-mono">Enter ↵</span>
              </button>
            )}

            {filtered.length === 0 && !search.trim() ? (
              <p className="text-xs text-slate-500 p-3 text-center">Олдсонгүй</p>
            ) : (
              filtered.map((opt, idx) => {
                const isHighlighted = idx === activeIndex;
                const isSelected = opt.value === value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-active={isHighlighted ? "true" : undefined} // 👈 Автомат scroll-д зориулсан тэмдэглэгээ
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm transition flex items-center justify-between cursor-pointer ${
                      isHighlighted
                        ? "bg-purple-600 text-white font-black shadow-md scale-[1.01]"
                        : isSelected
                        ? "bg-purple-950/60 text-purple-300 font-bold border border-purple-500/40"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className={`text-[11px] ml-2 font-mono shrink-0 ${isHighlighted ? "text-purple-200" : "text-slate-500"}`}>
                        {opt.sublabel}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-500 text-center">
            ⬆️ ⬇️ Сумаар сонгоод ↵ Enter дарж баталгаажуулна
          </div>
        </div>
      )}
    </div>
  );
}