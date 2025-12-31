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
  isAgencyTier,
  AGENCY_BENEFITS,
  calculateAnnualWithVolumeDiscount,
  VOLUME_DISCOUNTS
} from '@/lib/pricing';
import { 
  generateGeneralWhatsAppLink, 
  generateSwitchPlanWhatsAppLink, 
  generateVolumeDiscountWhatsAppLink 
} from '@/lib/whatsapp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, ChevronDown, Crown, HelpCircle, Info, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
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
  
  // Per-plan account counts
  const [planAccountCounts, setPlanAccountCounts] = useState<Record<string, number>>({
    basic: 1,
    pro: 1,
    scale: 1,
  });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [roiExpanded, setRoiExpanded] = useState(false);
  const [avgViews, setAvgViews] = useState(10000);
  const [cpmRate, setCpmRate] = useState(2);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [roiAccountCount, setRoiAccountCount] = useState(1);

  const updatePlanAccounts = (planId: string, count: number) => {
    setPlanAccountCounts(prev => ({ ...prev, [planId]: count }));
  };

  const activePlans = subscriptionPlans?.filter(p => p.is_active) || [];
  
  const proPlan = activePlans.find(p => p.id === 'pro');
  const selectedPlan = activePlans.find(p => p.id === selectedPlanId) || proPlan;

  // Fixed ROI calculation that accounts for videos per day and account count
  const roiData = useMemo(() => {
    if (!selectedPlan) return { monthlyEarnings: '0', subscriptionCost: '0', profit: '0', roi: '0' };
    
    const videosPerDay = selectedPlan.max_videos_per_day;
    const monthlyVideos = videosPerDay * 30 * roiAccountCount;
    const monthlyViews = monthlyVideos * avgViews;
    const monthlyEarnings = (monthlyViews / 1000) * cpmRate;
    
    const discountedPrice = calculateDiscountedPrice(selectedPlan.price_monthly, roiAccountCount);
    const monthlySubscriptionCost = discountedPrice * roiAccountCount;
    
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
  }, [selectedPlan, roiAccountCount, avgViews, cpmRate]);

  const planFeatures: Record<string, string[]> = {
    basic: ['2 videos per day', 'Basic scheduling', 'Email support'],
    pro: ['4 videos per day', 'Advanced scheduling', 'Priority support', 'Analytics dashboard'],
    scale: ['6 videos per day', 'Unlimited scheduling', 'Dedicated support', 'Advanced analytics'],
    agency: ['Custom videos per day', 'Custom account limits', 'Dedicated account manager', 'Priority support (< 2hr response)', 'White-label options'],
  };

  // WhatsApp contact handlers
  const handleContactWhatsApp = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const handleSelectPlan = (plan: SubscriptionPlan, accounts: number) => {
    const basePrice = plan.price_monthly;
    const discountedPrice = calculateDiscountedPrice(basePrice, accounts);
    const totalPrice = discountedPrice * accounts;
    const discountPercentage = getDiscountPercentage(accounts);
    
    const link = generateVolumeDiscountWhatsAppLink({
      planName: plan.name,
      accountCount: accounts,
      pricePerAccount: discountedPrice,
      totalPrice,
      discountPercentage,
      userEmail: user?.email,
    });
    window.open(link, '_blank');
  };

  const handleSwitchPlan = (plan: SubscriptionPlan) => {
    if (!currentSubscription) return;
    
    const link = generateSwitchPlanWhatsAppLink({
      currentPlanName: currentSubscription.plan?.name || currentSubscription.plan_id,
      newPlanName: plan.name,
      newPlanPrice: plan.price_monthly,
      userEmail: user?.email,
    });
    window.open(link, '_blank');
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
              Annual · Save 25%
            </button>
          </div>
        </div>


        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {activePlans.map((plan) => {
            const isRecommended = plan.id === 'pro';
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const features = planFeatures[plan.id] || [];
            const accountCount = planAccountCounts[plan.id] || 1;
            const nextTier = getNextTierInfo(accountCount);
            
            // Calculate price with volume discount
            const basePrice = plan.price_monthly;
            const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
            const hasDiscount = getDiscountPercentage(accountCount) > 0;
            const monthlyPrice = billingCycle === 'annual' 
              ? (discountedPrice * 0.75).toFixed(2) 
              : discountedPrice.toFixed(2);
            const totalMonthly = parseFloat(monthlyPrice) * accountCount;

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
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl font-semibold capitalize">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {plan.max_videos_per_day} videos per day
                  </p>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  {/* Account Selector Widget */}
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-muted-foreground">Accounts</span>
                      <Badge variant="secondary" className="font-semibold">
                        {accountCount}
                      </Badge>
                    </div>
                    <Slider
                      value={[accountCount]}
                      onValueChange={(v) => updatePlanAccounts(plan.id, v[0])}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    
                    {/* Quick Preset Buttons */}
                    <div className="flex gap-1.5 mt-3">
                      {[5, 10, 15, 20].map((preset) => (
                        <Button
                          key={preset}
                          variant={accountCount === preset ? "default" : "outline"}
                          size="sm"
                          className="flex-1 h-7 text-xs px-0"
                          onClick={() => updatePlanAccounts(plan.id, preset)}
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                      {hasDiscount && (
                        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs">
                          {getDiscountTierLabel(accountCount)}
                        </Badge>
                      )}
                      {nextTier && accountCount < 20 && (
                        <span className="text-xs text-amber-600">
                          +{nextTier.accountsNeeded} = {nextTier.nextLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="text-center mb-4">
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through mr-2">
                        ${basePrice}
                      </span>
                    )}
                    <span className="text-3xl font-bold">${monthlyPrice}</span>
                    <span className="text-sm text-muted-foreground">/mo/account</span>
                    
                    <div className="mt-2 p-2 bg-primary/5 rounded-lg">
                      <div className="text-lg font-semibold text-primary">
                        ${totalMonthly.toFixed(2)}/mo
                      </div>
                      <div className="text-xs text-muted-foreground">
                        total for {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2 mb-4 flex-1">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Action Buttons */}
                  <div className="pt-3 border-t">
                    {isCurrentPlan ? (
                      <Button variant="secondary" size="sm" className="w-full" disabled>
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : currentSubscription ? (
                      <Button 
                        variant={isRecommended ? "default" : "outline"} 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleSwitchPlan(plan)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Switch to {plan.name}
                      </Button>
                    ) : (
                      <Button 
                        variant={isRecommended ? "default" : "outline"} 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleSelectPlan(plan, accountCount)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Get {plan.name}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Agency Tier Card */}
          <Card className="relative flex flex-col border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Enterprise
              </span>
            </div>
            
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold">Agency</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                21+ accounts • Custom videos/day
              </p>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 mb-6 flex-1">
                {planFeatures.agency.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="pt-3 border-t">
                <Button 
                  onClick={handleContactWhatsApp}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact for Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Feature Comparison Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Compare All Plans</CardTitle>
              <p className="text-sm text-muted-foreground">
                See exactly what's included in each plan
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Feature</TableHead>
                      <TableHead className="text-center">Basic</TableHead>
                      <TableHead className="text-center">Pro</TableHead>
                      <TableHead className="text-center">Scale</TableHead>
                      <TableHead className="text-center">Agency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: 'Videos per day (per account)', basic: '2', pro: '4', scale: '6', agency: 'Custom' },
                      { name: 'TikTok accounts', basic: '1-20', pro: '1-20', scale: '1-20', agency: '21+' },
                      { name: 'Basic scheduling', basic: true, pro: true, scale: true, agency: true },
                      { name: 'Advanced scheduling', basic: false, pro: true, scale: true, agency: true },
                      { name: 'Unlimited scheduling', basic: false, pro: false, scale: true, agency: true },
                      { name: 'Email support', basic: true, pro: true, scale: true, agency: true },
                      { name: 'Priority support', basic: false, pro: true, scale: true, agency: true },
                      { name: 'Dedicated support', basic: false, pro: false, scale: true, agency: true },
                      { name: 'Analytics dashboard', basic: false, pro: true, scale: true, agency: true },
                      { name: 'Advanced analytics', basic: false, pro: false, scale: true, agency: true },
                      { name: 'Dedicated account manager', basic: false, pro: false, scale: false, agency: true },
                      { name: 'Priority response (< 2hr)', basic: false, pro: false, scale: false, agency: true },
                      { name: 'White-label options', basic: false, pro: false, scale: false, agency: true },
                      { name: 'Volume discounts', basic: true, pro: true, scale: true, agency: true },
                    ].map((feature, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        {(['basic', 'pro', 'scale', 'agency'] as const).map((plan) => (
                          <TableCell key={plan} className="text-center">
                            {feature[plan] === true ? (
                              <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : feature[plan] === false ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className="text-sm">{feature[plan]}</span>
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
                
                return (
                  <div 
                    key={tier.tier}
                    className="text-center p-4 rounded-lg border border-border"
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
                {/* Plan Selector for ROI */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Calculate for plan</label>
                    <div className="flex flex-wrap gap-2">
                      {activePlans.map(plan => (
                        <Button
                          key={plan.id}
                          variant={selectedPlanId === plan.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPlanId(plan.id)}
                        >
                          {plan.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Number of accounts</label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[roiAccountCount]}
                        onValueChange={(v) => setRoiAccountCount(v[0])}
                        min={1}
                        max={20}
                        step={1}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="font-semibold min-w-[40px] justify-center">
                        {roiAccountCount}
                      </Badge>
                    </div>
                  </div>
                </div>

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
                    <span className="font-medium"> {roiAccountCount} accounts</span> × 
                    <span className="font-medium"> 30 days</span> = 
                    <span className="font-medium text-foreground"> {selectedPlan.max_videos_per_day * roiAccountCount * 30} videos/month</span>
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
                  Click the "Get" or "Switch to" button on any plan to contact us via WhatsApp. 
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
                    <li>21+ accounts: 40% off + Agency benefits</li>
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
