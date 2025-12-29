import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionPlans, useUserSubscriptions } from '@/hooks/useSubscriptions';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useAuth } from '@/contexts/AuthContext';
import { generateGeneralWhatsAppLink, generateSwitchPlanWhatsAppLink, generateVolumeDiscountWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';
import { 
  getDiscountPercentage, 
  calculateDiscountedPrice, 
  calculateTotalPrice, 
  calculateSavings,
  calculateAnnualWithVolumeDiscount,
  VOLUME_DISCOUNTS,
} from '@/lib/pricing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
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
  Zap,
  Rocket,
  Crown,
  Check,
  Video,
  ChevronDown,
  Sparkles,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

// Custom hook for animated counting
function useAnimatedCounter(value: number, duration: number = 400) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  
  useEffect(() => {
    const startValue = previousValue.current;
    const difference = value - startValue;
    
    if (difference === 0) return;
    
    const startTime = performance.now();
    let animationFrame: number;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + difference * eased;
      
      setDisplayValue(Math.round(current * 100) / 100);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);
  
  return displayValue;
}

interface UpgradePlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const planConfig: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bgGradient: string;
  accentColor: string;
}> = {
  basic: { 
    icon: Zap, 
    gradient: 'from-slate-500 to-slate-600',
    bgGradient: 'from-slate-500/5 to-slate-600/10',
    accentColor: 'text-slate-600 dark:text-slate-400',
  },
  pro: { 
    icon: Rocket, 
    gradient: 'from-violet-500 to-fuchsia-500',
    bgGradient: 'from-violet-500/5 to-fuchsia-500/10',
    accentColor: 'text-violet-600 dark:text-violet-400',
  },
  scale: { 
    icon: Crown, 
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/5 to-orange-500/10',
    accentColor: 'text-amber-600 dark:text-amber-400',
  },
};

