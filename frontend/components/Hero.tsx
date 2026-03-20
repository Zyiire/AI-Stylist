"use client";

import { ArrowRight, Camera } from "lucide-react";
import { useState, FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2 } from "lucide-react";

interface HeroProps {
  onTextSearch: (q: string) => void;
  onImageSearch: (file: File) => void;
  onPublish: () => void;
  loading: boolean;
}

const PLACEHOLDERS = [
  "oversized linen blazer",
  "red floral midi dress",
  "vintage denim jacket",
  "black platform boots",
  "white lace summer top",
];

const FLOAT_CARDS = [
  { top: "8%",  left: "3%",   w: 108, h: 144, rotate: -9,  bg: "from-[#2D6A4F] to-[#40916C]", anim: "animate-float",    op: 0.45 },
  { top: "22%", right: "4%",  w: 90,  h: 120, rotate: 6,   bg: "from-[#1B4332] to-[#2D6A4F]", anim: "animate-float-d1", op: 0.4 },
  { bottom: "14%", left: "7%",  w: 80, h: 107, rotate: 4,  bg: "from-[#40916C] to-[#74C69D]", anim: "animate-float-d2", op: 0.35 },
  { bottom: "9%",  right: "3%", w: 115, h: 155, rotate: -5,bg: "from-[#0D1F17] to-[#1B4332]", anim: "animate-float-d3", op: 0.55 },
  { top: "58%", left: "1%",    w: 70,  h: 93,  rotate: 11, bg: "from-[#52B788] to-[#2D6A4F]", anim: "animate-float-d4", op: 0.3 },
];

export function Hero({ onTextSearch, onImageSearch, onPublish, loading }: HeroProps) {
  const [query, setQuery] = useState("");
  const placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) onImageSearch(files[0]); },
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: loading,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) onTextSearch(query.trim());
  };

  return (
    <section className="relative min-h-[calc(100vh-80px)] bg-[#0D1F17] flex items-center justify-center overflow-hidden">
      {/* Floating decorative cards */}
      {FLOAT_CARDS.map((card, i) => {
        const posStyle: React.CSSProperties = { position: "absolute", width: card.w, height: card.h };
        if (card.top)    posStyle.top = card.top;
        if (card.left)   posStyle.left = card.left;
        if (card.right)  posStyle.right = card.right;
        if (card.bottom) posStyle.bottom = card.bottom;
        return (
          <div key={i} className={`hidden lg:block ${card.anim}`} style={posStyle}>
            <div
              className={`w-full h-full bg-gradient-to-b ${card.bg}`}
              style={{ transform: `rotate(${card.rotate}deg)`, opacity: card.op }}
            />
          </div>
        );
      })}

      {/* Glow blobs */}
      <div className="hero-blob absolute top-1/4 left-1/4 w-80 h-80 bg-[#40916C]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="hero-blob-2 absolute bottom-1/4 right-1/3 w-64 h-64 bg-[#74C69D]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-24 text-center">
        {/* Eyebrow */}
        <p className="animate-fade-up text-[#74C69D]/70 text-xs font-medium tracking-[0.2em] uppercase mb-10">
          AI-powered fashion discovery
        </p>

        {/* Headline — editorial serif */}
        <h1
          className="animate-fade-up-d1 font-display font-light text-white leading-[1.05] mb-8"
          style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", letterSpacing: "-0.03em" }}
        >
          Find, Save &{" "}
          <em className="not-italic text-[#74C69D]">Share</em>{" "}
          Your Style
        </h1>

        {/* Thin rule */}
        <div className="animate-fade-up-d2 w-16 h-px bg-white/20 mx-auto mb-8" />

        {/* Subtitle */}
        <p className="animate-fade-up-d2 text-white/45 text-base max-w-sm mx-auto mb-12 leading-relaxed tracking-wide">
          The fashion community powered by AI.
          <br />
          Discover, save, and publish pieces you love.
        </p>

        {/* Search */}
        <div className="animate-fade-up-d3 space-y-4 max-w-lg mx-auto">
          {/* Text search — bottom-border only, editorial */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`e.g. ${placeholder}`}
              disabled={loading}
              className="w-full px-0 py-4 bg-transparent border-b border-white/25 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-white/60 transition-colors tracking-wide disabled:opacity-50"
              style={{ letterSpacing: "-0.01em" }}
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white disabled:opacity-30 transition-colors"
            >
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <ArrowRight className="w-5 h-5" />
              }
            </button>
          </form>

          {/* Or divider */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-white/30 text-xs tracking-widest uppercase">or</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {/* Photo upload */}
          <div
            {...getRootProps()}
            className={`flex items-center justify-center gap-3 px-6 py-4 border cursor-pointer transition-all ${
              isDragActive
                ? "border-white/60 bg-white/10"
                : "border-white/20 hover:border-white/40"
            } ${loading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input {...getInputProps()} />
            <Camera className="w-4 h-4 text-[#74C69D]" />
            <span className="text-white/50 text-sm tracking-wide">
              {isDragActive ? "Drop photo here…" : "Upload a clothing photo"}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="animate-fade-up-d3 flex flex-wrap items-center justify-center gap-6 mt-12">
          <button
            onClick={onPublish}
            className="border border-white/40 text-white text-xs font-medium tracking-[0.15em] uppercase px-8 py-3.5 hover:bg-white hover:text-[#1B4332] transition-colors duration-200"
          >
            Publish a Look
          </button>
          <a
            href="#discover"
            className="hover-underline text-white/40 hover:text-white text-xs tracking-[0.15em] uppercase transition-colors duration-200 flex items-center gap-2"
          >
            Browse styles <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Footnote */}
        <p className="animate-fade-up-d3 text-white/20 text-xs mt-16 tracking-[0.12em] uppercase">
          Powered by CLIP · Vector search · Instant results
        </p>
      </div>
    </section>
  );
}
