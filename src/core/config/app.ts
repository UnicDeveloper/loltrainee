export const APP_NAME = 'LoL Coach';
export const APP_VERSION = '0.4.0';

export const WINDOW_NAMES = {
  BACKGROUND: 'background',
  DESKTOP: 'desktop',
  OVERLAY: 'overlay',
} as const;

export type WindowName = (typeof WINDOW_NAMES)[keyof typeof WINDOW_NAMES];

export const HOTKEYS = {
  TOGGLE_OVERLAY: 'lol_coach_toggle_overlay',
} as const;

/** When true, the desktop Development panel is visible. */
export const SHOW_DEV_PANEL = false;

/** Phase 9 AI Coach UI + API calls. Keep false until OpenAI is ready for release. */
export const AI_COACH_ENABLED = false;

export const STORAGE_KEYS = {
  SETTINGS: 'lol-coach:settings',
  MATCH_HISTORY: 'lol-coach:matches',
  OBJECTIVES: 'lol-coach:objectives',
  POOL_CACHE: 'lol-coach:pool-cache',
  SESSION: 'lol-coach:session',
} as const;
