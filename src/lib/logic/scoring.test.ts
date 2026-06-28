import assert from 'node:assert/strict';
import test from 'node:test';
import type { KnockoutResult, LiveMatch, MatchResult, SavedPrediction } from '@/types';
import { allGroupMatches } from '@/data/matches';
import { generateBracket, getMatchWinner } from './bracket';
import { detectThirdPlaceTie } from './standings';
import {
  QUALIFIER_POINTS,
  RUNNER_UP_POINTS,
  WINNER_POINTS,
  calculateScore,
  getActualQualifiers,
  getPredictedQualifiers,
} from './scoring';
import { computePredictionResults } from '@/hooks/usePredictionResults';

// Two finished groups give us a handful of resolved Round-of-32 slots to reason about.
const GROUPS = ['A', 'B'];
const groupMatchIds = allGroupMatches.filter(m => GROUPS.includes(m.group)).map(m => m.id);

function groupPrediction() {
  return {
    user_id: 'u',
    group_matches: Object.fromEntries(
      groupMatchIds.map(id => [id, 'home' as MatchResult]),
    ),
    knockout_matches: {} as Record<string, KnockoutResult>,
    champion_code: null,
    third_place_tiebreaker: null,
  };
}

const actualGroupResults = groupMatchIds.map(id => ({
  match_id: id,
  match_type: 'group' as const,
  result: 'home' as const,
  winning_team: null,
}));

// The two teams that fill the very first R32 slot (M73 = Runner-up A vs Runner-up B),
// given our "home always wins" group predictions.
function r32Slot1Teams() {
  const bracket = generateBracket(
    Object.fromEntries(groupMatchIds.map(id => [id, 'home' as MatchResult])),
    {},
  );
  const slot = bracket.find(m => m.id === 'R32-1')!;
  return { home: slot.home as string, away: slot.away as string };
}

// ── Static scoring engine (authoritative leaderboard path) ──────────────────

test('QUALIFIER_POINTS no longer carries a Round of 32 award', () => {
  assert.equal('R32' in QUALIFIER_POINTS, false);
});

test('correctly sending teams to the Round of 32 adds no points beyond the group stage', () => {
  const prediction = groupPrediction();

  // Sanity check: predicted and actual share real R32 qualifiers, so the OLD +2 rule
  // would have scored them. This keeps the regression meaningful.
  const predicted = getPredictedQualifiers(prediction);
  const actual = getActualQualifiers(actualGroupResults);
  const sharedR32 = [...predicted.R32].filter(code => actual.R32.has(code)).length;
  assert.ok(sharedR32 > 0, 'expected overlapping R32 qualifiers for the test to be meaningful');

  // Only the correct group results score; reaching the R32 contributes nothing.
  const score = calculateScore(prediction, actualGroupResults);
  assert.equal(score, groupMatchIds.length);
});

test('finishing the first R32 match awards exactly the R16 points to the correct picker', () => {
  const prediction = {
    ...groupPrediction(),
    knockout_matches: { 'R32-1': 'home' as KnockoutResult },
  };

  const before = calculateScore(prediction, actualGroupResults);

  const afterResults = [
    ...actualGroupResults,
    { match_id: 'R32-1', match_type: 'knockout' as const, result: 'home' as const, winning_team: null },
  ];
  const after = calculateScore(prediction, afterResults);

  // The delta is purely the R16 advancement award — no leftover +2 for reaching the R32.
  assert.equal(before, groupMatchIds.length);
  assert.equal(after, groupMatchIds.length + QUALIFIER_POINTS.R16);
  assert.equal(after - before, QUALIFIER_POINTS.R16);
});

test('a wrong R32 pick earns nothing when that match finishes', () => {
  const prediction = {
    ...groupPrediction(),
    knockout_matches: { 'R32-1': 'away' as KnockoutResult }, // picked the loser to advance
  };
  const afterResults = [
    ...actualGroupResults,
    { match_id: 'R32-1', match_type: 'knockout' as const, result: 'home' as const, winning_team: null },
  ];

  // Group points only; the missed advancement adds 0.
  assert.equal(calculateScore(prediction, afterResults), groupMatchIds.length);
});

