import React, { useState } from 'react';

/**
 * A simplified test login page to diagnose form submission issues
 */
const TestLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [log, setLog] = useState<string[]>([]);

  // Add log entries with timestamps
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    setLog(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Handle username input change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    addLog(`Username changed: ${e.target.value}`);
  };

  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    addLog(`Password changed: ${e.target.value.replace(/./g, '*')}`);
  };

  // Handle normal form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    addLog(`Form submitted with username: ${username}, password: ${password.replace(/./g, '*')}`);
    alert(`Form submitted with username: ${username}, password: ${password.length} chars`);
  };

  // Handle button click (separate from form)
  const handleClick = () => {
    addLog(`Button clicked outside form with username: ${username}, password: ${password.replace(/./g, '*')}`);
    alert(`Button clicked with username: ${username}, password: ${password.length} chars`);
  };

  return (
    <div className="flex flex-col space-y-6 p-6 max-w-md mx-auto bg-white rounded-lg shadow-md mt-8">
      <h1 className="text-2xl font-bold text-center text-gray-800">Test Login Page</h1>
      <p className="text-gray-600 text-center">
        This is a diagnostic page to test form submission
      </p>

      {/* Test Form with onSubmit handler */}
      <div className="p-4 border border-gray-300 rounded-md">
        <h2 className="text-xl font-semibold mb-3">Test Form 1: onSubmit Handler</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username1" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="username1"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              className="mt-1 p-2 w-full border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="password1" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password1"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className="mt-1 p-2 w-full border border-gray-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
          >
            Submit Form
          </button>
        </form>
      </div>

      {/* Test Button with onClick handler */}
      <div className="p-4 border border-gray-300 rounded-md">
        <h2 className="text-xl font-semibold mb-3">Test Form 2: onClick Handler</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="username2" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="username2"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              className="mt-1 p-2 w-full border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="password2" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password2"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className="mt-1 p-2 w-full border border-gray-300 rounded-md"
            />
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
          >
            Click Button
          </button>
        </div>
      </div>

      {/* Event Log */}
      <div className="p-4 border border-gray-300 rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Event Log</h2>
        <div className="bg-black text-green-400 font-mono text-sm p-3 rounded h-60 overflow-y-auto">
          {log.length === 0 ? (
            <p>No events logged yet...</p>
          ) : (
            log.map((entry, index) => <div key={index}>{entry}</div>)
          )}
        </div>
      </div>
    </div>
  );
};

export default TestLoginPage;