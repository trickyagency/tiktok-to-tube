import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Youtube,
  Video,
  Calendar,
  CalendarClock,
  History,
  Settings,
  LogOut,
  Sparkles,
  Clock,
  Users,
  BarChart3,
  ChevronRight,
  Zap,
  Activity,
} from 'lucide-react';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  badge?: string;
  badgeVariant?: 'secondary' | 'destructive';
}

const DashboardSidebar = () => {
  const location = useLocation();
  const { signOut, user, isOwner } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { mismatchedCount } = usePublishQueue();

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const filterItems = (items: MenuItem[]) => 
    items.filter(item => !item.ownerOnly || isOwner);

  const isActive = (url: string) => location.pathname === url;

  // Build menu items with dynamic badge
  const mainMenuItems: MenuItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Schedules', url: '/dashboard/schedules', icon: CalendarClock },
    { 
      title: 'Video Queue', 
      url: '/dashboard/queue', 
      icon: Calendar,
      badge: mismatchedCount > 0 ? mismatchedCount.toString() : undefined,
      badgeVariant: 'destructive' as const,
    },
    { title: 'Upload History', url: '/dashboard/history', icon: History },
    { title: 'Upload Analytics', url: '/dashboard/upload-analytics', icon: BarChart3 },
  ];

  const platformMenuItems: MenuItem[] = [
    { title: 'YouTube Channels', url: '/dashboard/youtube', icon: Youtube },
    { title: 'TikTok Accounts', url: '/dashboard/tiktok', icon: Video },
  ];

  const adminMenuItems: MenuItem[] = [
    { title: 'Cron Monitor', url: '/dashboard/cron', icon: Clock },
    { title: 'Users', url: '/dashboard/users', icon: Users, ownerOnly: true },
    { title: 'Platform Stats', url: '/dashboard/analytics', icon: Activity, ownerOnly: true },
    { title: 'Settings', url: '/dashboard/settings', icon: Settings },
  ];

  const renderMenuItems = (items: MenuItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            tooltip={isCollapsed ? item.title : undefined}
          >
            <Link 
              to={item.url}
              className="group relative"
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge 
                  variant={item.badgeVariant || 'secondary'} 
                  className={`ml-auto text-xs px-1.5 py-0 ${
                    item.badgeVariant === 'destructive' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''
                  }`}
                >
                  {item.badge}
                </Badge>
              )}
              {isActive(item.url) && !item.badge && (
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border hidden md:flex" data-tour="sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">RepostFlow</span>
              <span className="text-xs text-muted-foreground">Content Automation</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent data-tour="queue-link">
            {renderMenuItems(mainMenuItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Platforms
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformMenuItems.map((item) => (
                <SidebarMenuItem key={item.title} data-tour={item.url === '/dashboard/youtube' ? 'youtube-link' : item.url === '/dashboard/tiktok' ? 'tiktok-link' : undefined}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <Link 
                      to={item.url}
                      className="group relative"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                      {isActive(item.url) && (
                        <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(filterItems(adminMenuItems))}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Upgrade CTA */}
        {!isCollapsed && (
          <div className="mx-2 mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Go Pro</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Unlock unlimited uploads and advanced analytics
            </p>
            <Button size="sm" className="w-full gradient-primary text-white border-0">
              Upgrade Now
            </Button>
          </div>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src="" alt={user?.email || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={signOut}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>v1.0.0</span>
            <Badge variant="outline" className="text-[10px] px-1.5">Beta</Badge>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
