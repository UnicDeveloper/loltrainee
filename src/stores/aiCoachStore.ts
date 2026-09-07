import { create } from 'zustand';
import { requestAiCoachReply } from '@/core/ai/coachClient';
import { buildAiContextPayload, buildAiSystemPrompt } from '@/core/ai/prompts';
import { buildPersonalAnalytics } from '@/core/coaching/personalAnalytics';
import { AI_COACH_ENABLED } from '@/core/config/app';
import { hasOpenAiApiKey } from '@/core/config/env';
import { logger } from '@/core/utils/logger';
import { useCoachingStore } from '@/stores/coachingStore';
import { useSettingsStore } from '@/stores/gameSessionStore';
import { useSessionStore } from '@/stores/sessionStore';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  at: number;
}

interface AiCoachState {
  messages: AiChatMessage[];
  status: 'idle' | 'loading' | 'error';
  error?: string;
  ask: (prompt: string) => Promise<void>;
  reviewSession: () => Promise<void>;
  clear: () => void;
}

function uid(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function runCoach(userPrompt: string, set: (partial: Partial<AiCoachState>) => void, get: () => AiCoachState) {
  if (!AI_COACH_ENABLED) {
    set({ status: 'error', error: 'ai_disabled' });
    return;
  }
  if (!hasOpenAiApiKey()) {
    set({ status: 'error', error: 'missing_api_key' });
    return;
  }

  const { locale, rolePriority, riotId } = useSettingsStore.getState();
  const { matches, pool, draftCallAdvice } = useCoachingStore.getState();
  const session = useSessionStore.getState().current;

  const personal = buildPersonalAnalytics({
    matches,
    pool,
    rolePriority,
    locale,
  });

  const context = [
    buildAiContextPayload({
      riotId,
      rolePriority,
      matches,
      pool,
      personal,
      session,
      draftCall: draftCallAdvice,
    }),
    '',
    '=== PLAYER REQUEST ===',
    userPrompt,
  ].join('\n');

  const userMessage: AiChatMessage = {
    id: uid(),
    role: 'user',
    content: userPrompt,
    at: Date.now(),
  };

  set({
    status: 'loading',
    error: undefined,
    messages: [...get().messages, userMessage],
  });

  try {
    const reply = await requestAiCoachReply({
      system: buildAiSystemPrompt(locale),
      user: context,
    });

    set({
      status: 'idle',
      messages: [
        ...get().messages,
        {
          id: uid(),
          role: 'assistant',
          content: reply,
          at: Date.now(),
        },
      ],
    });
  } catch (error) {
    logger.error('AI Coach failed', error);
    set({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const useAiCoachStore = create<AiCoachState>((set, get) => ({
  messages: [],
  status: 'idle',
  error: undefined,

  ask: async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    await runCoach(trimmed, set, get);
  },

  reviewSession: async () => {
    const locale = useSettingsStore.getState().locale;
    const prompt =
      locale === 'es'
        ? 'Haz una review de coaching de mi forma actual y dame 3 acciones concretas para la próxima partida.'
        : 'Review my current form and give me 3 concrete actions for the next game.';
    await runCoach(prompt, set, get);
  },

  clear: () => set({ messages: [], status: 'idle', error: undefined }),
}));
