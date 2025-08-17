import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { X, FileText, Edit3, Clock } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';
import { formatTimestampToDateTime } from '../lib/utils';

interface EditHistoryModalProps {
  mocRequestId: Id<"mocRequests">;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export default function EditHistoryModal({ mocRequestId, isOpen, onClose, currentUser }: EditHistoryModalProps) {
  const editHistory = useQuery(
    api.moc.getEditLogsSummary,
    currentUser?._id ? { mocRequestId, requestingUserId: currentUser._id } : "skip"
  );

  if (!isOpen) return null;

  // Debug logging
  console.log("Edit history data:", editHistory);

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderFieldChange = (change: any, index: number) => (
    <div key={index} className="bg-white rounded p-3 border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-800">{change.field}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          change.changeType === 'added' ? 'bg-green-100 text-green-700' :
          change.changeType === 'removed' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {change.changeType === 'added' ? 'Added' : 
           change.changeType === 'removed' ? 'Removed' : 'Changed'}
        </span>
      </div>
      {change.changeType === 'added' && (
        <div className="text-sm text-gray-700 bg-green-50 p-2 rounded border-l-3 border-green-400">
          <span className="text-green-700 font-medium">Added:</span>
          <div className="mt-1 break-words">{truncateText(change.newValue)}</div>
        </div>
      )}
      {change.changeType === 'removed' && (
        <div className="text-sm text-gray-700 bg-red-50 p-2 rounded border-l-3 border-red-400">
          <span className="text-red-700 font-medium">Removed:</span>
          <div className="mt-1 break-words">{truncateText(change.oldValue)}</div>
        </div>
      )}
      {change.changeType === 'changed' && (
        <div className="space-y-2">
          <div className="text-sm text-gray-700 bg-red-50 p-2 rounded border-l-3 border-red-400">
            <span className="text-red-700 font-medium">Previous:</span>
            <div className="mt-1 break-words">{truncateText(change.oldValue) || 'Empty'}</div>
          </div>
          <div className="text-sm text-gray-700 bg-green-50 p-2 rounded border-l-3 border-green-400">
            <span className="text-green-700 font-medium">Updated to:</span>
            <div className="mt-1 break-words">{truncateText(change.newValue) || 'Empty'}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Edit3 size={20} />
            Edit History
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {editHistory && editHistory.length > 0 ? (
            <div className="space-y-4">
              {editHistory.map((edit: any) => (
                <div key={edit._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900">{edit.editedByName}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        {edit.fieldChanges?.length > 0 ? 
                          `Modified ${edit.fieldChanges.length} field${edit.fieldChanges.length > 1 ? 's' : ''}` :
                          'General update'
                        }
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{formatTimestampToDateTime(edit.editedAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{edit.changesDescription}</p>
                  
                  {edit.fieldChanges && edit.fieldChanges.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Detailed Changes:
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {edit.fieldChanges.map((change: any, index: number) => renderFieldChange(change, index))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No edit history available for this RFC.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
