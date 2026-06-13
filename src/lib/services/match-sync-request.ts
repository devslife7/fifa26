import type { SyncMatchesOptions } from '@/lib/services/sync-matches';

export interface ParsedSyncOptions {
  opts: SyncMatchesOptions;
  explicitMode: boolean;
  error: string | null;
}

export function parseMatchSyncOptions(params: URLSearchParams): ParsedSyncOptions {
  const rawMode = params.get('mode');
  const mode = parseMode(rawMode);
  if (rawMode && !mode) return { opts: {}, explicitMode: false, error: 'Invalid mode' };

  const ids = parseIds(params.get('ids'));
  if (mode === 'ids' && ids.length === 0) {
    return { opts: {}, explicitMode: true, error: 'Missing ids' };
  }

  const date = params.get('date') ?? undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { opts: {}, explicitMode: !!mode, error: 'Invalid date' };
  }

  return {
    opts: {
      mode: mode ?? undefined,
      ids: ids.length > 0 ? ids : undefined,
      date,
      force: params.get('force') === 'true',
    },
    explicitMode: !!mode,
    error: null,
  };
}

function parseMode(value: string | null): SyncMatchesOptions['mode'] | null {
  if (!value) return null;
  if (value === 'full' || value === 'today' || value === 'live' || value === 'ids') return value;
  return null;
}

function parseIds(value: string | null): number[] {
  if (!value) return [];
  return Array.from(new Set(
    value
      .split(',')
      .map(id => Number.parseInt(id.trim(), 10))
      .filter(Number.isFinite),
  ));
}
