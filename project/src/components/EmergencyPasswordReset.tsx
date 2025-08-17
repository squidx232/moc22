import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { AlertTriangle, Key } from 'lucide-react';

export default function EmergencyPasswordReset() {
  const [email, setEmail] = useState('hassanhany@scimitaregypt.com');
  const [newPassword, setNewPassword] = useState('hassan123');
  const [isResetting, setIsResetting] = useState(false);

  const resetPassword = useMutation(api.emergencyPasswordReset.emergencyResetAdminPassword);
  const createAdmin = useMutation(api.createAdmin.createAdminAccount);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !newPassword) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (!window.confirm(`Are you sure you want to reset the password for ${email} to plain text? This is a security risk and should only be used in emergencies.`)) {
      return;
    }

    setIsResetting(true);

    try {
      const result = await resetPassword({
        email,
        newPassword,
        confirmReset: true,
      });

      if (result.success) {
        toast.success(result.message, { duration: 10000 });
        toast.warning('IMPORTANT: Change your password immediately after logging in!', { duration: 15000 });
      }
    } catch (error: any) {
      toast.error(`Reset failed: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          <AlertTriangle size={48} className="mx-auto text-red-600 mb-3" />
          <h2 className="text-2xl font-bold text-red-800">Emergency Password Reset</h2>
          <p className="text-sm text-gray-600 mt-2">
            Use this only if you're locked out due to bcrypt migration
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">Security Warning</h3>
          </div>
          <p className="text-red-700 text-sm">
            This will reset your password to plain text, which is insecure. 
            Change it immediately after logging in using the "Change Password" feature.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <button
            onClick={async () => {
              try {
                const result = await createAdmin();
                if (result.success) {
                  toast.success(result.message, { duration: 15000 });
                }
              } catch (error: any) {
                toast.error(`Failed: ${error.message}`);
              }
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Key size={20} />
            Create Admin Account (hassanhany@scimitaregypt.com / hassan123)
          </button>
        </div>

        <div className="border-t border-gray-300 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Manual Password Reset</h3>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              disabled={isResetting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password (Plain Text)
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              disabled={isResetting}
            />
          </div>

          <button
            type="submit"
            disabled={isResetting}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Key size={20} />
            {isResetting ? 'Resetting...' : 'Emergency Reset Password'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">After Reset:</h4>
          <ol className="text-blue-800 text-sm list-decimal list-inside space-y-1">
            <li>Log in with your new plain text password</li>
            <li>Go to "My Profile" → "Change Password"</li>
            <li>Set a new secure password</li>
            <li>Run the password migration to secure all passwords</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
