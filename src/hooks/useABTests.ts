import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ABTest {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  test_name: string;
  status: 'running' | 'paused' | 'completed';
  variant_a_times: string[];
  variant_b_times: string[];
  start_date: string;
  end_date: string | null;
  total_uploads_a: number;
  total_uploads_b: number;
  success_rate_a: number;
  success_rate_b: number;
  winner: 'a' | 'b' | null;
  created_at: string;
  updated_at: string;
  youtube_channel?: {
    channel_title: string | null;
    channel_thumbnail: string | null;
  };
}

interface CreateABTestParams {
  youtube_channel_id: string;
  test_name: string;
  variant_a_times: string[];
  variant_b_times: string[];
}

interface UpdateABTestParams {
  id: string;
  status?: 'running' | 'paused' | 'completed';
  winner?: 'a' | 'b' | null;
  end_date?: string;
}

export function useABTests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: abTests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['ab-tests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('schedule_ab_tests')
        .select(`
          *,
          youtube_channel:youtube_channels(channel_title, channel_thumbnail)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((test) => ({
        ...test,
        variant_a_times: Array.isArray(test.variant_a_times) 
          ? test.variant_a_times 
          : JSON.parse(test.variant_a_times as string || '[]'),
        variant_b_times: Array.isArray(test.variant_b_times) 
          ? test.variant_b_times 
          : JSON.parse(test.variant_b_times as string || '[]'),
      })) as ABTest[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (params: CreateABTestParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('schedule_ab_tests')
        .insert({
          user_id: user.id,
          youtube_channel_id: params.youtube_channel_id,
          test_name: params.test_name,
          variant_a_times: params.variant_a_times,
          variant_b_times: params.variant_b_times,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('A/B test created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create A/B test: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: UpdateABTestParams) => {
      const { id, ...updates } = params;

      const { data, error } = await supabase
        .from('schedule_ab_tests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('A/B test updated');
    },
    onError: (error) => {
      toast.error(`Failed to update A/B test: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedule_ab_tests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('A/B test deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete A/B test: ${error.message}`);
    },
  });

  // Calculate confidence level based on sample sizes and success rates
  const calculateConfidence = (test: ABTest): number => {
    const minSamples = 20;
    const totalUploads = test.total_uploads_a + test.total_uploads_b;
    
    if (totalUploads < minSamples) {
      return (totalUploads / minSamples) * 50; // Max 50% confidence with insufficient data
    }

    const rateDiff = Math.abs(test.success_rate_a - test.success_rate_b);
    const sampleBonus = Math.min((totalUploads - minSamples) / 100, 0.3) * 100;
    
    return Math.min(50 + rateDiff * 2 + sampleBonus, 99);
  };

  return {
    abTests,
    isLoading,
    error,
    refetch,
    createTest: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateTest: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteTest: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    calculateConfidence,
  };
}
