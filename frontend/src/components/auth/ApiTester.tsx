import React, { useState } from 'react';
import axios from 'axios';

/**
 * A component to test API endpoints directly
 */
const ApiTester: React.FC = () => {
  const [endpoint, setEndpoint] = useState('/auth/login');
  const [method, setMethod] = useState('POST');
  const [requestBody, setRequestBody] = useState(JSON.stringify({
    pseudonym: 'test_user',
    password: 'password123'
  }, null, 2));
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Base API URL
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    setError('');

    try {
      let requestData;
      try {
        requestData = JSON.parse(requestBody);
      } catch (err) {
        throw new Error('Invalid JSON in request body');
      }

      // Make the API request
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      };

      // Add auth header if token exists
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['x-auth-token'] = token;
      }

      // Add CSRF token if exists
      const csrfToken = localStorage.getItem('csrfToken');
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }

      let result;
      if (method === 'GET') {
        result = await axios.get(`${baseUrl}${endpoint}`, config);
      } else if (method === 'POST') {
        result = await axios.post(`${baseUrl}${endpoint}`, requestData, config);
      } else if (method === 'PUT') {
        result = await axios.put(`${baseUrl}${endpoint}`, requestData, config);
      } else if (method === 'DELETE') {
        result = await axios.delete(`${baseUrl}${endpoint}`, config);
      }

      setResponse(JSON.stringify(result?.data, null, 2));
      console.log('API Response:', result);
      
      // If login/register response has token, store it
      if (result?.data?.token) {
        localStorage.setItem('token', result.data.token);
        if (result.data.csrfToken) {
          localStorage.setItem('csrfToken', result.data.csrfToken);
        }
        console.log('Stored token in localStorage');
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message + (err.response ? `: ${JSON.stringify(err.response.data)}` : ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h1 className="text-2xl font-bold mb-6">API Endpoint Tester</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-4">
          <div className="w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>
          
          <div className="w-3/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-200 text-gray-600 border border-r-0 border-gray-300 rounded-l-md">
                {baseUrl}
              </span>
              <input
                type="text"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Request Body (JSON)</label>
          <textarea
            value={requestBody}
            onChange={e => setRequestBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Response</h2>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {response ? (
          <pre className="bg-gray-800 text-green-400 p-4 rounded-md overflow-x-auto font-mono text-sm">
            {response}
          </pre>
        ) : (
          <div className="bg-gray-100 p-4 rounded-md text-gray-500 text-center">
            {loading ? 'Waiting for response...' : 'No response yet. Send a request to see results.'}
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Auth Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-100 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-1">JWT Token</h3>
            <div className="bg-white p-2 rounded border border-gray-300 text-xs font-mono h-20 overflow-auto">
              {localStorage.getItem('token') || 'No token stored'}
            </div>
          </div>
          <div className="bg-gray-100 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-1">CSRF Token</h3>
            <div className="bg-white p-2 rounded border border-gray-300 text-xs font-mono h-20 overflow-auto">
              {localStorage.getItem('csrfToken') || 'No CSRF token stored'}
            </div>
          </div>
        </div>
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('csrfToken');
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear Tokens
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiTester;