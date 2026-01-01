import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  const fetchUserRoles = async (userId: string) => {
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
  };

  useEffect(() => {
    // Set up auth state listener FIRST to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Only fetch roles on SIGNED_IN or USER_UPDATED, not on TOKEN_REFRESHED
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setTimeout(() => {
          fetchUserRoles(session.user.id);
        }, 0);
      } else if (!session?.user) {
        setIsOwner(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchUserRoles(session.user.id);
        }, 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
