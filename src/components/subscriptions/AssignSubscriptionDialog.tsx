import { useState, useEffect } from 'react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptions';
import { useAssignUserSubscription, UserSubscription } from '@/hooks/useUserSubscription';
import { 
  getDiscountPercentage, 
  calculateDiscountedPrice,
  calculateTotalPrice,
  calculateSavings,
  getDiscountTierLabel,
  ANNUAL_DISCOUNT,
  calculateAnnualWithVolumeDiscount,
} from '@/lib/pricing';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Check, Loader2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface AssignSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    email: string;
    full_name?: string | null;
  };
  currentSubscription?: UserSubscription | null;
}

export function AssignSubscriptionDialog({
  open,
  onOpenChange,
  user,
  currentSubscription,
}: AssignSubscriptionDialogProps) {
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const assignSubscription = useAssignUserSubscription();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [accountCount, setAccountCount] = useState(1);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [paymentNotes, setPaymentNotes] = useState('');

  // Update expiry when billing interval changes
  useEffect(() => {
    if (!currentSubscription) {
      const months = billingInterval === 'yearly' ? 12 : 1;
      setExpiresAt(addMonths(new Date(), months));
    }
  }, [billingInterval, currentSubscription]);

  useEffect(() => {
    if (currentSubscription) {
      setSelectedPlanId(currentSubscription.plan_id);
      setAccountCount(currentSubscription.account_count);
      setBillingInterval(currentSubscription.billing_interval || 'monthly');
      if (currentSubscription.expires_at) {
        setExpiresAt(new Date(currentSubscription.expires_at));
      }
      setPaymentNotes(currentSubscription.payment_notes || '');
    } else {
      setSelectedPlanId('pro');
      setAccountCount(1);
      setBillingInterval('monthly');
      setExpiresAt(addMonths(new Date(), 1));
      setPaymentNotes('');
    }
  }, [currentSubscription, open]);

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);
  const discountPercentage = getDiscountPercentage(accountCount);
  const discountLabel = getDiscountTierLabel(accountCount);

  // Calculate pricing based on billing interval
  const pricingDetails = selectedPlan 
    ? calculateAnnualWithVolumeDiscount(selectedPlan.price_monthly, accountCount)
    : null;

  const pricePerAccount = billingInterval === 'yearly' 
    ? pricingDetails?.annualPerAccountPerMonth || 0
    : pricingDetails?.monthlyPerAccount || 0;

  const totalMonthlyEquivalent = billingInterval === 'yearly'
    ? pricingDetails?.totalAnnualPerMonth || 0
    : pricingDetails?.totalMonthly || 0;

  const totalCharge = billingInterval === 'yearly'
    ? pricingDetails?.totalAnnualYear || 0
    : pricingDetails?.totalMonthly || 0;

  const totalSavings = billingInterval === 'yearly'
    ? pricingDetails?.totalSavingsYear || 0
    : calculateSavings(selectedPlan?.price_monthly || 0, accountCount);

  const handleSubmit = async () => {
    await assignSubscription.mutateAsync({
      userId: user.user_id,
      planId: selectedPlanId,
      accountCount,
      billingInterval,
      startsAt: new Date(),
      expiresAt,
      paymentNotes: paymentNotes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentSubscription ? 'Update Subscription' : 'Assign Subscription'}
          </DialogTitle>
          <DialogDescription>
            {currentSubscription ? 'Update' : 'Assign'} subscription for {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        {plansLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Plan Selection */}
            <div className="space-y-3">
              <Label>Select Plan</Label>
              <RadioGroup
                value={selectedPlanId}
                onValueChange={setSelectedPlanId}
                className="grid grid-cols-3 gap-3"
              >
                {plans?.filter(p => p.is_active).map((plan) => (
                  <div key={plan.id}>
                    <RadioGroupItem
                      value={plan.id}
                      id={`plan-${plan.id}`}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`plan-${plan.id}`}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                        selectedPlanId === plan.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="font-medium capitalize">{plan.name}</span>
                      <span className="text-lg font-bold">${plan.price_monthly}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.max_videos_per_day} videos/day
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Billing Interval Toggle */}
            <div className="space-y-3">
              <Label>Billing Period</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors",
                    billingInterval === 'monthly'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-medium">Monthly</span>
                  <span className="text-xs text-muted-foreground">Billed every month</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('yearly')}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors",
                    billingInterval === 'yearly'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Badge className="absolute -top-2 right-2 bg-emerald-500 text-white text-xs">
                    Save {Math.round(ANNUAL_DISCOUNT * 100)}%
                  </Badge>
                  <span className="font-medium">Yearly</span>
                  <span className="text-xs text-muted-foreground">Billed annually</span>
                </button>
              </div>
            </div>

            {/* Account Count */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="accountCount">Number of Accounts</Label>
                {discountPercentage > 0 && (
                  <Badge variant="secondary" className="text-emerald-600">
                    {discountLabel}
                  </Badge>
                )}
              </div>
              <Input
                id="accountCount"
                type="number"
                min={1}
                value={accountCount}
                onChange={(e) => setAccountCount(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="Enter number of accounts"
                className="w-full"
              />
            </div>

            {/* Pricing Summary */}
            {selectedPlan && pricingDetails && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium capitalize">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per account</span>
                  <span>
                    {(discountPercentage > 0 || billingInterval === 'yearly') && (
                      <span className="line-through text-muted-foreground mr-2">
                        ${selectedPlan.price_monthly}
                      </span>
                    )}
                    <span className="font-medium">${pricePerAccount.toFixed(2)}/mo</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Accounts</span>
                  <span className="font-medium">{accountCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Billing</span>
                  <span className="font-medium capitalize">{billingInterval}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">
                    {billingInterval === 'yearly' ? 'Total for 12 months' : 'Total Monthly'}
                  </span>
                  <span className="font-bold text-lg">${totalCharge.toFixed(2)}</span>
                </div>
                {billingInterval === 'yearly' && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Monthly equivalent</span>
                    <span>${totalMonthlyEquivalent.toFixed(2)}/mo</span>
                  </div>
                )}
                {totalSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 text-sm">
                    <span>You save</span>
                    <span className="font-medium">
                      ${totalSavings.toFixed(2)}{billingInterval === 'yearly' ? '/year' : '/mo'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Expiry Date */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Expiry Date</Label>
                <span className="text-xs text-muted-foreground">
                  Auto-set to {billingInterval === 'yearly' ? '12 months' : '1 month'}
                </span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Payment Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any payment or subscription notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={assignSubscription.isPending || plansLoading}
          >
            {assignSubscription.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {currentSubscription ? 'Update' : 'Assign'} Subscription
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
