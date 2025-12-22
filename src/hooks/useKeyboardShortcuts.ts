import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcutsOptions {
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  onNavigate?: (label: string) => void;
  enabled?: boolean;
}

interface NavigationShortcut {
  route: string;
  label: string;
}

const NAVIGATION_SHORTCUTS: Record<string, NavigationShortcut> = {
  d: { route: '/dashboard', label: 'Dashboard' },
  q: { route: '/dashboard/queue', label: 'Queue' },
  h: { route: '/dashboard/history', label: 'History' },
  y: { route: '/dashboard/youtube', label: 'YouTube' },
  t: { route: '/dashboard/tiktok', label: 'TikTok' },
  s: { route: '/dashboard/settings', label: 'Settings' },
  a: { route: '/dashboard/analytics', label: 'Analytics' },
};

export const useKeyboardShortcuts = ({
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onNavigate,
  enabled = true,
}: KeyboardShortcutsOptions = {}) => {
  const navigate = useNavigate();
  const [waitingForSecondKey, setWaitingForSecondKey] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Show shortcuts help with ?
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenShortcutsHelp?.();
        return;
      }

      // If waiting for second key after G
      if (waitingForSecondKey) {
        const lowerKey = e.key.toLowerCase();
        const shortcut = NAVIGATION_SHORTCUTS[lowerKey];
        
        if (shortcut) {
          e.preventDefault();
          navigate(shortcut.route);
          onNavigate?.(shortcut.label);
        }
        
        setWaitingForSecondKey(false);
        return;
      }

      // Start G sequence
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setWaitingForSecondKey(true);
        
        // Reset after 1.5 seconds if no second key pressed
        setTimeout(() => {
          setWaitingForSecondKey(false);
        }, 1500);
        return;
      }
    },
    [enabled, navigate, onOpenShortcutsHelp, onNavigate, waitingForSecondKey]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { waitingForSecondKey };
};

export const SHORTCUT_GROUPS = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'Q'], description: 'Go to Queue' },
      { keys: ['G', 'H'], description: 'Go to History' },
      { keys: ['G', 'Y'], description: 'Go to YouTube Channels' },
      { keys: ['G', 'T'], description: 'Go to TikTok Accounts' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
      { keys: ['G', 'A'], description: 'Go to Analytics' },
    ],
  },
  {
    name: 'Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open Command Palette' },
      { keys: ['?'], description: 'Show Keyboard Shortcuts' },
    ],
  },
];
