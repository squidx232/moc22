import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Admin function to manually create a user account
export const createUserAccount = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    canCreateMocs: v.optional(v.boolean()),
    canEditAnyMoc: v.optional(v.boolean()),
    canDeleteAnyMoc: v.optional(v.boolean()),
    canManageMocRolesGlobally: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"users"> }> => {
    const callingUserId = await getAuthUserId(ctx);
    if (!callingUserId) throw new ConvexError("Not authenticated");
    
    const callingUserProfile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: callingUserId });
    if (!callingUserProfile?.isAdmin) throw new ConvexError("Only admins can create user accounts");

    const emailLower = args.email.toLowerCase();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();
    
    if (existingUser) {
      throw new ConvexError("User with this email already exists");
    }

    // Create the user account with lowercase email and permissions
    const userId = await ctx.db.insert("users", {
      email: emailLower,
      name: args.name || args.email.split("@")[0],
      emailVerificationTime: Date.now(), // Mark as verified
      isAnonymous: false,
      isAdmin: args.isAdmin || false,
      canCreateMocs: args.canCreateMocs ?? true, // Default to true for new users
      canEditAnyMoc: args.canEditAnyMoc ?? (args.isAdmin || false),
      canDeleteAnyMoc: args.canDeleteAnyMoc ?? (args.isAdmin || false),
      canManageMocRolesGlobally: args.canManageMocRolesGlobally ?? (args.isAdmin || false),
      isApproved: true, // Admin-created users are automatically approved
    });

    // Note: Password will be set when user first logs in
    
    return { success: true, userId };
  },
});

// Function to set or update a user's password
export const setUserPassword = mutation({
  args: {
    userId: v.id("users"),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const callingUserId = await getAuthUserId(ctx);
    if (!callingUserId) throw new ConvexError("Not authenticated");
    
    const callingUserProfile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: callingUserId });
    if (!callingUserProfile?.isAdmin) throw new ConvexError("Only admins can set passwords");

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("User not found");

    try {
      // Check if user already has a password account
      const existingAccount = await ctx.db
        .query("authAccounts")
        .filter((q) => q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("provider"), "password")
        ))
        .unique();

      if (existingAccount) {
        // Update existing password
        await ctx.db.patch(existingAccount._id, {
          secret: args.password,
        });
      } else {
        // Create new password account
        await ctx.db.insert("authAccounts", {
          userId: args.userId,
          provider: "password",
          providerAccountId: targetUser.email!.toLowerCase(),
          secret: args.password,
        });
      }
      
      return { success: true };
    } catch (error) {
      throw new ConvexError("Failed to set password");
    }
  },
});
