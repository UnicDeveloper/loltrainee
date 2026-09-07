import { AI_COACH_ENABLED, SHOW_DEV_PANEL } from '@/core/config/app';
import { t } from '@/core/i18n/messages';
import { windowManager } from '@/core/overwolf';
import { AiCoachPanel } from '@/features/ai-coach/AiCoachPanel';
import { AnalyticsPanel } from '@/features/analytics/AnalyticsPanel';
import { ChampSelectPanel } from '@/features/champ-select/ChampSelectPanel';
import {
  formatGameStateLabel,
  formatLeagueDetected,
  getConfiguredLeagueGameId,
} from '@/features/game-session/labels';
import { PersonalAnalyticsPanel } from '@/features/personal-analytics/PersonalAnalyticsPanel';
import { SessionCoachPanel } from '@/features/session-coach/SessionCoachPanel';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { useGameSessionStore, useSettingsStore } from '@/stores/gameSessionStore';
import './dashboard.css';

export function Dashboard() {
  const locale = useSettingsStore((s) => s.locale);
  const gameState = useGameSessionStore((s) => s.gameState);
  const overwolfConnected = useGameSessionStore((s) => s.overwolfConnected);
  const gameId = useGameSessionStore((s) => s.gameId);
  const lastEvent = useGameSessionStore((s) => s.lastEvent);
  const gameRunning = useGameSessionStore((s) => s.gameRunning);
  const launcherRunning = useGameSessionStore((s) => s.launcherRunning);
  const clientPhase = useGameSessionStore((s) => s.clientPhase);

  const leagueLabel =
    formatLeagueDetected(gameState) === 'Detected'
      ? t(locale, 'detected')
      : t(locale, 'notDetected');
  const stateLabel = formatGameStateLabel(gameState);
  const overlayAvailable = gameState !== 'UNAVAILABLE' && gameState !== 'IDLE';

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__brand">LoL Coach</h1>
        <p className="dashboard__tagline">{t(locale, 'appTagline')}</p>
      </header>

      <section className="dashboard__panel" aria-labelledby="status-heading">
        <h2 id="status-heading" className="dashboard__heading">
          {t(locale, 'status')}
        </h2>

        <dl className="dashboard__stats">
          <div className="dashboard__stat">
            <dt>{t(locale, 'leagueOfLegends')}</dt>
            <dd data-tone={leagueLabel === t(locale, 'detected') ? 'ok' : 'muted'}>{leagueLabel}</dd>
          </div>
          <div className="dashboard__stat">
            <dt>{t(locale, 'gameState')}</dt>
            <dd data-tone="accent">{stateLabel}</dd>
          </div>
        </dl>
      </section>

      <section className="dashboard__panel" aria-labelledby="overlay-heading">
        <h2 id="overlay-heading" className="dashboard__heading">
          {t(locale, 'overlay')}
        </h2>
        <p className="dashboard__hint">
          {overlayAvailable ? t(locale, 'overlayHintInGame') : t(locale, 'overlayHintIdle')}
        </p>
        <div className="dashboard__actions">
          <button
            type="button"
            className="dashboard__button"
            onClick={() => {
              void windowManager.showOverlay();
            }}
          >
            {t(locale, 'showOverlay')}
          </button>
          <button
            type="button"
            className="dashboard__button dashboard__button--ghost"
            onClick={() => {
              void windowManager.hideOverlay();
            }}
          >
            {t(locale, 'hideOverlay')}
          </button>
        </div>
      </section>

      <SettingsPanel />
      <SessionCoachPanel />
      <ChampSelectPanel />
      <PersonalAnalyticsPanel />
      <AnalyticsPanel />
      {AI_COACH_ENABLED ? <AiCoachPanel /> : null}

      {SHOW_DEV_PANEL ? (
        <section className="dashboard__panel dashboard__panel--dev" aria-labelledby="dev-heading">
          <h2 id="dev-heading" className="dashboard__heading">
            {t(locale, 'development')}
          </h2>
          <ul className="dashboard__dev-list">
            <li>Overwolf: {overwolfConnected ? 'connected' : 'not connected'}</li>
            <li>League gameId (configured): {getConfiguredLeagueGameId()}</li>
            <li>League gameId (runtime): {gameId ?? '—'}</li>
            <li>Launcher running: {String(launcherRunning)}</li>
            <li>Game running: {String(gameRunning)}</li>
            <li>Client phase: {clientPhase ?? '—'}</li>
            <li>Current state: {stateLabel}</li>
            <li>Last event: {lastEvent}</li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
