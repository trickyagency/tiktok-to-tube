import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionPlans, useUserSubscriptions } from '@/hooks/useSubscriptions';
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
  TrendingDown,
  Calendar,
} from 'lucide-react';

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
  basic: ['2 videos per day', 'Auto-scheduling', 'Basic support'],
  pro: ['4 videos per day', 'Priority scheduling', 'Priority support', 'Analytics access'],
  scale: ['6 videos per day', 'Fastest processing', 'Premium support', 'Full analytics', 'Custom scheduling'],
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
  const [showComparison, setShowComparison] = useState(false);
  const [accountCount, setAccountCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="h-5 w-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            Choose a plan that fits your content creation needs
          </DialogDescription>
        </DialogHeader>

        {/* How to Subscribe Section */}
        <div className="bg-muted/50 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">How to Subscribe</h3>
          </div>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
              <span>Add a TikTok account from the TikTok Accounts page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
              <span>Click "Subscribe" on the account card to select a plan</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
              <span>Complete payment via WhatsApp</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
              <span>Your subscription will be activated after payment confirmation</span>
            </li>
          </ol>
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">WhatsApp:</span>
            <span className="text-sm text-muted-foreground">{WHATSAPP_DISPLAY}</span>
          </div>
        </div>

        <Separator />

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-6 bg-muted rounded w-20" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-24 mb-4" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-4 bg-muted rounded" />
                    ))}
                  </div>
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
                  className={`relative transition-all hover:shadow-lg ${
                    isCurrent ? 'border-green-500 ring-2 ring-green-500/20' : 
                    isPopular ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 right-2 bg-green-600 text-white">
                      Current Plan
                    </Badge>
                  )}
                  {isPopular && !isCurrent && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${gradient}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <CardTitle className="text-lg capitalize">{plan.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-3xl font-bold">${displayPrice}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.max_videos_per_day} videos/day</span>
                    </div>
                    {planAction !== 'subscribe' && (
                      <div className={`text-xs font-medium ${
                        planAction === 'current' ? 'text-green-600' :
                        planAction === 'upgrade' ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {planAction === 'current' && '✓ Your active plan'}
                        {planAction === 'upgrade' && '↑ Upgrade'}
                        {planAction === 'downgrade' && '↓ Downgrade'}
                      </div>
                    )}
                    <ul className="space-y-2">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Discount Badge */}
                    <div className="flex items-center gap-1.5 p-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-md border border-amber-500/20">
                      <TrendingDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Up to 50% off with bulk accounts
                      </span>
                    </div>
                    
                    {/* Action Button */}
                    <div className="pt-2">
                      {planAction === 'current' ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          disabled
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Current Plan
                        </Button>
                      ) : planAction === 'subscribe' ? (
                        <Button 
                          size="sm" 
                          className="w-full" 
                          onClick={handleGoToAccounts}
                        >
                          Get Started
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className={`w-full ${planAction === 'upgrade' ? 'bg-primary hover:bg-primary/90' : ''}`}
                          variant={planAction === 'upgrade' ? 'default' : 'secondary'}
                          onClick={() => handleSwitchPlan(plan)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {planAction === 'upgrade' ? 'Upgrade Now' : 'Switch Plan'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Volume Discount Calculator */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Volume Discount Calculator</h3>
            {currentDiscount > 0 && (
              <Badge className="bg-green-500 text-white ml-auto">
                {currentDiscount}% OFF
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            How many TikTok accounts do you want to manage?
          </p>

          {/* Account Counter */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAccountCount(Math.max(1, accountCount - 1))}
              disabled={accountCount <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex flex-col items-center min-w-[100px]">
              <span className="text-3xl font-bold">{accountCount}</span>
              <span className="text-xs text-muted-foreground">account{accountCount !== 1 ? 's' : ''}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAccountCount(Math.min(15, accountCount + 1))}
              disabled={accountCount >= 15}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Slider */}
          <div className="mb-4 px-2">
            <Slider
              value={[accountCount]}
              onValueChange={([value]) => setAccountCount(value)}
              min={1}
              max={15}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBillingCycle('monthly')}
              className="min-w-[100px]"
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBillingCycle('annual')}
              className="min-w-[140px]"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Annual (Save 20%)
            </Button>
          </div>

          {/* Discount Tier Breakdown */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium mb-2 text-center">Volume Discount Tiers (Pro Plan Example)</p>
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              {VOLUME_DISCOUNTS.map((tier, index) => {
                const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
                const priceExample = tier.discount === 0 ? 12 : Math.round(12 * (1 - tier.discount));
                const tierLabel = tier.maxAccounts === Infinity ? `${tier.minAccounts}+` : `${tier.minAccounts}-${tier.maxAccounts}`;
                
                return (
                  <div 
                    key={index}
                    className={`p-2 rounded transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary' 
                        : 'bg-background'
                    }`}
                  >
                    <div className="font-medium">{tierLabel}</div>
                    <div className={isActive ? 'font-bold' : 'text-green-600 dark:text-green-400'}>
                      ${priceExample}/ea
                    </div>
                    <div className={`text-[10px] ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>
                      {tier.discount === 0 ? '0%' : `${Math.round(tier.discount * 100)}% off`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Grid */}
          {sortedPlans && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {sortedPlans.map((plan) => {
                const Icon = planIcons[plan.id] || Zap;
                const basePrice = Math.round(plan.price_monthly / 100);
                const annualData = calculateAnnualWithVolumeDiscount(basePrice, accountCount);
                const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
                const totalPrice = calculateTotalPrice(basePrice, accountCount);
                const savings = calculateSavings(basePrice, accountCount);
                const hasDiscount = currentDiscount > 0;

                const displayPrice = billingCycle === 'monthly' ? discountedPrice : annualData.annualPerAccountPerMonth;
                const displayTotal = billingCycle === 'monthly' ? totalPrice : annualData.totalAnnualPerMonth;
                const displaySavings = billingCycle === 'monthly' ? savings : annualData.totalSavingsYear / 12;

                return (
                  <div
                    key={plan.id}
                    className="bg-background rounded-lg p-3 border text-center"
                  >
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize text-sm">{plan.name}</span>
                    </div>
                    <div className="space-y-1">
                      {(hasDiscount || billingCycle === 'annual') && (
                        <div className="text-muted-foreground line-through text-xs">
                          ${basePrice}/each
                        </div>
                      )}
                      <div className="text-lg font-bold text-primary">
                        ${displayPrice.toFixed(2)}/each
                      </div>
                      <div className="text-sm">
                        Total: <span className="font-semibold">${displayTotal.toFixed(2)}</span>/mo
                      </div>
                      {(hasDiscount || billingCycle === 'annual') && displaySavings > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          Save ${displaySavings.toFixed(2)}/mo
                        </div>
                      )}
                      {billingCycle === 'annual' && (
                        <div className="text-[10px] text-muted-foreground">
                          (${annualData.totalAnnualYear.toFixed(0)}/year)
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => handleVolumeDiscountContact(plan)}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Combined Savings Display for Annual */}
          {billingCycle === 'annual' && currentDiscount > 0 && sortedPlans && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Percent className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Combined Discount Applied!
                </span>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Volume ({currentDiscount}%) + Annual ({Math.round(ANNUAL_DISCOUNT * 100)}%) = Maximum savings
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center font-medium">
            Scale more, pay less — up to 50% off per account
          </p>
        </div>


        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2"
          >
            {showComparison ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Comparison
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Compare All Features
              </>
            )}
          </Button>
        </div>

        {/* Plan Comparison Table */}
        {showComparison && sortedPlans && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Feature</TableHead>
                  {sortedPlans.map((plan) => (
                    <TableHead key={plan.id} className="text-center font-semibold capitalize">
                      {plan.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Videos per day row */}
                <TableRow>
                  <TableCell className="font-medium">Videos per Day</TableCell>
                  {sortedPlans.map((plan) => (
                    <TableCell key={plan.id} className="text-center font-semibold text-primary">
                      {plan.max_videos_per_day}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Monthly price row */}
                <TableRow>
                  <TableCell className="font-medium">Monthly Price</TableCell>
                  {sortedPlans.map((plan) => (
                    <TableCell key={plan.id} className="text-center font-semibold">
                      ${Math.round(plan.price_monthly / 100)}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Feature rows */}
                {allFeatureKeys.map((featureKey) => (
                  <TableRow key={featureKey}>
                    <TableCell className="font-medium">
                      {featureLabels[featureKey] || featureKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </TableCell>
                    {sortedPlans.map((plan) => (
                      <TableCell key={plan.id} className="text-center">
                        {planHasFeature(plan.features, featureKey) ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleGoToAccounts}
          >
            <Video className="h-4 w-4 mr-2" />
            Go to TikTok Accounts
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleContactWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact on WhatsApp
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Subscriptions are per TikTok account. Each account needs its own subscription.
        </p>
      </DialogContent>
    </Dialog>
  );
}
