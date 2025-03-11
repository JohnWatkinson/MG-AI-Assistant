import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Global widget namespace
window.MGChatWidget = {
  load: function(config) {
    // Add viewport meta tag if it doesn't exist
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

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
