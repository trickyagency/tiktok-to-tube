import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Crown, Zap, Rocket, Clock, XCircle } from 'lucide-react';

interface SubscriptionBadgeProps {
  planId?: string | null;
  status?: string | null;
  size?: 'sm' | 'default';
}

const planConfig = {
  basic: {
    label: 'Basic',
    icon: Zap,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20',
  },
  pro: {
    label: 'Pro',
    icon: Crown,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
  },
  scale: {
    label: 'Scale',
    icon: Rocket,
    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20',
  },
};

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  expired: {
    label: 'Expired',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-muted text-muted-foreground border-muted',
  },
};

export function SubscriptionBadge({ planId, status, size = 'default' }: SubscriptionBadgeProps) {
  // No subscription
  if (!planId && !status) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          'border-dashed text-muted-foreground',
          size === 'sm' && 'text-xs px-1.5 py-0'
        )}
      >
        No Plan
      </Badge>
    );
  }

  // Show status badge if not active
  if (status && status !== 'active') {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (config) {
      const Icon = config.icon;
      return (
        <Badge 
          variant="outline" 
          className={cn(
            config.className,
            size === 'sm' && 'text-xs px-1.5 py-0'
          )}
        >
          <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          {config.label}
        </Badge>
      );
    }
  }

  // Active subscription - show plan badge
  if (planId) {
    const config = planConfig[planId as keyof typeof planConfig];
    if (config) {
      const Icon = config.icon;
      return (
        <Badge 
          variant="outline" 
          className={cn(
            config.className,
            size === 'sm' && 'text-xs px-1.5 py-0'
          )}
        >
          <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          {config.label}
        </Badge>
      );
    }
  }

  return null;
}
