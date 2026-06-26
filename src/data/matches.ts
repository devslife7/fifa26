import { GroupMatch, GroupLetter } from '@/types';

// FIFA World Cup 2026 — group stage fixtures from football-data.org
// Home/away and matchday order reflect the official schedule

export const allGroupMatches: GroupMatch[] = [
  // --- Group A ---
  { id: 'A-1', group: 'A', matchNumber: 1, home: 'MX',    away: 'ZA'    },
  { id: 'A-2', group: 'A', matchNumber: 2, home: 'KR',    away: 'CZ'    },
  { id: 'A-3', group: 'A', matchNumber: 3, home: 'CZ',    away: 'ZA'    },
  { id: 'A-4', group: 'A', matchNumber: 4, home: 'MX',    away: 'KR'    },
  { id: 'A-5', group: 'A', matchNumber: 5, home: 'CZ',    away: 'MX'    },
  { id: 'A-6', group: 'A', matchNumber: 6, home: 'ZA',    away: 'KR'    },

  // --- Group B ---
  { id: 'B-1', group: 'B', matchNumber: 1, home: 'CA',    away: 'BA'    },
  { id: 'B-2', group: 'B', matchNumber: 2, home: 'QA',    away: 'CH'    },
  { id: 'B-3', group: 'B', matchNumber: 3, home: 'CH',    away: 'BA'    },
  { id: 'B-4', group: 'B', matchNumber: 4, home: 'CA',    away: 'QA'    },
  { id: 'B-5', group: 'B', matchNumber: 5, home: 'CH',    away: 'CA'    },
  { id: 'B-6', group: 'B', matchNumber: 6, home: 'BA',    away: 'QA'    },

  // --- Group C ---
  { id: 'C-1', group: 'C', matchNumber: 1, home: 'BR',     away: 'MA'     },
  { id: 'C-2', group: 'C', matchNumber: 2, home: 'HT',     away: 'GB-SCT' },
  { id: 'C-3', group: 'C', matchNumber: 3, home: 'GB-SCT', away: 'MA'     },
  { id: 'C-4', group: 'C', matchNumber: 4, home: 'BR',     away: 'HT'     },
  { id: 'C-5', group: 'C', matchNumber: 5, home: 'MA',     away: 'HT'     },
  { id: 'C-6', group: 'C', matchNumber: 6, home: 'GB-SCT', away: 'BR'     },

  // --- Group D ---
  { id: 'D-1', group: 'D', matchNumber: 1, home: 'US',    away: 'PY'    },
  { id: 'D-2', group: 'D', matchNumber: 2, home: 'AU',    away: 'TR'    },
  { id: 'D-3', group: 'D', matchNumber: 3, home: 'TR',    away: 'PY'    },
  { id: 'D-4', group: 'D', matchNumber: 4, home: 'US',    away: 'AU'    },
  { id: 'D-5', group: 'D', matchNumber: 5, home: 'TR',    away: 'US'    },
  { id: 'D-6', group: 'D', matchNumber: 6, home: 'PY',    away: 'AU'    },

  // --- Group E ---
  { id: 'E-1', group: 'E', matchNumber: 1, home: 'DE', away: 'CW' },
  { id: 'E-2', group: 'E', matchNumber: 2, home: 'CI', away: 'EC' },
  { id: 'E-3', group: 'E', matchNumber: 3, home: 'DE', away: 'CI' },
  { id: 'E-4', group: 'E', matchNumber: 4, home: 'EC', away: 'CW' },
  { id: 'E-5', group: 'E', matchNumber: 5, home: 'EC', away: 'DE' },
  { id: 'E-6', group: 'E', matchNumber: 6, home: 'CW', away: 'CI' },

  // --- Group F ---
  { id: 'F-1', group: 'F', matchNumber: 1, home: 'NL',    away: 'JP'    },
  { id: 'F-2', group: 'F', matchNumber: 2, home: 'SE',    away: 'TN'    },
  { id: 'F-3', group: 'F', matchNumber: 3, home: 'TN',    away: 'JP'    },
  { id: 'F-4', group: 'F', matchNumber: 4, home: 'NL',    away: 'SE'    },
  { id: 'F-5', group: 'F', matchNumber: 5, home: 'TN',    away: 'NL'    },
  { id: 'F-6', group: 'F', matchNumber: 6, home: 'JP',    away: 'SE'    },

  // --- Group G ---
  { id: 'G-1', group: 'G', matchNumber: 1, home: 'BE', away: 'EG' },
  { id: 'G-2', group: 'G', matchNumber: 2, home: 'IR', away: 'NZ' },
  { id: 'G-3', group: 'G', matchNumber: 3, home: 'BE', away: 'IR' },
  { id: 'G-4', group: 'G', matchNumber: 4, home: 'NZ', away: 'EG' },
  { id: 'G-5', group: 'G', matchNumber: 5, home: 'NZ', away: 'BE' },
  { id: 'G-6', group: 'G', matchNumber: 6, home: 'EG', away: 'IR' },

  // --- Group H ---
  { id: 'H-1', group: 'H', matchNumber: 1, home: 'ES', away: 'CV' },
  { id: 'H-2', group: 'H', matchNumber: 2, home: 'SA', away: 'UY' },
  { id: 'H-3', group: 'H', matchNumber: 3, home: 'ES', away: 'SA' },
  { id: 'H-4', group: 'H', matchNumber: 4, home: 'UY', away: 'CV' },
  { id: 'H-5', group: 'H', matchNumber: 5, home: 'UY', away: 'ES' },
  { id: 'H-6', group: 'H', matchNumber: 6, home: 'CV', away: 'SA' },

  // --- Group I ---
  { id: 'I-1', group: 'I', matchNumber: 1, home: 'FR',    away: 'SN'    },
  { id: 'I-2', group: 'I', matchNumber: 2, home: 'IQ',    away: 'NO'    },
  { id: 'I-3', group: 'I', matchNumber: 3, home: 'FR',    away: 'IQ'    },
  { id: 'I-4', group: 'I', matchNumber: 4, home: 'NO',    away: 'SN'    },
  { id: 'I-5', group: 'I', matchNumber: 5, home: 'NO',    away: 'FR'    },
  { id: 'I-6', group: 'I', matchNumber: 6, home: 'SN',    away: 'IQ'    },

  // --- Group J ---
  { id: 'J-1', group: 'J', matchNumber: 1, home: 'AR', away: 'DZ' },
  { id: 'J-2', group: 'J', matchNumber: 2, home: 'AT', away: 'JO' },
  { id: 'J-3', group: 'J', matchNumber: 3, home: 'AR', away: 'AT' },
  { id: 'J-4', group: 'J', matchNumber: 4, home: 'JO', away: 'DZ' },
  { id: 'J-5', group: 'J', matchNumber: 5, home: 'JO', away: 'AR' },
  { id: 'J-6', group: 'J', matchNumber: 6, home: 'DZ', away: 'AT' },

  // --- Group K ---
  { id: 'K-1', group: 'K', matchNumber: 1, home: 'PT',    away: 'CD'    },
  { id: 'K-2', group: 'K', matchNumber: 2, home: 'UZ',    away: 'CO'    },
  { id: 'K-3', group: 'K', matchNumber: 3, home: 'PT',    away: 'UZ'    },
  { id: 'K-4', group: 'K', matchNumber: 4, home: 'CO',    away: 'CD'    },
  { id: 'K-5', group: 'K', matchNumber: 5, home: 'CO',    away: 'PT'    },
  { id: 'K-6', group: 'K', matchNumber: 6, home: 'CD',    away: 'UZ'    },

  // --- Group L ---
  { id: 'L-1', group: 'L', matchNumber: 1, home: 'GB-ENG', away: 'HR' },
  { id: 'L-2', group: 'L', matchNumber: 2, home: 'GH',     away: 'PA' },
  { id: 'L-3', group: 'L', matchNumber: 3, home: 'GB-ENG', away: 'GH' },
  { id: 'L-4', group: 'L', matchNumber: 4, home: 'PA',     away: 'HR' },
  { id: 'L-5', group: 'L', matchNumber: 5, home: 'PA',     away: 'GB-ENG' },
  { id: 'L-6', group: 'L', matchNumber: 6, home: 'HR',     away: 'GH' },
];

