"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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

export function Navbar({ activeTab, onTabChange, onUpload, onAuthOpen, onTextSearch, loading }: NavbarProps) {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { onTabChange("discover"); onTextSearch(q.trim()); }
  };

  return (
    <>
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
        <div className="flex items-center justify-between px-6 bg-white/70 glass-nav rounded-xl max-w-7xl mx-auto h-16 shadow-[0_20px_40px_rgba(28,27,27,0.06)]">

          {/* Logo + links */}
          <div className="flex items-center gap-8">
            <button onClick={() => onTabChange("feed")} className="shrink-0">
              <span className="text-xl font-bold tracking-tighter text-primary font-headline">Mira</span>
            </button>

            <div className="hidden md:flex items-center gap-6">
              {(["feed", "discover", "collections", "profile"] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={`text-xs font-bold tracking-widest uppercase font-label transition-all duration-300 pb-0.5 ${
                    activeTab === tab
                      ? "text-primary border-b-2 border-primary"
                      : "text-primary/40 hover:text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search + actions */}
          <div className="flex items-center gap-4">
            <form
              onSubmit={submit}
              className="hidden sm:flex items-center bg-surface-container-low px-4 py-2 rounded-full gap-2"
            >
              <span className="material-symbols-outlined text-outline text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search inspiration..."
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-label placeholder:text-outline-variant w-36 text-on-surface"
                disabled={loading}
              />
              {loading && <Loader2 className="w-3 h-3 animate-spin text-outline shrink-0" />}
            </form>

            <span className="material-symbols-outlined text-primary cursor-pointer hidden sm:block">notifications</span>
            <span className="material-symbols-outlined text-primary cursor-pointer hidden sm:block">auto_awesome</span>

            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onUpload}
                  className="bg-primary text-on-primary px-5 py-1.5 rounded-full text-xs font-bold font-label tracking-widest uppercase hover:scale-95 transition-transform duration-200"
                >
                  Upload
                </button>
                <button
                  onClick={() => onTabChange("profile")}
                  title={user.email ?? "Profile"}
                  className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold font-label hover:opacity-80 transition-opacity"
                >
                  {initials}
                </button>
              </div>
            ) : (
              <button
                onClick={onAuthOpen}
                className="bg-primary text-on-primary px-5 py-1.5 rounded-full text-xs font-bold font-label tracking-widest uppercase hover:scale-95 transition-transform duration-200"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 pb-8 pt-4 md:hidden bg-white/70 glass-nav shadow-[0_-10px_30px_rgba(0,0,0,0.04)] rounded-t-3xl">
        {(
          [
            { tab: "feed",        icon: "grid_view",    label: "Feed" },
            { tab: "discover",    icon: "explore",      label: "Discover" },
            { tab: "collections", icon: "auto_stories", label: "Collections" },
            { tab: "profile",     icon: "person",       label: "Profile" },
          ] as { tab: ActiveTab; icon: string; label: string }[]
        ).map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex flex-col items-center justify-center transition-all rounded-xl px-3 py-2 ${
              activeTab === tab
                ? "bg-primary text-on-primary scale-90"
                : "text-outline hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
            <span className="font-label text-[10px] font-bold tracking-widest uppercase mt-0.5">{label}</span>
          </button>
        ))}
      </nav>

      {/* FAB */}
      <button
        onClick={user ? onUpload : onAuthOpen}
        className="fixed right-6 bottom-24 md:bottom-8 z-40 bg-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
      >
        <span className="material-symbols-outlined text-[28px]">
          {user ? "add" : "person"}
        </span>
      </button>
    </>
  );
}
