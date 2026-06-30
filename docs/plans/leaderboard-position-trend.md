# Fix the leaderboard position-trend indicator (daily-movement model)

## Context

The leaderboard shows a trend icon next to each name — green `trending_up` ▲N, red
`trending_down` ▼N, or neutral `remove` "—" — rendered by `renderPositionChange` /
`PositionTrendIcon` in `src/components/ranking/RankingView.tsx:89-119`. The value comes
from `position_change = positionChangeFromRanks(rank, previous_rank)`
(`src/lib/services/leaderboard-position.ts:94-100`), where both `rank` and
`previous_rank` live on the `scores` table.

**The bug:** `previous_rank` is recomputed on every score recalc by
`applyRankSnapshot` (`leaderboard-position.ts:62-91`) using a single **global**
`standingsChanged` flag. The instant *any* prediction's points change, **every** row's
`previous_rank` is reset to its current `rank` from the previous recalc. Consequences:

1. **Unrelated scoring wipes a user's arrow.** After Jason reaches #1, the next poll
   where anyone else scores resets Jason's `previous_rank` to his current rank (1) →
   `position_change = 0` → his arrow shows "—" even though he didn't move.
2. **Multi-match climbs collapse.** Group-stage matches finalize across several 30s
   poll cycles; each standings-changing recalc re-anchors the baseline to "rank at the
   previous poll," so a 4→3→2→1 climb only ever shows the last single step.

**Decisions (confirmed with the user):**
- Arrow baseline = **start of the current day** ("climbed N positions today").
- **Forward-only** — no backfill of the currently-stored stale values.

## Approach

Change `previous_rank` from a "rank at previous recalc" running value into a
**once-per-day snapshot**: each row's `previous_rank` is the rank it held at the start of
today, and `position_change = previous_rank - rank` = positions moved today.

No scheduler exists (scoring is driven by frontend polling → `syncMatches` →
`recalculateScores`). Advance the daily baseline **lazily inside the recalc**. A new
`previous_rank_date` column records which day the baseline represents; the first recalc on
a new day re-snapshots, and every later recalc that same day preserves it.

### 1. Migration — `supabase/migrations/018_daily_rank_snapshot.sql`
`ALTER TABLE scores ADD COLUMN IF NOT EXISTS previous_rank_date DATE;`

### 2. Rework `applyRankSnapshot` — `leaderboard-position.ts`
- Add `previous_rank_date: string | null` to `ExistingRankRow`.
- Take `today: string` (`YYYY-MM-DD`) as a parameter — keep it pure.
- Per-row day logic: preserve if `previous_rank_date === today`, else re-snapshot
  (`previous_rank = existing.rank ?? rank`, `previous_rank_date = today`); new prediction →
  `previous_rank = rank`, `previous_rank_date = today`.

### 3. Wire the date through — `recalculate-scores.ts`
- Select `previous_rank_date`; compute `today` from `America/New_York`; pass to
  `applyRankSnapshot`; include in upsert.

### 4. Update tests — `leaderboard-position.test.ts`
Day-snapshot cases: first recalc of day captures the climb, later same-day recalc
preserves the baseline (regression), day rollover re-baselines, new prediction shows "—".

### 5. (Optional) UI tooltip wording — append "today".

## Timezone
`RANK_DAY_TIME_ZONE = 'America/New_York'` to match existing app usage
(`match-dates.ts`, `prediction-pdf.tsx`).

## Key files
- `src/lib/services/leaderboard-position.ts`
- `src/lib/services/recalculate-scores.ts`
- `src/lib/services/leaderboard-position.test.ts`
- `supabase/migrations/018_daily_rank_snapshot.sql`
- `src/components/ranking/RankingView.tsx` (optional tooltip)