// ── Live client path (home / profile / per-match display) ───────────────────

function lm(partial: Partial<LiveMatch> & { apiMatchId: number }): LiveMatch {
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
    utcDate: '2026-06-20T18:00:00Z',
    status: 'SCHEDULED',
    venue: null,
    score: null,
    actualResult: null,
    stage: 'GROUP',
    group: null,
    ...partial,
  };
}

function finishedGroupLive(): Record<string, LiveMatch> {
  const out: Record<string, LiveMatch> = {};
  allGroupMatches
    .filter(m => GROUPS.includes(m.group))
    .forEach((m, i) => {
      out[m.id] = lm({
        apiMatchId: 2000 + i,
        localMatchId: m.id,
        stage: 'GROUP',
        group: m.group,
        status: 'FINISHED',
        actualResult: 'home',
        homeCode: m.home,
        awayCode: m.away,
      });
    });
  return out;
}

test('live results: first finished R32 match scores R16 points (no R32 bonus)', () => {
  const prediction = {
    ...groupPrediction(),
    knockout_matches: { 'R32-1': 'home' as KnockoutResult },
  } as unknown as SavedPrediction;

  const { home, away } = r32Slot1Teams();
  const live = finishedGroupLive();
  live['R32-1'] = lm({
    apiMatchId: 9001,
    localMatchId: 'R32-1',
    stage: 'R32',
    status: 'FINISHED',
    actualResult: 'home', // home advances → matches the user's pick
    homeCode: home,
    awayCode: away,
    score: { home: 1, away: 0 },
  });

  const { summary, perMatch } = computePredictionResults(prediction, live);

  // The R32 winner reached the R16 → exactly the R16 award, nothing for "reaching R32".
  assert.equal(summary.r16Pts, QUALIFIER_POINTS.R16);
  assert.equal(summary.knockoutPoints, QUALIFIER_POINTS.R16);
  assert.equal(summary.groupPoints, groupMatchIds.length);
  assert.equal(summary.totalPoints, groupMatchIds.length + QUALIFIER_POINTS.R16);

  // The per-match row for that R32 game registers as a hit worth the R16 points.
  assert.equal(perMatch['R32-1'].state, 'hit');
  assert.equal(perMatch['R32-1'].points, QUALIFIER_POINTS.R16);

  // Defensive: the summary no longer exposes any Round-of-32 points bucket.
  assert.equal('r32Pts' in summary, false);
});

test('live results: a wrong first R32 pick is a miss worth 0', () => {
  const prediction = {
    ...groupPrediction(),
    knockout_matches: { 'R32-1': 'away' as KnockoutResult },
  } as unknown as SavedPrediction;

  const { home, away } = r32Slot1Teams();
  const live = finishedGroupLive();
  live['R32-1'] = lm({
    apiMatchId: 9001,
    localMatchId: 'R32-1',
    stage: 'R32',
    status: 'FINISHED',
    actualResult: 'home', // home advances, but user picked away
    homeCode: home,
    awayCode: away,
    score: { home: 1, away: 0 },
  });

  const { summary, perMatch } = computePredictionResults(prediction, live);

  assert.equal(summary.knockoutPoints, 0);
  assert.equal(summary.totalPoints, groupMatchIds.length);
  assert.equal(perMatch['R32-1'].state, 'miss');
  assert.equal(perMatch['R32-1'].points, 0);
});

