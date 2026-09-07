import { POOL_MIN_GAMES, POOL_TOP_N } from '@/core/config/riot';
import {
  DEFAULT_ROLE_PRIORITY,
  mapRiotPosition,
  rolePriorityScore,
  type CoachRole,
  type SelectableCoachRole,
} from '@/core/config/roles';
import type {
  ChampionMastery,
  DDragonChampion,
  MatchDto,
  PoolChampion,
  StoredMatchSummary,
} from '@/core/riot/types';

function csTotal(p: {
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
}): number {
  return p.totalMinionsKilled + p.neutralMinionsKilled;
}

export function summarizeMatchForPuuid(match: MatchDto, puuid: string): StoredMatchSummary | null {
  const participant = match.info.participants.find((p) => p.puuid === puuid);
  if (!participant) {
    return null;
  }

  const durationSec = Math.max(match.info.gameDuration, 1);
  const cs = csTotal(participant);
  const csPerMin =
    participant.challenges?.csScorePerMinute ?? (cs / durationSec) * 60;

  const role = mapRiotPosition(participant.teamPosition || participant.individualPosition);
  const myTeamId = participant.teamId;
  const enemies = match.info.participants.filter((p) =>
    myTeamId !== undefined ? p.teamId !== myTeamId : p.win !== participant.win,
  );

  const sameLane = enemies.find(
    (e) => mapRiotPosition(e.teamPosition || e.individualPosition) === role,
  );

  let duo: (typeof enemies)[number] | undefined;
  if (role === 'ADC') {
    duo = enemies.find((e) => mapRiotPosition(e.teamPosition || e.individualPosition) === 'SUPPORT');
  } else if (role === 'SUPPORT') {
    duo = enemies.find((e) => mapRiotPosition(e.teamPosition || e.individualPosition) === 'ADC');
  }

  return {
    matchId: match.metadata.matchId,
    playedAt: match.info.gameCreation,
    durationSec,
    championId: participant.championId,
    championName: participant.championName,
    role,
    win: participant.win,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    cs,
    csPerMin: Number(csPerMin.toFixed(2)),
    queueId: match.info.queueId,
    laneOpponentChampionId: sameLane?.championId,
    laneOpponentChampionName: sameLane?.championName,
    duoOpponentChampionId: duo?.championId,
    duoOpponentChampionName: duo?.championName,
  };
}

export function buildChampionPool(
  masteries: ChampionMastery[],
  matches: StoredMatchSummary[],
  champions: Record<string, DDragonChampion>,
  rolePriority: readonly SelectableCoachRole[] = DEFAULT_ROLE_PRIORITY,
): PoolChampion[] {
  const byId = new Map<
    number,
    {
      championId: number;
      championName: string;
      roleVotes: Record<string, number>;
      games: number;
      wins: number;
      csSum: number;
      kdaSum: number;
      masteryLevel: number;
      masteryPoints: number;
    }
  >();

  for (const mastery of masteries) {
    const champ = Object.values(champions).find((c) => Number(c.key) === mastery.championId);
    byId.set(mastery.championId, {
      championId: mastery.championId,
      championName: champ?.name ?? `Champion ${mastery.championId}`,
      roleVotes: {},
      games: 0,
      wins: 0,
      csSum: 0,
      kdaSum: 0,
      masteryLevel: mastery.championLevel,
      masteryPoints: mastery.championPoints,
    });
  }

  for (const match of matches) {
    let entry = byId.get(match.championId);
    if (!entry) {
      entry = {
        championId: match.championId,
        championName: match.championName,
        roleVotes: {},
        games: 0,
        wins: 0,
        csSum: 0,
        kdaSum: 0,
        masteryLevel: 0,
        masteryPoints: 0,
      };
      byId.set(match.championId, entry);
    }

    entry.games += 1;
    entry.wins += match.win ? 1 : 0;
    entry.csSum += match.csPerMin;
    entry.kdaSum += (match.kills + match.assists) / Math.max(match.deaths, 1);
    entry.roleVotes[match.role] = (entry.roleVotes[match.role] ?? 0) + 1;
  }

  const pool: PoolChampion[] = [];

  for (const entry of byId.values()) {
    if (entry.games < POOL_MIN_GAMES && entry.masteryLevel < 5) {
      continue;
    }

    let role: CoachRole = 'UNKNOWN';
    let bestVote = -1;
    for (const [r, votes] of Object.entries(entry.roleVotes)) {
      if (votes > bestVote) {
        bestVote = votes;
        role = r as CoachRole;
      }
    }

    // Prefer priority roles when votes are tied-ish via score weighting later.
    const winRate = entry.games > 0 ? entry.wins / entry.games : 0;
    const avgCsPerMin = entry.games > 0 ? entry.csSum / entry.games : 0;
    const avgKda = entry.games > 0 ? entry.kdaSum / entry.games : 0;
    const roleBoost = Math.max(0, rolePriority.length - rolePriorityScore(role, rolePriority)) * 8;
    const score =
      entry.masteryPoints / 1000 +
      entry.games * 4 +
      winRate * 40 +
      avgCsPerMin * 2 +
      avgKda * 3 +
      roleBoost;

    pool.push({
      championId: entry.championId,
      championName: entry.championName,
      role,
      masteryLevel: entry.masteryLevel,
      masteryPoints: entry.masteryPoints,
      games: entry.games,
      wins: entry.wins,
      winRate: Number((winRate * 100).toFixed(1)),
      avgCsPerMin: Number(avgCsPerMin.toFixed(2)),
      avgKda: Number(avgKda.toFixed(2)),
      score,
    });
  }

  return pool.sort((a, b) => b.score - a.score).slice(0, POOL_TOP_N);
}

export function computeTrends(matches: StoredMatchSummary[]) {
  if (matches.length === 0) {
    return {
      games: 0,
      winRate: 0,
      avgKda: 0,
      avgCsPerMin: 0,
      avgDurationMin: 0,
      byRole: {} as Record<string, { games: number; wins: number; avgCsPerMin: number }>,
    };
  }

  let wins = 0;
  let kdaSum = 0;
  let csSum = 0;
  let durationSum = 0;
  const byRole: Record<string, { games: number; wins: number; csSum: number }> = {};

  for (const m of matches) {
    wins += m.win ? 1 : 0;
    kdaSum += (m.kills + m.assists) / Math.max(m.deaths, 1);
    csSum += m.csPerMin;
    durationSum += m.durationSec;
    const bucket = byRole[m.role] ?? { games: 0, wins: 0, csSum: 0 };
    bucket.games += 1;
    bucket.wins += m.win ? 1 : 0;
    bucket.csSum += m.csPerMin;
    byRole[m.role] = bucket;
  }

  const roleStats: Record<string, { games: number; wins: number; avgCsPerMin: number }> = {};
  for (const [role, bucket] of Object.entries(byRole)) {
    roleStats[role] = {
      games: bucket.games,
      wins: bucket.wins,
      avgCsPerMin: Number((bucket.csSum / Math.max(bucket.games, 1)).toFixed(2)),
    };
  }

  return {
    games: matches.length,
    winRate: Number(((wins / matches.length) * 100).toFixed(1)),
    avgKda: Number((kdaSum / matches.length).toFixed(2)),
    avgCsPerMin: Number((csSum / matches.length).toFixed(2)),
    avgDurationMin: Number((durationSum / matches.length / 60).toFixed(1)),
    byRole: roleStats,
  };
}
