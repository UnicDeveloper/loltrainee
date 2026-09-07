import { create } from 'zustand';
import { STORAGE_KEYS } from '@/core/config/app';
import {
  DEFAULT_ROLE_PRIORITY,
  normalizeRolePriority,
  toggleRolePriority as toggleRoleInPriority,
  type SelectableCoachRole,
} from '@/core/config/roles';
import { DEFAULT_LOCALE, type Locale } from '@/core/i18n/messages';
import { loadJson, saveJson } from '@/core/storage/localStore';
import type { GameDetectionSource, LeagueGameState, LolClientPhase } from '@/core/types/league';
import type { ChampSelectSnapshot } from '@/core/overwolf/lifecycle';

export interface GameSessionState {
  gameState: LeagueGameState;
  gameRunning: boolean;
  launcherRunning: boolean;
  clientPhase: LolClientPhase | null;
  gameId?: number;
  gameTitle?: string;
  lastEvent: GameDetectionSource;
  overwolfConnected: boolean;
  champSelect: ChampSelectSnapshot;
  overlayVisible: boolean;
  setFromDetection: (payload: {
    gameState: LeagueGameState;
    gameRunning: boolean;
    launcherRunning: boolean;
    clientPhase: LolClientPhase | null;
    gameId?: number;
    gameTitle?: string;
    lastEvent: GameDetectionSource;
    champSelect: ChampSelectSnapshot;
  }) => void;
  setOverwolfConnected: (connected: boolean) => void;
  setGameState: (state: LeagueGameState) => void;
  setOverlayVisible: (visible: boolean) => void;
}

export const useGameSessionStore = create<GameSessionState>((set) => ({
  gameState: 'UNAVAILABLE',
  gameRunning: false,
  launcherRunning: false,
  clientPhase: null,
  gameId: undefined,
  gameTitle: undefined,
  lastEvent: 'init',
  overwolfConnected: false,
  champSelect: { enemyChampionIds: [], enemyByRole: {} },
  overlayVisible: true,

  setFromDetection: (payload) =>
    set({
      gameState: payload.gameState,
      gameRunning: payload.gameRunning,
      launcherRunning: payload.launcherRunning,
      clientPhase: payload.clientPhase,
      gameId: payload.gameId,
      gameTitle: payload.gameTitle,
      lastEvent: payload.lastEvent,
      champSelect: payload.champSelect,
    }),

  setOverwolfConnected: (connected) => set({ overwolfConnected: connected }),
  setGameState: (state) => set({ gameState: state }),
  setOverlayVisible: (visible) => set({ overlayVisible: visible }),
}));

export interface SettingsState {
  riotId: string;
  locale: Locale;
  puuid: string;
  rolePriority: SelectableCoachRole[];
  hydrated: boolean;
  hydrate: () => void;
  setRiotId: (riotId: string) => void;
  setLocale: (locale: Locale) => void;
  setPuuid: (puuid: string) => void;
  setRolePriority: (roles: SelectableCoachRole[]) => void;
  toggleRolePriority: (role: SelectableCoachRole) => void;
  persist: () => void;
}

interface PersistedSettings {
  riotId: string;
  locale: Locale;
  puuid: string;
  rolePriority: SelectableCoachRole[];
  /** @deprecated removed from UI; kept optional for migration */
  apiKey?: string;
}

const defaultSettings: PersistedSettings = {
  riotId: '',
  locale: DEFAULT_LOCALE,
  puuid: '',
  rolePriority: [...DEFAULT_ROLE_PRIORITY],
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  riotId: defaultSettings.riotId,
  locale: defaultSettings.locale,
  puuid: defaultSettings.puuid,
  rolePriority: [...DEFAULT_ROLE_PRIORITY],
  hydrated: false,

  hydrate: () => {
    const saved = loadJson<PersistedSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
    set({
      riotId: saved.riotId ?? '',
      locale: saved.locale ?? DEFAULT_LOCALE,
      puuid: saved.puuid ?? '',
      rolePriority: normalizeRolePriority(saved.rolePriority),
      hydrated: true,
    });
  },

  setRiotId: (riotId) => set({ riotId }),
  setLocale: (locale) => set({ locale }),
  setPuuid: (puuid) => set({ puuid }),
  setRolePriority: (roles) => set({ rolePriority: normalizeRolePriority(roles) }),

  toggleRolePriority: (role) => {
    const next = toggleRoleInPriority(get().rolePriority, role);
    set({ rolePriority: next });
  },

  persist: () => {
    const { riotId, locale, puuid, rolePriority } = get();
    saveJson(STORAGE_KEYS.SETTINGS, {
      riotId,
      locale,
      puuid,
      rolePriority: normalizeRolePriority(rolePriority),
    });
  },
}));
