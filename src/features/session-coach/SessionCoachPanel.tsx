import { t } from '@/core/i18n/messages';
import {
  heatFromCsPerMin,
  heatFromKda,
  kdaRatio,
  resultTone,
} from '@/features/analytics/heat';
import { useCoachingStore } from '@/stores/coachingStore';
import { useSettingsStore } from '@/stores/gameSessionStore';
import { useSessionStore } from '@/stores/sessionStore';

function statusLabel(
  locale: 'en' | 'es',
  status: 'pending' | 'hit' | 'miss' | 'unknown',
): string {
  switch (status) {
    case 'hit':
      return t(locale, 'objectiveHit');
    case 'miss':
      return t(locale, 'objectiveMiss');
    case 'unknown':
      return t(locale, 'objectiveUnknown');
    default:
      return t(locale, 'objectivePending');
  }
}

export function SessionCoachPanel() {
  const locale = useSettingsStore((s) => s.locale);
  const current = useSessionStore((s) => s.current);
  const history = useSessionStore((s) => s.history);
  const startSession = useSessionStore((s) => s.startSession);
  const endSession = useSessionStore((s) => s.endSession);
  const refreshFromMatches = useSessionStore((s) => s.refreshFromMatches);
  const getSessionMatches = useSessionStore((s) => s.getSessionMatches);
  const getStats = useSessionStore((s) => s.getStats);

  const matches = useCoachingStore((s) => s.matches);
  const syncFromRiot = useCoachingStore((s) => s.syncFromRiot);
  const syncStatus = useCoachingStore((s) => s.syncStatus);

  const stats = getStats(matches);
  const sessionMatches = getSessionMatches(matches);
  const recentHistory = history.slice(0, 3);

  return (
    <section className="dashboard__panel" aria-labelledby="session-heading">
      <h2 id="session-heading" className="dashboard__heading">
        {t(locale, 'sessionCoach')}
      </h2>
      <p className="dashboard__hint">{t(locale, 'sessionCoachHint')}</p>

      <div className="dashboard__actions">
        {!current?.active ? (
          <button type="button" className="dashboard__button" onClick={() => startSession()}>
            {t(locale, 'startSession')}
          </button>
        ) : (
          <button
            type="button"
            className="dashboard__button dashboard__button--ghost"
            onClick={() => endSession()}
          >
            {t(locale, 'endSession')}
          </button>
        )}
        <button
          type="button"
          className="dashboard__button dashboard__button--ghost"
          disabled={!current?.active || syncStatus === 'syncing'}
          onClick={() => {
            void (async () => {
              await syncFromRiot();
              refreshFromMatches();
            })();
          }}
        >
          {syncStatus === 'syncing' ? t(locale, 'syncing') : t(locale, 'refreshSession')}
        </button>
      </div>

      {!current?.active ? (
        <p className="dashboard__hint">{t(locale, 'noActiveSession')}</p>
      ) : (
        <>
          <div className="stat-row">
            <div>
              <span className="stat-label">{t(locale, 'sessionStats')}</span>
              <strong>
                {stats.games} {t(locale, 'games')} · {stats.wins}W/{stats.losses}L · WR{' '}
                {stats.winRate}% · KDA {stats.avgKda} · CS/m {stats.avgCsPerMin}
              </strong>
            </div>
            <p className="muted">
              {t(locale, 'sessionStarted')}: {new Date(current.startedAt).toLocaleString(locale)}
            </p>
          </div>

          <h3 className="subheading">{t(locale, 'nextFocus')}</h3>
          <ul className="stack-list">
            {current.nextFocus.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>

          <h3 className="subheading">{t(locale, 'sessionObjectives')}</h3>
          <ul className="stack-list">
            {current.objectiveProgress.length === 0 ? (
              <li className="dashboard__hint">{t(locale, 'noSessionObjectives')}</li>
            ) : (
              current.objectiveProgress.map((obj) => (
                <li key={obj.text} className="objective-row">
                  <span>
                    <strong data-tone={obj.status === 'hit' ? 'ok' : undefined}>
                      [{statusLabel(locale, obj.status)}]
                    </strong>{' '}
                    {obj.text}
                    {obj.note ? <span className="muted"> — {obj.note}</span> : null}
                  </span>
                </li>
              ))
            )}
          </ul>

          <h3 className="subheading">{t(locale, 'sessionSummary')}</h3>
          <ul className="stack-list">
            {current.summaryNotes.map((note) => (
              <li key={note} className="muted">
                {note}
              </li>
            ))}
          </ul>

          <h3 className="subheading">{t(locale, 'sessionGames')}</h3>
          {sessionMatches.length === 0 ? (
            <p className="dashboard__hint">{t(locale, 'noSessionGames')}</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Champ</th>
                    <th>Role</th>
                    <th>KDA</th>
                    <th>CS/m</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionMatches.slice(0, 10).map((m) => {
                    const ratio = kdaRatio(m.kills, m.deaths, m.assists);
                    return (
                      <tr key={m.matchId}>
                        <td>{m.championName}</td>
                        <td>{m.role}</td>
                        <td className="heat-cell" style={{ color: heatFromKda(ratio) }}>
                          {m.kills}/{m.deaths}/{m.assists}
                        </td>
                        <td
                          className="heat-cell heat-cell--strong"
                          style={{ color: heatFromCsPerMin(m.csPerMin, m.role) }}
                        >
                          {m.csPerMin}
                        </td>
                        <td data-result={resultTone(m.win)}>
                          {m.win ? t(locale, 'win') : t(locale, 'loss')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {recentHistory.length > 0 ? (
        <>
          <h3 className="subheading">{t(locale, 'recentSessions')}</h3>
          <ul className="stack-list">
            {recentHistory.map((s) => (
              <li key={s.id} className="muted">
                {new Date(s.startedAt).toLocaleString(locale)} · {s.matchIds.length}{' '}
                {t(locale, 'games')}
                {s.summaryNotes[0] ? ` · ${s.summaryNotes[0]}` : ''}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
