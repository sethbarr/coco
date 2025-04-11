/**
 * Debugging utility for Coco Counseling
 * Add this to help troubleshoot issues with event handlers and component rendering
 */

// Create a global debugging object that will be accessible in the browser console
declare global {
  interface Window {
    cocoDebug: any;
  }
}

// Set up the debug object
const setupDebugger = () => {
  window.cocoDebug = {
    // Store debug events
    events: [] as any[],
    
    // Track when components render
    trackRender: (componentName: string) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Rendered: ${componentName}`);
      window.cocoDebug.events.push({ type: 'render', component: componentName, timestamp });
    },
    
    // Track form events
    trackFormEvent: (componentName: string, eventType: string, formData: any) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Form Event in ${componentName}: ${eventType}`, formData);
      window.cocoDebug.events.push({ type: 'formEvent', component: componentName, eventType, formData, timestamp });
    },
    
    // Track API calls
    trackApiCall: (endpoint: string, method: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] API Call: ${method} ${endpoint}`, data);
      window.cocoDebug.events.push({ type: 'apiCall', endpoint, method, data, timestamp });
    },
    
    // Track Redux actions
    trackReduxAction: (action: any) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Redux Action:`, action);
      window.cocoDebug.events.push({ type: 'reduxAction', action, timestamp });
    },
    
    // Check for common issues
    diagnose: () => {
      console.log('Running diagnostics...');
      
      // Check if there are any event handlers attached to the login form
      const loginForm = document.querySelector('form');
      if (loginForm) {
        console.log('Login form found. Checking event listeners...');
        // Unfortunately we can't directly check event listeners
        console.log('Try submitting the form with these values:');
        console.log('Username: test_user');
        console.log('Password: test_password');
      } else {
        console.log('Login form not found in DOM.');
      }
      
      // Check localStorage for tokens
      const token = localStorage.getItem('token');
      const csrfToken = localStorage.getItem('csrfToken');
      console.log('Token exists in localStorage:', !!token);
      console.log('CSRF token exists in localStorage:', !!csrfToken);
      
      // Check Redux state
      console.log('Checking Redux state (if Redux DevTools is installed)');
      console.log('Try typing this in console: $r.store.getState()');
    },
    
    // Clear debug events
    clear: () => {
      window.cocoDebug.events = [];
      console.log('Debug events cleared');
    }
  };
  
  console.log('Coco debug utilities initialized. Type window.cocoDebug.diagnose() to run diagnostics.');
};

// Initialize the debugger when this module is imported
setupDebugger();

export default setupDebugger;