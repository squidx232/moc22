import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const requestSignup = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    requestedDepartment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase().trim();
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();

    if (existingUser) {
      throw new ConvexError("A user with this email already exists");
    }

    // Check if there's already a pending signup
    const existingSignup = await ctx.db
      .query("pendingSignups")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .unique();

    if (existingSignup) {
      throw new ConvexError("A signup request with this email is already pending");
    }

    // Validate password
    if (!args.password || args.password.trim().length < 6) {
      throw new ConvexError("Password must be at least 6 characters long");
    }

    // Create a temporary user record
    const tempUserId = await ctx.db.insert("users", {
      email: emailLower,
      name: args.name.trim(),
      isAnonymous: false,
    });

    // Store the signup request with plain text password
    await ctx.db.insert("pendingSignups", {
      userId: tempUserId,
      email: emailLower,
      name: args.name.trim(),
      password: args.password.trim(), // Store as plain text
      requestedDepartment: args.requestedDepartment,
      status: "pending",
    });

    return { 
      success: true, 
      message: "Signup request submitted successfully. Please wait for admin approval." 
    };
  },
});

export const processSignupRequest = mutation({
  args: {
    signupId: v.id("pendingSignups"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    permissions: v.optional(v.object({
      canCreateMocs: v.optional(v.boolean()),
      canEditAnyMoc: v.optional(v.boolean()),
      canDeleteAnyMoc: v.optional(v.boolean()),
      canManageMocRolesGlobally: v.optional(v.boolean()),
    })),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can process signup requests");
    }

    const signup = await ctx.db.get(args.signupId);
    if (!signup) {
      throw new ConvexError("Signup request not found");
    }

    if (signup.status !== "pending") {
      throw new ConvexError("Signup request has already been processed");
    }

    if (args.action === "approve") {
      if (!signup.userId) {
        throw new ConvexError("Signup does not have a user ID");
      }
      
      // Create password account with plain text password
      await ctx.db.insert("authAccounts", {
        userId: signup.userId,
        provider: "password",
        providerAccountId: signup.email,
        secret: signup.password, // Store as plain text
      });

      // Update user with permissions
      await ctx.db.patch(signup.userId, {
        isAdmin: false,
        canCreateMocs: args.permissions?.canCreateMocs ?? true,
        canEditAnyMoc: args.permissions?.canEditAnyMoc ?? false,
        canDeleteAnyMoc: args.permissions?.canDeleteAnyMoc ?? false,
        canManageMocRolesGlobally: args.permissions?.canManageMocRolesGlobally ?? false,
        isApproved: true,
      });

      // Update signup status
      await ctx.db.patch(args.signupId, {
        status: "approved",
        processedAt: Date.now(),
      });

      return { 
        success: true, 
        message: `User ${signup.name} has been approved and can now sign in.` 
      };
    } else {
      // Reject - delete the temporary user and update signup status
      if (signup.userId) {
        await ctx.db.delete(signup.userId);
      }
      await ctx.db.patch(args.signupId, {
        status: "rejected",
        processedAt: Date.now(),
      });

      return { 
        success: true, 
        message: `Signup request for ${signup.name} has been rejected.` 
      };
    }
  },
});

export const listPendingSignups = query({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can view pending signups");
    }

    return await ctx.db
      .query("pendingSignups")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

export const checkUserApprovalStatus = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase().trim();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();
    if (!user) return { status: "not_found" };
    // Check if user is approved
    if (user.isApproved) return { status: "approved" };
    const pendingSignup = await ctx.db
      .query("pendingSignups")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .unique();
    if (pendingSignup) return { status: "pending" };
    return { status: "rejected" };
  },
});
