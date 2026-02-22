import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ApifyStatus = 'valid' | 'invalid' | 'not_configured' | 'error' | 'loading';

interface ApifyValidationResult {
  valid: boolean;
  status: ApifyStatus;
  message: string;
  details?: string;
}

// This hook checks whether the scraper is configured via the validate edge function
export function useApifyStatus() {
  return useQuery({
    queryKey: ['apify-status'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.functions.invoke('apify-validate');
      if (error) {
        console.error('Error checking scraper status:', error);
        return false;
      }
      return data?.valid === true;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useApifyValidation() {
  return useQuery({
    queryKey: ['apify-validation'],
    queryFn: async (): Promise<ApifyValidationResult> => {
      const { data, error } = await supabase.functions.invoke('apify-validate');
      if (error) {
        return {
          valid: false,
          status: 'error',
          message: 'Failed to check scraper status',
          details: error.message,
        };
      }
      return data as ApifyValidationResult;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

// Kept for backward compat but no longer used for testing arbitrary keys
export function useTestApifyKey() {
  const testKey = async (): Promise<ApifyValidationResult> => {
    const { data, error } = await supabase.functions.invoke('apify-validate');
    if (error) {
      return {
        valid: false,
        status: 'error',
        message: 'Failed to check scraper status',
        details: error.message,
      };
    }
    return data as ApifyValidationResult;
  };

  return { testKey };
}
