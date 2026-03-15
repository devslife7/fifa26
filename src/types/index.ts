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

export type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'FIN';

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
  thirdPlaceTiebreaker?: string[];  // team codes chosen by user to advance from tie zone
  userName?: string;
  userEmail?: string;
  completedAt?: string;
}

export type TabId = 'groups' | 'bracket' | 'ranking' | 'profile';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  champion_code: string | null;
  calculated_at: string;
  position_change?: number;
}

export interface UserScore {
  total_points: number;
  group_correct: number;
  knockout_correct: number;
  champion_correct: boolean;
}

export interface SavedPrediction {
  id: string;
  name: string;
  is_active: boolean;
  is_complete: boolean;
  champion_code: string | null;
  share_token: string | null;
  group_matches: Record<string, MatchResult>;
  knockout_matches: Record<string, KnockoutResult>;
  third_place_tiebreaker: string[] | null;
  is_approved?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardPrediction {
  user_id: string;
  display_name: string;
  champion_code: string | null;
  group_matches: Record<string, MatchResult>;
  knockout_matches: Record<string, KnockoutResult>;
  third_place_tiebreaker?: string[] | null;
  is_approved?: boolean;
}

export interface LiveMatch {
  apiMatchId: number;
  localMatchId: string | null;
  homeCode: string | null;
  awayCode: string | null;
  homeName: string | null;
  awayName: string | null;
  homeShortName: string | null;
  awayShortName: string | null;
  homeFlag: string | null;
  awayFlag: string | null;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, etc.
  venue: string | null;
  score: { home: number; away: number } | null;
  actualResult: 'home' | 'draw' | 'away' | null;
  stage: string;
  group: string | null;
}
