import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const SUPER_ADMIN_EMAIL = "hassanhany@scimitaregypt.com";

export const createAdminAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const email = "hassanhany@scimitaregypt.com";
    const password = "hassan123";
    
    // Store password as plain text for now (will be improved later)
    const hashedPassword = password;
    
    // Create user
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        name: "Hassan Hany",
        isAnonymous: false,
        passwordHash: hashedPassword,
      });
      user = await ctx.db.get(userId);
    } else {
      await ctx.db.patch(user._id, {
        passwordHash: hashedPassword,
      });
    }

    // Create auth account
    const existingAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user!._id), 
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();

    if (!existingAccount) {
      await ctx.db.insert("authAccounts", {
        userId: user!._id,
        provider: "password",
        providerAccountId: email,
        secret: hashedPassword,
      });
    } else {
      await ctx.db.patch(existingAccount._id, {
        secret: hashedPassword,
      });
    }

    // Update user with admin permissions
    await ctx.db.patch(user!._id, {
      isAdmin: true,
      canCreateMocs: true,
      canEditAnyMoc: true,
      canDeleteAnyMoc: true,
      canManageUsers: true,
      canManageDepartments: true,
      canViewAllMocs: true,
      canManageMocRolesGlobally: true,
      isApproved: true,
    });

    return { 
      success: true, 
      message: `Admin account ready! Email: ${email}, Password: ${password}` 
    };
  },
});
