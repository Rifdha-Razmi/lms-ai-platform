import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { env } from '@/utils/env';
import '@/i18n';
import '@/styles/index.css';

async function bootstrap() {
  // Start the in-browser mock API before the first request (dev/demo only).
  if (env.useMocks) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
