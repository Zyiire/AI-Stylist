"use client";

const MOCK_PINS = [
  { id: 1,  title: "Minimalist Structures",    creator: "@elara_vogue",    similarity: 98, aspect: "aspect-[3/4]",  bg: "bg-surface-container" },
  { id: 2,  title: "Urban Neoclassical",       creator: "@marcus_atelier", similarity: 84, aspect: "aspect-[2/3]",  bg: "bg-surface-container-high" },
  { id: 3,  title: "Textile Experiment 04",    creator: "@sara_designs",   similarity: 92, aspect: "aspect-square", bg: "bg-surface-variant" },
  { id: 4,  title: "Brutalist Accessories",    creator: "@lucas_v",        similarity: 77, aspect: "aspect-[3/5]",  bg: "bg-surface-container" },
  { id: 5,  title: "Gender Fluid Tonalism",    creator: "@jana_styles",    similarity: 89, aspect: "aspect-[4/5]",  bg: "bg-surface-container-high" },
  { id: 6,  title: "Ephemeral Silk",           creator: "@arch_fashion",   similarity: 94, aspect: "aspect-[3/4]",  bg: "bg-surface-variant" },
  { id: 7,  title: "Capsule Organization",     creator: null,              similarity: 65, aspect: "aspect-[4/3]",  bg: "bg-surface-container" },
  { id: 8,  title: "Tweed Reimagined",         creator: null,              similarity: 91, aspect: "aspect-[3/5]",  bg: "bg-surface-container-high" },
  { id: 9,  title: "Coastal Minimalism",       creator: "@ines_f",         similarity: 87, aspect: "aspect-[3/4]",  bg: "bg-surface-variant" },
  { id: 10, title: "Dark Academia Edit",       creator: "@theo_curator",   similarity: 95, aspect: "aspect-[2/3]",  bg: "bg-surface-container" },
  { id: 11, title: "Summer Layering",          creator: "@ami_style",      similarity: 73, aspect: "aspect-[4/5]",  bg: "bg-surface-container-high" },
  { id: 12, title: "Monochrome Study",         creator: "@piet_v",         similarity: 88, aspect: "aspect-square", bg: "bg-surface-variant" },
];

export function FeedGrid({ onTabChange }: { onTabChange: (tab: "discover") => void }) {
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
            Latest
          </button>
        </div>
      </header>

      {/* Masonry grid */}
      <div className="masonry">
        {MOCK_PINS.map((pin) => (
          <div key={pin.id} className="masonry-item group cursor-pointer">
            <div className={`relative overflow-hidden rounded-xl ${pin.bg} ${pin.aspect}`}>
              {/* Placeholder image area */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-outline-variant text-5xl">image</span>
              </div>

              {/* Hover tint */}
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* AI flare icon */}
              <div className="absolute top-3 right-3 bg-white/70 glass-nav p-2 rounded-full shadow-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">flare</span>
              </div>

              {/* Creator overlay */}
              {pin.creator && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-container border-2 border-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-primary-container text-[14px]">person</span>
                  </div>
                  <span className="text-white text-xs font-bold font-label tracking-wide">{pin.creator}</span>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="mt-2.5 px-1">
              <h3 className="font-headline text-sm font-semibold text-on-surface">{pin.title}</h3>
              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-[0.15rem] mt-0.5">
                {pin.similarity}% AI Match
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* End marker */}
      <div className="mt-24 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] font-label text-on-surface-variant/40 mb-8">
          End of Feed
        </p>
        <div className="w-px h-16 bg-primary/10 mx-auto" />
      </div>
    </div>
  );
}
