import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SubscriptionStatusBanner } from '@/components/subscriptions/SubscriptionStatusBanner';
import { SubscriptionHistoryCard } from '@/components/subscriptions/SubscriptionHistoryCard';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CreditCard, 
  Calendar, 
  Users, 
  Zap, 
  CheckCircle, 
  MessageCircle,
  Crown,
  Package,
  ArrowUpRight,
  Phone,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { 
  generateGeneralWhatsAppLink, 
  generateUpgradeRequestWhatsAppLink, 
  generateRenewalWhatsAppLink,
  WHATSAPP_DISPLAY 
} from '@/lib/whatsapp';

// Plan features for display
const planFeatures: Record<string, string[]> = {
  basic: [
    'Up to 2 videos per day',
    'Basic scheduling',
    'Standard processing'
  ],
  pro: [
    'Up to 4 videos per day',
    'Advanced SEO optimization',
    'Auto scheduling',
    'Priority processing'
  ],
  scale: [
    'Up to 10 videos per day',
    'Full automation',
    'Dedicated support',
    'Custom integrations'
  ]
};

const planIcons: Record<string, typeof Package> = {
  basic: Package,
  pro: Zap,
  scale: Crown
};

export default function MySubscriptions() {
  const { data: accounts, isLoading: accountsLoading } = useTikTokAccounts();
  const { data: subscription, isLoading: subscriptionLoading } = useCurrentUserSubscription();
  const { data: limits, isLoading: limitsLoading } = useUserAccountLimits();
  const { user, isOwner } = useAuth();

  const isLoading = accountsLoading || subscriptionLoading || limitsLoading;

  useEffect(() => {
    document.title = "My Subscription | RepostFlow";
  }, []);

  const handleWhatsAppContact = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const handleUpgradeRequest = () => {
    if (!subscription?.plan) return;
    
    const link = generateUpgradeRequestWhatsAppLink({
      currentPlanName: subscription.plan.name,
      currentAccountCount: limits?.maxTikTokAccounts || 1,
      userEmail: user?.email
    });
    window.open(link, '_blank');
  };

  const handleRenewalRequest = () => {
    if (!subscription?.plan) return;
    
    const link = generateRenewalWhatsAppLink({
      planName: subscription.plan.name,
      accountCount: limits?.maxTikTokAccounts || 1,
      expiryDate: subscription.expires_at 
        ? format(new Date(subscription.expires_at), 'MMMM d, yyyy') 
        : undefined,
      userEmail: user?.email
    });
    window.open(link, '_blank');
  };

  // Calculate days remaining until expiry
  const daysRemaining = subscription?.expires_at 
    ? differenceInDays(new Date(subscription.expires_at), new Date())
    : null;

  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 14 && daysRemaining >= 0;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  // Usage calculation
  const usedAccounts = limits?.currentTikTokAccounts || 0;
  const maxAccounts = limits?.maxTikTokAccounts || 1;
  const usagePercentage = Math.min((usedAccounts / maxAccounts) * 100, 100);
  const remainingSlots = Math.max(maxAccounts - usedAccounts, 0);

  const planId = subscription?.plan_id || 'basic';
  const PlanIcon = planIcons[planId] || Package;
  const features = planFeatures[planId] || planFeatures.basic;

  // Determine subscription status for display
  const getStatusBadge = () => {
    if (isOwner) {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Crown className="h-3 w-3 mr-1" />Owner Access</Badge>;
    }
    if (!subscription) {
      return <Badge variant="destructive">No Subscription</Badge>;
    }
    if (subscription.status === 'pending') {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    if (subscription.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (subscription.status === 'active') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    }
    return null;
  };

  return (
    <DashboardLayout title="My Subscription" description="View your subscription details and account usage">
      <div className="space-y-6">
        {/* Subscription Status Banner */}
        <SubscriptionStatusBanner />

        {/* Expiring Soon Warning */}
        {isExpiringSoon && subscription && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">
              Subscription Expiring Soon
            </AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-muted-foreground">
                Your subscription expires in <span className="font-medium text-foreground">{daysRemaining} days</span>. 
                Renew now to avoid service interruption.
              </p>
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                onClick={handleRenewalRequest}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Renew via WhatsApp
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current Plan Card */}
          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your subscription details and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  {/* Plan Name & Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <PlanIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{subscription?.plan?.name || 'No Plan'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {maxAccounts} account{maxAccounts !== 1 ? 's' : ''} included
                        </p>
                      </div>
                    </div>
                    {getStatusBadge()}
                  </div>

                  {/* Expiry Date */}
                  {subscription?.expires_at && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="text-muted-foreground">Expires: </span>
                        <span className="font-medium">
                          {format(new Date(subscription.expires_at), 'MMMM d, yyyy')}
                        </span>
                        {daysRemaining !== null && daysRemaining >= 0 && (
                          <span className={`ml-2 ${isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            ({daysRemaining} days remaining)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Features List */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Features</h4>
                    <ul className="space-y-2">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Upgrade Button */}
                  {subscription && subscription.status === 'active' && !isOwner && (
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={handleUpgradeRequest}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Request Upgrade
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Account Usage Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Account Usage
              </CardTitle>
              <CardDescription>
                TikTok accounts in your subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-bold">{usedAccounts}</span>
                      <span className="text-muted-foreground"> / {isOwner ? '∞' : maxAccounts}</span>
                    </div>
                    {!isOwner && (
                      <span className="text-sm text-muted-foreground">
                        {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
                      </span>
                    )}
                  </div>
                  
                  {!isOwner && (
                    <Progress value={usagePercentage} className="h-2" />
                  )}

                  {usagePercentage >= 100 && !isOwner && (
                    <Alert className="border-amber-500/30 bg-amber-500/5">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-sm">
                        You've reached your account limit. Upgrade to add more accounts.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Need Help Card */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <MessageCircle className="h-5 w-5" />
                Need Help?
              </CardTitle>
              <CardDescription>
                Contact us via WhatsApp for any questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{WHATSAPP_DISPLAY}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleWhatsAppContact}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                {subscription?.status === 'active' && !isOwner && (
                  <Button 
                    variant="outline" 
                    className="flex-1 border-green-500/50 text-green-600 hover:bg-green-500/10"
                    onClick={handleUpgradeRequest}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Request Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription History */}
        <SubscriptionHistoryCard />

        {/* TikTok Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your TikTok Accounts
            </CardTitle>
            <CardDescription>
              {accounts?.length || 0} account{(accounts?.length || 0) !== 1 ? 's' : ''} connected
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : accounts?.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No TikTok Accounts</h3>
                <p className="text-muted-foreground mb-4">
                  Add a TikTok account to get started
                </p>
                <Button variant="outline" asChild>
                  <Link to="/dashboard/tiktok">Add TikTok Account</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts?.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={account.avatar_url || undefined} alt={account.username} />
                      <AvatarFallback>{account.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {account.display_name || account.username}
                      </p>
                      <p className="text-xs text-muted-foreground">@{account.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
