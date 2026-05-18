import { GROUP_POINTS, QUALIFIER_POINTS, WINNER_POINTS } from '@/lib/logic/scoring';

type Variant = 'full' | 'knockout-only';

interface Props {
  variant: Variant;
  surface?: 'card' | 'plain';
}

interface Row {
  label: string;
  pts: number;
}

const KNOCKOUT_ROWS: Row[] = [
  { label: 'Round of 32 (per team)', pts: QUALIFIER_POINTS.R32 },
  { label: 'Round of 16 (per team)', pts: QUALIFIER_POINTS.R16 },
  { label: 'Quarterfinals (per team)', pts: QUALIFIER_POINTS.QF },
  { label: 'Semifinals (per team)', pts: QUALIFIER_POINTS.SF },
  { label: 'Third Place (per finalist)', pts: QUALIFIER_POINTS['3RD'] },
  { label: 'Third Place winner bonus', pts: WINNER_POINTS['3RD'] },
  { label: 'Final (per finalist)', pts: QUALIFIER_POINTS.FIN },
  { label: 'Champion bonus', pts: WINNER_POINTS.FIN },
];

export default function ScoringExplainer({ variant, surface = 'card' }: Props) {
  const rows: Row[] =
    variant === 'full'
      ? [{ label: 'Group Stage (per match)', pts: GROUP_POINTS }, ...KNOCKOUT_ROWS]
      : KNOCKOUT_ROWS;
  const intro =
    variant === 'full'
      ? (
        <>
          <span className="font-bold text-white">How to earn points.</span> Group matches give +{GROUP_POINTS} for each correct result (home win, draw, or away win). Knockout rounds award points for every team in your bracket that actually qualifies for that round. The 3rd-place match and Final each pay a bonus when you pick the actual winner.
        </>
      )
      : (
        <>
          <span className="font-bold text-white">How knockout points work.</span> You earn the round&apos;s points for every team in your bracket that actually reaches that round — the matchup itself doesn&apos;t have to match reality. The 3rd-place match and Final each pay an extra bonus when you pick the winner.
        </>
      );

  const content = (
    <>
      <div className={surface === 'card' ? 'px-4 pt-4 pb-1' : 'pb-1'}>
        <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-500 font-body">
          Scoring
        </h2>
      </div>

      <div className={surface === 'card' ? 'px-4 pt-2 pb-3' : 'pt-2 pb-3'}>
        <p className="text-[13px] leading-relaxed text-neutral-300 font-body">
          {intro}
        </p>
      </div>

      <div className={surface === 'card' ? 'px-4 pb-3' : 'pb-3'}>
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
              <span className="text-[13px] font-black tabular-nums text-neutral-200 w-6 text-right">
                +{row.pts}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={`${surface === 'card' ? 'px-4 pt-1 pb-4' : 'pt-3'} border-t border-white/[0.04]`}>
        <p className="text-[12px] leading-relaxed text-neutral-400 font-body">
          Maximum 268 points across the whole tournament.
        </p>
      </div>
    </>
  );

  if (surface === 'plain') {
    return <div>{content}</div>;
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-neutral-900/80 to-background-dark">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {content}
    </div>
  );
}
