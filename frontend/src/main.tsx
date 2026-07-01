import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './hooks/useAuth';
import { assertClientConfig } from './lib/config';
import './index.css';

assertClientConfig();

const appTree = (
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

createRoot(document.getElementById('root')!).render(
  import.meta.env.PROD ? appTree : <StrictMode>{appTree}</StrictMode>
);
