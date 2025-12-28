import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: 'totp';
  status: 'verified' | 'unverified';
}

interface EnrollmentData {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export const useMFA = () => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const fetchFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data.totp || []);
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFactors();
  }, []);

  const hasVerifiedFactor = factors.some(f => f.status === 'verified');

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });
      if (error) throw error;
      setEnrollmentData(data);
      return data;
    } catch (error: any) {
      toast.error('Failed to start 2FA enrollment', { description: error.message });
      throw error;
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyEnrollment = async (factorId: string, code: string) => {
    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });
      if (verifyError) throw verifyError;

      toast.success('Two-factor authentication enabled!');
      setEnrollmentData(null);
      await fetchFactors();
      return true;
    } catch (error: any) {
      toast.error('Verification failed', { description: error.message });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const disableMFA = async (factorId: string) => {
    setIsDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });
      if (error) throw error;
      toast.success('Two-factor authentication disabled');
      await fetchFactors();
      return true;
    } catch (error: any) {
      toast.error('Failed to disable 2FA', { description: error.message });
      return false;
    } finally {
      setIsDisabling(false);
    }
  };

  const cancelEnrollment = () => {
    setEnrollmentData(null);
  };

  // Challenge and verify for login
  const challengeAndVerify = async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });
      if (verifyError) throw verifyError;

      return true;
    } catch (error: any) {
      toast.error('2FA verification failed', { description: error.message });
      return false;
    }
  };

  return {
    factors,
    hasVerifiedFactor,
    isLoading,
    enrollmentData,
    isEnrolling,
    isVerifying,
    isDisabling,
    startEnrollment,
    verifyEnrollment,
    disableMFA,
    cancelEnrollment,
    challengeAndVerify,
    refreshFactors: fetchFactors
  };
};
