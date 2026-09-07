import { mapRiotPosition, type CoachRole } from '@/core/config/roles';
import type { LeagueGameState, LolClientPhase } from '@/core/types/league';

/**
 * Maps Overwolf LoL launcher game_flow.phase (+ process flags) to app state.
 */
export function mapClientPhaseToGameState(
  phase: LolClientPhase | null | undefined,
  flags: { launcherRunning: boolean; gameRunning: boolean },
): LeagueGameState {
  if (!flags.launcherRunning && !flags.gameRunning) {
    return 'IDLE';
  }

  if (flags.gameRunning) {
    return 'IN_GAME';
  }

  switch (phase) {
    case 'Lobby':
      return 'LOBBY';
    case 'ReadyCheck':
      return 'QUEUE';
    case 'ChampSelect':
      return 'CHAMP_SELECT';
    case 'GameStart':
    case 'InProgress':
      return 'IN_GAME';
    case 'WaitingForStats':
    case 'PreEndOfGame':
    case 'EndOfGame':
      return 'POST_GAME';
    case 'None':
    default:
      return flags.launcherRunning ? 'LEAGUE_OPEN' : 'IDLE';
  }
}

export function extractPhaseFromLauncherInfo(info: Record<string, unknown> | undefined): string | null {
  if (!info) {
    return null;
  }

  const gameFlow = info.game_flow as Record<string, unknown> | undefined;
  if (gameFlow && typeof gameFlow.phase === 'string') {
    return gameFlow.phase;
  }

  // Some payloads nest under category keys.
  const nested = info.phase;
  if (typeof nested === 'string') {
    return nested;
  }

  return null;
}

export interface ChampSelectSnapshot {
  raw?: unknown;
  myChampionId?: number;
  enemyChampionIds: number[];
  assignedPosition?: string;
  enemyByRole: Partial<Record<CoachRole, number>>;
}

/**
 * Best-effort parse of Overwolf champ_select info.
 * Shape varies by patch; we only extract public draft fields when present.
 */
export function parseChampSelectInfo(info: Record<string, unknown> | undefined): ChampSelectSnapshot {
  const empty: ChampSelectSnapshot = { enemyChampionIds: [], enemyByRole: {} };
  if (!info) {
    return empty;
  }

  const champSelect = (info.champ_select ?? info) as Record<string, unknown>;
  const raw = champSelect.raw ?? champSelect.info ?? champSelect;

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ...empty, raw };
    }
  }

  const enemyChampionIds: number[] = [];
  const enemyByRole: Partial<Record<CoachRole, number>> = {};
  let myChampionId: number | undefined;
  let assignedPosition: string | undefined;

  const visitPlayer = (player: Record<string, unknown>, isEnemy: boolean) => {
    const championId = Number(player.championId ?? player.championPickIntent ?? 0);
    const position =
      typeof player.assignedPosition === 'string' ? player.assignedPosition : undefined;

    if (!isEnemy && !assignedPosition && position) {
      assignedPosition = position;
    }

    if (championId > 0) {
      if (isEnemy) {
        enemyChampionIds.push(championId);
        const role = mapRiotPosition(position);
        if (role !== 'UNKNOWN' && enemyByRole[role] === undefined) {
          enemyByRole[role] = championId;
        }
      } else if (!myChampionId) {
        myChampionId = championId;
      }
    }
  };

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const myTeam = obj.myTeam;
    const theirTeam = obj.theirTeam;

    if (Array.isArray(myTeam)) {
      for (const p of myTeam) {
        if (p && typeof p === 'object') {
          visitPlayer(p as Record<string, unknown>, false);
        }
      }
    }
    if (Array.isArray(theirTeam)) {
      for (const p of theirTeam) {
        if (p && typeof p === 'object') {
          visitPlayer(p as Record<string, unknown>, true);
        }
      }
    }
  }

  return {
    raw: parsed,
    myChampionId,
    enemyChampionIds: [...new Set(enemyChampionIds)],
    assignedPosition,
    enemyByRole,
  };
}
