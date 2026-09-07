import { buildInGameTips } from '@/core/coaching/engine';
import { mapRiotPosition } from '@/core/config/roles';
import { t } from '@/core/i18n/messages';
import { useCoachingStore } from '@/stores/coachingStore';
import { useGameSessionStore, useSettingsStore } from '@/stores/gameSessionStore';
import { useSessionStore } from '@/stores/sessionStore';

export function OverlayApp() {
  const locale = useSettingsStore((s) => s.locale);
  const gameState = useGameSessionStore((s) => s.gameState);
  const champSelect = useGameSessionStore((s) => s.champSelect);
  const objectives = useCoachingStore((s) => s.objectives);
  const draftAdvice = useCoachingStore((s) => s.draftAdvice);
  const session = useSessionStore((s) => s.current);

  const role = mapRiotPosition(champSelect.assignedPosition);
  const baseTips = buildInGameTips({
    role: role === 'UNKNOWN' ? (draftAdvice?.gamePlan?.role ?? 'ADC') : role,
    objectives,
    gamePlan: draftAdvice?.gamePlan ?? null,
    locale,
  });

  const tips =
    session?.active && session.nextFocus.length > 0
      ? [...session.nextFocus.slice(0, 3), ...baseTips].slice(0, 5)
      : baseTips;

  const inGame = gameState === 'IN_GAME';

  return (
    <div className="overlay">
      <p className="overlay__brand">LOL COACH</p>
      <p className="overlay__status">
        {session?.active
          ? inGame
            ? t(locale, 'sessionLiveInGame')
            : t(locale, 'sessionLive')
          : inGame
            ? gameState
            : t(locale, 'overlayReady')}
      </p>
      <ul className="overlay__tips">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <p className="overlay__hotkey">Ctrl+*</p>
    </div>
  );
}
