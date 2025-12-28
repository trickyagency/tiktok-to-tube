import { useState } from 'react';
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
  useUpdateUserLimits,
  UserWithLimitsAndUsage,
} from '@/hooks/useUserManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Settings2,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

export default function UserManagement() {
  const { isOwner, loading: authLoading } = useAuth();
  const { data: users, isLoading } = useAllUsers();
  const { data: pendingInvitations, isLoading: invitationsLoading } = usePendingInvitations();
  const inviteUser = useInviteUser();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const deleteUser = useDeleteUser();
  const updateUserLimits = useUpdateUserLimits();

  const [inviteEmail, setInviteEmail] = useState('');
  const [editingLimitsUser, setEditingLimitsUser] = useState<UserWithLimitsAndUsage | null>(null);
  const [limitsForm, setLimitsForm] = useState({ maxTikTok: 1, maxYouTube: 1 });

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

  const handleEditLimits = (user: UserWithLimitsAndUsage) => {
    setEditingLimitsUser(user);
    setLimitsForm({
      maxTikTok: user.limits?.max_tiktok_accounts ?? 1,
      maxYouTube: user.limits?.max_youtube_channels ?? 1,
    });
  };

  const handleSaveLimits = async () => {
    if (!editingLimitsUser) return;
    
    await updateUserLimits.mutateAsync({
      userId: editingLimitsUser.user_id,
      maxTikTokAccounts: limitsForm.maxTikTok,
      maxYouTubeChannels: limitsForm.maxYouTube,
    });
    setEditingLimitsUser(null);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') {
      return (
        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
          <Crown className="h-3 w-3 mr-1" />
          Owner
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <User className="h-3 w-3 mr-1" />
        User
      </Badge>
    );
  };

  const UsageProgressBar = ({ current, max }: { current: number; max: number }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    
    const getProgressColor = () => {
      if (percentage >= 100) return 'bg-destructive';
      if (percentage >= 80) return 'bg-amber-500';
      return 'bg-emerald-500';
    };
    
    return (
      <div className="w-20 space-y-1">
        <div className="flex justify-between text-xs">
          <span className={cn(percentage >= 100 && 'text-destructive font-medium')}>
            {current}/{max}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className={cn("h-full transition-all", getProgressColor())}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const totalUsers = users?.length || 0;
  const ownerCount = users?.filter(u => u.role === 'owner').length || 0;

  return (
    <DashboardLayout title="User Management" description="Manage platform users and their account limits">
      <div className="space-y-6">

        {/* Invite User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite New User
            </CardTitle>
            <CardDescription>
              Send an invitation email to add a new user to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={inviteUser.isPending || !inviteEmail.trim()}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                Users who have been invited but haven't accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map(invitation => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.invited_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resendInvitation.mutate({ 
                              email: invitation.email, 
                            })}
                            disabled={resendInvitation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => cancelInvitation.mutate(invitation.id)}
                            disabled={cancelInvitation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalUsers}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owners</CardTitle>
              <Crown className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{ownerCount}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              View and manage users and their account limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>TikTok Accounts</TableHead>
                      <TableHead>YouTube Channels</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
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
                        <TableCell>
                          {user.role === 'owner' ? (
                            <span className="text-sm text-muted-foreground">Unlimited</span>
                          ) : (
                            <UsageProgressBar 
                              current={user.tiktok_count} 
                              max={user.limits?.max_tiktok_accounts ?? 1}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {user.role === 'owner' ? (
                            <span className="text-sm text-muted-foreground">Unlimited</span>
                          ) : (
                            <UsageProgressBar 
                              current={user.youtube_count} 
                              max={user.limits?.max_youtube_channels ?? 1}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.role === 'owner' ? (
                            <span className="text-sm text-muted-foreground">-</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLimits(user)}
                              >
                                <Settings2 className="h-4 w-4 mr-1" />
                                Limits
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete <strong>{user.email}</strong> and all their data including TikTok accounts, YouTube channels, scraped videos, and upload history. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUser.mutate(user.user_id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Limits Dialog */}
      <Dialog open={!!editingLimitsUser} onOpenChange={(open) => !open && setEditingLimitsUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account Limits</DialogTitle>
            <DialogDescription>
              Set the maximum number of accounts and channels for {editingLimitsUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxTikTok">Max TikTok Accounts</Label>
              <Input
                id="maxTikTok"
                type="number"
                min={0}
                max={100}
                value={limitsForm.maxTikTok}
                onChange={(e) => setLimitsForm(prev => ({ ...prev, maxTikTok: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Currently using: {editingLimitsUser?.tiktok_count || 0} accounts
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxYouTube">Max YouTube Channels</Label>
              <Input
                id="maxYouTube"
                type="number"
                min={0}
                max={100}
                value={limitsForm.maxYouTube}
                onChange={(e) => setLimitsForm(prev => ({ ...prev, maxYouTube: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Currently using: {editingLimitsUser?.youtube_count || 0} channels
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLimitsUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLimits} disabled={updateUserLimits.isPending}>
              {updateUserLimits.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Limits'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
