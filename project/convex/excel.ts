"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";
import * as XLSX from 'xlsx';

export const exportMocsToExcel = action({
  args: {},
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new ConvexError("Not authenticated.");

    // All authenticated users can export RFCs
    // No permission check needed - any logged-in user can export

    // Fetch all RFC requests with detailed information
    const mocRequests = await ctx.runQuery(api.mocExport.getAllMocRequestsForExport, {
      requestingUserId: authUserId
    });

    // Prepare data for Excel export
    const excelData = mocRequests.map((moc: any, index: number) => ({
      'Row #': index + 1,
      'RFC ID': moc.mocIdString || 'N/A',
      'Title': moc.title || '',
      'Description': moc.description || '',
      'Status': moc.status || '',
      'Submitter': moc.submitterName || 'Unknown',
      'Assigned To': moc.assignedToName || 'N/A',
      'Requested By Department': moc.requestedByDepartmentName || 'N/A',
      'Date Raised': moc.dateRaised ? new Date(moc.dateRaised).toLocaleDateString() : 'N/A',
      'Date Submitted': moc.submittedAt ? new Date(moc.submittedAt).toLocaleDateString() : 'N/A',
      'Date Reviewed': moc.reviewedAt ? new Date(moc.reviewedAt).toLocaleDateString() : 'N/A',
      'Reviewer': moc.reviewerName || 'N/A',
      'Review Comments': moc.reviewComments || '',
      'Reason for Change': moc.reasonForChange || '',
      'Change Type': moc.changeType || '',
      'Change Category': moc.changeCategory || '',
      'Change Category Other': moc.changeCategoryOther || '',
      'Departments Affected': moc.departmentsAffectedNames?.join(', ') || '',
      'Risk Assessment Required': moc.riskAssessmentRequired ? 'Yes' : 'No',
      'Impact Assessment': moc.impactAssessment || '',
      'HSE Impact Assessment': moc.hseImpactAssessment || '',
      'Risk Evaluation': moc.riskEvaluation || '',
      'Risk Level (Post-Mitigation)': moc.riskLevelPostMitigation || '',
      'Pre-Change Condition': moc.preChangeCondition || '',
      'Post-Change Condition': moc.postChangeCondition || '',
      'Supporting Documents Notes': moc.supportingDocumentsNotes || '',
      'Stakeholder Review & Approvals': moc.stakeholderReviewApprovalsText || '',
      'Training Required': moc.trainingRequired ? 'Yes' : 'No',
      'Training Details': moc.trainingDetails || '',
      'Start Date of Change': moc.startDateOfChange ? new Date(moc.startDateOfChange).toLocaleDateString() : '',
      'Expected Completion Date': moc.expectedCompletionDate ? new Date(moc.expectedCompletionDate).toLocaleDateString() : '',
      'Original Deadline': moc.deadline ? new Date(moc.deadline).toLocaleDateString() : '',
      'Implementation Owner': moc.implementationOwner || '',
      'Verification of Completion': moc.verificationOfCompletionText || '',
      'Post-Implementation Review': moc.postImplementationReviewText || '',
      'Closeout Approved By': moc.closeoutApprovedByText || '',
      'Department Approvals Status': moc.departmentApprovals?.map((da: any) => 
        `${da.departmentName}: ${da.status} (${da.approverDisplayName})`
      ).join('; ') || '',
      'Technical Authority Approvals': moc.additionalApproverNames?.join(', ') || '',
      'Viewers': moc.viewerNames?.join(', ') || '',
      'Attachments Count': moc.attachmentsCount || 0,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 8 },   // Row #
      { wch: 15 },  // RFC ID
      { wch: 30 },  // Title
      { wch: 40 },  // Description
      { wch: 20 },  // Status
      { wch: 20 },  // Submitter
      { wch: 20 },  // Assigned To
      { wch: 25 },  // Requested By Department
      { wch: 15 },  // Date Raised
      { wch: 15 },  // Date Submitted
      { wch: 15 },  // Date Reviewed
      { wch: 20 },  // Reviewer
      { wch: 30 },  // Review Comments
      { wch: 30 },  // Reason for Change
      { wch: 15 },  // Change Type
      { wch: 20 },  // Change Category
      { wch: 20 },  // Change Category Other
      { wch: 30 },  // Departments Affected
      { wch: 20 },  // Risk Assessment Required
      { wch: 30 },  // Impact Assessment
      { wch: 30 },  // HSE Impact Assessment
      { wch: 30 },  // Risk Evaluation
      { wch: 20 },  // Risk Level
      { wch: 30 },  // Pre-Change Condition
      { wch: 30 },  // Post-Change Condition
      { wch: 30 },  // Supporting Documents Notes
      { wch: 30 },  // Stakeholder Review
      { wch: 15 },  // Training Required
      { wch: 30 },  // Training Details
      { wch: 18 },  // Start Date
      { wch: 18 },  // Expected Completion
      { wch: 18 },  // Original Deadline
      { wch: 25 },  // Implementation Owner
      { wch: 30 },  // Verification of Completion
      { wch: 30 },  // Post-Implementation Review
      { wch: 25 },  // Closeout Approved By
      { wch: 40 },  // Department Approvals Status
      { wch: 15 },  // Technical Authority Approvals
      { wch: 15 },  // Viewers
      { wch: 15 },  // Attachments Count
    ];

    worksheet['!cols'] = columnWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RFC Requests');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Convert buffer to base64 for transmission
    const base64Excel = excelBuffer.toString('base64');

    return {
      data: base64Excel,
      filename: `RFC_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  },
});
