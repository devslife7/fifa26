'use client';

interface Props {
  groupCount: number;
  knockoutCount: number;
}

const GROUP_MATCHES = 72;

export default function ProgressBar({ groupCount, knockoutCount }: Props) {
  const total = groupCount + knockoutCount;
  const pct = Math.round((total / GROUP_MATCHES) * 100);

  return (
    <div className="pt-6 pb-4 border-b border-primary/20">
      <div className="flex justify-between items-end">
        <p className="text-lg font-black">Matches Predicted</p>
        <p className="text-lg font-black">
          <span className="text-primary">{total}</span>
          <span className="text-slate-400 font-semibold"> / {GROUP_MATCHES}</span>
        </p>
      </div>
      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mt-3">
        <div
          className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(249,212,6,0.5)] transition-all duration-300"
          style={{ width: `${Math.min(pct, 100)}%` }}
        ></div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mt-2">
        Complete all matches to unlock bracket
      </p>
    </div>
  );
}
