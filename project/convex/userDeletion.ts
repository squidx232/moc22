import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const deleteUserData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Delete auth accounts
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // Delete user sessions
    const sessions = await ctx.db
      .query("userSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete edit history
    const editHistory = await ctx.db
      .query("editHistory")
      .filter((q) => q.eq(q.field("editedById"), args.userId))
      .collect();
    
    for (const edit of editHistory) {
      await ctx.db.delete(edit._id);
    }

    // Finally delete the user
    await ctx.db.delete(args.userId);
    
    return { success: true };
  },
});
