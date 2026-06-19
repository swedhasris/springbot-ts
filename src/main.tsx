import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
 document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:#cc0000"><h2>Fatal Error</h2><p>Root element #root not found.</p></div>';
} else {
 try {
 createRoot(rootElement).render(
 <StrictMode>
 <App />
 </StrictMode>,
 );
 } catch (err: any) {
 console.error('[main.tsx] React render failed:', err);
 rootElement.innerHTML = `
 <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B141A;font-family:sans-serif;">
 <div style="background:#151B26;border-radius:12px;padding:40px;max-width:500px;text-align:center;border:1px solid #2d3748;">
 <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
 <h2 style="color:#81B532;margin:0 0 12px">Application Error</h2>
 <p style="color:#C7D1D6;margin:0 0 24px;font-size:14px">
 The application failed to start. Please try reloading the page.
 </p>
 <code style="display:block;background:#0B141A;color:#ef4444;padding:12px;border-radius:8px;font-size:12px;margin-bottom:24px;text-align:left;word-break:break-all">
 ${err?.message || 'Unknown error'}
 </code>
 <button onclick="window.location.reload()" style="background:#81B532;color:#0B141A;border:none;padding:12px 24px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">
 🔄 Reload Application
 </button>
 </div>
 </div>
 `;
 }
}
