import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptionPlans } from '@/hooks/useSubscriptions';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { 
  calculateDiscountedPrice, 
  calculateTotalPrice, 
  calculateSavings, 
  getDiscountTierName,
  getDiscountPercentage,
  getNextTierInfo,
  getVolumeDiscount,
  VOLUME_DISCOUNTS 
} from '@/lib/pricing';
import { generateGeneralWhatsAppLink, openWhatsApp } from '@/lib/whatsapp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadialProgress } from '@/components/subscriptions/RadialProgress';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Check, 
  Crown, 
  MessageCircle, 
  Sparkles, 
  TrendingUp,
  Users,
  Video,
  Star,
  Clock,
  Shield,
  Percent,
  ArrowRight,
  Zap,
  HelpCircle,
  ChevronRight,
  Target,
  Rocket
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

// Tier color configurations
const tierColors: Record<string, { gradient: string; border: string; badge: string; check: string; bg: string }> = {
  basic: {
    gradient: 'from-blue-500 to-cyan-500',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    check: 'text-blue-500',
    bg: 'from-blue-500/5 to-cyan-500/5'
  },
  pro: {
    gradient: 'from-purple-500 to-pink-500',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    check: 'text-purple-500',
    bg: 'from-purple-500/5 to-pink-500/5'
  },
  scale: {
    gradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    check: 'text-amber-500',
    bg: 'from-amber-500/5 to-orange-500/5'
  },
  agency: {
    gradient: 'from-purple-600 to-indigo-600',
    border: 'border-purple-600/20',
    badge: 'bg-purple-600/10 text-purple-700 border-purple-600/30',
    check: 'text-purple-600',
    bg: 'from-purple-600/5 to-indigo-600/5'
  }
};

// Plan features for display
const planFeatures: Record<string, string[]> = {
  basic: [
    'Up to 5 TikTok accounts',
    '2 videos per day',
    'Basic scheduling',
    'Email support'
  ],
  pro: [
    'Up to 15 TikTok accounts',
    '4 videos per day',
    'Advanced scheduling',
    'Priority support',
    'Analytics dashboard'
  ],
  scale: [
    'Up to 30 TikTok accounts',
    '6 videos per day',
    'Bulk operations',
    'Dedicated support',
    'Advanced analytics'
  ],
  agency: [
    'Unlimited accounts',
    'Custom videos per day',
    'White-label options',
    'Account manager',
    'Custom integrations'
  ]
};

// Feature comparison data
const featureComparison = [
  { feature: 'TikTok Accounts', basic: '5', pro: '15', scale: '30', agency: 'Unlimited' },
  { feature: 'Videos per Day', basic: '2', pro: '4', scale: '6', agency: 'Custom' },
  { feature: 'YouTube Channels', basic: '3', pro: '10', scale: '25', agency: 'Unlimited' },
  { feature: 'Scheduling', basic: true, pro: true, scale: true, agency: true },
  { feature: 'Analytics Dashboard', basic: false, pro: true, scale: true, agency: true },
  { feature: 'Priority Support', basic: false, pro: true, scale: true, agency: true },
  { feature: 'Bulk Operations', basic: false, pro: false, scale: true, agency: true },
  { feature: 'API Access', basic: false, pro: false, scale: false, agency: true },
  { feature: 'White Label', basic: false, pro: false, scale: false, agency: true },
];

// FAQ data
const faqItems = [
  {
    value: 'billing',
    question: 'How does billing work?',
    answer: 'You can choose between monthly or annual billing. Annual billing saves you 25% compared to monthly payments. Your subscription renews automatically unless cancelled.'
  },
  {
    value: 'upgrade',
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes! You can upgrade at any time and the difference will be prorated. Downgrades take effect at the end of your current billing period.'
  },
  {
    value: 'volume',
    question: 'How do volume discounts work?',
    answer: 'The more accounts you add, the more you save. Starting at 5 accounts you get 10% off, scaling up to 40% off for 25+ accounts. These discounts stack with annual billing savings.'
  },
  {
    value: 'trial',
    question: 'Is there a free trial?',
    answer: 'Contact us on WhatsApp to discuss trial options for your specific needs. We offer flexible arrangements for serious creators.'
  },
  {
    value: 'cancel',
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time. You\'ll retain access until the end of your current billing period.'
  }
];

// Trust stats
const trustStats = [
  { icon: Users, value: '1,000+', label: 'Active Users', color: 'text-blue-500' },
  { icon: Video, value: '50,000+', label: 'Videos Uploaded', color: 'text-pink-500' },
  { icon: Star, value: '4.9/5', label: 'User Rating', color: 'text-amber-500' },
  { icon: Clock, value: '99.9%', label: 'Uptime', color: 'text-emerald-500' },
];

