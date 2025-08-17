import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Shield, AlertTriangle, CheckCircle, Key, RefreshCw } from 'lucide-react';

export default function PasswordMigrationAdmin() {
  const [isMigrating, setIsMigrating] = useState(false);
  
  const passwordStatus = useQuery(api.passwordMigration.checkPasswordHashingStatus);
  const migratePasswords = useAction(api.passwordMigration.migratePasswordsToHashedAction);

  const handleMigration = async () => {
    if (!window.confirm(
      'This will migrate all plain text passwords to bcrypt hashes. ' +
      'This is a one-way operation and cannot be undone. ' +
      'Are you sure you want to proceed?'
    )) {
      return;
    }

    setIsMigrating(true);

    try {
      const result = await migratePasswords({
        confirmMigration: true,
      });

      if (result.errors && result.errors.length > 0) {
        toast.warning(`Migration completed with ${result.errors.length} errors. Check console for details.`);
        console.error('Migration errors:', result.errors);
      } else {
        toast.success(result.message);
      }
    } catch (error: any) {
      toast.error(`Migration failed: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!passwordStatus) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={20} className="animate-spin" />
          <h3 className="text-lg font-semibold">Loading password status...</h3>
        </div>
      </div>
    );
  }

  const totalPasswords = passwordStatus.authAccounts.total + passwordStatus.pendingSignups.total;
  const totalHashed = passwordStatus.authAccounts.hashed + passwordStatus.pendingSignups.hashed;
  const totalPlainText = passwordStatus.authAccounts.plainText + passwordStatus.pendingSignups.plainText;
  const totalTempHashed = passwordStatus.authAccounts.tempHashed + passwordStatus.pendingSignups.tempHashed;

  return (
    <div className="space-y-6">
      {/* Security Status Card */}
      <div className={`rounded-lg p-6 border-2 ${
        passwordStatus.needsMigration 
          ? 'bg-red-50 border-red-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {passwordStatus.needsMigration ? (
            <AlertTriangle size={24} className="text-red-600" />
          ) : (
            <CheckCircle size={24} className="text-green-600" />
          )}
          <h3 className={`text-xl font-bold ${
            passwordStatus.needsMigration ? 'text-red-800' : 'text-green-800'
          }`}>
            Password Security Status
          </h3>
        </div>
        
        <p className={`text-sm mb-4 ${
          passwordStatus.needsMigration ? 'text-red-700' : 'text-green-700'
        }`}>
          {passwordStatus.needsMigration 
            ? '⚠️ SECURITY RISK: Some passwords are stored in plain text or need proper hashing'
            : '✅ All passwords are properly secured with bcrypt hashing'
          }
        </p>

        {/* Password Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalPasswords}</div>
            <div className="text-sm text-gray-600">Total Passwords</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{totalHashed}</div>
            <div className="text-sm text-gray-600">Properly Hashed</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{totalTempHashed}</div>
            <div className="text-sm text-gray-600">Temp Hashed</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{totalPlainText}</div>
            <div className="text-sm text-gray-600">Plain Text</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Auth Accounts</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">{passwordStatus.authAccounts.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Properly Hashed:</span>
                <span className="font-medium text-green-600">{passwordStatus.authAccounts.hashed}</span>
              </div>
              <div className="flex justify-between">
                <span>Temp Hashed:</span>
                <span className="font-medium text-orange-600">{passwordStatus.authAccounts.tempHashed}</span>
              </div>
              <div className="flex justify-between">
                <span>Plain Text:</span>
                <span className="font-medium text-red-600">{passwordStatus.authAccounts.plainText}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Pending Signups</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">{passwordStatus.pendingSignups.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Properly Hashed:</span>
                <span className="font-medium text-green-600">{passwordStatus.pendingSignups.hashed}</span>
              </div>
              <div className="flex justify-between">
                <span>Temp Hashed:</span>
                <span className="font-medium text-orange-600">{passwordStatus.pendingSignups.tempHashed}</span>
              </div>
              <div className="flex justify-between">
                <span>Plain Text:</span>
                <span className="font-medium text-red-600">{passwordStatus.pendingSignups.plainText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Action */}
      {passwordStatus.needsMigration && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Password Migration</h3>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 mb-2">What this migration does:</h4>
            <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
              <li>Converts all plain text passwords to bcrypt hashes</li>
              <li>Upgrades temporary hashes to proper bcrypt hashes</li>
              <li>Applies to both active users and pending signups</li>
              <li>Uses bcrypt with 12 salt rounds for maximum security</li>
              <li>This is a one-way operation and cannot be undone</li>
            </ul>
          </div>

          <button
            onClick={handleMigration}
            disabled={isMigrating}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Key size={20} />
            {isMigrating ? 'Migrating Passwords...' : 'Migrate All Passwords to Secure Hashes'}
          </button>
        </div>
      )}

      {/* Security Recommendations */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">Security Recommendations</h3>
        </div>
        
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Run password migration to secure all existing passwords</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Consider implementing OAuth providers (Google, GitHub, Microsoft) for better security</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Enforce strong password policies (minimum 8 characters, complexity requirements)</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Implement password expiration and rotation policies</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <span>Enable two-factor authentication for admin accounts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
