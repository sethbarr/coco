import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { login, clearError } from '../../store/authSlice';
import { AppDispatch, RootState } from '../../store';
import '../../../src/utils/debugging'; // Import debugging utilities

const LoginPage: React.FC = () => {
  console.log("LoginPage component rendering");  // Debug log
  
  const [formData, setFormData] = useState({
    pseudonym: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dispatch = useDispatch<AppDispatch>();
  const { error, isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  // Log component mount/unmount for debugging
  useEffect(() => {
    console.log("LoginPage component mounted");
    
    // Track render in debug tools
    if (window.cocoDebug) {
      window.cocoDebug.trackRender('LoginPage');
    }
    
    dispatch(clearError());
    
    return () => {
      console.log("LoginPage component unmounted");
    };
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`Input changed: ${e.target.name} = ${e.target.value}`);  // Debug log
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Track form event in debug tools
    if (window.cocoDebug) {
      window.cocoDebug.trackFormEvent('LoginPage', 'input-change', { 
        field: e.target.name, 
        value: e.target.value 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", formData);  // Debug log
    
    // Track form event in debug tools
    if (window.cocoDebug) {
      window.cocoDebug.trackFormEvent('LoginPage', 'form-submit', formData);
    }
    
    const { pseudonym, password } = formData;
    
    if (!pseudonym || !password) {
      console.log("Missing required fields");  // Debug log
      return;
    }
    
    setIsSubmitting(true);
    console.log("Setting isSubmitting to true");  // Debug log
    
    try {
      console.log("Dispatching login action");  // Debug log
      const result = await dispatch(login({ pseudonym, password })).unwrap();
      console.log("Login action result:", result);  // Debug log
    } catch (err) {
      console.error('Login error:', err);  // Debug log
    } finally {
      console.log("Setting isSubmitting to false");  // Debug log
      setIsSubmitting(false);
    }
  };

  // Log component redirects
  if (isAuthenticated) {
    console.log("User is authenticated, redirecting to dashboard");  // Debug log
    return <Navigate to="/dashboard" />;
  }

  // Use local isSubmitting state along with Redux loading state
  const isLoading = isSubmitting || loading;
  console.log("Render state:", { isSubmitting, loading, isLoading, isAuthenticated });  // Debug log

  return (
    <div className="flex justify-center items-center mt-8">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Log In</h2>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-400 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="pseudonym">
              Username
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              type="text"
              name="pseudonym"
              id="pseudonym"
              value={formData.pseudonym}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded"
            disabled={isLoading}
            onClick={() => console.log("Login button clicked")}  // Extra debug log
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-teal-600 hover:text-teal-700">
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;