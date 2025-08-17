import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Function to list all users for debugging
export const listAllUsersDebug = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can debug users");
    }

    const allUsers = await ctx.db.query("users").collect();
    
    return {
      totalUsers: allUsers.length,
      users: allUsers.map(user => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        emailLower: user.email?.toLowerCase(),
        hasEmail: !!user.email,
      }))
    };
  },
});

// Function to search for a specific user
export const searchUser = mutation({
  args: { 
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify admin permissions
    const currentUserProfile = await ctx.db.get(currentUserId);

    if (!currentUserProfile?.isAdmin) {
      throw new ConvexError("Only administrators can search users");
    }

    const searchLower = args.searchTerm.trim().toLowerCase();
    const allUsers = await ctx.db.query("users").collect();
    
    const matchingUsers = allUsers.filter(user => 
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.email === args.searchTerm.trim()
    );

    return {
      searchTerm: args.searchTerm,
      searchLower: searchLower,
      totalUsers: allUsers.length,
      matchingUsers: matchingUsers.map(user => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        emailLower: user.email?.toLowerCase(),
      }))
    };
  },
});
