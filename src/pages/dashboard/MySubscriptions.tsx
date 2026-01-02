import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { SubscriptionStatusBanner } from '@/components/subscriptions/SubscriptionStatusBanner';
import { SubscriptionTabs } from '@/components/subscriptions/SubscriptionTabs';
import { QuickActionsBar } from '@/components/subscriptions/QuickActionsBar';
import { MySubscriptionsSkeleton } from '@/components/subscriptions/MySubscriptionsSkeleton';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Crown, 
  Zap, 
  Users, 
  Video, 
  Calendar,
  TrendingUp,
  Shield
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { 
  generateGeneralWhatsAppLink, 
  generateUpgradeRequestWhatsAppLink
} from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

// Plan features
const planFeatures: Record<string, string[]> = {
  basic: [
    'Up to 5 TikTok accounts',
    '2 videos per day',
    'Basic scheduling',
    'Email support'
  ],
  pro: [
    'Up to 25 TikTok accounts',
    '10 videos per day',
    'Advanced scheduling',
    'Priority support',
    'Analytics dashboard'
  ],
  scale: [
    'Unlimited TikTok accounts',
    'Unlimited videos per day',
    'Custom scheduling rules',
    'Dedicated support',
    'Advanced analytics',
    'API access'
  ]
};

const ownerFeatures = [
  'Unlimited TikTok accounts',
  'Unlimited YouTube channels',
  'Full admin access',
  'User management',
  'All premium features'
];

const planGradients: Record<string, string> = {
  basic: 'from-blue-500 to-cyan-500',
  pro: 'from-purple-500 to-pink-500',
  scale: 'from-amber-500 to-orange-500',
  owner: 'from-yellow-500 to-amber-500'
};

const planIcons: Record<string, typeof Zap> = {
  basic: Shield,
  pro: Zap,
  scale: TrendingUp,
  owner: Crown
};

// Stat card component
function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  gradient,
  delay = 0 
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Zap;
  gradient: string;
  delay?: number;
}) {
  return (
    <div 
      className="relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-xl border border-border/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", gradient)} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br opacity-20",
          gradient
        )}>
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function MySubscriptions() {
  const { user, isOwner } = useAuth();
  const { data: subscription, isLoading: subLoading } = useCurrentUserSubscription();
  const { data: accounts = [], isLoading: accountsLoading } = useTikTokAccounts();
  const { data: limits, isLoading: limitsLoading } = useUserAccountLimits();

  const isLoading = subLoading || limitsLoading;

  useEffect(() => {
    document.title = "My Subscription | RepostFlow";
  }, []);

  // Calculate values
  const planId = isOwner ? 'owner' : (subscription?.plan?.id || 'basic');
  const planName = isOwner ? 'Owner' : (subscription?.plan?.name || 'Basic');
  const features = isOwner ? ownerFeatures : (planFeatures[planId] || planFeatures.basic);
  const PlanIcon = planIcons[planId] || Zap;
  const gradient = planGradients[planId] || planGradients.basic;
  
  const usedAccounts = limits?.currentTikTokAccounts || 0;
  const maxAccounts = limits?.maxTikTokAccounts || 0;
  const isUnlimited = limits?.isUnlimited || false;
  
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const daysRemaining = expiresAt ? Math.max(0, differenceInDays(expiresAt, new Date())) : null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 14;

  const handleContactSupport = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const handleRequestUpgrade = () => {
    if (!subscription?.plan) return;
    const link = generateUpgradeRequestWhatsAppLink({
      currentPlanName: subscription.plan.name,
      currentAccountCount: limits?.maxTikTokAccounts || 1,
      userEmail: user?.email
    });
    window.open(link, '_blank');
  };

  if (isLoading) {
    return (
      <DashboardLayout title="My Subscription" description="Manage your subscription and account usage">
        <div className="space-y-8">
          <MySubscriptionsSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Subscription" description="Manage your subscription and account usage">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              My Subscription
              <Badge className={cn(
                "bg-gradient-to-r text-white border-0 shadow-lg",
                gradient
              )}>
                <PlanIcon className="h-3 w-3 mr-1" />
                {planName}
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">Manage your subscription and account usage</p>
          </div>
          <QuickActionsBar 
            canAddAccount={limits?.canAddTikTokAccount || false}
            isOwner={isOwner}
          />
        </div>

        {/* Status Banner */}
        <SubscriptionStatusBanner />

        {/* Stats Grid */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Plan"
            value={planName}
            subtitle={isOwner ? "Unlimited" : undefined}
            icon={PlanIcon}
            gradient={gradient}
            delay={0}
          />
          <StatCard
            title="Accounts"
            value={isUnlimited ? '∞' : `${usedAccounts}/${maxAccounts}`}
            subtitle={isUnlimited ? 'Unlimited' : `${maxAccounts - usedAccounts} left`}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
            delay={100}
          />
          <StatCard
            title="Videos"
            value={accounts.reduce((sum, acc) => sum + (acc.video_count || 0), 0)}
            subtitle="Total scraped"
            icon={Video}
            gradient="from-emerald-500 to-green-500"
            delay={200}
          />
          <StatCard
            title="Renewal"
            value={isUnlimited ? '∞' : (daysRemaining ?? '—')}
            subtitle={isUnlimited ? 'Never' : 'days left'}
            icon={Calendar}
            gradient={isExpiringSoon ? 'from-red-500 to-rose-500' : 'from-amber-500 to-orange-500'}
            delay={300}
          />
        </div>

        {/* Tabbed Content */}
        <SubscriptionTabs
          subscription={subscription}
          limits={limits}
          accounts={accounts}
          accountsLoading={accountsLoading}
          isOwner={isOwner}
          planId={planId}
          planName={planName}
          gradient={gradient}
          features={features}
          PlanIcon={PlanIcon}
          daysRemaining={daysRemaining}
          expiresAt={expiresAt}
          isExpiringSoon={isExpiringSoon}
          usedAccounts={usedAccounts}
          maxAccounts={maxAccounts}
          isUnlimited={isUnlimited}
          onContactSupport={handleContactSupport}
          onRequestUpgrade={handleRequestUpgrade}
        />
      </div>
    </DashboardLayout>
  );
}
