"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow] = useState<"signIn">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", "signIn");
          void signIn("password", formData).catch((error) => {
            console.error("Sign in error:", error);
            const errorMessage = error?.message || "";
            let toastTitle = "";
            if (errorMessage.includes("Invalid password") || errorMessage.includes("invalid password")) {
              toastTitle = "Invalid password. Please try again.";
            } else if (errorMessage.includes("User not found") || errorMessage.includes("user not found")) {
              toastTitle = "No account found with this email address.";
            } else if (errorMessage.includes("Missing") || errorMessage.includes("required")) {
              toastTitle = "Please fill in all required fields.";
            } else if (errorMessage.includes("Invalid email") || errorMessage.includes("invalid email")) {
              toastTitle = "Please enter a valid email address.";
            } else {
              toastTitle = "Invalid email or password. Please check your credentials.";
            }
            toast.error(toastTitle, { duration: 5000 });
            setSubmitting(false);
          });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          Sign in
        </button>
        <div className="text-center text-sm text-secondary-light mt-4">
          <p>Need an account? Contact your system administrator.</p>
          <p className="mt-2 text-xs text-gray-500">
            New user signup with admin approval coming soon.
          </p>
        </div>
      </form>
    </div>
  );
}
