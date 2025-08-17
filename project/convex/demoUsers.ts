import { v } from "convex/values";
import { mutation } from "./_generated/server";

// This file is kept for backward compatibility but demo user creation is disabled
// Users should be created through the admin interface or sign-up process

export const createDemoAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Demo user creation disabled
    return { success: true, message: "Demo user creation is disabled. Please use the admin interface to create users." };
  },
});

export const createDemoUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Demo user creation disabled
    return { success: true, message: "Demo user creation is disabled. Please use the admin interface to create users." };
  },
});

export const createDemoUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // Demo user creation disabled
    return { success: true, message: "Demo user creation is disabled. Please use the admin interface to create users." };
  },
});
