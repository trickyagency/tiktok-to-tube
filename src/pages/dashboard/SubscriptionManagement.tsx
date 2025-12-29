import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  useAllUserSubscriptions,
  useAssignUserSubscription,
  useUpdateUserSubscription,
  useCancelUserSubscription,
  UserSubscription,
} from '@/hooks/useUserSubscription';
import { useSubscriptionPlans } from '@/hooks/useSubscriptions';
import { useUserSubscriptionHistory } from '@/hooks/useSubscriptionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionBadge } from '@/components/subscriptions/SubscriptionBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CalendarClock,
  History,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit,
} from 'lucide-react';
import { format, addMonths, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

// History action config for display
const actionConfig: Record<string, { icon: typeof Plus; label: string; color: string }> = {
  created: { icon: Plus, label: 'Created', color: 'text-green-500' },
  renewed: { icon: RefreshCw, label: 'Renewed', color: 'text-blue-500' },
  upgraded: { icon: ArrowUp, label: 'Upgraded', color: 'text-purple-500' },
  downgraded: { icon: ArrowDown, label: 'Downgraded', color: 'text-amber-500' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: 'text-destructive' },
  expired: { icon: Clock, label: 'Expired', color: 'text-muted-foreground' },
  updated: { icon: Edit, label: 'Updated', color: 'text-blue-500' },
};

export default function SubscriptionManagement() {
  const { isOwner, loading: authLoading, user } = useAuth();
  const { data: subscriptions, isLoading } = useAllUserSubscriptions();
  const { data: plans } = useSubscriptionPlans();
  const assignSubscription = useAssignUserSubscription();
  const updateSubscription = useUpdateUserSubscription();
  const cancelSubscription = useCancelUserSubscription();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [adjustAccountsDialogOpen, setAdjustAccountsDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [activateForm, setActivateForm] = useState({
    planId: 'basic',
    accountCount: 1,
    startsAt: format(new Date(), 'yyyy-MM-dd'),
    expiresAt: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    paymentNotes: '',
  });
  const [expiryForm, setExpiryForm] = useState({
    expiresAt: '',
  });
  const [accountsForm, setAccountsForm] = useState({
    accountCount: 1,
  });

  // History for selected user
  const { data: historyData, isLoading: historyLoading } = useUserSubscriptionHistory(
    historyDialogOpen ? selectedSubscription?.user_id : undefined
  );

  // Redirect non-owners
  if (!authLoading && !isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];

    return subscriptions.filter((sub) => {
      const matchesSearch =
        sub.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!subscriptions) return { pending: 0, active: 0, revenue: 0, total: 0, expiringSoon: 0 };

    const pending = subscriptions.filter((s) => s.status === 'pending').length;
    const active = subscriptions.filter((s) => s.status === 'active').length;
    const revenue = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        const plan = plans?.find((p) => p.id === s.plan_id);
        return sum + (plan?.price_monthly || 0);
      }, 0);
    
    // Count subscriptions expiring within 7 days
    const expiringSoon = subscriptions.filter((s) => {
      if (s.status !== 'active' || !s.expires_at) return false;
      const daysUntilExpiry = differenceInDays(new Date(s.expires_at), new Date());
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    }).length;

    return { pending, active, revenue, total: subscriptions.length, expiringSoon };
  }, [subscriptions, plans]);

  const handleActivate = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setActivateForm({
      planId: subscription.plan_id || 'basic',
      accountCount: subscription.account_count || 1,
      startsAt: format(new Date(), 'yyyy-MM-dd'),
      expiresAt: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      paymentNotes: '',
    });
    setActivateDialogOpen(true);
  };

  const confirmActivate = async () => {
    if (!selectedSubscription) return;

    await assignSubscription.mutateAsync({
      userId: selectedSubscription.user_id,
      planId: activateForm.planId,
      accountCount: activateForm.accountCount,
      startsAt: new Date(activateForm.startsAt),
      expiresAt: new Date(activateForm.expiresAt),
      paymentNotes: activateForm.paymentNotes,
    });

    setActivateDialogOpen(false);
    setSelectedSubscription(null);
  };

  const handleCancel = async (subscription: UserSubscription) => {
    if (confirm(`Cancel subscription for ${subscription.user?.email}?`)) {
      await cancelSubscription.mutateAsync(subscription.user_id);
    }
  };

  const handleExtend = async (subscription: UserSubscription) => {
    const newExpiry = addMonths(new Date(subscription.expires_at || new Date()), 1);
    await updateSubscription.mutateAsync({
      userId: subscription.user_id,
      expiresAt: newExpiry,
    });
  };

  const handleSetExpiry = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setExpiryForm({
      expiresAt: subscription.expires_at 
        ? format(new Date(subscription.expires_at), 'yyyy-MM-dd') 
        : format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    });
    setExpiryDialogOpen(true);
  };

  const confirmSetExpiry = async () => {
    if (!selectedSubscription) return;

    await updateSubscription.mutateAsync({
      userId: selectedSubscription.user_id,
      expiresAt: new Date(expiryForm.expiresAt),
    });

    setExpiryDialogOpen(false);
    setSelectedSubscription(null);
  };

  const handleAdjustAccounts = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setAccountsForm({
      accountCount: subscription.account_count || 1,
    });
    setAdjustAccountsDialogOpen(true);
  };

  const confirmAdjustAccounts = async () => {
    if (!selectedSubscription) return;

    await updateSubscription.mutateAsync({
      userId: selectedSubscription.user_id,
      accountCount: accountsForm.accountCount,
    });

    setAdjustAccountsDialogOpen(false);
    setSelectedSubscription(null);
  };

  const handleViewHistory = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setHistoryDialogOpen(true);
  };

  const handleFilterExpiringSoon = () => {
    setStatusFilter('active');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getExpiryInfo = (subscription: UserSubscription) => {
    if (!subscription.expires_at) return null;
    const daysUntil = differenceInDays(new Date(subscription.expires_at), new Date());
    const isExpiringSoon = daysUntil >= 0 && daysUntil <= 7;
    const isExpired = daysUntil < 0;

    return {
      date: format(new Date(subscription.expires_at), 'MMM d, yyyy'),
      daysUntil,
      isExpiringSoon,
      isExpired,
    };
  };

  return (
    <DashboardLayout title="Subscription Management" description="Manage user subscriptions and account limits">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent/50",
            stats.expiringSoon > 0 && "border-amber-500/50"
          )}
          onClick={handleFilterExpiringSoon}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", stats.expiringSoon > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.expiringSoon > 0 && "text-amber-600")}>{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">Within 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.revenue / 100).toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No subscriptions match your filters'
                : 'No subscriptions yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => {
                  const plan = plans?.find((p) => p.id === subscription.plan_id);
                  const expiryInfo = getExpiryInfo(subscription);

                  return (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.user?.full_name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground">{subscription.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SubscriptionBadge planId={subscription.plan_id} status="active" />
                          <span className="text-sm text-muted-foreground">
                            ${plan ? plan.price_monthly / 100 : '?'}/mo
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {subscription.account_count} account{subscription.account_count !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                      <TableCell>
                        {expiryInfo ? (
                          <div className={cn(
                            "text-sm",
                            expiryInfo.isExpiringSoon && "text-amber-600 font-medium",
                            expiryInfo.isExpired && "text-destructive font-medium"
                          )}>
                            <div>{expiryInfo.date}</div>
                            {expiryInfo.isExpiringSoon && (
                              <div className="text-xs">{expiryInfo.daysUntil} days left</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewHistory(subscription)}>
                              <History className="mr-2 h-4 w-4" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {subscription.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleActivate(subscription)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {subscription.status === 'active' && (
                              <>
                                <DropdownMenuItem onClick={() => handleAdjustAccounts(subscription)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  Adjust Accounts
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSetExpiry(subscription)}>
                                  <CalendarClock className="mr-2 h-4 w-4" />
                                  Set Expiry Date
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExtend(subscription)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Extend 1 Month
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCancel(subscription)} className="text-destructive">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                              <DropdownMenuItem onClick={() => handleActivate(subscription)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Activate/Reactivate Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
            <DialogDescription>
              Activate subscription for {selectedSubscription?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select 
                value={activateForm.planId} 
                onValueChange={(v) => setActivateForm(f => ({ ...f, planId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price_monthly / 100}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Slots</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={activateForm.accountCount}
                onChange={(e) => setActivateForm(f => ({ ...f, accountCount: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starts At</Label>
                <Input
                  type="date"
                  value={activateForm.startsAt}
                  onChange={(e) => setActivateForm(f => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Expires At</Label>
                <Input
                  type="date"
                  value={activateForm.expiresAt}
                  onChange={(e) => setActivateForm(f => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Notes (optional)</Label>
              <Textarea
                placeholder="e.g., PayPal transaction ID..."
                value={activateForm.paymentNotes}
                onChange={(e) => setActivateForm(f => ({ ...f, paymentNotes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmActivate} disabled={assignSubscription.isPending}>
              {assignSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Expiry Dialog */}
      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Expiry Date</DialogTitle>
            <DialogDescription>
              Update expiry date for {selectedSubscription?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Expires At</Label>
              <Input
                type="date"
                value={expiryForm.expiresAt}
                onChange={(e) => setExpiryForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSetExpiry} disabled={updateSubscription.isPending}>
              {updateSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Accounts Dialog */}
      <Dialog open={adjustAccountsDialogOpen} onOpenChange={setAdjustAccountsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Account Limit</DialogTitle>
            <DialogDescription>
              Update account limit for {selectedSubscription?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Account Slots</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={accountsForm.accountCount}
                onChange={(e) => setAccountsForm(f => ({ ...f, accountCount: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">
                Current: {selectedSubscription?.account_count || 1} account(s)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustAccountsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAdjustAccounts} disabled={updateSubscription.isPending}>
              {updateSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription History</DialogTitle>
            <DialogDescription>
              History for {selectedSubscription?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {historyLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !historyData || historyData.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No history available</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50 py-2">
                {historyData.map((entry) => {
                  const config = actionConfig[entry.action] || actionConfig.updated;
                  const Icon = config.icon;

                  return (
                    <div key={entry.id} className="flex gap-3 py-3">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        config.color === 'text-green-500' && 'bg-green-500/10',
                        config.color === 'text-blue-500' && 'bg-blue-500/10',
                        config.color === 'text-purple-500' && 'bg-purple-500/10',
                        config.color === 'text-amber-500' && 'bg-amber-500/10',
                        config.color === 'text-destructive' && 'bg-destructive/10',
                        config.color === 'text-muted-foreground' && 'bg-muted',
                      )}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{config.label}</p>
                          <time className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(entry.created_at), 'MMM d, yyyy')}
                          </time>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {entry.plan?.name && `${entry.plan.name}`}
                          {entry.account_count && ` • ${entry.account_count} accounts`}
                          {entry.expires_at && ` • Expires ${format(new Date(entry.expires_at), 'MMM d, yyyy')}`}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{entry.notes}"
                          </p>
                        )}
                        {entry.performer && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {entry.performer.full_name || entry.performer.email}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
