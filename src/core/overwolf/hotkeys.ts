import { HOTKEYS } from '@/core/config/app';
import { logger } from '@/core/utils/logger';
import { getOverwolf, isOverwolfAvailable } from './overwolfClient';
import { windowManager } from './windowManager';
import type { OwHotkeyPressedEvent } from './types';

/**
 * Registers Ctrl+* overlay toggle via Overwolf hotkeys API.
 */
export function startOverlayHotkey(): () => void {
  if (!isOverwolfAvailable()) {
    return () => undefined;
  }

  const ow = getOverwolf();
  const hotkeys = ow?.settings?.hotkeys;
  if (!hotkeys?.onPressed) {
    logger.warn('overwolf.settings.hotkeys.onPressed unavailable — overlay hotkey not bound');
    return () => undefined;
  }

  let visible = true;

  const onPressed = (event: OwHotkeyPressedEvent) => {
    if (event.name !== HOTKEYS.TOGGLE_OVERLAY) {
      return;
    }

    void (async () => {
      if (visible) {
        await windowManager.hideOverlay();
        visible = false;
        logger.info('Overlay hidden via hotkey');
      } else {
        await windowManager.showOverlay();
        visible = true;
        logger.info('Overlay shown via hotkey');
      }
    })();
  };

  try {
    hotkeys.onPressed.addListener(onPressed);
    logger.info(`Hotkey listener registered for ${HOTKEYS.TOGGLE_OVERLAY}`);
  } catch (error) {
    logger.error('Failed to register overlay hotkey', error);
  }

  return () => {
    try {
      hotkeys.onPressed.removeListener(onPressed);
    } catch (error) {
      logger.error('Failed to remove overlay hotkey listener', error);
    }
  };
}
