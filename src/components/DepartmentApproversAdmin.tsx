import React from 'react';
import { Building2 } from 'lucide-react';

interface DepartmentApproversAdminProps {
  currentUser?: any;
}

export default function DepartmentApproversAdmin({ currentUser }: DepartmentApproversAdminProps) {

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Building2 size={24} />
          Department Approvers Management
        </h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Feature Updated</h3>
        <p className="text-blue-700 mb-4">
          Department approver management has been moved to the new Department Management section in the Admin Panel.
        </p>
        <p className="text-blue-700">
          You can now assign users directly as department approvers instead of using email addresses. 
          This provides better integration and user management.
        </p>
      </div>
    </div>
  );
}




