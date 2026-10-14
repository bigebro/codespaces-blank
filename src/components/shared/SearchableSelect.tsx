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
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Сонгоно уу --",
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selectedOption = options.find((o) => o.value === value);
  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

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
          {selectedOption ? selectedOption.label : <span className="text-slate-500 font-normal">{placeholder}</span>}
        </span>
        <span className="text-xs text-slate-500 shrink-0">▼</span>
      </button>

      {/* Хайлттай хөвөгч цэс */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[260px] bg-[#0d1527] border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in duration-100">
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Нэрээр хайх..."
            className="w-full bg-[#060b17] border border-purple-500/60 rounded-xl px-3 py-2 text-sm text-white outline-none font-bold placeholder:text-slate-500"
          />

          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-500 p-2.5 text-center">Олдсонгүй</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition flex items-center justify-between cursor-pointer ${
                    opt.value === value
                      ? "bg-purple-600/30 text-purple-300 font-bold border border-purple-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-xs text-slate-500 ml-2 font-mono shrink-0">{opt.sublabel}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}