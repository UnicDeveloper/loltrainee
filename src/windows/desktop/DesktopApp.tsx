import { AppProviders } from '@/app/providers/AppProviders';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { useAppBootstrap } from '@/features/game-session/useGameSessionBootstrap';

export function DesktopApp() {
  useAppBootstrap();

  return (
    <AppProviders>
      <main className="desktop-shell">
        <Dashboard />
      </main>
    </AppProviders>
  );
}
