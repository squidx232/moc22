import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import SimpleLogin from './components/SimpleLogin';
import CreateMocForm from './components/CreateMocForm';
import MocList from './components/MocList';
import MocDetailsPageUpdated from './components/MocDetailsPageUpdated';
import AdminPage from './components/AdminPage';
import DashboardPage from './components/DashboardPage';
import KpiDashboardPage from './components/KpiDashboardPage';
import NotificationsBell from './components/NotificationsBell';
import NotificationsPage from './components/NotificationsPage';
import MyProfilePage from './components/MyProfilePage';
import { toast, Toaster } from 'sonner';
import { BarChart2, UserCircle, LogOut } from 'lucide-react';

export type Page = 
  | { type: "dashboard" }
  | { type: "list" }
  | { type: "create" }
  | { type: "details"; mocId: Id<"mocRequests"> }
  | { type: "edit"; mocId: Id<"mocRequests"> }
  | { type: "admin" }
  | { type: "kpi_dashboard" }
  | { type: "my_profile" }
  | { type: "notifications" };

export type CurrentUserProfile = any;

interface SimpleAppProps {
  currentUser?: any;
}

export default function SimpleApp({ currentUser: initialCurrentUser }: SimpleAppProps) {
  const [currentUser, setCurrentUser] = useState<any>(initialCurrentUser);
  const [page, setPage] = useState<Page>({ type: "dashboard" });
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  
  const signOutMutation = useMutation(api.simpleAuth.signOut);

  // Get user data from Convex to keep it fresh
  const userData = useQuery(
    api.simpleAuth.getCurrentUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  // Update current user when initial user or data changes
  useEffect(() => {
    if (initialCurrentUser && !currentUser) {
      setCurrentUser(initialCurrentUser);
    }
  }, [initialCurrentUser, currentUser]);

  // Update current user when data changes and validate session
  useEffect(() => {
    if (userData && currentUser) {
      // Check if the user is still approved and valid
      if (!userData.isApproved) {
        console.warn('User is no longer approved, logging out');
        clearSession();
        toast.error('Your account access has been revoked. Please contact an administrator.');
        return;
      }
      setCurrentUser(userData);
      setIsLoadingSession(false);
    } else if (currentUser && userData === null) {
      // User data couldn't be fetched. Do NOT clear session on transient errors; only clear if backend confirms invalid/unapproved.
      // Optionally, show a warning but keep session.
      console.warn('Could not fetch user data, but keeping session for now.');
    } else {
      setIsLoadingSession(false);
    }
  }, [userData, currentUser]);

  // Check if current page is admin page but user is not admin
  useEffect(() => {
    if ((page.type === "admin" || page.type === "kpi_dashboard") && currentUser?.isAdmin !== true) {
      console.warn('Non-admin user on admin page, redirecting to dashboard');
      setPage({ type: "dashboard" });
    }
  }, [page, currentUser]);

  const handleLogin = (user: any) => {
    if (user && user._id && user.email) {
      // Validate user has required permissions
      if (!user.isApproved) {
        toast.error('Your account is pending approval. Please contact an administrator.');
        return;
      }
      
      // Clear any existing session data first
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      
      // Set new user data
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setPage({ type: "dashboard" }); // Navigate to dashboard after login
      
      console.log('User logged in successfully:', user.email);
      toast.success(`Welcome back, ${user.name || user.email}!`);
    } else {
      console.error('Invalid user object received:', user);
      toast.error('Login failed: Invalid user data');
    }
  };

  const clearSession = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    setPage({ type: "dashboard" });
    setIsLoadingSession(false);
  };

  const handleLogout = () => {
    // Immediately clear session and redirect to login
    clearSession();
    toast.success('Logged out successfully');
    // Optionally, fire and forget backend sign out
    if (currentUser?._id) {
      signOutMutation({ userId: currentUser._id });
    }
  };


  const navigate = (newPage: Page) => {
    // Prevent navigation to admin pages for non-admin users
    if ((newPage.type === "admin" || newPage.type === "kpi_dashboard") && currentUser?.isAdmin !== true) {
      console.warn('Attempted to navigate to admin page without admin privileges');
      toast.error('Access denied. Administrator privileges required.');
      return;
    }
    setPage(newPage);
  };

  // Always call this hook to maintain hook order
  const mocToEdit = useQuery(
    api.moc.getRequestDetails, 
    currentUser?._id && page.type === "edit" && page.mocId ? { 
      id: page.mocId,
      requestingUserId: currentUser._id
    } : "skip"
  );

  // Try to restore user from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser._id && parsedUser.email) {
          console.log('Restoring user session:', parsedUser.email);
          setCurrentUser(parsedUser);
          // Validate session by fetching fresh user data
          // This will be handled by the userData query above
        } else {
          console.log('Invalid saved user data, clearing localStorage');
          clearSession();
        }
      } catch (e) {
        console.error('Error parsing saved user:', e);
        clearSession();
      }
    } else {
      setIsLoadingSession(false);
    }
  }, []);

  const handleMocCreated = (mocId: Id<"mocRequests">) => {
    navigate({ type: "details", mocId });
  };

  const handleMocSelected = (mocId: Id<"mocRequests">) => {
    navigate({ type: "details", mocId });
  };

  const handleEditMoc = (mocId: Id<"mocRequests">) => {
    navigate({ type: "edit", mocId });
  };

  // Show loading screen while checking session
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <SimpleLogin onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Toaster position="top-right" richColors />
      
      <header className="bg-primary shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div 
            className="text-2xl font-bold text-white cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => navigate({ type: "dashboard" })}
          >
            RFC Platform
          </div>
          <div className="flex items-center space-x-4">
            <NotificationsBell currentUser={currentUser} onNavigate={navigate} />
            <span className="text-sm text-white hidden md:block">
              {currentUser?.name || currentUser?.email || 'User'}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-start space-x-1 md:space-x-2 overflow-x-auto py-2">
            <button onClick={() => navigate({ type: "dashboard" })} className={`nav-button ${page.type === "dashboard" ? "nav-button-active" : ""}`}>Dashboard</button>
            <button onClick={() => navigate({ type: "list" })} className={`nav-button ${page.type === "list" ? "nav-button-active" : ""}`}>All RFCs</button>
            {(currentUser?.canCreateMocs || currentUser?.isAdmin) && (
              <button onClick={() => navigate({ type: "create" })} className={`nav-button ${page.type === "create" ? "nav-button-active" : ""}`}>+ New RFC</button>
            )}
            <button onClick={() => navigate({ type: "my_profile" })} className={`nav-button ${page.type === "my_profile" ? "nav-button-active" : ""}`}>
              <UserCircle size={16} className="inline mr-1" /> My Profile
            </button>
            {currentUser?.isAdmin === true && (
              <>
                <button onClick={() => navigate({ type: "admin" })} className={`nav-button ${page.type === "admin" ? "nav-button-active" : ""}`}>Admin</button>
                <button onClick={() => navigate({ type: "kpi_dashboard" })} className={`nav-button ${page.type === "kpi_dashboard" ? "nav-button-active" : ""}`}>
                  <BarChart2 size={16} className="inline mr-1" /> KPI Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        {page.type === "dashboard" && <DashboardPage currentUser={currentUser} />}
        {page.type === "list" && <MocList onSelectMoc={handleMocSelected} currentUser={currentUser} />}
        {page.type === "create" && <CreateMocForm onSuccess={handleMocCreated} currentUser={currentUser} />}
        {page.type === "details" && <MocDetailsPageUpdated mocId={page.mocId} onBack={() => setPage({ type: "list" })} onEdit={handleEditMoc} currentUser={currentUser} />}
        {page.type === "edit" && mocToEdit && <CreateMocForm onSuccess={handleMocCreated} mocToEdit={mocToEdit} currentUser={currentUser} />}
        {page.type === "admin" && currentUser?.isAdmin === true && <AdminPage currentUser={currentUser} />}
        {page.type === "kpi_dashboard" && currentUser?.isAdmin === true && <KpiDashboardPage currentUser={currentUser} />}
        {page.type === "my_profile" && <MyProfilePage currentUser={currentUser} />} 
        {page.type === "notifications" && <NotificationsPage currentUser={currentUser} />}
        {(page.type === "admin" || page.type === "kpi_dashboard") && currentUser?.isAdmin !== true && (
          <div className="text-center text-red-500 font-semibold p-10 bg-white rounded-lg shadow">
            Access Denied. You must be an administrator to view this page.
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white text-center p-4 text-xs">
        <p>&copy; {new Date().getFullYear()} RFC Platform. All rights reserved.</p>
        <p>
          <a href="https://linkedin.com/in/whereishassan" target="_blank" rel="noopener noreferrer" className="hover:underline text-primary-light">
            Hassan Hany
          </a> - Asset Integrity Management Team
        </p>
      </footer>
    </div>
  );
}
