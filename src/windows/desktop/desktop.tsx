import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DesktopApp } from './DesktopApp';
import '@/styles/global.css';
import './desktop.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Desktop root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <DesktopApp />
  </StrictMode>,
);
