import React, { useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store';
import api from './utils/api';
import LoginPage from './components/auth/LoginPage';
import TestLoginPage from './components/auth/TestLoginPage';
import ApiTester from './components/auth/ApiTester';
import SimpleLoginPage from './components/auth/SimpleLoginPage';
import SignupPage from './components/auth/SignupPage';
import RecoverPage from './components/auth/RecoverPage';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/chat/ChatInterface';
import ConnectionsPage from './components/connections/ConnectionsPage';
import SessionsPage from './components/sessions/SessionsPage';
import TopicsPage from './components/topics/TopicsPage';
import TopicDetailPage from './components/topics/TopicDetailPage';
import Debug from './components/Debug';
import NotificationBell from './components/layout/NotificationBell';
import { loadUser } from './store/authSlice';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUser());
    }
  }, [dispatch]);


  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) return <div className="p-4">Loading...</div>;
    if (!isAuthenticated) return <Navigate to="/login" />;
    return <>{children}</>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gray-900">Coco Counseling</Link>
          <div>
            {!isAuthenticated ? (
              <>
                <Link to="/signup" className="text-teal-600 hover:text-teal-800 mr-4">Sign Up</Link>
                <Link to="/login" className="text-teal-600 hover:text-teal-800">Log In</Link>
              </>
            ) : (
              <>
                <NotificationBell />
                <Link to="/dashboard" className="text-teal-600 hover:text-teal-800 mr-4">Dashboard</Link>
                <Link to="/topics" className="text-teal-600 hover:text-teal-800 mr-4">Topics</Link>
                <Link to="/connections" className="text-teal-600 hover:text-teal-800 mr-4">Connections</Link>
                <button 
                  className="text-teal-600 hover:text-teal-800"
                  onClick={async () => {
                    try {
                      // Call the logout API endpoint
                      await api.post('/auth/logout');
                      // Clear local storage
                      localStorage.removeItem('token');
                      localStorage.removeItem('csrfToken');
                      // Redirect to home page
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Logout failed:', error);
                      // Still clear local storage and redirect on error
                      localStorage.removeItem('token');
                      localStorage.removeItem('csrfToken');
                      window.location.href = '/';
                    }
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Welcome to Coco Counseling</h2>
              <p className="mb-6">Your supportive AI relationship counselor</p>
              {isAuthenticated ? (
                <Link 
                  to="/chat" 
                  className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded"
                >
                  Start Talking with Coco
                </Link>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded"
                >
                  Login to Start
                </Link>
              )}
            </div>
          } />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recover" element={<RecoverPage />} />
          <Route path="/test-login" element={<TestLoginPage />} />
          <Route path="/api-tester" element={<ApiTester />} />
          <Route path="/simple-login" element={<SimpleLoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatInterface />
            </ProtectedRoute>
          } />
          <Route path="/sessions/:id" element={
            <ProtectedRoute>
              <ChatInterface />
            </ProtectedRoute>
          } />
          <Route path="/sessions" element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          } />
          <Route path="/connections" element={
            <ProtectedRoute>
              <ConnectionsPage />
            </ProtectedRoute>
          } />
          <Route path="/topics" element={
            <ProtectedRoute>
              <TopicsPage />
            </ProtectedRoute>
          } />
          <Route path="/topics/:id" element={
            <ProtectedRoute>
              <TopicDetailPage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      {/* Add Debug component */}
      <Debug />
    </div>
  );
};

export default App;