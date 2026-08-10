import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { OnboardingGate } from './components/OnboardingGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OnboardingGate>
      <App />
    </OnboardingGate>
  </StrictMode>,
);
