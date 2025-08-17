import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { formatTimestampToDateTime } from '../lib/utils';
import { Bell, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
// Page type import removed
import { toast } from 'sonner';

interface NotificationsPageProps {
  currentUser?: any;
}

export default function NotificationsPage({ currentUser }: NotificationsPageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  const allNotifications = useQuery(
    api.notifications.getAllNotifications,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  ) || [];
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  ) || 0;
  
  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAsUnreadMutation = useMutation(api.notifications.markAsUnread);
  const deleteNotificationMutation = useMutation(api.notifications.deleteNotification);
  const clearAllNotificationsMutation = useMutation(api.notifications.clearAllNotifications);

  const filteredNotifications = filter === 'unread' 
    ? allNotifications.filter(n => !n.isRead)
    : allNotifications;

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    if (!currentUser) return;
    try {
      await markAsReadMutation({ 
        notificationId, 
        userId: currentUser._id 
      });
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAsUnread = async (notificationId: Id<"notifications">) => {
    if (!currentUser) return;
    try {
      await markAsUnreadMutation({ 
        notificationId, 
        userId: currentUser._id 
      });
      toast.success('Notification marked as unread');
    } catch (error) {
      toast.error('Failed to mark notification as unread');
    }
  };

  const handleDeleteNotification = async (notificationId: Id<"notifications">) => {
    if (!currentUser) return;
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteNotificationMutation({ 
          notificationId, 
          userId: currentUser._id 
        });
        toast.success('Notification deleted');
      } catch (error) {
        toast.error('Failed to delete notification');
      }
    }
  };

  const handleClearAll = async () => {
    if (!currentUser) return;
    if (window.confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      try {
        await clearAllNotificationsMutation({ 
          userId: currentUser._id 
        });
        toast.success('All notifications cleared');
      } catch (error) {
        toast.error('Failed to clear notifications');
      }
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    // Navigate to details - functionality to be implemented
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Bell className="text-primary" size={28} />
          <div>
            <h1 className="text-3xl font-bold text-primary">Notifications</h1>
            <p className="text-sm text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {/* Navigate to list - functionality to be implemented */}}
            className="btn btn-outline-secondary"
          >
            Back to RFCs
          </button>
          {allNotifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="btn btn-danger flex items-center gap-2"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setFilter('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All ({allNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'unread'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </nav>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {filter === 'unread' ? 'All caught up!' : 'Notifications will appear here when there are updates to your RFCs.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                !notification.isRead 
                  ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        RFC: <span className="font-medium">{notification.relatedMocTitle}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimestampToDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => notification.isRead ? handleMarkAsUnread(notification._id) : handleMarkAsRead(notification._id)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
                  >
                    {notification.isRead ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleDeleteNotification(notification._id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
