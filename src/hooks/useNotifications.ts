import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'upload_completed' | 'upload_failed' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  videoThumbnail?: string;
}

const STORAGE_KEY = 'notifications_read_state';
const MAX_NOTIFICATIONS = 20;

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load read state from localStorage
  const getReadState = useCallback((): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }, []);

  // Save read state to localStorage
  const saveReadState = useCallback((readIds: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds]));
    } catch (error) {
      console.error('Failed to save read state:', error);
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    const readState = getReadState();
    readState.add(id);
    saveReadState(readState);
    
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, [getReadState, saveReadState]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const readState = getReadState();
    notifications.forEach(n => readState.add(n.id));
    saveReadState(readState);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications, getReadState, saveReadState]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'publish_queue',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const record = payload.new as {
            id: string;
            status: string;
            scraped_video_id: string;
            error_message?: string;
          };

          // Only create notification for status changes to completed or failed
          if (record.status === 'completed' || record.status === 'failed') {
            // Fetch video details
            const { data: video } = await supabase
              .from('scraped_videos')
              .select('title, thumbnail_url')
              .eq('id', record.scraped_video_id)
              .single();

            const isCompleted = record.status === 'completed';
            
            addNotification({
              type: isCompleted ? 'upload_completed' : 'upload_failed',
              title: isCompleted ? 'Upload Completed' : 'Upload Failed',
              message: video?.title || 'Video upload',
              link: isCompleted ? '/dashboard/history' : '/dashboard/queue',
              videoThumbnail: video?.thumbnail_url || undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, addNotification]);

  // Apply read state to notifications
  useEffect(() => {
    const readState = getReadState();
    if (readState.size > 0) {
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read: readState.has(n.id) ? true : n.read,
        }))
      );
    }
  }, [getReadState]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};
