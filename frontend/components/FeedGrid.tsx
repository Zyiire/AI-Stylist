"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Product } from "@/app/page";
import { optimizeImage } from "@/lib/cloudinary";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PLACEHOLDERS = [
  "oversized linen blazer",
  "red floral midi dress",
  "vintage denim jacket",
  "black platform boots",
  "white lace summer top",
];

const TAGS = ["#STREETWEAR", "#MINIMAL", "#VINTAGE", "#EDITORIAL", "#LUXURY", "#Y2K"];

interface FeedGridProps {
  onTabChange: (tab: "discover") => void;
  onTextSearch: (q: string) => void;
  onImageSearch: (file: File) => void;
  loading: boolean;
}

export function FeedGrid({ onTabChange, onTextSearch, onImageSearch, loading }: FeedGridProps) {
  const [items, setItems]       = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [query, setQuery]       = useState("");
  const [time, setTime]         = useState("");
  const placeholder             = useRef(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch feed
  useEffect(() => {
    fetch(`${API_URL}/search/feed?limit=24`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setError("Could not reach the server — it may still be starting up."))
      .finally(() => setFetching(false));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const f = files[0];
      if (f) { onTabChange("discover"); onImageSearch(f); }
    },
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: loading,
    noClick: true,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onTabChange("discover");
      onTextSearch(query.trim());
    }
  };

  return (
    <div className="bg-cream min-h-screen">

      {/* ── Hero section ─────────────────────────── */}
      <section className="relative pt-24 overflow-hidden border-b border-warm-border/50">

        {/* Watermark background text */}
        <div className="absolute bottom-0 right-0 overflow-hidden pointer-events-none select-none">
          <span className="font-display leading-none text-green-deep/[0.04]"
                style={{ fontSize: "clamp(8rem, 30vw, 22rem)" }}>
            MIRA
          </span>
        </div>

        <div className="relative px-5 sm:px-8">

          {/* Top display line */}
          <h1 className="font-display text-green-deep leading-none tracking-tight"
              style={{ fontSize: "clamp(5rem, 18vw, 14rem)" }}>
            SEARCH
          </h1>

          {/* Search input line */}
          <div className="my-3 sm:my-5" {...getRootProps()}>
            <input {...getInputProps()} />
            <form onSubmit={handleSubmit}>
              <div className={`flex items-center gap-4 pb-2 border-b-2 transition-colors ${
                isDragActive ? "border-green-mid" : "border-green-deep"
              }`}>
                {/* Accent dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-green-muted/50 shrink-0" />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isDragActive ? "Drop photo here…" : `e.g. ${placeholder.current}`}
                  disabled={loading}
                  className="flex-1 bg-transparent border-none outline-none ring-0 font-mono text-sm sm:text-base text-green-deep placeholder:text-green-muted/50 disabled:opacity-50"
                />

                {/* Image upload label */}
                <label
                  htmlFor="feed-img-upload"
                  className="font-mono text-[10px] tracking-[0.15em] text-green-muted hover:text-green-deep transition-colors cursor-pointer shrink-0"
                >
                  PHOTO ↑
                </label>
                <input
                  id="feed-img-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { onTabChange("discover"); onImageSearch(f); }
                  }}
                />

                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="font-mono text-[10px] sm:text-[11px] tracking-[0.15em] text-green-deep disabled:opacity-30 transition-opacity shrink-0"
                >
                  {loading ? "…" : "SEARCH →"}
                </button>
              </div>
            </form>
          </div>

          {/* Bottom display line */}
          <h1 className="font-display text-green-deep leading-none tracking-tight"
              style={{ fontSize: "clamp(5rem, 18vw, 14rem)" }}>
            STYLES
          </h1>

          {/* Hashtag pills */}
          <div className="flex flex-wrap gap-2 mt-5 pb-8">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  onTabChange("discover");
                  onTextSearch(tag.replace("#", "").toLowerCase());
                }}
                className="border border-green-deep rounded-full px-4 py-1.5 font-mono text-[10px] tracking-wide text-green-deep hover:bg-green-deep hover:text-cream transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product grid ─────────────────────────── */}
      <section>
        {fetching ? (
          <div className="editorial-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-6">
            <p className="font-mono text-[11px] tracking-widest text-green-muted">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-6">
            <p className="font-mono text-[11px] tracking-widest text-green-muted">
              NO ITEMS IN CATALOG YET — RUN THE INJECTION PIPELINE TO ADD CONTENT.
            </p>
          </div>
        ) : (
          <div className="editorial-grid">
            {items.map((item, idx) => (
              <ProductCard key={item.product_id} item={item} idx={idx} />
            ))}
          </div>
        )}
      </section>

      {/* ── Bottom CTA ───────────────────────────── */}
      {!fetching && !error && items.length > 0 && (
        <div className="flex flex-col items-center py-20 border-t border-warm-border/50">
          <button
            onClick={() => onTabChange("discover")}
            className="border border-green-deep rounded-full px-10 py-4 font-mono text-[11px] tracking-[0.25em] text-green-deep hover:bg-green-deep hover:text-cream transition-colors"
          >
            EXPLORE FULL LOOKBOOK
          </button>
          <div className="w-px h-12 bg-green-deep/10 mt-10" />
        </div>
      )}

      {/* ── System status bar ────────────────────── */}
      <div className="system-bar font-mono text-[9px] text-green-muted/70 leading-relaxed">
        <div>MIRA SYSTEM V.1.0</div>
        <div>SEARCH_ENGINE: ACTIVE</div>
        <div>LOCAL_TIME: {time}</div>
      </div>
    </div>
  );
}

/* ── Product card ─────────────────────────────────── */
function ProductCard({ item, idx }: { item: Product; idx: number }) {
  const num      = String(idx + 1).padStart(3, "0");
  const isNew    = idx % 7 === 0;
  const isLimited = idx % 11 === 3;

  return (
    <div className="product-card group cursor-pointer border-b border-r border-warm-border/40">
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
        <Image
          src={optimizeImage(item.image_url)}
          alt={item.name}
          fill
          quality={85}
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover img-muted group-hover:scale-[1.025] transition-transform duration-700"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
        />

        {/* Arc decoration */}
        <svg
          viewBox="0 0 100 133"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          <ellipse
            cx="50" cy="105"
            rx="40" ry="28"
            fill="none"
            stroke="rgba(240,235,224,0.35)"
            strokeWidth="0.4"
          />
        </svg>

        {/* Card overlay on hover */}
        <div className="card-overlay absolute inset-0 bg-green-deep/10" />

        {/* Stickers */}
        {isNew && (
          <div className="sticker sticker-dark">NEW ADD</div>
        )}
        {isLimited && (
          <div className="sticker sticker-light">LIMITED</div>
        )}
      </div>

      {/* Label row */}
      <div className="px-3 py-2.5">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-mono text-[10px] text-green-deep tracking-wide truncate">
            {num} // {item.name.toUpperCase().slice(0, 28)}
          </span>
          {item.price != null && item.price > 0 && (
            <span className="font-mono text-[10px] text-green-deep shrink-0">
              ${item.price.toFixed(2)}
            </span>
          )}
        </div>
        {item.brand && (
          <span className="font-mono text-[9px] text-green-muted tracking-widest">
            {item.brand.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton card ────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="border-b border-r border-warm-border/40">
      <div className="aspect-[3/4] skeleton" />
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="h-2.5 skeleton w-4/5" />
        <div className="h-2 skeleton w-1/3" />
      </div>
    </div>
  );
}
