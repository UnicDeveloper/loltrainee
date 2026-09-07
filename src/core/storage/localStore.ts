import { STORAGE_KEYS } from '@/core/config/app';
import { logger } from '@/core/utils/logger';

/**
 * Tiny localStorage JSON helpers. All coaching data stays on-device.
 */
export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.error(`Failed to load local key ${key}`, error);
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error(`Failed to save local key ${key}`, error);
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    logger.error(`Failed to remove local key ${key}`, error);
  }
}

export { STORAGE_KEYS };
