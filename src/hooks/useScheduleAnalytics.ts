import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subDays, format } from 'date-fns';

export interface ScheduleStats {
  scheduleId: string;
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  queuedUploads: number;
  processingUploads: number;
  successRate: number;
  avgUploadDuration: number;
  lastUploadAt: string | null;
}

export interface ScheduleOverviewStats {
  activeSchedules: number;
  totalSchedules: number;
  totalUploadsThisMonth: number;
  avgSuccessRate: number;
}

export interface ScheduleTrend {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

export function useScheduleAnalytics() {
  return useQuery({
    queryKey: ['schedule-analytics-overview'],
    queryFn: async (): Promise<ScheduleOverviewStats> => {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      // Fetch all schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('publish_schedules')
        .select('id, is_active');

      if (schedulesError) throw schedulesError;

      // Fetch this month's queue items
      const { data: queueItems, error: queueError } = await supabase
        .from('publish_queue')
        .select('status, processed_at')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (queueError) throw queueError;

      const activeSchedules = schedules?.filter(s => s.is_active).length || 0;
      const totalSchedules = schedules?.length || 0;
      const totalUploadsThisMonth = queueItems?.filter(q => q.status === 'published' || q.status === 'failed').length || 0;
      
      const successful = queueItems?.filter(q => q.status === 'published').length || 0;
      const completed = queueItems?.filter(q => q.status === 'published' || q.status === 'failed').length || 0;
      const avgSuccessRate = completed > 0 ? (successful / completed) * 100 : 100;

      return {
        activeSchedules,
        totalSchedules,
        totalUploadsThisMonth,
        avgSuccessRate,
      };
    },
  });
}

export function useScheduleStats(scheduleId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-stats', scheduleId],
    queryFn: async (): Promise<ScheduleStats | null> => {
      if (!scheduleId) return null;

      // Fetch queue items for this schedule
      const { data: queueItems, error } = await supabase
        .from('publish_queue')
        .select('id, status, processed_at, created_at')
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalUploads = queueItems?.filter(q => q.status === 'published' || q.status === 'failed').length || 0;
      const successfulUploads = queueItems?.filter(q => q.status === 'published').length || 0;
      const failedUploads = queueItems?.filter(q => q.status === 'failed').length || 0;
      const queuedUploads = queueItems?.filter(q => q.status === 'queued').length || 0;
      const processingUploads = queueItems?.filter(q => q.status === 'processing' || q.status === 'publishing').length || 0;
      
      const successRate = totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 100;
      
      // Get the last published item
      const lastPublished = queueItems?.find(q => q.status === 'published');
      const lastUploadAt = lastPublished?.processed_at || null;

      // Calculate average duration from upload_logs if available
      const queueIds = queueItems?.filter(q => q.status === 'published').map(q => q.id) || [];
      let avgUploadDuration = 0;
      
      if (queueIds.length > 0) {
        const { data: logs } = await supabase
          .from('upload_logs')
          .select('total_duration_ms')
          .in('queue_item_id', queueIds)
          .not('total_duration_ms', 'is', null);

        if (logs && logs.length > 0) {
          const totalDuration = logs.reduce((sum, log) => sum + (log.total_duration_ms || 0), 0);
          avgUploadDuration = totalDuration / logs.length;
        }
      }

      return {
        scheduleId,
        totalUploads,
        successfulUploads,
        failedUploads,
        queuedUploads,
        processingUploads,
        successRate,
        avgUploadDuration,
        lastUploadAt,
      };
    },
    enabled: !!scheduleId,
  });
}

export function useScheduleTrends(scheduleId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['schedule-trends', scheduleId, days],
    queryFn: async (): Promise<ScheduleTrend[]> => {
      if (!scheduleId) return [];

      const startDate = subDays(new Date(), days);

      const { data: queueItems, error } = await supabase
        .from('publish_queue')
        .select('status, processed_at, created_at')
        .eq('schedule_id', scheduleId)
        .gte('created_at', startDate.toISOString())
        .in('status', ['published', 'failed']);

      if (error) throw error;

      // Group by date
      const trendMap = new Map<string, { successful: number; failed: number }>();
      
      // Initialize all dates
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        trendMap.set(date, { successful: 0, failed: 0 });
      }

      // Populate with data
      queueItems?.forEach(item => {
        const date = format(new Date(item.processed_at || item.created_at), 'yyyy-MM-dd');
        const existing = trendMap.get(date);
        if (existing) {
          if (item.status === 'published') {
            existing.successful++;
          } else if (item.status === 'failed') {
            existing.failed++;
          }
        }
      });

      return Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        successful: data.successful,
        failed: data.failed,
        total: data.successful + data.failed,
      }));
    },
    enabled: !!scheduleId,
  });
}
