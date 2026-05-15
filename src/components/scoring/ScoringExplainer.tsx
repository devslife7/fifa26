import { CHAMPION_POINTS, GROUP_POINTS, KNOCKOUT_POINTS } from '@/lib/logic/scoring';

type Variant = 'full' | 'knockout-only';

interface Props {
  variant: Variant;
}

interface Row {
  label: string;
  pts: number;
}

const KNOCKOUT_ROWS: Row[] = [
  { label: 'Round of 32', pts: KNOCKOUT_POINTS.R32 },
  { label: 'Round of 16', pts: KNOCKOUT_POINTS.R16 },
  { label: 'Quarterfinals', pts: KNOCKOUT_POINTS.QF },
  { label: 'Semifinals', pts: KNOCKOUT_POINTS.SF },
  { label: 'Third Place', pts: KNOCKOUT_POINTS['3RD'] },
  { label: 'Final', pts: KNOCKOUT_POINTS.FIN },
];

export default function ScoringExplainer({ variant }: Props) {
  const rows: Row[] =
    variant === 'full'
      ? [{ label: 'Group Stage', pts: GROUP_POINTS }, ...KNOCKOUT_ROWS]
      : KNOCKOUT_ROWS;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-neutral-900/80 to-background-dark">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="px-4 pt-4 pb-1">
        <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-500 font-body">
          Scoring
        </h2>
      </div>

      <div className="px-4 pt-2 pb-3">
        <p className="text-[13px] leading-relaxed text-neutral-300 font-body">
          <span className="font-bold text-white">How knockout points work.</span> Your bracket pick is a bet on which team advances. If the team you picked to win a match actually makes it past that round in real life, you earn the round&apos;s points — the opponent in your bracket doesn&apos;t have to match reality.
        </p>
      </div>

      <div className="px-4 pb-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-[7px] border-b border-white/[0.04] last:border-0"
          >
            <span className="text-[13px] font-medium text-neutral-400 font-body">{row.label}</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-px">
                {Array.from({ length: row.pts }).map((_, j) => (
                  <div key={j} className="w-[3px] h-[10px] rounded-full bg-primary/30" />
                ))}
              </div>
              <span className="text-[13px] font-black tabular-nums text-neutral-200 w-5 text-right">
                +{row.pts}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pt-1 pb-4 border-t border-white/[0.04]">
        <p className="text-[12px] leading-relaxed text-neutral-400 font-body">
          <span className="font-bold text-primary">Champion bonus +{CHAMPION_POINTS}</span> if your predicted champion wins the tournament. All-or-nothing — no partial credit for reaching the Final or Semifinal.
        </p>
      </div>
    </div>
  );
}
