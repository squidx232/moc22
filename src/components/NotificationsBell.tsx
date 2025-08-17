import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { formatTimestampToDateTime, playNotificationSound, enableNotificationSound, isSoundEnabled, setSoundEnabled } from '../lib/utils';
import { Bell, BellRing, Eye, History, ExternalLink, Loader2, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
// Page type import removed

interface NotificationsBellProps {
  currentUser?: any;
  onNavigate?: (page: any) => void;
}

export default function NotificationsBell({ currentUser, onNavigate }: NotificationsBellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [processingNotification, setProcessingNotification] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const previousUnreadCount = useRef<number>(0);
  const isInitialized = useRef<boolean>(false);
  
  // Get limited notifications (last 10 + all unread)
  const notifications = useQuery(
    api.notifications.getRecentNotifications,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  ) || [];
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  ) || 0;
  
  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);

  // Effect to play notification sound when unread count increases
  useEffect(() => {
    if (!isInitialized.current) {
      previousUnreadCount.current = unreadCount;
      isInitialized.current = true;
      return;
    }

    if (unreadCount > previousUnreadCount.current && unreadCount > 0) {
      playNotificationSound();
    }

    previousUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Initialize sound preference and enable audio on first interaction
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
    
    const handleFirstInteraction = () => {
      enableNotificationSound();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const toggleSound = () => {
    const newSoundEnabled = !soundEnabled;
    setSoundEnabledState(newSoundEnabled);
    setSoundEnabled(newSoundEnabled);
    
    if (newSoundEnabled) {
      playNotificationSound();
      toast.success('Notification sounds enabled');
    } else {
      toast.success('Notification sounds disabled');
    }
  };

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    if (!currentUser) return;
    try {
      await markAsReadMutation({ 
        notificationId, 
        userId: currentUser._id 
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await markAllAsReadMutation({ 
        userId: currentUser._id 
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      setProcessingNotification(notification._id);
      
      if (!notification.isRead) {
        await handleMarkAsRead(notification._id);
      }
      
      // Navigate to the RFC details page
      if (notification.mocRequestId && onNavigate) {
        console.log('Navigating to RFC from notification:', notification.mocRequestId);
        toast.success(`Opening RFC: ${notification.relatedMocTitle}`);
        onNavigate({ type: "details", mocId: notification.mocRequestId });
      }
      
      setShowDropdown(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
      toast.error('Failed to open RFC');
    } finally {
      setProcessingNotification(null);
    }
  };

  const handleViewAllNotifications = () => {
    if (onNavigate) {
      onNavigate({ type: "notifications" });
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-6 w-6" />
        ) : (
          <Bell className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    <Eye size={14} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={toggleSound}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  title={soundEnabled ? "Disable notification sounds" : "Enable notification sounds"}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                <button
                  onClick={handleViewAllNotifications}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <History size={14} />
                  View all
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${processingNotification === notification._id ? 'opacity-50 pointer-events-none' : ''}`}
                    title="Click to view RFC details"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          {processingNotification === notification._id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ExternalLink size={12} />
                          )}
                          RFC: {notification.relatedMocTitle}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimestampToDateTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && processingNotification !== notification._id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleViewAllNotifications}
                className="w-full text-center text-sm text-primary hover:text-primary-dark font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
