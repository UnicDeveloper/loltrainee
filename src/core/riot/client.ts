import {
  DDRAGON_BASE,
  MATCH_HISTORY_LIMIT,
  RIOT_PLATFORM_BASE,
  RIOT_REGIONAL_BASE,
} from '@/core/config/riot';
import { logger } from '@/core/utils/logger';
import type {
  ChampionMastery,
  DDragonChampion,
  MatchDto,
  RiotAccount,
  RiotSummoner,
} from './types';

export class RiotApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'RiotApiError';
  }
}

function parseRiotId(riotId: string): { gameName: string; tagLine: string } {
  const trimmed = riotId.trim();
  const hash = trimmed.lastIndexOf('#');
  if (hash <= 0 || hash === trimmed.length - 1) {
    throw new RiotApiError('Riot ID must look like GameName#TAG');
  }
  return {
    gameName: trimmed.slice(0, hash),
    tagLine: trimmed.slice(hash + 1),
  };
}

async function riotFetch<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error('Riot API request failed', { url, status: response.status, body });
    throw new RiotApiError(`Riot API ${response.status}: ${body || response.statusText}`, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchAccountByRiotId(apiKey: string, riotId: string): Promise<RiotAccount> {
  const { gameName, tagLine } = parseRiotId(riotId);
  const url = `${RIOT_REGIONAL_BASE}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(url, apiKey);
}

export async function fetchSummonerByPuuid(apiKey: string, puuid: string): Promise<RiotSummoner> {
  const url = `${RIOT_PLATFORM_BASE}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return riotFetch<RiotSummoner>(url, apiKey);
}

export async function fetchMasteries(apiKey: string, puuid: string): Promise<ChampionMastery[]> {
  const url = `${RIOT_PLATFORM_BASE}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`;
  return riotFetch<ChampionMastery[]>(url, apiKey);
}

export async function fetchMatchIds(
  apiKey: string,
  puuid: string,
  count = MATCH_HISTORY_LIMIT,
): Promise<string[]> {
  const url = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${count}`;
  return riotFetch<string[]>(url, apiKey);
}

export async function fetchMatch(apiKey: string, matchId: string): Promise<MatchDto> {
  const url = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return riotFetch<MatchDto>(url, apiKey);
}

let ddragonVersionCache: string | null = null;
let championCache: Record<string, DDragonChampion> | null = null;

export async function fetchDDragonVersion(): Promise<string> {
  if (ddragonVersionCache) {
    return ddragonVersionCache;
  }
  const versions = await fetch(`${DDRAGON_BASE}/api/versions.json`).then(
    (r) => r.json() as Promise<string[]>,
  );
  const version = versions[0];
  if (!version) {
    throw new RiotApiError('Could not resolve Data Dragon version');
  }
  ddragonVersionCache = version;
  return version;
}

export async function fetchChampionTable(): Promise<Record<string, DDragonChampion>> {
  if (championCache) {
    return championCache;
  }
  const version = await fetchDDragonVersion();
  const payload = await fetch(`${DDRAGON_BASE}/cdn/${version}/data/en_US/champion.json`).then(
    (r) =>
      r.json() as Promise<{
        data: Record<string, DDragonChampion>;
      }>,
  );
  championCache = payload.data;
  return championCache;
}

export async function getChampionByKey(
  championId: number,
): Promise<DDragonChampion | undefined> {
  const table = await fetchChampionTable();
  return Object.values(table).find((c) => Number(c.key) === championId);
}

export function championIconUrl(championId: string, version: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championId}.png`;
}
