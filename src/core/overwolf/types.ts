/**
 * Minimal Overwolf API surface used by Phases 0–6.
 * Documented against public Overwolf SDK; defensive where launcher GEP shapes vary.
 */

export interface OwRunningGameInfo {
  isRunning: boolean;
  isInFocus?: boolean;
  gameIsInFocus?: boolean;
  title?: string;
  id?: number;
  classId?: number;
  width?: number;
  height?: number;
  processId?: number;
}

export interface OwGameInfoUpdatedEvent {
  gameInfo: OwRunningGameInfo | null;
  runningChanged?: boolean;
  gameChanged?: boolean;
  focusChanged?: boolean;
  resolutionChanged?: boolean;
}

export interface OwGetRunningGameInfo2Result {
  success: boolean;
  error?: string | null;
  gameInfo: OwRunningGameInfo | null;
}

export interface OwLauncherInfo {
  title?: string;
  id?: number;
  classId?: number;
  isInFocus?: boolean;
  processId?: number;
  path?: string;
  commandLine?: string;
}

export interface OwGetRunningLaunchersInfoResult {
  success: boolean;
  error?: string | null;
  launchers?: OwLauncherInfo[];
}

export interface OwLauncherUpdatedEvent {
  info: OwLauncherInfo;
  changeType?: string[] | Record<string, unknown>;
}

export interface OwWindowResult {
  success: boolean;
  error?: string;
  window?: {
    id: string;
    name: string;
    width?: number;
    height?: number;
    left?: number;
    top?: number;
  };
}

export interface OwResult {
  success: boolean;
  error?: string;
}

export interface OwInfoUpdatePayload {
  info?: Record<string, unknown>;
  feature?: string;
  [key: string]: unknown;
}

export interface OwLauncherEventsApi {
  setRequiredFeatures: (
    launcherClassId: number,
    features: string[],
    callback: OwCallback<OwResult & { supportedFeatures?: string[] }>,
  ) => void;
  getInfo: (
    launcherClassId: number,
    callback: OwCallback<OwResult & { res?: Record<string, unknown>; info?: Record<string, unknown> }>,
  ) => void;
  onInfoUpdates: OwEventBus<OwInfoUpdatePayload>;
  onNewEvents?: OwEventBus<OwInfoUpdatePayload>;
}

export interface OwGameEventsApi {
  setRequiredFeatures: (
    features: string[],
    callback: OwCallback<OwResult & { supportedFeatures?: string[] }>,
  ) => void;
  getInfo: (callback: OwCallback<OwResult & { res?: Record<string, unknown> }>) => void;
  onInfoUpdates2: OwEventBus<OwInfoUpdatePayload>;
  onNewEvents: OwEventBus<OwInfoUpdatePayload>;
}

export interface OwHotkeyPressedEvent {
  name: string;
}

export interface OwHotkeysApi {
  onPressed: OwEventBus<OwHotkeyPressedEvent>;
}

export type OwCallback<T> = (result: T) => void;

export interface OwEventBus<TPayload> {
  addListener: (callback: (payload: TPayload) => void) => void;
  removeListener: (callback: (payload: TPayload) => void) => void;
}

export interface OverwolfGamesApi {
  getRunningGameInfo2: (callback: OwCallback<OwGetRunningGameInfo2Result>) => void;
  onGameInfoUpdated: OwEventBus<OwGameInfoUpdatedEvent>;
  events?: OwGameEventsApi;
  launchers: {
    getRunningLaunchersInfo: (callback: OwCallback<OwGetRunningLaunchersInfoResult>) => void;
    onUpdated: OwEventBus<OwLauncherUpdatedEvent>;
    onLaunched: OwEventBus<OwLauncherInfo>;
    onTerminated: OwEventBus<OwLauncherInfo>;
    events?: OwLauncherEventsApi;
  };
}

export interface OverwolfWindowsApi {
  obtainDeclaredWindow: (windowName: string, callback: OwCallback<OwWindowResult>) => void;
  restore: (windowId: string, callback?: OwCallback<OwWindowResult>) => void;
  hide: (windowId: string, callback?: OwCallback<OwWindowResult>) => void;
  close: (windowId: string, callback?: OwCallback<OwWindowResult>) => void;
  getCurrentWindow: (callback: OwCallback<OwWindowResult>) => void;
}

export interface OverwolfSettingsApi {
  hotkeys?: OwHotkeysApi;
}

export interface OverwolfApi {
  games: OverwolfGamesApi;
  windows: OverwolfWindowsApi;
  settings?: OverwolfSettingsApi;
}

export interface OverwolfWindowHost {
  overwolf?: OverwolfApi;
}
