-- Rename Final knockout match key from 'F-1' to 'FIN-1' in predictions table
-- This avoids collision with Group F Match 1 which also has id 'F-1'

UPDATE predictions
SET knockout_matches = (knockout_matches - 'F-1') || jsonb_build_object('FIN-1', knockout_matches->'F-1')
WHERE knockout_matches ? 'F-1';
