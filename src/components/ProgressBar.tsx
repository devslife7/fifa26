'use client';

interface Props {
  groupCount: number;
  knockoutCount: number;
}

const TOTAL_MATCHES = 104;

export default function ProgressBar({ groupCount, knockoutCount }: Props) {
  const total = groupCount + knockoutCount;
  const pct = Math.round((total / TOTAL_MATCHES) * 100);

  return (
    <div className="p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-primary/10 shadow-sm mt-4">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Your Progress</p>
          <p className="text-lg font-bold">Group Stage Predicted</p>
        </div>
        <p className="text-sm font-bold text-primary">{total} <span className="text-slate-400">/ {TOTAL_MATCHES}</span></p>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-2">
        <div
          className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(249,212,6,0.5)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        ></div>
      </div>
    </div>
  );
}
