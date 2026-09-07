import { WINDOW_NAMES, type WindowName } from '@/core/config/app';
import { logger } from '@/core/utils/logger';
import { getOverwolf, isOverwolfAvailable } from './overwolfClient';
import type { OwWindowResult } from './types';

function promisifyWindowCall(
  invoke: (callback: (result: OwWindowResult) => void) => void,
): Promise<OwWindowResult> {
  return new Promise((resolve) => {
    try {
      invoke((result) => resolve(result));
    } catch (error) {
      logger.error('Window API call failed', error);
      resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
}

async function obtainWindow(windowName: WindowName): Promise<OwWindowResult> {
  const ow = getOverwolf();
  if (!ow) {
    return { success: false, error: 'Overwolf API unavailable' };
  }

  return promisifyWindowCall((callback) => {
    ow.windows.obtainDeclaredWindow(windowName, callback);
  });
}

async function showWindow(windowName: WindowName): Promise<boolean> {
  if (!isOverwolfAvailable()) {
    logger.warn(`Cannot show window "${windowName}": Overwolf unavailable`);
    return false;
  }

  const obtained = await obtainWindow(windowName);
  if (!obtained.success || !obtained.window?.id) {
    logger.error(`Failed to obtain window "${windowName}"`, obtained.error);
    return false;
  }

  const ow = getOverwolf();
  if (!ow) {
    return false;
  }

  const restored = await promisifyWindowCall((callback) => {
    ow.windows.restore(obtained.window!.id, callback);
  });

  if (!restored.success) {
    logger.error(`Failed to restore window "${windowName}"`, restored.error);
    return false;
  }

  logger.info(`Window shown: ${windowName}`);
  return true;
}

async function hideWindow(windowName: WindowName): Promise<boolean> {
  if (!isOverwolfAvailable()) {
    logger.warn(`Cannot hide window "${windowName}": Overwolf unavailable`);
    return false;
  }

  const obtained = await obtainWindow(windowName);
  if (!obtained.success || !obtained.window?.id) {
    logger.error(`Failed to obtain window "${windowName}"`, obtained.error);
    return false;
  }

  const ow = getOverwolf();
  if (!ow) {
    return false;
  }

  const hidden = await promisifyWindowCall((callback) => {
    ow.windows.hide(obtained.window!.id, callback);
  });

  if (!hidden.success) {
    logger.error(`Failed to hide window "${windowName}"`, hidden.error);
    return false;
  }

  logger.info(`Window hidden: ${windowName}`);
  return true;
}

export const windowManager = {
  showDesktopWindow: () => showWindow(WINDOW_NAMES.DESKTOP),
  hideDesktopWindow: () => hideWindow(WINDOW_NAMES.DESKTOP),
  showOverlay: () => showWindow(WINDOW_NAMES.OVERLAY),
  hideOverlay: () => hideWindow(WINDOW_NAMES.OVERLAY),
  showWindow,
  hideWindow,
};
