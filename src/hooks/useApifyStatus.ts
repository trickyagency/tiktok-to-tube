import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ApifyStatus = 'valid' | 'invalid' | 'expired' | 'not_configured' | 'error' | 'loading';

interface ApifyValidationResult {
  valid: boolean;
  status: ApifyStatus;
  message: string;
  details?: string;
}

export function useApifyStatus() {
  return useQuery({
    queryKey: ['apify-status'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('is_apify_configured');
      
      if (error) {
        console.error('Error checking Apify status:', error);
        return false;
      }
      
      return data as boolean;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useApifyValidation() {
  return useQuery({
    queryKey: ['apify-validation'],
    queryFn: async (): Promise<ApifyValidationResult> => {
      const { data, error } = await supabase.functions.invoke('apify-validate');
      
      if (error) {
        console.error('Error validating Apify key:', error);
        return {
          valid: false,
          status: 'error',
          message: 'Failed to validate API key',
          details: error.message,
        };
      }
      
      return data as ApifyValidationResult;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });
}

export function useTestApifyKey() {
  const testKey = async (apiKey?: string): Promise<ApifyValidationResult> => {
    const { data, error } = await supabase.functions.invoke('apify-validate', {
      body: apiKey ? { apiKey } : {},
    });
    
    if (error) {
      console.error('Error testing Apify key:', error);
      return {
        valid: false,
        status: 'error',
        message: 'Failed to test API key',
        details: error.message,
      };
    }
    
    return data as ApifyValidationResult;
  };

  return { testKey };
}
