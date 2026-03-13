import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const response = await fetch(`/api/notifications/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <button onClick={onOpen} className="relative p-2 rounded-full bg-muted text-muted-foreground hover:text-primary transition-all">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full" />
      )}
    </button>
  );
};