export function getGroupMatches(group: GroupLetter): GroupMatch[] {
  return allGroupMatches.filter(m => m.group === group);
}

// FIFA World Cup 2026 — knockout stage venues (official schedule)
// R32 slots are keyed to FIFA match numbers (R32-1 = M73 … R32-16 = M88), matching
// the bracket structure in lib/logic/bracket.ts. Used (with KNOCKOUT_R32_DATES) as
// the static schedule for the bracket-driven R32 rows in the Matches view when no
// live API fixture is joined yet.
export const KNOCKOUT_VENUES: Record<string, string> = {
  // Round of 32
  'R32-1':  'SoFi Stadium, Los Angeles',
  'R32-2':  'Gillette Stadium, Foxborough',
  'R32-3':  'Estadio BBVA, Monterrey',
  'R32-4':  'NRG Stadium, Houston',
  'R32-5':  'MetLife Stadium, East Rutherford',
  'R32-6':  'AT&T Stadium, Dallas',
  'R32-7':  'Estadio Azteca, Mexico City',
  'R32-8':  'Mercedes-Benz Stadium, Atlanta',
  'R32-9':  'Levi\'s Stadium, San Francisco',
  'R32-10': 'Lumen Field, Seattle',
  'R32-11': 'BMO Field, Toronto',
  'R32-12': 'SoFi Stadium, Los Angeles',
  'R32-13': 'BC Place, Vancouver',
  'R32-14': 'Hard Rock Stadium, Miami',
  'R32-15': 'Arrowhead Stadium, Kansas City',
  'R32-16': 'AT&T Stadium, Dallas',
  // Round of 16
  'R16-1': 'BC Place, Vancouver',
  'R16-2': 'Lumen Field, Seattle',
  'R16-3': 'SoFi Stadium, Los Angeles',
  'R16-4': 'Estadio Azteca, Mexico City',
  'R16-5': 'Hard Rock Stadium, Miami',
  'R16-6': 'Mercedes-Benz Stadium, Atlanta',
  'R16-7': 'NRG Stadium, Houston',
  'R16-8': 'MetLife Stadium, East Rutherford',
  // Quarter-finals
  'QF-1': 'Gillette Stadium, Foxborough',
  'QF-2': 'SoFi Stadium, Los Angeles',
  'QF-3': 'Hard Rock Stadium, Miami',
  'QF-4': 'AT&T Stadium, Dallas',
  // Semi-finals
  'SF-1': 'AT&T Stadium, Dallas',
  'SF-2': 'MetLife Stadium, East Rutherford',
  // Third place
  '3RD-1': 'Hard Rock Stadium, Miami',
  // Final
  'FIN-1': 'MetLife Stadium, East Rutherford',
};

// Local match dates for the Round of 32 (FIFA M73–M88), used to disambiguate the
// two venues that host two R32 matches each. Calendar dates only; the day gap
// between same-venue matches is several days, so this is robust to timezone offset.
export const KNOCKOUT_R32_DATES: Record<string, string> = {
  'R32-1':  '2026-06-28',
  'R32-2':  '2026-06-29',
  'R32-3':  '2026-06-29',
  'R32-4':  '2026-06-29',
  'R32-5':  '2026-06-30',
  'R32-6':  '2026-06-30',
  'R32-7':  '2026-06-30',
  'R32-8':  '2026-07-01',
  'R32-9':  '2026-07-01',
  'R32-10': '2026-07-01',
  'R32-11': '2026-07-02',
  'R32-12': '2026-07-02',
  'R32-13': '2026-07-02',
  'R32-14': '2026-07-03',
  'R32-15': '2026-07-03',
  'R32-16': '2026-07-03',
};
