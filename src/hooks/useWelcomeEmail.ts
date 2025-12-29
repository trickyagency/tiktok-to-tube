import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useWelcomeEmail = () => {
  const { user, session } = useAuth();
  const hasSentRef = useRef(false);

  useEffect(() => {
    const sendWelcomeEmail = async () => {
      if (!user || !session || hasSentRef.current) return;
      
      hasSentRef.current = true;

      try {
        const { data, error } = await supabase.functions.invoke('send-welcome-email', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Failed to send welcome email:', error);
        } else {
          console.log('Welcome email result:', data?.message);
        }
      } catch (err) {
        console.error('Error invoking welcome email function:', err);
      }
    };

    sendWelcomeEmail();
  }, [user, session]);
};
