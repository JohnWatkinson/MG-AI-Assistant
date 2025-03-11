import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Global widget namespace
window.MGChatWidget = {
  load: function(config) {
    // Create container if it doesn't exist
    let container = document.getElementById('mg-chatbot-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mg-chatbot-root';
      document.body.appendChild(container);
    }

    // Create React root and render app
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
};
