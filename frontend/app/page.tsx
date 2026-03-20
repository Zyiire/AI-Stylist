"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { PublishModal } from "@/components/PublishModal";
import { ResultsGrid } from "@/components/ResultsGrid";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ImageUpload } from "@/components/ImageUpload";
import { TextSearch } from "@/components/TextSearch";
import { SlidersHorizontal } from "lucide-react";

export interface Product {
  product_id: number;
  name: string;
  brand: string | null;
  category: string | null;
  color: string | null;
  price: number | null;
  image_url: string;
  product_url: string | null;
  score: number;
}

export interface SearchFilters {
  category?: string[];
  gender?: string;
  color?: string[];
  price_min?: number;
  price_max?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function HomePage() {
  const [results, setResults]       = useState<Product[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [latencyMs, setLatencyMs]   = useState<number | null>(null);
  const [filters, setFilters]       = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [queryId] = useState(() => Math.random().toString(36).slice(2));

  const handleImageSearch = useCallback(async (file: File) => {
    setLoading(true); setError(null); setHasSearched(true);
    const params = new URLSearchParams({ top_k: "24" });
    filters.category?.forEach((c) => params.append("category", c));
    if (filters.gender)   params.set("gender", filters.gender);
    filters.color?.forEach((c) => params.append("color", c));
    if (filters.price_min != null) params.set("price_min", String(filters.price_min));
    if (filters.price_max != null) params.set("price_max", String(filters.price_max));
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_URL}/search/image?${params}`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `Error ${res.status}`);
      const data = await res.json();
      setResults(data.results); setLatencyMs(data.latency_ms);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResults([]);
    } finally { setLoading(false); }
  }, [filters]);

  const handleTextSearch = useCallback(async (query: string) => {
    setLoading(true); setError(null); setHasSearched(true);
    try {
      const res = await fetch(`${API_URL}/search/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: 24, filters }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `Error ${res.status}`);
      const data = await res.json();
      setResults(data.results); setLatencyMs(data.latency_ms);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResults([]);
    } finally { setLoading(false); }
  }, [filters]);

  const handleFeedback = useCallback(async (productId: number, rank: number) => {
    await fetch(`${API_URL}/search/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query_id: queryId, clicked_product_id: productId, rank }),
    }).catch(() => {});
  }, [queryId]);

  return (
    <>
      <Navbar
        onPublish={() => setPublishOpen(true)}
        onTextSearch={handleTextSearch}
        loading={loading}
        showSearchBar={hasSearched}
      />

      {/* Hero — landing state */}
      {!hasSearched && (
        <Hero
          onTextSearch={handleTextSearch}
          onImageSearch={handleImageSearch}
          onPublish={() => setPublishOpen(true)}
          loading={loading}
        />
      )}

      {/* Results — after search */}
      {hasSearched && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          {/* Re-search bar */}
          <div className="flex gap-3 mb-5 items-center">
            <div className="flex-1 max-w-sm">
              <TextSearch onSearch={handleTextSearch} loading={loading} />
            </div>
            <div className="w-40">
              <ImageUpload onSearch={handleImageSearch} loading={loading} compact />
            </div>
            {/* Mobile filter toggle */}
            <button
              className="lg:hidden flex items-center gap-1.5 text-sm text-[#1B4332] border border-[#1B4332] px-3 py-2 rounded-xl font-medium hover:bg-[#f0fdf4] transition-colors"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="flex gap-6">
            {/* Sidebar — desktop */}
            <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
              <FilterSidebar filters={filters} onChange={setFilters} />
            </aside>

            {/* Mobile filter drawer */}
            {filtersOpen && (
              <div className="lg:hidden fixed inset-0 z-40 flex">
                <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
                <div className="relative ml-auto w-72 h-full bg-white p-6 overflow-y-auto shadow-2xl">
                  <FilterSidebar filters={filters} onChange={setFilters} />
                </div>
              </div>
            )}

            {/* Main content */}
            <main className="flex-1 min-w-0">
              {/* Meta */}
              {!loading && results.length > 0 && (
                <p className="text-xs text-gray-400 mb-4 font-medium">
                  {results.length} results
                  {latencyMs != null && ` · ${latencyMs.toFixed(0)}ms`}
                </p>
              )}

              {/* Error */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <ResultsGrid results={results} loading={loading} onFeedback={handleFeedback} />
            </main>
          </div>
        </div>
      )}

      <PublishModal isOpen={publishOpen} onClose={() => setPublishOpen(false)} />
    </>
  );
}
