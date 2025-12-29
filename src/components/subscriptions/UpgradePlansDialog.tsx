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
  ANNUAL_DISCOUNT
} from '@/lib/pricing';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageCircle,
  Zap,
  Rocket,
  Crown,
  Check,
  Video,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
  Percent,
  Calculator,
  Minus,
  Plus,
  Calendar,
  TrendingUp,
  DollarSign,
  User,
  Target,
  PiggyBank,
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
      
      // Ease out cubic
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

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  basic: Zap,
  pro: Rocket,
  scale: Crown,
};

const planColors: Record<string, string> = {
  basic: 'from-blue-500 to-blue-600',
  pro: 'from-primary to-primary/80',
  scale: 'from-amber-500 to-amber-600',
};

const planFeatures: Record<string, string[]> = {
  basic: ['2 videos/day', 'Auto-scheduling', 'Basic support'],
  pro: ['4 videos/day', 'Priority scheduling', 'Priority support'],
  scale: ['6 videos/day', 'Fastest processing', 'Premium support'],
};

// Human-readable labels for database feature keys
const featureLabels: Record<string, string> = {
  auto_upload: 'Auto Upload to YouTube',
  watermark_free: 'Watermark-Free Downloads',
  basic_seo: 'Basic SEO Optimization',
  advanced_seo: 'Advanced SEO Optimization',
  smart_seo: 'AI-Powered Smart SEO',
  auto_scheduling: 'Auto Scheduling',
  faster_processing: 'Faster Processing',
  priority_processing: 'Priority Processing',
  reupload_protection: 'Re-upload Protection',
  best_posting_time: 'Best Posting Time Detection',
  duplicate_detection: 'Duplicate Detection',
  growth_optimization: 'Growth Optimization',
};

