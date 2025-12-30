import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Youtube, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Calendar, label: 'Queue', path: '/dashboard/queue' },
  { icon: Youtube, label: 'YouTube', path: '/dashboard/youtube' },
  { icon: Video, label: 'TikTok', path: '/dashboard/tiktok' },
];

const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch user profile (avatar and name)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('user_id', user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      if (data?.full_name) setProfileName(data.full_name);
    };
    fetchProfile();
  }, [user?.id]);

  const getUserInitials = () => {
    if (profileName) {
      return profileName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    triggerHaptic();
    navigate(path);
  };

  const getCurrentIndex = () => {
    const exactMatch = navItems.findIndex(item => item.path === location.pathname);
    if (exactMatch !== -1) return exactMatch;
    
    // Find by prefix match
    return navItems.findIndex(item => 
      item.path !== '/dashboard' && location.pathname.startsWith(item.path)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) >= minSwipeDistance) {
      const currentIndex = getCurrentIndex();
      
      if (deltaX < 0 && currentIndex < navItems.length - 1) {
        // Swipe left - go to next
        triggerHaptic();
        navigate(navItems[currentIndex + 1].path);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        triggerHaptic();
        navigate(navItems[currentIndex - 1].path);
      }
    }

    setTouchStartX(null);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Glass effect background */}
      <div className="glass border-t border-border/50 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[4rem]',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', active && 'text-primary')} />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {/* Profile button */}
          <button
            onClick={() => handleNavClick('/dashboard/settings')}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[4rem]',
              isActive('/dashboard/settings')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <Avatar className="h-5 w-5">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                <AvatarFallback className="text-[8px] bg-primary/10">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {isActive('/dashboard/settings') && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
            <span className={cn(
              'text-[10px] font-medium truncate max-w-[4rem]',
              isActive('/dashboard/settings') ? 'text-primary' : 'text-muted-foreground'
            )}>
              {profileName?.split(' ')[0] || 'Profile'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
