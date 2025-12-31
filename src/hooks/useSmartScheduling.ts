import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TimeSuggestion {
  time: string;
  dayType: 'weekdays' | 'weekends' | 'daily';
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface UploadLogData {
  started_at: string;
  status: string;
  youtube_channel_id: string;
}

// YouTube Shorts peak engagement hours (0-23)
const PEAK_HOURS = {
  lunch: [12, 13, 14, 15], // 12 PM - 3 PM
  evening: [19, 20, 21], // 7 PM - 9 PM
};

const LOW_ENGAGEMENT_HOURS = [0, 1, 2, 3, 4, 5, 6]; // 12 AM - 6 AM

function calculateScore(
  hour: number,
  dayOfWeek: number,
  historicalData: UploadLogData[]
): { score: number; reasons: string[] } {
  let score = 50;
  const reasons: string[] = [];

  // Factor 1: Historical performance at this hour (40% weight)
  const hourUploads = historicalData.filter(
    (d) => new Date(d.started_at).getHours() === hour
  );
  if (hourUploads.length > 0) {
    const successCount = hourUploads.filter((d) => d.status === 'success').length;
    const successRate = successCount / hourUploads.length;
    const historicalBonus = successRate * 40;
    score += historicalBonus;
    if (successRate >= 0.8 && hourUploads.length >= 3) {
      reasons.push(`${Math.round(successRate * 100)}% success rate at this time`);
    }
  }

  // Factor 2: YouTube Shorts peak hours (30% weight)
  const isLunchPeak = PEAK_HOURS.lunch.includes(hour);
  const isEveningPeak = PEAK_HOURS.evening.includes(hour);
  if (isLunchPeak) {
    score += 30;
    reasons.push('Peak lunch-time engagement');
  } else if (isEveningPeak) {
    score += 30;
    reasons.push('Peak evening audience');
  } else if (hour >= 9 && hour <= 22) {
    score += 15;
  }

  // Factor 3: Weekend bonus (15% weight)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) {
    score += 15;
    reasons.push('Weekend engagement boost');
  } else {
    score += 10;
  }

  // Factor 4: Avoid low-engagement periods (-25 penalty)
  if (LOW_ENGAGEMENT_HOURS.includes(hour)) {
    score -= 25;
    reasons.push('Low audience activity period');
  }

  // Default reason if none set
  if (reasons.length === 0) {
    if (hour >= 9 && hour <= 17) {
      reasons.push('Standard business hours');
    } else if (hour >= 18 && hour <= 22) {
      reasons.push('Evening relaxation period');
    } else {
      reasons.push('Based on industry best practices');
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}

function getConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function formatTime(hour: number, minute: number = 0): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function useSmartScheduling(youtubeChannelId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['smart-scheduling', youtubeChannelId, user?.id],
    queryFn: async (): Promise<TimeSuggestion[]> => {
      if (!user?.id) return [];

      // Fetch historical upload data
      let queryBuilder = supabase
        .from('upload_logs')
        .select('started_at, status, youtube_channel_id')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(500);

      if (youtubeChannelId) {
        queryBuilder = queryBuilder.eq('youtube_channel_id', youtubeChannelId);
      }

      const { data: historicalData, error } = await queryBuilder;
      if (error) throw error;

      const logs = (historicalData || []) as UploadLogData[];

      // Generate suggestions for various hours
      const allSuggestions: TimeSuggestion[] = [];

      // Analyze both weekdays and weekends
      const dayTypes: Array<{ type: 'weekdays' | 'weekends' | 'daily'; days: number[] }> = [
        { type: 'weekdays', days: [1, 2, 3, 4, 5] },
        { type: 'weekends', days: [0, 6] },
      ];

      // Check prime hours
      const primeHours = [
        { hour: 12, minute: 0 },
        { hour: 14, minute: 0 },
        { hour: 15, minute: 0 },
        { hour: 19, minute: 0 },
        { hour: 20, minute: 0 },
        { hour: 21, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 17, minute: 0 },
        { hour: 18, minute: 0 },
      ];

      for (const dayType of dayTypes) {
        for (const { hour, minute } of primeHours) {
          // Use middle day of the range for calculation
          const representativeDay = dayType.days[Math.floor(dayType.days.length / 2)];
          const { score, reasons } = calculateScore(hour, representativeDay, logs);

          allSuggestions.push({
            time: formatTime(hour, minute),
            dayType: dayType.type,
            score,
            confidence: getConfidence(score),
            reason: reasons[0] || 'Recommended time slot',
          });
        }
      }

      // Also add some "daily" recommendations for the best times
      const topLunchHour = 14;
      const topEveningHour = 19;

      const lunchScore = calculateScore(topLunchHour, 3, logs);
      allSuggestions.push({
        time: formatTime(topLunchHour, 0),
        dayType: 'daily',
        score: lunchScore.score,
        confidence: getConfidence(lunchScore.score),
        reason: 'Consistent daily engagement',
      });

      const eveningScore = calculateScore(topEveningHour, 30, logs);
      allSuggestions.push({
        time: formatTime(topEveningHour, 30),
        dayType: 'daily',
        score: eveningScore.score,
        confidence: getConfidence(eveningScore.score),
        reason: 'Prime evening slot',
      });

      // Sort by score and remove duplicates
      const uniqueTimes = new Map<string, TimeSuggestion>();
      for (const suggestion of allSuggestions) {
        const key = `${suggestion.time}-${suggestion.dayType}`;
        if (!uniqueTimes.has(key) || uniqueTimes.get(key)!.score < suggestion.score) {
          uniqueTimes.set(key, suggestion);
        }
      }

      // Return top 5 unique suggestions sorted by score
      return Array.from(uniqueTimes.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    suggestions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
