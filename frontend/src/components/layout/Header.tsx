import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/authSlice';

const Header: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold">
            Coco
            <span className="text-yellow-300 ml-1">Counseling</span>
          </Link>
        </div>

        <nav className="flex items-center">
          {isAuthenticated ? (
            <>
              <div className="mr-4 text-sm font-medium">
                Hello, {user?.pseudonym}
              </div>
              <Link to="/dashboard" className="mr-4 hover:text-yellow-300 transition-colors">
                Dashboard
              </Link>
              <Link to="/sessions" className="mr-4 hover:text-yellow-300 transition-colors">
                Sessions
              </Link>
              <Link to="/connections" className="mr-4 hover:text-yellow-300 transition-colors">
                Connections
              </Link>
              <button
                onClick={handleLogout}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mr-4 hover:text-yellow-300 transition-colors">
                Login
              </Link>
              <Link
                to="/register"
                className="py-2 px-4 bg-teal-700 hover:bg-teal-800 rounded-md transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;