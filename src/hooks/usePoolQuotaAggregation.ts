import { useMemo } from "react";
import { useYouTubeQuota } from "@/hooks/useYouTubeQuota";
import { ChannelPool } from "@/hooks/useChannelPools";

const UPLOAD_QUOTA_COST = 1600;
const DEFAULT_DAILY_QUOTA = 10000;

export interface PoolQuotaInfo {
  poolId: string;
  poolName: string;
  totalQuotaLimit: number;
  totalQuotaUsed: number;
  totalRemainingUploads: number;
  channelsWithQuota: number;
  channelsExhausted: number;
  channelsPaused: number;
  usagePercentage: number;
  channels: {
    channelId: string;
    channelTitle: string | null;
    quotaUsed: number;
    quotaLimit: number;
    remainingUploads: number;
    isPaused: boolean;
    isConnected: boolean;
  }[];
}

export function usePoolQuotaAggregation(pools: ChannelPool[]) {
  const { data: allQuotaData = [] } = useYouTubeQuota();

  const poolQuotas = useMemo(() => {
    return pools.map(pool => {
      const members = pool.members || [];
      const channelIds = members.map(m => m.youtube_channel_id);
      
      let totalQuotaLimit = 0;
      let totalQuotaUsed = 0;
      let channelsWithQuota = 0;
      let channelsExhausted = 0;
      let channelsPaused = 0;
      
      const channels = members.map(member => {
        const quota = allQuotaData.find(q => q.youtube_channel_id === member.youtube_channel_id);
        const channel = member.youtube_channel;
        
        const quotaLimit = quota?.quota_limit || DEFAULT_DAILY_QUOTA;
        const quotaUsed = quota?.quota_used || 0;
        const remainingQuota = quotaLimit - quotaUsed;
        const remainingUploads = Math.floor(remainingQuota / UPLOAD_QUOTA_COST);
        const isPaused = quota?.is_paused || false;
        const isConnected = channel?.auth_status === 'connected';
        
        totalQuotaLimit += quotaLimit;
        totalQuotaUsed += quotaUsed;
        
        if (isConnected && !isPaused) {
          if (remainingUploads > 0) {
            channelsWithQuota++;
          } else {
            channelsExhausted++;
          }
        }
        
        if (isPaused) {
          channelsPaused++;
        }
        
        return {
          channelId: member.youtube_channel_id,
          channelTitle: channel?.channel_title || null,
          quotaUsed,
          quotaLimit,
          remainingUploads,
          isPaused,
          isConnected,
        };
      });
      
      const totalRemainingUploads = channels
        .filter(c => c.isConnected && !c.isPaused)
        .reduce((sum, c) => sum + c.remainingUploads, 0);
      
      const usagePercentage = totalQuotaLimit > 0 
        ? Math.round((totalQuotaUsed / totalQuotaLimit) * 100) 
        : 0;
      
      return {
        poolId: pool.id,
        poolName: pool.name,
        totalQuotaLimit,
        totalQuotaUsed,
        totalRemainingUploads,
        channelsWithQuota,
        channelsExhausted,
        channelsPaused,
        usagePercentage,
        channels,
      } as PoolQuotaInfo;
    });
  }, [pools, allQuotaData]);

  const totalAcrossAllPools = useMemo(() => {
    return {
      totalRemainingUploads: poolQuotas.reduce((sum, p) => sum + p.totalRemainingUploads, 0),
      totalChannelsWithQuota: poolQuotas.reduce((sum, p) => sum + p.channelsWithQuota, 0),
      totalChannelsExhausted: poolQuotas.reduce((sum, p) => sum + p.channelsExhausted, 0),
    };
  }, [poolQuotas]);

  return {
    poolQuotas,
    totalAcrossAllPools,
    getPoolQuota: (poolId: string) => poolQuotas.find(p => p.poolId === poolId),
  };
}
