"use client";

import { SearchFilters } from "@/app/page";
import { clsx } from "clsx";

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
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-primary font-label">
          Filters
        </h3>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[10px] text-secondary hover:text-primary transition-colors tracking-wide font-label"
          >
            <span className="material-symbols-outlined text-[14px]">close</span> Clear
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
      <p className="text-[10px] font-bold text-on-surface-variant/50 tracking-widest uppercase mb-3 font-label">
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
        "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all font-label",
        active
          ? "bg-primary text-on-primary border-primary"
          : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:border-primary/40 hover:text-primary"
      )}
    >
      {label}
    </button>
  );
}
