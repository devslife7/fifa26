import { GroupLetter, GroupStanding, GroupTiebreakers, MatchResult } from '@/types';
import { getGroupTeams } from '@/data/teams';
import { getGroupMatches } from '@/data/matches';

export function calculateGroupStandings(
  group: GroupLetter,
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): GroupStanding[] {
  const groupTeams = getGroupTeams(group);
  const matches = getGroupMatches(group);

  const standings: Record<string, GroupStanding> = {};
  groupTeams.forEach(t => {
    standings[t.code] = {
      team: t.code,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      fifaRanking: t.fifaRanking,
    };
  });

  matches.forEach(match => {
    const result = predictions[match.id];
    if (!result) return;

    const home = standings[match.home];
    const away = standings[match.away];
    home.played++;
    away.played++;

    if (result === 'home') {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (result === 'away') {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  });

  const groupOrder = new Map(groupTeams.map((team, index) => [team.code, index]));

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const tiedTeams = Object.values(standings)
      .filter(s => s.points === a.points)
      .map(s => s.team);
    const key = getGroupTieKey(group, a.points);
    const order = groupTiebreakers[key];
    if (isValidTieOrder(tiedTeams, order)) {
      return order.indexOf(a.team) - order.indexOf(b.team);
    }
    return (groupOrder.get(a.team) ?? 0) - (groupOrder.get(b.team) ?? 0);
  });
}

export function getAllGroupStandings(
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): Record<GroupLetter, GroupStanding[]> {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const result: Record<string, GroupStanding[]> = {};
  groups.forEach(g => {
    result[g] = calculateGroupStandings(g, predictions, groupTiebreakers);
  });
  return result as Record<GroupLetter, GroupStanding[]>;
}

export function isGroupComplete(
  group: GroupLetter,
  predictions: Record<string, MatchResult>
): boolean {
  const matches = getGroupMatches(group);
  return matches.every(m => predictions[m.id] !== undefined);
}

export function areAllGroupsComplete(predictions: Record<string, MatchResult>): boolean {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  return groups.every(g => isGroupComplete(g, predictions));
}

export interface GroupTieBand {
  key: string;
  group: GroupLetter;
  points: number;
  teams: string[];
}

export function getGroupTieKey(group: GroupLetter, points: number): string {
  return `${group}:${points}`;
}

export function isValidTieOrder(teams: string[], order?: string[]): order is string[] {
  if (!order || order.length !== teams.length) return false;
  const expected = new Set(teams);
  if (expected.size !== teams.length) return false;
  return order.every(team => expected.has(team)) && new Set(order).size === expected.size;
}

export function getGroupTieBands(
  group: GroupLetter,
  predictions: Record<string, MatchResult>
): GroupTieBand[] {
  if (!isGroupComplete(group, predictions)) return [];

  const standings = calculateGroupStandings(group, predictions);
  const byPoints = new Map<number, string[]>();
  standings.forEach(standing => {
    const teams = byPoints.get(standing.points) ?? [];
    teams.push(standing.team);
    byPoints.set(standing.points, teams);
  });

  return Array.from(byPoints.entries())
    .filter(([, teams]) => teams.length > 1)
    .sort(([a], [b]) => b - a)
    .map(([points, teams]) => ({
      key: getGroupTieKey(group, points),
      group,
      points,
      teams,
    }));
}

export function getUnresolvedGroupTieBands(
  group: GroupLetter,
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): GroupTieBand[] {
  return getGroupTieBands(group, predictions).filter(
    band => !isValidTieOrder(band.teams, groupTiebreakers[band.key])
  );
}

export function getAllUnresolvedGroupTieBands(
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): GroupTieBand[] {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  return groups.flatMap(group => getUnresolvedGroupTieBands(group, predictions, groupTiebreakers));
}

export function areCompletedGroupTiesResolved(
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): boolean {
  return getAllUnresolvedGroupTieBands(predictions, groupTiebreakers).length === 0;
}

export function areAllGroupsFinalized(
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): boolean {
  return areAllGroupsComplete(predictions) && areCompletedGroupTiesResolved(predictions, groupTiebreakers);
}

// Get all 3rd-place teams ranked
export function getThirdPlaceRanking(
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): { team: string; group: GroupLetter; standing: GroupStanding }[] {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const thirdPlaced: { team: string; group: GroupLetter; standing: GroupStanding }[] = [];

  groups.forEach(g => {
    if (!isGroupComplete(g, predictions)) return;
    if (getUnresolvedGroupTieBands(g, predictions, groupTiebreakers).length > 0) return;
    const standings = calculateGroupStandings(g, predictions, groupTiebreakers);
    if (standings.length >= 3) {
      thirdPlaced.push({ team: standings[2].team, group: g, standing: standings[2] });
    }
  });

  thirdPlaced.sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    return 0;
  });

  return thirdPlaced;
}

