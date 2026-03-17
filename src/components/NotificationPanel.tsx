import React, { useState, useEffect } from 'react';
import { X, Bell, Heart, MessageCircle, UserPlus, CheckCheck } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import socket from '../services/socket';

interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  relatedUserId?: string;
  relatedPostId?: string;
  relatedStoryId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPanelProps {
  userId: string;
  onClose: () => void;
  onNavigate?: (notification: Notification) => void;
}

const getTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like': return <Heart size={16} className="text-red-400" />;
    case 'comment': return <MessageCircle size={16} className="text-blue-400" />;
    case 'follow': return <UserPlus size={16} className="text-green-400" />;
    default: return <Bell size={16} className="text-primary" />;
  }
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ userId, onClose, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/notifications/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-bold">Notifications</h2>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="p-2 rounded-full text-primary hover:bg-muted transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell size={40} className="mb-4 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-center gap-3 px-6 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${!n.isRead ? 'bg-primary/5' : ''}`}
              onClick={async () => {
                if (!n.isRead) await markAsRead(n.id);
                onNavigate?.(n);
              }}
            >
              <div className="shrink-0">
                {getNotificationIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? 'font-medium' : 'text-muted-foreground'}`}>{n.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
