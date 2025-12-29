import { useState, useEffect } from 'react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptions';
import { useAssignUserSubscription, UserSubscription } from '@/hooks/useUserSubscription';
import { 
  getDiscountPercentage, 
  calculateDiscountedPrice,
  calculateTotalPrice,
  calculateSavings,
  getDiscountTierLabel,
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
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    if (currentSubscription) {
      setSelectedPlanId(currentSubscription.plan_id);
      setAccountCount(currentSubscription.account_count);
      if (currentSubscription.expires_at) {
        setExpiresAt(new Date(currentSubscription.expires_at));
      }
      setPaymentNotes(currentSubscription.payment_notes || '');
    } else {
      setSelectedPlanId('pro');
      setAccountCount(1);
      setExpiresAt(addMonths(new Date(), 1));
      setPaymentNotes('');
    }
  }, [currentSubscription, open]);

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);
  const discountPercentage = getDiscountPercentage(accountCount);
  const pricePerAccount = selectedPlan ? calculateDiscountedPrice(selectedPlan.price_monthly, accountCount) : 0;
  const totalPrice = selectedPlan ? calculateTotalPrice(selectedPlan.price_monthly, accountCount) : 0;
  const savings = selectedPlan ? calculateSavings(selectedPlan.price_monthly, accountCount) : 0;
  const discountLabel = getDiscountTierLabel(accountCount);

  const handleSubmit = async () => {
    await assignSubscription.mutateAsync({
      userId: user.user_id,
      planId: selectedPlanId,
      accountCount,
      startsAt: new Date(),
      expiresAt,
      paymentNotes: paymentNotes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
            {selectedPlan && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium capitalize">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per account</span>
                  <span>
                    {discountPercentage > 0 && (
                      <span className="line-through text-muted-foreground mr-2">
                        ${selectedPlan.price_monthly}
                      </span>
                    )}
                    <span className="font-medium">${pricePerAccount.toFixed(2)}</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Accounts</span>
                  <span className="font-medium">{accountCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Total Monthly</span>
                  <span className="font-bold text-lg">${totalPrice.toFixed(2)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-emerald-600 text-sm">
                    <span>You save</span>
                    <span className="font-medium">${savings.toFixed(2)}/mo</span>
                  </div>
                )}
              </div>
            )}

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label>Expiry Date</Label>
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
