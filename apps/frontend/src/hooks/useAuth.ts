import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Your Supabase client
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  token: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, session: null, token: null });

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        return;
      }
      setAuthState({
        user: session?.user ?? null,
        session: session,
        token: session?.access_token ?? null,
      });
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        user: session?.user ?? null,
        session: session,
        token: session?.access_token ?? null,
      });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return authState;
};
