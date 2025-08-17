import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

// EMERGENCY FUNCTION: Reset admin password to plain text
export const emergencyResetAdminPassword = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
    confirmReset: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmReset) {
      throw new ConvexError("Must confirm reset by setting confirmReset to true");
    }

    const emailLower = args.email.toLowerCase().trim();
    
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Validate new password
    if (!args.newPassword || args.newPassword.trim().length < 6) {
      throw new ConvexError("New password must be at least 6 characters long");
    }

    // Find password account
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id), 
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();

    if (!account) {
      // Create new password account if it doesn't exist
      await ctx.db.insert("authAccounts", {
        userId: user._id,
        provider: "password",
        providerAccountId: emailLower,
        secret: args.newPassword.trim(),
      });
    } else {
      // Update existing account with new plain text password
      await ctx.db.patch(account._id, {
        secret: args.newPassword.trim(),
      });
    }

    return { 
      success: true, 
      message: `Password reset successfully for ${emailLower}. You can now sign in with the new password.` 
    };
  },
});
