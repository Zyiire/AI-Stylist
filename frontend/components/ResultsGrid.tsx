"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Product } from "@/app/page";

interface ResultsGridProps {
  results: Product[];
  loading: boolean;
  onFeedback: (productId: number, rank: number) => void;
}

const ASPECT_CLASSES = [
  "aspect-[2/3]",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/5]",
];

export function ResultsGrid({ results, loading, onFeedback }: ResultsGridProps) {
  if (loading) {
    return (
      <div className="masonry">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="masonry-item">
            <SkeletonCard idx={i} />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-px h-16 bg-primary/20 mx-auto mb-8" />
        <p className="text-base font-headline font-bold text-primary tracking-tight mb-2">
          No results found
        </p>
        <p className="text-sm text-on-surface-variant font-body">
          Try a different photo or search term.
        </p>
      </div>
    );
  }

  return (
    <div className="masonry">
      {results.map((product, idx) => (
        <div key={product.product_id} className="masonry-item">
          <PinCard product={product} idx={idx} onFeedback={onFeedback} />
        </div>
      ))}
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
      {/* Image */}
      <div className={`relative ${aspectClass} bg-surface-container-low overflow-hidden`}>
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
        />

        {/* Dim overlay */}
        <div className="pin-overlay absolute inset-0 bg-primary/20" />

        {/* Match badge */}
        <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest font-label">
            {matchPct}% match
          </span>
        </div>

        {/* Save button */}
        <div className="pin-save absolute top-2.5 right-2.5">
          <button
            className="bg-primary text-on-primary text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg hover:bg-primary-container transition-colors font-label"
            onClick={(e) => e.stopPropagation()}
          >
            Save
          </button>
        </div>

        {/* Bottom overlay actions */}
        <div className="pin-overlay absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg hover:bg-white transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined text-primary text-[16px]">favorite</span>
            </button>
            <button
              className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg hover:bg-white transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined text-primary text-[16px]">share</span>
            </button>
          </div>
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-primary text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors font-label"
            >
              Shop <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>

      {/* Card info */}
      <div className="px-3 pt-3 pb-4">
        {(product.brand || product.category) && (
          <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] truncate mb-0.5 font-label">
            {product.brand || product.category}
          </p>
        )}
        <p className="text-sm text-on-surface font-bold leading-snug line-clamp-2 tracking-tight font-headline">
          {product.name}
        </p>
        {product.price != null && product.price > 0 && (
          <p className="text-sm font-bold text-primary mt-1 tracking-tight font-body">
            ${product.price.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard({ idx }: { idx: number }) {
  const aspectClass = ASPECT_CLASSES[idx % ASPECT_CLASSES.length];
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
      <div className={`${aspectClass} skeleton`} />
      <div className="px-3 pt-3 pb-4 space-y-2">
        <div className="h-2 skeleton w-1/3 rounded" />
        <div className="h-3 skeleton w-3/4 rounded" />
        <div className="h-3 skeleton w-1/2 rounded" />
      </div>
    </div>
  );
}
