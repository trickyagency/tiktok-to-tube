import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptionPlans } from '@/hooks/useSubscriptions';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getDiscountPercentage, 
  calculateDiscountedPrice, 
  getDiscountTierLabel,
  getNextTierInfo,
  calculateAnnualWithVolumeDiscount,
  VOLUME_DISCOUNTS,
  ANNUAL_DISCOUNT
} from '@/lib/pricing';
import { 
  generateGeneralWhatsAppLink, 
  generateSwitchPlanWhatsAppLink, 
  generateVolumeDiscountWhatsAppLink 
} from '@/lib/whatsapp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, ChevronDown, HelpCircle, Info, MessageCircle, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  max_videos_per_day: number;
  features: any;
  is_active: boolean;
}

export default function UpgradePlans() {
  const { data: subscriptionPlans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: currentSubscription } = useCurrentUserSubscription();
  const { isOwner, user } = useAuth();
  
  // Single account count input for all plans
  const [accountCount, setAccountCount] = useState<number>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [roiExpanded, setRoiExpanded] = useState(false);
  const [avgViews, setAvgViews] = useState(10000);
  const [cpmRate, setCpmRate] = useState(2);

  const activePlans = subscriptionPlans?.filter(p => p.is_active) || [];
  const selectedPlan = activePlans.find(p => p.id === selectedPlanId) || activePlans.find(p => p.id === 'pro');

  // Calculate pricing for selected plan
  const pricingData = useMemo(() => {
    if (!selectedPlan) return null;
    
    const basePrice = selectedPlan.price_monthly;
    const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
    const discountPercentage = getDiscountPercentage(accountCount);
    const annualData = calculateAnnualWithVolumeDiscount(basePrice, accountCount);
    
    return {
      basePrice,
      discountedPrice,
      discountPercentage,
      totalMonthly: discountedPrice * accountCount,
      annualPerAccountPerMonth: annualData.annualPerAccountPerMonth,
      totalAnnualYear: annualData.totalAnnualYear,
      totalSavingsYear: annualData.totalSavingsYear,
    };
  }, [selectedPlan, accountCount]);

  // ROI calculation
  const roiData = useMemo(() => {
    if (!selectedPlan || !pricingData) return { monthlyEarnings: '0', subscriptionCost: '0', profit: '0', roi: '0' };
    
    const videosPerDay = selectedPlan.max_videos_per_day;
    const monthlyVideos = videosPerDay * 30 * accountCount;
    const monthlyViews = monthlyVideos * avgViews;
    const monthlyEarnings = (monthlyViews / 1000) * cpmRate;
    
    const monthlySubscriptionCost = pricingData.totalMonthly;
    
    const profit = monthlyEarnings - monthlySubscriptionCost;
    const roi = monthlySubscriptionCost > 0 
      ? ((profit / monthlySubscriptionCost) * 100) 
      : 0;
    
    return {
      monthlyEarnings: monthlyEarnings.toFixed(0),
      subscriptionCost: monthlySubscriptionCost.toFixed(0),
      profit: profit.toFixed(0),
      roi: roi.toFixed(0),
    };
  }, [selectedPlan, accountCount, avgViews, cpmRate, pricingData]);

  const planFeatures: Record<string, string[]> = {
    basic: ['2 videos per day', 'Basic scheduling', 'Email support'],
    pro: ['4 videos per day', 'Advanced scheduling', 'Priority support', 'Analytics dashboard'],
    scale: ['6 videos per day', 'Unlimited scheduling', 'Dedicated support', 'Advanced analytics'],
  };

  const nextTier = getNextTierInfo(accountCount);

  // WhatsApp contact handlers
  const handleContactWhatsApp = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const handleSelectPlan = () => {
    if (!selectedPlan || !pricingData) return;
    
    const link = generateVolumeDiscountWhatsAppLink({
      planName: selectedPlan.name,
      accountCount,
      pricePerAccount: pricingData.discountedPrice,
      totalPrice: billingCycle === 'annual' ? pricingData.totalAnnualYear : pricingData.totalMonthly,
      discountPercentage: pricingData.discountPercentage,
      userEmail: user?.email,
    });
    window.open(link, '_blank');
  };

  const handleSwitchPlan = () => {
    if (!currentSubscription || !selectedPlan) return;
    
    const link = generateSwitchPlanWhatsAppLink({
      currentPlanName: currentSubscription.plan?.name || currentSubscription.plan_id,
      newPlanName: selectedPlan.name,
      newPlanPrice: selectedPlan.price_monthly,
      userEmail: user?.email,
    });
    window.open(link, '_blank');
  };

  const handleAccountCountChange = (value: string) => {
    const num = parseInt(value) || 1;
    setAccountCount(Math.max(1, num));
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

        {/* Account Count Input */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">How many TikTok accounts?</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the number of accounts you want to manage
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  value={accountCount}
                  onChange={(e) => handleAccountCountChange(e.target.value)}
                  className="w-24 text-center text-lg font-semibold"
                />
                <span className="text-muted-foreground">accounts</span>
              </div>
            </div>
            
            {/* Discount badge and next tier info */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {getDiscountPercentage(accountCount) > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                  {getDiscountTierLabel(accountCount)}
                </Badge>
              )}
              {nextTier && (
                <span className="text-sm text-amber-600">
                  Add {nextTier.accountsNeeded} more for {nextTier.nextLabel}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
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
              Annual · Save 25%
            </button>
          </div>
        </div>

        {/* Plan Cards - Clickable to Select */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {activePlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isRecommended = plan.id === 'pro';
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const features = planFeatures[plan.id] || [];

            return (
              <Card 
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                } ${isCurrentPlan ? 'border-emerald-500' : ''}`}
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
                {isSelected && !isCurrentPlan && !isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Selected
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-semibold capitalize">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price_monthly}</span>
                    <span className="text-sm text-muted-foreground">/mo per account</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.max_videos_per_day} videos per day
                  </p>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pricing Summary Card */}
        {selectedPlan && pricingData && (
          <Card className="mb-8 border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h3 className="font-semibold text-xl">
                  {selectedPlan.name} Plan × {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
                </h3>
                {pricingData.discountPercentage > 0 && (
                  <Badge className="mt-2 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    Volume Discount: {pricingData.discountPercentage}% off
                  </Badge>
                )}
              </div>
              
              {/* Pricing Display */}
              <div className="text-center mb-6">
                {billingCycle === 'monthly' ? (
                  <>
                    {pricingData.discountPercentage > 0 && (
                      <div className="text-sm text-muted-foreground line-through mb-1">
                        ${pricingData.basePrice}/account/month
                      </div>
                    )}
                    <div className="text-lg">
                      <span className="font-semibold">${pricingData.discountedPrice.toFixed(2)}</span>
                      <span className="text-muted-foreground">/account/month</span>
                    </div>
                    <div className="text-4xl font-bold text-primary mt-3">
                      ${pricingData.totalMonthly.toFixed(2)}<span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg">
                      <span className="font-semibold">${pricingData.annualPerAccountPerMonth.toFixed(2)}</span>
                      <span className="text-muted-foreground">/account/month</span>
                    </div>
                    <div className="text-4xl font-bold text-primary mt-3">
                      ${pricingData.totalAnnualYear.toFixed(2)}<span className="text-lg font-normal text-muted-foreground">/year</span>
                    </div>
                    <Badge className="mt-3 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                      Save ${pricingData.totalSavingsYear.toFixed(2)} annually
                    </Badge>
                  </>
                )}
              </div>
              
              {/* CTA Button */}
              <div className="flex justify-center">
                {currentSubscription?.plan_id === selectedPlan.id ? (
                  <Button variant="secondary" size="lg" disabled className="min-w-[200px]">
                    <Check className="h-4 w-4 mr-2" />
                    Current Plan
                  </Button>
                ) : currentSubscription ? (
                  <Button size="lg" onClick={handleSwitchPlan} className="min-w-[200px]">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Switch to {selectedPlan.name}
                  </Button>
                ) : (
                  <Button size="lg" onClick={handleSelectPlan} className="min-w-[200px]">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Get Started - Contact on WhatsApp
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Contact Banner */}
        <Card className="mb-8 border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Need help choosing?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact us on WhatsApp for personalized recommendations
                </p>
              </div>
              <Button 
                onClick={handleContactWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Volume Discounts Reference */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Volume Discounts</CardTitle>
            <p className="text-sm text-muted-foreground">
              The more accounts you add, the more you save
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {VOLUME_DISCOUNTS.map((tier) => {
                const rangeLabel = tier.maxAccounts === Infinity 
                  ? `${tier.minAccounts}+` 
                  : `${tier.minAccounts}-${tier.maxAccounts}`;
                const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
                
                return (
                  <div 
                    key={tier.tier}
                    className={`text-center p-4 rounded-lg border transition-all ${
                      isActive 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border'
                    }`}
                  >
                    <div className="font-semibold">{rangeLabel}</div>
                    <div className="text-sm text-muted-foreground capitalize">{tier.tier}</div>
                    <div className={`text-lg font-bold ${tier.discount > 0 ? 'text-emerald-600' : ''}`}>
                      {tier.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

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

                {/* Calculation Info */}
                {selectedPlan && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    Based on: <span className="font-medium">{selectedPlan.max_videos_per_day} videos/day</span> × 
                    <span className="font-medium"> {accountCount} accounts</span> × 
                    <span className="font-medium"> 30 days</span> = 
                    <span className="font-medium text-foreground"> {selectedPlan.max_videos_per_day * accountCount * 30} videos/month</span>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">${roiData.subscriptionCost}</div>
                    <div className="text-sm text-muted-foreground">Monthly cost</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-600">${roiData.monthlyEarnings}</div>
                    <div className="text-sm text-muted-foreground">Est. earnings</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <div className={`text-2xl font-bold ${parseInt(roiData.profit) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      ${roiData.profit}
                    </div>
                    <div className="text-sm text-muted-foreground">Est. profit</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <div className={`text-2xl font-bold ${parseInt(roiData.roi) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {roiData.roi}%
                    </div>
                    <div className="text-sm text-muted-foreground">ROI</div>
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
                  Click the "Get Started" or "Switch to" button to contact us via WhatsApp. 
                  We'll help you upgrade or switch your plan quickly.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="cancel">
                <AccordionTrigger className="text-left">Can subscriptions be cancelled?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes, subscriptions can be cancelled at any time. When cancelled, access 
                  continues until the current subscription period ends.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="volume">
                <AccordionTrigger className="text-left">What are volume discounts?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Volume discounts reduce your per-account cost as you add more accounts:
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>3-5 accounts: 15% off</li>
                    <li>6-10 accounts: 25% off</li>
                    <li>11-20 accounts: 35% off</li>
                    <li>21+ accounts: 50% off</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="payment">
                <AccordionTrigger className="text-left">What payment methods are accepted?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  We accept various payment methods. Contact us on WhatsApp to discuss the best 
                  payment option for you.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
