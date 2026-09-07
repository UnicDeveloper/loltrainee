export { getOverwolf, isOverwolfAvailable, requireOverwolf } from './overwolfClient';
export { createGameDetection } from './gameDetection';
export type { GameDetectionController, GameDetectionSnapshot } from './gameDetection';
export { windowManager } from './windowManager';
export { startOverlayHotkey } from './hotkeys';
export {
  mapClientPhaseToGameState,
  parseChampSelectInfo,
  extractPhaseFromLauncherInfo,
} from './lifecycle';
