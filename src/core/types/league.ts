export type LeagueGameState =
  | 'UNAVAILABLE'
  | 'IDLE'
  | 'LEAGUE_OPEN'
  | 'LOBBY'
  | 'QUEUE'
  | 'CHAMP_SELECT'
  | 'IN_GAME'
  | 'POST_GAME';

export type GameDetectionSource =
  | 'init'
  | 'getRunningGameInfo'
  | 'getRunningLaunchersInfo'
  | 'gameInfoUpdated'
  | 'launcherUpdated'
  | 'launcherLaunched'
  | 'launcherTerminated'
  | 'gameFlowPhase'
  | 'champSelect'
  | 'manual'
  | 'error';

/** Raw game_flow.phase values from Overwolf LoL launcher GEP. */
export type LolClientPhase =
  | 'None'
  | 'Lobby'
  | 'ReadyCheck'
  | 'ChampSelect'
  | 'GameStart'
  | 'InProgress'
  | 'WaitingForStats'
  | 'PreEndOfGame'
  | 'EndOfGame'
  | string;
