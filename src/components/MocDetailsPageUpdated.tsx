import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id, Doc } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { formatDateToDDMMYY, formatTimestampToDateTime } from '../lib/utils';
import { 
  Printer, 
  History, 
  Trash2, 
  FileText, 
  Calendar, 
  User, 
  Building, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  Shield,
  Users,
  Settings,
  Eye,
  Edit3,
  ArrowLeft
} from 'lucide-react';
import EditHistoryModal from './EditHistoryModal';

interface MocDetailsPageUpdatedProps {
  mocId: Id<"mocRequests">;
  onBack: () => void;
  onEdit?: (mocId: Id<"mocRequests">) => void;
  currentUser?: any;
}

type AttachmentWithUrl = Doc<"mocAttachments"> & { url?: string | null; uploadedByName?: string; size?: number };
type DepartmentApprovalWithName = NonNullable<Doc<"mocRequests">["departmentApprovals"]>[number] & { departmentName?: string; approverDisplayName?: string; approverEmail?: string; };

export default function MocDetailsPageUpdated({ mocId, onBack, onEdit, currentUser }: MocDetailsPageUpdatedProps) {
  const mocDetails = useQuery(api.moc.getRequestDetails, 
    currentUser?._id ? { 
      id: mocId,
      requestingUserId: currentUser._id
    } : "skip"
  );
  const currentUserProfile = useQuery(
    api.users.getCurrentUserById,
    currentUser ? { userId: currentUser._id || currentUser.userId } : "skip"
  );

  const changeStatusMutation = useMutation(api.moc.changeStatus);
  const resubmitMocMutation = useMutation(api.moc.resubmitMocRequest);
  const approveOrRejectDepartmentStepMutation = useMutation(api.moc.approveOrRejectDepartmentStep);
  const deleteMocMutation = useMutation(api.moc.deleteMocRequest);
  const generateUploadUrl = useMutation(api.moc.generateUploadUrl);
  const addAttachmentMutation = useMutation(api.moc.addAttachment);
  const deleteAttachmentMutation = useMutation(api.attachments.deleteAttachment);

  const printRef = useRef<HTMLDivElement>(null);

  const [newStatus, setNewStatus] = useState<string>("");
  const [statusChangeComments, setStatusChangeComments] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [departmentAction, setDepartmentAction] = useState<'approved' | 'rejected' | null>(null);
  const [departmentActionComments, setDepartmentActionComments] = useState("");
  const [departmentActionDeptId, setDepartmentActionDeptId] = useState<Id<"departments"> | null>(null);
  const [showDepartmentActionModal, setShowDepartmentActionModal] = useState(false);
  
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);

  if (!mocDetails) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RFC details...</p>
        </div>
      </div>
    );
  }
  
  const { 
    title, description, status, submitterName, assignedToName, reviewerName, _creationTime, submittedAt, reviewedAt, reviewComments,
    mocIdString, dateRaised, requestedByDepartmentName, reasonForChange, changeType, changeCategory, changeCategoryOther,
    departmentsAffectedNames, departmentApprovals, riskAssessmentRequired, impactAssessment, hseImpactAssessment, riskEvaluation,
    riskLevelPostMitigation, preChangeCondition, postChangeCondition, supportingDocumentsNotes, stakeholderReviewApprovalsText,
    trainingRequired, trainingDetails, startDateOfChange, expectedCompletionDate, deadline, implementationOwner,
    verificationOfCompletionText, postImplementationReviewText, closeoutApprovedByText, attachments,
    additionalApproverUserIds, viewerIds, technicalAuthorityName
  } = mocDetails;

  const userIsAdmin = currentUserProfile?.isAdmin === true;
  const userIsSubmitter = mocDetails.submitterId === currentUser?._id;
  const userIsAssigned = mocDetails.assignedToId === currentUser?._id;
  const userIsAdditionalApprover = additionalApproverUserIds?.includes(currentUser?._id as Id<"users">);
  const userCanEdit = userIsAdmin || (!!currentUserProfile?.canEditAnyMoc && userIsAdmin) || (userIsSubmitter && (status === "draft" || status === "rejected"));
  const userCanDelete = userIsAdmin || !!currentUserProfile?.canDeleteAnyMoc || (userIsSubmitter && (status === "draft" || status === "rejected" || status === "cancelled"));
  const userCanUploadAttachments = userIsAdmin || userIsSubmitter;

  const handleDeleteAttachment = async (attachmentId: Id<"mocAttachments">, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      try {
        await deleteAttachmentMutation({ attachmentId });
        toast.success(`Attachment "${fileName}" deleted successfully.`);
      } catch (error) {
        toast.error(`Failed to delete attachment: ${(error as Error).message}`);
      }
    }
  };

  const availableStatusChanges: Record<string, { next: string; label: string; adminOnly?: boolean; submitterOnly?: boolean, assignedOnly?: boolean, additionalApproverOnly?: boolean }[]> = {
    draft: [{ next: "pending_department_approval", label: "Submit for Department Approval" }],
    pending_department_approval: [
        { next: "cancelled", label: "Cancel RFC", submitterOnly: true },
        { next: "rejected", label: "Reject (Admin Override)", adminOnly: true}
    ],
    pending_final_review: [
      { next: "approved", label: "Approve" },
      { next: "rejected", label: "Reject" },
      { next: "cancelled", label: "Cancel RFC", submitterOnly: true },
    ],
    approved: [
      { next: "in_progress", label: "Start Progress" },
      { next: "cancelled", label: "Cancel RFC", submitterOnly: true },
    ],
    rejected: [
      { next: "cancelled", label: "Cancel RFC", submitterOnly: true },
    ],
    in_progress: [
      { next: "completed", label: "Mark as Completed" },
      { next: "cancelled", label: "Cancel RFC (Admin Only)", adminOnly: true },
    ],
    completed: [
        { next: "cancelled", label: "Cancel RFC (Admin Only)", adminOnly: true }, 
    ],
    cancelled: [],
  };

  const handleOpenStatusModal = (nextStatus: string) => {
    setNewStatus(nextStatus);
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    try {
      await changeStatusMutation({ 
        id: mocId, 
        newStatus: newStatus as any, 
        comments: statusChangeComments,
        requestingUserId: currentUser._id
      });
      
      if (fileToUpload && newStatus === "rejected") {
        await handleAddAttachment();
      }
      
      toast.success(`RFC status changed to ${newStatus.replace(/_/g, " ")}.`);
      setShowStatusModal(false);
      setStatusChangeComments("");
      setNewStatus("");
      setFileToUpload(null);
      const fileInput = document.getElementById('status-file-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      toast.error(`Failed to change status: ${(error as Error).message}`);
    }
  };
  
  const handleResubmit = async () => {
    try {
      await resubmitMocMutation({ mocId, requestingUserId: currentUser._id });
      toast.success("RFC resubmitted successfully!");
    } catch (error) {
      toast.error(`Failed to resubmit RFC: ${(error as Error).message}`);
    }
  };

  const handleOpenDepartmentActionModal = (deptId: Id<"departments">, action: 'approved' | 'rejected') => {
    setDepartmentActionDeptId(deptId);
    setDepartmentAction(action);
    setShowDepartmentActionModal(true);
  };

  const handleDepartmentAction = async () => {
    if (!departmentActionDeptId || !departmentAction) return;
    try {
      await approveOrRejectDepartmentStepMutation({
        mocId,
        departmentId: departmentActionDeptId,
        decision: departmentAction,
        comments: departmentActionComments,
        requestingUserId: currentUser._id,
      });
      
      if (fileToUpload && departmentAction === "rejected") {
        await handleAddAttachment();
      }
      
      toast.success(`Department step ${departmentAction}.`);
      setShowDepartmentActionModal(false);
      setDepartmentAction(null);
      setDepartmentActionComments("");
      setDepartmentActionDeptId(null);
      setFileToUpload(null);
      const fileInput = document.getElementById('dept-file-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      toast.error(`Failed to action department step: ${(error as Error).message}`);
    }
  };

  const handleDeleteMoc = async () => {
    if (window.confirm("Are you sure you want to delete this RFC request and all its attachments? This action cannot be undone.")) {
        try {
            await deleteMocMutation({ mocId, requestingUserId: currentUser._id });
            toast.success("RFC request deleted successfully.");
            onBack();
        } catch (error) {
            toast.error(`Failed to delete RFC: ${(error as Error).message}`);
        }
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
        setFileToUpload(event.target.files[0]);
    }
  };

  const handleAddAttachment = async () => {
    if (!fileToUpload) {
        toast.error("Please select a file to upload.");
        return;
    }
    setIsUploading(true);
    try {
        const uploadUrl = await generateUploadUrl({ requestingUserId: currentUser._id });
        const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": fileToUpload.type },
            body: fileToUpload,
        });
        const jsonResult = await result.json();
        if (!result.ok || !jsonResult.storageId) {
          throw new Error(`Upload failed: ${JSON.stringify(jsonResult)}`);
        }
        const { storageId } = jsonResult;

        await addAttachmentMutation({
            mocRequestId: mocId,
            storageId,
            fileName: fileToUpload.name,
            fileType: fileToUpload.type,
            requestingUserId: currentUser._id,
        });
        toast.success(`Attachment "${fileToUpload.name}" added successfully.`);
        setFileToUpload(null);
        const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = "";

    } catch (error) {
        toast.error(`Failed to add attachment: ${(error as Error).message}`);
    } finally {
        setIsUploading(false);
    }
  };

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`
        <html>
          <head>
            <title>RFC Details - ${title}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
              .print-section { margin-bottom: 25px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa; }
              .print-section h2 { font-size: 1.3em; color: #2c3e50; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3498db; font-weight: 600; }
              .print-section dt { font-weight: 600; color: #34495e; margin-top: 10px; font-size: 0.95em; }
              .print-section dd { margin-left: 0; margin-bottom: 8px; color: #2c3e50; background: white; padding: 8px; border-radius: 4px; border-left: 3px solid #3498db; }
              .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .print-full-width { grid-column: span 2; }
              .no-print { display: none !important; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9em;}
              th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600; }
              .header-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
              .header-section h1 { margin: 0; font-size: 2em; font-weight: 600; }
              .header-section .rfc-id { font-size: 1.1em; opacity: 0.9; margin-top: 5px; }
              .header-section .status-badge { display: inline-block; padding: 8px 16px; background: rgba(255,255,255,0.2); border-radius: 20px; margin-top: 10px; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="header-section">
              <h1>RFC Details: ${title}</h1>
              <div class="rfc-id">RFC ID: ${mocIdString || mocDetails._id.slice(-6).toUpperCase()}</div>
              <div class="status-badge">Status: ${status.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
            ${printContents}
          </body>
        </html>
      `);
      printWindow?.document.close();
      printWindow?.focus();
      setTimeout(() => {
        printWindow?.print();
        printWindow?.close();
      }, 500);
    }
  };

  const DetailItem: React.FC<{ 
    label: string; 
    value?: string | number | boolean | string[] | null; 
    isDate?: boolean; 
    isDateTime?: boolean; 
    isBoolean?: boolean; 
    fullWidth?: boolean; 
    className?: string;
    icon?: React.ReactNode;
  }> = ({ label, value, isDate, isDateTime, isBoolean, fullWidth, className, icon }) => {
    let displayValue: React.ReactNode = "N/A";
    if (value !== undefined && value !== null && value !== "") {
        if (isBoolean) {
            displayValue = value ? "Yes" : "No";
        } else if (isDate && typeof value === 'number') {
            displayValue = formatDateToDDMMYY(value);
        } else if (isDateTime && typeof value === 'number') {
            displayValue = formatTimestampToDateTime(value);
        } else if (Array.isArray(value)) {
            displayValue = value.join(', ');
        } else {
            displayValue = String(value);
        }
    }
    
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow ${fullWidth ? 'col-span-full' : ''} ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-blue-600">{icon}</span>}
          <dt className="text-sm font-semibold text-gray-700">{label}</dt>
        </div>
        <dd className="text-sm text-gray-900 break-words whitespace-pre-wrap leading-relaxed">
          {displayValue}
        </dd>
      </div>
    );
  };
  
  const renderStatusBadge = (s: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        draft: { bg: "bg-gray-100", text: "text-gray-700", icon: <Edit3 size={14} /> },
        pending_department_approval: { bg: "bg-yellow-100", text: "text-yellow-800", icon: <Clock size={14} /> },
        pending_final_review: { bg: "bg-blue-100", text: "text-blue-800", icon: <Eye size={14} /> },
        approved: { bg: "bg-green-100", text: "text-green-800", icon: <CheckCircle size={14} /> },
        rejected: { bg: "bg-red-100", text: "text-red-800", icon: <AlertTriangle size={14} /> },
        in_progress: { bg: "bg-indigo-100", text: "text-indigo-800", icon: <Settings size={14} /> },
        completed: { bg: "bg-purple-100", text: "text-purple-800", icon: <Target size={14} /> },
        cancelled: { bg: "bg-pink-100", text: "text-pink-800", icon: <AlertTriangle size={14} /> },
    };
    
    const config = statusConfig[s] || { bg: "bg-gray-100", text: "text-gray-700", icon: null };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.icon}
        {s.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; description?: string }> = ({ title, icon, description }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
        <span className="text-blue-600">{icon}</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to List</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 truncate max-w-2xl" title={title}>
                  {title}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  RFC ID: {mocIdString || mocDetails._id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {renderStatusBadge(status)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {availableStatusChanges[status]?.map(change => {
              if (change.adminOnly && !userIsAdmin) return null;
              if (change.submitterOnly && !userIsSubmitter && !userIsAdmin) return null; 
              if (change.assignedOnly && !userIsAssigned && !userIsAdmin) return null;
              if (change.additionalApproverOnly && !userIsAdditionalApprover && !userIsAdmin) return null;
              
              if (status === "pending_final_review" && (change.next === "approved" || change.next === "rejected")) {
                if (!userIsAdmin && !userIsAdditionalApprover) return null;
              }

              return (
                <button 
                  key={change.next} 
                  onClick={() => handleOpenStatusModal(change.next)} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  {change.label}
                </button>
              );
            })}
            
            {(status === "rejected" || status === "draft") && (userIsSubmitter || userIsAdmin) && (
              <button 
                onClick={handleResubmit} 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                Resubmit RFC
              </button>
            )}
            
            {userCanEdit && (
              <button 
                onClick={() => onEdit?.(mocId)} 
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <Edit3 size={16} />
                Edit RFC
              </button>
            )}
            
            <button 
              onClick={() => setShowEditHistoryModal(true)} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <History size={16} />
              Edit History
            </button>
            
            <button 
              onClick={handlePrint} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <Printer size={16} />
              Print RFC
            </button>
            
            {userCanDelete && (
              <button 
                onClick={handleDeleteMoc} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete RFC
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Department Approvals Alert */}
      {status === "pending_department_approval" && departmentApprovals && departmentApprovals.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 no-print">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="text-yellow-600" size={20} />
              <h3 className="font-semibold text-yellow-800">Pending Department Approvals</h3>
            </div>
            <div className="space-y-3">
              {departmentApprovals.filter((da: DepartmentApprovalWithName) => da.status === "pending").map((da: DepartmentApprovalWithName) => (
                <div key={da.departmentId} className="bg-white rounded-lg p-3 border border-yellow-200">
                  <p className="font-medium text-gray-900">{da.departmentName || "Unknown Department"}</p>
                  {(userIsAdmin || (currentUser?.email && da.approverEmail === currentUser.email)) && (
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => handleOpenDepartmentActionModal(da.departmentId, 'approved')} 
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleOpenDepartmentActionModal(da.departmentId, 'rejected')} 
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div ref={printRef} className="space-y-8">
          {/* Basic Information */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SectionHeader 
              title="Basic Information" 
              icon={<FileText size={20} />}
              description="Core details and overview of the RFC"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailItem 
                label="Description" 
                value={description} 
                fullWidth 
                icon={<FileText size={16} />}
              />
              <DetailItem 
                label="Reason for Change" 
                value={reasonForChange} 
                fullWidth 
                icon={<AlertTriangle size={16} />}
              />
              <DetailItem 
                label="Submitter" 
                value={submitterName} 
                icon={<User size={16} />}
              />
              <DetailItem 
                label="Assigned To" 
                value={assignedToName} 
                icon={<User size={16} />}
              />
              <DetailItem 
                label="Technical Authority" 
                value={technicalAuthorityName || "Auto-approve after departments"} 
                icon={<Shield size={16} />}
              />
              <DetailItem 
                label="Created At" 
                value={_creationTime} 
                isDateTime 
                icon={<Calendar size={16} />}
              />
              <DetailItem 
                label="Date Raised" 
                value={dateRaised} 
                isDate 
                icon={<Calendar size={16} />}
              />
              <DetailItem 
                label="Requesting Department" 
                value={requestedByDepartmentName} 
                icon={<Building size={16} />}
              />
              <DetailItem 
                label="Change Type" 
                value={changeType} 
                icon={<Settings size={16} />}
              />
              <DetailItem 
                label="Change Category" 
                value={changeCategory} 
                icon={<Settings size={16} />}
              />
              {changeCategoryOther && (
                <DetailItem 
                  label="Other Category" 
                  value={changeCategoryOther} 
                  icon={<Settings size={16} />}
                />
              )}
              <DetailItem 
                label="Departments Affected" 
                value={departmentsAffectedNames?.join(', ')} 
                fullWidth 
                icon={<Users size={16} />}
              />
            </div>
          </section>

          {/* Risk & Impact Assessment */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SectionHeader 
              title="Risk & Impact Assessment" 
              icon={<Shield size={20} />}
              description="Risk evaluation and impact analysis"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailItem 
                label="Risk Assessment Required" 
                value={riskAssessmentRequired} 
                isBoolean 
                icon={<AlertTriangle size={16} />}
              />
              <DetailItem 
                label="Impact Assessment" 
                value={impactAssessment} 
                fullWidth 
                icon={<Target size={16} />}
              />
              <DetailItem 
                label="HSE Impact Assessment" 
                value={hseImpactAssessment} 
                fullWidth 
                icon={<Shield size={16} />}
              />
              <DetailItem 
                label="Risk Evaluation" 
                value={riskEvaluation} 
                fullWidth 
                icon={<AlertTriangle size={16} />}
              />
              <DetailItem 
                label="Risk Level (Post-Mitigation)" 
                value={riskLevelPostMitigation} 
                icon={<Shield size={16} />}
              />
              <DetailItem 
                label="Pre-Change Condition" 
                value={preChangeCondition} 
                fullWidth 
                icon={<Settings size={16} />}
              />
              <DetailItem 
                label="Post-Change Condition" 
                value={postChangeCondition} 
                fullWidth 
                icon={<CheckCircle size={16} />}
              />
            </div>
          </section>
          
          {/* Implementation Details */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SectionHeader 
              title="Implementation Details" 
              icon={<Settings size={20} />}
              description="Timeline, ownership, and execution plan"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailItem 
                label="Training Required" 
                value={trainingRequired} 
                isBoolean 
                icon={<Users size={16} />}
              />
              {trainingRequired && (
                <DetailItem 
                  label="Training Details" 
                  value={trainingDetails} 
                  fullWidth 
                  icon={<Users size={16} />}
                />
              )}
              <DetailItem 
                label="Start Date of Change" 
                value={startDateOfChange} 
                isDate 
                icon={<Calendar size={16} />}
              />
              <DetailItem 
                label="Expected Completion Date" 
                value={expectedCompletionDate} 
                isDate 
                icon={<Calendar size={16} />}
              />
              <DetailItem 
                label="Original Deadline" 
                value={deadline} 
                isDate 
                icon={<Clock size={16} />}
              />
              <DetailItem 
                label="Implementation Owner" 
                value={implementationOwner} 
                icon={<User size={16} />}
              />
            </div>
          </section>

          {/* Documentation & Review */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SectionHeader 
              title="Documentation & Review" 
              icon={<FileText size={20} />}
              description="Supporting documentation and review processes"
            />
            <div className="grid grid-cols-1 gap-4">
              <DetailItem 
                label="Supporting Documents Notes" 
                value={supportingDocumentsNotes} 
                fullWidth 
                icon={<FileText size={16} />}
              />
              <DetailItem 
                label="Stakeholder Review & Approvals" 
                value={stakeholderReviewApprovalsText} 
                fullWidth 
                icon={<Users size={16} />}
              />
              <DetailItem 
                label="Verification of Completion" 
                value={verificationOfCompletionText} 
                fullWidth 
                icon={<CheckCircle size={16} />}
              />
              <DetailItem 
                label="Post-Implementation Review" 
                value={postImplementationReviewText} 
                fullWidth 
                icon={<Eye size={16} />}
              />
              <DetailItem 
                label="Closeout Approved By" 
                value={closeoutApprovedByText} 
                fullWidth 
                icon={<User size={16} />}
              />
            </div>
          </section>

          {/* Review & Approval Information */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SectionHeader 
              title="Review & Approval Information" 
              icon={<CheckCircle size={20} />}
              description="Approval workflow and review history"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submittedAt && (
                <DetailItem 
                  label="Submitted At" 
                  value={submittedAt} 
                  isDateTime 
                  icon={<Calendar size={16} />}
                />
              )}
              {reviewerName && (
                <DetailItem 
                  label="Final Reviewer" 
                  value={reviewerName} 
                  icon={<User size={16} />}
                />
              )}
              {reviewedAt && (
                <DetailItem 
                  label="Final Reviewed At" 
                  value={reviewedAt} 
                  isDateTime 
                  icon={<Calendar size={16} />}
                />
              )}
              {reviewComments && (
                <DetailItem 
                  label="Final Review Comments" 
                  value={reviewComments} 
                  fullWidth 
                  icon={<FileText size={16} />}
                />
              )}
            </div>
          </section>
      
          {/* Department Approvals History */}
          {departmentApprovals && departmentApprovals.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <SectionHeader 
                title="Department Approval History" 
                icon={<Users size={20} />}
                description="Approval status by department"
              />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {departmentApprovals.map((da: DepartmentApprovalWithName) => (
                      <tr key={da.departmentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {da.departmentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {renderStatusBadge(da.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {da.approverDisplayName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {da.approvedAt ? formatDateToDDMMYY(da.approvedAt) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs break-words">
                          {da.comments || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Attachments Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SectionHeader 
              title={`Attachments (${attachments?.length || 0})`}
              icon={<FileText size={20} />}
              description="Supporting documents and files"
            />
            
            {userCanUploadAttachments && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 no-print">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input 
                    type="file" 
                    id="file-upload-input" 
                    onChange={handleFileUpload} 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button 
                    onClick={handleAddAttachment} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={!fileToUpload || isUploading}
                  >
                    {isUploading ? "Uploading..." : "Add Attachment"}
                  </button>
                </div>
              </div>
            )}
            
            {attachments && attachments.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {(attachments as AttachmentWithUrl[]).map((att) => (
                  <div key={att._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText size={20} className="text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <a 
                          href={att.url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800 font-medium truncate block"
                        >
                          {att.fileName}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          {att.fileType} • {att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'N/A'} • 
                          Uploaded by {att.uploadedByName} on {formatDateToDDMMYY(att._creationTime)}
                        </p>
                      </div>
                    </div>
                    {(userCanUploadAttachments || att.uploadedById === currentUser?._id) && (
                      <button
                        onClick={() => handleDeleteAttachment(att._id, att.fileName)}
                        className="ml-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title={att.uploadedById === currentUser?._id ? "Delete your attachment" : "Delete attachment (MOC Owner)"}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No attachments for this RFC.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Change RFC Status to "{newStatus.replace(/_/g, " ")}"
            </h3>
            <textarea
              value={statusChangeComments}
              onChange={(e) => setStatusChangeComments(e.target.value)}
              placeholder="Add comments (optional for some statuses, required for rejection)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              rows={3}
            />
            {newStatus === "rejected" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach supporting documents (optional)
                </label>
                <input 
                  type="file" 
                  id="status-file-upload-input"
                  onChange={handleFileUpload} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowStatusModal(false)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleStatusChange} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Action Modal */}
      {showDepartmentActionModal && departmentActionDeptId && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">
                    {departmentAction === "approved" ? "Approve" : "Reject"} Department Step: {departmentApprovals?.find((da: any) => da.departmentId === departmentActionDeptId)?.departmentName}
                </h3>
                <textarea
                value={departmentActionComments}
                onChange={(e) => setDepartmentActionComments(e.target.value)}
                placeholder={`Comments for ${departmentAction} (optional for approval, recommended for rejection)`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                rows={3}
                />
                {departmentAction === "rejected" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attach supporting documents (optional)
                    </label>
                    <input 
                      type="file" 
                      id="dept-file-upload-input"
                      onChange={handleFileUpload} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowDepartmentActionModal(false)} 
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDepartmentAction} 
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    departmentAction === "approved" 
                      ? "bg-green-600 text-white hover:bg-green-700" 
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                    Confirm {departmentAction === "approved" ? "Approval" : "Rejection"}
                </button>
                </div>
            </div>
        </div>
      )}

      {/* Edit History Modal */}
      <EditHistoryModal 
        mocRequestId={mocId}
        isOpen={showEditHistoryModal}
        onClose={() => setShowEditHistoryModal(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
