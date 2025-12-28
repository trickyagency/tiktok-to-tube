import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, Crown, Zap, Rocket, Loader2 } from 'lucide-react';
import { useSubscriptionPlans, useCreateSubscriptionRequest, AccountSubscription } from '@/hooks/useSubscriptions';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiktokAccountId: string;
  tiktokUsername: string;
  currentSubscription?: AccountSubscription | null;
}

const planIcons = {
  basic: Zap,
  pro: Crown,
  scale: Rocket,
};

const planColors = {
  basic: 'border-emerald-500 bg-emerald-500/5',
  pro: 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20',
  scale: 'border-purple-500 bg-purple-500/5',
};

const planFeatures = {
  basic: [
    'Up to 2 videos/day',
    'Watermark-free uploads',
    'Auto upload',
    'Basic SEO (title + description)',
    'Standard queue',
  ],
  pro: [
    'Up to 4 videos/day',
    'Watermark-free uploads',
    'Advanced SEO (hashtags + keywords)',
    'Auto scheduling',
    'Faster processing',
    'Re-upload protection',
  ],
  scale: [
    'Up to 6 videos/day (MAX)',
    'Smart SEO (AI-optimized titles)',
    'Best posting time',
    'Duplicate detection',
    'Priority processing',
    'Growth optimization',
  ],
};

export function SubscriptionDialog({
  open,
  onOpenChange,
  tiktokAccountId,
  tiktokUsername,
  currentSubscription,
}: SubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const createRequest = useCreateSubscriptionRequest();

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    
    await createRequest.mutateAsync({
      tiktokAccountId,
      planId: selectedPlan,
    });
    
    onOpenChange(false);
    setSelectedPlan(null);
  };

  const isPending = currentSubscription?.status === 'pending';
  const isActive = currentSubscription?.status === 'active';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isActive ? 'Change Plan' : 'Subscribe'} for @{tiktokUsername}
          </DialogTitle>
          <DialogDescription>
            {isPending 
              ? 'Your subscription request is pending approval. You can change your plan selection below.'
              : isActive
              ? 'Select a new plan to request a plan change.'
              : 'Select a plan to start uploading videos from this account.'}
          </DialogDescription>
        </DialogHeader>

        {plansLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 py-4">
              {plans?.map((plan) => {
                const Icon = planIcons[plan.id as keyof typeof planIcons] || Zap;
                const features = planFeatures[plan.id as keyof typeof planFeatures] || [];
                const isCurrentPlan = currentSubscription?.plan_id === plan.id;
                const isSelected = selectedPlan === plan.id;

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'relative cursor-pointer p-4 transition-all hover:shadow-md',
                      planColors[plan.id as keyof typeof planColors],
                      isSelected && 'ring-2 ring-primary',
                      isCurrentPlan && 'opacity-60'
                    )}
                    onClick={() => !isCurrentPlan && setSelectedPlan(plan.id)}
                  >
                    {plan.id === 'pro' && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white">
                        MOST POPULAR 🔥
                      </Badge>
                    )}

                    {isCurrentPlan && (
                      <Badge variant="secondary" className="absolute -top-2 right-2">
                        Current
                      </Badge>
                    )}

                    <div className="mb-4 mt-2">
                      <Icon className={cn(
                        'h-8 w-8 mb-2',
                        plan.id === 'basic' && 'text-emerald-500',
                        plan.id === 'pro' && 'text-blue-500',
                        plan.id === 'scale' && 'text-purple-500'
                      )} />
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold">${plan.price_monthly / 100}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className={cn(
                            'h-4 w-4 mt-0.5 flex-shrink-0',
                            plan.id === 'basic' && 'text-emerald-500',
                            plan.id === 'pro' && 'text-blue-500',
                            plan.id === 'scale' && 'text-purple-500'
                          )} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>

            {isPending && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">⏳ Awaiting Payment Confirmation</p>
                <p className="mt-1 text-amber-600 dark:text-amber-500">
                  Your subscription request has been submitted. The owner will activate it after payment confirmation.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                disabled={!selectedPlan || createRequest.isPending}
              >
                {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Update Request' : isActive ? 'Request Change' : 'Subscribe'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
