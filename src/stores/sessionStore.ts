import { create } from 'zustand';
import { STORAGE_KEYS } from '@/core/config/app';
import {
  computeSessionStats,
  endCoachingSession,
  matchesInSession,
  refreshCoachingSession,
  startCoachingSession,
  type CoachingSession,
  type SessionStats,
} from '@/core/coaching/sessionCoach';
import type { StoredMatchSummary } from '@/core/riot/types';
import { loadJson, saveJson } from '@/core/storage/localStore';
import { logger } from '@/core/utils/logger';
import { useCoachingStore } from '@/stores/coachingStore';
import { useSettingsStore } from '@/stores/gameSessionStore';

interface PersistedSessionState {
  current: CoachingSession | null;
  history: CoachingSession[];
}

const defaultPersisted: PersistedSessionState = {
  current: null,
  history: [],
};

export interface SessionCoachState {
  current: CoachingSession | null;
  history: CoachingSession[];
  hydrated: boolean;
  hydrate: () => void;
  startSession: () => void;
  endSession: () => void;
  refreshFromMatches: (matches?: StoredMatchSummary[]) => void;
  onLifecycleHint: (gameState: string) => void;
  getSessionMatches: (matches?: StoredMatchSummary[]) => StoredMatchSummary[];
  getStats: (matches?: StoredMatchSummary[]) => SessionStats;
}

function persistState(current: CoachingSession | null, history: CoachingSession[]) {
  saveJson<PersistedSessionState>(STORAGE_KEYS.SESSION, { current, history });
}

export const useSessionStore = create<SessionCoachState>((set, get) => ({
  current: null,
  history: [],
  hydrated: false,

  hydrate: () => {
    const saved = loadJson<PersistedSessionState>(STORAGE_KEYS.SESSION, defaultPersisted);
    set({
      current: saved.current,
      history: saved.history ?? [],
      hydrated: true,
    });
  },

  startSession: () => {
    const { objectives } = useCoachingStore.getState();
    const { rolePriority, locale } = useSettingsStore.getState();
    const previous = get().current;

    const history = [...get().history];
    if (previous?.active) {
      history.unshift(endCoachingSession(previous));
    }

    const session = startCoachingSession({
      objectives,
      rolePriority,
      locale,
    });

    const trimmedHistory = history.slice(0, 10);
    persistState(session, trimmedHistory);
    set({ current: session, history: trimmedHistory });
    logger.info('Session Coach started', { id: session.id });
  },

  endSession: () => {
    const current = get().current;
    if (!current || !current.active) {
      return;
    }

    const { matches } = useCoachingStore.getState();
    const { rolePriority, locale } = useSettingsStore.getState();
    const refreshed = refreshCoachingSession({
      session: current,
      allMatches: matches,
      rolePriority,
      locale,
    });
    const ended = endCoachingSession(refreshed);
    const history = [ended, ...get().history].slice(0, 10);
    persistState(null, history);
    set({ current: null, history });
    logger.info('Session Coach ended', { id: ended.id });
  },

  refreshFromMatches: (matchesInput) => {
    const current = get().current;
    if (!current?.active) {
      return;
    }

    const matches = matchesInput ?? useCoachingStore.getState().matches;
    const { rolePriority, locale } = useSettingsStore.getState();
    const refreshed = refreshCoachingSession({
      session: current,
      allMatches: matches,
      rolePriority,
      locale,
    });
    persistState(refreshed, get().history);
    set({ current: refreshed });
  },

  onLifecycleHint: (gameState) => {
    if (gameState === 'POST_GAME') {
      // Soft refresh: user may sync shortly after; also re-evaluate with local cache.
      get().refreshFromMatches();
    }

    if (gameState === 'LOBBY' || gameState === 'QUEUE' || gameState === 'CHAMP_SELECT') {
      // Keep next-focus fresh between games while session is active.
      get().refreshFromMatches();
    }
  },

  getSessionMatches: (matchesInput) => {
    const current = get().current;
    if (!current) {
      return [];
    }
    const matches = matchesInput ?? useCoachingStore.getState().matches;
    return matchesInSession(matches, current.startedAt, current.endedAt);
  },

  getStats: (matchesInput) => {
    return computeSessionStats(get().getSessionMatches(matchesInput));
  },
}));
