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
import { Check, Crown, Zap, Rocket, Loader2, MessageCircle } from 'lucide-react';
import { useSubscriptionPlans, useCreateSubscriptionRequest, AccountSubscription } from '@/hooks/useSubscriptions';
import { useAuth } from '@/contexts/AuthContext';
import { generateWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';
import { toast } from 'sonner';

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
  const { user } = useAuth();

  const isRenewal = currentSubscription?.status === 'active';
  const isPending = currentSubscription?.status === 'pending';

  const handlePayViaWhatsApp = async () => {
    if (!selectedPlan) return;
    
    const selectedPlanData = plans?.find(p => p.id === selectedPlan);
    if (!selectedPlanData) return;

    // Generate WhatsApp link
    const whatsappLink = generateWhatsAppLink({
      type: isRenewal ? 'renew' : 'new',
      username: tiktokUsername,
      planName: selectedPlanData.name,
      planPrice: selectedPlanData.price_monthly / 100,
      userEmail: user?.email,
      expiryDate: currentSubscription?.expires_at 
        ? new Date(currentSubscription.expires_at).toLocaleDateString() 
        : undefined,
    });

    // Open WhatsApp in new tab
    window.open(whatsappLink, '_blank');

    // Create subscription request as pending
    await createRequest.mutateAsync({
      tiktokAccountId,
      planId: selectedPlan,
    });
    
    toast.success('Subscription request submitted! Complete payment via WhatsApp.');
    onOpenChange(false);
    setSelectedPlan(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isRenewal ? 'Renew Subscription' : 'Subscribe'} for @{tiktokUsername}
          </DialogTitle>
          <DialogDescription>
            {isPending 
              ? 'Your subscription request is pending approval. You can change your plan selection below.'
              : isRenewal
              ? 'Select a plan to renew your subscription.'
              : 'Select a plan to start uploading videos from this account.'}
          </DialogDescription>
        </DialogHeader>

        {plansLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Payment Instructions */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">How to Subscribe</p>
                  <ol className="text-sm text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                    <li>Select a plan below</li>
                    <li>Click "Pay via WhatsApp"</li>
                    <li>Complete payment via WhatsApp</li>
                    <li>Your subscription will be activated after payment confirmation</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    WhatsApp: <span className="font-medium text-foreground">{WHATSAPP_DISPLAY}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 py-4">
              {plans?.map((plan) => {
                const Icon = planIcons[plan.id as keyof typeof planIcons] || Zap;
                const features = planFeatures[plan.id as keyof typeof planFeatures] || [];
                const isCurrentPlan = currentSubscription?.plan_id === plan.id && isRenewal;
                const isSelected = selectedPlan === plan.id;

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'relative cursor-pointer p-4 transition-all hover:shadow-md',
                      planColors[plan.id as keyof typeof planColors],
                      isSelected && 'ring-2 ring-primary'
                    )}
                    onClick={() => setSelectedPlan(plan.id)}
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
                  Your subscription request has been submitted. Complete payment via WhatsApp to activate.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePayViaWhatsApp}
                disabled={!selectedPlan || createRequest.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <MessageCircle className="mr-2 h-4 w-4" />
                Pay via WhatsApp
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
