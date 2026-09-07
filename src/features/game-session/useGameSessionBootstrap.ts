import { useEffect } from 'react';
import {
  createGameDetection,
  isOverwolfAvailable,
  type GameDetectionSnapshot,
  windowManager,
} from '@/core/overwolf';
import { resolveAssignedRole, useCoachingStore } from '@/stores/coachingStore';
import { useGameSessionStore, useSettingsStore } from '@/stores/gameSessionStore';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * Boots detection + local stores. Safe across windows; cleans up listeners.
 */
export function useAppBootstrap(): void {
  const setFromDetection = useGameSessionStore((s) => s.setFromDetection);
  const setOverwolfConnected = useGameSessionStore((s) => s.setOverwolfConnected);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateCoaching = useCoachingStore((s) => s.hydrate);
  const hydrateSession = useSessionStore((s) => s.hydrate);
  const refreshDraftAdvice = useCoachingStore((s) => s.refreshDraftAdvice);
  const onLifecycleHint = useSessionStore((s) => s.onLifecycleHint);

  useEffect(() => {
    hydrateSettings();
    hydrateCoaching();
    hydrateSession();
  }, [hydrateSettings, hydrateCoaching, hydrateSession]);

  useEffect(() => {
    const connected = isOverwolfAvailable();
    setOverwolfConnected(connected);

    let lastState = '';
    let lastLifecycle = '';

    const applySnapshot = (snapshot: GameDetectionSnapshot) => {
      setFromDetection(snapshot);

      const stateKey = `${snapshot.gameState}:${snapshot.champSelect.myChampionId ?? ''}:${snapshot.champSelect.enemyChampionIds.join(',')}`;
      if (stateKey !== lastState) {
        lastState = stateKey;
        void refreshDraftAdvice({
          assignedRole: resolveAssignedRole(snapshot.champSelect.assignedPosition),
          myChampionId: snapshot.champSelect.myChampionId,
          enemyChampionIds: snapshot.champSelect.enemyChampionIds,
          enemyByRole: snapshot.champSelect.enemyByRole,
        });
      }

      if (snapshot.gameState !== lastLifecycle) {
        lastLifecycle = snapshot.gameState;
        onLifecycleHint(snapshot.gameState);
      }

      if (snapshot.gameState === 'IN_GAME') {
        void windowManager.showOverlay();
      }
    };

    const detection = createGameDetection(applySnapshot);
    void detection.start();

    return () => {
      detection.stop();
    };
  }, [setFromDetection, setOverwolfConnected, refreshDraftAdvice, onLifecycleHint]);
}
