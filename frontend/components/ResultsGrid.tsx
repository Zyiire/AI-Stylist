"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { optimizeImage } from "@/lib/cloudinary";
import { Product } from "@/app/page";

interface ResultsGridProps {
  results: Product[];
  loading: boolean;
  onFeedback: (productId: number, rank: number) => void;
  query?: string;
  imagePreview?: string | null;
}

export function ResultsGrid({ results, loading, onFeedback, query, imagePreview }: ResultsGridProps) {
  const [exactTab, setExactTab] = useState(true);

  if (loading) {
    return (
      <div>
        <div className="flex gap-6 mb-6">
          <div className="h-3 skeleton w-32" />
          <div className="h-3 skeleton w-28" />
        </div>
        <div className="editorial-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-px h-12 bg-green-deep/20 mx-auto mb-8" />
        <p className="font-mono text-xs tracking-[0.2em] text-green-deep uppercase mb-2">
          No results found
        </p>
        <p className="font-mono text-[10px] text-green-muted tracking-wider">
          Try a different photo or search term.
        </p>
      </div>
    );
  }

  const displayed = exactTab ? results.slice(0, 3) : results;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">

      {/* ── Left sidebar ──────────────────────── */}
      <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-24 border border-warm-border/50">

        {/* Source image or query box */}
        {imagePreview ? (
          <div className="aspect-[3/4] relative overflow-hidden border-b border-warm-border/50">
            <Image src={imagePreview} alt="Search source" fill className="object-cover img-muted" />
            <div className="absolute bottom-0 left-0 right-0 bg-green-deep px-3 py-2">
              <span className="font-mono text-[9px] tracking-widest text-cream">SOURCE IMAGE</span>
            </div>
          </div>
        ) : query ? (
          <div className="aspect-[3/4] flex flex-col items-center justify-center text-center px-5 border-b border-warm-border/50 bg-cream-dark">
            <p className="font-display text-3xl text-green-deep leading-tight break-words">
              &ldquo;{query.toUpperCase()}&rdquo;
            </p>
            <p className="font-mono text-[9px] text-green-muted tracking-widest mt-3">TEXT SEARCH</p>
          </div>
        ) : null}

        {/* Results count */}
        <div className="px-3 py-3">
          <p className="font-mono text-[9px] tracking-[0.2em] text-green-muted uppercase">
            {results.length} matches found
          </p>
        </div>
      </aside>

      {/* ── Results grid ──────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-5 border-b border-warm-border/50 pb-3">
          <button
            onClick={() => setExactTab(true)}
            className={`font-mono text-[10px] tracking-[0.18em] uppercase transition-colors pb-0.5 ${
              exactTab
                ? "text-green-deep border-b border-green-deep"
                : "text-green-muted hover:text-green-deep"
            }`}
          >
            Top Matches ({Math.min(results.length, 3)})
          </button>
          <button
            onClick={() => setExactTab(false)}
            className={`font-mono text-[10px] tracking-[0.18em] uppercase transition-colors pb-0.5 ${
              !exactTab
                ? "text-green-deep border-b border-green-deep"
                : "text-green-muted hover:text-green-deep"
            }`}
          >
            All Results ({results.length})
          </button>
        </div>

        <div className="editorial-grid">
          {displayed.map((product, idx) => (
            <ResultCard
              key={product.product_id}
              product={product}
              idx={idx}
              onFeedback={onFeedback}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Individual result card ───────────────────────── */
function ResultCard({
  product,
  idx,
  onFeedback,
}: {
  product: Product;
  idx: number;
  onFeedback: (id: number, rank: number) => void;
}) {
  const num      = String(idx + 1).padStart(3, "0");
  const matchPct = Math.round(product.score * 100);

  return (
    <div
      className="product-card group cursor-pointer border-b border-r border-warm-border/40"
      onClick={() => onFeedback(product.product_id, idx)}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark">
        <Image
          src={optimizeImage(product.image_url)}
          alt={product.name}
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

        {/* Hover overlay */}
        <div className="card-overlay absolute inset-0 bg-green-deep/10" />

        {/* Match badge */}
        <div className="absolute bottom-0 left-0 bg-green-deep px-3 py-1.5">
          <span className="font-mono text-[9px] tracking-widest text-cream">
            {matchPct}% MATCH
          </span>
        </div>

        {/* External link */}
        <div className="card-actions absolute top-3 right-3">
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-cream text-green-deep font-mono text-[9px] tracking-wider px-2.5 py-1.5 hover:bg-green-deep hover:text-cream transition-colors"
            >
              VIEW <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>

      {/* Label row */}
      <div className="px-3 py-2.5">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-mono text-[10px] text-green-deep tracking-wide truncate">
            {num} // {product.name.toUpperCase().slice(0, 28)}
          </span>
          {product.price != null && product.price > 0 && (
            <span className="font-mono text-[10px] text-green-deep shrink-0">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>
        {product.brand && (
          <span className="font-mono text-[9px] text-green-muted tracking-widest">
            {product.brand.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

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
