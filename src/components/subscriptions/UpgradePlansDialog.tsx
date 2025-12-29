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
  Shield,
  Clock,
  Users,
} from 'lucide-react';

// Identity-based tier labels
const TIER_LABELS = [
  { name: '🟢 Starter', range: '1-2' },
  { name: '🔵 Growth', range: '3-5' },
  { name: '🟣 Scaler', range: '6-10' },
  { name: '🔥 Agency', range: '11+' },
];

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
    bgGradient: 'from-violet-500/10 to-fuchsia-500/15',
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual'); // Default annual
  const [avgViews, setAvgViews] = useState('10000'); // Realistic default
  const [cpmRate, setCpmRate] = useState('6'); // Realistic default
  
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
    const viewsNum = parseInt(avgViews) || 10000;
    const cpm = parseFloat(cpmRate) || 6;
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 bg-gradient-to-b from-background to-muted/30">
        {/* 🥇 HERO SECTION - Power Headline + Trust Badges */}
        <DialogHeader className="px-5 pt-5 pb-4 bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b border-border/50">
          <div className="text-center space-y-3">
            {/* Power Headline */}
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <DialogTitle className="text-lg font-bold leading-tight">
              Run unlimited TikTok → YouTube automation at scale
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Upload 2–6 videos daily per account. No watermark. AI SEO. Fully automated.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">
                ✅ Watermark-Free
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">
                ✅ Daily Auto Upload
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">
                ✅ Bulk Discounts
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">
                ✅ Built for Agencies
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* 🥇 PLAN CARDS - Pro Plan Dominant */}
          <div className="grid grid-cols-3 gap-2 items-end">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-muted/50 animate-pulse" />
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
                      ${isPopular 
                        ? 'border-primary shadow-xl shadow-primary/20 scale-105 z-10 ring-2 ring-primary/30' 
                        : 'border-border/50'}
                      ${isCurrent ? 'ring-2 ring-green-500/30 border-green-500/50' : ''}
                      hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/30
                      bg-gradient-to-b ${config.bgGradient} backdrop-blur-sm
                    `}
                  >
                    {/* Popular Glow Effect */}
                    {isPopular && (
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 to-transparent pointer-events-none animate-pulse" />
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
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] px-3 py-0.5 rounded-b-md font-bold shadow-lg animate-pulse">
                          🔥 Best ROI Plan
                        </div>
                      </div>
                    )}
                    
                    <div className={`p-3 relative ${isPopular ? 'pt-5' : 'pt-4'}`}>
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
                          <span className={`font-bold tracking-tight ${isPopular ? 'text-3xl' : 'text-2xl'}`}>${displayPrice}</span>
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
                          className={`w-full h-7 text-xs bg-gradient-to-r ${config.gradient} hover:opacity-90 shadow-md ${isPopular ? 'h-8' : ''}`}
                          onClick={handleGoToAccounts}
                        >
                          {isPopular ? 'Start Scaling' : 'Get Started'}
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

          {/* 🥇 VOLUME PRICING SECTION */}
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Volume Pricing</span>
                </div>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2 shadow-sm">
                  💰 Save up to 50%
                </Badge>
              </div>
              {/* Motivational Text */}
              <p className="text-[11px] text-muted-foreground mt-1">
                The more accounts you add, the cheaper each one gets
              </p>
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
                    <span className={`text-lg font-bold tabular-nums transition-colors ${currentDiscount > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {accountCount}
                    </span>
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

              {/* 🥇 IDENTITY-BASED TIER INDICATORS */}
              <div className="flex gap-1">
                {VOLUME_DISCOUNTS.map((tier, index) => {
                  const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
                  const discount = Math.round(tier.discount * 100);
                  
                  return (
                    <button 
                      key={index}
                      onClick={() => setAccountCount(tier.minAccounts)}
                      className={`flex-1 py-2 rounded-md text-[10px] transition-all
                        ${isActive 
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm scale-105' 
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                    >
                      <div className="font-semibold">{TIER_LABELS[index].name}</div>
                      <div className={`text-[9px] ${isActive ? 'opacity-80' : ''}`}>
                        {TIER_LABELS[index].range}
                      </div>
                      <div className={isActive ? 'opacity-80' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                        {tier.discount === 0 ? '—' : `Save ${discount}%`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 🥇 BILLING TOGGLE - Annual Default + Better Copy */}
              <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 py-2 text-xs rounded-md transition-all ${
                    billingCycle === 'monthly' 
                      ? 'bg-background text-foreground shadow-sm font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`flex-1 py-2 text-xs rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    billingCycle === 'annual' 
                      ? 'bg-background text-foreground shadow-sm font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Pay yearly</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">→ Save 20%</span>
                  <Badge className="text-[8px] px-1 py-0 bg-amber-500 text-white">
                    🎁 2 months free
                  </Badge>
                </button>
              </div>

              {/* 🥇 LOUD SAVINGS DISPLAY */}
              {(currentDiscount > 0 || billingCycle === 'annual') && (
                <div className="relative p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 to-green-500/20 border-2 border-emerald-500/30 overflow-hidden">
                  {/* Subtle animation effect */}
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,_hsl(var(--primary)/0.1)_0%,_transparent_50%)]" />
                  
                  <div className="relative text-center">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1 font-medium">
                      💸 You're saving every year
                    </p>
                    <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ${animatedSavings.toFixed(0)}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      That's more than 90% of creators spend on tools
                    </p>
                  </div>
                </div>
              )}

              {/* 🥇 PRICE GRID - Upgraded CTAs */}
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
                        <div className={`text-sm font-bold transition-colors ${hasDiscount ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                          ${displayPrice.toFixed(2)}<span className="text-[10px] font-normal text-muted-foreground">/ea</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mb-1.5">${displayTotal.toFixed(0)}/mo</div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="w-full h-6 text-[10px] hover:bg-primary/10 hover:text-primary" 
                          onClick={() => handleVolumeDiscountContact(plan)}
                        >
                          <MessageCircle className="h-3 w-3 mr-1 text-green-500" />
                          Lock this deal
                        </Button>
                        <p className="text-[8px] text-muted-foreground mt-0.5">
                          Auto-applied at checkout
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 🥇 ROI CALCULATOR - Realistic Defaults + Disclaimer */}
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
                        <SelectItem value="5000">5,000 (starting)</SelectItem>
                        <SelectItem value="10000">10,000 (avg)</SelectItem>
                        <SelectItem value="25000">25,000 (good)</SelectItem>
                        <SelectItem value="50000">50,000 (viral)</SelectItem>
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
                        <SelectItem value="3">$3 (Low)</SelectItem>
                        <SelectItem value="6">$6 (Avg)</SelectItem>
                        <SelectItem value="10">$10 (Good)</SelectItem>
                        <SelectItem value="15">$15 (Premium)</SelectItem>
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
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">${roiData.monthlyEarnings.toLocaleString()}</div>
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
                    ≈ ${roiData.profit.toLocaleString()}/mo profit · ${(roiData.profit * 12).toLocaleString()}/year
                  </div>
                )}

                {/* 🥇 DISCLAIMER - Trust > Hype */}
                <p className="text-[9px] text-muted-foreground text-center italic pt-1 border-t border-border/50">
                  Estimates based on average CPMs. Results vary by niche & region.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 🥇 FOOTER CTAs - Upgraded Copy */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-9 text-xs" 
              onClick={handleGoToAccounts}
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Add More Accounts
            </Button>
            <Button 
              size="sm" 
              className="flex-1 h-9 text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20" 
              onClick={handleContactWhatsApp}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Start Scaling Now
            </Button>
          </div>

          {/* 🥇 TRUST & AUTHORITY SECTION */}
          <div className="text-center space-y-2 pt-3 border-t border-border/50">
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="text-[9px] bg-background/50">
                <Users className="h-3 w-3 mr-1" />
                1,000+ videos/month users
              </Badge>
              <Badge variant="outline" className="text-[9px] bg-background/50">
                <Shield className="h-3 w-3 mr-1" />
                Automation-first
              </Badge>
              <Badge variant="outline" className="text-[9px] bg-background/50">
                <Clock className="h-3 w-3 mr-1" />
                YouTube optimized
              </Badge>
            </div>
            
            {/* Micro-copy */}
            <p className="text-[10px] text-muted-foreground">
              Subscriptions are per TikTok account — cancel anytime
            </p>
            <p className="text-[9px] text-muted-foreground font-medium">
              No watermark. No manual work. No limits.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
