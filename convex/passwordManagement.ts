import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPassword, verifyPassword } from "./passwordUtils";
import { getAuthUserId } from "@convex-dev/auth/server";

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.passwordHash) {
      throw new Error("Account not properly configured. Please contact an administrator.");
    }

    // Verify current password
    const isValidCurrentPassword = await verifyPassword(args.currentPassword, user.passwordHash);
    if (!isValidCurrentPassword) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (args.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    // Hash new password
    const newPasswordHash = await hashPassword(args.newPassword);

    // Update password
    await ctx.db.patch(userId, {
      passwordHash: newPasswordHash,
    });

    return { success: true, message: "Password changed successfully" };
  },
});

export const adminChangePassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) {
      throw new Error("User not authenticated");
    }

    const adminUser = await ctx.db.get(adminUserId);
    if (!adminUser || !adminUser.isAdmin) {
      throw new Error("Access denied. Admin privileges required.");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Validate new password
    if (args.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    // Hash new password
    const newPasswordHash = await hashPassword(args.newPassword);

    // Update password
    await ctx.db.patch(args.userId, {
      passwordHash: newPasswordHash,
    });

    return { success: true, message: "Password changed successfully" };
  },
});
