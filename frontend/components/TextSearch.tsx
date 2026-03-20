"use client";

import { useState, FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface TextSearchProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

const PLACEHOLDERS = [
  "oversized beige linen blazer…",
  "red floral midi dress…",
  "vintage denim jacket…",
  "black chunky platform boots…",
  "white lace summer top…",
];

export function TextSearch({ onSearch, loading }: TextSearchProps) {
  const [query, setQuery] = useState("");
  const placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`e.g. ${placeholder}`}
        disabled={loading}
        className={clsx(
          "w-full pl-0 pr-8 py-2 border-b border-gray-200 bg-transparent",
          "text-sm text-[#191919] placeholder:text-gray-400 tracking-wide",
          "focus:outline-none focus:border-[#1B4332] transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      />
      <button
        type="submit"
        disabled={!query.trim() || loading}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-[#40916C] hover:text-[#1B4332] disabled:opacity-30 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowRight className="w-4 h-4" />
        )}
      </button>
    </form>
  );
}
