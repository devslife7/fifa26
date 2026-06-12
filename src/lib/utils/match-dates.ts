export type DateBucket = 'today' | 'yesterday' | 'tomorrow' | 'past' | 'future' | 'unknown';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime()) / DAY_MS);
}

export function getDateBucket(utcDate: string | undefined, now: Date = new Date()): DateBucket {
  if (!utcDate) return 'unknown';
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const diff = dayDiff(d, now);
  if (diff === 0) return 'today';
  if (diff === -1) return 'yesterday';
  if (diff === 1) return 'tomorrow';
  return diff < 0 ? 'past' : 'future';
}

export function formatRelativeDate(utcDate: string | undefined, now: Date = new Date()): string {
  if (!utcDate) return 'TBD';
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return 'TBD';
  const bucket = getDateBucket(utcDate, now);
  if (bucket === 'today') return 'Today';
  if (bucket === 'yesterday') return 'Yesterday';
  if (bucket === 'tomorrow') return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMatchTime(utcDate: string | undefined): string {
  if (!utcDate) return '';
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const MATCH_DATETIME_ET_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'America/New_York',
});

const MATCH_DATETIME_ET_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/New_York',
});

/** e.g. "May 24, 11:00AM ET" */
export function formatMatchDateTimeET(utcDate: string | undefined): string {
  if (!utcDate) return '';
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = MATCH_DATETIME_ET_DATE.format(d);
  const timePart = MATCH_DATETIME_ET_TIME.format(d).replace(/\s/g, '').toUpperCase();
  return `${datePart}, ${timePart} ET`;
}

export interface DateGroup<T> {
  bucket: DateBucket;
  /** Local-day key (YYYY-MM-DD) so items on the same calendar day group together. */
  dayKey: string;
  label: string;
  items: T[];
}

/**
 * Groups items by their local calendar day and orders the resulting groups for a
 * timeline display: today first, then yesterday, tomorrow, recent past (newest
 * first), upcoming (soonest first), and unknown dates last.
 */
export function groupItemsByDate<T extends { utcDate?: string }>(
  items: T[],
  now: Date = new Date(),
): DateGroup<T>[] {
  const byKey = new Map<string, DateGroup<T>>();
  const unknown: T[] = [];

  for (const item of items) {
    if (!item.utcDate) {
      unknown.push(item);
      continue;
    }
    const d = new Date(item.utcDate);
    if (Number.isNaN(d.getTime())) {
      unknown.push(item);
      continue;
    }
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let group = byKey.get(dayKey);
    if (!group) {
      group = {
        bucket: getDateBucket(item.utcDate, now),
        dayKey,
        label: formatRelativeDate(item.utcDate, now),
        items: [],
      };
      byKey.set(dayKey, group);
    }
    group.items.push(item);
  }

  // Sort items within each group by time ascending
  for (const g of byKey.values()) {
    g.items.sort((a, b) => {
      const ta = a.utcDate ? new Date(a.utcDate).getTime() : 0;
      const tb = b.utcDate ? new Date(b.utcDate).getTime() : 0;
      return ta - tb;
    });
  }

  const groups = Array.from(byKey.values());

  // Ordering: today, yesterday, tomorrow, past (most recent first), future (soonest first)
  const order = (g: DateGroup<T>): number => {
    if (g.bucket === 'today') return 0;
    if (g.bucket === 'yesterday') return 1;
    if (g.bucket === 'tomorrow') return 2;
    const epoch = new Date(g.dayKey).getTime();
    const todayMs = startOfLocalDay(now).getTime();
    if (g.bucket === 'past') return 10 + (todayMs - epoch) / DAY_MS;       // more recent → smaller
    return 1000 + (epoch - todayMs) / DAY_MS;                              // sooner → smaller
  };

  groups.sort((a, b) => order(a) - order(b));

  if (unknown.length > 0) {
    groups.push({
      bucket: 'unknown',
      dayKey: 'unknown',
      label: 'Date TBD',
      items: unknown,
    });
  }

  return groups;
}
