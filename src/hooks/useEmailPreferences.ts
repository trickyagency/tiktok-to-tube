import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailPreferences {
  emailOnUploadComplete: boolean;
  emailOnUploadFailed: boolean;
  emailOnNewVideo: boolean;
  emailOnScheduleRun: boolean;
  emailDigestFrequency: 'none' | 'daily' | 'weekly';
  // Subscription expiry reminders
  emailOnExpiry14Days: boolean;
  emailOnExpiry7Days: boolean;
  emailOnExpiry3Days: boolean;
  emailOnExpiry1Day: boolean;
}

const defaultPreferences: EmailPreferences = {
  emailOnUploadComplete: true,
  emailOnUploadFailed: true,
  emailOnNewVideo: false,
  emailOnScheduleRun: false,
  emailDigestFrequency: 'none',
  // Subscription expiry reminders - enabled by default
  emailOnExpiry14Days: true,
  emailOnExpiry7Days: true,
  emailOnExpiry3Days: true,
  emailOnExpiry1Day: true,
};

export const useEmailPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = user?.id ? `email_preferences_${user.id}` : null;

  useEffect(() => {
    if (!storageKey) {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
    setIsLoading(false);
  }, [storageKey]);

  const updatePreference = useCallback(<K extends keyof EmailPreferences>(
    key: K,
    value: EmailPreferences[K]
  ) => {
    if (!storageKey) return;

    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving email preferences:', error);
      }
      return updated;
    });
  }, [storageKey]);

  const updateAllPreferences = useCallback((newPreferences: Partial<EmailPreferences>) => {
    if (!storageKey) return;

    setPreferences((prev) => {
      const updated = { ...prev, ...newPreferences };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving email preferences:', error);
      }
      return updated;
    });
  }, [storageKey]);

  return {
    preferences,
    updatePreference,
    updateAllPreferences,
    isLoading,
  };
};
