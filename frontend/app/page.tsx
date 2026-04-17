"use client";

import { useState, useCallback } from "react";
import { Navbar, type ActiveTab } from "@/components/Navbar";
import { FeedGrid } from "@/components/FeedGrid";
import { PublishModal } from "@/components/PublishModal";
import { AuthModal } from "@/components/AuthModal";
import { ResultsGrid } from "@/components/ResultsGrid";
import { FilterSidebar } from "@/components/FilterSidebar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useDropzone } from "react-dropzone";

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
  const [authOpen, setAuthOpen]         = useState(false);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const { user, signOut }               = useAuth();
  const [lastQuery, setLastQuery]       = useState<string | undefined>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [queryId]                       = useState(() => Math.random().toString(36).slice(2));

  const handleTabChange = useCallback((tab: ActiveTab) => setActiveTab(tab), []);

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
      setResults((await res.json()).results);
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
      setResults((await res.json()).results);
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
    <div className="bg-cream min-h-screen text-green-deep">
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onUpload={() => setPublishOpen(true)}
        onAuthOpen={() => setAuthOpen(true)}
        onTextSearch={handleTextSearch}
        loading={loading}
      />

      {/* ── Feed tab ─────────────────────────────── */}
      {activeTab === "feed" && (
        <FeedGrid
          onTabChange={(tab) => setActiveTab(tab)}
          onTextSearch={handleTextSearch}
          onImageSearch={handleImageSearch}
          loading={loading}
        />
      )}

      {/* ── Discover / search tab ────────────────── */}
      {activeTab === "discover" && (
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-24 pb-20">

          {/* Inline search bar */}
          <div className="mb-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <DiscoverSearchBar
              onTextSearch={handleTextSearch}
              onImageSearch={handleImageSearch}
              loading={loading}
            />
            <button
              className="lg:hidden font-mono text-[10px] tracking-[0.18em] text-green-deep border border-warm-border px-4 py-2 hover:bg-cream-dark transition-colors"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              FILTERS
            </button>
          </div>

          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-px h-12 bg-green-deep/15 mx-auto mb-8" />
              <p className="font-display text-5xl text-green-deep mb-3">DISCOVER</p>
              <p className="font-mono text-[10px] tracking-[0.2em] text-green-muted">
                SEARCH BY TEXT OR UPLOAD A PHOTO
              </p>
            </div>
          ) : (
            <div className="flex gap-8">
              {/* Desktop filter sidebar */}
              <aside className="hidden lg:block w-44 shrink-0 sticky top-24 self-start">
                <FilterSidebar filters={filters} onChange={setFilters} />
              </aside>

              {/* Mobile filter drawer */}
              {filtersOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                  <div className="absolute inset-0 bg-green-deep/40" onClick={() => setFiltersOpen(false)} />
                  <div className="relative ml-auto w-72 h-full bg-cream p-6 overflow-y-auto">
                    <FilterSidebar filters={filters} onChange={setFilters} />
                  </div>
                </div>
              )}

              <main className="flex-1 min-w-0">
                {error && (
                  <div className="font-mono text-[10px] tracking-wider text-red-800 bg-red-50 border border-red-200 px-4 py-3 mb-6">
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

      {/* ── Collections tab ──────────────────────── */}
      {activeTab === "collections" && (
        user ? (
          <EmptyState icon="ARCHIVE" title="COLLECTIONS" sub="Coming soon — save your favourite looks." />
        ) : (
          <EmptyState icon="ARCHIVE" title="SAVE YOUR LOOKS" sub="Sign in to build your personal fashion archive.">
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-6 border border-green-deep rounded-full px-8 py-3 font-mono text-[10px] tracking-[0.2em] text-green-deep hover:bg-green-deep hover:text-cream transition-colors"
            >
              SIGN IN
            </button>
          </EmptyState>
        )
      )}

      {/* ── Profile tab ──────────────────────────── */}
      {activeTab === "profile" && (
        user ? (
          <div className="min-h-screen flex flex-col items-center justify-center pt-20 pb-32 gap-8">
            <div className="w-20 h-20 bg-green-deep flex items-center justify-center">
              <span className="font-display text-4xl text-cream">
                {user.email?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="text-center">
              <p className="font-mono text-xs tracking-[0.2em] text-green-deep">{user.email}</p>
              <p className="font-mono text-[9px] tracking-widest text-green-muted mt-1">
                MEMBER SINCE{" "}
                {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
              </p>
            </div>
            <button
              onClick={signOut}
              className="border border-warm-border px-8 py-3 font-mono text-[10px] tracking-[0.2em] text-green-muted hover:text-green-deep hover:border-green-deep transition-colors"
            >
              SIGN OUT
            </button>
          </div>
        ) : (
          <EmptyState icon="PROFILE" title="YOUR PROFILE" sub="Sign in to access your personal atelier.">
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-6 border border-green-deep rounded-full px-8 py-3 font-mono text-[10px] tracking-[0.2em] text-green-deep hover:bg-green-deep hover:text-cream transition-colors"
            >
              SIGN IN
            </button>
          </EmptyState>
        )
      )}

      <Footer />
      <PublishModal isOpen={publishOpen} onClose={() => setPublishOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

/* ── Discover inline search bar ──────────────────── */
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
    <div className="flex gap-3 flex-1 max-w-2xl items-center" {...getRootProps()}>
      <input {...getInputProps()} />
      <form onSubmit={submit} className="flex-1">
        <div className="flex items-center gap-3 border-b border-green-deep pb-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search styles, textures, silhouettes…"
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none ring-0 font-mono text-sm text-green-deep placeholder:text-green-muted/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!q.trim() || loading}
            className="font-mono text-[10px] tracking-[0.15em] text-green-deep disabled:opacity-30 shrink-0"
          >
            {loading ? "…" : "→"}
          </button>
        </div>
      </form>

      {/* Image upload */}
      <div>
        <label
          htmlFor="discover-img-upload"
          className={`flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] text-green-muted hover:text-green-deep cursor-pointer transition-colors ${loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="query" className="w-5 h-5 object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          )}
          <span className="hidden sm:block">PHOTO</span>
        </label>
        <input
          id="discover-img-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setPreview(URL.createObjectURL(f)); onImageSearch(f); }
          }}
        />
      </div>
    </div>
  );
}

/* ── Empty state helper ──────────────────────────── */
function EmptyState({
  title,
  sub,
  children,
}: {
  icon?: string;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center pt-20 pb-32 px-6">
      <div className="w-px h-12 bg-green-deep/15 mx-auto mb-8" />
      <p className="font-display text-5xl text-green-deep mb-3">{title}</p>
      <p className="font-mono text-[10px] tracking-[0.2em] text-green-muted max-w-xs">{sub}</p>
      {children}
    </div>
  );
}
