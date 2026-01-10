import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Zap, Globe } from 'lucide-react';

interface PlatformStatsWidgetProps {
  totalPlatformVideos: number;
  totalUsers?: number;
}

const PlatformStatsWidget = ({
  totalPlatformVideos,
  totalUsers = 0,
}: PlatformStatsWidgetProps) => {
  const [displayCount, setDisplayCount] = useState(0);

  // Animated counter effect
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = totalPlatformVideos / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= totalPlatformVideos) {
        setDisplayCount(totalPlatformVideos);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalPlatformVideos]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <Card className="border-0 stat-gradient-1 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <CardHeader className="pb-2 relative">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Platform Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        {/* Main Counter */}
        <div className="text-center py-2">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-primary">
              {formatNumber(displayCount)}
            </span>
            <span className="text-lg font-semibold text-primary/70">+</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Videos Published on Platform
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs font-medium">99.9%</p>
              <p className="text-[10px] text-muted-foreground">Uptime</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">{totalUsers > 0 ? formatNumber(totalUsers) : '100'}+</p>
              <p className="text-[10px] text-muted-foreground">Users</p>
            </div>
          </div>
        </div>

        {/* Social Proof Badge */}
        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Trusted Automation Platform</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformStatsWidget;
