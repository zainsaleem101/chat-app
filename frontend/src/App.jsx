import { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { memo } from 'react';
import Auth from './components/Auth';
import Home from './components/Home';
import Room from './components/Room';
import { useAuth } from './stores/useAuthStore';
import Navbar from './components/Navbar';

function App() {
  const { isAuthenticated, loading, initialize } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const handledAuthRef = useRef(false);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && location.pathname === '/') {
        console.log('App: User authenticated, navigating to /home from /');
        navigate('/home', { replace: true });
      } else if (!isAuthenticated && location.pathname !== '/') {
        console.log('App: User not authenticated, navigating to /');
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('App: Resetting handledAuthRef because user is not authenticated');
      handledAuthRef.current = false;
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/home" element={isAuthenticated ? <Home /> : <Auth />} />
        <Route path="/room/:roomId" element={isAuthenticated ? <Room /> : <Auth />} />
      </Routes>
    </div>
  );
}

export default memo(App);