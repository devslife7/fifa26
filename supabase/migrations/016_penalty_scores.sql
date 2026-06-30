-- Penalty shootout tally for knockout fixtures decided on penalties.
-- score_home/score_away hold the on-field (120-minute) score; these hold the
-- shootout result. Both NULL for matches that did not go to penalties.
ALTER TABLE fixtures ADD COLUMN penalty_home INTEGER;
ALTER TABLE fixtures ADD COLUMN penalty_away INTEGER;
