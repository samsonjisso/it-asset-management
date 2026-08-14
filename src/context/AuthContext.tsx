"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase, Profile, UserRole, AuthSessionLike, AuthUserLike } from '../lib/supabase';

// Auto sign-out after this many milliseconds of no mouse/keyboard/touch
// activity. Bank security requirement: 1-2 minutes of inactivity.
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

interface AuthContextType {
  session: AuthSessionLike | null;
  user: AuthUserLike | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  canWrite: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSessionLike | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error);
      return;
    }
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  // Idle-timeout: automatically sign the user out after IDLE_TIMEOUT_MS of
  // no activity, so an unattended, logged-in session doesn't stay open.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    if (!session) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        signOutRef.current();
      }, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [session]);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const hasRole = (...roles: UserRole[]) => {
    return profile ? roles.includes(profile.role) : false;
  };

  const canWrite = () => {
    return profile ? ['admin', 'manager', 'register_user'].includes(profile.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile,
        hasRole,
        canWrite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
