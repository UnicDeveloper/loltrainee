import {
  createGameDetection,
  isOverwolfAvailable,
  startOverlayHotkey,
  windowManager,
} from '@/core/overwolf';
import { logger } from '@/core/utils/logger';

/**
 * Background controller:
 * - opens desktop
 * - owns overlay hotkey
 * - auto-shows overlay when entering IN_GAME
 */
async function bootstrapBackground(): Promise<void> {
  logger.info('Background window starting');

  if (!isOverwolfAvailable()) {
    logger.warn('Background running outside Overwolf');
    return;
  }

  const shown = await windowManager.showDesktopWindow();
  if (!shown) {
    logger.error('Failed to open desktop window from background');
  }

  const stopHotkey = startOverlayHotkey();

  const detection = createGameDetection((snapshot) => {
    if (snapshot.gameState === 'IN_GAME') {
      void windowManager.showOverlay();
    }
  });

  void detection.start();

  window.addEventListener('beforeunload', () => {
    stopHotkey();
    detection.stop();
  });
}

void bootstrapBackground();
