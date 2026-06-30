// Raw response types from football-data.org v4 API

export interface FDApiArea {
  id: number;
  name: string;
  code: string; // ISO 3166-1 alpha-3
  flag: string | null;
}

export interface FDApiTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string; // FIFA three-letter code
  crest: string;
  area?: FDApiArea; // present in /teams response, absent in /matches response
}

export interface FDApiScore {
  home: number | null;
  away: number | null;
}

export interface FDApiFullScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
  fullTime: FDApiScore;
  halfTime: FDApiScore;
  // Present for matches that went beyond 90 minutes. `fullTime` folds the
  // shootout into the score for PENALTY_SHOOTOUT matches, so the on-field
  // result must be read from regularTime (+ extraTime), and the shootout tally
  // from penalties.
  regularTime?: FDApiScore;
  extraTime?: FDApiScore;
  penalties?: FDApiScore;
}

export type FDMatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export interface FDApiMatch {
  id: number;
  utcDate: string;
  status: FDMatchStatus;
  matchday: number | null;
  stage: string; // GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS, THIRD_PLACE, FINAL
  group: string | null; // "Group A", "Group B", etc.
  homeTeam: FDApiTeam;
  awayTeam: FDApiTeam;
  score: FDApiFullScore;
  venue: string | null;
}

export interface FDMatchesResponse {
  count: number;
  filters: Record<string, unknown>;
  competition: { id: number; name: string; code: string };
  matches: FDApiMatch[];
}

export interface FDStandingTableEntry {
  position: number;
  team: FDApiTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FDStandingGroup {
  stage: string;
  type: string;
  group: string;
  table: FDStandingTableEntry[];
}

export interface FDStandingsResponse {
  competition: { id: number; name: string; code: string };
  standings: FDStandingGroup[];
}

export interface FDTeamsResponse {
  count: number;
  competition: { id: number; name: string; code: string };
  teams: FDApiTeam[];
}
