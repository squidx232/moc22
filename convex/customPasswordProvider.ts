import { ConvexError } from "convex/values";
import { DataModel } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function verifyPasswordCredentials(
  ctx: QueryCtx | MutationCtx,
  email: string,
  password: string
): Promise<{ userId: string } | null> {
  try {
    const emailLower = email.toLowerCase().trim();
    
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();

    if (!user) {
      console.log("User not found for email:", emailLower);
      return null;
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

    if (!account || !account.secret) {
      console.log("No password account found for user:", user._id);
      return null;
    }

    // Simple plain text password comparison
    if (password.trim() === account.secret) {
      console.log("Password verified for user:", user._id);
      return { userId: user._id };
    } else {
      console.log("Password mismatch for user:", user._id);
      return null;
    }
  } catch (error) {
    console.error("Password verification error:", error);
    return null;
  }
}

export async function createPasswordAccount(
  ctx: MutationCtx,
  userId: string,
  email: string,
  password: string
): Promise<void> {
  // Store password as plain text
  await ctx.db.insert("authAccounts", {
    userId: userId as any,
    provider: "password",
    providerAccountId: email.toLowerCase().trim(),
    secret: password.trim(),
  });
}
