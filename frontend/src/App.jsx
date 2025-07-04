import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { memo } from 'react';
import Auth from './components/Auth';
import Home from './components/Home';
import Room from './components/Room';
import { supabase } from './utils/supabase';
import { disconnectSocket } from './utils/socket';

function App() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const handledAuthRef = useRef(false);

  useEffect(() => {
    console.log('App: Checking initial session, current path:', location.pathname);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email_confirmed_at) {
        console.log('App: Initial session found, user:', session.user.id, 'token:', session.access_token);
        setSession(session);
        if (location.pathname === '/') {
          console.log('App: Navigating to /home from /');
          navigate('/home', { replace: true });
        }
      }
    });
  }, [navigate, location.pathname]);

  useEffect(() => {
    console.log('App: Setting up auth listener');
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('App: Auth event:', event, 'Session user:', session?.user?.id, 'Token:', session?.access_token);
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at && !handledAuthRef.current) {
        console.log('App: User signed in, navigating to /home');
        handledAuthRef.current = true;
        setSession(session);
        navigate('/home', { replace: true });
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('App: User signed out or deleted, navigating to /');
        setSession(null);
        disconnectSocket();
        navigate('/', { replace: true });
        handledAuthRef.current = false;
      }
    });

    return () => {
      console.log('App: Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!session) {
      console.log('App: Resetting handledAuthRef because session is null');
      handledAuthRef.current = false;
    }
  }, [session]);

  const handleLogin = useCallback(async (email, password) => {
    console.log('App: Attempting login with:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('App: Login error:', error);
      throw error;
    }
    if (!data.user.email_confirmed_at) {
      throw new Error('Please verify your email before logging in.');
    }
  }, []);

  const handleSignup = useCallback(async (email, password) => {
    console.log('App: Attempting signup with:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('App: Signup error:', error);
      throw error;
    }
    return data.user;
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('App: Logging out...');
    await supabase.auth.signOut();
    disconnectSocket();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
      <Routes>
        <Route path="/" element={<Auth onLogin={handleLogin} onSignup={handleSignup} />} />
        <Route path="/home" element={session ? <Home session={session} onLogout={handleLogout} /> : <Auth onLogin={handleLogin} onSignup={handleSignup} />} />
        <Route path="/room/:roomId" element={session ? <Room session={session} onLogout={handleLogout} /> : <Auth onLogin={handleLogin} onSignup={handleSignup} />} />
      </Routes>
    </div>
  );
}

export default memo(App);