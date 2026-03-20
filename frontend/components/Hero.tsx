"use client";

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
    <section className="min-h-[calc(100vh-0px)] bg-surface flex flex-col items-center justify-center overflow-hidden pt-28 pb-24 px-6 relative">
      {/* Subtle background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto w-full text-center">
        {/* Eyebrow */}
        <p className="animate-fade-up text-[11px] uppercase tracking-[0.2em] font-bold text-primary/50 font-label mb-8">
          AI-powered fashion discovery
        </p>

        {/* Headline */}
        <h1
          className="animate-fade-up-d1 font-headline font-extrabold tracking-tighter text-primary leading-[1.05] mb-6"
          style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)" }}
        >
          Find, Save &{" "}
          <em className="not-italic text-secondary">Share</em>{" "}
          Your Style
        </h1>

        {/* Thin rule */}
        <div className="animate-fade-up-d2 w-16 h-px bg-primary/15 mx-auto mb-6" />

        {/* Subtitle */}
        <p className="animate-fade-up-d2 text-on-surface-variant text-base max-w-sm mx-auto mb-12 leading-relaxed font-body">
          The fashion community powered by AI.
          <br />
          Discover, save, and publish pieces you love.
        </p>

        {/* Search block */}
        <div className="animate-fade-up-d3 max-w-lg mx-auto space-y-4">
          {/* Text search */}
          <form onSubmit={handleSubmit} className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 text-[20px]">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`e.g. ${placeholder}`}
              disabled={loading}
              className="w-full pl-12 pr-12 py-4 bg-surface-container-lowest border-0 ring-1 ring-outline-variant/30 rounded-xl text-on-surface placeholder:text-outline/40 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-body disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-on-primary p-2 rounded-lg disabled:opacity-30 transition-all hover:bg-primary-container active:scale-95"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              }
            </button>
          </form>

          {/* Or divider */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-outline-variant/30" />
            <span className="text-outline/50 text-xs tracking-widest uppercase font-label">or</span>
            <div className="h-px flex-1 bg-outline-variant/30" />
          </div>

          {/* Image upload */}
          <div
            {...getRootProps()}
            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl border cursor-pointer transition-all font-body text-sm ${
              isDragActive
                ? "border-primary/50 bg-primary/5"
                : "border-outline-variant/30 hover:border-primary/30 hover:bg-surface-container-low"
            } ${loading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input {...getInputProps()} />
            <span className="material-symbols-outlined text-primary/50 text-[20px]">photo_camera</span>
            <span className="text-on-surface-variant">
              {isDragActive ? "Drop photo here…" : "Upload a clothing photo"}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="animate-fade-up-d3 flex flex-wrap items-center justify-center gap-5 mt-12">
          <button
            onClick={onPublish}
            className="bg-primary text-on-primary px-8 py-3.5 rounded-xl text-sm font-bold font-label shadow-lg hover:bg-primary-container transition-all active:scale-95"
          >
            Publish a Look
          </button>
          <a
            href="#discover"
            className="text-primary/50 hover:text-primary text-sm font-medium font-body transition-colors flex items-center gap-1.5"
          >
            Browse styles
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </a>
        </div>

        {/* Footnote */}
        <p className="animate-fade-up-d3 text-[10px] uppercase tracking-[0.2em] font-label text-on-surface-variant/40 mt-16">
          Powered by CLIP · Vector search · Instant results
        </p>
      </div>
    </section>
  );
}
