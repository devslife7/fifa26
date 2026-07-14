import assert from 'node:assert/strict';
import test from 'node:test';
import type { LiveMatch } from '@/types';
import {
  buildHotMatchRefreshQuery,
  getHotMatchApiIds,
  getHotMatches,
  isWinnerPending,
  HOT_MATCH_WINDOW_AFTER_KICKOFF_MS,
  HOT_MATCH_WINDOW_BEFORE_MS,
} from './hot-matches';

// Anchor "now" so the window math is deterministic. Kickoff at 18:00 UTC on
// a fixed date; every case below adjusts either `now` or the fixture's status.
const KICKOFF = Date.parse('2026-06-20T18:00:00Z');

function fixture(partial: Partial<LiveMatch> & { apiMatchId: number }): LiveMatch {
  return {
    localMatchId: null,
    homeCode: null,
    awayCode: null,
    homeName: null,
    awayName: null,
    homeShortName: null,
    awayShortName: null,
    homeFlag: null,
    awayFlag: null,
    utcDate: new Date(KICKOFF).toISOString(),
    status: 'SCHEDULED',
    venue: null,
    score: null,
    penalties: null,
    actualResult: null,
    stage: 'GROUP',
    group: null,
    ...partial,
  };
}

// ── Window semantics ───────────────────────────────────────────────────────

test('a SCHEDULED match becomes hot inside the pre-kickoff window', () => {
  const match = fixture({ apiMatchId: 1 });
  const insideBefore = KICKOFF - HOT_MATCH_WINDOW_BEFORE_MS + 60_000;
  const outsideBefore = KICKOFF - HOT_MATCH_WINDOW_BEFORE_MS - 60_000;
  assert.equal(getHotMatches([match], insideBefore).length, 1);
  assert.equal(getHotMatches([match], outsideBefore).length, 0);
});

test('a SCHEDULED match falls off after the post-kickoff window closes', () => {
  const match = fixture({ apiMatchId: 1 });
  const insideAfter = KICKOFF + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS - 60_000;
  const outsideAfter = KICKOFF + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS + 60_000;
  assert.equal(getHotMatches([match], insideAfter).length, 1);
  assert.equal(getHotMatches([match], outsideAfter).length, 0);
});

test('IN_PLAY / PAUSED matches stay hot regardless of clock (feed authority)', () => {
  const inPlay = fixture({ apiMatchId: 1, status: 'IN_PLAY' });
  const paused = fixture({ apiMatchId: 2, status: 'PAUSED' });
  // Well past the normal window — a real match that ran long stays polled.
  const wayLater = KICKOFF + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS + 4 * 60 * 60 * 1000;
  assert.equal(getHotMatches([inPlay, paused], wayLater).length, 2);
});

// ── The FINISHED-in-window regression this branch is really about ─────────

test('a FINISHED match still inside the post-kickoff window stays hot (so late actualResult updates come through fast)', () => {
  // This is the Morocco fix: right after the final whistle the feed can still
  // be catching up with the shootout tally / winner field. Keep polling so the
  // late update hits the fast (20s ids) refresh path instead of the 6h full one.
  const match = fixture({ apiMatchId: 42, status: 'FINISHED' });
  const justFinished = KICKOFF + 130 * 60 * 1000; // 130 min past kickoff — pens era
  assert.equal(getHotMatches([match], justFinished).length, 1);
});

test('a FINISHED match past the post-kickoff window falls off once the winner is known', () => {
  const match = fixture({ apiMatchId: 42, status: 'FINISHED', actualResult: 'home' });
  const wellPast = KICKOFF + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS + 60_000;
  assert.equal(getHotMatches([match], wellPast).length, 0);
});

// ── isWinnerPending: stay hot indefinitely until the provider settles it ──

test('a FINISHED match with no actualResult stays hot even past the post-kickoff window', () => {
  const pending = fixture({ apiMatchId: 42, status: 'FINISHED' });
  const settled = fixture({ apiMatchId: 43, status: 'FINISHED', actualResult: 'away' });
  const wellPast = KICKOFF + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS + 60_000;

  assert.equal(isWinnerPending(pending), true);
  assert.equal(isWinnerPending(settled), false);
  assert.deepEqual(getHotMatches([pending, settled], wellPast), [pending]);
});

// ── Query builder ─────────────────────────────────────────────────────────

test("buildHotMatchRefreshQuery returns null when nothing is hot (server falls back to the 6h 'full' cadence)", () => {
  const cold = fixture({
    apiMatchId: 1,
    // Ancient kickoff, plain SCHEDULED status → outside the window, not IN_PLAY.
    utcDate: new Date(KICKOFF - 24 * 60 * 60 * 1000).toISOString(),
  });
  assert.equal(buildHotMatchRefreshQuery([cold]), null);
});

test("buildHotMatchRefreshQuery keeps FINISHED matches in-window on the fast 'ids' path", () => {
  const match = fixture({ apiMatchId: 42, status: 'FINISHED' });
  // Force the reference clock into the window by mocking Date.now temporarily.
  const originalNow = Date.now;
  try {
    Date.now = () => KICKOFF + 130 * 60 * 1000;
    const query = buildHotMatchRefreshQuery([match]);
    assert.ok(query, 'expected a non-null query');
    assert.equal(query, 'mode=ids&ids=42');
  } finally {
    Date.now = originalNow;
  }
});

test('getHotMatchApiIds dedupes and filters out fixtures without an apiMatchId', () => {
  const a = fixture({ apiMatchId: 1, status: 'IN_PLAY' });
  const b = fixture({ apiMatchId: 1, status: 'IN_PLAY' }); // duplicate id
  const c = fixture({ apiMatchId: Number.NaN as unknown as number, status: 'IN_PLAY' });
  assert.deepEqual(getHotMatchApiIds([a, b, c]).sort(), [1]);
});

test('polling stops once every finished match has an official result', () => {
  const settled = fixture({ apiMatchId: 21, status: 'FINISHED', actualResult: 'draw' });
  const wellPast = KICKOFF + HOT_MATCH_WINDOW_AFTER_KICKOFF_MS + 60_000;
  assert.deepEqual(getHotMatchApiIds([settled], wellPast), []);
  assert.equal(buildHotMatchRefreshQuery([settled]), null);
});
