"use client";

import { useState, useCallback } from "react";
import { Navbar, type ActiveTab } from "@/components/Navbar";
import { FeedGrid } from "@/components/FeedGrid";
import { PublishModal } from "@/components/PublishModal";
import { ResultsGrid } from "@/components/ResultsGrid";
import { FilterSidebar } from "@/components/FilterSidebar";
import { Footer } from "@/components/Footer";
import { useDropzone } from "react-dropzone";
import { Loader2 } from "lucide-react";

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
  const [activeTab, setActiveTab]       = useState<ActiveTab>("feed");
  const [results, setResults]           = useState<Product[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [filters, setFilters]           = useState<SearchFilters>({});
  const [hasSearched, setHasSearched]   = useState(false);
  const [publishOpen, setPublishOpen]   = useState(false);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [lastQuery, setLastQuery]       = useState<string | undefined>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [queryId]                       = useState(() => Math.random().toString(36).slice(2));

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
  }, []);

  const handleImageSearch = useCallback(async (file: File) => {
    setLoading(true); setError(null); setHasSearched(true);
    setActiveTab("discover"); setLastQuery(undefined);
    setImagePreview(URL.createObjectURL(file));
    const params = new URLSearchParams({ top_k: "24" });
    filters.category?.forEach((c) => params.append("category", c));
    if (filters.gender) params.set("gender", filters.gender);
    filters.color?.forEach((c) => params.append("color", c));
    if (filters.price_min != null) params.set("price_min", String(filters.price_min));
    if (filters.price_max != null) params.set("price_max", String(filters.price_max));
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_URL}/search/image?${params}`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `Error ${res.status}`);
      const data = await res.json();
      setResults(data.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResults([]);
    } finally { setLoading(false); }
  }, [filters]);

  const handleTextSearch = useCallback(async (query: string) => {
    setLoading(true); setError(null); setHasSearched(true);
    setActiveTab("discover"); setLastQuery(query); setImagePreview(null);
    try {
      const res = await fetch(`${API_URL}/search/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: 24, filters }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `Error ${res.status}`);
      const data = await res.json();
      setResults(data.results);
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
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onUpload={() => setPublishOpen(true)}
        onTextSearch={handleTextSearch}
        loading={loading}
      />

      {/* Feed view */}
      {activeTab === "feed" && (
        <FeedGrid onTabChange={(tab) => setActiveTab(tab)} />
      )}

      {/* Discover / search view */}
      {activeTab === "discover" && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-28 pb-16">

          {/* Search bar row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8 items-start sm:items-center">
            <DiscoverSearchBar
              onTextSearch={handleTextSearch}
              onImageSearch={handleImageSearch}
              loading={loading}
            />
            <button
              className="lg:hidden flex items-center gap-1.5 text-sm text-primary border border-outline-variant/40 px-3 py-2 rounded-xl font-medium hover:bg-surface-container-low transition-colors font-body shrink-0"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filters
            </button>
          </div>

          {!hasSearched ? (
            /* Empty discover state */
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <span className="material-symbols-outlined text-primary/20 text-7xl mb-6">search</span>
              <h2 className="font-headline text-2xl font-bold text-primary mb-2">Discover Styles</h2>
              <p className="text-on-surface-variant font-body text-sm max-w-xs">
                Search by text or upload a photo to find visually similar styles from the community.
              </p>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Desktop filter sidebar */}
              <aside className="hidden lg:block w-48 shrink-0 sticky top-28 self-start">
                <FilterSidebar filters={filters} onChange={setFilters} />
              </aside>

              {/* Mobile filter drawer */}
              {filtersOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
                  <div className="relative ml-auto w-72 h-full bg-surface p-6 overflow-y-auto shadow-2xl">
                    <FilterSidebar filters={filters} onChange={setFilters} />
                  </div>
                </div>
              )}

              <main className="flex-1 min-w-0">
                {error && (
                  <div className="text-sm text-error bg-error-container rounded-xl px-4 py-3 mb-6 font-body">
                    {error}
                  </div>
                )}
                <ResultsGrid
                  results={results}
                  loading={loading}
                  onFeedback={handleFeedback}
                  query={lastQuery}
                  imagePreview={imagePreview}
                />
              </main>
            </div>
          )}
        </div>
      )}

      {/* Collections / Profile placeholders */}
      {(activeTab === "collections" || activeTab === "profile") && (
        <div className="min-h-screen flex flex-col items-center justify-center text-center pt-16 pb-32">
          <span className="material-symbols-outlined text-primary/20 text-7xl mb-6">
            {activeTab === "collections" ? "auto_stories" : "person"}
          </span>
          <h2 className="font-headline text-2xl font-bold text-primary mb-2 capitalize">{activeTab}</h2>
          <p className="text-on-surface-variant font-body text-sm">Coming soon.</p>
        </div>
      )}

      <Footer />
      <PublishModal isOpen={publishOpen} onClose={() => setPublishOpen(false)} />
    </>
  );
}

/* ── Inline discover search bar ───────────────────────────────── */

function DiscoverSearchBar({
  onTextSearch,
  onImageSearch,
  loading,
}: {
  onTextSearch: (q: string) => void;
  onImageSearch: (f: File) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => {
      const f = files[0];
      if (f) { setPreview(URL.createObjectURL(f)); onImageSearch(f); }
    },
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: loading,
    noClick: true,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim() && !loading) onTextSearch(q.trim());
  };

  return (
    <div className="flex gap-2 flex-1 max-w-xl items-center">
      {/* Text search */}
      <form onSubmit={submit} className="relative flex-1">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search styles, textures, silhouettes…"
          disabled={loading}
          className="w-full pl-11 pr-10 py-3 bg-surface-container-lowest border-0 ring-1 ring-outline-variant/30 rounded-xl text-on-surface placeholder:text-outline/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-body disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!q.trim() || loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary disabled:opacity-30"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
        </button>
      </form>

      {/* Image upload trigger */}
      <div {...getRootProps()}>
        <input {...getInputProps()} id="img-upload" />
        <label
          htmlFor="img-upload"
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border border-outline-variant/30 cursor-pointer hover:border-primary/40 hover:bg-surface-container-low transition-all font-body text-sm text-on-surface-variant ${loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="query" className="w-5 h-5 object-cover rounded" />
          ) : (
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
          )}
          <span className="hidden sm:block">Photo</span>
        </label>
      </div>
    </div>
  );
}

