"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type ActiveTab = "feed" | "discover" | "collections" | "profile";

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onUpload: () => void;
  onAuthOpen: () => void;
  onTextSearch: (q: string) => void;
  loading: boolean;
}

const NAV_LINKS: { tab: ActiveTab; label: string }[] = [
  { tab: "discover",    label: "DISCOVER"    },
  { tab: "collections", label: "COLLECTIONS" },
  { tab: "profile",     label: "PROFILE"     },
];

export function Navbar({
  activeTab,
  onTabChange,
  onUpload,
  onAuthOpen,
}: NavbarProps) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* ── Top nav bar ── single compact row──────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream border-b border-warm-border/60">
        <div className="flex items-center justify-between px-5 ph-14 max-w-[1600px] mx-auto">

          {/* Logo */}
          <button
            onClick={() => onTabChange("feed")}
            className="flex items-baseline gap-2 leading-none"
          >
            <span className="font-display text-2xl text-green-deep tracking-tight leading-none">
              Mira.
            </span>
            <span className="hidden sm:inline font-mono text-[10px] text-green-muted tracking-[0.2em]">
              SEARCH ENGINE
            </span>
          </button>

          {/* Desktop: horizontal nav links */}                                                                                                                
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ tab, label }) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`font-mono text-[11px] tracking-[0.18em] transition-colors ${
                  activeTab === tab
                    ? "text-green-deep border-b border-green-deep pb-px" 
                    : "text-green-muted hover:text-green-deep"
                }`}
              >
                {label}
              </button>
            ))}
            {user ? (
              <button
                onClick={onUpload}
                 className="font-mono text-[11px] tracking-[0.18em] text-cream bg-green-deep px-4 py-1.5 hover:bg-green-mid transition-colors"
              >
                UPLOAD +
              </button>
            ) : (
              <button
                onClick={onAuthOpen}
                className="font-mono text-[11px] tracking-[0.18em] text-cream bg-green-deep px-4 py-1.5 hover:bg-green-mid transition-colors"
              >
                SIGN IN
              </button>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden font-mono text-[11px] tracking-widest text-green-deep"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "CLOSE" : "MENU"}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-warm-border/60 bg-cream px-5 py-4 flex flex-col gap-3">
            {NAV_LINKS.map(({ tab, label }) => (
              <button
                key={tab}
                onClick={() => { onTabChange(tab); setMenuOpen(false); }}
                className={`font-mono text-[11px] tracking-[0.18em] text-left transition-colors ${
                  activeTab === tab ? "text-green-deep" : "text-green-muted"
                }`}
              >
                {label}
              </button>
            ))}
            {user ? (
              <button
                onClick={() => { onUpload(); setMenuOpen(false); }}
                className="font-mono text-[11px] tracking-[0.18em] text-green-deep text-left border-b border-green-deep pb-px w-fit"
              >
                UPLOAD +
              </button>
            ) : (
              <button
                onClick={() => { onAuthOpen(); setMenuOpen(false); }}
                className="font-mono text-[11px] tracking-[0.18em] text-green-deep text-left border-b border-green-deep pb-px w-fit"
              >
                SIGN IN
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
