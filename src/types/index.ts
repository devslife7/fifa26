export type GroupLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface Team {
  name: string;
  code: string;       // ISO 3166-1 alpha-2
  flag: string;        // emoji flag
  fifaRanking: number;
  group: GroupLetter;
}

export type MatchResult = 'home' | 'draw' | 'away';
export type KnockoutResult = 'home' | 'away';

export interface GroupMatch {
  id: string;
  group: GroupLetter;
  matchNumber: number;
  home: string; // team code
  away: string;
  result?: MatchResult;
}

export interface KnockoutMatch {
  id: string;
  round: KnockoutRound;
  position: number; // position in bracket
  home?: string;
  away?: string;
  result?: KnockoutResult;
  homeSource?: MatchSource;
  awaySource?: MatchSource;
}

export type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'F';

export interface MatchSource {
  type: 'group_winner' | 'group_runner' | 'best_third' | 'knockout_winner';
  group?: GroupLetter;
  matchId?: string;
  thirdPlaceSlot?: number;
}

export interface GroupStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  fifaRanking: number;
}

export interface Predictions {
  groupMatches: Record<string, MatchResult>;
  knockoutMatches: Record<string, KnockoutResult>;
  userName?: string;
  userEmail?: string;
  completedAt?: string;
}

export type TabId = 'groups' | 'third-place' | 'bracket' | 'champion';
