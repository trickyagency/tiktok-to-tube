import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PlatformSetting {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const usePlatformSettings = () => {
  const { user, isOwner } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) throw error;
      return data as PlatformSetting[];
    },
    enabled: isOwner,
  });

  const getSetting = (key: string): string | null => {
    const setting = settings?.find(s => s.key === key);
    return setting?.value ?? null;
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('key', key)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('platform_settings')
          .update({ value, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq('key', key);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('platform_settings')
          .insert({ key, value, updated_by: user?.id });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['apify-validation'] });
      toast.success('Setting saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save setting: ' + error.message);
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value: null, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['apify-validation'] });
      toast.success('Setting deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete setting: ' + error.message);
    },
  });

  const updateSetting = (key: string, value: string) => {
    updateSettingMutation.mutate({ key, value });
  };

  const deleteSetting = (key: string) => {
    deleteSettingMutation.mutate(key);
  };

  return {
    settings,
    isLoading,
    getSetting,
    updateSetting,
    deleteSetting,
    isUpdating: updateSettingMutation.isPending,
    isDeleting: deleteSettingMutation.isPending,
  };
};
