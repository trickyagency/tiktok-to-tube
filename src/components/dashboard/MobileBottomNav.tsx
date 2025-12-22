import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Youtube, Video, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Calendar, label: 'Queue', path: '/dashboard/queue' },
  { icon: Youtube, label: 'YouTube', path: '/dashboard/youtube' },
  { icon: Video, label: 'TikTok', path: '/dashboard/tiktok' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

const MobileBottomNav = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass effect background */}
      <div className="glass border-t border-border/50 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
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
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
