import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionBadge } from '@/components/subscriptions/SubscriptionBadge';
import { SubscriptionDialog } from '@/components/subscriptions/SubscriptionDialog';
import { RenewalReminderBanner } from '@/components/subscriptions/RenewalReminderBanner';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useUserSubscriptions, AccountSubscription } from '@/hooks/useSubscriptions';
import { CreditCard, Calendar, Users, Zap, Clock, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { generateGeneralWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';

export default function MySubscriptions() {
  const { data: accounts, isLoading: accountsLoading } = useTikTokAccounts();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useUserSubscriptions();
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isLoading = accountsLoading || subscriptionsLoading;

  // Create a map of subscriptions by tiktok_account_id
  const subscriptionMap = new Map<string, AccountSubscription>();
  subscriptions?.forEach((sub) => {
    subscriptionMap.set(sub.tiktok_account_id, sub);
  });

  // Stats
  const activeCount = subscriptions?.filter((s) => s.status === 'active').length || 0;
  const pendingCount = subscriptions?.filter((s) => s.status === 'pending').length || 0;
  const totalAccounts = accounts?.length || 0;

  const handleOpenDialog = (accountId: string, username: string) => {
    setSelectedAccount({ id: accountId, username });
    setDialogOpen(true);
  };

  const getSubscriptionForAccount = (accountId: string) => {
    return subscriptionMap.get(accountId);
  };

  const handleRenewClick = (accountId: string) => {
    const account = accounts?.find(a => a.id === accountId);
    if (account) {
      handleOpenDialog(account.id, account.username);
    }
  };

  const handleWhatsAppContact = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  return (
    <DashboardLayout title="My Subscriptions" description="Manage subscriptions for your TikTok accounts">
      <div className="space-y-6">
        {/* WhatsApp Payment Info Card */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 shrink-0">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Payment via WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  To subscribe or renew, contact us on WhatsApp. Your subscription will be activated after payment confirmation.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  WhatsApp: <span className="font-medium text-foreground">{WHATSAPP_DISPLAY}</span>
                </p>
              </div>
            </div>
            <Button 
              onClick={handleWhatsAppContact}
              className="bg-green-600 hover:bg-green-700 text-white shrink-0"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact WhatsApp
            </Button>
          </CardContent>
        </Card>

        {/* Expiring Subscriptions Banner */}
        <RenewalReminderBanner 
          variant="detailed" 
          showDismiss={false}
          onRenewClick={handleRenewClick}
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{activeCount}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{pendingCount}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalAccounts}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Subscriptions
            </CardTitle>
            <CardDescription>
              View and manage subscriptions for each of your TikTok accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : accounts?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No TikTok Accounts</h3>
                <p className="text-muted-foreground mb-4">
                  Add a TikTok account first to subscribe to a plan
                </p>
                <Button variant="outline" asChild>
                  <a href="/dashboard/tiktok">Add TikTok Account</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts?.map((account) => {
                  const subscription = getSubscriptionForAccount(account.id);
                  const isActive = subscription?.status === 'active';
                  const isPending = subscription?.status === 'pending';
                  const expiresAt = subscription?.expires_at;

                  return (
                    <div
                      key={account.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={account.avatar_url || undefined} alt={account.username} />
                        <AvatarFallback>{account.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">
                            {account.display_name || account.username}
                          </span>
                          <SubscriptionBadge
                            planId={subscription?.plan_id}
                            status={subscription?.status}
                            size="sm"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">@{account.username}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {isActive && expiresAt && (
                          <div className="text-right hidden sm:block">
                            <div className="text-xs text-muted-foreground">Expires</div>
                            <div className="text-sm font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(expiresAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        )}

                        {isPending && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Awaiting Approval
                          </Badge>
                        )}

                        <Button
                          variant={subscription ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleOpenDialog(account.id, account.username)}
                        >
                          {subscription ? (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              {isPending ? 'Update' : 'Manage'}
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              Subscribe
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Dialog */}
      {selectedAccount && (
        <SubscriptionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tiktokAccountId={selectedAccount.id}
          tiktokUsername={selectedAccount.username}
          currentSubscription={getSubscriptionForAccount(selectedAccount.id)}
        />
      )}
    </DashboardLayout>
  );
}
