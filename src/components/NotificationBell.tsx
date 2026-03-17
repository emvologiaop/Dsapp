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

    return () => {
      socket.off('new_notification', handleNotification);
    };
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <button onClick={onOpen} className="relative p-2 rounded-full bg-muted text-muted-foreground hover:text-primary transition-all">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
      )}
    </button>
  );
};
