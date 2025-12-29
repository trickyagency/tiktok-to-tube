import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import DashboardSidebar from './DashboardSidebar';
import ThemeToggle from './ThemeToggle';
import NotificationsDropdown from './NotificationsDropdown';
import MobileBottomNav from './MobileBottomNav';
import OnboardingTour from './OnboardingTour';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, LogOut, Settings, User, ChevronDown, Home, Search } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/youtube': 'YouTube Channels',
  '/dashboard/tiktok': 'TikTok Accounts',
  '/dashboard/queue': 'Video Queue',
  '/dashboard/history': 'Upload History',
  '/dashboard/cron': 'Cron Monitor',
  '/dashboard/users': 'Users',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
};

const DashboardLayout = ({ children, title, description }: DashboardLayoutProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const {
    isActive: tourActive,
    currentTourStep,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboardingTour();

  // Fetch user avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [user?.id]);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') {
      return null;
    }
    return routeLabels[path] || title;
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const currentBreadcrumb = getBreadcrumbs();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 glass border-b border-border">
            <div className="flex items-center justify-between h-16 px-6">
              {/* Left: Trigger + Breadcrumbs */}
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-1 h-9 w-9 hidden md:flex" />
                
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      {location.pathname === '/dashboard' ? (
                        <BreadcrumbPage className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          <span className="hidden sm:inline">Dashboard</span>
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Home className="h-4 w-4" />
                            <span className="hidden sm:inline">Dashboard</span>
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {currentBreadcrumb && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>{currentBreadcrumb}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Right: Search + Quick Actions + Notifications + User Menu */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  data-tour="search-button"
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', {
                      key: 'k',
                      metaKey: true,
                      bubbles: true,
                    });
                    document.dispatchEvent(event);
                  }}
                >
                  <Search className="h-4 w-4" />
                  <span className="text-sm">Search...</span>
                  <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>

                {/* Quick Add Button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gradient-primary text-white border-0 shadow-glow gap-1 sm:gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add New</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/youtube">Add YouTube Channel</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/tiktok">Add TikTok Account</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications */}
                <NotificationsDropdown />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 gap-2 px-2">
                      <Avatar className="h-7 w-7 border border-border">
                        <AvatarImage src={avatarUrl || ''} alt={user?.email || 'User'} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Page Title */}
            <div className="px-6 pb-4">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </header>

          <div className={`flex-1 p-6 ${isMobile ? 'pb-24' : ''}`}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav />}
      </div>

      {/* Onboarding Tour */}
      {tourActive && currentTourStep && (
        <OnboardingTour
          isActive={tourActive}
          currentStep={currentTourStep}
          stepNumber={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
        />
      )}
    </SidebarProvider>
  );
};

export default DashboardLayout;
