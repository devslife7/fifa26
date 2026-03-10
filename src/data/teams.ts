import { Team, GroupLetter } from '@/types';

// FIFA World Cup 2026 — 48 teams, 12 groups
// Groups and fixtures from the official FIFA draw (football-data.org)
export const teams: Team[] = [
  // Group A
  { name: 'Mexico',       code: 'MX',     flag: '🇲🇽', fifaRanking: 16,  group: 'A' },
  { name: 'South Africa', code: 'ZA',     flag: '🇿🇦', fifaRanking: 65,  group: 'A' },
  { name: 'South Korea',  code: 'KR',     flag: '🇰🇷', fifaRanking: 23,  group: 'A' },
  { name: 'TBD',          code: 'TBD-A',  flag: '🏳️', fifaRanking: 999, group: 'A' },

  // Group B
  { name: 'Canada',      code: 'CA',    flag: '🇨🇦', fifaRanking: 40,  group: 'B' },
  { name: 'Qatar',       code: 'QA',    flag: '🇶🇦', fifaRanking: 42,  group: 'B' },
  { name: 'Switzerland', code: 'CH',    flag: '🇨🇭', fifaRanking: 18,  group: 'B' },
  { name: 'TBD',         code: 'TBD-B', flag: '🏳️', fifaRanking: 999, group: 'B' },

  // Group C
  { name: 'Brazil',   code: 'BR',     flag: '🇧🇷', fifaRanking: 4,  group: 'C' },
  { name: 'Morocco',  code: 'MA',     flag: '🇲🇦', fifaRanking: 14, group: 'C' },
  { name: 'Haiti',    code: 'HT',     flag: '🇭🇹', fifaRanking: 88, group: 'C' },
  { name: 'Scotland', code: 'GB-SCT', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', fifaRanking: 51, group: 'C' },

  // Group D
  { name: 'United States', code: 'US',    flag: '🇺🇸', fifaRanking: 11,  group: 'D' },
  { name: 'Paraguay',      code: 'PY',    flag: '🇵🇾', fifaRanking: 56,  group: 'D' },
  { name: 'Australia',     code: 'AU',    flag: '🇦🇺', fifaRanking: 24,  group: 'D' },
  { name: 'TBD',           code: 'TBD-D', flag: '🏳️', fifaRanking: 999, group: 'D' },

  // Group E
  { name: 'Germany',     code: 'DE', flag: '🇩🇪', fifaRanking: 7,  group: 'E' },
  { name: 'Curaçao',     code: 'CW', flag: '🇨🇼', fifaRanking: 86, group: 'E' },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', fifaRanking: 39, group: 'E' },
  { name: 'Ecuador',     code: 'EC', flag: '🇪🇨', fifaRanking: 30, group: 'E' },

  // Group F
  { name: 'Netherlands', code: 'NL',    flag: '🇳🇱', fifaRanking: 9,   group: 'F' },
  { name: 'Japan',       code: 'JP',    flag: '🇯🇵', fifaRanking: 15,  group: 'F' },
  { name: 'Tunisia',     code: 'TN',    flag: '🇹🇳', fifaRanking: 35,  group: 'F' },
  { name: 'TBD',         code: 'TBD-F', flag: '🏳️', fifaRanking: 999, group: 'F' },

  // Group G
  { name: 'Belgium',     code: 'BE', flag: '🇧🇪', fifaRanking: 17, group: 'G' },
  { name: 'Egypt',       code: 'EG', flag: '🇪🇬', fifaRanking: 34, group: 'G' },
  { name: 'Iran',        code: 'IR', flag: '🇮🇷', fifaRanking: 20, group: 'G' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', fifaRanking: 93, group: 'G' },

  // Group H
  { name: 'Spain',       code: 'ES', flag: '🇪🇸', fifaRanking: 3,  group: 'H' },
  { name: 'Cape Verde',  code: 'CV', flag: '🇨🇻', fifaRanking: 73, group: 'H' },
  { name: 'Saudi Arabia',code: 'SA', flag: '🇸🇦', fifaRanking: 58, group: 'H' },
  { name: 'Uruguay',     code: 'UY', flag: '🇺🇾', fifaRanking: 13, group: 'H' },

  // Group I
  { name: 'France',  code: 'FR',    flag: '🇫🇷', fifaRanking: 2,   group: 'I' },
  { name: 'Senegal', code: 'SN',    flag: '🇸🇳', fifaRanking: 21,  group: 'I' },
  { name: 'Norway',  code: 'NO',    flag: '🇳🇴', fifaRanking: 30,  group: 'I' },
  { name: 'TBD',     code: 'TBD-I', flag: '🏳️', fifaRanking: 999, group: 'I' },

  // Group J
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', fifaRanking: 1,   group: 'J' },
  { name: 'Algeria',   code: 'DZ', flag: '🇩🇿', fifaRanking: 37,  group: 'J' },
  { name: 'Austria',   code: 'AT', flag: '🇦🇹', fifaRanking: 26,  group: 'J' },
  { name: 'Jordan',    code: 'JO', flag: '🇯🇴', fifaRanking: 101, group: 'J' },

  // Group K
  { name: 'Portugal',   code: 'PT',    flag: '🇵🇹', fifaRanking: 5,   group: 'K' },
  { name: 'Uzbekistan', code: 'UZ',    flag: '🇺🇿', fifaRanking: 63,  group: 'K' },
  { name: 'Colombia',   code: 'CO',    flag: '🇨🇴', fifaRanking: 12,  group: 'K' },
  { name: 'TBD',        code: 'TBD-K', flag: '🏳️', fifaRanking: 999, group: 'K' },

  // Group L
  { name: 'England', code: 'GB-ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', fifaRanking: 6,  group: 'L' },
  { name: 'Croatia', code: 'HR',     flag: '🇭🇷', fifaRanking: 10, group: 'L' },
  { name: 'Ghana',   code: 'GH',     flag: '🇬🇭', fifaRanking: 62, group: 'L' },
  { name: 'Panama',  code: 'PA',     flag: '🇵🇦', fifaRanking: 44, group: 'L' },
];

export const teamsByCode: Record<string, Team> = {};
teams.forEach(t => { teamsByCode[t.code] = t; });

export const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export function getGroupTeams(group: GroupLetter): Team[] {
  return teams.filter(t => t.group === group);
}
