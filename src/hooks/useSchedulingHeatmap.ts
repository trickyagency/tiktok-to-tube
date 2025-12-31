import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HeatmapCell {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  time: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  uploadsCount: number;
  successRate: number;
}

interface UploadLogData {
  started_at: string;
  status: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PEAK_HOURS = {
  lunch: [12, 13, 14, 15],
  evening: [19, 20, 21],
};

const LOW_ENGAGEMENT_HOURS = [0, 1, 2, 3, 4, 5, 6];

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function calculateCellScore(
  hour: number,
  dayOfWeek: number,
  historicalData: UploadLogData[]
): { score: number; reason: string; uploadsCount: number; successRate: number } {
  let score = 50;
  const reasons: string[] = [];

  // Filter data for this specific hour and day
  const cellUploads = historicalData.filter((d) => {
    const date = new Date(d.started_at);
    return date.getHours() === hour && date.getDay() === dayOfWeek;
  });

  const uploadsCount = cellUploads.length;
  const successCount = cellUploads.filter((d) => d.status === 'success').length;
  const successRate = uploadsCount > 0 ? successCount / uploadsCount : 0;

  // Factor 1: Historical performance (40% weight)
  if (uploadsCount > 0) {
    const historicalBonus = successRate * 40;
    score += historicalBonus;
    if (successRate >= 0.8 && uploadsCount >= 2) {
      reasons.push(`${Math.round(successRate * 100)}% success rate`);
    }
  }

  // Factor 2: YouTube Shorts peak hours (30% weight)
  const isLunchPeak = PEAK_HOURS.lunch.includes(hour);
  const isEveningPeak = PEAK_HOURS.evening.includes(hour);
  if (isLunchPeak) {
    score += 30;
    reasons.push('Peak lunch-time');
  } else if (isEveningPeak) {
    score += 30;
    reasons.push('Peak evening');
  } else if (hour >= 9 && hour <= 22) {
    score += 15;
  }

  // Factor 3: Weekend bonus (15% weight)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) {
    score += 15;
    reasons.push('Weekend boost');
  } else {
    score += 10;
  }

  // Factor 4: Avoid low-engagement periods (-25 penalty)
  if (LOW_ENGAGEMENT_HOURS.includes(hour)) {
    score -= 25;
    reasons.push('Low activity period');
  }

  // Default reason
  if (reasons.length === 0) {
    if (hour >= 9 && hour <= 17) {
      reasons.push('Business hours');
    } else if (hour >= 18 && hour <= 22) {
      reasons.push('Evening hours');
    } else {
      reasons.push('Standard time');
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: reasons[0] || 'Standard time',
    uploadsCount,
    successRate,
  };
}

function getConfidence(score: number, uploadsCount: number): 'high' | 'medium' | 'low' {
  if (score >= 80 && uploadsCount >= 2) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export function useSchedulingHeatmap(youtubeChannelId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['scheduling-heatmap', youtubeChannelId, user?.id],
    queryFn: async (): Promise<HeatmapCell[]> => {
      if (!user?.id) return [];

      // Fetch historical upload data
      let queryBuilder = supabase
        .from('upload_logs')
        .select('started_at, status')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1000);

      if (youtubeChannelId) {
        queryBuilder = queryBuilder.eq('youtube_channel_id', youtubeChannelId);
      }

      const { data: historicalData, error } = await queryBuilder;
      if (error) throw error;

      const logs = (historicalData || []) as UploadLogData[];
      const heatmapData: HeatmapCell[] = [];

      // Generate data for all 7 days x 24 hours
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        for (let hour = 0; hour < 24; hour++) {
          const { score, reason, uploadsCount, successRate } = calculateCellScore(
            hour,
            dayOfWeek,
            logs
          );

          heatmapData.push({
            dayOfWeek,
            dayName: DAY_NAMES[dayOfWeek],
            hour,
            time: formatHour(hour),
            score,
            confidence: getConfidence(score, uploadsCount),
            reason,
            uploadsCount,
            successRate,
          });
        }
      }

      return heatmapData;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Get the best times for quick reference
  const bestTimes = useMemo(() => {
    if (!query.data) return [];
    return [...query.data]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [query.data]);

  return {
    heatmapData: query.data || [],
    bestTimes,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
