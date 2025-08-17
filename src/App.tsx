import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";

// Import the simple components
import SimpleLogin from "./components/SimpleLogin";
import SimpleApp from "./SimpleApp";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const user = useQuery(api.auth.loggedInUser);

  // Update currentUser when Convex auth user changes
  useEffect(() => {
    // Mark as initialized once we get the first response from the auth query
    if (!isInitialized) {
      setIsInitialized(true);
    }

    if (user) {
      // Check if user has isApproved field, if not assume they're approved
      const isApproved = user.isApproved !== undefined ? user.isApproved : true;
      if (isApproved) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, [user, isInitialized]);

  const handleLogin = (user: any) => {
    if (user) {
      // Clear any existing session data first
      setCurrentUser(null);
      
      // Check if user has isApproved field, if not assume they're approved
      const isApproved = user.isApproved !== undefined ? user.isApproved : true;
      if (isApproved) {
        console.log('Setting current user in App.tsx:', user.email);
        setCurrentUser(user);
      } else {
        toast.error('Your account is pending approval. Please contact an administrator.');
      }
    } else {
      setCurrentUser(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Show login if no current user, otherwise show the app */}
      {!currentUser ? (
        <SimpleLogin onLogin={handleLogin} />
      ) : (
        <SimpleApp currentUser={currentUser} />
      )}
    </main>
  );
}