test('live results: a pick is settled by where the team actually advances, not by bracket slot', () => {
  // Regression for the cross-slot bug: the user's bracket places CH (Group B winner)
  // in slot R32-13 and CA (Group B runner-up) in slot R32-1. In reality CH wins the
  // match that lands in slot R32-1 (knocking CA out), and slot R32-13's real match
  // hasn't been played. The R32-1 row displays CA (the team picked there) and must be
  // a MISS — even though the actual winner of slot R32-1 (CH) is a team the user did
  // pick to advance elsewhere. The R32-13 row displays CH and must be a HIT, because
  // CH advanced, even though slot R32-13's own fixture is still unplayed.
  const prediction = {
    ...groupPrediction(),
    knockout_matches: {
      'R32-1': 'away' as KnockoutResult,  // CA
      'R32-13': 'home' as KnockoutResult, // CH
    },
  } as unknown as SavedPrediction;

  const live = finishedGroupLive();
  // CH wins the real R32-1; CA is the loser (eliminated). Slot R32-13 stays unplayed.
  live['R32-1'] = lm({
    apiMatchId: 9101,
    localMatchId: 'R32-1',
    stage: 'R32',
    status: 'FINISHED',
    actualResult: 'away', // away (CH) advances
    homeCode: 'CA',
    awayCode: 'CH',
    score: { home: 0, away: 1 },
  });

  const { perMatch } = computePredictionResults(prediction, live);

  // CA was picked to advance (R32-1) but lost → miss, despite the slot winner (CH)
  // being elsewhere in the user's predicted R16.
  assert.equal(perMatch['R32-1'].pickedTeamCode, 'CA');
  assert.equal(perMatch['R32-1'].state, 'miss');
  assert.equal(perMatch['R32-1'].points, 0);

  // CH was picked to advance (R32-13) and did → hit, even though R32-13's own fixture
  // never finished.
  assert.equal(perMatch['R32-13'].pickedTeamCode, 'CH');
  assert.equal(perMatch['R32-13'].state, 'hit');
  assert.equal(perMatch['R32-13'].points, QUALIFIER_POINTS.R16);
});

test('live results: a team eliminated in the group stage is an immediate miss', () => {
  // The user picks CZ to advance from R32-1 (its slot in their predicted bracket).
  // Reality: the full 32-team Round-of-32 field is set and CZ is not in it — it failed
  // to escape its group. The pick can never come true, so it is a miss right away, even
  // though no knockout fixture it maps to has been played.
  const prediction = {
    ...groupPrediction(),
    knockout_matches: { 'R32-1': 'home' as KnockoutResult }, // CZ
  } as unknown as SavedPrediction;

  const live = finishedGroupLive();
  // A fully-resolved 32-team R32 field that excludes CZ.
  const fieldCodes = Array.from(new Set(allGroupMatches.flatMap(m => [m.home, m.away])))
    .filter(c => c !== 'CZ' && !c.startsWith('TBD'))
    .slice(0, 32);
  assert.equal(fieldCodes.length, 32, 'need a full 32-team field for the test to be meaningful');
  for (let i = 0; i < 16; i++) {
    live[`R32-${i + 1}`] = lm({
      apiMatchId: 9200 + i,
      localMatchId: `R32-${i + 1}`,
      stage: 'R32',
      status: 'TIMED', // teams known, match not yet played
      homeCode: fieldCodes[i * 2],
      awayCode: fieldCodes[i * 2 + 1],
    });
  }

  const { perMatch } = computePredictionResults(prediction, live);

  assert.equal(perMatch['R32-1'].pickedTeamCode, 'CZ');
  assert.equal(perMatch['R32-1'].state, 'miss');
  assert.equal(perMatch['R32-1'].points, 0);
});

// ── Runner-up (2nd place) bonus ─────────────────────────────────────────────

// A fully resolved bracket: every group and knockout match is won by the home side.
// The best-third slots need a valid tiebreaker before the bracket resolves to real teams.
const allGroupHome = Object.fromEntries(
  allGroupMatches.map(m => [m.id, 'home' as MatchResult]),
);
const { tied: thirdTied, slotsToFill: thirdSlots } = detectThirdPlaceTie(allGroupHome);
const thirdTiebreaker = thirdTied.slice(0, thirdSlots).map(e => e.team);
const allKoIds = generateBracket(allGroupHome, {}, thirdTiebreaker).map(m => m.id);
const allKoHome = Object.fromEntries(allKoIds.map(id => [id, 'home' as KnockoutResult]));
const resolvedBracket = generateBracket(allGroupHome, allKoHome, thirdTiebreaker);
const finMatch = resolvedBracket.find(m => m.id === 'FIN-1')!;
const championCode = getMatchWinner(finMatch) as string;
const runnerUpCode = (finMatch.home === championCode ? finMatch.away : finMatch.home) as string;

