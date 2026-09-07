import { useState } from 'react';
import { hasOpenAiApiKey } from '@/core/config/env';
import { t } from '@/core/i18n/messages';
import { useAiCoachStore } from '@/stores/aiCoachStore';
import { useSettingsStore } from '@/stores/gameSessionStore';

export function AiCoachPanel() {
  const locale = useSettingsStore((s) => s.locale);
  const messages = useAiCoachStore((s) => s.messages);
  const status = useAiCoachStore((s) => s.status);
  const error = useAiCoachStore((s) => s.error);
  const ask = useAiCoachStore((s) => s.ask);
  const reviewSession = useAiCoachStore((s) => s.reviewSession);
  const clear = useAiCoachStore((s) => s.clear);
  const [draft, setDraft] = useState('');

  const ready = hasOpenAiApiKey();

  return (
    <section className="dashboard__panel" aria-labelledby="ai-heading">
      <h2 id="ai-heading" className="dashboard__heading">
        {t(locale, 'aiCoach')}
      </h2>
      <p className="dashboard__hint">{t(locale, 'aiCoachHint')}</p>

      <p className={`form-feedback ${ready ? '' : 'form-feedback--error'}`}>
        {ready ? t(locale, 'aiKeyFromEnv') : t(locale, 'aiKeyMissingEnv')}
      </p>

      <div className="dashboard__actions">
        <button
          type="button"
          className="dashboard__button"
          disabled={!ready || status === 'loading'}
          onClick={() => {
            void reviewSession();
          }}
        >
          {status === 'loading' ? t(locale, 'aiThinking') : t(locale, 'aiReview')}
        </button>
        <button
          type="button"
          className="dashboard__button dashboard__button--ghost"
          disabled={messages.length === 0}
          onClick={() => clear()}
        >
          {t(locale, 'aiClear')}
        </button>
      </div>

      <div className="ai-compose">
        <input
          className="inline-input"
          value={draft}
          placeholder={t(locale, 'aiPlaceholder')}
          disabled={!ready || status === 'loading'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void ask(draft);
              setDraft('');
            }
          }}
        />
        <button
          type="button"
          className="dashboard__button dashboard__button--ghost"
          disabled={!ready || status === 'loading' || !draft.trim()}
          onClick={() => {
            void ask(draft);
            setDraft('');
          }}
        >
          {t(locale, 'aiAsk')}
        </button>
      </div>

      {error ? (
        <p className="form-feedback form-feedback--error">
          {error === 'missing_api_key' ? t(locale, 'aiKeyMissingEnv') : error}
        </p>
      ) : null}

      <div className="ai-thread">
        {messages.length === 0 ? (
          <p className="dashboard__hint">{t(locale, 'aiEmpty')}</p>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={`ai-bubble ai-bubble--${m.role}`}>
              <header>{m.role === 'user' ? t(locale, 'aiYou') : t(locale, 'aiCoach')}</header>
              <pre>{m.content}</pre>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
