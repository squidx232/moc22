"use client";
import React, { useState } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";

export default function EnhancedSignInWrapper() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    // Basic validation
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      setSubmitting(false);
      return;
    }

    if (!email.includes('@')) {
      toast.error("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    try {
      formData.set("flow", "signIn");
      await signIn("password", formData);
      // Success - user will be redirected automatically
      
    } catch (error: any) {
      console.error("Sign in error:", error);
      const errorMessage = error?.message || "";
      
      if (errorMessage.includes("Invalid password") || errorMessage.includes("invalid password")) {
        toast.error("Invalid password. Please try again.");
      } else if (errorMessage.includes("User not found") || errorMessage.includes("user not found")) {
        toast.error("No account found with this email address.");
      } else if (errorMessage.includes("No password found")) {
        toast.error("No password set for this account. Please contact your administrator.");
      } else if (errorMessage.includes("pending approval")) {
        toast.warning("Your account is pending admin approval. Please wait for approval.");
      } else {
        toast.error("Sign in failed. Please check your credentials and try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={handleSubmit}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
          disabled={submitting}
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
          disabled={submitting}
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        <div className="text-center text-sm text-secondary-light mt-4">
          <p>Need an account? Contact your system administrator.</p>
          <p className="mt-2 text-xs text-gray-500">
            New user signup with admin approval available.
          </p>
        </div>
      </form>
    </div>
  );
}
