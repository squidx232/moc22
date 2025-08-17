import { ConvexError, v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hashPassword, isPasswordHashed } from "./passwordUtils";
import { internal } from "./_generated/api";

// Action to handle password migration with hashing
export const migratePasswordsToHashedAction = action({
  args: {
    confirmMigration: v.boolean(),
  },
  handler: async (ctx, args): Promise<any> => {
    if (!args.confirmMigration) {
      throw new ConvexError("Must confirm migration by setting confirmMigration to true");
    }

    // Get current user info first
    const currentUserId = await ctx.runQuery(internal.passwordMigration.getCurrentUserForMigration, {});
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Get all accounts that need migration
    const accountsToMigrate = await ctx.runQuery(internal.passwordMigration.getAccountsNeedingMigration, {});
    
    const migrationResults = {
      totalAuthAccounts: accountsToMigrate.authAccounts.length,
      passwordsHashed: 0,
      alreadyHashed: 0,
      pendingSignupsHashed: 0,
      errors: [] as string[],
    };

    // Process auth accounts
    for (const account of accountsToMigrate.authAccounts) {
      if (account.provider === "password" && account.secret) {
        if (isPasswordHashed(account.secret)) {
          migrationResults.alreadyHashed++;
        } else if (account.secret.startsWith('hashed_')) {
          // Handle old temporary hashing - convert to proper bcrypt
          try {
            const plainPassword = account.secret.replace('hashed_', '');
            const properlyHashedPassword = await hashPassword(plainPassword);
            
            await ctx.runMutation(internal.passwordMigration.updateAccountPassword, {
              accountId: account._id,
              hashedPassword: properlyHashedPassword,
            });
            
            migrationResults.passwordsHashed++;
          } catch (error) {
            migrationResults.errors.push(`Failed to properly hash password for account ${account._id}: ${error}`);
          }
        } else {
          // Plain text password - hash it properly
          try {
            const hashedPassword = await hashPassword(account.secret);
            
            await ctx.runMutation(internal.passwordMigration.updateAccountPassword, {
              accountId: account._id,
              hashedPassword: hashedPassword,
            });
            
            migrationResults.passwordsHashed++;
          } catch (error) {
            migrationResults.errors.push(`Failed to hash password for account ${account._id}: ${error}`);
          }
        }
      }
    }

    // Process pending signups
    for (const signup of accountsToMigrate.pendingSignups) {
      if (signup.password) {
        if (isPasswordHashed(signup.password)) {
          // Already properly hashed, skip
          continue;
        } else if (signup.password.startsWith('hashed_')) {
          // Handle old temporary hashing - convert to proper bcrypt
          try {
            const plainPassword = signup.password.replace('hashed_', '');
            const properlyHashedPassword = await hashPassword(plainPassword);
            
            await ctx.runMutation(internal.passwordMigration.updateSignupPassword, {
              signupId: signup._id,
              hashedPassword: properlyHashedPassword,
            });
            
            migrationResults.pendingSignupsHashed++;
          } catch (error) {
            migrationResults.errors.push(`Failed to properly hash password for pending signup ${signup._id}: ${error}`);
          }
        } else {
          // Plain text password - hash it properly
          try {
            const hashedPassword = await hashPassword(signup.password);
            
            await ctx.runMutation(internal.passwordMigration.updateSignupPassword, {
              signupId: signup._id,
              hashedPassword: hashedPassword,
            });
            
            migrationResults.pendingSignupsHashed++;
          } catch (error) {
            migrationResults.errors.push(`Failed to hash password for pending signup ${signup._id}: ${error}`);
          }
        }
      }
    }

    return {
      ...migrationResults,
      message: `Migration completed. Properly hashed ${migrationResults.passwordsHashed} auth account passwords and ${migrationResults.pendingSignupsHashed} pending signup passwords using bcrypt.`,
    };
  },
});

// Internal query to get current user for migration
export const getCurrentUserForMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return null;
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can run password migration");
    }

    return currentUserId;
  },
});

// Internal query to get accounts needing migration
export const getAccountsNeedingMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can run password migration");
    }

    const allAuthAccounts = await ctx.db.query("authAccounts").collect();
    const pendingSignups = await ctx.db
      .query("pendingSignups")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return {
      authAccounts: allAuthAccounts,
      pendingSignups: pendingSignups,
    };
  },
});

// Internal mutation to update account password
export const updateAccountPassword = internalMutation({
  args: {
    accountId: v.id("authAccounts"),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      secret: args.hashedPassword,
    });
  },
});

// Internal mutation to update signup password
export const updateSignupPassword = internalMutation({
  args: {
    signupId: v.id("pendingSignups"),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.signupId, {
      password: args.hashedPassword,
    });
  },
});

// Check password hashing status
export const checkPasswordHashingStatus = query({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can check password status");
    }

    const allAuthAccounts = await ctx.db.query("authAccounts").collect();
    const pendingSignups = await ctx.db
      .query("pendingSignups")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const passwordAccounts = allAuthAccounts.filter(acc => acc.provider === "password" && acc.secret);
    const hashedPasswords = passwordAccounts.filter(acc => acc.secret && isPasswordHashed(acc.secret));
    const tempHashedPasswords = passwordAccounts.filter(acc => acc.secret && acc.secret.startsWith('hashed_') && !isPasswordHashed(acc.secret));
    const plainTextPasswords = passwordAccounts.filter(acc => acc.secret && !isPasswordHashed(acc.secret) && !acc.secret.startsWith('hashed_'));

    const hashedPendingSignups = pendingSignups.filter(signup => signup.password && isPasswordHashed(signup.password));
    const tempHashedPendingSignups = pendingSignups.filter(signup => signup.password && signup.password.startsWith('hashed_') && !isPasswordHashed(signup.password));
    const plainTextPendingSignups = pendingSignups.filter(signup => signup.password && !isPasswordHashed(signup.password) && !signup.password.startsWith('hashed_'));

    return {
      authAccounts: {
        total: passwordAccounts.length,
        hashed: hashedPasswords.length,
        tempHashed: tempHashedPasswords.length,
        plainText: plainTextPasswords.length,
      },
      pendingSignups: {
        total: pendingSignups.length,
        hashed: hashedPendingSignups.length,
        tempHashed: tempHashedPendingSignups.length,
        plainText: plainTextPendingSignups.length,
      },
      needsMigration: plainTextPasswords.length > 0 || plainTextPendingSignups.length > 0 || tempHashedPasswords.length > 0 || tempHashedPendingSignups.length > 0,
    };
  },
});
