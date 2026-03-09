import { Team, GroupLetter } from '@/types';

// FIFA World Cup 2026 — 48 teams, 12 groups
// Groups based on the official FIFA draw (placeholder seedings based on rankings)
export const teams: Team[] = [
  // Group A
  { name: 'United States', code: 'US', flag: '🇺🇸', fifaRanking: 11, group: 'A' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', fifaRanking: 14, group: 'A' },
  { name: 'Scotland', code: 'GB-SCT', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', fifaRanking: 51, group: 'A' },
  { name: 'Slovenia', code: 'SI', flag: '🇸🇮', fifaRanking: 55, group: 'A' },

  // Group B
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', fifaRanking: 5, group: 'B' },
  { name: 'Ecuador', code: 'EC', flag: '🇪🇨', fifaRanking: 30, group: 'B' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', fifaRanking: 58, group: 'B' },
  { name: 'Bolivia', code: 'BO', flag: '🇧🇴', fifaRanking: 83, group: 'B' },

  // Group C
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', fifaRanking: 1, group: 'C' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', fifaRanking: 16, group: 'C' },
  { name: 'Uzbekistan', code: 'UZ', flag: '🇺🇿', fifaRanking: 63, group: 'C' },
  { name: 'Jamaica', code: 'JM', flag: '🇯🇲', fifaRanking: 64, group: 'C' },

  // Group D
  { name: 'France', code: 'FR', flag: '🇫🇷', fifaRanking: 2, group: 'D' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', fifaRanking: 12, group: 'D' },
  { name: 'Bahrain', code: 'BH', flag: '🇧🇭', fifaRanking: 81, group: 'D' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', fifaRanking: 93, group: 'D' },

  // Group E
  { name: 'Spain', code: 'ES', flag: '🇪🇸', fifaRanking: 3, group: 'E' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', fifaRanking: 24, group: 'E' },
  { name: 'Honduras', code: 'HN', flag: '🇭🇳', fifaRanking: 73, group: 'E' },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸', fifaRanking: 33, group: 'E' },

  // Group F
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', fifaRanking: 4, group: 'F' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', fifaRanking: 8, group: 'F' },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', fifaRanking: 39, group: 'F' },
  { name: 'Paraguay', code: 'PY', flag: '🇵🇾', fifaRanking: 56, group: 'F' },

  // Group G
  { name: 'England', code: 'GB-ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', fifaRanking: 6, group: 'G' },
  { name: 'Senegal', code: 'SN', flag: '🇸🇳', fifaRanking: 21, group: 'G' },
  { name: 'Haiti', code: 'HT', flag: '🇭🇹', fifaRanking: 88, group: 'G' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦', fifaRanking: 42, group: 'G' },

  // Group H
  { name: 'Germany', code: 'DE', flag: '🇩🇪', fifaRanking: 7, group: 'H' },
  { name: 'Uruguay', code: 'UY', flag: '🇺🇾', fifaRanking: 13, group: 'H' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', fifaRanking: 23, group: 'H' },
  { name: 'Trinidad & Tobago', code: 'TT', flag: '🇹🇹', fifaRanking: 103, group: 'H' },

  // Group I
  { name: 'Japan', code: 'JP', flag: '🇯🇵', fifaRanking: 15, group: 'I' },
  { name: 'Iran', code: 'IR', flag: '🇮🇷', fifaRanking: 20, group: 'I' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', fifaRanking: 40, group: 'I' },
  { name: 'Cameroon', code: 'CM', flag: '🇨🇲', fifaRanking: 50, group: 'I' },

  // Group J
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', fifaRanking: 9, group: 'J' },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷', fifaRanking: 10, group: 'J' },
  { name: 'Panama', code: 'PA', flag: '🇵🇦', fifaRanking: 44, group: 'J' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', fifaRanking: 108, group: 'J' },

  // Group K
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', fifaRanking: 17, group: 'K' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', fifaRanking: 19, group: 'K' },
  { name: 'Costa Rica', code: 'CR', flag: '🇨🇷', fifaRanking: 52, group: 'K' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', fifaRanking: 36, group: 'K' },

  // Group L
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', fifaRanking: 18, group: 'L' },
  { name: 'Wales', code: 'GB-WLS', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', fifaRanking: 25, group: 'L' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', fifaRanking: 34, group: 'L' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', fifaRanking: 89, group: 'L' },
];

export const teamsByCode: Record<string, Team> = {};
teams.forEach(t => { teamsByCode[t.code] = t; });

export const groups: GroupLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export function getGroupTeams(group: GroupLetter): Team[] {
  return teams.filter(t => t.group === group);
}
