import { GroupLetter, GroupStanding, MatchResult } from '@/types';
import { getGroupTeams, teamsByCode } from '@/data/teams';
import { getGroupMatches } from '@/data/matches';

export function calculateGroupStandings(
  group: GroupLetter,
  predictions: Record<string, MatchResult>
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

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // Tiebreakers: points → FIFA ranking (lower is better)
    return a.fifaRanking - b.fifaRanking;
  });
}

export function getAllGroupStandings(
  predictions: Record<string, MatchResult>
): Record<GroupLetter, GroupStanding[]> {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const result: Record<string, GroupStanding[]> = {};
  groups.forEach(g => {
    result[g] = calculateGroupStandings(g, predictions);
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

// Get all 3rd-place teams ranked
export function getThirdPlaceRanking(
  predictions: Record<string, MatchResult>
): { team: string; group: GroupLetter; standing: GroupStanding }[] {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const thirdPlaced: { team: string; group: GroupLetter; standing: GroupStanding }[] = [];

  groups.forEach(g => {
    if (!isGroupComplete(g, predictions)) return;
    const standings = calculateGroupStandings(g, predictions);
    if (standings.length >= 3) {
      thirdPlaced.push({ team: standings[2].team, group: g, standing: standings[2] });
    }
  });

  thirdPlaced.sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    return a.standing.fifaRanking - b.standing.fifaRanking;
  });

  return thirdPlaced;
}

// Get the best 8 third-place teams
export function getBestThirdPlaceTeams(
  predictions: Record<string, MatchResult>
): { team: string; group: GroupLetter }[] {
  const ranking = getThirdPlaceRanking(predictions);
  return ranking.slice(0, 8);
}

// Get group winners and runners-up
export function getGroupQualifiers(
  predictions: Record<string, MatchResult>
): { winners: Record<GroupLetter, string>; runnersUp: Record<GroupLetter, string> } {
  const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const winners: Record<string, string> = {};
  const runnersUp: Record<string, string> = {};

  groups.forEach(g => {
    if (!isGroupComplete(g, predictions)) return;
    const standings = calculateGroupStandings(g, predictions);
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