export function UpgradePlansDialog({ open, onOpenChange }: UpgradePlansDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { data: userSubscriptions } = useUserSubscriptions();
  const { data: tiktokAccounts } = useTikTokAccounts();
  const [showComparison, setShowComparison] = useState(false);
  const [showROI, setShowROI] = useState(false);
  const [accountCount, setAccountCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [avgViews, setAvgViews] = useState('1000');
  const [cpmRate, setCpmRate] = useState('3');
  
  // User's actual TikTok account count
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
  
  // Calculate yearly savings for animated counter (using Pro plan as example)
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
    const videosPerDay = 4; // Pro plan
    const monthlyVideos = videosPerDay * 30 * accountCount;
    const viewsNum = parseInt(avgViews) || 1000;
    const cpm = parseFloat(cpmRate) || 3;
    const monthlyViews = monthlyVideos * viewsNum;
    const monthlyEarnings = (monthlyViews / 1000) * cpm;
    const profit = monthlyEarnings - monthlySubscriptionCost;
    const roi = monthlySubscriptionCost > 0 ? ((monthlyEarnings - monthlySubscriptionCost) / monthlySubscriptionCost) * 100 : 0;
    
    return {
      monthlyVideos,
      monthlyViews,
      monthlyEarnings,
      monthlySubscriptionCost,
      profit,
      roi,
    };
  }, [accountCount, avgViews, cpmRate]);

  // Get unique active plan IDs the user is subscribed to
  const currentPlanIds = new Set(
    userSubscriptions
      ?.filter(sub => sub.status === 'active')
      .map(sub => sub.plan_id) || []
  );

  // Helper to determine plan action
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
    const link = generateGeneralWhatsAppLink();
    window.open(link, '_blank');
  };

  const handleGoToAccounts = () => {
    onOpenChange(false);
    navigate('/dashboard/tiktok');
  };

  // Get current plan name for switch plan message
  const getCurrentPlanName = () => {
    if (currentPlanIds.size === 0) return null;
    const planId = Array.from(currentPlanIds)[0];
    return plans?.find(p => p.id === planId)?.name || 'current plan';
  };

  // Handle switch plan via WhatsApp
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

  // Handle volume discount WhatsApp contact
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

  // Get current discount percentage
  const currentDiscount = getDiscountPercentage(accountCount);

  // Get all unique features from all plans
  const getAllFeatures = () => {
    if (!plans) return [];
    const allFeatureKeys = new Set<string>();
    plans.forEach(plan => {
      if (plan.features && typeof plan.features === 'object') {
        Object.keys(plan.features as Record<string, boolean>).forEach(key => allFeatureKeys.add(key));
      }
    });
    return Array.from(allFeatureKeys);
  };

  const planHasFeature = (planFeatures: unknown, featureKey: string): boolean => {
    if (!planFeatures || typeof planFeatures !== 'object') return false;
    return (planFeatures as Record<string, boolean>)[featureKey] === true;
  };

  const sortedPlans = plans?.slice().sort((a, b) => a.price_monthly - b.price_monthly);
  const allFeatureKeys = getAllFeatures();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose a plan that fits your needs
          </DialogDescription>
        </DialogHeader>

        {/* How to Subscribe - Compact */}
        <div className="bg-muted/50 rounded-lg p-3 border text-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span className="font-medium">How to Subscribe</span>
            <span className="text-xs text-muted-foreground ml-auto">WhatsApp: {WHATSAPP_DISPLAY}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>1. Add TikTok account</span>
            <span>2. Click "Subscribe"</span>
            <span>3. Pay via WhatsApp</span>
            <span>4. Get activated</span>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Plans Grid - Compact */}
        <div className="grid grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded w-16 mb-2" />
                  <div className="h-6 bg-muted rounded w-12" />
                </CardContent>
              </Card>
            ))
          ) : (
            plans?.map((plan) => {
              const Icon = planIcons[plan.id] || Zap;
              const gradient = planColors[plan.id] || 'from-primary to-primary/80';
              const features = planFeatures[plan.id] || [];
              const isPopular = plan.id === 'pro';
              const isCurrent = currentPlanIds.has(plan.id);
              const planAction = getPlanAction(plan.id);
              const displayPrice = Math.round(plan.price_monthly / 100);

              return (
                <Card
                  key={plan.id}
                  className={`relative transition-all hover:shadow-md ${
                    isCurrent ? 'border-green-500 ring-1 ring-green-500/20' : 
                    isPopular ? 'border-primary ring-1 ring-primary/20' : ''
                  }`}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 right-2 bg-green-600 text-white text-[10px] px-1.5 py-0">
                      Current
                    </Badge>
                  )}
                  {isPopular && !isCurrent && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                      Popular
                    </Badge>
                  )}
                  <CardContent className="p-3 pt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`p-1.5 rounded bg-gradient-to-r ${gradient}`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium capitalize text-sm">{plan.name}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-2xl font-bold">${displayPrice}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Video className="h-3 w-3" />
                      <span>{plan.max_videos_per_day} videos/day</span>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {features.slice(0, 2).map((feature, index) => (
                        <li key={index} className="flex items-center gap-1 text-xs">
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {planAction === 'current' ? (
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs" disabled>
                        <Check className="h-3 w-3 mr-1" />
                        Current
                      </Button>
                    ) : planAction === 'subscribe' ? (
                      <Button size="sm" className="w-full h-7 text-xs" onClick={handleGoToAccounts}>
                        Get Started
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full h-7 text-xs"
                        variant={planAction === 'upgrade' ? 'default' : 'secondary'}
                        onClick={() => handleSwitchPlan(plan)}
                      >
                        {planAction === 'upgrade' ? 'Upgrade' : 'Switch'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Separator className="my-2" />

        {/* Volume Discount Calculator - Compact */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Volume Calculator</span>
            </div>
            {currentDiscount > 0 && (
              <Badge className="bg-green-500 text-white text-xs">{currentDiscount}% OFF</Badge>
            )}
          </div>
          
          {/* Progress Bar to Next Tier */}
          {userAccountCount > 0 && progress.hasNextTier && (
            <div className="mb-3 p-2 bg-background/50 rounded-md">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  You: {userAccountCount} account{userAccountCount !== 1 ? 's' : ''} ({progress.currentDiscount}% tier)
                </span>
                <span className="font-medium text-primary">
                  +{progress.remaining} → {progress.nextDiscount}% off
                </span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              {accountCount !== userAccountCount && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs mt-1.5 p-0 text-primary hover:text-primary/80"
                  onClick={() => setAccountCount(userAccountCount)}
                >
                  Use my count ({userAccountCount})
                </Button>
              )}
            </div>
          )}

          {/* Account Counter + Slider */}
          <div className="flex items-center gap-3 mb-3">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setAccountCount(Math.max(1, accountCount - 1))} disabled={accountCount <= 1}>
              <Minus className="h-3 w-3" />
            </Button>
            <div className="flex-1">
              <Slider value={[accountCount]} onValueChange={([value]) => setAccountCount(value)} min={1} max={15} step={1} />
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setAccountCount(Math.min(15, accountCount + 1))} disabled={accountCount >= 15}>
              <Plus className="h-3 w-3" />
            </Button>
            <div className="text-center min-w-[50px]">
              <span className="text-lg font-bold">{accountCount}</span>
              <span className="text-[10px] text-muted-foreground block">accounts</span>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex gap-2 mb-3">
            <Button variant={billingCycle === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('monthly')} className="flex-1 h-7 text-xs">
              Monthly
            </Button>
            <Button variant={billingCycle === 'annual' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('annual')} className="flex-1 h-7 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Annual -20%
            </Button>
          </div>

          {/* Tier Pills */}
          <div className="flex gap-1 mb-3">
            {VOLUME_DISCOUNTS.map((tier, index) => {
              const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
              const tierLabel = tier.maxAccounts === Infinity ? `${tier.minAccounts}+` : `${tier.minAccounts}-${tier.maxAccounts}`;
              
              return (
                <div 
                  key={index}
                  className={`flex-1 text-center py-1.5 px-1 rounded text-xs transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground font-medium' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="font-medium">{tierLabel}</div>
                  <div className={`text-[10px] ${isActive ? 'opacity-80' : 'text-green-600'}`}>
                    {tier.discount === 0 ? '0%' : `-${Math.round(tier.discount * 100)}%`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Savings Display */}
          {(currentDiscount > 0 || billingCycle === 'annual') && (
            <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded-md">
              <div className="flex items-center gap-1.5">
                <PiggyBank className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Yearly Savings</span>
              </div>
              <span className="text-lg font-bold text-green-600 tabular-nums">${animatedSavings.toFixed(0)}</span>
            </div>
          )}

          {/* Quick Price Grid */}
          {sortedPlans && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {sortedPlans.map((plan) => {
                const basePrice = Math.round(plan.price_monthly / 100);
                const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
                const totalPrice = calculateTotalPrice(basePrice, accountCount);
                const hasDiscount = currentDiscount > 0 || billingCycle === 'annual';
                const annualData = calculateAnnualWithVolumeDiscount(basePrice, accountCount);
                const displayPrice = billingCycle === 'monthly' ? discountedPrice : annualData.annualPerAccountPerMonth;
                const displayTotal = billingCycle === 'monthly' ? totalPrice : annualData.totalAnnualPerMonth;

                return (
                  <div key={plan.id} className="bg-background rounded p-2 border text-center">
                    <div className="text-xs font-medium capitalize mb-1">{plan.name}</div>
                    {hasDiscount && <div className="text-[10px] text-muted-foreground line-through">${basePrice}/ea</div>}
                    <div className="text-sm font-bold text-primary">${displayPrice.toFixed(2)}/ea</div>
                    <div className="text-[10px] text-muted-foreground">${displayTotal.toFixed(0)}/mo total</div>
                    <Button size="sm" variant="ghost" className="w-full h-6 text-[10px] mt-1" onClick={() => handleVolumeDiscountContact(plan)}>
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ROI Calculator - Collapsible */}
        <Collapsible open={showROI} onOpenChange={setShowROI}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1">
              <Target className="h-3 w-3" />
              ROI Calculator
              {showROI ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-muted/30 rounded-lg p-3 border">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Avg views/video</label>
                  <Select value={avgViews} onValueChange={setAvgViews}>
                    <SelectTrigger className="h-8 text-xs">
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
                  <label className="text-xs text-muted-foreground mb-1 block">CPM Rate ($)</label>
                  <Select value={cpmRate} onValueChange={setCpmRate}>
                    <SelectTrigger className="h-8 text-xs">
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

              <div className="text-xs text-muted-foreground mb-2">
                Pro Plan × {accountCount} accounts = {roiData.monthlyVideos.toLocaleString()} videos/mo
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background rounded p-2">
                  <div className="text-[10px] text-muted-foreground">Cost</div>
                  <div className="text-sm font-bold">${roiData.monthlySubscriptionCost.toFixed(0)}</div>
                </div>
                <div className="bg-background rounded p-2">
                  <div className="text-[10px] text-muted-foreground">Est. Earnings</div>
                  <div className="text-sm font-bold text-green-600">${roiData.monthlyEarnings.toFixed(0)}</div>
                </div>
                <div className={`rounded p-2 ${roiData.roi > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <div className="text-[10px] text-muted-foreground">ROI</div>
                  <div className={`text-sm font-bold ${roiData.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roiData.roi > 0 ? '+' : ''}{roiData.roi.toFixed(0)}%
                  </div>
                </div>
              </div>

              {roiData.profit > 0 && (
                <div className="mt-2 text-center text-xs text-green-600 font-medium">
                  Potential profit: ${roiData.profit.toFixed(0)}/month
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Compare Features - Collapsible */}
        <Collapsible open={showComparison} onOpenChange={setShowComparison}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1">
              Compare Features
              {showComparison ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {sortedPlans && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium text-xs py-2">Feature</TableHead>
                      {sortedPlans.map((plan) => (
                        <TableHead key={plan.id} className="text-center font-medium capitalize text-xs py-2">
                          {plan.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs py-1.5">Videos/Day</TableCell>
                      {sortedPlans.map((plan) => (
                        <TableCell key={plan.id} className="text-center text-xs font-semibold text-primary py-1.5">
                          {plan.max_videos_per_day}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs py-1.5">Price</TableCell>
                      {sortedPlans.map((plan) => (
                        <TableCell key={plan.id} className="text-center text-xs font-semibold py-1.5">
                          ${Math.round(plan.price_monthly / 100)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {allFeatureKeys.slice(0, 6).map((featureKey) => (
                      <TableRow key={featureKey}>
                        <TableCell className="text-xs py-1.5">
                          {featureLabels[featureKey] || featureKey.replace(/_/g, ' ')}
                        </TableCell>
                        {sortedPlans.map((plan) => (
                          <TableCell key={plan.id} className="text-center py-1.5">
                            {planHasFeature(plan.features, featureKey) ? (
                              <Check className="h-3.5 w-3.5 text-green-500 mx-auto" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleGoToAccounts}>
            <Video className="h-3 w-3 mr-1" />
            TikTok Accounts
          </Button>
          <Button size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={handleContactWhatsApp}>
            <MessageCircle className="h-3 w-3 mr-1" />
            WhatsApp
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Subscriptions are per TikTok account.
        </p>
      </DialogContent>
    </Dialog>
  );
}
