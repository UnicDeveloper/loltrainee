/**
 * Env-backed config.
 * Secrets live in `.env` and are embedded at Vite build time for the Overwolf client.
 */

export function getRiotApiKey(): string {
  const key = import.meta.env.VITE_RIOT_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

export function hasRiotApiKey(): boolean {
  return getRiotApiKey().length > 0;
}

export function getOpenAiApiKey(): string {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

export function hasOpenAiApiKey(): boolean {
  return getOpenAiApiKey().length > 0;
}

export function getOpenAiBaseUrl(): string {
  const base = import.meta.env.VITE_OPENAI_BASE_URL;
  if (typeof base === 'string' && base.trim().length > 0) {
    return base.trim().replace(/\/$/, '');
  }
  return 'https://api.openai.com/v1';
}

export function getOpenAiModel(): string {
  const model = import.meta.env.VITE_OPENAI_MODEL;
  return typeof model === 'string' && model.trim().length > 0 ? model.trim() : 'gpt-4o-mini';
}
