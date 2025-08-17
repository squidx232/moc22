import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Users, UserPlus, Edit2, Trash2, Shield, Building2, Settings, Crown } from 'lucide-react';
import CreateUserForm from './CreateUserForm';
import DepartmentManagement from './DepartmentManagement';
import { Id } from '../../convex/_generated/dataModel';

interface AdminPageProps {
  currentUser?: any;
}

const SUPER_ADMIN_EMAIL = "hassanhany@scimitaregypt.com";

const isSuperAdmin = (email?: string) => {
  return email === SUPER_ADMIN_EMAIL;
};

export default function AdminPage({ currentUser }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'pending'>('users');
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Always call useQuery hooks first, but conditionally skip them
  const allUsers = useQuery(
    api.users.listAllUsers,
    currentUser?._id && currentUser?.isAdmin === true ? { requestingUserId: currentUser._id } : "skip"
  ) || [];

  // Check if user is admin after hooks
  if (!currentUser || currentUser.isAdmin !== true) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }
  
  const departments = useQuery(api.departments.listDepartments) || [];

  // Note: User approval is handled through pending signups, not direct user approval
  const updateUserMutation = useMutation(api.users.updateUser);
  const assignUserToDepartmentMutation = useMutation(api.departments.assignUserToDepartment);
  const approveUserMutation = useMutation(api.users.approveUser);
  const rejectUserMutation = useMutation(api.users.rejectUser);
  const deleteUserMutation = useMutation(api.users.deleteUser);

  const approvedUsers = allUsers.filter(user => user.isApproved);
  const pendingUsers = allUsers.filter(user => !user.isApproved);

  const handleApproveUser = async (userId: string) => {
    try {
      await approveUserMutation({ 
        userId: userId as Id<"users">, 
        requestingUserId: currentUser._id 
      });
      toast.success('User approved successfully');
    } catch (error) {
      toast.error(`Failed to approve user: ${(error as Error).message}`);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? This action cannot be undone.')) return;
    try {
      await rejectUserMutation({ 
        userId: userId as Id<"users">, 
        requestingUserId: currentUser._id 
      });
      toast.success('User rejected successfully');
    } catch (error) {
      toast.error(`Failed to reject user: ${(error as Error).message}`);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmMessage = `Are you sure you want to permanently delete "${userName}"?\n\nThis will:\n- Delete the user account\n- Remove all their notifications\n- Clear their edit history\n- Remove all related data\n\nThis action CANNOT be undone.`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      await deleteUserMutation({ 
        userId: userId as Id<"users">, 
        requestingUserId: currentUser._id 
      });
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete user: ${(error as Error).message}`);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowCreateUserForm(true);
  };

  const handleUpdateUser = async (userData: any) => {
    if (!editingUser) return;
    
    try {
      await updateUserMutation({
        userId: editingUser._id,
        requestingUserId: currentUser._id,
        ...userData,
      });
      toast.success('User updated successfully');
      setEditingUser(null);
      setShowCreateUserForm(false);
    } catch (error) {
      toast.error(`Failed to update user: ${(error as Error).message}`);
    }
  };

  const handleAssignDepartment = async (userId: Id<"users">, departmentId: Id<"departments"> | undefined) => {
    try {
      await assignUserToDepartmentMutation({ 
        userId, 
        departmentId,
        requestingUserId: currentUser._id,
      });
      toast.success('User department assignment updated');
    } catch (error) {
      toast.error('Failed to update department assignment');
    }
  };

  const getDepartmentName = (departmentId?: Id<"departments">) => {
    if (!departmentId) return 'No Department';
    const department = departments.find(d => d._id === departmentId);
    return department?.name || 'Unknown Department';
  };

  const canModifyUser = (user: any) => {
    // Super admin can modify anyone except other super admins (unless they are the super admin themselves)
    if (isSuperAdmin(currentUser.email)) {
      return true;
    }
    // Regular admins cannot modify the super admin
    return !isSuperAdmin(user.email);
  };

  const canDeleteUser = (user: any) => {
    // Cannot delete super admin
    if (isSuperAdmin(user.email)) {
      return false;
    }
    // Cannot delete yourself
    if (user._id === currentUser._id) {
      return false;
    }
    return true;
  };

  const tabs = [
    { id: 'users' as const, label: 'Users', icon: Users, count: approvedUsers.length },
    { id: 'pending' as const, label: 'Pending Approval', icon: Shield, count: pendingUsers.length },
    { id: 'departments' as const, label: 'Departments', icon: Building2, count: departments.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={28} />
          Admin Panel
          {isSuperAdmin(currentUser.email) && (
            <span className="bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded-full flex items-center gap-1">
              <Crown size={14} />
              Super Admin
            </span>
          )}
        </h1>
        {activeTab === 'users' && (
          <button
            onClick={() => setShowCreateUserForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus size={16} />
            Create User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Approved Users</h2>
          <div className="grid gap-4">
            {approvedUsers.map((user) => (
              <div key={user._id} className="bg-white p-6 rounded-lg shadow-md border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{user.name || 'No Name'}</h3>
                      {user.isAdmin && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          {isSuperAdmin(user.email) && <Crown size={12} />}
                          {isSuperAdmin(user.email) ? 'Super Admin' : 'Admin'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{user.email}</p>
                    {isSuperAdmin(user.email) && (
                      <p className="text-sm text-yellow-600 font-medium mt-1">
                        🛡️ Protected Account - Cannot be modified or deleted
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Department: {getDepartmentName(user.departmentId)}
                    </p>
                    
                    {/* Department Assignment */}
                    {canModifyUser(user) && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assign Department:
                        </label>
                        <select
                          value={user.departmentId || ''}
                          onChange={(e) => handleAssignDepartment(
                            user._id, 
                            e.target.value ? e.target.value as Id<"departments"> : undefined
                          )}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">No Department</option>
                          {departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.canCreateMocs && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Can Create MOCs</span>
                      )}
                      {user.canEditAnyMoc && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Can Edit Any MOC</span>
                      )}
                      {user.canDeleteAnyMoc && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Can Delete Any MOC</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canModifyUser(user) && (
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit user"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {canDeleteUser(user) && (
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name || user.email || 'Unknown User')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Pending User Approvals</h2>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending user approvals
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingUsers.map((user) => (
                <div key={user._id} className="bg-white p-6 rounded-lg shadow-md border border-yellow-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{user.name || 'No Name'}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-2 inline-block">
                        Pending Approval
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveUser(user._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectUser(user._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'departments' && (
        <DepartmentManagement currentUser={currentUser} />
      )}

      {/* Create/Edit User Form */}
      {showCreateUserForm && (
        <CreateUserForm
          onClose={() => {
            setShowCreateUserForm(false);
            setEditingUser(null);
          }}
          onSuccess={editingUser ? handleUpdateUser : () => {
            setShowCreateUserForm(false);
            setEditingUser(null);
          }}
          initialData={editingUser}
          isEditing={!!editingUser}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
