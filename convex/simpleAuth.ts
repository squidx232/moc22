import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.trim().toLowerCase();
    
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();

    if (!user) {
      return { success: false, message: "Invalid email or password" };
    }

    if (!user.isApproved) {
      return { success: false, message: "Your account is pending approval. Please contact an administrator." };
    }

    // Check if user has a password account in authAccounts
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id), 
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();

    if (!authAccount) {
      return { success: false, message: "Account not properly configured. Please contact an administrator." };
    }

    // Check if user requires password setup (new user with temporary password)
    if (user.requiresPasswordSetup) {
      // For users requiring password setup, check against the authAccount secret (temporary password)
      if (args.password !== authAccount.secret) {
        return { success: false, message: "Invalid email or password" };
      }
      
      // Return user with requiresPasswordSetup flag
      const cleanUser = {
        _id: user._id,
        _creationTime: user._creationTime,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isApproved: user.isApproved,
        canCreateMocs: user.canCreateMocs,
        canEditAnyMoc: user.canEditAnyMoc,
        canDeleteAnyMoc: user.canDeleteAnyMoc,
        canManageUsers: user.canManageUsers,
        canManageDepartments: user.canManageDepartments,
        canViewAllMocs: user.canViewAllMocs,
        canManageMocRolesGlobally: user.canManageMocRolesGlobally,
        departmentId: user.departmentId,
        requiresPasswordSetup: true,
      };

      return { success: true, user: cleanUser };
    }

    // Password verification logic
    if (user.passwordHash && user.requiresPasswordSetup === false) {
      // User has completed password setup - use bcrypt
      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(args.password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, message: "Invalid email or password" };
      }
    } else {
      // User hasn't completed password setup - use plain text comparison
      if (args.password !== authAccount.secret) {
        return { success: false, message: "Invalid email or password" };
      }
    }

    // Return a clean user object with only necessary fields
    const cleanUser = {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
      canCreateMocs: user.canCreateMocs,
      canEditAnyMoc: user.canEditAnyMoc,
      canDeleteAnyMoc: user.canDeleteAnyMoc,
      canManageUsers: user.canManageUsers,
      canManageDepartments: user.canManageDepartments,
      canViewAllMocs: user.canViewAllMocs,
      canManageMocRolesGlobally: user.canManageMocRolesGlobally,
      departmentId: user.departmentId,
    };

    return { success: true, user: cleanUser };
  },
});

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.trim().toLowerCase();
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();

    if (existingUser) {
      return { success: false, message: "An account with this email already exists" };
    }

    // Create user with approval pending
    const userId = await ctx.db.insert("users", {
      email: emailLower,
      name: args.name,
      isApproved: false,
      isAdmin: false,
      canCreateMocs: false,
      canEditAnyMoc: false,
      canDeleteAnyMoc: false,
      canManageUsers: false,
      canManageDepartments: false,
      canViewAllMocs: false,
      emailVerificationTime: Date.now(),
      isAnonymous: false,
    });

    // Create auth account for login
    await ctx.db.insert("authAccounts", {
      userId: userId,
      provider: "password",
      providerAccountId: emailLower,
      secret: args.password,
    });

    return { success: true, message: "Sign-up request submitted successfully" };
  },
});

export const getCurrentUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    // Return null if user doesn't exist or is not approved
    if (!user || !user.isApproved) {
      return null;
    }
    
    // Return a clean user object with only necessary fields
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
      canCreateMocs: user.canCreateMocs,
      canEditAnyMoc: user.canEditAnyMoc,
      canDeleteAnyMoc: user.canDeleteAnyMoc,
      canManageUsers: user.canManageUsers,
      canManageDepartments: user.canManageDepartments,
      canViewAllMocs: user.canViewAllMocs,
      canManageMocRolesGlobally: user.canManageMocRolesGlobally,
      departmentId: user.departmentId,
    };
  },
});

export const signOut = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // For now, just return success as we don't maintain server-side sessions
    // This can be extended later if we need to track active sessions
    return { success: true };
  },
});
