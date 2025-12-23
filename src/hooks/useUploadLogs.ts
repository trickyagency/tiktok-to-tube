import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UploadLog {
  id: string;
  queue_item_id: string;
  user_id: string;
  youtube_channel_id: string | null;
  scraped_video_id: string | null;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  download_duration_ms: number | null;
  token_refresh_duration_ms: number | null;
  upload_duration_ms: number | null;
  finalize_duration_ms: number | null;
  total_duration_ms: number | null;
  video_size_bytes: number | null;
  status: 'in_progress' | 'success' | 'failed';
  error_phase: string | null;
  error_message: string | null;
  error_code: string | null;
  youtube_video_id: string | null;
  youtube_video_url: string | null;
  created_at: string;
}

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

export function useUploadLogs(queueItemId?: string) {
  return useQuery({
    queryKey: ['upload-logs', queueItemId],
    queryFn: async () => {
      let query = supabase
        .from('upload_logs')
        .select('*')
        .order('started_at', { ascending: false });

      if (queueItemId) {
        query = query.eq('queue_item_id', queueItemId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as UploadLog[];
    },
  });
}

export function useUploadLogStats(dateRange?: DateRangeFilter) {
  return useQuery({
    queryKey: ['upload-log-stats', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('upload_logs')
        .select('status, total_duration_ms, download_duration_ms, upload_duration_ms, token_refresh_duration_ms, finalize_duration_ms, video_size_bytes')
        .order('started_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('started_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('started_at', endDate.toISOString());
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;

      const logs = data as UploadLog[];
      const successLogs = logs.filter(l => l.status === 'success');
      
      const avgDuration = successLogs.length > 0
        ? Math.round(successLogs.reduce((sum, l) => sum + (l.total_duration_ms || 0), 0) / successLogs.length)
        : 0;

      const avgDownload = successLogs.length > 0
        ? Math.round(successLogs.reduce((sum, l) => sum + (l.download_duration_ms || 0), 0) / successLogs.length)
        : 0;

      const avgUpload = successLogs.length > 0
        ? Math.round(successLogs.reduce((sum, l) => sum + (l.upload_duration_ms || 0), 0) / successLogs.length)
        : 0;

      const avgTokenRefresh = successLogs.length > 0
        ? Math.round(successLogs.reduce((sum, l) => sum + (l.token_refresh_duration_ms || 0), 0) / successLogs.length)
        : 0;

      const avgFinalize = successLogs.length > 0
        ? Math.round(successLogs.reduce((sum, l) => sum + (l.finalize_duration_ms || 0), 0) / successLogs.length)
        : 0;

      const avgSize = successLogs.length > 0
        ? Math.round(successLogs.reduce((sum, l) => sum + (l.video_size_bytes || 0), 0) / successLogs.length)
        : 0;

      const totalSize = logs.reduce((sum, l) => sum + (l.video_size_bytes || 0), 0);

      return {
        total: logs.length,
        success: successLogs.length,
        failed: logs.filter(l => l.status === 'failed').length,
        inProgress: logs.filter(l => l.status === 'in_progress').length,
        avgDurationMs: avgDuration,
        avgDownloadMs: avgDownload,
        avgUploadMs: avgUpload,
        avgTokenRefreshMs: avgTokenRefresh,
        avgFinalizeMs: avgFinalize,
        avgSizeBytes: avgSize,
        totalSizeBytes: totalSize,
        successRate: logs.length > 0 ? Math.round((successLogs.length / logs.length) * 100) : 0,
      };
    },
  });
}

export function useUploadLogTrends(dateRange?: DateRangeFilter) {
  return useQuery({
    queryKey: ['upload-log-trends', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('upload_logs')
        .select('started_at, status, total_duration_ms')
        .order('started_at', { ascending: true });

      if (dateRange?.from) {
        query = query.gte('started_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('started_at', endDate.toISOString());
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;

      const logs = data as UploadLog[];

      // Group by date
      const dailyStats = logs.reduce((acc, log) => {
        const date = new Date(log.started_at).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { success: 0, failed: 0, total: 0, totalDuration: 0 };
        if (log.status === 'success') {
          acc[date].success++;
          acc[date].totalDuration += log.total_duration_ms || 0;
        } else if (log.status === 'failed') {
          acc[date].failed++;
        }
        acc[date].total++;
        return acc;
      }, {} as Record<string, { success: number; failed: number; total: number; totalDuration: number }>);

      return Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        success: stats.success,
        failed: stats.failed,
        total: stats.total,
        successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
        avgDuration: stats.success > 0 ? Math.round(stats.totalDuration / stats.success / 1000) : 0,
      }));
    },
  });
}