// Detect ties at the 8th/9th boundary among third-place teams
export type ThirdPlaceEntry = { team: string; group: GroupLetter; standing: GroupStanding };

export interface ThirdPlaceTieInfo {
  lockedIn: ThirdPlaceEntry[];
  eliminated: ThirdPlaceEntry[];
  tied: ThirdPlaceEntry[];
  slotsToFill: number;
}

export function detectThirdPlaceTie(
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): ThirdPlaceTieInfo {
  const ranking = getThirdPlaceRanking(predictions, groupTiebreakers);

  if (ranking.length < 9) {
    return { lockedIn: ranking.slice(0, 8), eliminated: [], tied: [], slotsToFill: 0 };
  }

  const boundaryPoints = ranking[7].standing.points;

  const lockedIn: ThirdPlaceEntry[] = [];
  const eliminated: ThirdPlaceEntry[] = [];
  const tied: ThirdPlaceEntry[] = [];

  for (const entry of ranking) {
    if (entry.standing.points > boundaryPoints) {
      lockedIn.push(entry);
    } else if (entry.standing.points === boundaryPoints) {
      tied.push(entry);
    } else {
      eliminated.push(entry);
    }
  }

  const slotsToFill = 8 - lockedIn.length;

  // If all tied teams fit, there's no real tie
  if (slotsToFill >= tied.length) {
    return {
      lockedIn: [...lockedIn, ...tied],
      eliminated,
      tied: [],
      slotsToFill: 0,
    };
  }

  return { lockedIn, eliminated, tied, slotsToFill };
}

export function areThirdPlaceTiesResolved(
  predictions: Record<string, MatchResult>,
  tiebreakerPicks?: string[],
  groupTiebreakers: GroupTiebreakers = {}
): boolean {
  const { slotsToFill, tied } = detectThirdPlaceTie(predictions, groupTiebreakers);
  if (slotsToFill === 0) return true;
  if (!tiebreakerPicks || tiebreakerPicks.length !== slotsToFill) return false;
  const tiedTeams = new Set(tied.map(entry => entry.team));
  return new Set(tiebreakerPicks).size === tiebreakerPicks.length && tiebreakerPicks.every(team => tiedTeams.has(team));
}

// Get the best 8 third-place teams
export function getBestThirdPlaceTeams(
  predictions: Record<string, MatchResult>,
  tiebreakerPicks?: string[],
  groupTiebreakers: GroupTiebreakers = {}
): { team: string; group: GroupLetter }[] {
  const { lockedIn, tied, slotsToFill } = detectThirdPlaceTie(predictions, groupTiebreakers);

  if (slotsToFill === 0) {
    return lockedIn.slice(0, 8).map(e => ({ team: e.team, group: e.group }));
  }

  const tiedTeams = new Set(tied.map(entry => entry.team));
  const validPicks = !!tiebreakerPicks &&
    tiebreakerPicks.length === slotsToFill &&
    new Set(tiebreakerPicks).size === tiebreakerPicks.length &&
    tiebreakerPicks.every(team => tiedTeams.has(team));

  if (!validPicks) {
    return []; // tie unresolved
  }

  const pickedFromTie = tied.filter(e => tiebreakerPicks.includes(e.team));
  const combined = [...lockedIn, ...pickedFromTie];
  return combined.map(e => ({ team: e.team, group: e.group }));
}

// Get group winners and runners-up
export function getGroupQualifiers(
  predictions: Record<string, MatchResult>,
  groupTiebreakers: GroupTiebreakers = {}
): { winners: Record<GroupLetter, string>; runnersUp: Record<GroupLetter, string> } {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const winners: Record<string, string> = {};
  const runnersUp: Record<string, string> = {};

  groups.forEach(g => {
    if (!isGroupComplete(g, predictions)) return;
    if (getUnresolvedGroupTieBands(g, predictions, groupTiebreakers).length > 0) return;
    const standings = calculateGroupStandings(g, predictions, groupTiebreakers);
    if (standings.length >= 2) {
      winners[g] = standings[0].team;
      runnersUp[g] = standings[1].team;
    }
  });

  return {
    winners: winners as Record<GroupLetter, string>,
    runnersUp: runnersUp as Record<GroupLetter, string>,
  };
}
