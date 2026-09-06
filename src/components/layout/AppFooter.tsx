interface AppFooterProps {
  className?: string;
}

const PAST_SEASONS = [
  { year: '2024', label: 'Copa America 2024', href: 'https://copaamerica24.vercel.app/' },
  { year: '2022', label: 'Qatar World Cup 2022', href: 'https://qatar2022-jet.vercel.app/' },
];

export default function AppFooter({ className = '' }: AppFooterProps) {
  return (
    <footer className={`mt-2 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.025] px-4 py-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)] sm:px-5 ${className}`}>
      <div className="grid gap-6 sm:grid-cols-[1.3fr_0.7fr_0.9fr]">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <img src="/images/fifa_logo.svg" alt="FIFA World Cup 2026" className="size-9 shrink-0" />
            <p className="text-base font-black text-neutral-100">FIFA 26 Predictor</p>
          </div>
          <p className="max-w-sm font-body text-xs font-semibold leading-relaxed text-neutral-500">
            A matchday companion for following the 2026 tournament with friends.
          </p>
        </div>

        <div>
          <p className="mb-3 font-body text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
            Creator
          </p>
          <p className="mb-2 font-body text-xs font-semibold leading-relaxed text-neutral-500">
            Explore more of my work — I build websites that help businesses grow revenue and own their presence online.
          </p>
          <a
            href="https://marcosvelasco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit font-body text-xs font-bold text-neutral-300 transition-colors hover:text-primary"
          >
            marcosvelasco.com
          </a>
        </div>

        <div>
          <p className="mb-3 font-body text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
            Past Seasons
          </p>
          <div className="grid gap-2">
            {PAST_SEASONS.map(season => (
              <a
                key={season.year}
                href={season.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit font-body text-xs font-bold text-neutral-300 transition-colors hover:text-primary"
              >
                {season.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-white/8 pt-3 font-body text-[11px] font-semibold text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Unofficial fan project. Not affiliated with FIFA.</span>
        <div className="flex items-center gap-3">
          <span>
            Built by{' '}
            <a
              href="https://marcosvelasco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 transition-colors hover:text-primary"
            >
              Marcos Velasco
            </a>
          </span>
          <span>&copy; 2026 FIFA 26 Predictor</span>
        </div>
      </div>
    </footer>
  );
}
