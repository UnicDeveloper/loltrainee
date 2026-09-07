import {
  getOpenAiApiKey,
  getOpenAiBaseUrl,
  getOpenAiModel,
} from '@/core/config/env';
import { logger } from '@/core/utils/logger';

export class AiCoachError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiCoachError';
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function requestAiCoachReply(input: {
  system: string;
  user: string;
}): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new AiCoachError('missing_api_key');
  }

  const url = `${getOpenAiBaseUrl()}/chat/completions`;
  const body = {
    model: getOpenAiModel(),
    temperature: 0.4,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ] satisfies ChatMessage[],
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error('AI Coach network error', error);
    throw new AiCoachError(error instanceof Error ? error.message : String(error));
  }

  const json = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    const message = json.error?.message || `AI API ${response.status}`;
    logger.error('AI Coach API error', { status: response.status, message });
    throw new AiCoachError(message, response.status);
  }

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AiCoachError('empty_response');
  }

  return content;
}
