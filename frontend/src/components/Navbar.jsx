import React from 'react';

function Navbar({ user, onLogout }) {
  return (
    <nav className="bg-gradient-to-r from-indigo-800 to-purple-800 shadow-lg py-4 px-8 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg">whatsup</span>
      </div>
      <div>
        {user ? (
          <button
            onClick={onLogout}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded transition duration-300 shadow"
          >
            Logout
          </button>
        ) : null}
      </div>
    </nav>
  );
}

export default Navbar; 