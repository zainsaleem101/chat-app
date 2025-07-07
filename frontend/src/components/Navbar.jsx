import React from 'react';
import { useAuth } from '../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-gradient-to-r from-indigo-800 to-purple-800 shadow-lg py-4 px-8 flex items-center justify-between">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/home')}>
        <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg">we-connect</span>
      </div>
      <div className="flex items-center space-x-4">
        {user ? (
          <button
            onClick={logout}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded transition duration-300 shadow"
          >
            Logout
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded transition duration-300 shadow"
            >
              Login
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar; 