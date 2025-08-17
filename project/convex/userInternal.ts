import { ConvexError, v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Internal query to get user by email
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
  },
});

// Internal query to get user profile by userId
export const getUserProfileByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Add internal query to get authAccount by userId
export const getAuthAccountByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();
  },
});

// Internal mutation to create user account
export const createUserAccount = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    isAdmin: v.optional(v.boolean()),
    canCreateMocs: v.optional(v.boolean()),
    canEditAnyMoc: v.optional(v.boolean()),
    canDeleteAnyMoc: v.optional(v.boolean()),
    canManageUsers: v.optional(v.boolean()),
    canManageDepartments: v.optional(v.boolean()),
    canViewAllMocs: v.optional(v.boolean()),
    canManageMocRolesGlobally: v.optional(v.boolean()),
    temporaryPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // Create the user account
    const userId = await ctx.db.insert("users", {
      email: emailLower,
      name: args.name,
      emailVerificationTime: Date.now(),
      isAnonymous: false,
      isAdmin: args.isAdmin || false,
      canCreateMocs: args.canCreateMocs ?? true,
      canEditAnyMoc: args.canEditAnyMoc ?? (args.isAdmin || false),
      canDeleteAnyMoc: args.canDeleteAnyMoc ?? (args.isAdmin || false),
      canManageUsers: args.canManageUsers ?? (args.isAdmin || false),
      canManageDepartments: args.canManageDepartments ?? (args.isAdmin || false),
      canViewAllMocs: args.canViewAllMocs ?? (args.isAdmin || false),
      canManageMocRolesGlobally: args.canManageMocRolesGlobally ?? (args.isAdmin || false),
      isApproved: true,
      requiresPasswordSetup: true,
    });

    // Create auth account with temporary password
    await ctx.db.insert("authAccounts", {
      userId: userId,
      provider: "password",
      providerAccountId: emailLower,
      secret: args.temporaryPassword,
    });

    return userId;
  },
});

// Internal mutation to complete password setup
export const completePasswordSetup = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Update user to mark password setup as complete and store password hash
    await ctx.db.patch(args.userId, {
      requiresPasswordSetup: false,
      passwordHash: args.passwordHash,
    });

    // Note: We don't update the authAccount.secret because we're using user.passwordHash for authentication
    // The authAccount.secret will remain as the original temporary password for reference

    return { success: true };
  },
});
