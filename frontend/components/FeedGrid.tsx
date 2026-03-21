"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "@/app/page";
import { optimizeImage } from "@/lib/cloudinary";

const ASPECT_CLASSES = ["aspect-[3/4]", "aspect-[2/3]", "aspect-square", "aspect-[3/5]", "aspect-[4/5]"];

export function FeedGrid({ onTabChange }: { onTabChange: (tab: "discover") => void }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/search/feed?limit=24`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-32">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="font-headline text-5xl font-extrabold tracking-tight text-primary mb-3">
            Curated Inspiration
          </h1>
          <p className="text-on-surface-variant font-body text-base leading-relaxed">
            Explore AI-assisted fashion from our community of creators. Discover trends, textures, and silhouettes.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-container-highest px-5 py-2.5 rounded-full text-xs font-bold font-label tracking-widest uppercase text-primary">
            Trending
          </button>
          <button
            onClick={() => onTabChange("discover")}
            className="bg-white border border-outline-variant/30 px-5 py-2.5 rounded-full text-xs font-bold font-label tracking-widest uppercase text-outline hover:text-primary transition-colors"
          >
            Discover
          </button>
        </div>
      </header>

      {/* Masonry grid */}
      <div className="masonry">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonFeedCard key={i} idx={i} />)
          : items.map((item, idx) => {
              const aspectClass = ASPECT_CLASSES[idx % ASPECT_CLASSES.length];
              return (
                <div key={item.product_id} className="masonry-item group cursor-pointer">
                  <div className={`relative overflow-hidden rounded-xl bg-surface-container ${aspectClass}`}>
                    <Image
                      src={optimizeImage(item.image_url)}
                      alt={item.name}
                      fill
                      quality={90}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 right-3 bg-white/70 glass-nav p-2 rounded-full shadow-sm">
                      <span className="material-symbols-outlined text-primary text-[18px]">flare</span>
                    </div>
                  </div>
                  <div className="mt-2.5 px-1">
                    <h3 className="font-headline text-sm font-semibold text-on-surface">{item.name}</h3>
                    <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-[0.15rem] mt-0.5">
                      {item.brand || item.category || "Community"}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>

      {/* End marker */}
      {!loading && (
        <div className="mt-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] font-label text-on-surface-variant/40 mb-8">
            End of Feed
          </p>
          <div className="w-px h-16 bg-primary/10 mx-auto" />
        </div>
      )}
    </div>
  );
}

function SkeletonFeedCard({ idx }: { idx: number }) {
  const aspectClass = ASPECT_CLASSES[idx % ASPECT_CLASSES.length];
  return (
    <div className="masonry-item">
      <div className={`${aspectClass} skeleton rounded-xl`} />
      <div className="mt-2.5 px-1 space-y-1.5">
        <div className="h-3 skeleton w-3/4 rounded" />
        <div className="h-2 skeleton w-1/3 rounded" />
      </div>
    </div>
  );
}
