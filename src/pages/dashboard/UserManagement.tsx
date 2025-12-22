import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsers, usePromoteToAdmin, useRemoveAdminRole } from '@/hooks/useUserManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Users, Crown, Shield, User, ShieldPlus, ShieldMinus } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function UserManagement() {
  const { isOwner, loading: authLoading } = useAuth();
  const { data: users, isLoading } = useAllUsers();
  const promoteToAdmin = usePromoteToAdmin();
  const removeAdminRole = useRemoveAdminRole();

  // Redirect non-owners
  if (!authLoading && !isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
            <Crown className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            User
          </Badge>
        );
    }
  };

  const totalUsers = users?.length || 0;
  const adminCount = users?.filter(u => u.role === 'admin').length || 0;
  const ownerCount = users?.filter(u => u.role === 'owner').length || 0;

  return (
    <DashboardLayout title="User Management" description="Manage platform users and their roles">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
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
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{adminCount}</div>
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
              View and manage user roles. Only owners can access this page.
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role === 'owner' ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : user.role === 'admin' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <ShieldMinus className="h-4 w-4 mr-1" />
                                Remove Admin
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Admin Role?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove admin privileges from {user.email}. They will become a regular user.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeAdminRole.mutate(user.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove Admin
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ShieldPlus className="h-4 w-4 mr-1" />
                                Make Admin
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Promote to Admin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will give {user.email} admin privileges. They will be able to manage content across the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => promoteToAdmin.mutate(user.user_id)}
                                >
                                  Promote to Admin
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
