import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    actorUserId: v.optional(v.id("users")),
    mocRequestId: v.id("mocRequests"),
    relatedMocTitle: v.string(),
    type: v.union(
      v.literal("assignment"),
      v.literal("status_change"),
      v.literal("new_comment"),
      v.literal("deadline_approaching"),
      v.literal("department_approval_pending"),
      v.literal("department_action"),
      v.literal("final_review_pending"),
      v.literal("technical_authority_assignment"),
      v.literal("general")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

// Get recent notifications (last 10 + all unread)
export const getRecentNotifications = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return [];
    }

    // Get all unread notifications
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", args.userId!).eq("isRead", false))
      .order("desc")
      .collect();

    // Get last 10 notifications (including read ones)
    const recentNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId!))
      .order("desc")
      .take(10);

    // Combine and deduplicate
    const allNotifications = [...unreadNotifications];
    for (const recent of recentNotifications) {
      if (!allNotifications.find(n => n._id === recent._id)) {
        allNotifications.push(recent);
      }
    }

    // Sort by creation time (newest first)
    allNotifications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return Promise.all(allNotifications.map(async (notification) => {
      const actor = notification.actorUserId ? await ctx.db.get(notification.actorUserId) : null;
      return {
        ...notification,
        actorName: actor?.name || actor?.email || "System",
      };
    }));
  },
});

// Get all notifications for a user
export const getAllNotifications = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId!))
      .order("desc")
      .collect();

    return Promise.all(notifications.map(async (notification) => {
      const actor = notification.actorUserId ? await ctx.db.get(notification.actorUserId) : null;
      return {
        ...notification,
        actorName: actor?.name || actor?.email || "System",
      };
    }));
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new ConvexError("Notification not found.");
    if (notification.userId !== args.userId) throw new ConvexError("Permission denied.");

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAsUnread = mutation({
  args: { notificationId: v.id("notifications"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new ConvexError("Notification not found.");
    if (notification.userId !== args.userId) throw new ConvexError("Permission denied.");

    await ctx.db.patch(args.notificationId, { isRead: false });
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", args.userId).eq("isRead", false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }
  },
});

export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new ConvexError("Notification not found.");
    if (notification.userId !== args.userId) throw new ConvexError("Permission denied.");

    await ctx.db.delete(args.notificationId);
  },
});

export const clearAllNotifications = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }
  },
});

export const getUnreadCount = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", args.userId!).eq("isRead", false))
      .collect();

    return unreadNotifications.length;
  },
});
