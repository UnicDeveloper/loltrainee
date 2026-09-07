import { useState } from 'react';
import {
  ALL_COACH_ROLES,
  formatRolePriorityLabel,
  MAX_ROLE_PRIORITY,
  MIN_ROLE_PRIORITY,
  type SelectableCoachRole,
} from '@/core/config/roles';
import { hasRiotApiKey } from '@/core/config/env';
import { t } from '@/core/i18n/messages';
import { useCoachingStore } from '@/stores/coachingStore';
import { useSettingsStore } from '@/stores/gameSessionStore';
import { useSessionStore } from '@/stores/sessionStore';

export function SettingsPanel() {
  const locale = useSettingsStore((s) => s.locale);
  const riotId = useSettingsStore((s) => s.riotId);
  const rolePriority = useSettingsStore((s) => s.rolePriority);
  const setRiotId = useSettingsStore((s) => s.setRiotId);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const toggleRolePriority = useSettingsStore((s) => s.toggleRolePriority);
  const persist = useSettingsStore((s) => s.persist);

  const syncFromRiot = useCoachingStore((s) => s.syncFromRiot);
  const refreshDraftAdvice = useCoachingStore((s) => s.refreshDraftAdvice);
  const refreshSession = useSessionStore((s) => s.refreshFromMatches);
  const syncStatus = useCoachingStore((s) => s.syncStatus);
  const syncError = useCoachingStore((s) => s.syncError);
  const lastSyncedAt = useCoachingStore((s) => s.lastSyncedAt);

  const [savedFlash, setSavedFlash] = useState(false);
  const apiKeyConfigured = hasRiotApiKey();

  const onToggleRole = (role: SelectableCoachRole) => {
    toggleRolePriority(role);
  };

  return (
    <section className="dashboard__panel" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="dashboard__heading">
        {t(locale, 'settings')}
      </h2>

      <div className="form-grid">
        <label className="form-field">
          <span>{t(locale, 'riotId')}</span>
          <input
            type="text"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder={t(locale, 'riotIdPlaceholder')}
          />
        </label>

        <label className="form-field">
          <span>{t(locale, 'locale')}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value === 'es' ? 'es' : 'en')}
          >
            <option value="en">{t(locale, 'english')}</option>
            <option value="es">{t(locale, 'spanish')}</option>
          </select>
        </label>

        <fieldset className="form-field role-priority">
          <legend>{t(locale, 'rolePrioritySelect')}</legend>
          <p className="dashboard__hint">
            {t(locale, 'rolePriorityHint')} ({MIN_ROLE_PRIORITY}–{MAX_ROLE_PRIORITY})
          </p>
          <div className="role-priority__options">
            {ALL_COACH_ROLES.map((role) => {
              const selected = rolePriority.includes(role);
              const order = rolePriority.indexOf(role);
              const disableAdd = !selected && rolePriority.length >= MAX_ROLE_PRIORITY;
              const disableRemove = selected && rolePriority.length <= MIN_ROLE_PRIORITY;

              return (
                <label key={role} className={`role-chip ${selected ? 'is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disableAdd || disableRemove}
                    onChange={() => onToggleRole(role)}
                  />
                  <span>
                    {role}
                    {selected ? ` · ${order + 1}` : ''}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="muted">
            {t(locale, 'rolePriorityActive')}: {formatRolePriorityLabel(rolePriority)}
          </p>
        </fieldset>

        <p className={`form-feedback ${apiKeyConfigured ? '' : 'form-feedback--error'}`}>
          {apiKeyConfigured ? t(locale, 'apiKeyFromEnv') : t(locale, 'apiKeyMissingEnv')}
        </p>
      </div>

      <div className="dashboard__actions">
        <button
          type="button"
          className="dashboard__button"
          onClick={() => {
            persist();
            void refreshDraftAdvice();
            setSavedFlash(true);
            window.setTimeout(() => setSavedFlash(false), 1600);
          }}
        >
          {t(locale, 'saveSettings')}
        </button>
        <button
          type="button"
          className="dashboard__button dashboard__button--ghost"
          disabled={syncStatus === 'syncing'}
          onClick={() => {
            void (async () => {
              await syncFromRiot();
              refreshSession();
            })();
          }}
        >
          {syncStatus === 'syncing' ? t(locale, 'syncing') : t(locale, 'syncPool')}
        </button>
      </div>

      {savedFlash ? <p className="form-feedback">{t(locale, 'settingsSaved')}</p> : null}
      {syncStatus === 'error' ? (
        <p className="form-feedback form-feedback--error">
          {syncError === 'missing_credentials'
            ? t(locale, 'missingCredentials')
            : syncError === 'missing_api_key'
              ? t(locale, 'apiKeyMissingEnv')
              : syncError}
        </p>
      ) : null}
      {syncStatus === 'ok' && lastSyncedAt ? (
        <p className="form-feedback">
          OK — {new Date(lastSyncedAt).toLocaleString(locale === 'es' ? 'es' : 'en')}
        </p>
      ) : null}
    </section>
  );
}
