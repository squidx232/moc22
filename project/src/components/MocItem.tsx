import React from 'react';
import { Id, Doc } from '../../convex/_generated/dataModel';
import { formatTimestampToDate } from '../lib/utils';
import { Calendar, User, Building, AlertCircle, CheckCircle, Clock, XCircle, Play, Pause } from 'lucide-react';

type MocRequestInList = Doc<"mocRequests"> & {
  submitterName?: string;
  assignedToName?: string;
  departmentApprovals?: Array<{ departmentName?: string; status?: string; approverDisplayName?: string; [key: string]: any }>;
};

interface MocItemProps {
  moc: MocRequestInList;
  onSelectMoc: (mocId: Id<"mocRequests">) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'draft': return <Pause className="w-4 h-4" />;
    case 'pending_department_approval': return <Clock className="w-4 h-4" />;
    case 'pending_final_review': return <AlertCircle className="w-4 h-4" />;
    case 'approved': return <CheckCircle className="w-4 h-4" />;
    case 'rejected': return <XCircle className="w-4 h-4" />;
    case 'in_progress': return <Play className="w-4 h-4" />;
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <XCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'pending_department_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'pending_final_review': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'approved': return 'bg-green-100 text-green-800 border-green-300';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
    case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const formatStatusText = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const shouldShowRfcBadge = (status: string) => {
  return !['completed', 'cancelled'].includes(status);
};

export default function MocItem({ moc, onSelectMoc }: MocItemProps) {
  const statusColor = getStatusColor(moc.status);
  const statusIcon = getStatusIcon(moc.status);
  const showRfcBadge = shouldShowRfcBadge(moc.status);

  return (
    <li 
      className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
      onClick={() => onSelectMoc(moc._id)}
    >
      <div className="space-y-3">
        {/* Header with RFC ID and RFC Badge */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-primary truncate">
              {moc.mocIdString || `RFC-${moc._id.slice(-6)}`}
            </h3>
            {showRfcBadge && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                RFC
              </span>
            )}
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
            {statusIcon}
            {formatStatusText(moc.status)}
          </div>
        </div>

        {/* Title */}
        <h4 className="text-base font-medium text-secondary-dark line-clamp-2">
          {moc.title}
        </h4>

        {/* Description */}
        <p className="text-sm text-secondary-light line-clamp-3">
          {moc.description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 text-xs text-secondary-light">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Submitter: {moc.submitterName || 'Unknown'}</span>
          </div>
          
          {moc.assignedToName && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Assigned: {moc.assignedToName}</span>
            </div>
          )}

          {moc.dateRaised && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Raised: {formatTimestampToDate(moc.dateRaised)}</span>
            </div>
          )}

          {moc.departmentApprovals && moc.departmentApprovals.length > 0 && (
            <div className="flex items-center gap-1">
              <Building className="w-3 h-3" />
              <span>Departments: {moc.departmentApprovals.length}</span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
