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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Separator } from '@/components/ui/separator';
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
  Crown,
  Zap,
  Rocket,
  Filter,
} from 'lucide-react';
import { format, addMonths, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

// History action config for display
const actionConfig: Record<string, { icon: typeof Plus; label: string; color: string }> = {
  created: { icon: Plus, label: 'Created', color: 'text-success' },
  renewed: { icon: RefreshCw, label: 'Renewed', color: 'text-info' },
  upgraded: { icon: ArrowUp, label: 'Upgraded', color: 'text-primary' },
  downgraded: { icon: ArrowDown, label: 'Downgraded', color: 'text-warning' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: 'text-destructive' },
  expired: { icon: Clock, label: 'Expired', color: 'text-muted-foreground' },
  updated: { icon: Edit, label: 'Updated', color: 'text-info' },
};

// Plan icon mapping
const planIcons: Record<string, typeof Zap> = {
  basic: Zap,
  pro: Crown,
  scale: Rocket,
};

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  trend,
  onClick,
  isActive,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Users;
  iconClassName?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        isActive && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            "bg-primary/10"
          )}>
            <Icon className={cn("h-6 w-6", iconClassName || "text-primary")} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-medium",
                trend.value > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              )}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}
            </Badge>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Filter Chip Component
function FilterChip({
  label,
  count,
  isActive,
  onClick,
  variant = 'default',
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}) {
  const variants = {
    default: isActive ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
    warning: isActive ? 'bg-warning text-warning-foreground' : 'bg-warning/10 text-warning hover:bg-warning/20',
    success: isActive ? 'bg-success text-success-foreground' : 'bg-success/10 text-success hover:bg-success/20',
    destructive: isActive ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
        variants[variant]
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
          isActive ? "bg-background/20" : "bg-foreground/10"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function SubscriptionManagement() {
  const { isOwner, loading: authLoading } = useAuth();
  const { data: subscriptions, isLoading, refetch } = useAllUserSubscriptions();
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

      // Special filter for expiring soon
      if (statusFilter === 'expiring') {
        if (sub.status !== 'active' || !sub.expires_at) return false;
        const daysUntilExpiry = differenceInDays(new Date(sub.expires_at), new Date());
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 7 && matchesSearch;
      }

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!subscriptions) return { pending: 0, active: 0, revenue: 0, total: 0, expiringSoon: 0, cancelled: 0 };

    const pending = subscriptions.filter((s) => s.status === 'pending').length;
    const active = subscriptions.filter((s) => s.status === 'active').length;
    const cancelled = subscriptions.filter((s) => s.status === 'cancelled' || s.status === 'expired').length;
    const revenue = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        const plan = plans?.find((p) => p.id === s.plan_id);
        return sum + (plan?.price_monthly || 0) * (s.account_count || 1);
      }, 0);
    
    // Count subscriptions expiring within 7 days
    const expiringSoon = subscriptions.filter((s) => {
      if (s.status !== 'active' || !s.expires_at) return false;
      const daysUntilExpiry = differenceInDays(new Date(s.expires_at), new Date());
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    }).length;

    return { pending, active, revenue, total: subscriptions.length, expiringSoon, cancelled };
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
      billingInterval: selectedSubscription.billing_interval || 'monthly',
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

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.[0]?.toUpperCase() || '?';
  };

  const selectedPlan = plans?.find(p => p.id === activateForm.planId);
  const estimatedTotal = selectedPlan ? (selectedPlan.price_monthly / 100) * activateForm.accountCount : 0;

  return (
    <DashboardLayout title="Subscription Management" description="Manage user subscriptions and billing">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Active Subscriptions"
          value={stats.active}
          subtitle={`${stats.total} total users`}
          icon={Users}
          iconClassName="text-success"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${(stats.revenue / 100).toLocaleString()}`}
          subtitle="From active subscriptions"
          icon={DollarSign}
          iconClassName="text-info"
        />
        <StatCard
          title="Pending Activation"
          value={stats.pending}
          subtitle="Awaiting payment confirmation"
          icon={Clock}
          iconClassName="text-warning"
          onClick={() => setStatusFilter('pending')}
          isActive={statusFilter === 'pending'}
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          subtitle="Within next 7 days"
          icon={AlertTriangle}
          iconClassName={stats.expiringSoon > 0 ? "text-warning" : "text-muted-foreground"}
          onClick={() => setStatusFilter('expiring')}
          isActive={statusFilter === 'expiring'}
        />
      </div>

      {/* Filters & Search */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            {/* Search and Actions Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  className="h-10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All"
                count={stats.total}
                isActive={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <FilterChip
                label="Active"
                count={stats.active}
                isActive={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
                variant="success"
              />
              <FilterChip
                label="Pending"
                count={stats.pending}
                isActive={statusFilter === 'pending'}
                onClick={() => setStatusFilter('pending')}
                variant="warning"
              />
              <FilterChip
                label="Expiring"
                count={stats.expiringSoon}
                isActive={statusFilter === 'expiring'}
                onClick={() => setStatusFilter('expiring')}
                variant="warning"
              />
              <FilterChip
                label="Inactive"
                count={stats.cancelled}
                isActive={statusFilter === 'expired' || statusFilter === 'cancelled'}
                onClick={() => setStatusFilter('expired')}
                variant="destructive"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Subscriptions</CardTitle>
              <CardDescription className="mt-1">
                {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No subscriptions found</p>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No subscriptions have been created yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[280px]">User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredSubscriptions.map((subscription) => {
                    const plan = plans?.find((p) => p.id === subscription.plan_id);
                    const expiryInfo = getExpiryInfo(subscription);
                    const PlanIcon = planIcons[subscription.plan_id || 'basic'] || Zap;

                    return (
                      <TableRow 
                        key={subscription.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-border">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {getInitials(subscription.user?.full_name || undefined, subscription.user?.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {subscription.user?.full_name || 'No name'}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {subscription.user?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center",
                              subscription.plan_id === 'scale' && "bg-purple-500/10",
                              subscription.plan_id === 'pro' && "bg-info/10",
                              (!subscription.plan_id || subscription.plan_id === 'basic') && "bg-success/10"
                            )}>
                              <PlanIcon className={cn(
                                "h-4 w-4",
                                subscription.plan_id === 'scale' && "text-purple-500",
                                subscription.plan_id === 'pro' && "text-info",
                                (!subscription.plan_id || subscription.plan_id === 'basic') && "text-success"
                              )} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{plan?.name || 'Basic'}</p>
                              <p className="text-xs text-muted-foreground">
                                ${plan ? (plan.price_monthly / 100).toFixed(0) : '?'}/mo
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {subscription.account_count || 1} slot{(subscription.account_count || 1) !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <SubscriptionBadge 
                            planId={subscription.plan_id} 
                            status={subscription.status} 
                          />
                        </TableCell>
                        <TableCell>
                          {expiryInfo ? (
                            <div className={cn(
                              "text-sm",
                              expiryInfo.isExpiringSoon && "text-warning font-medium",
                              expiryInfo.isExpired && "text-destructive font-medium"
                            )}>
                              <p>{expiryInfo.date}</p>
                              {expiryInfo.isExpiringSoon && !expiryInfo.isExpired && (
                                <p className="text-xs opacity-80">{expiryInfo.daysUntil}d left</p>
                              )}
                              {expiryInfo.isExpired && (
                                <p className="text-xs opacity-80">Expired</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewHistory(subscription)}>
                                <History className="mr-2 h-4 w-4" />
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {subscription.status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleActivate(subscription)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
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
                                  <DropdownMenuItem onClick={() => handleCancel(subscription)} className="text-destructive focus:text-destructive">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                                <DropdownMenuItem onClick={() => handleActivate(subscription)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activate/Reactivate Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
            <DialogDescription>
              Configure subscription for <span className="font-medium text-foreground">{selectedSubscription?.user?.email}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Plan Selection */}
            <div className="space-y-2">
              <Label>Select Plan</Label>
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
                      <div className="flex items-center gap-2">
                        <span>{plan.name}</span>
                        <span className="text-muted-foreground">— ${plan.price_monthly / 100}/mo</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Count */}
            <div className="space-y-2">
              <Label>Account Slots</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={activateForm.accountCount}
                onChange={(e) => setActivateForm(f => ({ ...f, accountCount: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">Number of TikTok accounts allowed</p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={activateForm.startsAt}
                  onChange={(e) => setActivateForm(f => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={activateForm.expiresAt}
                  onChange={(e) => setActivateForm(f => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>

            {/* Payment Notes */}
            <div className="space-y-2">
              <Label>Payment Notes</Label>
              <Textarea
                placeholder="e.g., PayPal transaction ID, invoice number..."
                value={activateForm.paymentNotes}
                onChange={(e) => setActivateForm(f => ({ ...f, paymentNotes: e.target.value }))}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Summary Card */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{selectedPlan?.name || 'Basic'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Accounts</span>
                <span className="font-medium">{activateForm.accountCount}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Estimated Monthly</span>
                <span className="text-lg font-bold">${estimatedTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmActivate} disabled={assignSubscription.isPending}>
              {assignSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Expiry Dialog */}
      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Expiry Date</DialogTitle>
            <DialogDescription>
              Update expiry for <span className="font-medium text-foreground">{selectedSubscription?.user?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Expiry Date</Label>
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
              Update Expiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Accounts Dialog */}
      <Dialog open={adjustAccountsDialogOpen} onOpenChange={setAdjustAccountsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Account Limit</DialogTitle>
            <DialogDescription>
              Update limit for <span className="font-medium text-foreground">{selectedSubscription?.user?.email}</span>
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
                Current limit: {selectedSubscription?.account_count || 1} slots
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustAccountsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAdjustAccounts} disabled={updateSubscription.isPending}>
              {updateSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription History</DialogTitle>
            <DialogDescription>
              Timeline for <span className="font-medium text-foreground">{selectedSubscription?.user?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            {historyLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !historyData || historyData.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-14 w-14 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <History className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-medium">No history available</p>
                <p className="text-sm text-muted-foreground mt-1">Changes will appear here</p>
              </div>
            ) : (
              <div className="relative py-2">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-4">
                  {historyData.map((entry, index) => {
                    const config = actionConfig[entry.action] || actionConfig.updated;
                    const Icon = config.icon;

                    return (
                      <div key={entry.id} className="relative flex gap-4 pl-2">
                        <div className={cn(
                          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background",
                          entry.action === 'created' && 'bg-success/10',
                          entry.action === 'renewed' && 'bg-info/10',
                          entry.action === 'upgraded' && 'bg-primary/10',
                          entry.action === 'downgraded' && 'bg-warning/10',
                          entry.action === 'cancelled' && 'bg-destructive/10',
                          entry.action === 'expired' && 'bg-muted',
                          entry.action === 'updated' && 'bg-info/10',
                        )}>
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{config.label}</p>
                            <time className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(entry.created_at), 'MMM d, yyyy')}
                            </time>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {entry.plan?.name && `${entry.plan.name}`}
                            {entry.account_count && ` • ${entry.account_count} accounts`}
                            {entry.expires_at && ` • Until ${format(new Date(entry.expires_at), 'MMM d')}`}
                          </p>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic bg-muted/50 rounded px-2 py-1">
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
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
