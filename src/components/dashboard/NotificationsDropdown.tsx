import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Video, AlertCircle, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  switch (type) {
    case 'upload_completed':
      return <Check className="h-4 w-4 text-success" />;
    case 'upload_failed':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'system':
      return <Info className="h-4 w-4 text-info" />;
    default:
      return <Video className="h-4 w-4" />;
  }
};

const NotificationItem = ({ 
  notification, 
  onRead 
}: { 
  notification: Notification; 
  onRead: (id: string) => void;
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  return (
    <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
      <Link
        to={notification.link || '#'}
        onClick={() => onRead(notification.id)}
        className={`flex items-start gap-3 p-3 w-full hover:bg-muted/50 transition-colors ${
          !notification.read ? 'bg-primary/5' : ''
        }`}
      >
        {/* Thumbnail or Icon */}
        {notification.videoThumbnail ? (
          <img
            src={notification.videoThumbnail}
            alt=""
            className="w-10 h-6 rounded object-cover bg-muted flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <NotificationIcon type={notification.type} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium truncate">{notification.title}</p>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
      </Link>
    </DropdownMenuItem>
  );
};

const NotificationsDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  clearAll();
                }}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length > 0 ? (
          <>
            <ScrollArea className="h-[300px]">
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                  />
                ))}
              </div>
            </ScrollArea>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                <Link to="/dashboard/history">View All Activity</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll see upload updates here
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
