import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const PasswordResetRequest: React.FC = () => {
  const [pseudonym, setPseudonym] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pseudonym.trim()) {
      setError('Please enter your pseudonym');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // In a real implementation, this would call the API to request a password reset
      // For demo purposes, we're just simulating a successful request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-green-500 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-3xl font-bold text-gray-800">Check Your Recovery Email</h2>
            <p className="text-gray-600 mt-2">
              If an account exists with the pseudonym {pseudonym}, we've sent instructions to the recovery email associated with that account.
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Reset Your Password</h2>
          <p className="text-gray-600 mt-2">
            Enter your pseudonym and we'll send instructions to your recovery email
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="pseudonym" className="block text-sm font-medium text-gray-700 mb-1">
              Pseudonym
            </label>
            <input
              type="text"
              name="pseudonym"
              id="pseudonym"
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              placeholder="Enter your pseudonym"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600'
              } text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500`}
            >
              {isLoading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;