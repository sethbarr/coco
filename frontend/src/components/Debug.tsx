import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Debug component that provides navigation to test pages and tools
 */
const Debug: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Get stored tokens
  const token = localStorage.getItem('token');
  const csrfToken = localStorage.getItem('csrfToken');

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 focus:outline-none"
        title="Debug Tools"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Debug panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-4 w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Debug Tools</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-2">Authentication Test Pages:</div>
            <Link
              to="/login"
              className="block px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Regular Login
            </Link>
            <Link
              to="/simple-login"
              className="block px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Simple Login
            </Link>
            <Link
              to="/test-login"
              className="block px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Test Login Form
            </Link>
            <Link
              to="/api-tester"
              className="block px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              API Tester
            </Link>
            
            <div className="text-sm text-gray-600 mt-4 mb-2">Auth Status:</div>
            <div className="bg-gray-100 p-2 rounded">
              <div className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">JWT Token:</span>
                  <span className={token ? "text-green-600" : "text-red-600"}>
                    {token ? "Present" : "Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">CSRF Token:</span>
                  <span className={csrfToken ? "text-green-600" : "text-red-600"}>
                    {csrfToken ? "Present" : "Missing"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('csrfToken');
                  window.location.reload();
                }}
                className="w-full px-4 py-2 text-sm text-red-700 bg-red-100 hover:bg-red-200 rounded"
              >
                Clear Auth Tokens
              </button>
            </div>
            
            <div className="pt-2">
              <button
                onClick={() => {
                  console.log('Running window.cocoDebug.diagnose()');
                  if (window.cocoDebug) {
                    window.cocoDebug.diagnose();
                  } else {
                    console.log('Debug utilities not available');
                  }
                }}
                className="w-full px-4 py-2 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
              >
                Run Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debug;