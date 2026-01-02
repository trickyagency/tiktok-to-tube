import { Zap, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateQuickRenewalWhatsAppLink } from "@/lib/whatsapp";
import { calculateDiscountedPrice, getDiscountPercentage, calculateTotalPrice, ANNUAL_DISCOUNT } from "@/lib/pricing";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import type { UserSubscription } from "@/hooks/useUserSubscription";

interface QuickRenewButtonProps {
  subscription: UserSubscription;
  className?: string;
  variant?: 'default' | 'compact';
  showPriceSummary?: boolean;
}

export function QuickRenewButton({ 
  subscription, 
  className = "",
  variant = 'default',
  showPriceSummary = false
}: QuickRenewButtonProps) {
  const { user } = useAuth();
  
  const planName = subscription.plan?.name || "Unknown Plan";
  const basePrice = subscription.plan?.price_monthly || 0;
  const accountCount = subscription.account_count || 1;
  const billingInterval = subscription.billing_interval;
  const expiryDate = subscription.expires_at 
    ? format(new Date(subscription.expires_at), "MMMM d, yyyy")
    : undefined;
  
  // Calculate pricing
  const discountPercentage = getDiscountPercentage(accountCount);
  const pricePerAccount = calculateDiscountedPrice(basePrice, accountCount);
  
  // Calculate total - apply annual discount if yearly
  let totalPrice = calculateTotalPrice(basePrice, accountCount);
  if (billingInterval === 'yearly') {
    totalPrice = Math.round(totalPrice * (1 - ANNUAL_DISCOUNT) * 12 * 100) / 100;
  }
  
  const handleQuickRenew = () => {
    const link = generateQuickRenewalWhatsAppLink({
      planName,
      planBasePrice: basePrice,
      accountCount,
      billingInterval,
      expiryDate,
      userEmail: user?.email,
      volumeDiscount: discountPercentage,
      pricePerAccount,
      totalPrice
    });
    window.open(link, '_blank');
  };

  const periodLabel = billingInterval === 'yearly' ? 'year' : 'month';

  const priceSummary = (
    <div className="text-xs space-y-1">
      <div className="font-medium">{planName}</div>
      <div>{accountCount} account{accountCount > 1 ? 's' : ''}</div>
      {discountPercentage > 0 && (
        <div className="text-emerald-400">{discountPercentage}% volume discount</div>
      )}
      <div className="font-semibold">
        ${totalPrice.toFixed(2)}/{periodLabel}
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleQuickRenew}
              className={`w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-2 ${className}`}
            >
              <Zap className="h-4 w-4" />
              Quick Renew via WhatsApp
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">
            {priceSummary}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showPriceSummary && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium">{planName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Accounts</span>
            <span className="font-medium">{accountCount}</span>
          </div>
          {discountPercentage > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Volume Discount</span>
              <span className="font-medium text-emerald-500">{discountPercentage}% off</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary">
              ${totalPrice.toFixed(2)}/{periodLabel}
            </span>
          </div>
        </div>
      )}
      
      <Button
        onClick={handleQuickRenew}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-2"
      >
        <Zap className="h-4 w-4" />
        Quick Renew
        <MessageCircle className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
