import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  CheckCircle2,
  Crown,
  Zap
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface BillingInfoCardProps {
  planName: string;
  status: string;
  startDate: Date;
  nextBillingDate: Date;
  daysRemaining: number | null;
  isOwner: boolean;
  isExpiringSoon: boolean;
}

export function BillingInfoCard({
  planName,
  status,
  startDate,
  nextBillingDate,
  daysRemaining,
  isOwner,
  isExpiringSoon
}: BillingInfoCardProps) {
  const totalDays = differenceInDays(nextBillingDate, startDate);
  const daysUsed = totalDays - (daysRemaining || 0);
  const progressPercentage = totalDays > 0 ? (daysUsed / totalDays) * 100 : 0;

  const statusConfig = {
    active: { label: 'Active', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    pending: { label: 'Pending', color: 'bg-amber-500', textColor: 'text-amber-500' },
    expired: { label: 'Expired', color: 'bg-red-500', textColor: 'text-red-500' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-500', textColor: 'text-gray-500' },
    Owner: { label: 'Owner', color: 'bg-amber-500', textColor: 'text-amber-500' },
  };

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 border-border/50">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
      
      <CardContent className="relative p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Plan & Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                {isOwner ? (
                  <Crown className="h-5 w-5 text-amber-500" />
                ) : (
                  <Zap className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Plan</p>
                <p className="text-lg font-bold">{planName}</p>
              </div>
            </div>
            <Badge 
              variant="secondary"
              className={cn(
                "mt-2",
                currentStatus.textColor,
                `bg-${currentStatus.color.replace('bg-', '')}/10`
              )}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {currentStatus.label}
            </Badge>
          </div>

          {/* Billing Period */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Billing Period</p>
                <p className="text-lg font-bold">{format(startDate, 'MMM d')} - {format(nextBillingDate, 'MMM d')}</p>
              </div>
            </div>
          </div>

          {/* Next Renewal */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                isExpiringSoon 
                  ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                  : "bg-gradient-to-br from-emerald-500/20 to-green-500/20"
              )}>
                <Clock className={cn(
                  "h-5 w-5",
                  isExpiringSoon ? "text-amber-500" : "text-emerald-500"
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Next Renewal</p>
                <p className="text-lg font-bold">
                  {isOwner ? 'Never' : format(nextBillingDate, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Days Remaining */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Cycle Progress</p>
              <p className="text-xs font-medium">
                {isOwner ? '∞' : `${daysRemaining || 0} days left`}
              </p>
            </div>
            {!isOwner && (
              <Progress 
                value={progressPercentage} 
                className={cn(
                  "h-2",
                  isExpiringSoon && "[&>div]:bg-amber-500"
                )}
              />
            )}
            {isOwner && (
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-amber-500/30 via-amber-500/50 to-amber-500/30" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
