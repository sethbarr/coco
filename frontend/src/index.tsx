import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import store from './store';
import './utils/debugging'; // Import debugging utilities

// Log application start
console.log('Coco Counseling application starting...');
console.log('Redux store initialized:', store);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Add instructions for debugging in console
console.log('%c Coco Counseling Debugger ', 'background: #14b8a6; color: white; padding: 4px; border-radius: 4px;');
console.log('Type window.cocoDebug.diagnose() in the console to run diagnostics');
