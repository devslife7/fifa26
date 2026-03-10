// Raw response types from api-football.com (api-sports.io) v3 API

export interface AFFixtureStatus {
  long: string;
  short: string; // NS, 1H, HT, 2H, ET, BT, P, INT, FT, AET, PEN, SUSP, PST, CANC, ABD, AWD, WO
  elapsed: number | null;
}

export interface AFVenue {
  id: number | null;
  name: string | null;
  city: string | null;
}

export interface AFFixture {
  id: number;
  date: string; // ISO 8601
  venue: AFVenue;
  status: AFFixtureStatus;
}

export interface AFTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface AFLeague {
  id: number;
  name: string;
  round: string; // "Group Stage - 1", "Round of 32", "Quarter-finals", etc.
}

export interface AFGoals {
  home: number | null;
  away: number | null;
}

export interface AFScore {
  halftime: AFGoals;
  fulltime: AFGoals;
  extratime: AFGoals;
  penalty: AFGoals;
}

export interface AFFixtureItem {
  fixture: AFFixture;
  league: AFLeague;
  teams: { home: AFTeam; away: AFTeam };
  goals: AFGoals;
  score: AFScore;
}

export interface AFFixturesResponse {
  results: number;
  response: AFFixtureItem[];
}

export interface AFTeamItem {
  team: { id: number; name: string; code: string; logo: string };
}

export interface AFTeamsResponse {
  results: number;
  response: AFTeamItem[];
}

export interface AFStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export interface AFStandingsLeague {
  standings: AFStandingEntry[][];
}

export interface AFStandingsResponse {
  results: number;
  response: Array<{ league: AFStandingsLeague }>;
}
