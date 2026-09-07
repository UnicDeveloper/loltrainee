import { useState } from 'react';
import { computeTrends } from '@/core/coaching/analytics';
import { t } from '@/core/i18n/messages';
import {
  heatFromCs,
  heatFromCsPerMin,
  heatFromKda,
  kdaRatio,
  resultTone,
} from '@/features/analytics/heat';
import { useCoachingStore } from '@/stores/coachingStore';
import { useSettingsStore } from '@/stores/gameSessionStore';

export function AnalyticsPanel() {
  const locale = useSettingsStore((s) => s.locale);
  const matches = useCoachingStore((s) => s.matches);
  const objectives = useCoachingStore((s) => s.objectives);
  const addObjective = useCoachingStore((s) => s.addObjective);
  const removeObjective = useCoachingStore((s) => s.removeObjective);
  const [draft, setDraft] = useState('');

  const trends = computeTrends(matches);
  const recent = matches.slice(0, 12);

  return (
    <section className="dashboard__panel" aria-labelledby="analytics-heading">
      <h2 id="analytics-heading" className="dashboard__heading">
        {t(locale, 'analytics')}
      </h2>

      <div className="stat-row">
        <div>
          <span className="stat-label">{t(locale, 'trends')}</span>
          <div className="trend-pills">
            <span className="trend-pill">{trends.games} games</span>
            <span
              className="trend-pill"
              style={{ color: heatFromKda(trends.winRate / 25) }}
            >
              WR {trends.winRate}%
            </span>
            <span className="trend-pill" style={{ color: heatFromKda(trends.avgKda) }}>
              KDA {trends.avgKda}
            </span>
            <span
              className="trend-pill"
              style={{ color: heatFromCsPerMin(trends.avgCsPerMin, 'ADC') }}
            >
              CS/m {trends.avgCsPerMin}
            </span>
          </div>
        </div>
      </div>

      <h3 className="subheading">{t(locale, 'objectives')}</h3>
      <div className="dashboard__actions">
        <input
          className="inline-input"
          value={draft}
          placeholder={t(locale, 'objectivePlaceholder')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addObjective(draft);
              setDraft('');
            }
          }}
        />
        <button
          type="button"
          className="dashboard__button dashboard__button--ghost"
          onClick={() => {
            addObjective(draft);
            setDraft('');
          }}
        >
          {t(locale, 'addObjective')}
        </button>
      </div>
      <ul className="stack-list">
        {objectives.map((obj, index) => (
          <li key={`${obj}-${index}`} className="objective-row">
            <span>{obj}</span>
            <button type="button" className="linkish" onClick={() => removeObjective(index)}>
              ×
            </button>
          </li>
        ))}
      </ul>

      <h3 className="subheading">{t(locale, 'recentMatches')}</h3>
      {recent.length === 0 ? (
        <p className="dashboard__hint">{t(locale, 'noMatches')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table data-table--heat">
            <thead>
              <tr>
                <th>Champ</th>
                <th>Role</th>
                <th>KDA</th>
                <th>CS</th>
                <th>CS/m</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => {
                const ratio = kdaRatio(m.kills, m.deaths, m.assists);
                return (
                  <tr key={m.matchId}>
                    <td>{m.championName}</td>
                    <td>{m.role}</td>
                    <td className="heat-cell" style={{ color: heatFromKda(ratio) }}>
                      <span className="heat-value">
                        {m.kills}/{m.deaths}/{m.assists}
                      </span>
                      <span className="heat-sub">{ratio.toFixed(2)}</span>
                    </td>
                    <td className="heat-cell" style={{ color: heatFromCs(m.cs, m.role) }}>
                      {m.cs}
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
          <p className="heat-legend">
            <span className="heat-legend__swatch heat-legend__swatch--bad" />
            low
            <span className="heat-legend__swatch heat-legend__swatch--mid" />
            ok
            <span className="heat-legend__swatch heat-legend__swatch--good" />
            good
            <span className="heat-legend__swatch heat-legend__swatch--elite" />
            elite
          </p>
        </div>
      )}
    </section>
  );
}