// Premium Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-8">
    <div className="rounded-2xl border border-border/50 p-8 bg-muted/20">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-12 w-96 mx-auto" />
        <Skeleton className="h-6 w-80 mx-auto" />
      </div>
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/50 to-transparent animate-pulse" />
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-24 mx-auto" />
            <Skeleton className="h-10 w-32 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default function UpgradePlans() {
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: currentSubscription, isLoading: subLoading } = useCurrentUserSubscription();
  const { isOwner, user } = useAuth();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [accountCounts, setAccountCounts] = useState<Record<string, number>>({
    basic: 3,
    pro: 10,
    scale: 20,
    agency: 30
  });
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const [selectedPlanForCta, setSelectedPlanForCta] = useState<string>('pro');

  // ROI Calculator state
  const [roiAccountCount, setRoiAccountCount] = useState(10);
  const [roiAvgViews, setRoiAvgViews] = useState(10000);
  const [roiCpmRate, setRoiCpmRate] = useState(1.5);
  const [roiSelectedPlan, setRoiSelectedPlan] = useState<string>('pro');

  // Handle scroll for sticky footer
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyFooter(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activePlans = useMemo(() => 
    plans?.filter(p => p.is_active) || [], 
    [plans]
  );

  // Calculate savings for display
  const getSavingsInfo = (planId: string, count: number) => {
    const plan = activePlans.find(p => p.id === planId);
    if (!plan) return null;
    
    const isAnnual = billingCycle === 'annual';
    const basePrice = plan.price_monthly || 0;
    const volumeDiscount = getVolumeDiscount(count);
    const discountedPrice = calculateDiscountedPrice(basePrice, count);
    const annualMultiplier = isAnnual ? 0.75 : 1; // 25% off for annual
    const pricePerAccount = discountedPrice * annualMultiplier;
    const totalCharge = calculateTotalPrice(basePrice, count) * annualMultiplier;
    const totalSavings = calculateSavings(basePrice, count) + (isAnnual ? calculateTotalPrice(basePrice, count) * 0.25 : 0);
    const discountTier = VOLUME_DISCOUNTS.find(t => count >= t.minAccounts && count <= t.maxAccounts);
    
    return {
      pricePerAccount,
      totalCharge,
      totalSavings,
      discountTier,
      originalPrice: basePrice * count
    };
  };

  // ROI Calculator data
  const roiData = useMemo(() => {
    const plan = activePlans.find(p => p.id === roiSelectedPlan);
    if (!plan) return null;
    
    const isAnnual = billingCycle === 'annual';
    const basePrice = plan.price_monthly || 0;
    const annualMultiplier = isAnnual ? 0.75 : 1;
    const monthlyCost = calculateTotalPrice(basePrice, roiAccountCount) * annualMultiplier;
    
    // Calculate based on daily video uploads per plan
    const dailyVideos = plan.max_videos_per_day || 2;
    const monthlyVideos = dailyVideos * 30 * roiAccountCount;
    const totalMonthlyViews = monthlyVideos * roiAvgViews;
    const estimatedEarnings = (totalMonthlyViews / 1000) * roiCpmRate;
    
    const profit = estimatedEarnings - monthlyCost;
    const roi = monthlyCost > 0 ? Math.round((profit / monthlyCost) * 100) : 0;
    
    return {
      monthlyCost,
      estimatedEarnings: Math.round(estimatedEarnings),
      profit: Math.round(profit),
      roi,
      dailyVideos,
      monthlyVideos
    };
  }, [activePlans, roiSelectedPlan, roiAccountCount, roiAvgViews, roiCpmRate, billingCycle]);

  // Current subscription info
  const currentPlanInfo = useMemo(() => {
    if (!currentSubscription) return null;
    
    const expiresAt = currentSubscription.expires_at ? new Date(currentSubscription.expires_at) : null;
    const now = new Date();
    const daysRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    
    return {
      planName: currentSubscription.plan?.name || 'Unknown',
      planId: currentSubscription.plan?.id || currentSubscription.plan_id || '',
      accountLimit: currentSubscription.account_count || 0,
      status: currentSubscription.status,
      daysRemaining,
      expiresAt
    };
  }, [currentSubscription]);

  // WhatsApp handlers
  const handleContactWhatsApp = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const handleSelectPlan = (planId: string, count: number) => {
    const plan = activePlans.find(p => p.id === planId);
    if (!plan) return;
    
    const savings = getSavingsInfo(planId, count);
    const message = `Hi! I'm interested in the ${plan.name} plan with ${count} accounts (${billingCycle} billing). ${savings ? `Total: $${savings.totalCharge.toFixed(2)}/month` : ''}`;
    openWhatsApp(message);
  };

  if (plansLoading || subLoading) {
    return (
      <DashboardLayout 
        title="Upgrade Your Plan" 
        description="Choose the perfect plan for your content empire"
      >
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Upgrade Your Plan" 
      description="Choose the perfect plan for your content empire"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back Button */}
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600/10 via-pink-500/5 to-blue-500/10 border border-border/50 p-8 md:p-12">
          <div className="absolute top-8 right-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-8 left-8 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Scale Your Content Empire</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Perfect Plan</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Automate your TikTok to YouTube Shorts workflow with powerful scheduling, analytics, and volume discounts up to 40%
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {trustStats.map((stat, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                  <span className="font-medium">{stat.value}</span>
                  <span className="text-muted-foreground hidden sm:inline">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Non-owner Alert */}
        {!isOwner && (
          <Alert>
            <AlertDescription>
              Contact the account owner to upgrade your subscription plan.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Subscription Banner */}
        {currentPlanInfo && currentPlanInfo.status === 'active' && (
          <Card className="relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50">
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
              tierColors[currentPlanInfo.planId]?.gradient || 'from-primary to-primary'
            )} />
            
            <CardContent className="py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                    tierColors[currentPlanInfo.planId]?.bg || 'from-primary/20 to-primary/20'
                  )}>
                    <Crown className={cn(
                      "h-7 w-7",
                      tierColors[currentPlanInfo.planId]?.check || 'text-primary'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Current Plan</p>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold capitalize">{currentPlanInfo.planName}</span>
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentPlanInfo.accountLimit} accounts included
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <RadialProgress 
                      value={currentPlanInfo.daysRemaining} 
                      max={30} 
                      size={56}
                      strokeWidth={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">days left</p>
                  </div>
                  <Link to="/dashboard/my-subscriptions">
                    <Button variant="outline" size="sm" className="gap-2">
                      Manage
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Toggle */}
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1.5 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-300",
                billingCycle === 'monthly' 
                  ? 'bg-background text-foreground shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn(
                "px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2",
                billingCycle === 'annual' 
                  ? 'bg-background text-foreground shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Annual
              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 border-0">
                Save 25%
              </Badge>
            </button>
          </div>
          {billingCycle === 'annual' && (
            <p className="text-sm text-emerald-600 animate-in fade-in duration-300">
              Save up to 40% with volume + annual discounts combined!
            </p>
          )}
        </div>

        {/* Plan Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {activePlans.map((plan, index) => {
            const planId = plan.id || plan.name.toLowerCase();
            const count = accountCounts[planId] || 5;
            const savings = getSavingsInfo(planId, count);
            const isRecommended = planId === 'pro';
            const isCurrentPlan = currentPlanInfo?.planId === planId;
            const colors = tierColors[planId] || tierColors.basic;
            const features = planFeatures[planId] || plan.features || [];
            
            return (
              <Card 
                key={plan.id}
                className={cn(
                  "group relative flex flex-col transition-all duration-300",
                  "bg-card/80 backdrop-blur-xl border-border/50",
                  "hover:shadow-2xl hover:-translate-y-1",
                  isRecommended && "ring-2 ring-purple-500 shadow-xl shadow-purple-500/10",
                  isCurrentPlan && "ring-2 ring-emerald-500"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isRecommended && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="relative bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-purple-500/30">
                      <Sparkles className="inline h-3 w-3 mr-1" />
                      Most Popular
                    </span>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                
                <CardHeader className={cn("text-center pb-4", (isRecommended || isCurrentPlan) && "pt-8")}>
                  <div className={cn(
                    "h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br",
                    colors.bg
                  )}>
                    {planId === 'agency' ? (
                      <Crown className={cn("h-6 w-6", colors.check)} />
                    ) : planId === 'scale' ? (
                      <Rocket className={cn("h-6 w-6", colors.check)} />
                    ) : planId === 'pro' ? (
                      <Zap className={cn("h-6 w-6", colors.check)} />
                    ) : (
                      <Target className={cn("h-6 w-6", colors.check)} />
                    )}
                  </div>
                  
                  <CardTitle className="text-xl capitalize">{plan.name}</CardTitle>
                  
                  <div className="mt-2">
                    {savings && (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold">${savings.totalCharge.toFixed(0)}</span>
                          <span className="text-muted-foreground">/mo</span>
                        </div>
                        {savings.totalSavings > 0 && (
                          <Badge className="mt-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Save ${savings.totalSavings.toFixed(0)}/mo
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-6 p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Accounts</span>
                      <Badge variant="outline" className={cn("font-semibold", colors.badge)}>
                        {count} accounts
                      </Badge>
                    </div>
                    <Slider
                      value={[count]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={([value]) => {
                        setAccountCounts(prev => ({ ...prev, [planId]: value }));
                        setSelectedPlanForCta(planId);
                      }}
                      className="mb-2"
                    />
                    {savings?.discountTier && savings.discountTier.discount > 0 && (
                      <p className="text-xs text-emerald-600 font-medium">
                        {savings.discountTier.label} applied!
                      </p>
                    )}
                  </div>
                  
                  <ul className="space-y-2 mb-6 flex-1">
                    {(Array.isArray(features) ? features : []).slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className={cn("h-4 w-4 mt-0.5 shrink-0", colors.check)} />
                        <span>{typeof feature === 'string' ? feature : ''}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handleSelectPlan(planId, count)}
                    className={cn(
                      "w-full gap-2",
                      isRecommended && "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    )}
                    variant={isRecommended ? "default" : "outline"}
                  >
                    {isCurrentPlan ? 'Modify Plan' : 'Get Started'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Savings Calculator */}
        <Card className="overflow-hidden bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold">Your Savings Breakdown</h3>
                <p className="text-sm text-muted-foreground">See how much you save with Pro plan at {accountCounts.pro} accounts</p>
              </div>
            </div>
            
            {(() => {
              const savings = getSavingsInfo('pro', accountCounts.pro);
              if (!savings) return null;
              
              return (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-background/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Standard Price</p>
                    <p className="text-lg font-semibold line-through text-muted-foreground">
                      ${savings.originalPrice.toFixed(0)}/mo
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Volume Discount</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {savings.discountTier?.label || 'None'}
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">
                      {billingCycle === 'annual' ? 'Annual Discount' : 'Switch to Annual'}
                    </p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {billingCycle === 'annual' ? '25% Off' : 'Save 25%'}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                    <p className="text-xs text-muted-foreground mb-1">Your Price</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${savings.totalCharge.toFixed(0)}/mo
                    </p>
                    {savings.totalSavings > 0 && (
                      <Badge className="mt-1 bg-emerald-500 text-white border-0">
                        Save ${(savings.totalSavings * 12).toFixed(0)}/year
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Social Proof */}
        <div className="py-6">
          <h3 className="text-lg font-semibold text-center mb-6">Trusted by Content Creators Worldwide</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trustStats.map((stat, i) => (
              <Card key={i} className="text-center p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <stat.icon className={cn("h-8 w-8 mx-auto mb-3", stat.color)} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Feature Comparison Table */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg font-semibold">Compare All Features</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="min-w-[200px] font-semibold">Feature</TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <span className="text-blue-500 font-semibold">Basic</span>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] bg-purple-500/5">
                      <span className="text-purple-500 font-semibold">Pro</span>
                      <Badge className="ml-1 text-[10px] bg-purple-500/20 text-purple-600 border-purple-500/30">Popular</Badge>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <span className="text-amber-500 font-semibold">Scale</span>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <span className="text-purple-600 font-semibold">Agency</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureComparison.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{row.feature}</TableCell>
                      {(['basic', 'pro', 'scale', 'agency'] as const).map((plan) => (
                        <TableCell 
                          key={plan} 
                          className={cn("text-center", plan === 'pro' && "bg-purple-500/5")}
                        >
                          {row[plan] === true ? (
                            <Check className={cn("h-5 w-5 mx-auto", tierColors[plan].check)} />
                          ) : row[plan] === false ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="text-sm font-medium">{row[plan]}</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ROI Calculator */}
        <Card className="overflow-hidden bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-border/50">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">ROI Calculator</CardTitle>
                <CardDescription>Estimate your potential earnings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">Select Plan</label>
                  <div className="flex flex-wrap gap-2">
                    {activePlans.map(plan => {
                      const planId = plan.id || plan.name.toLowerCase();
                      return (
                        <Button
                          key={plan.id}
                          variant={roiSelectedPlan === planId ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRoiSelectedPlan(planId)}
                          className={cn(
                            roiSelectedPlan === planId && `bg-gradient-to-r ${tierColors[planId]?.gradient || 'from-primary to-primary'}`
                          )}
                        >
                          {plan.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Accounts</label>
                    <span className="text-sm text-muted-foreground">{roiAccountCount}</span>
                  </div>
                  <Slider
                    value={[roiAccountCount]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={([value]) => setRoiAccountCount(value)}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Avg Views/Video</label>
                    <span className="text-sm text-muted-foreground">{roiAvgViews.toLocaleString()}</span>
                  </div>
                  <Slider
                    value={[roiAvgViews]}
                    min={1000}
                    max={200000}
                    step={1000}
                    onValueChange={([value]) => setRoiAvgViews(value)}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">CPM Rate ($)</label>
                    <span className="text-sm text-muted-foreground">${roiCpmRate}</span>
                  </div>
                  <Slider
                    value={[roiCpmRate]}
                    min={0.5}
                    max={10}
                    step={0.5}
                    onValueChange={([value]) => setRoiCpmRate(value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <defs>
                      <linearGradient id="roiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(280, 100%, 60%)" />
                      </linearGradient>
                    </defs>
                    <circle 
                      cx="80" 
                      cy="80" 
                      r="70" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      className="text-muted" 
                    />
                    <circle 
                      cx="80" 
                      cy="80" 
                      r="70" 
                      fill="none" 
                      stroke="url(#roiGradient)" 
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 70}
                      strokeDashoffset={2 * Math.PI * 70 * (1 - Math.min((roiData?.roi || 0) / 500, 1))}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-emerald-500">{roiData?.roi || 0}%</span>
                    <span className="text-sm text-muted-foreground">ROI</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl">
                  <span className="text-sm text-muted-foreground">Videos/Month</span>
                  <span className="text-sm font-medium">{roiData?.monthlyVideos.toLocaleString() || 0} ({roiData?.dailyVideos || 0}/day)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl">
                  <span className="text-sm text-muted-foreground">Monthly Cost</span>
                  <span className="text-lg font-bold">${roiData?.monthlyCost.toFixed(0) || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl">
                  <span className="text-sm text-muted-foreground">Est. Earnings</span>
                  <span className="text-lg font-bold text-blue-500">${roiData?.estimatedEarnings.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <span className="text-sm text-muted-foreground">Est. Profit</span>
                  <span className="text-2xl font-bold text-emerald-500">${roiData?.profit.toLocaleString() || 0}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t border-border/50">
                * Based on {roiData?.dailyVideos || 2} videos/day × 30 days. CPM varies by niche ($0.5-$3 typical).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Volume Discounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Percent className="h-5 w-5 text-emerald-500" />
              Volume Discounts
            </CardTitle>
            <CardDescription>The more accounts you add, the more you save</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${Math.min((accountCounts.pro / 25) * 100, 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between mt-4">
                {VOLUME_DISCOUNTS.map((tier) => {
                  const isActive = accountCounts.pro >= tier.minAccounts;
                  return (
                    <div key={tier.tier} className="text-center">
                      <div className={cn(
                        "h-4 w-4 rounded-full mx-auto mb-2 border-2 transition-all",
                        isActive 
                          ? "bg-primary border-primary" 
                          : "bg-background border-muted"
                      )} />
                      <p className="text-xs font-medium">{tier.minAccounts}+ accounts</p>
                      <p className={cn(
                        "text-xs",
                        tier.discount > 0 ? "text-emerald-500 font-semibold" : "text-muted-foreground"
                      )}>
                        {tier.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem key={item.value} value={item.value} className="border-b border-border/50">
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-medium">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-muted-foreground mb-3">Still have questions?</p>
              <Button onClick={handleContactWhatsApp} variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat with us on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Contact Banner */}
        <Card className="overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <MessageCircle className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-400 rounded-full animate-ping" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Need Personalized Help?</h3>
                  <p className="text-sm text-muted-foreground">
                    Chat with us on WhatsApp - typically replies in &lt; 5 minutes
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleContactWhatsApp}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Chat on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky CTA Footer */}
      {showStickyFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 py-3 px-4 animate-in slide-in-from-bottom duration-300">
          <div className="container max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge className={cn("capitalize", tierColors[selectedPlanForCta]?.badge)}>
                {selectedPlanForCta}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {accountCounts[selectedPlanForCta]} accounts
              </span>
              <span className="text-lg font-bold">
                ${getSavingsInfo(selectedPlanForCta, accountCounts[selectedPlanForCta])?.totalCharge.toFixed(0) || 0}/mo
              </span>
            </div>
            <Button 
              onClick={() => handleSelectPlan(selectedPlanForCta, accountCounts[selectedPlanForCta])}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
              
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
