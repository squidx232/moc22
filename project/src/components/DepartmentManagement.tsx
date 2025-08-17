import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Users, X, Building2 } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface DepartmentManagementProps {
  currentUser?: any;
}

export default function DepartmentManagement({ currentUser }: DepartmentManagementProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    approverUserIds: [] as Id<"users">[],
  });

  const departments = useQuery(api.departments.listDepartments) || [];
  const allUsers = useQuery(
    api.users.listAllUsers,
    currentUser?._id ? { requestingUserId: currentUser._id } : "skip"
  ) || [];

  const createDepartmentMutation = useMutation(api.departments.createDepartment);
  const updateDepartmentMutation = useMutation(api.departments.updateDepartment);
  const deleteDepartmentMutation = useMutation(api.departments.deleteDepartment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      if (editingDepartment) {
        await updateDepartmentMutation({
          departmentId: editingDepartment._id,
          requestingUserId: currentUser._id,
          ...formData,
        });
        toast.success('Department updated successfully');
      } else {
        await createDepartmentMutation({
          ...formData,
          requestingUserId: currentUser._id,
        });
        toast.success('Department created successfully');
      }
      resetForm();
    } catch (error) {
      toast.error(`Failed to ${editingDepartment ? 'update' : 'create'} department: ${(error as Error).message}`);
    }
  };

  const handleEdit = (department: any) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      approverUserIds: department.approverUserIds || [],
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (departmentId: Id<"departments">) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    
    try {
      await deleteDepartmentMutation({ 
        departmentId,
        requestingUserId: currentUser._id,
      });
      toast.success('Department deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete department: ${(error as Error).message}`);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', approverUserIds: [] });
    setEditingDepartment(null);
    setShowCreateForm(false);
  };

  const toggleApprover = (userId: Id<"users">) => {
    setFormData(prev => ({
      ...prev,
      approverUserIds: prev.approverUserIds.includes(userId)
        ? prev.approverUserIds.filter(id => id !== userId)
        : [...prev.approverUserIds, userId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 size={24} />
          Department Management
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Create Department
        </button>
      </div>

      {/* Department List */}
      <div className="grid gap-4">
        {departments.map((department) => (
          <div key={department._id} className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                {department.description && (
                  <p className="text-gray-600 mt-1">{department.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Users size={16} />
                  <span>{department.approverUserId ? '1 approver' : '0 approvers'}</span>
                </div>
                {department.approverUserId && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">Approver:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(() => {
                        const userId = department.approverUserId;
                        const user = allUsers.find(u => u._id === userId);
                        return user ? (
                          <span key={userId} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {user.name || user.email}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(department)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(department._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">
                {editingDepartment ? 'Edit Department' : 'Create Department'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter department name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter department description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Approvers
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {allUsers.map((user) => (
                    <label key={user._id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.approverUserIds.includes(user._id)}
                        onChange={() => toggleApprover(user._id)}
                        className="checkbox checkbox-sm"
                      />
                      <span className="text-sm">{user.name || user.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingDepartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
