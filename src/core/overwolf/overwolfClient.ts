import type { OverwolfApi, OverwolfWindowHost } from './types';

function readHost(): OverwolfWindowHost | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window as unknown as OverwolfWindowHost;
}

/**
 * Thin access point for the Overwolf global.
 * Keeps feature code from touching `window.overwolf` directly.
 */
export function isOverwolfAvailable(): boolean {
  const host = readHost();
  return host !== null && typeof host.overwolf !== 'undefined';
}

export function getOverwolf(): OverwolfApi | null {
  const host = readHost();
  return host?.overwolf ?? null;
}

export function requireOverwolf(): OverwolfApi {
  const api = getOverwolf();
  if (!api) {
    throw new Error('Overwolf API is not available in this environment.');
  }

  return api;
}
