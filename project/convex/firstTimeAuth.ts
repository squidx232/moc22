import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const setFirstTimePassword = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"users"> }> => {
    const passwordTrimmed = args.password.trim();
    const emailLower = args.email.trim().toLowerCase();
    
    if (!passwordTrimmed || passwordTrimmed.length < 6) {
      throw new ConvexError("Password must be at least 6 characters long.");
    }

    // Find user by email (case-insensitive)
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();
    
    if (!user) {
      throw new ConvexError("User not found. Please contact your administrator.");
    }

    // Check if password account already exists
    const existingAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id), 
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();

    if (existingAccount) {
      throw new ConvexError("Password already set. Please use regular login.");
    }

    // Store the password as plain text (Convex Auth requirement)
    await ctx.db.insert("authAccounts", {
      userId: user._id,
      provider: "password", 
      providerAccountId: emailLower,
      secret: passwordTrimmed,
    });
    
    return { success: true, userId: user._id };
  },
});

export const checkUserHasPassword = mutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ hasPassword: boolean; userExists: boolean }> => {
    const emailLower = args.email.trim().toLowerCase();
    
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();
    
    if (!user) {
      return { hasPassword: false, userExists: false };
    }

    const existingAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id), 
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();

    return { hasPassword: !!existingAccount, userExists: true };
  },
});
