import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Crown, MessageCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { generateGeneralWhatsAppLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import type { UserSubscription } from '@/hooks/useUserSubscription';

interface SubscriptionCountdownWidgetProps {
  subscription: UserSubscription | null;
  isUnlimited?: boolean;
  className?: string;
}

export function SubscriptionCountdownWidget({ 
  subscription, 
  isUnlimited = false,
  className 
}: SubscriptionCountdownWidgetProps) {
  
  const { 
    daysRemaining, 
    percentageRemaining, 
    startDate, 
    expiryDate,
    urgencyLevel 
  } = useMemo(() => {
    if (!subscription?.expires_at) {
      return { 
        daysRemaining: null, 
        percentageRemaining: 100, 
        startDate: null, 
        expiryDate: null,
        urgencyLevel: 'safe' as const
      };
    }

    const start = subscription.starts_at 
      ? new Date(subscription.starts_at) 
      : new Date(subscription.created_at || Date.now());
    const expiry = new Date(subscription.expires_at);
    const now = new Date();

    const totalDays = Math.max(1, differenceInDays(expiry, start));
    const remaining = Math.max(0, differenceInDays(expiry, now));
    const percentage = Math.max(0, Math.min(100, (remaining / totalDays) * 100));

    let urgency: 'safe' | 'warning' | 'critical' = 'safe';
    if (remaining <= 3) urgency = 'critical';
    else if (remaining <= 7) urgency = 'warning';
    else if (remaining <= 14) urgency = 'warning';

    return {
      daysRemaining: remaining,
      percentageRemaining: percentage,
      startDate: start,
      expiryDate: expiry,
      urgencyLevel: urgency
    };
  }, [subscription]);

  const handleRenew = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  // Ring configuration
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentageRemaining / 100) * circumference;

  // Color classes based on urgency
  const ringColors = {
    safe: { stroke: 'stroke-emerald-500', glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' },
    warning: { stroke: 'stroke-amber-500', glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
    critical: { stroke: 'stroke-red-500', glow: 'drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]' }
  };

  const colors = ringColors[urgencyLevel];

  // Unlimited state for owners
  if (isUnlimited) {
    return (
      <Card className={cn("relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50", className)}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Subscription Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6">
            <div className="h-40 w-40 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
              <div className="text-center">
                <Crown className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">Unlimited</span>
                <p className="text-xs text-muted-foreground mt-1">No expiration</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No expiry date
  if (daysRemaining === null) {
    return null;
  }

  return (
    <Card className={cn(
      "relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50",
      urgencyLevel === 'critical' && "border-red-500/30",
      urgencyLevel === 'warning' && "border-amber-500/30",
      className
    )}>
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
        urgencyLevel === 'safe' && "from-emerald-500 to-green-500",
        urgencyLevel === 'warning' && "from-amber-500 to-yellow-500",
        urgencyLevel === 'critical' && "from-red-500 to-rose-500"
      )} />
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Subscription Timeline
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Animated Progress Ring */}
          <div className="relative">
            <svg 
              width={size} 
              height={size} 
              className={cn(
                "transform -rotate-90",
                urgencyLevel === 'critical' && "animate-pulse"
              )}
            >
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/20"
              />
              {/* Progress ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className={cn(colors.stroke, colors.glow)}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  transition: 'stroke-dashoffset 1s ease-out'
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "text-4xl font-bold",
                urgencyLevel === 'safe' && "text-emerald-500",
                urgencyLevel === 'warning' && "text-amber-500",
                urgencyLevel === 'critical' && "text-red-500"
              )}>
                {daysRemaining}
              </span>
              <span className="text-sm text-muted-foreground">
                {daysRemaining === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Date range */}
          <div className="w-full mt-6 flex items-center justify-between text-sm">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="font-medium">
                {startDate ? format(startDate, 'MMM d') : '—'}
              </p>
            </div>
            
            <div className="flex-1 mx-4 relative">
              <div className="h-1 bg-muted/30 rounded-full">
                <div 
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-1000",
                    urgencyLevel === 'safe' && "from-emerald-500 to-green-500",
                    urgencyLevel === 'warning' && "from-amber-500 to-yellow-500",
                    urgencyLevel === 'critical' && "from-red-500 to-rose-500"
                  )}
                  style={{ width: `${100 - percentageRemaining}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {Math.round(percentageRemaining)}% remaining
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className={cn(
                "font-medium",
                urgencyLevel === 'critical' && "text-red-500"
              )}>
                {expiryDate ? format(expiryDate, 'MMM d') : '—'}
              </p>
            </div>
          </div>

          {/* Renewal button for expiring soon */}
          {daysRemaining <= 14 && (
            <Button
              onClick={handleRenew}
              className={cn(
                "w-full mt-6 bg-gradient-to-r text-white border-0",
                urgencyLevel === 'critical' && "from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600",
                urgencyLevel === 'warning' && "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              )}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Renew via WhatsApp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
