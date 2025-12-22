import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  ListVideo,
  History,
  Youtube,
  Music2,
  Settings,
  UserPlus,
  PlusCircle,
  Moon,
  Sun,
  LogOut,
  BarChart3,
  Clock,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { signOut, isOwner } = useAuth();

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', shortcut: '⌘D' },
    { icon: ListVideo, label: 'Video Queue', path: '/dashboard/queue', shortcut: '⌘Q' },
    { icon: History, label: 'Upload History', path: '/dashboard/history' },
    { icon: Youtube, label: 'YouTube Channels', path: '/dashboard/youtube' },
    { icon: Music2, label: 'TikTok Accounts', path: '/dashboard/tiktok' },
    { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: Clock, label: 'Cron Monitor', path: '/dashboard/cron' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings', shortcut: '⌘,' },
  ];

  const ownerOnlyItems = [
    { icon: Users, label: 'User Management', path: '/dashboard/users' },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
          {isOwner && ownerOnlyItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/youtube'))}>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Add YouTube Channel</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/tiktok'))}>
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Add TikTok Account</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>View Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => signOut())}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
