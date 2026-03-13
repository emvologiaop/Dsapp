import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

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

    if (!socketRef.current) {
      socketRef.current = io({ transports: ['websocket', 'polling'] });
    }

    const socket = socketRef.current;
    socket.emit('join', `user_${userId}`);

    const handleNotification = (notification: Notification) => {
      if (notification.userId === userId) {
        setNotifications(prev => [notification, ...prev]);
      }
    };
    socket.on('new_notification', handleNotification);

    return () => {
      socket.off('new_notification', handleNotification);
      socket.disconnect();
      socketRef.current = null;
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
