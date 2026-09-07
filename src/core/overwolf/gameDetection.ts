import {
  GAME_REQUIRED_FEATURES,
  LAUNCHER_REQUIRED_FEATURES,
  LEAGUE_GAME_CLASS_ID,
  LEAGUE_LAUNCHER_CLASS_ID,
  LEAGUE_LAUNCHER_CLASS_IDS,
} from '@/core/config/league';
import type { GameDetectionSource, LeagueGameState, LolClientPhase } from '@/core/types/league';
import { logger } from '@/core/utils/logger';
import {
  extractPhaseFromLauncherInfo,
  mapClientPhaseToGameState,
  parseChampSelectInfo,
  type ChampSelectSnapshot,
} from './lifecycle';
import { getOverwolf, isOverwolfAvailable } from './overwolfClient';
import type {
  OwGameInfoUpdatedEvent,
  OwGetRunningGameInfo2Result,
  OwGetRunningLaunchersInfoResult,
  OwInfoUpdatePayload,
  OwLauncherInfo,
  OwRunningGameInfo,
} from './types';

export interface GameDetectionSnapshot {
  gameState: LeagueGameState;
  gameRunning: boolean;
  launcherRunning: boolean;
  clientPhase: LolClientPhase | null;
  gameId?: number;
  gameTitle?: string;
  lastEvent: GameDetectionSource;
  champSelect: ChampSelectSnapshot;
}

export type GameDetectionListener = (snapshot: GameDetectionSnapshot) => void;

function isLeagueGame(info: OwRunningGameInfo | null | undefined): boolean {
  return Boolean(info?.isRunning && info.classId === LEAGUE_GAME_CLASS_ID);
}

