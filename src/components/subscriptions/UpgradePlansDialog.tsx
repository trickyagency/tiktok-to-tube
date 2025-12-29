import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionPlans } from '@/hooks/useSubscriptions';
import { generateGeneralWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';
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
  const { data: plans, isLoading } = useSubscriptionPlans();
  const [showComparison, setShowComparison] = useState(false);

  const handleContactWhatsApp = () => {
    const link = generateGeneralWhatsAppLink();
    window.open(link, '_blank');
  };

  const handleGoToAccounts = () => {
    onOpenChange(false);
    navigate('/dashboard/tiktok');
  };

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

              return (
                <Card
                  key={plan.id}
                  className={`relative transition-all hover:shadow-lg ${
                    isPopular ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                >
                  {isPopular && (
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
                      <span className="text-3xl font-bold">${plan.price_monthly}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.max_videos_per_day} videos/day</span>
                    </div>
                    <ul className="space-y-2">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Compare All Features Toggle */}
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
                      ${plan.price_monthly}
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
