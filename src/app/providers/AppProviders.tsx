import type { ReactNode } from 'react';

interface AppProvidersProps {
  children: ReactNode;
}

/** Placeholder for future shared providers (theme, query, etc.). */
export function AppProviders({ children }: AppProvidersProps) {
  return children;
}
