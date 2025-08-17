import { ConvexError, v } from "convex/values";
import { mutation, query, internalQuery, internalMutation, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Get current user by ID
export const getCurrentUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.isApproved) {
      return null;
    }
    return user;
  },
});

// List all approved users
export const listApprovedUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isApproved"), true))
      .collect();
    return users;
  },
});

// List all users (admin only)
export const listAllUsers = query({
  args: { requestingUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser?.isAdmin) {
      throw new ConvexError("Only administrators can list all users");
    }
    
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

// Create user (admin only)
export const createUser = action({
  args: {
    email: v.string(),
    name: v.string(),
    temporaryPassword: v.string(),
    isAdmin: v.optional(v.boolean()),
    canCreateMocs: v.optional(v.boolean()),
    canEditAnyMoc: v.optional(v.boolean()),
    canDeleteAnyMoc: v.optional(v.boolean()),
    canManageUsers: v.optional(v.boolean()),
    canManageDepartments: v.optional(v.boolean()),
    canViewAllMocs: v.optional(v.boolean()),
    canManageMocRolesGlobally: v.optional(v.boolean()),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"users"> }> => {
    const currentUser = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: args.requestingUserId });
    if (!currentUser?.isAdmin) {
      throw new ConvexError("Only administrators can create users");
    }

    const emailLower = args.email.toLowerCase();

    // Check if user already exists
    const existingUser = await ctx.runQuery(internal.userInternal.getUserByEmail, { email: emailLower });
    if (existingUser) {
      throw new ConvexError("User with this email already exists");
    }

    // Create the user account
    const userId: Id<"users"> = await ctx.runMutation(internal.userInternal.createUserAccount, {
      email: emailLower,
      name: args.name,
      isAdmin: args.isAdmin || false,
      canCreateMocs: args.canCreateMocs ?? true,
      canEditAnyMoc: args.canEditAnyMoc ?? (args.isAdmin || false),
      canDeleteAnyMoc: args.canDeleteAnyMoc ?? (args.isAdmin || false),
      canManageUsers: args.canManageUsers ?? (args.isAdmin || false),
      canManageDepartments: args.canManageDepartments ?? (args.isAdmin || false),
      canViewAllMocs: args.canViewAllMocs ?? (args.isAdmin || false),
      canManageMocRolesGlobally: args.canManageMocRolesGlobally ?? (args.isAdmin || false),
      temporaryPassword: args.temporaryPassword,
    });

    return { success: true, userId };
  },
});

// Update user (admin only)
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    canCreateMocs: v.optional(v.boolean()),
    canEditAnyMoc: v.optional(v.boolean()),
    canDeleteAnyMoc: v.optional(v.boolean()),
    canManageUsers: v.optional(v.boolean()),
    canManageDepartments: v.optional(v.boolean()),
    canViewAllMocs: v.optional(v.boolean()),
    canManageMocRolesGlobally: v.optional(v.boolean()),
    departmentId: v.optional(v.id("departments")),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser?.isAdmin) {
      throw new ConvexError("Only administrators can update users");
    }

    const { userId, requestingUserId, email, ...updateData } = args;
    
    // If email is being updated, normalize it
    const finalUpdateData = {
      ...updateData,
      ...(email ? { email: email.toLowerCase() } : {}),
    };
    
    await ctx.db.patch(userId, finalUpdateData);

    return { success: true };
  },
});

// Approve user (admin only)
export const approveUser = mutation({
  args: {
    userId: v.id("users"),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser?.isAdmin) {
      throw new ConvexError("Only administrators can approve users");
    }

    await ctx.db.patch(args.userId, { isApproved: true });
    return { success: true };
  },
});

// Reject user (admin only)
export const rejectUser = mutation({
  args: {
    userId: v.id("users"),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser?.isAdmin) {
      throw new ConvexError("Only administrators can reject users");
    }

    // Delete the user and their auth account
    const user = await ctx.db.get(args.userId);
    if (user) {
      // Delete auth accounts
      const authAccounts = await ctx.db
        .query("authAccounts")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
      
      for (const account of authAccounts) {
        await ctx.db.delete(account._id);
      }

      // Delete user
      await ctx.db.delete(args.userId);
    }

    return { success: true };
  },
});

// Delete user (admin only)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser?.isAdmin) {
      throw new ConvexError("Only administrators can delete users");
    }

    // Don't allow deleting yourself
    if (args.userId === args.requestingUserId) {
      throw new ConvexError("You cannot delete your own account");
    }

    const user = await ctx.db.get(args.userId);
    if (user) {
      // Delete related data
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
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
      
      for (const notification of notifications) {
        await ctx.db.delete(notification._id);
      }

      // Delete edit history
      const editHistory = await ctx.db
        .query("editHistory")
        .filter((q) => q.eq(q.field("editedById"), args.userId))
        .collect();
      
      for (const edit of editHistory) {
        await ctx.db.delete(edit._id);
      }

      // Delete user
      await ctx.db.delete(args.userId);
    }

    return { success: true };
  },
});

// Change password
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: args.userId });
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get auth account
    const authAccount = await ctx.runQuery(internal.userInternal.getAuthAccountByUserId, { userId: args.userId });
    if (!authAccount) {
      throw new ConvexError("Auth account not found");
    }

    // Verify current password
    if (user.passwordHash) {
      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(args.currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new ConvexError("Current password is incorrect");
      }
    } else {
      // For users without hashed passwords, compare directly
      if (args.currentPassword !== authAccount.secret) {
        throw new ConvexError("Current password is incorrect");
      }
    }

    // Hash new password
    const bcrypt = await import('bcryptjs');
    const newPasswordHash = await bcrypt.hash(args.newPassword, 10);

    // Update password
    await ctx.runMutation(internal.userInternal.completePasswordSetup, {
      userId: args.userId,
      passwordHash: newPasswordHash,
    });

    return { success: true };
  },
});

// Fix setupFirstTimePassword to compare temporary password with authAccount.secret (plain text)
export const setupFirstTimePassword = action({
  args: {
    email: v.string(),
    temporaryPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user by email
    const user = await ctx.runQuery(internal.userInternal.getUserByEmail, { email: args.email });
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user requires password setup
    if (!user.requiresPasswordSetup) {
      throw new ConvexError("This user does not require password setup");
    }

    // Get authAccount for this user
    const authAccount = await ctx.runQuery(internal.userInternal.getAuthAccountByUserId, { userId: user._id });
    if (!authAccount) {
      throw new ConvexError("Auth account not found");
    }

    // Compare temporary password with authAccount.secret (plain text)
    if (args.temporaryPassword !== authAccount.secret) {
      throw new ConvexError("Invalid temporary password");
    }

    // Hash the new password
    const bcrypt = await import('bcryptjs');
    const newPasswordHash = await bcrypt.hash(args.newPassword, 10);

    // Update user with new password and mark setup as complete
    await ctx.runMutation(internal.userInternal.completePasswordSetup, {
      userId: user._id,
      passwordHash: newPasswordHash,
    });

    return { success: true };
  },
});
