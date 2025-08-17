import { mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

const SUPER_ADMIN_EMAIL = "hassanhany@scimitaregypt.com";

export const ensureSuperAdminExists = mutation({
  args: {},
  handler: async (ctx) => {
    const superAdmin = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", SUPER_ADMIN_EMAIL))
      .unique();

    if (!superAdmin) {
      const passwordHash = await bcrypt.hash("SuperAdmin123!", 10);

      const adminId = await ctx.db.insert("users", {
        email: SUPER_ADMIN_EMAIL,
        name: "Hassan Hany",
        passwordHash,
        isAdmin: true,
        isApproved: true,
        canCreateMocs: true,
        canEditAnyMoc: true,
        canDeleteAnyMoc: true,
        canManageUsers: true,
        canManageDepartments: true,
        canViewAllMocs: true,
        canManageMocRolesGlobally: true,
      });

      return { 
        success: true, 
        adminId, 
        message: "Super admin created with email: hassanhany@scimitaregypt.com and password: SuperAdmin123!" 
      };
    } else {
      await ctx.db.patch(superAdmin._id, {
        isAdmin: true,
        isApproved: true,
        canCreateMocs: true,
        canEditAnyMoc: true,
        canDeleteAnyMoc: true,
        canManageUsers: true,
        canManageDepartments: true,
        canViewAllMocs: true,
        canManageMocRolesGlobally: true,
      });

      return { 
        success: true, 
        message: "Super admin permissions updated and secured" 
      };
    }
  },
});

export const checkSuperAdminStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const superAdmin = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", SUPER_ADMIN_EMAIL))
      .unique();

    if (!superAdmin) {
      return { exists: false, message: "Super admin does not exist" };
    }

    return {
      exists: true,
      isAdmin: superAdmin.isAdmin,
      isApproved: superAdmin.isApproved,
      permissions: {
        canCreateMocs: superAdmin.canCreateMocs,
        canEditAnyMoc: superAdmin.canEditAnyMoc,
        canDeleteAnyMoc: superAdmin.canDeleteAnyMoc,
        canManageUsers: superAdmin.canManageUsers,
        canManageDepartments: superAdmin.canManageDepartments,
        canViewAllMocs: superAdmin.canViewAllMocs,
        canManageMocRolesGlobally: superAdmin.canManageMocRolesGlobally,
      }
    };
  },
});
