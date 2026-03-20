"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface NavbarProps {
  onPublish: () => void;
  onTextSearch: (q: string) => void;
  loading: boolean;
  showSearchBar?: boolean;
}

const NAV_LINKS = ["Discover", "Collections", "Trending"];

export function Navbar({ onPublish, onTextSearch, loading, showSearchBar }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) onTextSearch(q.trim());
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
        <div className="flex items-center justify-between px-6 bg-white/70 glass-nav rounded-xl max-w-7xl mx-auto h-16 shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
          {/* Left — logo + links */}
          <div className="flex items-center gap-8">
            <a href="/" className="shrink-0">
              <span className="text-xl font-bold tracking-tighter text-primary font-headline">
                Verdant
              </span>
            </a>

            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-primary/50 hover:text-primary transition-all duration-300 font-medium text-sm font-body"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Center — inline search after first query */}
          {showSearchBar && (
            <form
              onSubmit={submit}
              className="hidden md:flex items-center bg-surface-container-low rounded-full px-4 py-1.5 gap-2 flex-1 max-w-xs mx-6"
            >
              <span className="material-symbols-outlined text-primary/40 text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search styles..."
                disabled={loading}
                className="bg-transparent border-none text-sm focus:outline-none focus:ring-0 placeholder-primary/30 w-full font-body text-on-surface disabled:opacity-50"
              />
              {loading && <Loader2 className="w-3.5 h-3.5 text-primary/30 animate-spin shrink-0" />}
            </form>
          )}

          {/* Right — actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={onPublish}
              className="hidden md:block px-4 py-1.5 text-sm font-medium text-primary hover:bg-surface-container-low transition-all duration-300 rounded-xl font-body"
            >
              Upload
            </button>

            {/* Avatar placeholder */}
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center border-2 border-primary overflow-hidden">
              <span className="material-symbols-outlined text-on-primary-container text-[18px]">person</span>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden text-primary"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="material-symbols-outlined">
                {menuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white/95 glass-nav rounded-xl max-w-7xl mx-auto mt-2 px-6 py-5 space-y-1 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href="#"
                className="block text-sm font-medium text-primary/50 hover:text-primary py-2 transition-colors font-body"
              >
                {link}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-outline-variant/20">
              <button
                onClick={() => { onPublish(); setMenuOpen(false); }}
                className="w-full text-left text-sm font-medium text-primary py-2 font-body"
              >
                Upload a Look
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
