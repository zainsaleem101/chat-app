import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { useSocketStore } from './useSocketStore';

const getInitialSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const useAuthStore = create((set, get) => ({
  session: null,
  loading: true,
  user: null,
  username: null,
  accessToken: null,
  isAuthenticated: false,

  // Initialize session and listen for changes
  initialize: async () => {
    set({ loading: true });
    const session = await getInitialSession();
    set({
      session,
      loading: false,
      user: session?.user || null,
      username: session?.user?.email?.split('@')[0] || null,
      accessToken: session?.access_token || null,
      isAuthenticated: !!session?.user?.email_confirmed_at,
    });
    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        loading: false,
        user: session?.user || null,
        username: session?.user?.email?.split('@')[0] || null,
        accessToken: session?.access_token || null,
        isAuthenticated: !!session?.user?.email_confirmed_at,
      });
    });
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user.email_confirmed_at) {
      throw new Error('Please verify your email before logging in.');
    }
    set({
      session: data.session,
      user: data.user,
      username: data.user?.email?.split('@')[0] || null,
      accessToken: data.session?.access_token || null,
      isAuthenticated: !!data.user.email_confirmed_at,
    });
    return data;
  },

  signup: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    set({
      session: data.session,
      user: data.user,
      username: data.user?.email?.split('@')[0] || null,
      accessToken: data.session?.access_token || null,
      isAuthenticated: false,
    });
    return data.user;
  },

  logout: async () => {
    await supabase.auth.signOut();
    useSocketStore.getState().disconnect();
    set({
      session: null,
      user: null,
      username: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));

// Custom hook to mimic useAuth API
export const useAuth = () => {
  const {
    session,
    loading,
    user,
    username,
    accessToken,
    isAuthenticated,
    login,
    signup,
    logout,
    initialize,
  } = useAuthStore();
  return {
    session,
    loading,
    user,
    username,
    accessToken,
    isAuthenticated,
    login,
    signup,
    logout,
    initialize,
  };
};
