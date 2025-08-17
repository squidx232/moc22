"use node";
import bcrypt from "bcryptjs";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

export function isPasswordHashed(password: string): boolean {
  // Check if password is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  return /^\$2[aby]\$\d+\$/.test(password);
}

// Internal actions for use in mutations
export const hashPasswordAction = internalAction({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    return await hashPassword(args.password);
  },
});

export const verifyPasswordAction = internalAction({
  args: { 
    password: v.string(),
    hashedPassword: v.string()
  },
  handler: async (ctx, args) => {
    return await verifyPassword(args.password, args.hashedPassword);
  },
});

export const isPasswordHashedAction = internalAction({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    return isPasswordHashed(args.password);
  },
});
