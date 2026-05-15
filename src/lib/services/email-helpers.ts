import { teamsByCode } from '@/data/teams';

// Short names for compact email rendering
const SHORT: Record<string, string> = {
  'United States': 'USA',
  'South Africa': 'S. Africa',
  'South Korea': 'S. Korea',
  'New Zealand': 'N. Zealand',
  'Saudi Arabia': 'S. Arabia',
  'Switzerland': 'Switz.',
  'SCE/DEN/IRL/MKD': 'TBD',
  'BIH/ITA/NIR/WAL': 'TBD',
  'KOS/ROU/SVK/TUR': 'TBD',
  'ALB/POL/SWE/UKR': 'TBD',
  'BOL/IRQ/SUR': 'TBD',
  'COD/JAM/NCL': 'TBD',
};

/** Short team name for email display */
export function tn(code?: string): string {
  if (!code || code.startsWith('TBD')) return 'TBD';
  const t = teamsByCode[code];
  if (!t) return code;
  return SHORT[t.name] || t.name;
}

/** Team flag emoji */
export function tf(code?: string): string {
  if (!code || code.startsWith('TBD')) return '';
  return teamsByCode[code]?.flag ?? '';
}

/** Resolve team code to name + flag */
export function resolveTeam(code: string): { name: string; flag: string } {
  const team = teamsByCode[code];
  return team ? { name: team.name, flag: team.flag } : { name: code, flag: '🏳️' };
}
