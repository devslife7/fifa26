-- The leaderboard trend arrow now reflects movement *since the start of the
-- current day* instead of movement since the previous recalc. `previous_rank`
-- becomes a once-per-day snapshot; `previous_rank_date` records which day that
-- snapshot represents so a recalc can tell whether to preserve or re-baseline it.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS previous_rank_date DATE;
