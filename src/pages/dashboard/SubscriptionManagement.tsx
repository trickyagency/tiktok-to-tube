import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  useAllSubscriptions,
  useSubscriptionPlans,
  useActivateSubscription,
  useCancelSubscription,
  useUpdateSubscription,
  useDeleteSubscriptionRequest,
  AccountSubscription,
} from '@/hooks/useSubscriptions';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionBadge } from '@/components/subscriptions/SubscriptionBadge';
import {
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SubscriptionManagement() {
  const { isOwner, loading: authLoading } = useAuth();
  const { data: subscriptions, isLoading } = useAllSubscriptions();
  const { data: plans } = useSubscriptionPlans();
  const activateSubscription = useActivateSubscription();
  const cancelSubscription = useCancelSubscription();
  const updateSubscription = useUpdateSubscription();
  const deleteRequest = useDeleteSubscriptionRequest();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<AccountSubscription | null>(null);
  const [activateForm, setActivateForm] = useState({
    startsAt: format(new Date(), 'yyyy-MM-dd'),
    expiresAt: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    paymentNotes: '',
  });

  // Redirect non-owners
  if (!authLoading && !isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];

    return subscriptions.filter((sub) => {
      const matchesSearch =
        sub.tiktok_account?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!subscriptions) return { pending: 0, active: 0, revenue: 0, total: 0 };

    const pending = subscriptions.filter((s) => s.status === 'pending').length;
    const active = subscriptions.filter((s) => s.status === 'active').length;
    const revenue = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        const plan = plans?.find((p) => p.id === s.plan_id);
        return sum + (plan?.price_monthly || 0);
      }, 0);

    return { pending, active, revenue, total: subscriptions.length };
  }, [subscriptions, plans]);

  const handleActivate = (subscription: AccountSubscription) => {
    setSelectedSubscription(subscription);
    setActivateForm({
      startsAt: format(new Date(), 'yyyy-MM-dd'),
      expiresAt: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      paymentNotes: '',
    });
    setActivateDialogOpen(true);
  };

  const confirmActivate = async () => {
    if (!selectedSubscription) return;

    await activateSubscription.mutateAsync({
      subscriptionId: selectedSubscription.id,
      startsAt: new Date(activateForm.startsAt),
      expiresAt: new Date(activateForm.expiresAt),
      paymentNotes: activateForm.paymentNotes,
    });

    setActivateDialogOpen(false);
    setSelectedSubscription(null);
  };

  const handleCancel = async (subscription: AccountSubscription) => {
    if (confirm(`Cancel subscription for @${subscription.tiktok_account?.username}?`)) {
      await cancelSubscription.mutateAsync(subscription.id);
    }
  };

  const handleDelete = async (subscription: AccountSubscription) => {
    if (confirm(`Delete subscription request for @${subscription.tiktok_account?.username}?`)) {
      await deleteRequest.mutateAsync(subscription.id);
    }
  };

  const handleExtend = async (subscription: AccountSubscription) => {
    const newExpiry = addMonths(new Date(subscription.expires_at || new Date()), 1);
    await updateSubscription.mutateAsync({
      subscriptionId: subscription.id,
      expiresAt: newExpiry,
    });
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

  return (
    <DashboardLayout title="Subscription Management" description="Manage user subscription requests and payments">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscriptions</CardTitle>
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
                placeholder="Search by username or email..."
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
          <CardTitle>Subscriptions</CardTitle>
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
                : 'No subscription requests yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => {
                  const plan = plans?.find((p) => p.id === subscription.plan_id);

                  return (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={subscription.tiktok_account?.avatar_url || undefined} />
                            <AvatarFallback>
                              {subscription.tiktok_account?.username?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">@{subscription.tiktok_account?.username}</span>
                        </div>
                      </TableCell>
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
                      <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                      <TableCell>
                        {subscription.starts_at && subscription.expires_at ? (
                          <div className="text-sm">
                            <div>{format(new Date(subscription.starts_at), 'MMM d, yyyy')}</div>
                            <div className="text-muted-foreground">
                              to {format(new Date(subscription.expires_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(subscription.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {subscription.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleActivate(subscription)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                  Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(subscription)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Request
                                </DropdownMenuItem>
                              </>
                            )}
                            {subscription.status === 'active' && (
                              <>
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

      {/* Activate Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
            <DialogDescription>
              Confirm payment and activate subscription for @{selectedSubscription?.tiktok_account?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <SubscriptionBadge planId={selectedSubscription?.plan_id} status="active" />
              <div>
                <div className="font-medium">{selectedSubscription?.plan?.name} Plan</div>
                <div className="text-sm text-muted-foreground">
                  ${selectedSubscription?.plan?.price_monthly ? selectedSubscription.plan.price_monthly / 100 : '?'}/month
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Start Date</Label>
                <Input
                  id="startsAt"
                  type="date"
                  value={activateForm.startsAt}
                  onChange={(e) => setActivateForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={activateForm.expiresAt}
                  onChange={(e) => setActivateForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Payment Notes (optional)</Label>
              <Textarea
                id="paymentNotes"
                placeholder="e.g., PayPal transaction ID, bank reference..."
                value={activateForm.paymentNotes}
                onChange={(e) => setActivateForm((f) => ({ ...f, paymentNotes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmActivate} disabled={activateSubscription.isPending}>
              {activateSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
