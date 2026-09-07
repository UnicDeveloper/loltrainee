/**
 * Riot API configuration defaults.
 * Platform: la2 (LAN). Regional routing: americas (account + match-v5).
 */
export const RIOT_PLATFORM = 'la2' as const;
export const RIOT_REGIONAL_ROUTING = 'americas' as const;

export const RIOT_PLATFORM_BASE = `https://${RIOT_PLATFORM}.api.riotgames.com`;
export const RIOT_REGIONAL_BASE = `https://${RIOT_REGIONAL_ROUTING}.api.riotgames.com`;
export const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';

/** How many recent matches to pull when building pool + analytics. */
export const MATCH_HISTORY_LIMIT = 50;

/** Minimum mastery/games signals to include a champion in the recommended pool. */
export const POOL_MIN_GAMES = 2;
export const POOL_TOP_N = 12;
