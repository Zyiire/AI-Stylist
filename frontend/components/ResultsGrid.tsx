"use client";

import Image from "next/image";
import { ExternalLink, Heart, Share2 } from "lucide-react";
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
        <div className="w-px h-16 bg-[#1B4332]/30 mx-auto mb-8" />
        <p className="text-base font-light text-[#0D1F17] tracking-wide mb-2">No results found</p>
        <p className="text-sm text-gray-400 tracking-wide">Try a different photo or search term.</p>
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
      className="pin-card group relative bg-white cursor-pointer transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)]"
      onClick={() => onFeedback(product.product_id, idx)}
    >
      {/* Image */}
      <div className={`relative ${aspectClass} bg-[#f8f8f8] overflow-hidden`}>
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />

        {/* Dim overlay */}
        <div className="pin-overlay absolute inset-0 bg-black/25" />

        {/* Match badge */}
        <div className="absolute top-2.5 left-2.5 bg-[#0D1F17]/75 backdrop-blur-sm text-[#74C69D] text-[9px] font-semibold px-2 py-0.5 tracking-widest uppercase">
          {matchPct}% match
        </div>

        {/* Save button */}
        <div className="pin-save absolute top-2.5 right-2.5">
          <button
            className="bg-[#1B4332] text-white text-[10px] font-semibold tracking-[0.12em] uppercase px-3 py-1.5 hover:bg-[#2D6A4F] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Save
          </button>
        </div>

        {/* Bottom actions */}
        <div className="pin-overlay absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              className="bg-white/90 p-1.5 hover:bg-white transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Heart className="w-3.5 h-3.5 text-[#1B4332]" />
            </button>
            <button
              className="bg-white/90 p-1.5 hover:bg-white transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 className="w-3.5 h-3.5 text-[#1B4332]" />
            </button>
          </div>
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-white/90 text-[#0D1F17] text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1.5 hover:bg-white transition-colors"
            >
              Shop <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>

      {/* Card info */}
      <div className="px-1 pt-2.5 pb-3">
        {(product.brand || product.category) && (
          <p className="text-[10px] font-semibold text-[#40916C] uppercase tracking-[0.12em] truncate mb-0.5">
            {product.brand || product.category}
          </p>
        )}
        <p className="text-sm text-[#191919] leading-snug line-clamp-2 hover-underline cursor-pointer tracking-tight">
          {product.name}
        </p>
        {product.price != null && product.price > 0 && (
          <p className="text-sm font-medium text-[#1B4332] mt-1 tracking-tight">
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
    <div className="bg-white">
      <div className={`${aspectClass} skeleton`} />
      <div className="px-1 pt-2.5 pb-3 space-y-2">
        <div className="h-2 skeleton w-1/3" />
        <div className="h-3 skeleton w-3/4" />
        <div className="h-3 skeleton w-1/2" />
      </div>
    </div>
  );
}
