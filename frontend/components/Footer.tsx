export function Footer() {
  return (
    <footer className="w-full px-8 md:px-16 border-t border-primary/5 bg-surface-container-low pt-20 pb-10 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="space-y-4 max-w-sm">
          <span className="text-lg font-bold text-primary font-headline">Mira</span>
          <p className="text-on-surface-variant/60 text-sm leading-relaxed font-body">
            A sophisticated platform where fashion meets intelligence. Curate your visual
            identity with precision and AI-driven insights.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-widest font-bold text-primary font-label">
              Explore
            </span>
            <ul className="space-y-2">
              <li>
                <a className="text-sm text-on-surface-variant/60 hover:text-primary transition-colors font-body" href="#">
                  Discover
                </a>
              </li>
              <li>
                <a className="text-sm text-on-surface-variant/60 hover:text-primary transition-colors font-body" href="#">
                  Collections
                </a>
              </li>
              <li>
                <a className="text-sm text-on-surface-variant/60 hover:text-primary transition-colors font-body" href="#">
                  Trending
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-widest font-bold text-primary font-label">
              Connect
            </span>
            <ul className="space-y-2">
              <li>
                <a className="text-sm text-on-surface-variant/60 hover:text-primary transition-colors font-body" href="#">
                  Contact
                </a>
              </li>
              <li>
                <a className="text-sm text-on-surface-variant/60 hover:text-primary transition-colors font-body" href="#">
                  Support
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-widest font-bold text-primary font-label">
              Legal
            </span>
            <ul className="space-y-2">
              <li>
                <a className="text-sm text-on-surface-variant/60 hover:text-primary transition-colors font-body" href="#">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="text-sm text-on-surface-variant/60 hover:text-primary transition-colors font-body" href="#">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-sm text-on-surface-variant/40 font-body">
          © 2024 Verdant. Powered by AI.
        </span>
        <div className="flex gap-6">
          <span className="material-symbols-outlined text-primary/40 cursor-pointer hover:text-primary transition-colors">
            language
          </span>
          <span className="material-symbols-outlined text-primary/40 cursor-pointer hover:text-primary transition-colors">
            share
          </span>
        </div>
      </div>
    </footer>
  );
}
