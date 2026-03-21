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

const ASPECT_CLASSES = ["aspect-[2/3]", "aspect-[3/4]", "aspect-[4/5]", "aspect-square", "aspect-[3/5]"];

const DETECTED_ATTRS = ["Wool Blend", "Single Breasted", "Anthracite", "Notched Lapel"];

export function ResultsGrid({ results, loading, onFeedback, query, imagePreview }: ResultsGridProps) {
  const [exactTab, setExactTab] = useState(true);

  if (loading) {
    return (
      <div className="flex gap-12 items-start">
        <SkeletonSidebar />
        <div className="flex-1 masonry">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="masonry-item">
              <SkeletonCard idx={i} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-px h-16 bg-primary/20 mx-auto mb-8" />
        <p className="font-headline text-xl font-bold text-primary mb-2">No results found</p>
        <p className="text-sm text-on-surface-variant font-body">Try a different photo or search term.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10 items-start">
      {/* Left sticky sidebar */}
      <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-28">
        {/* Source image or query indicator */}
        {imagePreview ? (
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low mb-5 relative">
            <Image src={imagePreview} alt="Search source" fill className="object-cover" />
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-primary/90 text-on-primary px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[14px]">lens_blur</span>
              <span className="font-label text-[10px] font-bold tracking-widest uppercase">Source Image</span>
            </div>
          </div>
        ) : query ? (
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low mb-5 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-primary/30 text-6xl mb-4">search</span>
            <p className="font-headline font-bold text-primary text-lg tracking-tight">"{query}"</p>
            <p className="text-xs text-outline font-label mt-1">Text search</p>
          </div>
        ) : null}

        {/* Detected attributes */}
        <div className="bg-surface-container-low p-5 rounded-xl">
          <h3 className="font-headline font-bold text-sm text-primary mb-3">Detected Attributes</h3>
          <div className="flex flex-wrap gap-2">
            {DETECTED_ATTRS.map((attr) => (
              <span key={attr} className="px-3 py-1 bg-surface-container-lowest rounded-full font-label text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                {attr}
              </span>
            ))}
          </div>
        </div>

        {/* Results meta */}
        <div className="mt-5 px-1">
          <p className="text-[10px] uppercase tracking-widest text-outline font-label">
            {results.length} visual matches found
          </p>
        </div>
      </aside>

      {/* Right: results masonry */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex gap-5">
            <button
              onClick={() => setExactTab(true)}
              className={`font-label text-xs font-bold uppercase tracking-widest pb-1 transition-colors ${exactTab ? "text-primary border-b-2 border-primary" : "text-outline hover:text-primary"}`}
            >
              Top Matches ({Math.min(results.length, 3)})
            </button>
            <button
              onClick={() => setExactTab(false)}
              className={`font-label text-xs font-bold uppercase tracking-widest pb-1 transition-colors ${!exactTab ? "text-primary border-b-2 border-primary" : "text-outline hover:text-primary"}`}
            >
              Similar Aesthetics ({results.length})
            </button>
          </div>
          <div className="flex items-center gap-2 text-outline">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            <span className="font-label text-xs font-bold uppercase tracking-widest hidden sm:block">Filter</span>
          </div>
        </div>

        <div className="masonry">
          {(exactTab ? results.slice(0, 3) : results).map((product, idx) => (
            <div key={product.product_id} className="masonry-item">
              <PinCard product={product} idx={idx} onFeedback={onFeedback} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PinCard({
  product,
  idx,
  onFeedback,
}: {
  product: Product;
  idx: number;
  onFeedback: (id: number, rank: number) => void;
}) {
  const aspectClass = ASPECT_CLASSES[idx % ASPECT_CLASSES.length];
  const matchPct = Math.round(product.score * 100);

  return (
    <div
      className="pin-card group relative bg-surface-container-lowest cursor-pointer transition-all duration-300 hover:shadow-[0_20px_40px_rgba(28,27,27,0.10)] rounded-xl overflow-hidden"
      onClick={() => onFeedback(product.product_id, idx)}
    >
      <div className={`relative ${aspectClass} bg-surface-container-low overflow-hidden`}>
        <Image
          src={optimizeImage(product.image_url)}
          alt={product.name}
          fill
          quality={90}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
        />

        <div className="pin-overlay absolute inset-0 bg-primary/15" />

        {/* Match badge */}
        <div className="absolute top-3 left-3 bg-primary-container text-on-primary-container px-2.5 py-1 rounded-full">
          <span className="font-label text-[9px] font-extrabold tracking-widest uppercase">{matchPct}% Match</span>
        </div>

        {/* Actions overlay */}
        <div className="pin-save absolute top-3 right-3">
          <button
            className="bg-white/90 glass-nav text-primary p-1.5 rounded-full hover:bg-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="material-symbols-outlined text-[18px]">favorite</span>
          </button>
        </div>

        <div className="pin-overlay absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <button
            className="bg-white/90 glass-nav p-1.5 rounded-full hover:bg-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="material-symbols-outlined text-primary text-[16px]">share</span>
          </button>
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-white/90 glass-nav text-primary text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-full hover:bg-white transition-colors font-label"
            >
              View <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-3.5">
        {(product.brand || product.category) && (
          <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] truncate mb-0.5 font-label">
            {product.brand || product.category}
          </p>
        )}
        <p className="text-sm text-on-surface font-semibold leading-snug line-clamp-2 tracking-tight font-headline">
          {product.name}
        </p>
        {product.price != null && product.price > 0 && (
          <p className="text-xs font-bold text-primary mt-1 font-body">${product.price.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonSidebar() {
  return (
    <div className="w-72 shrink-0 space-y-4">
      <div className="aspect-[3/4] skeleton rounded-xl" />
      <div className="h-28 skeleton rounded-xl" />
    </div>
  );
}

function SkeletonCard({ idx }: { idx: number }) {
  const aspectClass = ASPECT_CLASSES[idx % ASPECT_CLASSES.length];
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
      <div className={`${aspectClass} skeleton`} />
      <div className="px-3 pt-2.5 pb-3 space-y-1.5">
        <div className="h-2 skeleton w-1/3 rounded" />
        <div className="h-3 skeleton w-3/4 rounded" />
      </div>
    </div>
  );
}
