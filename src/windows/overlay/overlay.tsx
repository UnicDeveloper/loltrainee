import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppBootstrap } from '@/features/game-session/useGameSessionBootstrap';
import { useSettingsStore } from '@/stores/gameSessionStore';
import { OverlayApp } from './OverlayApp';
import '@/styles/overlay.css';

function OverlayRoot() {
  useAppBootstrap();
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <OverlayApp />;
}

document.body.classList.add('overlay-body');

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Overlay root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <OverlayRoot />
  </StrictMode>,
);
