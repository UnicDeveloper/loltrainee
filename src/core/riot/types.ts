import type { CoachRole } from '@/core/config/roles';

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummoner {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  markRequiredForNextLevel?: number;
  tokensEarned?: number;
  championSeasonMilestone?: number;
}

export interface MatchParticipant {
  puuid: string;
  championId: number;
  championName: string;
  teamPosition: string;
  individualPosition: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  timePlayed: number;
  goldEarned: number;
  visionScore: number;
  teamId?: number;
  challenges?: {
    csScorePerMinute?: number;
  };
}

export interface MatchInfo {
  gameCreation: number;
  gameDuration: number;
  gameMode: string;
  gameType: string;
  queueId: number;
  participants: MatchParticipant[];
}

export interface MatchDto {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: MatchInfo;
}

export interface DDragonChampion {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  blurb: string;
}

export interface StoredMatchSummary {
  matchId: string;
  playedAt: number;
  durationSec: number;
  championId: number;
  championName: string;
  role: CoachRole;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  csPerMin: number;
  queueId: number;
  /** Same-lane opponent when identifiable from match-v5. */
  laneOpponentChampionId?: number;
  laneOpponentChampionName?: string;
  /** Bot-lane second opponent (ADC↔Support) when identifiable. */
  duoOpponentChampionId?: number;
  duoOpponentChampionName?: string;
}

export interface PoolChampion {
  championId: number;
  championName: string;
  role: CoachRole;
  masteryLevel: number;
  masteryPoints: number;
  games: number;
  wins: number;
  winRate: number;
  avgCsPerMin: number;
  avgKda: number;
  score: number;
}
