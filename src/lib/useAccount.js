import { useCallback, useEffect, useState } from 'react';
import { supabase, isAuthConfigured, authCallbackUrl } from './supabase';
import { getPlan } from './plans';

// Without Supabase keys the app runs in local mode: no login, and the plan comes
// from VITE_DEV_PLAN (default "free") so limits can be tested.
const DEV_PLAN = import.meta.env.VITE_DEV_PLAN || 'free';

async function loadPlanId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return 'free';
  if (data.plan_expires_at && new Date(data.plan_expires_at) < new Date()) return 'free';
  return data.plan || 'free';
}

export function useAccount() {
  const [session, setSession] = useState(null);
  const [planId, setPlanId] = useState(isAuthConfigured ? 'free' : DEV_PLAN);
  const [loading, setLoading] = useState(isAuthConfigured);

  // Session and plan are set together so a paid account never shows as free mid-load
  const applySession = useCallback(async (next) => {
    const nextPlan = next ? await loadPlanId(next.user.id) : 'free';
    setSession(next);
    setPlanId(nextPlan);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;

    supabase.auth.getSession().then(({ data }) => { if (active) applySession(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase advises against awaiting its own calls inside this callback
      setTimeout(() => { if (active) applySession(next); }, 0);
    });

    // Login finishes in another tab (magic link) or a popup (Google).
    // Re-read the stored session when that tab writes it.
    const refresh = () => supabase.auth.getSession().then(({ data }) => { if (active) applySession(data.session); });
    const onStorage = (e) => { if (e.key && e.key.startsWith('sb-')) refresh(); };
    const onMessage = (e) => { if (e.origin === window.location.origin && e.data === 'videofy:signed-in') refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
    };
  }, [applySession]);

  const signInWithGoogle = useCallback(async () => {
    // Popup keeps the editor tab (and the loaded cuts) open
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl(), skipBrowserRedirect: true },
    });
    if (error) throw error;
    const popup = window.open(data.url, 'videofy-login', 'width=480,height=640');
    if (!popup) window.location.assign(data.url);
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authCallbackUrl() },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  return {
    isAuthConfigured,
    loading,
    session,
    email: session?.user?.email || null,
    isSignedIn: !isAuthConfigured || Boolean(session),
    plan: getPlan(planId),
    signInWithGoogle,
    signInWithEmail,
    signOut,
  };
}
