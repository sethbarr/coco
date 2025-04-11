import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * A simplified login page that doesn't rely on Redux
 */
const SimpleLoginPage: React.FC = () => {
  const [pseudonym, setPseudonym] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Base API URL
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Simple Login - Form submitted');
    
    if (!pseudonym || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Simple Login - Making API request');
      const response = await axios.post(
        `${baseUrl}/auth/login`, 
        { pseudonym, password },
        { 
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      );
      
      console.log('Simple Login - API response:', response.data);
      
      // Store tokens
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.csrfToken) {
          localStorage.setItem('csrfToken', response.data.csrfToken);
        }
        
        console.log('Simple Login - Stored tokens successfully');
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError('Login successful but no token received');
      }
    } catch (err) {
      console.error('Simple Login - Error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center mt-12">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Simple Login</h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          This is a simplified login page that bypasses Redux for troubleshooting
        </p>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pseudonym" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="pseudonym"
              type="text"
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help? Try the <a href="/api-tester" className="text-teal-600 hover:text-teal-800">API Tester</a> or <a href="/test-login" className="text-teal-600 hover:text-teal-800">Test Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoginPage;