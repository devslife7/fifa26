'use client';

interface Props {
  groupCount: number;
  knockoutCount: number;
}

const GROUP_MATCHES = 72;
const SEGMENTS = 12;

export default function ProgressBar({ groupCount, knockoutCount }: Props) {
  const groupPct = (groupCount / GROUP_MATCHES) * 100;
  const isComplete = groupCount === GROUP_MATCHES;
  const isStarted = groupCount > 0;

  return (
    <div className="sticky top-0 z-30">
      <div className="backdrop-blur-xl bg-background-light/80 pt-5 pb-4">
        {/* Hero row */}
        <div className="flex items-end justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-[46px] font-black leading-none tracking-tighter tabular-nums">
              {groupCount}
            </span>
            <span className="text-base font-bold text-slate-300 tracking-tight">
              /{GROUP_MATCHES}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1 pb-1.5">
            {isComplete ? (
              <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-500 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[14px] font-variation-fill">check_circle</span>
                Groups Done
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em]">
                {Math.round(groupPct)}% complete
              </span>
            )}
            {knockoutCount > 0 && (
              <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                +{knockoutCount} bracket pick{knockoutCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Segmented track — 12 notched sections */}
        <div className="flex gap-[3px]">
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const segStart = (i / SEGMENTS) * 100;
            const segEnd = ((i + 1) / SEGMENTS) * 100;
            // How full is this segment? 0–1
            const fill = Math.max(0, Math.min(1, (groupPct - segStart) / (segEnd - segStart)));

            return (
              <div
                key={i}
                className="flex-1 h-[10px] rounded-[3px] bg-slate-200/70 overflow-hidden"
              >
                {fill > 0 && (
                  <div
                    className={`h-full rounded-[3px] transition-all duration-500 ease-out ${
                      isComplete
                        ? 'bg-gradient-to-r from-yellow-400 to-primary'
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
        </div>

        {/* Unlock hint */}
        {!isComplete && (
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.12em] mt-2.5">
            {isStarted
              ? `${GROUP_MATCHES - groupCount} remaining to unlock bracket`
              : 'Complete all group matches to unlock bracket'}
          </p>
        )}
      </div>

      {/* Bottom edge accent — thin gold progress line */}
      <div className="h-px bg-slate-200/60 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary/60 transition-all duration-500"
          style={{ width: `${Math.min(groupPct, 100)}%` }}
        />
      </div>
    </div>
  );
}
