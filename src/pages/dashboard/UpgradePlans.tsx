import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptionPlans } from '@/hooks/useSubscriptions';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getDiscountPercentage, 
  calculateDiscountedPrice, 
  getDiscountTierLabel,
  calculateAnnualWithVolumeDiscount,
  VOLUME_DISCOUNTS
} from '@/lib/pricing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, ChevronDown, HelpCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UpgradePlans() {
  const { data: subscriptionPlans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: currentSubscription } = useCurrentUserSubscription();
  const { isOwner } = useAuth();
  
  const [accountCount, setAccountCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [roiExpanded, setRoiExpanded] = useState(false);
  const [avgViews, setAvgViews] = useState(10000);
  const [cpmRate, setCpmRate] = useState(2);

  const activePlans = subscriptionPlans?.filter(p => p.is_active) || [];
  
  const proPlan = activePlans.find(p => p.id === 'pro');
  const yearlySavings = proPlan 
    ? calculateAnnualWithVolumeDiscount(proPlan.price_monthly, accountCount).totalSavingsYear
    : 0;

  const roiData = {
    monthlyEarnings: (avgViews * (cpmRate / 1000) * 30).toFixed(0),
    subscriptionCost: proPlan ? (proPlan.price_monthly * accountCount).toFixed(0) : '0',
    roi: proPlan ? (((avgViews * (cpmRate / 1000) * 30) / (proPlan.price_monthly * accountCount)) * 100).toFixed(0) : '0',
  };

  const planFeatures: Record<string, string[]> = {
    basic: ['2 videos per day', 'Basic scheduling', 'Email support'],
    pro: ['4 videos per day', 'Advanced scheduling', 'Priority support', 'Analytics dashboard'],
    scale: ['6 videos per day', 'Unlimited scheduling', 'Dedicated support', 'Advanced analytics', 'API access'],
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto py-8 px-4">
        {/* Back Button */}
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Subscription Plans</h1>
          <p className="text-muted-foreground text-lg">Scale your content automation effortlessly</p>
        </div>

        {/* Info Banner for non-owners */}
        {!isOwner && (
          <Alert className="mb-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Subscriptions are managed by your account administrator. Contact them to upgrade your plan or add more accounts.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Subscription Status */}
        {currentSubscription && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Your Current Plan</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold capitalize">{currentSubscription.plan?.name || currentSubscription.plan_id}</span>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                      {currentSubscription.account_count} accounts
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                      Active
                    </Badge>
                  </div>
                </div>
                {currentSubscription.expires_at && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="font-medium">{new Date(currentSubscription.expires_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingCycle === 'monthly' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingCycle === 'annual' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual · Save 20%
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {activePlans.map((plan) => {
            const isRecommended = plan.id === 'pro';
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const features = planFeatures[plan.id] || [];
            const price = billingCycle === 'annual' 
              ? (plan.price_monthly * 0.8).toFixed(0) 
              : plan.price_monthly;

            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${
                  isCurrentPlan 
                    ? 'border-emerald-500 shadow-lg' 
                    : isRecommended 
                      ? 'border-primary shadow-lg' 
                      : 'border-border'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Your Plan
                    </span>
                  </div>
                )}
                {!isCurrentPlan && isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-semibold capitalize">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.max_videos_per_day} videos per day
                  </p>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* No action buttons - subscriptions managed by owner */}
                  <div className="text-center text-sm text-muted-foreground py-3 border-t">
                    {isCurrentPlan ? 'Currently active' : 'Contact admin to subscribe'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Volume Discounts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Volume discounts</CardTitle>
            <p className="text-sm text-muted-foreground">Save more with multiple accounts</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Discount Tiers */}
            <div className="flex gap-2">
              {VOLUME_DISCOUNTS.map((tier) => {
                const rangeLabel = tier.maxAccounts === Infinity 
                  ? `${tier.minAccounts}+` 
                  : `${tier.minAccounts}-${tier.maxAccounts}`;
                const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
                
                return (
                  <div 
                    key={rangeLabel}
                    className={`flex-1 text-center py-3 px-2 rounded-lg border transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="text-sm font-medium">{rangeLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {tier.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Slider */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Number of accounts</span>
                <span className="font-medium">{accountCount}</span>
              </div>
              <Slider
                value={[accountCount]}
                onValueChange={(v) => setAccountCount(v[0])}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Pricing Summary */}
            {proPlan && (
              <div className="flex items-center justify-between py-4 px-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">{proPlan.name}</span>
                  <span className="text-muted-foreground"> × {accountCount} accounts</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ${(calculateDiscountedPrice(proPlan.price_monthly, accountCount) * accountCount).toFixed(2)}/mo
                  </div>
                  {getDiscountPercentage(accountCount) > 0 && (
                    <div className="text-sm text-emerald-600">
                      Save ${((proPlan.price_monthly * accountCount) - (calculateDiscountedPrice(proPlan.price_monthly, accountCount) * accountCount)).toFixed(2)}/mo
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Annual Savings */}
        {billingCycle === 'annual' && yearlySavings > 0 && (
          <div className="text-center mb-8">
            <p className="text-emerald-600 font-medium">
              Your annual savings: ${yearlySavings.toFixed(0)}
            </p>
          </div>
        )}

        {/* ROI Calculator */}
        <Collapsible open={roiExpanded} onOpenChange={setRoiExpanded}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Estimate potential earnings</CardTitle>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${roiExpanded ? 'rotate-180' : ''}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average views per video</span>
                      <span className="font-medium">{avgViews.toLocaleString()}</span>
                    </div>
                    <Slider
                      value={[avgViews]}
                      onValueChange={(v) => setAvgViews(v[0])}
                      min={1000}
                      max={100000}
                      step={1000}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPM rate ($)</span>
                      <span className="font-medium">${cpmRate.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[cpmRate]}
                      onValueChange={(v) => setCpmRate(v[0])}
                      min={0.5}
                      max={10}
                      step={0.25}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">${roiData.monthlyEarnings}</div>
                    <div className="text-sm text-muted-foreground">Est. monthly earnings</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">${roiData.subscriptionCost}</div>
                    <div className="text-sm text-muted-foreground">Subscription cost</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-600">{roiData.roi}%</div>
                    <div className="text-sm text-muted-foreground">Return on investment</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Estimates are based on YouTube Shorts monetization. Actual results may vary.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="billing">
                <AccordionTrigger className="text-left">How does billing work?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Billing is based on the number of accounts in your subscription. Your administrator 
                  assigns a plan with a specific number of accounts. Volume discounts are automatically 
                  applied for larger subscriptions.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="accounts">
                <AccordionTrigger className="text-left">How do account limits work?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Your subscription includes a set number of TikTok accounts you can add. Once assigned 
                  by your administrator, you can add accounts up to your limit. Need more? Contact your 
                  administrator to upgrade your subscription.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="upgrade">
                <AccordionTrigger className="text-left">How do I upgrade my plan?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Subscriptions are managed by your account administrator. Contact them to request 
                  a plan upgrade, add more accounts, or extend your subscription period.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="cancel">
                <AccordionTrigger className="text-left">Can subscriptions be cancelled?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes, administrators can cancel subscriptions at any time. When cancelled, access 
                  continues until the current subscription period ends.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="volume">
                <AccordionTrigger className="text-left">How do volume discounts work?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Volume discounts are automatically applied based on the number of accounts in your 
                  subscription: 3-5 accounts get 17% off, 6-10 accounts get 33% off, and 11+ accounts 
                  get 50% off the per-account price.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="payment">
                <AccordionTrigger className="text-left">What payment methods are accepted?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Payment is handled directly with your administrator. They can accept various 
                  payment methods based on your arrangement.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
