import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isOfflineMode: boolean;
}

const OFFLINE_AUTH_KEY = 'payment_tracker_offline_auth';

/**
 * Signs in with Google OAuth via Supabase.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.' };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }

    localStorage.removeItem(OFFLINE_AUTH_KEY);
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Google sign-in failed' };
  }
}

/**
 * Signs in with email and password using Supabase backend auth.users table.
 */
export async function signInWithSupabase(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    // If Supabase not configured, allow local offline access
    localStorage.setItem(OFFLINE_AUTH_KEY, 'true');
    return { user: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error) {
      return { user: null, error: error.message };
    }

    localStorage.removeItem(OFFLINE_AUTH_KEY);
    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Authentication failed' };
  }
}

/**
 * Signs up a new user in Supabase backend auth.users table.
 */
export async function signUpWithSupabase(email: string, password: string, name?: string): Promise<{ user: User | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: { name: name || 'Field Agent' }
      }
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Registration failed' };
  }
}

/**
 * Signs out from Supabase.
 */
export async function signOutSupabase(): Promise<void> {
  localStorage.removeItem(OFFLINE_AUTH_KEY);
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
}

/**
 * Checks current session from Supabase.
 */
export async function getInitialSession(): Promise<{ session: Session | null; isOffline: boolean }> {
  const isOffline = localStorage.getItem(OFFLINE_AUTH_KEY) === 'true';

  if (!isSupabaseConfigured || !supabase) {
    return { session: null, isOffline: true };
  }

  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session || null;

    if (session && navigator.onLine) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        await supabase.auth.signOut({ scope: 'local' });
        return { session: null, isOffline: false };
      }
    }

    return { session, isOffline };
  } catch {
    return { session: null, isOffline: true };
  }
}

/**
 * Updates the signed-in user's display name in Supabase auth.users metadata.
 */
export async function updateSupabaseUserName(name: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !name.trim()) return;
  try {
    const cleanName = name.trim();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: cleanName, name: cleanName, display_name: cleanName }
    });
    if (error) {
      console.warn('Supabase display name update warning:', error.message);
    }
  } catch (err) {
    console.warn('Could not update Supabase user display name:', err);
  }
}

/**
 * Enables offline bypass for remote areas without internet.
 */
export function setOfflineBypass() {
  localStorage.setItem(OFFLINE_AUTH_KEY, 'true');
}

