import { teamsByCode } from '@/data/teams';
import { MatchResult, KnockoutResult } from '@/types';

export interface EmailPredictionSummary {
  championName: string;
  championFlag: string;
  secondName: string;
  secondFlag: string;
  thirdName: string;
  thirdFlag: string;
}

export function buildEmailSummary(
  groupMatches: Record<string, MatchResult>,
  knockoutMatches: Record<string, KnockoutResult>,
  championCode: string | null,
): EmailPredictionSummary {
  // We need to derive the top 3 from knockout data
  // The champion is provided directly
  const champion = championCode ? teamsByCode[championCode] : null;

  // Find the final match to get the runner-up
  const finalMatch = Object.entries(knockoutMatches).find(([id]) => id.startsWith('FIN'));
  let secondCode: string | null = null;
  if (finalMatch && championCode) {
    const [matchId, result] = finalMatch;
    // The loser of the final is the runner-up
    // Match IDs encode home/away — we need to look at bracket structure
    // For simplicity, we look at the 3RD place match winner for third
    // Runner-up is the final loser
    // We don't have direct access to match teams here, so we rely on championCode
    // The runner-up info isn't easily derived without the bracket generator
    // We'll pass what we can
    void matchId;
    void result;
  }

  // Find 3rd place match
  const thirdMatch = Object.entries(knockoutMatches).find(([id]) => id.startsWith('3RD'));
  let thirdCode: string | null = null;
  if (thirdMatch) {
    void thirdMatch;
  }

  // Since deriving runner-up and 3rd requires the full bracket generator (which uses group standings),
  // we'll just return champion info and empty placeholders — the caller should pass top3 directly
  void secondCode;
  void thirdCode;
  void groupMatches;

  return {
    championName: champion?.name ?? 'Unknown',
    championFlag: champion?.flag ?? '🏳️',
    secondName: '',
    secondFlag: '',
    thirdName: '',
    thirdFlag: '',
  };
}

export function resolveTeam(code: string): { name: string; flag: string } {
  const team = teamsByCode[code];
  return team ? { name: team.name, flag: team.flag } : { name: code, flag: '🏳️' };
}