export function UpgradePlansDialog({ open, onOpenChange }: UpgradePlansDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { data: userSubscriptions } = useUserSubscriptions();
  const { data: tiktokAccounts } = useTikTokAccounts();
  const [showROI, setShowROI] = useState(false);
  const [accountCount, setAccountCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [avgViews, setAvgViews] = useState('1000');
  const [cpmRate, setCpmRate] = useState('3');
  
  const userAccountCount = tiktokAccounts?.length || 0;
  
  // Get progress to next tier
  const getProgressToNextTier = (currentCount: number) => {
    const currentTierIndex = VOLUME_DISCOUNTS.findIndex(
      t => currentCount >= t.minAccounts && currentCount <= t.maxAccounts
    );
    const currentTier = VOLUME_DISCOUNTS[currentTierIndex];
    const nextTier = VOLUME_DISCOUNTS[currentTierIndex + 1];
    
    if (!nextTier) {
      return { percentage: 100, remaining: 0, nextDiscount: 50, currentDiscount: currentTier?.discount || 0, hasNextTier: false };
    }
    
    const tierStart = currentTier?.minAccounts || 1;
    const tierEnd = nextTier.minAccounts - 1;
    const accountsInTier = currentCount - tierStart;
    const tierSize = tierEnd - tierStart + 1;
    const progress = ((accountsInTier + 1) / tierSize) * 100;
    
    return {
      percentage: Math.min(Math.max(progress, 5), 95),
      remaining: nextTier.minAccounts - currentCount,
      nextDiscount: Math.round(nextTier.discount * 100),
      currentDiscount: Math.round((currentTier?.discount || 0) * 100),
      hasNextTier: true,
    };
  };
  
  const progress = getProgressToNextTier(userAccountCount);
  
  const yearlySavings = useMemo(() => {
    const proBasePrice = 12;
    const annualData = calculateAnnualWithVolumeDiscount(proBasePrice, accountCount);
    return billingCycle === 'annual' ? annualData.totalSavingsYear : calculateSavings(proBasePrice, accountCount) * 12;
  }, [accountCount, billingCycle]);
  
  const animatedSavings = useAnimatedCounter(yearlySavings, 400);

  // ROI Calculator
  const roiData = useMemo(() => {
    const proBasePrice = 12;
    const discountedPrice = calculateDiscountedPrice(proBasePrice, accountCount);
    const monthlySubscriptionCost = discountedPrice * accountCount;
    const videosPerDay = 4;
    const monthlyVideos = videosPerDay * 30 * accountCount;
    const viewsNum = parseInt(avgViews) || 1000;
    const cpm = parseFloat(cpmRate) || 3;
    const monthlyViews = monthlyVideos * viewsNum;
    const monthlyEarnings = (monthlyViews / 1000) * cpm;
    const profit = monthlyEarnings - monthlySubscriptionCost;
    const roi = monthlySubscriptionCost > 0 ? ((monthlyEarnings - monthlySubscriptionCost) / monthlySubscriptionCost) * 100 : 0;
    
    return { monthlyVideos, monthlyViews, monthlyEarnings, monthlySubscriptionCost, profit, roi };
  }, [accountCount, avgViews, cpmRate]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-0 bg-gradient-to-b from-background to-muted/30">
        {/* Premium Header */}
        <DialogHeader className="px-5 pt-5 pb-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Choose Your Plan</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Unlock your content automation</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-background/50 backdrop-blur-sm">
              <MessageCircle className="h-3 w-3 mr-1 text-green-500" />
              {WHATSAPP_DISPLAY}
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Plan Cards - Glassmorphism Style */}
          <div className="grid grid-cols-3 gap-2.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
              ))
            ) : (
              sortedPlans?.map((plan) => {
                const config = planConfig[plan.id] || planConfig.basic;
                const Icon = config.icon;
                const isPopular = plan.id === 'pro';
                const isCurrent = currentPlanIds.has(plan.id);
                const planAction = getPlanAction(plan.id);
                const displayPrice = Math.round(plan.price_monthly / 100);

                return (
                  <div
                    key={plan.id}
                    className={`relative group rounded-xl border transition-all duration-300 overflow-hidden
                      ${isPopular ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/50'}
                      ${isCurrent ? 'ring-2 ring-green-500/30 border-green-500/50' : ''}
                      hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/30
                      bg-gradient-to-b ${config.bgGradient} backdrop-blur-sm
                    `}
                  >
                    {/* Popular Glow Effect */}
                    {isPopular && (
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
                    )}
                    
                    {/* Badges */}
                    {isCurrent && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500 text-white text-[9px] px-1.5 py-0 shadow-sm">
                          Active
                        </Badge>
                      </div>
                    )}
                    {isPopular && !isCurrent && (
                      <div className="absolute -top-px left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[9px] px-3 py-0.5 rounded-b-md font-medium shadow-lg">
                          Best Value
                        </div>
                      </div>
                    )}
                    
                    <div className="p-3 pt-4 relative">
                      {/* Icon & Name */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.gradient} shadow-md`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-semibold capitalize text-sm">{plan.name}</span>
                      </div>
                      
                      {/* Price */}
                      <div className="mb-3">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-2xl font-bold tracking-tight">${displayPrice}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <div className={`text-xs ${config.accentColor} font-medium`}>
                          {plan.max_videos_per_day} videos/day
                        </div>
                      </div>
                      
                      {/* CTA Button */}
                      {planAction === 'current' ? (
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" disabled>
                          <Check className="h-3 w-3 mr-1" />
                          Current
                        </Button>
                      ) : planAction === 'subscribe' ? (
                        <Button 
                          size="sm" 
                          className={`w-full h-7 text-xs bg-gradient-to-r ${config.gradient} hover:opacity-90 shadow-md`}
                          onClick={handleGoToAccounts}
                        >
                          Get Started
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className={`w-full h-7 text-xs ${planAction === 'upgrade' ? `bg-gradient-to-r ${config.gradient} hover:opacity-90 shadow-md` : ''}`}
                          variant={planAction === 'upgrade' ? 'default' : 'secondary'}
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

          {/* Volume Pricing Section */}
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Volume Pricing</span>
                </div>
                {currentDiscount > 0 && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] px-2 shadow-sm">
                    Save {currentDiscount}%
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Progress to Next Tier */}
              {userAccountCount > 0 && progress.hasNextTier && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-muted-foreground">
                        {userAccountCount} account{userAccountCount !== 1 ? 's' : ''} • {progress.currentDiscount}% tier
                      </span>
                      <span className="font-medium text-primary">
                        +{progress.remaining} for {progress.nextDiscount}%
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-1.5" />
                  </div>
                </div>
              )}

              {/* Account Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Accounts</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums">{accountCount}</span>
                    {userAccountCount > 0 && accountCount !== userAccountCount && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 text-[10px] px-1.5 text-primary"
                        onClick={() => setAccountCount(userAccountCount)}
                      >
                        Use mine ({userAccountCount})
                      </Button>
                    )}
                  </div>
                </div>
                <Slider 
                  value={[accountCount]} 
                  onValueChange={([value]) => setAccountCount(value)} 
                  min={1} 
                  max={15} 
                  step={1}
                  className="py-1"
                />
              </div>

              {/* Tier Indicators */}
              <div className="flex gap-1">
                {VOLUME_DISCOUNTS.map((tier, index) => {
                  const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
                  const tierLabel = tier.maxAccounts === Infinity ? `${tier.minAccounts}+` : `${tier.minAccounts}-${tier.maxAccounts}`;
                  
                  return (
                    <button 
                      key={index}
                      onClick={() => setAccountCount(tier.minAccounts)}
                      className={`flex-1 py-1.5 rounded-md text-[10px] transition-all
                        ${isActive 
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                    >
                      <div>{tierLabel}</div>
                      <div className={isActive ? 'opacity-80' : 'text-emerald-600 dark:text-emerald-400'}>
                        {tier.discount === 0 ? '—' : `-${Math.round(tier.discount * 100)}%`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Billing Toggle */}
              <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
                    billingCycle === 'monthly' 
                      ? 'bg-background text-foreground shadow-sm font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-all flex items-center justify-center gap-1 ${
                    billingCycle === 'annual' 
                      ? 'bg-background text-foreground shadow-sm font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Annual
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">-20%</span>
                </button>
              </div>

              {/* Savings Display */}
              {(currentDiscount > 0 || billingCycle === 'annual') && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Yearly Savings</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${animatedSavings.toFixed(0)}
                  </span>
                </div>
              )}

              {/* Price Grid */}
              {sortedPlans && (
                <div className="grid grid-cols-3 gap-2">
                  {sortedPlans.map((plan) => {
                    const config = planConfig[plan.id] || planConfig.basic;
                    const basePrice = Math.round(plan.price_monthly / 100);
                    const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
                    const totalPrice = calculateTotalPrice(basePrice, accountCount);
                    const hasDiscount = currentDiscount > 0 || billingCycle === 'annual';
                    const annualData = calculateAnnualWithVolumeDiscount(basePrice, accountCount);
                    const displayPrice = billingCycle === 'monthly' ? discountedPrice : annualData.annualPerAccountPerMonth;
                    const displayTotal = billingCycle === 'monthly' ? totalPrice : annualData.totalAnnualPerMonth;

                    return (
                      <div key={plan.id} className="rounded-lg border border-border/50 bg-background p-2.5 text-center">
                        <div className={`text-xs font-semibold capitalize mb-1 ${config.accentColor}`}>{plan.name}</div>
                        {hasDiscount && (
                          <div className="text-[10px] text-muted-foreground line-through">${basePrice}</div>
                        )}
                        <div className="text-sm font-bold">${displayPrice.toFixed(2)}<span className="text-[10px] font-normal text-muted-foreground">/ea</span></div>
                        <div className="text-[10px] text-muted-foreground mb-1.5">${displayTotal.toFixed(0)}/mo</div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="w-full h-6 text-[10px] hover:bg-muted" 
                          onClick={() => handleVolumeDiscountContact(plan)}
                        >
                          <MessageCircle className="h-3 w-3 mr-1 text-green-500" />
                          Contact
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ROI Calculator */}
          <Collapsible open={showROI} onOpenChange={setShowROI}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Earnings Calculator</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showROI ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-4 rounded-lg border border-border/50 bg-card/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">Views/Video</label>
                    <Select value={avgViews} onValueChange={setAvgViews}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="1000">1,000</SelectItem>
                        <SelectItem value="5000">5,000</SelectItem>
                        <SelectItem value="10000">10,000</SelectItem>
                        <SelectItem value="50000">50,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">CPM Rate</label>
                    <Select value={cpmRate} onValueChange={setCpmRate}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">$1 (Low)</SelectItem>
                        <SelectItem value="3">$3 (Avg)</SelectItem>
                        <SelectItem value="5">$5 (Good)</SelectItem>
                        <SelectItem value="10">$10 (Great)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground text-center py-1">
                  Pro Plan × {accountCount} = {roiData.monthlyVideos.toLocaleString()} videos/month
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Cost</div>
                    <div className="text-base font-bold">${roiData.monthlySubscriptionCost.toFixed(0)}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Earnings</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">${roiData.monthlyEarnings.toFixed(0)}</div>
                  </div>
                  <div className={`rounded-lg p-2.5 text-center ${roiData.roi > 0 ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">ROI</div>
                    <div className={`text-base font-bold ${roiData.roi > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {roiData.roi > 0 ? '+' : ''}{roiData.roi.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {roiData.profit > 0 && (
                  <div className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ≈ ${roiData.profit.toFixed(0)}/mo profit · ${(roiData.profit * 12).toFixed(0)}/year
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-9 text-xs" 
              onClick={handleGoToAccounts}
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Manage Accounts
            </Button>
            <Button 
              size="sm" 
              className="flex-1 h-9 text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md" 
              onClick={handleContactWhatsApp}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Contact Us
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Subscriptions are per TikTok account
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
