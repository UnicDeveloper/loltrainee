/**
 * Official Overwolf identifiers for League of Legends.
 *
 * Game class ID 5426 — Overwolf Games IDs / GEP.
 * Launcher class ID 10902 — LoL client launcher events.
 * Legacy launcher class id 5427 — older Overwolf examples.
 */
export const LEAGUE_GAME_CLASS_ID = 5426;

export const LEAGUE_LAUNCHER_CLASS_ID = 10902;

export const LEAGUE_LAUNCHER_CLASS_ID_LEGACY = 5427;

export const LEAGUE_LAUNCHER_CLASS_IDS: readonly number[] = [
  LEAGUE_LAUNCHER_CLASS_ID,
  LEAGUE_LAUNCHER_CLASS_ID_LEGACY,
];

/** Launcher GEP features used for lifecycle + champ select. */
export const LAUNCHER_REQUIRED_FEATURES: readonly string[] = [
  'game_flow',
  'champ_select',
  'summoner_info',
  'lobby_info',
  'end_game',
];

/** In-game GEP features (safe / public info only). */
export const GAME_REQUIRED_FEATURES: readonly string[] = ['match_info', 'game_info', 'live_client_data'];
