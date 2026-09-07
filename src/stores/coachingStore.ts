import { create } from 'zustand';
import { STORAGE_KEYS } from '@/core/config/app';
import { getRiotApiKey } from '@/core/config/env';
import { buildChampionPool, computeTrends, summarizeMatchForPuuid } from '@/core/coaching/analytics';
import { buildDraftCallAdvice, type DraftCallAdvice } from '@/core/coaching/draftCall';
import { buildDraftAdvice, type DraftAdvice } from '@/core/coaching/engine';
import { mapRiotPosition, type CoachRole } from '@/core/config/roles';
import {
  fetchAccountByRiotId,
  fetchChampionTable,
  fetchMasteries,
  fetchMatch,
  fetchMatchIds,
} from '@/core/riot/client';
import type { PoolChampion, StoredMatchSummary } from '@/core/riot/types';
import { loadJson, saveJson } from '@/core/storage/localStore';
import { logger } from '@/core/utils/logger';
import { useSettingsStore } from '@/stores/gameSessionStore';

export interface CoachingState {
  matches: StoredMatchSummary[];
  pool: PoolChampion[];
  objectives: string[];
  draftAdvice: DraftAdvice | null;
  draftCallAdvice: DraftCallAdvice | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'ok';
  syncError?: string;
  lastSyncedAt?: number;
  hydrate: () => void;
  setObjectives: (objectives: string[]) => void;
  addObjective: (text: string) => void;
  removeObjective: (index: number) => void;
  syncFromRiot: () => Promise<void>;
  refreshDraftAdvice: (input?: {
    assignedRole?: CoachRole;
    myChampionId?: number;
    enemyChampionIds?: number[];
    enemyByRole?: Partial<Record<CoachRole, number>>;
  }) => Promise<void>;
}

export const useCoachingStore = create<CoachingState>((set, get) => ({
  matches: [],
  pool: [],
  objectives: [],
  draftAdvice: null,
  draftCallAdvice: null,
  syncStatus: 'idle',
  syncError: undefined,
  lastSyncedAt: undefined,

  hydrate: () => {
    const matches = loadJson<StoredMatchSummary[]>(STORAGE_KEYS.MATCH_HISTORY, []);
    const pool = loadJson<PoolChampion[]>(STORAGE_KEYS.POOL_CACHE, []);
    const objectives = loadJson<string[]>(STORAGE_KEYS.OBJECTIVES, []);
    set({ matches, pool, objectives });
  },

  setObjectives: (objectives) => {
    saveJson(STORAGE_KEYS.OBJECTIVES, objectives);
    set({ objectives });
  },

  addObjective: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const objectives = [...get().objectives, trimmed].slice(-8);
    saveJson(STORAGE_KEYS.OBJECTIVES, objectives);
    set({ objectives });
  },

  removeObjective: (index) => {
    const objectives = get().objectives.filter((_, i) => i !== index);
    saveJson(STORAGE_KEYS.OBJECTIVES, objectives);
    set({ objectives });
  },

  syncFromRiot: async () => {
    const { riotId, setPuuid, persist, rolePriority } = useSettingsStore.getState();
    const apiKey = getRiotApiKey();

    if (!apiKey) {
      set({ syncStatus: 'error', syncError: 'missing_api_key' });
      return;
    }

    if (!riotId) {
      set({ syncStatus: 'error', syncError: 'missing_credentials' });
      return;
    }

    set({ syncStatus: 'syncing', syncError: undefined });

    try {
      const account = await fetchAccountByRiotId(apiKey, riotId);
      setPuuid(account.puuid);
      persist();

      const [masteries, matchIds, champions] = await Promise.all([
        fetchMasteries(apiKey, account.puuid),
        fetchMatchIds(apiKey, account.puuid),
        fetchChampionTable(),
      ]);

      const summaries: StoredMatchSummary[] = [];
      // Sequential to respect personal API key rate limits.
      for (const matchId of matchIds) {
        try {
          const match = await fetchMatch(apiKey, matchId);
          const summary = summarizeMatchForPuuid(match, account.puuid);
          if (summary) {
            summaries.push(summary);
          }
        } catch (error) {
          logger.warn(`Skipping match ${matchId}`, error);
        }
      }

      const pool = buildChampionPool(masteries, summaries, champions, rolePriority);
      saveJson(STORAGE_KEYS.MATCH_HISTORY, summaries);
      saveJson(STORAGE_KEYS.POOL_CACHE, pool);

      set({
        matches: summaries,
        pool,
        syncStatus: 'ok',
        lastSyncedAt: Date.now(),
      });

      await get().refreshDraftAdvice();
    } catch (error) {
      logger.error('Riot sync failed', error);
      set({
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : String(error),
      });
    }
  },

  refreshDraftAdvice: async (input) => {
    const { locale, rolePriority } = useSettingsStore.getState();
    const { pool, matches } = get();
    try {
      const champions = await fetchChampionTable();
      const advice = buildDraftAdvice({
        pool,
        matches,
        champions,
        assignedRole: input?.assignedRole,
        myChampionId: input?.myChampionId,
        enemyChampionIds: input?.enemyChampionIds,
        locale,
        rolePriority,
      });
      const callAdvice = buildDraftCallAdvice({
        rolePriority,
        pool,
        matches,
        champions,
        assignedRole: input?.assignedRole,
        enemyByRole: input?.enemyByRole,
        enemyChampionIds: input?.enemyChampionIds,
        locale,
      });
      set({ draftAdvice: advice, draftCallAdvice: callAdvice });
    } catch (error) {
      logger.error('Failed to refresh draft advice', error);
    }
  },
}));

export function getTrends() {
  return computeTrends(useCoachingStore.getState().matches);
}

export function resolveAssignedRole(assignedPosition?: string): CoachRole | undefined {
  if (!assignedPosition) return undefined;
  return mapRiotPosition(assignedPosition);
}
