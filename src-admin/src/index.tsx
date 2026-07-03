import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

window.adapterName = 'agent-dvr';
window.sentryDSN = '';

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<App />);
}
