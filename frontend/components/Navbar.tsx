"use client";

import { useState } from "react";
import { Upload, Menu, X, Loader2, Search } from "lucide-react";

interface NavbarProps {
  onPublish: () => void;
  onTextSearch: (q: string) => void;
  loading: boolean;
  showSearchBar?: boolean;
}

const NAV_LINKS = ["Discover", "Trending", "Collections"];

export function Navbar({ onPublish, onTextSearch, loading, showSearchBar }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) onTextSearch(q.trim());
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0D1F17] border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-[60px] flex items-center gap-4">

        {/* Logo */}
        <a href="/" className="shrink-0">
          <span className="font-display text-[20px] font-light text-white tracking-[-0.04em] leading-none">
            Verdant
          </span>
        </a>

        {/* Logo / nav separator */}
        <span className="hidden md:block text-white/20 font-mono text-sm select-none">/</span>

        {/* Desktop nav — monospace, uppercase, "/" separators */}
        <nav className="hidden md:flex items-center">
          {NAV_LINKS.map((link, i) => (
            <div key={link} className="flex items-center">
              <a
                href="#"
                className="font-mono text-[13px] uppercase tracking-[-0.03em] text-white/45 hover:text-white transition-colors duration-150 px-3 py-1"
              >
                {link}
              </a>
              {i < NAV_LINKS.length - 1 && (
                <span className="text-white/20 font-mono text-sm select-none">/</span>
              )}
            </div>
          ))}
        </nav>

        {/* Inline search — shown after first search */}
        {showSearchBar && (
          <form onSubmit={submit} className="hidden md:flex items-center flex-1 max-w-[220px] mx-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              disabled={loading}
              className="w-full pl-7 pr-3 py-1.5 bg-white/[0.06] border border-white/[0.09] rounded-[4px] font-mono text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors disabled:opacity-50"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 animate-spin" />
            )}
          </form>
        )}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Sign In — muted secondary */}
          <button className="hidden sm:block font-mono text-[13px] uppercase tracking-[-0.02em] text-white/45 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] px-3.5 py-1.5 rounded-[4px] transition-colors duration-150">
            Sign In
          </button>

          <span className="hidden sm:block text-white/20 font-mono text-sm select-none">/</span>

          {/* Publish — translucent green CTA */}
          <button
            onClick={onPublish}
            className="flex items-center gap-1.5 font-mono text-[13px] uppercase tracking-[-0.02em] text-[#74C69D] bg-[#40916C]/20 hover:bg-[#40916C]/35 px-3.5 py-1.5 rounded-[4px] transition-colors duration-150"
          >
            <Upload className="w-3 h-3" />
            Publish
          </button>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white/45 hover:text-white ml-2 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0A1A10] border-t border-white/[0.07] px-6 py-5 space-y-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="block font-mono text-[13px] uppercase tracking-[-0.02em] text-white/45 hover:text-white py-2 transition-colors"
            >
              {link}
            </a>
          ))}
          <div className="pt-3 mt-2 border-t border-white/[0.07] flex gap-2">
            <button className="font-mono text-[13px] uppercase tracking-[-0.02em] text-white/45 bg-white/[0.06] px-3.5 py-1.5 rounded-[4px]">
              Sign In
            </button>
            <button
              onClick={() => { onPublish(); setMenuOpen(false); }}
              className="flex items-center gap-1.5 font-mono text-[13px] uppercase tracking-[-0.02em] text-[#74C69D] bg-[#40916C]/20 px-3.5 py-1.5 rounded-[4px]"
            >
              <Upload className="w-3 h-3" />
              Publish
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
