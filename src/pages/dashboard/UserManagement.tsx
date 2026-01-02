import { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  useAllUsers, 
  usePendingInvitations,
  useInviteUser,
  useCancelInvitation,
  useResendInvitation,
  useDeleteUser,
  UserWithLimitsAndUsage,
} from '@/hooks/useUserManagement';
import { useAllUserSubscriptions, UserSubscription } from '@/hooks/useUserSubscription';
import { AssignSubscriptionDialog } from '@/components/subscriptions/AssignSubscriptionDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  Users, 
  Crown, 
  User, 
  Mail, 
  Send,
  Clock,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  CreditCard,
  Search,
  MoreHorizontal,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';

// Animated counter component
const AnimatedCounter = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

// Stats card component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradientClass,
  subtitle,
  trend,
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  gradientClass: string;
  subtitle?: string;
  trend?: { value: number; label: string };
}) => (
  <Card className={cn(
    "relative overflow-hidden border-0",
    gradientClass
  )}>
    <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-white/10" />
    <div className="absolute bottom-0 left-0 w-16 h-16 -ml-4 -mb-4 rounded-full bg-white/5" />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
      <CardTitle className="text-sm font-medium text-white/90">{title}</CardTitle>
      <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-white" />
      </div>
    </CardHeader>
    <CardContent className="relative">
      <div className="text-3xl font-bold text-white">
        <AnimatedCounter value={value} />
      </div>
      {subtitle && (
        <p className="text-sm text-white/70 mt-1">{subtitle}</p>
      )}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp className="h-3 w-3 text-white/80" />
          <span className="text-xs text-white/80">
            +{trend.value} {trend.label}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

// User avatar with initials
const UserAvatar = ({ name, email, size = 'default' }: { name?: string; email: string; size?: 'default' | 'sm' }) => {
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();
  
  const colors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-amber-500 to-amber-600',
    'bg-gradient-to-br from-rose-500 to-rose-600',
  ];
  
  const colorIndex = email.charCodeAt(0) % colors.length;
  
  return (
    <Avatar className={cn(size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')}>
      <AvatarFallback className={cn('text-white font-medium', colors[colorIndex], size === 'sm' && 'text-xs')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default function UserManagement() {
  const { isOwner, loading: authLoading } = useAuth();
  const { data: users, isLoading } = useAllUsers();
  const { data: pendingInvitations, isLoading: invitationsLoading } = usePendingInvitations();
  const { data: userSubscriptions } = useAllUserSubscriptions();
  const inviteUser = useInviteUser();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const deleteUser = useDeleteUser();

  const [inviteEmail, setInviteEmail] = useState('');
  const [assigningSubscription, setAssigningSubscription] = useState<UserWithLimitsAndUsage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending' | 'subscribed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithLimitsAndUsage | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const itemsPerPage = 10;

  // Create a map of user subscriptions
  const subscriptionMap = new Map<string, UserSubscription>(
    userSubscriptions?.map(s => [s.user_id, s]) || []
  );

  // Filter and search users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = [...users];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.email.toLowerCase().includes(query) ||
        (user.full_name && user.full_name.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (filterStatus === 'verified') {
      result = result.filter(user => user.email_confirmed_at);
    } else if (filterStatus === 'pending') {
      result = result.filter(user => !user.email_confirmed_at);
    } else if (filterStatus === 'subscribed') {
      result = result.filter(user => subscriptionMap.has(user.user_id));
    }
    
    return result;
  }, [users, searchQuery, filterStatus, subscriptionMap]);

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Redirect non-owners
  if (!authLoading && !isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    await inviteUser.mutateAsync({ email: inviteEmail.trim() });
    setInviteEmail('');
  };

  const handleDeleteClick = (user: UserWithLimitsAndUsage) => {
    setUserToDelete(user);
    setDeleteConfirmEmail('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete && deleteConfirmEmail === userToDelete.email) {
      deleteUser.mutate(userToDelete.user_id);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmEmail('');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm">
          <Crown className="h-3 w-3 mr-1" />
          Owner
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="border">
        <User className="h-3 w-3 mr-1" />
        User
      </Badge>
    );
  };

  const getSubscriptionBadge = (subscription: UserSubscription | undefined) => {
    if (!subscription) {
      return (
        <Badge variant="outline" className="text-muted-foreground border-dashed">
          No Subscription
        </Badge>
      );
    }

    const statusStyles: Record<string, string> = {
      active: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0',
      pending: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0',
      expired: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-0',
      cancelled: 'bg-muted text-muted-foreground',
    };

    return (
      <div className="space-y-1">
        <Badge className={cn('shadow-sm', statusStyles[subscription.status] || statusStyles.pending)}>
          <Sparkles className="h-3 w-3 mr-1" />
          {subscription.plan?.name || subscription.plan_id}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium">{subscription.account_count}</span>
          <span>accounts</span>
        </div>
        {subscription.status === 'active' && subscription.expires_at && (
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(subscription.expires_at), { addSuffix: true })}
          </p>
        )}
      </div>
    );
  };

  const UsageProgressBar = ({ current, max }: { current: number; max: number }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    
    const getProgressStyle = () => {
      if (percentage >= 100) return 'bg-gradient-to-r from-red-500 to-rose-500';
      if (percentage >= 80) return 'bg-gradient-to-r from-amber-500 to-yellow-500';
      return 'bg-gradient-to-r from-emerald-500 to-green-500';
    };
    
    return (
      <div className="w-24 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className={cn('font-medium', percentage >= 100 && 'text-destructive')}>
            {current}/{max}
          </span>
          <span className="text-muted-foreground">{Math.round(percentage)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className={cn("h-full transition-all duration-500", getProgressStyle())}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const totalUsers = users?.length || 0;
  const ownerCount = users?.filter(u => u.role === 'owner').length || 0;
  const activeSubscriptions = userSubscriptions?.filter(s => s.status === 'active').length || 0;
  const pendingCount = pendingInvitations?.length || 0;
  const verifiedUsers = users?.filter(u => u.email_confirmed_at).length || 0;

  // Calculate new users this month
  const newThisMonth = useMemo(() => {
    if (!users) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return users.filter(u => new Date(u.created_at) >= startOfMonth).length;
  }, [users]);

  const filterButtons = [
    { key: 'all', label: 'All Users', count: users?.length || 0 },
    { key: 'verified', label: 'Verified', count: verifiedUsers },
    { key: 'pending', label: 'Pending', count: totalUsers - verifiedUsers },
    { key: 'subscribed', label: 'With Subscription', count: userSubscriptions?.length || 0 },
  ] as const;

  return (
    <DashboardLayout title="User Management" description="Manage platform users and their subscriptions">
      <div className="space-y-6">

        {/* Stats Dashboard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <StatCard 
                title="Total Users"
                value={totalUsers}
                icon={Users}
                gradientClass="bg-gradient-to-br from-blue-500 to-blue-600"
                subtitle={`${verifiedUsers} verified`}
                trend={{ value: newThisMonth, label: 'this month' }}
              />
              <StatCard 
                title="Active Subscriptions"
                value={activeSubscriptions}
                icon={CreditCard}
                gradientClass="bg-gradient-to-br from-purple-500 to-purple-600"
                subtitle={`${Math.round((activeSubscriptions / totalUsers) * 100) || 0}% of users`}
              />
              <StatCard 
                title="Pending Invitations"
                value={pendingCount}
                icon={Clock}
                gradientClass="bg-gradient-to-br from-amber-500 to-orange-500"
                subtitle={pendingCount > 0 ? 'Awaiting response' : 'No pending invites'}
              />
              <StatCard 
                title="Platform Owners"
                value={ownerCount}
                icon={Crown}
                gradientClass="bg-gradient-to-br from-rose-500 to-pink-500"
                subtitle="Full access"
              />
            </>
          )}
        </div>

        {/* Invite User Form */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Invite New User</CardTitle>
                <CardDescription>
                  Send an invitation email to add a new user to the platform
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Label htmlFor="email" className="sr-only">Email Address</Label>
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="pl-10 h-11"
                />
              </div>
              <Button 
                type="submit" 
                disabled={inviteUser.isPending || !inviteEmail.trim()}
                className="h-11 px-6"
              >
                {inviteUser.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {(pendingInvitations && pendingInvitations.length > 0) && (
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center relative">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {pendingInvitations.length}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-amber-700 dark:text-amber-400">Pending Invitations</CardTitle>
                  <CardDescription>
                    Users who have been invited but haven't accepted yet
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3">
                  {pendingInvitations.map(invitation => {
                    const hoursUntilExpiry = differenceInHours(new Date(invitation.expires_at), new Date());
                    const isExpiringSoon = hoursUntilExpiry < 24;
                    
                    return (
                      <div 
                        key={invitation.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border bg-card",
                          isExpiringSoon && "border-destructive/50 bg-destructive/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar email={invitation.email} size="sm" />
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Sent {formatDistanceToNow(new Date(invitation.invited_at), { addSuffix: true })}</span>
                              <span>•</span>
                              <span className={cn(isExpiringSoon && 'text-destructive font-medium')}>
                                {isExpiringSoon && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                                Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendInvitation.mutate({ email: invitation.email })}
                                  disabled={resendInvitation.isPending}
                                >
                                  <RefreshCw className={cn("h-4 w-4", resendInvitation.isPending && "animate-spin")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Resend invitation</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => cancelInvitation.mutate(invitation.id)}
                                  disabled={cancelInvitation.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancel invitation</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {filteredUsers.length} user{filteredUsers.length !== 1 && 's'} found
                </CardDescription>
              </div>
              
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {filterButtons.map(filter => (
                <Button
                  key={filter.key}
                  variant={filterStatus === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setFilterStatus(filter.key);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'rounded-full',
                    filterStatus === filter.key && 'shadow-md'
                  )}
                >
                  {filter.label}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'ml-2 h-5 px-1.5 text-xs',
                      filterStatus === filter.key && 'bg-white/20 text-inherit'
                    )}
                  >
                    {filter.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : paginatedUsers.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[280px]">User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>TikTok Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Sign In</TableHead>
                        <TableHead className="text-right w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map(user => {
                        const subscription = subscriptionMap.get(user.user_id);
                        const maxAccounts = subscription?.account_count || user.limits?.max_tiktok_accounts || 0;
                        
                        return (
                          <TableRow 
                            key={user.id}
                            className="group hover:bg-muted/50 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <UserAvatar name={user.full_name || undefined} email={user.email} />
                                <div>
                                  <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>{getSubscriptionBadge(subscription)}</TableCell>
                            <TableCell>
                              {user.role === 'owner' ? (
                                <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Unlimited
                                </Badge>
                              ) : (
                                <UsageProgressBar 
                                  current={user.tiktok_count} 
                                  max={maxAccounts}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {user.email_confirmed_at ? (
                                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {user.last_sign_in_at ? (
                                formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                              ) : (
                                <span className="text-muted-foreground/60">Never</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {user.role === 'owner' ? (
                                <span className="text-sm text-muted-foreground">—</span>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => setAssigningSubscription(user)}>
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      {subscription ? 'Edit Subscription' : 'Assign Subscription'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteClick(user)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t p-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            if (totalPages <= 5) return true;
                            if (page === 1 || page === totalPages) return true;
                            if (Math.abs(page - currentPage) <= 1) return true;
                            return false;
                          })
                          .map((page, idx, arr) => {
                            const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                            return (
                              <PaginationItem key={page}>
                                {showEllipsis && <span className="px-2">...</span>}
                                <PaginationLink
                                  isActive={currentPage === page}
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No users found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Invite users to get started'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Subscription Dialog */}
      {assigningSubscription && (
        <AssignSubscriptionDialog
          open={!!assigningSubscription}
          onOpenChange={(open) => !open && setAssigningSubscription(null)}
          user={assigningSubscription}
          currentSubscription={subscriptionMap.get(assigningSubscription.user_id)}
        />
      )}

      {/* Enhanced Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete User Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {userToDelete && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <UserAvatar 
                      name={userToDelete.full_name || undefined} 
                      email={userToDelete.email} 
                    />
                    <div>
                      <p className="font-medium">{userToDelete.full_name || 'Unnamed User'}</p>
                      <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">This will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>{userToDelete?.tiktok_count || 0} TikTok accounts</li>
                    <li>{userToDelete?.youtube_count || 0} YouTube channels</li>
                    <li>All scraped videos and upload history</li>
                    <li>User profile and settings</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-email" className="text-foreground">
                    Type <span className="font-mono font-medium">{userToDelete?.email}</span> to confirm
                  </Label>
                  <Input
                    id="confirm-email"
                    placeholder="Enter email to confirm"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmEmail !== userToDelete?.email || deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
