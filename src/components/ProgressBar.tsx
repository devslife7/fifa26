'use client';

interface Props {
  groupCount: number;
  knockoutCount: number;
}

const TOTAL_MATCHES = 104;
const GROUP_MATCHES = 48;

export default function ProgressBar({ groupCount, knockoutCount }: Props) {
  const total = groupCount + knockoutCount;
  const pct = Math.round((total / TOTAL_MATCHES) * 100);

  return (
    <div className="bg-surface-light border-b border-border px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <div className="flex-1">
          <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-light rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-gold tabular-nums shrink-0">
          {total} / {TOTAL_MATCHES}
        </span>
      </div>
    </div>
  );
}
