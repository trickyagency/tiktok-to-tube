import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ValidationStatus = 
  | 'valid' 
  | 'token_revoked' 
  | 'api_not_enabled' 
  | 'credentials_invalid' 
  | 'no_refresh_token' 
  | 'error'
  | 'pending';

export interface ValidationResult {
  channelId: string;
  channelTitle: string | null;
  status: ValidationStatus;
  message: string;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  issues: number;
}

interface BulkValidateResponse {
  summary: ValidationSummary;
  results: ValidationResult[];
}

export function useYouTubeBulkValidate() {
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateAll = useCallback(async () => {
    setIsValidating(true);
    setError(null);
    setResults([]);
    setSummary(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<BulkValidateResponse>(
        'youtube-bulk-validate',
        { body: {} }
      );

      if (invokeError) {
        throw invokeError;
      }

      if (data) {
        setResults(data.results);
        setSummary(data.summary);
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Validation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const validateSelected = useCallback(async (channelIds: string[]) => {
    setIsValidating(true);
    setError(null);
    setResults([]);
    setSummary(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<BulkValidateResponse>(
        'youtube-bulk-validate',
        { body: { channelIds } }
      );

      if (invokeError) {
        throw invokeError;
      }

      if (data) {
        setResults(data.results);
        setSummary(data.summary);
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Validation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setSummary(null);
    setError(null);
    setIsValidating(false);
  }, []);

  // Group results by status for easier display
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.status]) {
      acc[result.status] = [];
    }
    acc[result.status].push(result);
    return acc;
  }, {} as Record<ValidationStatus, ValidationResult[]>);

  return {
    validateAll,
    validateSelected,
    isValidating,
    results,
    groupedResults,
    summary,
    error,
    reset,
  };
}
