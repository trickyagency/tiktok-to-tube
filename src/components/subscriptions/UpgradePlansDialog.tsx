import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionPlans, useUserSubscriptions } from '@/hooks/useSubscriptions';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useAuth } from '@/contexts/AuthContext';
import { generateGeneralWhatsAppLink, generateSwitchPlanWhatsAppLink, generateVolumeDiscountWhatsAppLink } from '@/lib/whatsapp';
import { 
  getDiscountPercentage, 
  calculateDiscountedPrice, 
  calculateTotalPrice, 
  calculateAnnualWithVolumeDiscount,
  VOLUME_DISCOUNTS,
} from '@/lib/pricing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle,
  Check,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

interface UpgradePlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlansDialog({ open, onOpenChange }: UpgradePlansDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { data: userSubscriptions } = useUserSubscriptions();
  const { data: tiktokAccounts } = useTikTokAccounts();
  const [showROI, setShowROI] = useState(false);
  const [accountCount, setAccountCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [avgViews, setAvgViews] = useState('10000');
  const [cpmRate, setCpmRate] = useState('6');
  
  const userAccountCount = tiktokAccounts?.length || 0;

  const currentPlanIds = new Set(
    userSubscriptions?.filter(sub => sub.status === 'active').map(sub => sub.plan_id) || []
  );

  const getPlanAction = (planId: string): 'current' | 'upgrade' | 'downgrade' | 'subscribe' => {
    if (currentPlanIds.size === 0) return 'subscribe';
    if (currentPlanIds.has(planId)) return 'current';
    const currentMaxPrice = Math.max(...Array.from(currentPlanIds).map(id => 
      plans?.find(p => p.id === id)?.price_monthly || 0
    ));
    const targetPrice = plans?.find(p => p.id === planId)?.price_monthly || 0;
    return targetPrice > currentMaxPrice ? 'upgrade' : 'downgrade';
  };

  const handleContactWhatsApp = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const handleGoToAccounts = () => {
    onOpenChange(false);
    navigate('/dashboard/tiktok');
  };

  const getCurrentPlanName = () => {
    if (currentPlanIds.size === 0) return null;
    const planId = Array.from(currentPlanIds)[0];
    return plans?.find(p => p.id === planId)?.name || 'current plan';
  };

  const handleSwitchPlan = (targetPlan: { id: string; name: string; price_monthly: number }) => {
    const currentPlanName = getCurrentPlanName();
    if (!currentPlanName) return;
    
    const link = generateSwitchPlanWhatsAppLink({
      currentPlanName,
      newPlanName: targetPlan.name,
      newPlanPrice: Math.round(targetPlan.price_monthly / 100),
      userEmail: user?.email,
    });
    window.open(link, '_blank');
  };

  const handleVolumeDiscountContact = (plan: { id: string; name: string; price_monthly: number }) => {
    const basePrice = Math.round(plan.price_monthly / 100);
    const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
    const totalPrice = calculateTotalPrice(basePrice, accountCount);
    const discountPercentage = getDiscountPercentage(accountCount);
    
    const link = generateVolumeDiscountWhatsAppLink({
      planName: plan.name,
      accountCount,
      pricePerAccount: discountedPrice,
      totalPrice,
      discountPercentage,
      userEmail: user?.email,
    });
    window.open(link, '_blank');
  };

  const currentDiscount = getDiscountPercentage(accountCount);
  const sortedPlans = plans?.slice().sort((a, b) => a.price_monthly - b.price_monthly);

  // Calculate savings
  const yearlySavings = useMemo(() => {
    const proBasePrice = 12;
    const annualData = calculateAnnualWithVolumeDiscount(proBasePrice, accountCount);
    return billingCycle === 'annual' ? annualData.totalSavingsYear : 0;
  }, [accountCount, billingCycle]);

  // ROI Calculator
  const roiData = useMemo(() => {
    const proBasePrice = 12;
    const discountedPrice = calculateDiscountedPrice(proBasePrice, accountCount);
    const monthlySubscriptionCost = discountedPrice * accountCount;
    const videosPerDay = 4;
    const monthlyVideos = videosPerDay * 30 * accountCount;
    const viewsNum = parseInt(avgViews) || 10000;
    const cpm = parseFloat(cpmRate) || 6;
    const monthlyViews = monthlyVideos * viewsNum;
    const monthlyEarnings = (monthlyViews / 1000) * cpm;
    const profit = monthlyEarnings - monthlySubscriptionCost;
    const roi = monthlySubscriptionCost > 0 ? ((monthlyEarnings - monthlySubscriptionCost) / monthlySubscriptionCost) * 100 : 0;
    
    return { monthlyVideos, monthlyViews, monthlyEarnings, monthlySubscriptionCost, profit, roi };
  }, [accountCount, avgViews, cpmRate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Choose your plan
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Scale your content automation effortlessly
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Plan Cards */}
          <div className="grid grid-cols-3 gap-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
              ))
            ) : (
              sortedPlans?.map((plan) => {
                const isRecommended = plan.id === 'pro';
                const isCurrent = currentPlanIds.has(plan.id);
                const planAction = getPlanAction(plan.id);
                const displayPrice = Math.round(plan.price_monthly / 100);

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-lg border p-4 transition-all
                      ${isRecommended 
                        ? 'border-primary bg-primary/[0.02]' 
                        : 'border-border'}
                      ${isCurrent ? 'border-emerald-500 bg-emerald-500/[0.02]' : ''}
                    `}
                  >
                    {/* Recommended Label */}
                    {isRecommended && !isCurrent && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Recommended
                        </span>
                      </div>
                    )}
                    
                    {/* Current Label */}
                    {isCurrent && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Current
                        </span>
                      </div>
                    )}
                    
                    <div className={`${isRecommended || isCurrent ? 'pt-2' : ''}`}>
                      {/* Plan Name */}
                      <h3 className="font-medium text-sm capitalize mb-3">{plan.name}</h3>
                      
                      {/* Price */}
                      <div className="mb-3">
                        <span className="text-2xl font-semibold">${displayPrice}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                      
                      {/* Feature */}
                      <p className="text-xs text-muted-foreground mb-4">
                        {plan.max_videos_per_day} videos per day
                      </p>
                      
                      {/* CTA Button */}
                      {planAction === 'current' ? (
                        <Button variant="secondary" size="sm" className="w-full text-xs" disabled>
                          <Check className="h-3 w-3 mr-1.5" />
                          Active
                        </Button>
                      ) : planAction === 'subscribe' ? (
                        <Button 
                          size="sm" 
                          variant={isRecommended ? 'default' : 'outline'}
                          className="w-full text-xs"
                          onClick={handleGoToAccounts}
                        >
                          Get started
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant={planAction === 'upgrade' ? 'default' : 'outline'}
                          className="w-full text-xs"
                          onClick={() => handleSwitchPlan(plan)}
                        >
                          {planAction === 'upgrade' ? 'Upgrade' : 'Switch'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Volume Discounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Volume discounts</h4>
              {currentDiscount > 0 && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {currentDiscount}% off
                </span>
              )}
            </div>

            {/* Tier Tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {VOLUME_DISCOUNTS.map((tier, index) => {
                const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
                const discount = Math.round(tier.discount * 100);
                const tierLabel = tier.maxAccounts === Infinity 
                  ? `${tier.minAccounts}+` 
                  : `${tier.minAccounts}-${tier.maxAccounts}`;
                
                return (
                  <button 
                    key={index}
                    onClick={() => setAccountCount(tier.minAccounts)}
                    className={`flex-1 py-2.5 text-center transition-colors border-r last:border-r-0 border-border
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background hover:bg-muted/50 text-foreground'
                      }`}
                  >
                    <div className="text-xs font-medium">{tierLabel}</div>
                    <div className={`text-[10px] ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {discount === 0 ? '—' : `${discount}% off`}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Account Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Number of accounts</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{accountCount}</span>
                  {userAccountCount > 0 && accountCount !== userAccountCount && (
                    <button 
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => setAccountCount(userAccountCount)}
                    >
                      Use current ({userAccountCount})
                    </button>
                  )}
                </div>
              </div>
              <Slider 
                value={[accountCount]} 
                onValueChange={([value]) => setAccountCount(value)} 
                min={1} 
                max={15} 
                step={1}
              />
            </div>

            {/* Billing Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors
                  ${billingCycle === 'monthly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background hover:bg-muted/50 text-foreground'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors border-l border-border
                  ${billingCycle === 'annual' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background hover:bg-muted/50 text-foreground'
                  }`}
              >
                Annual · Save 20%
              </button>
            </div>

            {/* Savings Display */}
            {yearlySavings > 0 && (
              <p className="text-xs text-center text-emerald-600 dark:text-emerald-400">
                Your annual savings: ${yearlySavings.toFixed(0)}
              </p>
            )}

            {/* Price Summary Grid */}
            {sortedPlans && (
              <div className="grid grid-cols-3 gap-2">
                {sortedPlans.map((plan) => {
                  const basePrice = Math.round(plan.price_monthly / 100);
                  const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
                  const totalPrice = calculateTotalPrice(basePrice, accountCount);
                  const hasDiscount = currentDiscount > 0 || billingCycle === 'annual';
                  const annualData = calculateAnnualWithVolumeDiscount(basePrice, accountCount);
                  const displayPrice = billingCycle === 'monthly' ? discountedPrice : annualData.annualPerAccountPerMonth;
                  const displayTotal = billingCycle === 'monthly' ? totalPrice : annualData.totalAnnualPerMonth;

                  return (
                    <div key={plan.id} className="rounded-lg border border-border p-3 text-center">
                      <div className="text-xs font-medium capitalize mb-1">{plan.name}</div>
                      {hasDiscount && (
                        <div className="text-[10px] text-muted-foreground line-through">${basePrice}</div>
                      )}
                      <div className={`text-sm font-semibold ${hasDiscount ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        ${displayPrice.toFixed(2)}<span className="text-[10px] font-normal text-muted-foreground">/ea</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-2">${displayTotal.toFixed(0)}/mo total</div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full h-7 text-[10px]" 
                        onClick={() => handleVolumeDiscountContact(plan)}
                      >
                        Select
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ROI Calculator (Collapsible) */}
          <Collapsible open={showROI} onOpenChange={setShowROI}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span>Estimate potential earnings</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showROI ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pb-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Views per video</label>
                    <Select value={avgViews} onValueChange={setAvgViews}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5000">5,000</SelectItem>
                        <SelectItem value="10000">10,000</SelectItem>
                        <SelectItem value="25000">25,000</SelectItem>
                        <SelectItem value="50000">50,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">CPM rate</label>
                    <Select value={cpmRate} onValueChange={setCpmRate}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">$3</SelectItem>
                        <SelectItem value="6">$6</SelectItem>
                        <SelectItem value="10">$10</SelectItem>
                        <SelectItem value="15">$15</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-[10px] text-muted-foreground mb-1">Monthly cost</div>
                    <div className="text-sm font-semibold">${roiData.monthlySubscriptionCost.toFixed(0)}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-[10px] text-muted-foreground mb-1">Est. earnings</div>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      ${roiData.monthlyEarnings.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-[10px] text-muted-foreground mb-1">ROI</div>
                    <div className={`text-sm font-semibold ${roiData.roi > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {roiData.roi > 0 ? '+' : ''}{roiData.roi.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                  Estimates based on average CPMs. Results vary by niche and region.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Footer */}
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleGoToAccounts}
              >
                Manage accounts
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleContactWhatsApp}
              >
                Contact us
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              Subscriptions are per account · Cancel anytime
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
