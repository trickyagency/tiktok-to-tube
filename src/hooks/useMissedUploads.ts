import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, differenceInMinutes, parseISO, format } from 'date-fns';

export interface MissedUpload {
  scheduleId: string;
  scheduleName: string;
  expectedTime: string; // "HH:MM"
  expectedAt: Date;
  timezone: string;
  youtubeChannelId: string;
  youtubeChannelTitle?: string;
  tiktokAccountId: string;
  tiktokUsername?: string;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function useMissedUploads() {
  return useQuery({
    queryKey: ['missed-uploads'],
    queryFn: async (): Promise<MissedUpload[]> => {
      const now = new Date();
      const twentyFourHoursAgo = subHours(now, 24);

      // Fetch active schedules with related data
      const { data: schedules, error: schedulesError } = await supabase
        .from('publish_schedules')
        .select(`
          id,
          schedule_name,
          publish_times,
          timezone,
          youtube_channel_id,
          tiktok_account_id,
          youtube_channel:youtube_channels(channel_title),
          tiktok_account:tiktok_accounts(username)
        `)
        .eq('is_active', true);

      if (schedulesError || !schedules) return [];

      // Fetch all queue entries from the last 24 hours for these schedules
      const scheduleIds = schedules.map(s => s.id);
      if (scheduleIds.length === 0) return [];

      const { data: queueEntries, error: queueError } = await supabase
        .from('publish_queue')
        .select('id, schedule_id, created_at, status')
        .in('schedule_id', scheduleIds)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (queueError) {
        console.error('Failed to fetch queue entries for missed uploads:', queueError);
        return [];
      }

      const missed: MissedUpload[] = [];

      for (const schedule of schedules) {
        const publishTimes: string[] = Array.isArray(schedule.publish_times)
          ? schedule.publish_times
          : JSON.parse(String(schedule.publish_times) || '[]');
        
        const timezone = schedule.timezone || 'UTC';

        // For each publish time, check if there's a matching queue entry in the last 24h
        // We generate expected slots for the past 24 hours
        for (const time of publishTimes) {
          const [hours, minutes] = time.split(':').map(Number);
          
          // Calculate what the expected UTC time would have been for today and yesterday
          // We use a simple approach: create dates for today and yesterday at the expected time
          const candidates: Date[] = [];
          
          for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
            try {
              // Create a date in UTC that represents the publish time in the schedule's timezone
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() - dayOffset);
              
              // Format to get the date part in the target timezone
              const dateFormatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
              const dateParts = dateFormatter.format(targetDate);
              
              // Build an approximate expected time
              // This is approximate since we can't perfectly reverse timezone conversion in the browser
              const expectedStr = `${dateParts}T${time}:00`;
              const expected = new Date(expectedStr);
              
              // Adjust for timezone offset (approximate)
              const nowInTz = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).formatToParts(now);
              
              const tzHour = parseInt(nowInTz.find(p => p.type === 'hour')?.value || '0');
              const tzMin = parseInt(nowInTz.find(p => p.type === 'minute')?.value || '0');
              const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
              const tzMinutes = tzHour * 60 + tzMin;
              const offsetMinutes = tzMinutes - utcMinutes;
              
              // Adjust the expected time from timezone to UTC
              const expectedUtc = new Date(expected.getTime() - offsetMinutes * 60 * 1000);
              
              if (expectedUtc >= twentyFourHoursAgo && expectedUtc < now) {
                candidates.push(expectedUtc);
              }
            } catch {
              // Skip invalid timezone
            }
          }

          for (const expectedAt of candidates) {
            // Check if there's a queue entry for this schedule within ±5 minutes of the expected time
            const scheduleQueueEntries = (queueEntries || []).filter(
              q => q.schedule_id === schedule.id
            );

            const hasMatchingEntry = scheduleQueueEntries.some(entry => {
              const entryTime = parseISO(entry.created_at);
              const diff = Math.abs(differenceInMinutes(entryTime, expectedAt));
              return diff <= 5;
            });

            if (!hasMatchingEntry) {
              missed.push({
                scheduleId: schedule.id,
                scheduleName: schedule.schedule_name,
                expectedTime: time,
                expectedAt,
                timezone,
                youtubeChannelId: schedule.youtube_channel_id,
                youtubeChannelTitle: (schedule.youtube_channel as any)?.channel_title || undefined,
                tiktokAccountId: schedule.tiktok_account_id,
                tiktokUsername: (schedule.tiktok_account as any)?.username || undefined,
              });
            }
          }
        }
      }

      // Sort by most recent expected time first
      missed.sort((a, b) => b.expectedAt.getTime() - a.expectedAt.getTime());

      return missed;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000,
  });
}
