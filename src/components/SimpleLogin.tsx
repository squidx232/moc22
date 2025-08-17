import React, { useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, LogIn, UserPlus } from 'lucide-react';

interface SimpleLoginProps {
  onLogin: (user: any) => void;
}

export default function SimpleLogin({ onLogin }: SimpleLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [requestAccessData, setRequestAccessData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const signInMutation = useMutation(api.simpleAuth.signIn);
  const setupPasswordAction = useAction(api.users.setupFirstTimePassword);
  const signUpMutation = useMutation(api.simpleAuth.signUp);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInMutation({ email: email.trim(), password });

      if (result.success && result.user) {
        // Check if user requires password setup
        if ((result.user as any).requiresPasswordSetup) {
          setRequiresPasswordSetup(true);
          setIsLoading(false);
          return;
        }

        onLogin(result.user);
        toast.success(`Welcome back, ${result.user.name || result.user.email}!`);
      } else {
        toast.error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Please enter both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await setupPasswordAction({
        email: email.trim(),
        temporaryPassword: password,
        newPassword: newPassword,
      });

      toast.success('Password set successfully! Please log in with your new password.');

      // Reset form and go back to login
      setRequiresPasswordSetup(false);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password setup error:', error);
      toast.error(`Failed to set password: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !requestAccessData.name.trim() ||
      !requestAccessData.email.trim() ||
      !requestAccessData.password.trim()
    ) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signUpMutation({
        name: requestAccessData.name.trim(),
        email: requestAccessData.email.trim(),
        password: requestAccessData.password,
      });
      if (result.success) {
        toast.success('Request submitted! Await admin approval.');
        setShowRequestAccess(false);
        setRequestAccessData({ name: '', email: '', password: '' });
      } else {
        toast.error(result.message || 'Request failed');
      }
    } catch (error) {
      toast.error('Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (requiresPasswordSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
              <Lock size={24} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Set Your Password</h2>
            <p className="text-gray-600 mt-2">
              Please set a new password for your account
            </p>
          </div>

          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your new password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your new password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Setting Password...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Set Password
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setRequiresPasswordSetup(false);
                setPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full text-gray-600 py-2 px-4 rounded-md hover:bg-gray-100 focus:outline-none"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showRequestAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
              <UserPlus size={24} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Request Access</h2>
            <p className="text-gray-600 mt-2">
              Fill in your details to request access. An admin will review your request.
            </p>
          </div>
          <form onSubmit={handleRequestAccess} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={requestAccessData.name}
                onChange={(e) =>
                  setRequestAccessData((d) => ({ ...d, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={requestAccessData.email}
                onChange={(e) =>
                  setRequestAccessData((d) => ({ ...d, email: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={requestAccessData.password}
                onChange={(e) =>
                  setRequestAccessData((d) => ({ ...d, password: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Submit Request
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowRequestAccess(false)}
              className="w-full text-gray-600 py-2 px-4 rounded-md hover:bg-gray-100 focus:outline-none"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
            <User size={24} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">RFC Platform</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowRequestAccess(true)}
            className="text-blue-600 hover:underline flex items-center gap-1 justify-center"
          >
            <UserPlus size={16} />
            Request Access
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Need an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
