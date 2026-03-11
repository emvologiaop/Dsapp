import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import socket from '../services/socket';

interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPanelProps {
  userId: string;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ userId, onClose }) => {
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

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell size={20} className="text-primary" />
          Notifications
        </h2>
        <button onClick={onClose} className="p-2 rounded-full bg-muted text-muted-foreground">
          <X size={20} />
        </button>
      </div>
      <div className="space-y-4 overflow-y-auto">
        {notifications.map(n => (
          <FriendlyCard 
            key={n.id} 
            className={`p-4 flex items-center justify-between ${n.isRead ? 'opacity-60' : ''}`}
            onClick={() => !n.isRead && markAsRead(n.id)}
          >
            <p className="text-sm">{n.content}</p>
            {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full" />}
          </FriendlyCard>
        ))}
      </div>
    </div>
  );
};
