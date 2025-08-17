import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { X, Eye, EyeOff, Crown, Copy, Check } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface CreateUserFormProps {
  onClose: () => void;
  onSuccess: (userData?: any) => void;
  initialData?: any;
  isEditing?: boolean;
  currentUser?: any;
}

const SUPER_ADMIN_EMAIL = "hassanhany@scimitaregypt.com";

const isSuperAdmin = (email?: string) => {
  return email === SUPER_ADMIN_EMAIL;
};

export default function CreateUserForm({ onClose, onSuccess, initialData, isEditing, currentUser }: CreateUserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isAdmin: false,
    canCreateMocs: false,
    canEditAnyMoc: false,
    canDeleteAnyMoc: false,
    canManageUsers: false,
    canManageDepartments: false,
    canViewAllMocs: false,
    canManageMocRolesGlobally: false,
    departmentId: '' as string,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [copiedTemp, setCopiedTemp] = useState(false);

  const departments = useQuery(api.departments.listDepartments) || [];
  const createUserAction = useAction(api.users.createUser);

  useEffect(() => {
    if (initialData && isEditing) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '', // Don't populate password for editing
        isAdmin: initialData.isAdmin || false,
        canCreateMocs: initialData.canCreateMocs || false,
        canEditAnyMoc: initialData.canEditAnyMoc || false,
        canDeleteAnyMoc: initialData.canDeleteAnyMoc || false,
        canManageUsers: initialData.canManageUsers || false,
        canManageDepartments: initialData.canManageDepartments || false,
        canViewAllMocs: initialData.canViewAllMocs || false,
        canManageMocRolesGlobally: initialData.canManageMocRolesGlobally || false,
        departmentId: initialData.departmentId || '',
      });
    }
  }, [initialData, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (!isEditing && !formData.password.trim()) {
      toast.error('Admin reference password is required for new users');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        // For editing, pass the data to parent component
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          isAdmin: formData.isAdmin,
          canCreateMocs: formData.canCreateMocs,
          canEditAnyMoc: formData.canEditAnyMoc,
          canDeleteAnyMoc: formData.canDeleteAnyMoc,
          canManageUsers: formData.canManageUsers,
          canManageDepartments: formData.canManageDepartments,
          canViewAllMocs: formData.canViewAllMocs,
          canManageMocRolesGlobally: formData.canManageMocRolesGlobally,
          departmentId: formData.departmentId || undefined,
        };
        await onSuccess(updateData);
      } else {
        // For creating new user
        const result = await createUserAction({
          name: formData.name,
          email: formData.email,
          temporaryPassword: formData.password,
          isAdmin: formData.isAdmin,
          canCreateMocs: formData.canCreateMocs,
          canEditAnyMoc: formData.canEditAnyMoc,
          canDeleteAnyMoc: formData.canDeleteAnyMoc,
          canManageUsers: formData.canManageUsers,
          canManageDepartments: formData.canManageDepartments,
          canViewAllMocs: formData.canViewAllMocs,
          canManageMocRolesGlobally: formData.canManageMocRolesGlobally,
          requestingUserId: currentUser._id,
        });

        setTemporaryPassword(formData.password);
        setShowTemporaryPassword(true);
        toast.success('User created successfully! Please share the temporary password with the user.');
      }
    } catch (error) {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} user: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [permission]: value }));
  };

  const copyTemporaryPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopiedTemp(true);
      toast.success('Temporary password copied to clipboard');
      setTimeout(() => setCopiedTemp(false), 2000);
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  const handleCloseWithSuccess = () => {
    setShowTemporaryPassword(false);
    setTemporaryPassword('');
    onSuccess();
    onClose();
  };

  // Check if the user being edited is the super admin
  const isEditingSuperAdmin = isEditing && isSuperAdmin(initialData?.email);
  
  // Check if current user can modify admin status
  const canModifyAdminStatus = !isEditingSuperAdmin || isSuperAdmin(currentUser?.email);

  // Show temporary password modal
  if (showTemporaryPassword && temporaryPassword) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
              <Check size={24} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">User Created Successfully!</h3>
            <p className="text-sm text-gray-600 mt-2">
              Please share the temporary password with <strong>{formData.email}</strong>
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Temporary Password:</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-yellow-100 text-yellow-900 px-3 py-2 rounded text-lg font-mono">
                {temporaryPassword}
              </code>
              <button
                onClick={copyTemporaryPassword}
                className="p-2 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded"
                title="Copy password"
              >
                {copiedTemp ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-yellow-700 mt-2">
              The user will need to use this temporary password to set up their account on first login.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Next Steps:</h4>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Share the temporary password with the user</li>
              <li>User signs in with their email and temporary password</li>
              <li>User will be prompted to set a new password</li>
              <li>User can then access the system normally</li>
            </ol>
          </div>

          <button
            onClick={handleCloseWithSuccess}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {isEditing ? 'Edit User' : 'Create New User'}
            {isEditingSuperAdmin && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Crown size={12} />
                Super Admin
              </span>
            )}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {isEditingSuperAdmin && !isSuperAdmin(currentUser?.email) && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ You are viewing the super admin account. Some fields cannot be modified.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full name"
                required
                disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
                required
                disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Reference Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password (for admin reference only)"
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
              <p className="text-xs text-gray-500 mt-1">
                This password is for admin reference only. The user will receive a secure temporary password to set up their account.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
            >
              <option value="">No Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Permissions</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isAdmin}
                  onChange={(e) => handlePermissionChange('isAdmin', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={!canModifyAdminStatus}
                />
                <span className="text-sm flex items-center gap-1">
                  Administrator
                  {isEditingSuperAdmin && <Crown size={12} className="text-yellow-600" />}
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canCreateMocs}
                  onChange={(e) => handlePermissionChange('canCreateMocs', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
                />
                <span className="text-sm">Can Create MOCs</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canEditAnyMoc}
                  onChange={(e) => handlePermissionChange('canEditAnyMoc', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
                />
                <span className="text-sm">Can Edit Any MOC</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canDeleteAnyMoc}
                  onChange={(e) => handlePermissionChange('canDeleteAnyMoc', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
                />
                <span className="text-sm">Can Delete Any MOC</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canManageUsers}
                  onChange={(e) => handlePermissionChange('canManageUsers', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
                />
                <span className="text-sm">Can Manage Users</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canManageDepartments}
                  onChange={(e) => handlePermissionChange('canManageDepartments', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
                />
                <span className="text-sm">Can Manage Departments</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canViewAllMocs}
                  onChange={(e) => handlePermissionChange('canViewAllMocs', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
                />
                <span className="text-sm">Can View All MOCs</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canManageMocRolesGlobally}
                  onChange={(e) => handlePermissionChange('canManageMocRolesGlobally', e.target.checked)}
                  className="checkbox checkbox-sm"
                  disabled={isEditingSuperAdmin && !isSuperAdmin(currentUser?.email)}
                />
                <span className="text-sm">Can Manage MOC Roles Globally</span>
              </label>
            </div>
          </div>

          {!canModifyAdminStatus && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ Admin status cannot be modified for the super admin account.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : (isEditing ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
