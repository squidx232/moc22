import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { User, Mail, Building2, Shield, Calendar, Lock } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

interface MyProfilePageProps {
  currentUser?: any;
}

export default function MyProfilePage({ currentUser }: MyProfilePageProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const userProfile = useQuery(
    api.users.getCurrentUserById,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const departments = useQuery(api.departments.listDepartments) || [];

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const userDepartment = userProfile.departmentId 
    ? departments.find(d => d._id === userProfile.departmentId)
    : null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const permissions = [
    { key: 'isAdmin', label: 'Administrator', color: 'bg-red-100 text-red-800' },
    { key: 'canCreateMocs', label: 'Create RFCs', color: 'bg-blue-100 text-blue-800' },
    { key: 'canEditAnyMoc', label: 'Edit Any RFC', color: 'bg-green-100 text-green-800' },
    { key: 'canDeleteAnyMoc', label: 'Delete Any RFC', color: 'bg-purple-100 text-purple-800' },
    { key: 'canViewAllMocs', label: 'View All RFCs', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'canManageUsers', label: 'Manage Users', color: 'bg-indigo-100 text-indigo-800' },
    { key: 'canManageDepartments', label: 'Manage Departments', color: 'bg-pink-100 text-pink-800' },
  ];

  const activePermissions = permissions.filter(permission => userProfile && (userProfile as any)[permission.key]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-full p-3">
              <User size={32} className="text-blue-600" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">{userProfile.name}</h1>
              <p className="text-blue-100">{userProfile.email}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User size={20} />
                Basic Information
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{userProfile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium">{userDepartment?.name || 'No department assigned'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Account Created</p>
                    <p className="font-medium">{formatDate(userProfile._creationTime)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield size={20} />
                Account Status
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Approval Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    userProfile.isApproved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {userProfile.isApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Permissions</p>
                  {activePermissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activePermissions.map((permission) => (
                        <span
                          key={permission.key}
                          className={`px-2 py-1 text-xs font-medium rounded ${permission.color}`}
                        >
                          {permission.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No special permissions</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={20} />
          Security
        </h2>
        
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-gray-900">Password</p>
            <p className="text-sm text-gray-600">Change your account password</p>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Lock size={16} />
            Change Password
          </button>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">User ID</p>
            <p className="font-mono text-xs bg-gray-100 p-2 rounded">{userProfile._id}</p>
          </div>
          
          {userProfile.passwordHash && (
            <div>
              <p className="text-gray-600">Password Status</p>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Password Set & Encrypted
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
