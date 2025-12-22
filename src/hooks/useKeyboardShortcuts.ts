import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcutsOptions {
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  enabled?: boolean;
}

const NAVIGATION_SHORTCUTS: Record<string, string> = {
  d: '/dashboard',
  q: '/dashboard/queue',
  h: '/dashboard/history',
  y: '/dashboard/youtube',
  t: '/dashboard/tiktok',
  s: '/dashboard/settings',
  a: '/dashboard/analytics',
};

export const useKeyboardShortcuts = ({
  onOpenCommandPalette,
  onOpenShortcutsHelp,
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
        const route = NAVIGATION_SHORTCUTS[lowerKey];
        
        if (route) {
          e.preventDefault();
          navigate(route);
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
    [enabled, navigate, onOpenShortcutsHelp, waitingForSecondKey]
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
