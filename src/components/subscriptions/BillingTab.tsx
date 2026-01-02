import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BillingInfoCard } from './BillingInfoCard';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  RefreshCw,
  FileText,
  MessageCircle,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format, differenceInDays, addMonths } from 'date-fns';
import { generateGeneralWhatsAppLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

interface BillingTabProps {
  subscription: any;
  planName: string;
  expiresAt: Date | null;
  daysRemaining: number | null;
  isOwner: boolean;
  onRequestUpgrade: () => void;
}

export function BillingTab({ 
  subscription, 
  planName, 
  expiresAt, 
  daysRemaining,
  isOwner,
  onRequestUpgrade
}: BillingTabProps) {
  const handleContactSupport = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  // Calculate billing info
  const startDate = subscription?.created_at ? new Date(subscription.created_at) : new Date();
  const nextBillingDate = expiresAt || addMonths(new Date(), 1);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 14;
  const status = isOwner ? 'Owner' : subscription?.status || 'active';

  // Mock invoice data - in production this would come from payment system
  const mockInvoices = [
    { id: 'INV-001', date: startDate, amount: '$29.00', status: 'paid' },
  ];

  return (
    <div className="space-y-6">
      {/* Main Billing Info */}
      <BillingInfoCard
        planName={planName}
        status={status}
        startDate={startDate}
        nextBillingDate={nextBillingDate}
        daysRemaining={daysRemaining}
        isOwner={isOwner}
        isExpiringSoon={isExpiringSoon}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Billing Cycle Card */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Billing Cycle</CardTitle>
                <CardDescription className="text-xs">Your current billing period</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Period Start</span>
                <span className="text-sm font-medium">{format(startDate, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Period End</span>
                <span className="text-sm font-medium">{format(nextBillingDate, 'MMM d, yyyy')}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Days Remaining</span>
                <Badge variant={isExpiringSoon ? "destructive" : "secondary"}>
                  {isOwner ? '∞' : `${daysRemaining || '—'} days`}
                </Badge>
              </div>
            </div>

            {isExpiringSoon && !isOwner && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Renewal recommended
                  </span>
                </div>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                  Your subscription expires soon. Renew to avoid service interruption.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">Payment Method</CardTitle>
                <CardDescription className="text-xs">How you pay for your subscription</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">WhatsApp Payment</p>
                  <p className="text-xs text-muted-foreground">Manual payment via WhatsApp</p>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleContactSupport}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Change Method
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onRequestUpgrade}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-base">Invoice History</CardTitle>
                <CardDescription className="text-xs">Your billing history and receipts</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mockInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mockInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invoice.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(invoice.date, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{invoice.amount}</span>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        invoice.status === 'paid' && "text-emerald-500 bg-emerald-500/10"
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border/50">
            <Button variant="outline" size="sm" className="w-full" onClick={handleContactSupport}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Request Invoice via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Need Help */}
      <Card className="bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Need help with billing?</h4>
                <p className="text-sm text-muted-foreground">Our support team is here to help</p>
              </div>
            </div>
            <Button onClick={handleContactSupport}>
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
