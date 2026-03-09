import { GroupMatch, GroupLetter } from '@/types';
import { getGroupTeams } from './teams';

// Generate all 6 matches per group (round-robin of 4 teams)
function generateGroupMatches(group: GroupLetter): GroupMatch[] {
  const groupTeams = getGroupTeams(group);
  const [t1, t2, t3, t4] = groupTeams;

  // Standard FIFA match day schedule for groups of 4:
  // MD1: 1v2, 3v4 | MD2: 1v3, 2v4 | MD3: 1v4, 2v3
  return [
    { id: `${group}-1`, group, matchNumber: 1, home: t1.code, away: t2.code },
    { id: `${group}-2`, group, matchNumber: 2, home: t3.code, away: t4.code },
    { id: `${group}-3`, group, matchNumber: 3, home: t1.code, away: t3.code },
    { id: `${group}-4`, group, matchNumber: 4, home: t2.code, away: t4.code },
    { id: `${group}-5`, group, matchNumber: 5, home: t1.code, away: t4.code },
    { id: `${group}-6`, group, matchNumber: 6, home: t2.code, away: t3.code },
  ];
}

export const allGroupMatches: GroupMatch[] = (
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as GroupLetter[]
).flatMap(g => generateGroupMatches(g));

export function getGroupMatches(group: GroupLetter): GroupMatch[] {
  return allGroupMatches.filter(m => m.group === group);
}
