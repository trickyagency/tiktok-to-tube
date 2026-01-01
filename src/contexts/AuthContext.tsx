import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const initialCheckDone = useRef(false);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roles) {
        const roleList = roles.map(r => r.role);
        setIsOwner(roleList.includes('owner'));
        setIsAdmin(roleList.includes('admin') || roleList.includes('owner'));
      } else {
        setIsOwner(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setIsOwner(false);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;

      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Fetch roles on relevant auth events
      if (currentSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        setTimeout(() => {
          if (isMounted) {
            fetchUserRoles(currentSession.user.id);
          }
        }, 0);
      } else if (!currentSession?.user) {
        setIsOwner(false);
        setIsAdmin(false);
      }

      // Only set loading false after initial check is complete
      if (initialCheckDone.current) {
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;

      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        setTimeout(() => {
          if (isMounted) {
            fetchUserRoles(existingSession.user.id);
          }
        }, 0);
      }

      initialCheckDone.current = true;
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isOwner, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
