// Dev-only entry for http://127.0.0.1:5173/dev/loader-preview.html (not in the production build).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { Harness } from './Harness';
import { applyScenario, flag, startSimulation } from './scenario';

// Put the store into the requested state before the first render so the first frame is already right.
if (flag('auto')) startSimulation();
else applyScenario();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
