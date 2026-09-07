import { t } from '@/core/i18n/messages';
import {
  heatFromCsPerMin,
  heatFromKda,
  heatFromWinRate,
} from '@/features/analytics/heat';
import { useCoachingStore } from '@/stores/coachingStore';
import { useGameSessionStore, useSettingsStore } from '@/stores/gameSessionStore';

export function ChampSelectPanel() {
  const locale = useSettingsStore((s) => s.locale);
  const rolePriority = useSettingsStore((s) => s.rolePriority);
  const gameState = useGameSessionStore((s) => s.gameState);
  const draftAdvice = useCoachingStore((s) => s.draftAdvice);
  const draftCallAdvice = useCoachingStore((s) => s.draftCallAdvice);
  const pool = useCoachingStore((s) => s.pool);

  const inChampSelect = gameState === 'CHAMP_SELECT';
  const recommended = draftAdvice?.recommended?.length ? draftAdvice.recommended : pool.slice(0, 8);
  const callRoles = draftCallAdvice?.callRoles.roles ?? rolePriority.slice(0, 2);

  return (
    <section className="dashboard__panel" aria-labelledby="champ-select-heading">
      <h2 id="champ-select-heading" className="dashboard__heading">
        {t(locale, 'champSelect')}
      </h2>

      <div className="call-roles">
        <h3 className="subheading">{t(locale, 'callRoles')}</h3>
        <p className="dashboard__hint">
          {draftCallAdvice?.callRoles.blurb ?? t(locale, 'callRolesHint')}
        </p>
        <div className="call-roles__chips">
          {callRoles.map((role, index) => (
            <span key={role} className="call-role-chip">
              <em>{index + 1}</em>
              {role}
            </span>
          ))}
        </div>
      </div>

      {!inChampSelect && !recommended.length ? (
        <p className="dashboard__hint">{t(locale, 'noChampSelect')}</p>
      ) : null}

      {inChampSelect || (draftCallAdvice?.rivals.length ?? 0) > 0 ? (
        <div className="rivals-block">
          <h3 className="subheading">{t(locale, 'draftRivals')}</h3>
          {draftCallAdvice?.botLaneNote ? (
            <p className="dashboard__hint">{draftCallAdvice.botLaneNote}</p>
          ) : null}
          {(draftCallAdvice?.rivals.length ?? 0) === 0 ? (
            <p className="dashboard__hint">{t(locale, 'waitingRivals')}</p>
          ) : (
            <ul className="chip-list">
              {draftCallAdvice?.rivals.map((rival) => (
                <li key={rival.championId} className="chip">
                  <strong>{rival.championName}</strong>
                  <span>{rival.role ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {(draftCallAdvice?.rivalBlocks.length ?? 0) > 0 ? (
        <div className="rival-answers">
          <h3 className="subheading">{t(locale, 'pickAnswers')}</h3>
          {draftCallAdvice?.rivalBlocks.map((block) => (
            <div key={block.rival.championId} className="rival-card">
              <p>
                <strong>
                  vs {block.rival.championName}
                  {block.rival.role ? ` (${block.rival.role})` : ''}
                </strong>
              </p>
              <p className="muted">{block.summary}</p>
              <ul className="stack-list">
                {block.suggestions.map((s) => (
                  <li key={`${block.rival.championId}-${s.championId}`} className="pick-row">
                    <div>
                      <strong>{s.championName}</strong>
                      <span className="muted">
                        {' '}
                        · {s.role} ·{' '}
                        <span style={{ color: heatFromWinRate(s.winRate) }}>
                          WR {s.winRate}%
                        </span>{' '}
                        ({s.games})
                        {s.personalWrVsRival !== null
                          ? ` · vs rival ${s.personalWrVsRival}% (${s.personalGamesVsRival})`
                          : ''}
                      </span>
                    </div>
                    <span className="counter-badge" data-counter={s.counterLabel}>
                      {s.counterLabelText}
                    </span>
                    <ul className="reason-list">
                      {s.reasons.map((r) => (
                        <li key={r} className="muted">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      <div className="split-grid">
        <div>
          <h3 className="subheading">{t(locale, 'recommendedPool')}</h3>
          <ul className="chip-list">
            {recommended.map((champ) => (
              <li key={champ.championId} className="chip chip--stats">
                <strong>{champ.championName}</strong>
                <span className="chip-meta">
                  <span className="chip-role">{champ.role}</span>
                  <span className="heat-stat" style={{ color: heatFromWinRate(champ.winRate) }}>
                    WR {champ.winRate}%
                  </span>
                  <span className="heat-stat" style={{ color: heatFromKda(champ.avgKda) }}>
                    KDA {champ.avgKda}
                  </span>
                  <span
                    className="heat-stat"
                    style={{ color: heatFromCsPerMin(champ.avgCsPerMin, champ.role) }}
                  >
                    CS/m {champ.avgCsPerMin}
                  </span>
                </span>
              </li>
            ))}
            {recommended.length === 0 ? <li className="dashboard__hint">—</li> : null}
          </ul>
        </div>

        <div>
          <h3 className="subheading">{t(locale, 'matchups')}</h3>
          <ul className="stack-list">
            {(draftAdvice?.matchups ?? []).map((m) => (
              <li key={m.enemyChampionId}>
                <strong>vs {m.enemyChampionName}</strong>
                <p>{m.summary}</p>
                <p className="muted">{m.focus}</p>
              </li>
            ))}
            {(draftAdvice?.matchups?.length ?? 0) === 0 ? (
              <li className="dashboard__hint">—</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="plan-block">
        <h3 className="subheading">{t(locale, 'gamePlan')}</h3>
        {draftAdvice?.gamePlan ? (
          <>
            <p>
              <strong>
                {draftAdvice.gamePlan.championName} · {draftAdvice.gamePlan.role}
              </strong>
            </p>
            <ol>
              {draftAdvice.gamePlan.priorities.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <ul className="stack-list">
              {draftAdvice.gamePlan.contextualTips.map((tip) => (
                <li key={tip} className="muted">
                  {tip}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="dashboard__hint">—</p>
        )}
      </div>
    </section>
  );
}