function isLeagueLauncher(info: OwLauncherInfo | null | undefined): boolean {
  return Boolean(info?.classId && LEAGUE_LAUNCHER_CLASS_IDS.includes(info.classId));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * League process + launcher lifecycle detection.
 * Uses Overwolf games + launchers (+ launcher GEP when available).
 */
export function createGameDetection(onUpdate: GameDetectionListener) {
  let stopped = false;
  let launcherRunning = false;
  let latestGameInfo: OwRunningGameInfo | null = null;
  let clientPhase: LolClientPhase | null = null;
  let champSelect: ChampSelectSnapshot = { enemyChampionIds: [], enemyByRole: {} };

  const emit = (lastEvent: GameDetectionSource) => {
    if (stopped) return;

    const gameRunning = isLeagueGame(latestGameInfo);
    const gameState = mapClientPhaseToGameState(clientPhase, {
      launcherRunning,
      gameRunning,
    });

    const snapshot: GameDetectionSnapshot = {
      gameState,
      gameRunning,
      launcherRunning,
      clientPhase,
      gameId: gameRunning ? (latestGameInfo?.classId ?? LEAGUE_GAME_CLASS_ID) : undefined,
      gameTitle: gameRunning ? latestGameInfo?.title : undefined,
      lastEvent,
      champSelect,
    };

    logger.debug('Game detection snapshot', snapshot);
    onUpdate(snapshot);
  };

  const handleGameInfoUpdated = (event: OwGameInfoUpdatedEvent) => {
    try {
      const info = event.gameInfo;

      if (info && isLeagueGame(info)) {
        latestGameInfo = info;
      } else if (
        info?.classId === LEAGUE_GAME_CLASS_ID &&
        (info.isRunning === false || event.runningChanged)
      ) {
        latestGameInfo = null;
      } else if (!info) {
        latestGameInfo = null;
      } else if (info.classId !== undefined && info.classId !== LEAGUE_GAME_CLASS_ID) {
        latestGameInfo = null;
      }

      emit('gameInfoUpdated');

      if (isLeagueGame(latestGameInfo)) {
        void registerGameFeatures();
      }
    } catch (error) {
      logger.error('Error handling onGameInfoUpdated', error);
      emit('error');
    }
  };

  const handleLauncherUpdated = () => {
    void queryLaunchers('launcherUpdated');
  };

  const handleLauncherLaunched = (info: OwLauncherInfo) => {
    if (isLeagueLauncher(info)) {
      launcherRunning = true;
      emit('launcherLaunched');
      void registerLauncherFeatures();
    }
  };

  const handleLauncherTerminated = (info: OwLauncherInfo) => {
    if (isLeagueLauncher(info)) {
      launcherRunning = false;
      clientPhase = null;
      champSelect = { enemyChampionIds: [], enemyByRole: {} };
      emit('launcherTerminated');
    }
  };

  const applyLauncherInfoPayload = (
    payload: Record<string, unknown> | undefined,
    source: GameDetectionSource,
  ) => {
    const phase = extractPhaseFromLauncherInfo(payload);
    if (phase) {
      clientPhase = phase;
    }

    if (clientPhase === 'ChampSelect') {
      const parsed = parseChampSelectInfo(payload);
      if (parsed.myChampionId || parsed.enemyChampionIds.length > 0 || parsed.assignedPosition) {
        champSelect = parsed;
      } else if (payload?.champ_select) {
        champSelect = parseChampSelectInfo(payload);
      }
    } else if (
      clientPhase === 'Lobby' ||
      clientPhase === 'ReadyCheck' ||
      clientPhase === 'None' ||
      clientPhase === 'EndOfGame'
    ) {
      // Avoid stale assignedPosition leaking into draft advice outside champ select.
      champSelect = { enemyChampionIds: [], enemyByRole: {} };
    }

    emit(source);
  };

  const handleLauncherInfoUpdates = (event: OwInfoUpdatePayload) => {
    try {
      const info = (event.info ?? event) as Record<string, unknown>;
      applyLauncherInfoPayload(info, 'gameFlowPhase');
    } catch (error) {
      logger.error('Error handling launcher info updates', error);
      emit('error');
    }
  };

  const registerLauncherFeatures = async () => {
    const ow = getOverwolf();
    const api = ow?.games.launchers.events;
    if (!api) {
      logger.warn('Launcher events API missing — phase detection limited to process flags');
      return;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ok = await new Promise<boolean>((resolve) => {
        try {
          api.setRequiredFeatures(
            LEAGUE_LAUNCHER_CLASS_ID,
            [...LAUNCHER_REQUIRED_FEATURES],
            (result) => {
              if (!result.success) {
                logger.warn('Launcher setRequiredFeatures failed', result.error);
                resolve(false);
                return;
              }
              logger.info('Launcher features registered', result.supportedFeatures);
              resolve(true);
            },
          );
        } catch (error) {
          logger.error('Launcher setRequiredFeatures threw', error);
          resolve(false);
        }
      });

      if (ok) {
        api.getInfo(LEAGUE_LAUNCHER_CLASS_ID, (result) => {
          const info = (result.res ?? result.info) as Record<string, unknown> | undefined;
          applyLauncherInfoPayload(info, 'gameFlowPhase');
        });
        return;
      }

      await delay(1500);
    }
  };

  const registerGameFeatures = async () => {
    const ow = getOverwolf();
    const api = ow?.games.events;
    if (!api) {
      return;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ok = await new Promise<boolean>((resolve) => {
        try {
          api.setRequiredFeatures([...GAME_REQUIRED_FEATURES], (result) => {
            if (!result.success) {
              logger.warn('Game setRequiredFeatures failed', result.error);
              resolve(false);
              return;
            }
            logger.info('Game features registered', result.supportedFeatures);
            resolve(true);
          });
        } catch (error) {
          logger.error('Game setRequiredFeatures threw', error);
          resolve(false);
        }
      });
      if (ok) return;
      await delay(1500);
    }
  };

  const queryGame = (source: GameDetectionSource): Promise<void> => {
    const ow = getOverwolf();
    if (!ow) return Promise.resolve();

    return new Promise((resolve) => {
      try {
        ow.games.getRunningGameInfo2((result: OwGetRunningGameInfo2Result) => {
          try {
            if (!result.success) {
              logger.warn('getRunningGameInfo2 unsuccessful', result.error);
            }
            latestGameInfo = isLeagueGame(result.gameInfo) ? result.gameInfo : null;
            emit(source);
            if (latestGameInfo) {
              void registerGameFeatures();
            }
          } catch (error) {
            logger.error('Error processing getRunningGameInfo2', error);
            emit('error');
          } finally {
            resolve();
          }
        });
      } catch (error) {
        logger.error('getRunningGameInfo2 threw', error);
        emit('error');
        resolve();
      }
    });
  };

  const queryLaunchers = (source: GameDetectionSource): Promise<void> => {
    const ow = getOverwolf();
    if (!ow?.games.launchers) {
      logger.warn('overwolf.games.launchers API missing');
      emit(source);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        ow.games.launchers.getRunningLaunchersInfo((result: OwGetRunningLaunchersInfoResult) => {
          try {
            if (!result.success) {
              logger.warn('getRunningLaunchersInfo unsuccessful', result.error);
            }
            launcherRunning = (result.launchers ?? []).some(isLeagueLauncher);
            emit(source);
            if (launcherRunning) {
              void registerLauncherFeatures();
            }
          } catch (error) {
            logger.error('Error processing getRunningLaunchersInfo', error);
            emit('error');
          } finally {
            resolve();
          }
        });
      } catch (error) {
        logger.error('getRunningLaunchersInfo threw', error);
        emit('error');
        resolve();
      }
    });
  };

  const start = async () => {
    if (!isOverwolfAvailable()) {
      onUpdate({
        gameState: 'UNAVAILABLE',
        gameRunning: false,
        launcherRunning: false,
        clientPhase: null,
        lastEvent: 'init',
        champSelect: { enemyChampionIds: [], enemyByRole: {} },
      });
      logger.warn('Overwolf unavailable — detection idle');
      return;
    }

    const ow = getOverwolf();
    if (!ow) {
      onUpdate({
        gameState: 'UNAVAILABLE',
        gameRunning: false,
        launcherRunning: false,
        clientPhase: null,
        lastEvent: 'error',
        champSelect: { enemyChampionIds: [], enemyByRole: {} },
      });
      return;
    }

    try {
      ow.games.onGameInfoUpdated.addListener(handleGameInfoUpdated);
    } catch (error) {
      logger.error('Failed to subscribe to onGameInfoUpdated', error);
    }

    try {
      ow.games.launchers.onUpdated.addListener(handleLauncherUpdated);
      ow.games.launchers.onLaunched.addListener(handleLauncherLaunched);
      ow.games.launchers.onTerminated.addListener(handleLauncherTerminated);
    } catch (error) {
      logger.error('Failed to subscribe to launcher process events', error);
    }

    try {
      ow.games.launchers.events?.onInfoUpdates.addListener(handleLauncherInfoUpdates);
    } catch (error) {
      logger.error('Failed to subscribe to launcher info updates', error);
    }

    await Promise.all([
      queryGame('getRunningGameInfo'),
      queryLaunchers('getRunningLaunchersInfo'),
    ]);

    logger.info('Game detection started');
  };

  const stop = () => {
    stopped = true;
    const ow = getOverwolf();
    if (!ow) return;

    try {
      ow.games.onGameInfoUpdated.removeListener(handleGameInfoUpdated);
    } catch (error) {
      logger.error('Failed to remove onGameInfoUpdated', error);
    }

    try {
      ow.games.launchers.onUpdated.removeListener(handleLauncherUpdated);
      ow.games.launchers.onLaunched.removeListener(handleLauncherLaunched);
      ow.games.launchers.onTerminated.removeListener(handleLauncherTerminated);
    } catch (error) {
      logger.error('Failed to remove launcher listeners', error);
    }

    try {
      ow.games.launchers.events?.onInfoUpdates.removeListener(handleLauncherInfoUpdates);
    } catch (error) {
      logger.error('Failed to remove launcher info listeners', error);
    }

    logger.info('Game detection stopped');
  };

  const refresh = async () => {
    if (!isOverwolfAvailable()) {
      onUpdate({
        gameState: 'UNAVAILABLE',
        gameRunning: false,
        launcherRunning: false,
        clientPhase: null,
        lastEvent: 'manual',
        champSelect: { enemyChampionIds: [], enemyByRole: {} },
      });
      return;
    }
    await Promise.all([queryGame('manual'), queryLaunchers('manual')]);
  };

  return { start, stop, refresh };
}

export type GameDetectionController = ReturnType<typeof createGameDetection>;
