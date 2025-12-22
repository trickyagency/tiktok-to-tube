import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Youtube,
  Video,
  Calendar,
  History,
  Settings,
  LogOut,
  Sparkles,
  Clock,
  Users,
  BarChart3,
} from 'lucide-react';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'YouTube Channels', url: '/dashboard/youtube', icon: Youtube },
  { title: 'TikTok Accounts', url: '/dashboard/tiktok', icon: Video },
  { title: 'Video Queue', url: '/dashboard/queue', icon: Calendar },
  { title: 'Upload History', url: '/dashboard/history', icon: History },
  { title: 'Cron Monitor', url: '/dashboard/cron', icon: Clock },
  { title: 'Users', url: '/dashboard/users', icon: Users, ownerOnly: true },
  { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3, ownerOnly: true },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const { signOut, user, isOwner } = useAuth();

  // Filter menu items based on owner status
  const visibleMenuItems = menuItems.filter(item => !item.ownerOnly || isOwner);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sidebar-primary/10">
            <Sparkles className="h-5 w-5 text-sidebar-primary" />
          </div>
          <span className="font-semibold text-sidebar-foreground">TikTok → YouTube</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-3">
          <div className="text-sm text-sidebar-foreground/70 truncate">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
