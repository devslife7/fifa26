'use client';

interface Props {
  groupCount: number;
  knockoutCount: number;
  groupsComplete: boolean;
  tiesResolved: boolean;
  onContinueToBracket: () => void;
}

const GROUP_MATCHES = 72;
const TOTAL_STEPS = 73; // 72 group matches + 1 third-place resolution
const SEGMENTS = 12;

export default function ProgressBar({ groupCount, knockoutCount, groupsComplete, tiesResolved, onContinueToBracket }: Props) {
  const groupPct = (groupCount / GROUP_MATCHES) * 100;
  const isComplete = groupCount === GROUP_MATCHES;
  const isStarted = groupCount > 0;
  const totalCount = groupCount + (isComplete && tiesResolved ? 1 : 0);

  return (
    <div className="sticky top-0 z-30">
      <div className="bg-background-dark pt-5 pb-4">
        {/* Hero row */}
        <div className="flex items-end justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-[46px] font-black leading-none tracking-tighter tabular-nums">
              {totalCount}
            </span>
            <span className="text-base font-bold text-neutral-500 tracking-tight">
              /{TOTAL_STEPS}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1 pb-1.5">
            {isComplete ? (
              <button
                onClick={onContinueToBracket}
                disabled={!groupsComplete || !tiesResolved}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-black font-bold text-xs hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Bracket
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.08em]">
                {Math.round(groupPct)}% complete
              </span>
            )}
            {knockoutCount > 0 && (
              <span className="text-[10px] font-bold text-neutral-400 tabular-nums">
                +{knockoutCount} bracket pick{knockoutCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Segmented track — 12 group segments + 1 third-place segment */}
        <div className="flex gap-[3px]">
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const segStart = (i / SEGMENTS) * 100;
            const segEnd = ((i + 1) / SEGMENTS) * 100;
            const fill = Math.max(0, Math.min(1, (groupPct - segStart) / (segEnd - segStart)));

            return (
              <div
                key={i}
                className="flex-1 h-[10px] rounded-[3px] bg-white/10 overflow-hidden"
              >
                {fill > 0 && (
                  <div
                    className={`h-full rounded-[3px] transition-all duration-500 ease-out ${
                      isComplete
                        ? 'bg-gradient-to-r from-primary to-primary'
                        : 'bg-primary'
                    }`}
                    style={{
                      width: `${fill * 100}%`,
                      boxShadow: isComplete
                        ? '0 0 8px rgba(249,212,6,0.5)'
                        : fill === 1
                          ? '0 0 6px rgba(249,212,6,0.3)'
                          : 'none',
                    }}
                  />
                )}
              </div>
            );
          })}
          {/* Third-place tiebreaker segment */}
          <div className="flex-1 h-[10px] rounded-[3px] bg-white/10 overflow-hidden">
            {isComplete && tiesResolved && (
              <div
                className="h-full rounded-[3px] transition-all duration-500 ease-out bg-primary"
                style={{
                  width: '100%',
                  boxShadow: '0 0 8px rgba(249,212,6,0.5)',
                }}
              />
            )}
          </div>
        </div>

        {/* Unlock hint */}
        {!isComplete ? (
          <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-[0.12em] mt-2.5">
            {isStarted
              ? `${TOTAL_STEPS - totalCount} remaining to unlock bracket`
              : 'Complete all group matches to unlock bracket'}
          </p>
        ) : !tiesResolved ? (
          <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-[0.12em] mt-2.5">
            Resolve 3rd place tiebreaker below
          </p>
        ) : null}
      </div>

      {/* Bottom edge accent — thin gold progress line */}
      <div className="h-px bg-white/5 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary/60 transition-all duration-500"
          style={{ width: `${Math.min(groupPct, 100)}%` }}
        />
      </div>
    </div>
  );
}
