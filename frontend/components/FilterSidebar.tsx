"use client";

import { SearchFilters } from "@/app/page";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface FilterSidebarProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

const CATEGORIES = ["Topwear", "Bottomwear", "Footwear", "Bags", "Accessories", "Dress", "Outerwear"];
const GENDERS    = ["Men", "Women", "Unisex", "Boys", "Girls"];
const COLORS     = ["Black", "White", "Blue", "Red", "Green", "Pink", "Beige", "Brown", "Grey"];

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const toggle = <K extends "category" | "color">(key: K, value: string) => {
    const current = (filters[key] as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  };

  const setGender = (g: string) =>
    onChange({ ...filters, gender: filters.gender === g ? undefined : g });

  const setPrice = (min: number | undefined, max: number | undefined) =>
    onChange({ ...filters, price_min: min, price_max: max });

  const clearAll = () => onChange({});
  const hasFilters = Object.values(filters).some((v) =>
    Array.isArray(v) ? v.length > 0 : v != null
  );

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#191919]">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-[#40916C] hover:text-[#1B4332] transition-colors tracking-wide"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <FilterGroup label="Category">
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            active={filters.category?.includes(c) ?? false}
            onClick={() => toggle("category", c)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Gender">
        {GENDERS.map((g) => (
          <Chip
            key={g}
            label={g}
            active={filters.gender === g}
            onClick={() => setGender(g)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Color">
        {COLORS.map((c) => (
          <Chip
            key={c}
            label={c}
            active={filters.color?.includes(c) ?? false}
            onClick={() => toggle("color", c)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Price">
        {[
          { label: "Under $50",   min: undefined, max: 50 },
          { label: "$50 – $100",  min: 50,        max: 100 },
          { label: "$100 – $200", min: 100,       max: 200 },
          { label: "Over $200",   min: 200,       max: undefined },
        ].map(({ label, min, max }) => {
          const active = filters.price_min === min && filters.price_max === max;
          return (
            <Chip
              key={label}
              label={label}
              active={active}
              onClick={() =>
                active ? setPrice(undefined, undefined) : setPrice(min, max)
              }
            />
          );
        })}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 tracking-[0.15em] uppercase mb-3">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-2.5 py-1 text-xs border font-medium transition-all tracking-wide",
        active
          ? "bg-[#1B4332] text-white border-[#1B4332]"
          : "bg-white text-gray-500 border-gray-200 hover:border-[#1B4332] hover:text-[#1B4332]"
      )}
    >
      {label}
    </button>
  );
}