const fullCorrectPrediction = {
  user_id: 'u',
  group_matches: allGroupHome,
  knockout_matches: allKoHome,
  champion_code: null,
  third_place_tiebreaker: thirdTiebreaker,
};

const fullActualResults = [
  ...allGroupMatches.map(m => ({
    match_id: m.id, match_type: 'group' as const, result: 'home' as const, winning_team: null,
  })),
  ...allKoIds.map(id => ({
    match_id: id,
    match_type: 'knockout' as const,
    result: 'home' as const,
    winning_team: id === 'FIN-1' ? championCode : null,
  })),
];

test('the runner-up is identified as the non-champion finalist', () => {
  const predicted = getPredictedQualifiers(fullCorrectPrediction);
  assert.equal(predicted.finalWinner, championCode);
  assert.equal(predicted.finalRunnerUp, runnerUpCode);
  assert.notEqual(championCode, runnerUpCode);
});

test('correctly predicting 2nd place adds the runner-up bonus on top of the champion bonus', () => {
  // Flipping only the Final pick keeps both finalists correct but makes BOTH the
  // champion and the runner-up wrong, so the delta is exactly the two final bonuses.
  const wrongFinalPrediction = {
    ...fullCorrectPrediction,
    knockout_matches: { ...allKoHome, 'FIN-1': 'away' as KnockoutResult },
  };

  const correct = calculateScore(fullCorrectPrediction, fullActualResults);
  const wrongFinal = calculateScore(wrongFinalPrediction, fullActualResults);

  assert.equal(correct - wrongFinal, WINNER_POINTS.FIN + RUNNER_UP_POINTS);
});

test('live results: finishing the Final awards champion + runner-up bonuses', () => {
  const live: Record<string, LiveMatch> = {};
  allGroupMatches.forEach((m, i) => {
    live[m.id] = lm({
      apiMatchId: 5000 + i,
      localMatchId: m.id,
      stage: 'GROUP',
      group: m.group,
      status: 'FINISHED',
      actualResult: 'home',
      homeCode: m.home,
      awayCode: m.away,
    });
  });
  resolvedBracket.forEach((m, i) => {
    live[m.id] = lm({
      apiMatchId: 6000 + i,
      localMatchId: m.id,
      status: 'FINISHED',
      actualResult: 'home',
      homeCode: m.home,
      awayCode: m.away,
      score: { home: 1, away: 0 },
    });
  });

  const { summary, perMatch } = computePredictionResults(
    fullCorrectPrediction as unknown as SavedPrediction,
    live,
  );

  assert.equal(summary.runnerUpPts, RUNNER_UP_POINTS);
  assert.equal(summary.finWinPts, WINNER_POINTS.FIN);
  // The Final row reflects both the champion and the runner-up bonus.
  assert.equal(perMatch['FIN-1'].state, 'hit');
  assert.equal(perMatch['FIN-1'].points, WINNER_POINTS.FIN + RUNNER_UP_POINTS);
});

test('live results: a wrong runner-up pick earns no runner-up bonus', () => {
  // Predict the Final the other way around: champion + runner-up swapped vs reality.
  const wrongFinalPrediction = {
    ...fullCorrectPrediction,
    knockout_matches: { ...allKoHome, 'FIN-1': 'away' as KnockoutResult },
  } as unknown as SavedPrediction;

  const live: Record<string, LiveMatch> = {};
  resolvedBracket.forEach((m, i) => {
    live[m.id] = lm({
      apiMatchId: 6000 + i,
      localMatchId: m.id,
      status: 'FINISHED',
      actualResult: 'home',
      homeCode: m.home,
      awayCode: m.away,
      score: { home: 1, away: 0 },
    });
  });

  const { summary } = computePredictionResults(wrongFinalPrediction, live);
  assert.equal(summary.runnerUpPts, 0);
  assert.equal(summary.finWinPts, 0);
});
