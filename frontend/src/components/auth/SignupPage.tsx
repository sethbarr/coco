import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { register } from '../../store/authSlice';
import { RootState, AppDispatch } from '../../store';
import '../../../src/utils/debugging'; // Import debugging utilities

const SignupPage: React.FC = () => {
  console.log("SignupPage component rendering");  // Debug log
  
  const [formData, setFormData] = useState({
    pseudonym: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Shown exactly once after signup; the server only stores hashes
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  // Log component mount/unmount for debugging
  useEffect(() => {
    console.log("SignupPage component mounted");
    
    // Track render in debug tools
    if (window.cocoDebug) {
      window.cocoDebug.trackRender('SignupPage');
    }
    
    return () => {
      console.log("SignupPage component unmounted");
    };
  }, []);

  const { pseudonym, password, confirmPassword } = formData;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`Input changed: ${e.target.name} = ${e.target.value}`);  // Debug log
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Track form event in debug tools
    if (window.cocoDebug) {
      window.cocoDebug.trackFormEvent('SignupPage', 'input-change', { 
        field: e.target.name, 
        value: e.target.value 
      });
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted", formData);  // Debug log
    
    // Track form event in debug tools
    if (window.cocoDebug) {
      window.cocoDebug.trackFormEvent('SignupPage', 'form-submit', formData);
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      console.log("Passwords don't match");  // Debug log
      return;
    }
    
    setIsSubmitting(true);
    console.log("Setting isSubmitting to true");  // Debug log
    
    try {
      // Generate a dummy public key for now
      const publicKey = JSON.stringify({ key: 'dummy-key-for-development' });
      
      console.log("Dispatching register action");  // Debug log
      const result = await dispatch(register({ pseudonym, password, publicKey })).unwrap();
      if (result.recoveryCodes) {
        setRecoveryCodes(result.recoveryCodes);
      }
    } catch (err) {
      console.error('Registration error:', err);  // Debug log
      setError('Registration failed. Please try a different username.');
    } finally {
      console.log("Setting isSubmitting to false");  // Debug log
      setIsSubmitting(false);
    }
  };

  // Show recovery codes before leaving — this is the only time they exist in plaintext
  if (recoveryCodes) {
    const codesText = recoveryCodes.join('\n');
    return (
      <div className="flex justify-center items-center mt-8">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Save your recovery codes</h2>
          <p className="text-sm text-gray-600 mb-4">
            Coco accounts have no email attached, so these codes are the <strong>only</strong> way
            back in if you forget your password. Each code works once. Store them somewhere safe —
            they will not be shown again.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4 grid grid-cols-2 gap-2 font-mono text-sm text-gray-800">
            {recoveryCodes.map(code => <div key={code}>{code}</div>)}
          </div>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(codesText);
                setCodesCopied(true);
              }}
              className="flex-1 border border-teal-500 text-teal-600 hover:bg-teal-50 text-sm py-2 px-3 rounded"
            >
              {codesCopied ? 'Copied!' : 'Copy codes'}
            </button>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Coco recovery codes for "${pseudonym}"\n\n${codesText}\n`)}`}
              download="coco-recovery-codes.txt"
              className="flex-1 border border-teal-500 text-teal-600 hover:bg-teal-50 text-sm py-2 px-3 rounded text-center"
            >
              Download .txt
            </a>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded"
          >
            I've saved my codes — continue
          </button>
        </div>
      </div>
    );
  }

  // Log component redirects
  if (isAuthenticated) {
    console.log("User is authenticated, redirecting to dashboard");  // Debug log
    return <Navigate to="/dashboard" />;
  }

  // Combined loading state
  const isLoading = isSubmitting || loading;
  console.log("Render state:", { isSubmitting, loading, isLoading, isAuthenticated });  // Debug log

  return (
    <div className="flex justify-center items-center mt-8">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign Up</h2>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-400 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="pseudonym">
              Choose a Username
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              type="text"
              name="pseudonym"
              id="pseudonym"
              value={pseudonym}
              onChange={onChange}
              required
              minLength={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your username will be visible to other users. No need to use your real name.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              type="password"
              name="password"
              id="password"
              value={password}
              onChange={onChange}
              required
              minLength={8}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={confirmPassword}
              onChange={onChange}
              required
              minLength={8}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded"
            disabled={isLoading}
            onClick={() => console.log("Signup button clicked")}  // Extra debug log
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;