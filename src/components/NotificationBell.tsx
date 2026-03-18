import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import socket from '../services/socket';

interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  userId: string;
  onOpen: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId, onOpen }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    userIdRef.current = userId;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };
    fetchNotifications();

    socket.emit('join_chat', userId);

    const handleNotification = (notification: Notification) => {
      if (notification.userId === userIdRef.current) {
        setNotifications(prev => [notification, ...prev]);
      }
    };
    socket.on('new_notification', handleNotification);

    const handleNotificationsRead = (event: Event) => {
      const detail = (event as CustomEvent<{ ids?: string[]; all?: boolean }>).detail;
      setNotifications((prev) => {
        if (detail?.all) {
          return prev.map((notification) => ({ ...notification, isRead: true }));
        }
        const ids = new Set(detail?.ids || []);
        return prev.map((notification) => (
          ids.has(notification.id) ? { ...notification, isRead: true } : notification
        ));
      });
    };

    window.addEventListener('social:notifications-read', handleNotificationsRead as EventListener);

    return () => {
      socket.off('new_notification', handleNotification);
      window.removeEventListener('social:notifications-read', handleNotificationsRead as EventListener);
    };
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <button onClick={onOpen} className="relative p-2 rounded-full bg-muted text-muted-foreground hover:text-primary transition-all">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};
