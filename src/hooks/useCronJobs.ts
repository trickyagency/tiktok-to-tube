import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
}

interface CronHistoryEntry {
  runid: number;
  jobid: number;
  job_name: string;
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
}

export const useCronJobs = (historyLimit: number = 50) => {
  const jobsQuery = useQuery({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_jobs');
      if (error) throw error;
      return data as CronJob[];
    },
    refetchInterval: 30000,
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  const historyQuery = useQuery({
    queryKey: ['cron-history', historyLimit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_history', { limit_rows: historyLimit });
      if (error) throw error;
      return data as CronHistoryEntry[];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const refetch = () => {
    jobsQuery.refetch();
    historyQuery.refetch();
  };

  return {
    jobs: jobsQuery.data ?? [],
    history: historyQuery.data ?? [],
    isLoading: jobsQuery.isLoading || historyQuery.isLoading,
    isFetching: jobsQuery.isFetching || historyQuery.isFetching,
    isError: jobsQuery.isError || historyQuery.isError,
    error: jobsQuery.error || historyQuery.error,
    refetch,
  };
};
