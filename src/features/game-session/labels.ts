import { LEAGUE_GAME_CLASS_ID } from '@/core/config/league';
import type { LeagueGameState } from '@/core/types/league';

export function formatLeagueDetected(gameState: LeagueGameState): 'Detected' | 'Not detected' {
  if (gameState === 'UNAVAILABLE' || gameState === 'IDLE') {
    return 'Not detected';
  }
  return 'Detected';
}

export function formatGameStateLabel(gameState: LeagueGameState): string {
  return gameState;
}

export function getConfiguredLeagueGameId(): number {
  return LEAGUE_GAME_CLASS_ID;
}
