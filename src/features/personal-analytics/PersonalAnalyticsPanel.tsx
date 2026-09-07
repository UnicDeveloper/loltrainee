import {
  buildPersonalAnalytics,
  type InsightItem,
} from '@/core/coaching/personalAnalytics';
import { t } from '@/core/i18n/messages';
import {
  heatFromCsPerMin,
  heatFromKda,
  heatFromWinRate,
} from '@/features/analytics/heat';
import { useCoachingStore } from '@/stores/coachingStore';
import { useSettingsStore } from '@/stores/gameSessionStore';

function insightClass(kind: InsightItem['kind']): string {
  if (kind === 'strength') return 'insight insight--strength';
  if (kind === 'weakness') return 'insight insight--weakness';
  return 'insight insight--focus';
}

export function PersonalAnalyticsPanel() {
  const locale = useSettingsStore((s) => s.locale);
  const rolePriority = useSettingsStore((s) => s.rolePriority);
  const matches = useCoachingStore((s) => s.matches);
  const pool = useCoachingStore((s) => s.pool);

  const report = buildPersonalAnalytics({
    matches,
    pool,
    rolePriority,
    locale,
  });

  if (matches.length === 0) {
    return (
      <section className="dashboard__panel" aria-labelledby="personal-heading">
        <h2 id="personal-heading" className="dashboard__heading">
          {t(locale, 'personalAnalytics')}
        </h2>
        <p className="dashboard__hint">{t(locale, 'personalAnalyticsEmpty')}</p>
      </section>
    );
  }

  return (
    <section className="dashboard__panel" aria-labelledby="personal-heading">
      <h2 id="personal-heading" className="dashboard__heading">
        {t(locale, 'personalAnalytics')}
      </h2>
      <p className="dashboard__hint">{t(locale, 'personalAnalyticsHint')}</p>

      <div className="trend-pills">
        <span className="trend-pill">
          {report.overall.label}: {report.overall.games}g
        </span>
        <span className="trend-pill" style={{ color: heatFromWinRate(report.recent10.winRate) }}>
          {report.recent10.label} WR {report.recent10.winRate}%
        </span>
        <span className="trend-pill" style={{ color: heatFromKda(report.recent10.avgKda) }}>
          KDA {report.recent10.avgKda}
        </span>
        <span
          className="trend-pill"
          style={{ color: heatFromCsPerMin(report.recent10.avgCsPerMin, rolePriority[0] ?? 'ADC') }}
        >
          CS/m {report.recent10.avgCsPerMin}
        </span>
      </div>

      <div className="delta-row">
        <span className="stat-label">{t(locale, 'vsBaseline')}</span>
        <strong>
          WR {report.baselineDelta.winRateDelta >= 0 ? '+' : ''}
          {report.baselineDelta.winRateDelta} · KDA{' '}
          {report.baselineDelta.kdaDelta >= 0 ? '+' : ''}
          {report.baselineDelta.kdaDelta} · CS/m{' '}
          {report.baselineDelta.csDelta >= 0 ? '+' : ''}
          {report.baselineDelta.csDelta}
        </strong>
      </div>

      <h3 className="subheading">{t(locale, 'insights')}</h3>
      <ul className="stack-list">
        {report.insights.map((insight) => (
          <li key={insight.text} className={insightClass(insight.kind)}>
            {insight.text}
          </li>
        ))}
      </ul>

      <h3 className="subheading">{t(locale, 'byRole')}</h3>
      <div className="table-wrap">
        <table className="data-table data-table--heat">
          <thead>
            <tr>
              <th>Role</th>
              <th>Games</th>
              <th>WR</th>
              <th>KDA</th>
              <th>CS/m</th>
              <th>Deaths</th>
            </tr>
          </thead>
          <tbody>
            {report.byRole.map((r) => (
              <tr key={r.role}>
                <td>{r.role}</td>
                <td>{r.games}</td>
                <td className="heat-cell" style={{ color: heatFromWinRate(r.winRate) }}>
                  {r.winRate}%
                </td>
                <td className="heat-cell" style={{ color: heatFromKda(r.avgKda) }}>
                  {r.avgKda}
                </td>
                <td
                  className="heat-cell"
                  style={{ color: heatFromCsPerMin(r.avgCsPerMin, r.role) }}
                >
                  {r.avgCsPerMin}
                </td>
                <td>{r.avgDeaths}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="subheading">{t(locale, 'byChampion')}</h3>
      <div className="table-wrap">
        <table className="data-table data-table--heat">
          <thead>
            <tr>
              <th>Champ</th>
              <th>Role</th>
              <th>Games</th>
              <th>WR</th>
              <th>KDA</th>
              <th>CS/m</th>
            </tr>
          </thead>
          <tbody>
            {report.byChampion.map((c) => (
              <tr key={c.championId}>
                <td>{c.championName}</td>
                <td>{c.role}</td>
                <td>{c.games}</td>
                <td className="heat-cell" style={{ color: heatFromWinRate(c.winRate) }}>
                  {c.winRate}%
                </td>
                <td className="heat-cell" style={{ color: heatFromKda(c.avgKda) }}>
                  {c.avgKda}
                </td>
                <td
                  className="heat-cell"
                  style={{ color: heatFromCsPerMin(c.avgCsPerMin, c.role) }}
                >
                  {c.avgCsPerMin}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
