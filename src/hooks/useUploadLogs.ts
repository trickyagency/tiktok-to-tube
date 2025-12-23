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

export function useUploadLogStats() {
  return useQuery({
    queryKey: ['upload-log-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upload_logs')
        .select('status, total_duration_ms, download_duration_ms, upload_duration_ms, video_size_bytes')
        .order('started_at', { ascending: false })
        .limit(500);

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

      const avgSize = successLogs.length > 0
        ? Math.round(successLogs.reduce((sum, l) => sum + (l.video_size_bytes || 0), 0) / successLogs.length)
        : 0;

      return {
        total: logs.length,
        success: successLogs.length,
        failed: logs.filter(l => l.status === 'failed').length,
        inProgress: logs.filter(l => l.status === 'in_progress').length,
        avgDurationMs: avgDuration,
        avgDownloadMs: avgDownload,
        avgUploadMs: avgUpload,
        avgSizeBytes: avgSize,
        successRate: logs.length > 0 ? Math.round((successLogs.length / logs.length) * 100) : 0,
      };
    },
  });
}
