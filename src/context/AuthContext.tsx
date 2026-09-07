'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase, Profile, UserRole, AuthSessionLike, AuthUserLike } from '../lib/supabase';
import { isModuleAllowed } from '../lib/permissions';
import { UNAUTHORIZED_EVENT } from '../lib/api';

// Auto sign-out after this many milliseconds of no mouse/keyboard/touch
// activity (resets on every mouse/keyboard/touch/scroll event via
// IDLE_EVENTS below).
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
  // Per-User Module Access: true if this account is either unrestricted
  // or explicitly granted the given module id (see src/lib/permissions.ts).
  hasModuleAccess: (moduleId: string) => boolean;
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

  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  // Session Security: a 401 from the server (expired/revoked token,
  // account disabled elsewhere) must drop the session immediately, not
  // just on the user's next click — otherwise a stale-but-rendered
  // authenticated page could sit on screen indefinitely.
  useEffect(() => {
    const onUnauthorized = () => {
      signOutRef.current();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Require login again after leaving the page: the browser's
  // Back/Forward navigation can restore this app from the back-forward
  // cache (bfcache) — the exact in-memory, already-rendered authenticated
  // screen — without re-running any of the mount logic above and without
  // contacting the server at all. `pageshow` fires on every such restore
  // with `event.persisted === true`, which is our signal to re-validate
  // the session against the server right then: if it's no longer valid
  // (logged out, expired, revoked), the resulting state flips to
  // logged-out and the login screen replaces whatever was cached on
  // screen. A still-valid session is left alone.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [loadProfile]);

  // Idle-timeout: automatically sign the user out after IDLE_TIMEOUT_MS of
  // no activity, so an unattended, logged-in session doesn't stay open.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return profile ? ['admin', 'editor'].includes(profile.role) : false;
  };

  const hasModuleAccess = (moduleId: string) => {
    if (!profile) return false;
    return isModuleAllowed(profile.permissions, moduleId);
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
        hasModuleAccess,
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
