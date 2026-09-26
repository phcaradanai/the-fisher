import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anuphan/400.css';
import '@fontsource/anuphan/500.css';
import '@fontsource/anuphan/600.css';
import '@fontsource/kanit/500.css';
import '@fontsource/kanit/600.css';
import '@fontsource/kanit/700.css';
import { App } from './app/App';
import { FishingPresentationProvider } from './app/presentation';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing application root element.');

createRoot(rootElement).render(
  <StrictMode>
    <FishingPresentationProvider>
      <App />
    </FishingPresentationProvider>
  </StrictMode>,
);
