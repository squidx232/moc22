import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id, Doc } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { formatDateToDDMMYY, formatTimestampToDateTime } from '../lib/utils';
import { Printer, History, Trash2 } from 'lucide-react';
import EditHistoryModal from './EditHistoryModal';

interface MocDetailsPageProps {
  mocId: Id<"mocRequests">;
  onEdit: (mocId: Id<"mocRequests">) => void;
  currentUser?: any;
}

type AttachmentWithUrl = Doc<"mocAttachments"> & { url?: string | null; uploadedByName?: string; size?: number };
type DepartmentApprovalWithName = NonNullable<Doc<"mocRequests">["departmentApprovals"]>[number] & { departmentName?: string; approverDisplayName?: string; approverEmail?: string; };


export default function MocDetailsPage({ mocId, onEdit, currentUser }: MocDetailsPageProps) {
  const mocDetails = useQuery(api.moc.getRequestDetails, 
    currentUser?._id ? { 
      id: mocId,
      requestingUserId: currentUser._id
    } : "skip"
  );
  const loggedInUser = useQuery(api.auth.loggedInUser);
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

  // Edit History Modal State
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);


  if (!mocDetails) {
    return <div className="text-center p-10">Loading RFC details or RFC not found...</div>;
  }
  
  const { 
    title, description, status, submitterName, assignedToName, reviewerName, _creationTime, submittedAt, reviewedAt, reviewComments,
    mocIdString, dateRaised, requestedByDepartmentName, reasonForChange, changeType, changeCategory, changeCategoryOther,
    departmentsAffectedNames, departmentApprovals, riskAssessmentRequired, impactAssessment, hseImpactAssessment, riskEvaluation,
    riskLevelPostMitigation, preChangeCondition, postChangeCondition, supportingDocumentsNotes, stakeholderReviewApprovalsText,
    trainingRequired, trainingDetails, startDateOfChange, expectedCompletionDate, deadline, implementationOwner,
    verificationOfCompletionText, postImplementationReviewText, closeoutApprovedByText, attachments,
    additionalApproverUserIds, viewerIds
  } = mocDetails;

  const userIsAdmin = currentUserProfile?.isAdmin === true;
  const userIsSubmitter = mocDetails.submitterId === currentUser?._id;
  const userIsAssigned = mocDetails.assignedToId === currentUser?._id;
  const userIsAdditionalApprover = additionalApproverUserIds?.includes(currentUser?._id as Id<"users">);
  const userCanEdit = userIsAdmin || (!!currentUserProfile?.canEditAnyMoc && userIsAdmin) || (userIsSubmitter && (status === "draft" || status === "rejected"));
  const userCanDelete = userIsAdmin || !!currentUserProfile?.canDeleteAnyMoc || (userIsSubmitter && (status === "draft" || status === "rejected" || status === "cancelled"));

  // Check if user can upload attachments - only submitters and when rejecting
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
      
      // Handle file upload if there's a file and we're rejecting
      if (fileToUpload && newStatus === "rejected") {
        await handleAddAttachment();
      }
      
      toast.success(`RFC status changed to ${newStatus.replace(/_/g, " ")}.`);
      setShowStatusModal(false);
      setStatusChangeComments("");
      setNewStatus("");
      setFileToUpload(null);
      // Clear file input
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
      
      // Handle file upload if there's a file and we're rejecting
      if (fileToUpload && departmentAction === "rejected") {
        await handleAddAttachment();
      }
      
      toast.success(`Department step ${departmentAction}.`);
      setShowDepartmentActionModal(false);
      setDepartmentAction(null);
      setDepartmentActionComments("");
      setDepartmentActionDeptId(null);
      setFileToUpload(null);
      // Clear file input
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
            // Navigate back to list - functionality to be implemented 
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


  const DetailItem: React.FC<{ label: string; value?: string | number | boolean | string[] | null; isDate?: boolean; isDateTime?: boolean; isBoolean?: boolean; fullWidth?: boolean; className?: string }> = 
    ({ label, value, isDate, isDateTime, isBoolean, fullWidth, className }) => {
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
        }
         else {
            displayValue = String(value);
        }
    }
    return (
      <div className={`py-2 ${fullWidth ? 'sm:col-span-2' : ''} ${className}`}>
        <dt className="text-sm font-medium text-secondary-light">{label}</dt>
        <dd className="mt-1 text-sm text-secondary-dark break-words whitespace-pre-wrap">{displayValue}</dd>
      </div>
    );
  };
  
  const renderStatusBadge = (s: string) => {
    const statusColors: Record<string, string> = {
        draft: "bg-gray-200 text-gray-700",
        pending_department_approval: "bg-yellow-200 text-yellow-800",
        pending_final_review: "bg-yellow-200 text-yellow-800",
        approved: "bg-green-200 text-green-800",
        rejected: "bg-red-200 text-red-800",
        in_progress: "bg-blue-200 text-blue-800",
        completed: "bg-purple-200 text-purple-800",
        cancelled: "bg-pink-200 text-pink-800",
    };
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[s] || 'bg-gray-300'}`}>{s.replace(/_/g, ' ')}</span>;
  };


  return (
    <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-primary truncate" title={title}>{title}</h1>
          <p className="text-sm text-secondary-light mt-1">RFC ID: {mocIdString || mocDetails._id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
            {renderStatusBadge(status)}
            <div className="flex gap-2 mt-2">
              {userCanEdit && (
                  <button onClick={() => onEdit(mocId)} className="btn btn-outline-primary btn-sm">
                      Edit RFC
                  </button>
              )}
              <button 
                onClick={() => setShowEditHistoryModal(true)} 
                className="btn btn-outline-secondary btn-sm flex items-center gap-1"
              >
                <History size={16} /> Edit History
              </button>
              <button onClick={handlePrint} className="btn btn-outline-secondary btn-sm flex items-center gap-1">
                <Printer size={16} /> Print RFC
              </button>
            </div>
        </div>
      </div>

      {/* Workflow Information */}
      {(status === "draft" || status === "rejected") && (userIsSubmitter || userIsAdmin) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">📋 RFC Workflow Actions:</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Submit for Department Approval:</strong> Use this for the initial submission or when creating a new RFC. This starts the formal approval process.</p>
            <p><strong>Resubmit RFC:</strong> Use this after an RFC has been rejected and you've made corrections. This resets all approvals and restarts the workflow.</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 no-print">
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
              className="btn btn-primary btn-sm"
              title={
                change.next === "pending_department_approval" 
                  ? "Submit this RFC for department approval. This is the initial submission that starts the approval workflow."
                  : `Change RFC status to ${change.next.replace(/_/g, ' ')}`
              }
            >
              {change.label}
            </button>
          );
        })}
        {(status === "rejected" || status === "draft") && (userIsSubmitter || userIsAdmin) && (
          <button 
            onClick={handleResubmit} 
            className="btn btn-success btn-sm"
            title="Resubmit this RFC after making corrections. This will reset all department approvals and move the RFC back to pending department approval status."
          >
            Resubmit RFC
          </button>
        )}
        {userCanDelete && (
            <button onClick={handleDeleteMoc} className="btn btn-danger btn-sm">
                Delete RFC
            </button>
        )}
      </div>

      {/* Department Approvals Section */}
      {status === "pending_department_approval" && departmentApprovals && departmentApprovals.length > 0 && (
        <div className="p-4 border rounded-md bg-yellow-50 border-yellow-300 no-print">
            <h3 className="text-md font-semibold text-yellow-800 mb-3">Pending Department Approvals:</h3>
            <ul className="space-y-3">
                {departmentApprovals.filter((da: DepartmentApprovalWithName) => da.status === "pending").map((da: DepartmentApprovalWithName) => (
                    <li key={da.departmentId} className="p-3 bg-white rounded shadow-sm border border-gray-200">
                        <p className="font-medium text-secondary-dark">{da.departmentName || "Unknown Department"}</p>
                        {(userIsAdmin || (currentUser?.email && da.approverEmail === currentUser.email)) && (
                             <div className="mt-2 flex gap-2">
                                <button onClick={() => handleOpenDepartmentActionModal(da.departmentId, 'approved')} className="btn btn-success btn-xs">Approve</button>
                                <button onClick={() => handleOpenDepartmentActionModal(da.departmentId, 'rejected')} className="btn btn-danger btn-xs">Reject</button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
      )}

      {/* Printable Content Area */}
      <div ref={printRef}>
        <div className="print-section">
          <h2>General Information</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <DetailItem label="Description" value={description} fullWidth className="print-full-width" />
            <DetailItem label="Reason for Change" value={reasonForChange} fullWidth className="print-full-width" />
            <DetailItem label="Submitter" value={submitterName} />
            <DetailItem label="Assigned To" value={assignedToName} />
            <DetailItem label="Created At" value={_creationTime} isDateTime />
            <DetailItem label="Date Raised" value={dateRaised} isDate />
            <DetailItem label="Requested By Department" value={requestedByDepartmentName} />
            <DetailItem label="Change Type" value={changeType} />
            <DetailItem label="Change Category" value={changeCategory} />
            {changeCategoryOther && <DetailItem label="Other Category" value={changeCategoryOther} />}
            <DetailItem label="Departments Affected" value={departmentsAffectedNames?.join(', ')} fullWidth className="print-full-width"/>
          </dl>
        </div>

        <div className="print-section">
          <h2>Risk & Impact Assessment</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <DetailItem label="Risk Assessment Required" value={riskAssessmentRequired} isBoolean />
            <DetailItem label="Impact Assessment" value={impactAssessment} fullWidth className="print-full-width" />
            <DetailItem label="HSE Impact Assessment" value={hseImpactAssessment} fullWidth className="print-full-width" />
            <DetailItem label="Risk Evaluation" value={riskEvaluation} fullWidth className="print-full-width" />
            <DetailItem label="Risk Level (Post-Mitigation)" value={riskLevelPostMitigation} />
            <DetailItem label="Pre-Change Condition" value={preChangeCondition} fullWidth className="print-full-width" />
            <DetailItem label="Post-Change Condition" value={postChangeCondition} fullWidth className="print-full-width" />
          </dl>
        </div>
        
        <div className="print-section">
          <h2>Implementation Details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <DetailItem label="Training Required" value={trainingRequired} isBoolean />
            {trainingRequired && <DetailItem label="Training Details" value={trainingDetails} fullWidth className="print-full-width" />}
            <DetailItem label="Start Date of Change" value={startDateOfChange} isDate />
            <DetailItem label="Expected Completion Date" value={expectedCompletionDate} isDate />
            <DetailItem label="Original Deadline" value={deadline} isDate />
            <DetailItem label="Implementation Owner" value={implementationOwner} />
          </dl>
        </div>

        <div className="print-section">
          <h2>Documentation & Review</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <DetailItem label="Supporting Documents Notes" value={supportingDocumentsNotes} fullWidth className="print-full-width" />
            <DetailItem label="Stakeholder Review & Approvals" value={stakeholderReviewApprovalsText} fullWidth className="print-full-width" />
            <DetailItem label="Verification of Completion" value={verificationOfCompletionText} fullWidth className="print-full-width" />
            <DetailItem label="Post-Implementation Review" value={postImplementationReviewText} fullWidth className="print-full-width" />
            <DetailItem label="Closeout Approved By" value={closeoutApprovedByText} fullWidth className="print-full-width" />
          </dl>
        </div>

        <div className="print-section">
          <h2>Review & Approval Information</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {submittedAt && <DetailItem label="Submitted At" value={submittedAt} isDateTime />}
            {reviewerName && <DetailItem label="Final Reviewer" value={reviewerName} />}
            {reviewedAt && <DetailItem label="Final Reviewed At" value={reviewedAt} isDateTime />}
            {reviewComments && <DetailItem label="Final Review Comments" value={reviewComments} fullWidth className="print-full-width" />}
          </dl>
        </div>
      
        {/* Department Approvals History for Print */}
        {departmentApprovals && departmentApprovals.length > 0 && (
          <div className="print-section">
              <h3 className="text-lg font-semibold text-secondary-dark mt-6 mb-3">Department Approval History</h3>
              <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-light uppercase tracking-wider">Department</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-light uppercase tracking-wider">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-light uppercase tracking-wider">Approver</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-light uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-light uppercase tracking-wider">Comments</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                          {departmentApprovals.map((da: DepartmentApprovalWithName) => (
                              <tr key={da.departmentId}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary-dark">{da.departmentName}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">{renderStatusBadge(da.status)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary-dark">{da.approverDisplayName || 'N/A'}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary-dark">{da.approvedAt ? formatDateToDDMMYY(da.approvedAt) : 'N/A'}</td>
                                  <td className="px-4 py-2 text-sm text-secondary-dark break-words min-w-[200px]">{da.comments || 'N/A'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
        )}

        {/* Attachments Section for Print */}
        <div className="print-section">
          <h3 className="text-lg font-semibold text-secondary-dark mt-6 mb-3">Attachments ({attachments?.length || 0})</h3>
          {attachments && attachments.length > 0 ? (
            <ul className="space-y-2 list-disc list-inside">
              {(attachments as AttachmentWithUrl[]).map((att) => (
                <li key={att._id} className="text-sm">
                    {att.fileName} ({att.fileType}, {att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'N/A'}), Uploaded by: {att.uploadedByName} on {formatDateToDDMMYY(att._creationTime)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-secondary-light">No attachments for this RFC.</p>
          )}
        </div>
      </div> {/* End of printRef div */}


      {/* File Upload Section (Non-Printable) - Only for submitters */}
      {userCanUploadAttachments && (
        <div className="no-print">
          <h3 className="text-lg font-semibold text-secondary-dark mt-6 mb-3">Attachments ({attachments?.length || 0})</h3>
          <div className="mb-4 p-3 border rounded-md bg-gray-50 flex flex-col sm:flex-row gap-3 items-center">
              <input type="file" id="file-upload-input" onChange={handleFileUpload} className="input-field sm:flex-grow" />
              <button onClick={handleAddAttachment} className="btn btn-secondary btn-sm w-full sm:w-auto" disabled={!fileToUpload || isUploading}>
                  {isUploading ? "Uploading..." : "Add Attachment"}
              </button>
          </div>
          {attachments && attachments.length > 0 ? (
            <ul className="space-y-2">
              {(attachments as AttachmentWithUrl[]).map((att) => (
                <li key={att._id} className="p-3 border rounded-md hover:bg-gray-50 transition-colors flex justify-between items-center">
                  <div>
                    <a href={att.url || '#'} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">
                      {att.fileName}
                    </a>
                    <p className="text-xs text-secondary-light">
                      Type: {att.fileType}, Size: {att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'N/A'}, Uploaded by: {att.uploadedByName} on {formatDateToDDMMYY(att._creationTime)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-secondary-light">No attachments for this RFC.</p>
          )}
        </div>
      )}

      {/* Attachments View Only Section (Non-Printable) - For non-submitters */}
      {!userCanUploadAttachments && (
        <div className="no-print">
          <h3 className="text-lg font-semibold text-secondary-dark mt-6 mb-3">Attachments ({attachments?.length || 0})</h3>
          {attachments && attachments.length > 0 ? (
            <ul className="space-y-2">
              {(attachments as AttachmentWithUrl[]).map((att) => (
                <li key={att._id} className="p-3 border rounded-md hover:bg-gray-50 transition-colors flex justify-between items-center">
                  <div>
                    <a href={att.url || '#'} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">
                      {att.fileName}
                    </a>
                    <p className="text-xs text-secondary-light">
                      Type: {att.fileType}, Size: {att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'N/A'}, Uploaded by: {att.uploadedByName} on {formatDateToDDMMYY(att._creationTime)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-secondary-light">No attachments for this RFC.</p>
          )}
        </div>
      )}


      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Change RFC Status to "{newStatus.replace(/_/g, " ")}"</h3>
            <textarea
              value={statusChangeComments}
              onChange={(e) => setStatusChangeComments(e.target.value)}
              placeholder="Add comments (optional for some statuses, required for rejection)"
              className="input-field w-full mb-4"
              rows={3}
            />
            {/* File upload for rejection */}
            {newStatus === "rejected" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach supporting documents (optional)
                </label>
                <input 
                  type="file" 
                  id="status-file-upload-input"
                  onChange={handleFileUpload} 
                  className="input-field w-full"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStatusModal(false)} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={handleStatusChange} className="btn btn-primary">Confirm Change</button>
            </div>
          </div>
        </div>
      )}

      {/* Department Action Modal */}
      {showDepartmentActionModal && departmentActionDeptId && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">
                    {departmentAction === "approved" ? "Approve" : "Reject"} Department Step: {departmentApprovals?.find((da: any) => da.departmentId === departmentActionDeptId)?.departmentName}
                </h3>
                <textarea
                value={departmentActionComments}
                onChange={(e) => setDepartmentActionComments(e.target.value)}
                placeholder={`Comments for ${departmentAction} (optional for approval, recommended for rejection)`}
                className="input-field w-full mb-4"
                rows={3}
                />
                {/* File upload for rejection only */}
                {departmentAction === "rejected" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attach supporting documents (optional)
                    </label>
                    <input 
                      type="file" 
                      id="dept-file-upload-input"
                      onChange={handleFileUpload} 
                      className="input-field w-full"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                <button onClick={() => setShowDepartmentActionModal(false)} className="btn btn-outline-secondary">Cancel</button>
                <button onClick={handleDepartmentAction} className={`btn ${departmentAction === "approved" ? "btn-success" : "btn-danger"}`}>
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
      />
    </div>
  );
}
