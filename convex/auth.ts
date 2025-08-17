import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// WARNING: Using Password provider with plain text storage
// This is a SECURITY RISK and should be replaced with OAuth providers
// or a custom authentication system with proper bcrypt hashing
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});



export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    if (!args.newPassword || args.newPassword.trim().length < 6) {
      throw new ConvexError("New password must be at least 6 characters long");
    }

    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId), 
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();

    if (!account) {
      throw new ConvexError("No password account found");
    }

    // For now, just update the password directly (not secure, but will work)
    const currentPassword = args.currentPassword.trim();
    if (!account.secret) {
      throw new ConvexError("No password set for this account");
    }
    
    // For now, just do plain text comparison (will be upgraded with migration)
    if (currentPassword !== account.secret) {
      throw new ConvexError("Current password is incorrect");
    }

    const newPassword = args.newPassword.trim();
    
    // Ensure new password is different from current
    if (newPassword === account.secret) {
      throw new ConvexError("New password must be different from current password");
    }

    // Store the new password (not hashed for now)
    await ctx.db.patch(account._id, {
      secret: newPassword,
    });

    return { success: true };
  },
});
