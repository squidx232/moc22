import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id, Doc } from '../../convex/_generated/dataModel';
import MocItem from './MocItem';
import ExcelExportButton from './ExcelExportButton'; 

interface MocListProps {
  onSelectMoc: (mocId: Id<"mocRequests">) => void;
  currentUser?: any;
}

// Define a more specific type for RFCs in the list, including optional fetched names
type MocRequestInList = Doc<"mocRequests"> & {
  submitterName?: string;
  assignedToName?: string;
  departmentApprovals?: Array<{ departmentName?: string; status?: string; approverDisplayName?: string; [key: string]: any }>;
  // Add other potential fields that might be joined or transformed by listRequests query
};


export default function MocList({ onSelectMoc, currentUser }: MocListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const mocRequests = useQuery(api.moc.listRequests, 
    currentUser?._id ? { 
      statusFilter: statusFilter === "all" ? undefined : statusFilter,
      requestingUserId: currentUser._id
    } : "skip"
  ) || [];
  const currentUserProfile = useQuery(
    api.users.getCurrentUserById,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "pending_department_approval", label: "Pending Dept Approval" },
    { value: "pending_final_review", label: "Pending Final Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-primary">Request for Change (RFC)</h1>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <ExcelExportButton className="w-full sm:w-auto" />
          <div className="w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {mocRequests.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl text-secondary-light">No RFC requests found {statusFilter !== "all" ? `with status "${statusOptions.find(s=>s.value === statusFilter)?.label || statusFilter}"` : ""}.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {mocRequests.map((moc) => (
            <MocItem 
              key={moc._id} 
              moc={moc as MocRequestInList} // Cast to the more specific type
              onSelectMoc={onSelectMoc} 
            />
          ))}
        </ul>
      )}
    </div>
  );
}
