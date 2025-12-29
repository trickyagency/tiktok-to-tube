import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const WELCOME_KEY_PREFIX = 'repostflow-welcome-seen-';

export const useWelcomeModal = () => {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const storageKey = `${WELCOME_KEY_PREFIX}${user.id}`;
    const hasSeenWelcome = localStorage.getItem(storageKey);

    if (!hasSeenWelcome) {
      // Delay showing the modal to let the dashboard load first
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const dismissWelcome = () => {
    if (user?.id) {
      const storageKey = `${WELCOME_KEY_PREFIX}${user.id}`;
      localStorage.setItem(storageKey, new Date().toISOString());
    }
    setShowWelcome(false);
  };

  const resetWelcome = () => {
    if (user?.id) {
      const storageKey = `${WELCOME_KEY_PREFIX}${user.id}`;
      localStorage.removeItem(storageKey);
    }
  };

  return {
    showWelcome,
    dismissWelcome,
    resetWelcome,
  };
};
