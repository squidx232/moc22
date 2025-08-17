import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Comprehensive auth diagnostics
export const runFullAuthDiagnostics = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can run diagnostics");
    }

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    
    // Get all auth accounts
    const allAuthAccounts = await ctx.db.query("authAccounts").collect();
    
    const diagnostics = {
      totalUsers: allUsers.length,
      totalAuthAccounts: allAuthAccounts.length,
      usersWithoutAuthAccounts: [] as any[],
      authAccountsWithoutUsers: [] as any[],
      emailCasingIssues: [] as any[],
      duplicateAuthAccounts: [] as any[],
      workingAccounts: [] as any[],
      brokenAccounts: [] as any[],
    };

    // Check each user
    for (const user of allUsers) {
      if (!user.email) {
        diagnostics.brokenAccounts.push({
          type: "user_no_email",
          userId: user._id,
          name: user.name,
          issue: "User has no email address"
        });
        continue;
      }

      const userEmailLower = user.email.toLowerCase();
      
      // Find auth accounts for this user
      const userAuthAccounts = allAuthAccounts.filter(acc => acc.userId === user._id);
      const emailAuthAccounts = allAuthAccounts.filter(acc => 
        acc.providerAccountId === user.email || 
        acc.providerAccountId === userEmailLower
      );

      if (userAuthAccounts.length === 0) {
        diagnostics.usersWithoutAuthAccounts.push({
          userId: user._id,
          email: user.email,
          emailLower: userEmailLower,
          name: user.name,
        });
      } else {
        // Check for email casing issues
        const hasCorrectProviderAccountId = userAuthAccounts.some(acc => 
          acc.providerAccountId === userEmailLower
        );
        
        if (!hasCorrectProviderAccountId) {
          diagnostics.emailCasingIssues.push({
            userId: user._id,
            email: user.email,
            emailLower: userEmailLower,
            name: user.name,
            authAccounts: userAuthAccounts.map(acc => ({
              _id: acc._id,
              providerAccountId: acc.providerAccountId,
              provider: acc.provider,
            }))
          });
        }

        // Check for working accounts
        const workingAccount = userAuthAccounts.find(acc => 
          acc.provider === "password" && 
          acc.providerAccountId === userEmailLower &&
          acc.secret
        );

        if (workingAccount) {
          diagnostics.workingAccounts.push({
            userId: user._id,
            email: user.email,
            name: user.name,
            accountId: workingAccount._id,
          });
        } else {
          diagnostics.brokenAccounts.push({
            type: "broken_auth",
            userId: user._id,
            email: user.email,
            name: user.name,
            authAccounts: userAuthAccounts,
            issue: "No working password account found"
          });
        }
      }

      // Check for duplicate auth accounts
      if (userAuthAccounts.length > 1) {
        const passwordAccounts = userAuthAccounts.filter(acc => acc.provider === "password");
        if (passwordAccounts.length > 1) {
          diagnostics.duplicateAuthAccounts.push({
            userId: user._id,
            email: user.email,
            name: user.name,
            duplicateAccounts: passwordAccounts,
          });
        }
      }
    }

    // Check for orphaned auth accounts
    for (const authAccount of allAuthAccounts) {
      const userExists = allUsers.some(user => user._id === authAccount.userId);
      if (!userExists) {
        diagnostics.authAccountsWithoutUsers.push({
          accountId: authAccount._id,
          userId: authAccount.userId,
          providerAccountId: authAccount.providerAccountId,
          provider: authAccount.provider,
        });
      }
    }

    return diagnostics;
  },
});

// Fix all authentication issues
export const fixAllAuthIssues = mutation({
  args: {
    confirmFix: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmFix) {
      throw new ConvexError("Must confirm fix by setting confirmFix to true");
    }

    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can fix auth issues");
    }

    const fixResults = {
      usersFixed: 0,
      accountsDeleted: 0,
      accountsCreated: 0,
      emailsNormalized: 0,
      errors: [] as string[],
    };

    try {
      // Step 1: Get all users and normalize their emails
      const allUsers = await ctx.db.query("users").collect();
      
      for (const user of allUsers) {
        if (!user.email) {
          fixResults.errors.push(`User ${user._id} has no email - skipping`);
          continue;
        }

        const emailLower = user.email.toLowerCase();
        
        // Normalize email in users table
        if (user.email !== emailLower) {
          await ctx.db.patch(user._id, { email: emailLower });
          fixResults.emailsNormalized++;
        }

        // Step 2: Clean up all existing password accounts for this user
        const existingAccounts = await ctx.db
          .query("authAccounts")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), user._id),
              q.eq(q.field("provider"), "password")
            )
          )
          .collect();

        for (const account of existingAccounts) {
          await ctx.db.delete(account._id);
          fixResults.accountsDeleted++;
        }

        // Step 3: Clean up any orphaned accounts with this email
        const orphanedAccounts = await ctx.db
          .query("authAccounts")
          .filter((q) => 
            q.and(
              q.eq(q.field("providerAccountId"), emailLower),
              q.eq(q.field("provider"), "password")
            )
          )
          .collect();

        for (const account of orphanedAccounts) {
          await ctx.db.delete(account._id);
          fixResults.accountsDeleted++;
        }

        // Also clean up accounts with original email case
        if (user.email !== emailLower) {
          const originalCaseAccounts = await ctx.db
            .query("authAccounts")
            .filter((q) => 
              q.and(
                q.eq(q.field("providerAccountId"), user.email),
                q.eq(q.field("provider"), "password")
              )
            )
            .collect();

          for (const account of originalCaseAccounts) {
            await ctx.db.delete(account._id);
            fixResults.accountsDeleted++;
          }
        }

        // Step 4: Create a fresh password account with temporary password
        await ctx.db.insert("authAccounts", {
          userId: user._id,
          provider: "password",
          providerAccountId: emailLower,
          secret: "temppass123", // Temporary password
        });
        
        fixResults.accountsCreated++;
        fixResults.usersFixed++;
      }

      // Step 5: Clean up any remaining orphaned auth accounts
      const allAuthAccounts = await ctx.db.query("authAccounts").collect();
      for (const authAccount of allAuthAccounts) {
        const userExists = allUsers.some(user => user._id === authAccount.userId);
        if (!userExists) {
          await ctx.db.delete(authAccount._id);
          fixResults.accountsDeleted++;
        }
      }

    } catch (error) {
      fixResults.errors.push(`Fix error: ${error}`);
    }

    return {
      ...fixResults,
      message: `Fixed ${fixResults.usersFixed} users. All users can now login with password "temppass123"`,
      tempPassword: "temppass123"
    };
  },
});

// Test login for a specific user
export const testUserLogin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can test user login");
    }

    const emailLower = args.email.toLowerCase();

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", emailLower))
      .unique();

    if (!user) {
      return { canLogin: false, reason: "User not found" };
    }

    // Find auth account
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
      return { canLogin: false, reason: "No password account found" };
    }

    if (authAccount.providerAccountId !== emailLower) {
      return { 
        canLogin: false, 
        reason: `Email mismatch: user email is ${emailLower}, auth account has ${authAccount.providerAccountId}` 
      };
    }

    if (!authAccount.secret) {
      return { canLogin: false, reason: "No password set" };
    }

    return { 
      canLogin: true, 
      reason: "Should be able to login",
      tempPassword: authAccount.secret === "temppass123" ? "temppass123" : "custom password set"
    };
  },
});
