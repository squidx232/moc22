import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Internal mutation to track detailed field changes
export const trackFieldChanges = internalMutation({
  args: {
    mocId: v.id("mocRequests"),
    updateData: v.any(),
    args: v.any(),
  },
  handler: async (ctx, { mocId, updateData, args }) => {
    const moc = await ctx.db.get(mocId);
    if (!moc) return [];

    const fieldChanges: Array<{
      field: string;
      oldValue?: string;
      newValue?: string;
      changeType: "added" | "changed" | "removed";
    }> = [];

    // Helper functions
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return "";
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (typeof value === "number") {
        if (value > 1000000000000) return new Date(value).toLocaleDateString();
        return value.toString();
      }
      if (Array.isArray(value)) return value.join(", ");
      return String(value);
    };

    const getUserName = async (userId: string): Promise<string> => {
      const user = await ctx.db.get(userId as Id<"users">);
      return user?.name || user?.email || "Unknown User";
    };

    const getDepartmentName = async (deptId: string): Promise<string> => {
      const dept = await ctx.db.get(deptId as Id<"departments">);
      return dept?.name || "Unknown Department";
    };

    // Track basic field changes
    const fieldsToTrack = [
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "reasonForChange", label: "Reason for Change" },
      { key: "changeType", label: "Change Type" },
      { key: "changeCategory", label: "Change Category" },
      { key: "changeCategoryOther", label: "Other Category" },
      { key: "riskAssessmentRequired", label: "Risk Assessment Required" },
      { key: "impactAssessment", label: "Impact Assessment" },
      { key: "hseImpactAssessment", label: "HSE Impact Assessment" },
      { key: "riskEvaluation", label: "Risk Evaluation" },
      { key: "riskLevelPreMitigation", label: "Risk Level (Pre-Mitigation)" },
      { key: "riskMatrixPreMitigation", label: "Risk Matrix (Pre-Mitigation)" },
      { key: "riskLevelPostMitigation", label: "Risk Level (Post-Mitigation)" },
      { key: "riskMatrixPostMitigation", label: "Risk Matrix (Post-Mitigation)" },
      { key: "preChangeCondition", label: "Pre-Change Condition" },
      { key: "postChangeCondition", label: "Post-Change Condition" },
      { key: "supportingDocumentsNotes", label: "Supporting Documents Notes" },
      { key: "stakeholderReviewApprovalsText", label: "Stakeholder Review & Approvals" },
      { key: "trainingRequired", label: "Training Required" },
      { key: "trainingDetails", label: "Training Details" },
      { key: "startDateOfChange", label: "Start Date" },
      { key: "expectedCompletionDate", label: "Expected Completion Date" },
      { key: "deadline", label: "Deadline" },
      { key: "implementationOwner", label: "Implementation Owner" },
      { key: "verificationOfCompletionText", label: "Verification of Completion" },
      { key: "postImplementationReviewText", label: "Post-Implementation Review" },
      { key: "closeoutApprovedByText", label: "Closeout Approval" },
    ];

    for (const field of fieldsToTrack) {
      const oldValue = (moc as any)[field.key];
      const newValue = (updateData as any)[field.key];
      
      if (oldValue !== newValue) {
        const oldFormatted = formatValue(oldValue);
        const newFormatted = formatValue(newValue);
        
        if (!oldFormatted && newFormatted) {
          fieldChanges.push({
            field: field.label,
            newValue: newFormatted,
            changeType: "added"
          });
        } else if (oldFormatted && !newFormatted) {
          fieldChanges.push({
            field: field.label,
            oldValue: oldFormatted,
            changeType: "removed"
          });
        } else if (oldFormatted !== newFormatted) {
          fieldChanges.push({
            field: field.label,
            oldValue: oldFormatted,
            newValue: newFormatted,
            changeType: "changed"
          });
        }
      }
    }

    // Handle special fields that need name resolution
    if (args.assignedToId !== moc.assignedToId) {
      const oldName = moc.assignedToId ? await getUserName(moc.assignedToId) : "";
      const newName = args.assignedToId ? await getUserName(args.assignedToId) : "";
      
      if (oldName !== newName) {
        fieldChanges.push({
          field: "Assigned To",
          oldValue: oldName || "None",
          newValue: newName || "None",
          changeType: "changed"
        });
      }
    }

    if (args.technicalAuthorityId !== moc.technicalAuthorityId) {
      const oldName = moc.technicalAuthorityId ? await getUserName(moc.technicalAuthorityId) : "";
      const newName = args.technicalAuthorityId ? await getUserName(args.technicalAuthorityId) : "";
      
      if (oldName !== newName) {
        fieldChanges.push({
          field: "Technical Authority",
          oldValue: oldName || "None",
          newValue: newName || "None",
          changeType: "changed"
        });
      }
    }

    if (args.requestedByDepartment !== moc.requestedByDepartment) {
      const oldName = moc.requestedByDepartment ? await getDepartmentName(moc.requestedByDepartment) : "";
      const newName = args.requestedByDepartment ? await getDepartmentName(args.requestedByDepartment) : "";
      
      if (oldName !== newName) {
        fieldChanges.push({
          field: "Requesting Department",
          oldValue: oldName || "None",
          newValue: newName || "None",
          changeType: "changed"
        });
      }
    }

    // Handle departments affected
    if (args.departmentsAffected) {
      const oldDepts = moc.departmentsAffected || [];
      const newDepts = args.departmentsAffected || [];
      
      if (JSON.stringify(oldDepts.sort()) !== JSON.stringify(newDepts.sort())) {
        const oldNames = await Promise.all(oldDepts.map((id: string) => getDepartmentName(id)));
        const newNames = await Promise.all(newDepts.map((id: string) => getDepartmentName(id)));
        
        fieldChanges.push({
          field: "Departments Affected",
          oldValue: oldNames.join(", ") || "None",
          newValue: newNames.join(", ") || "None",
          changeType: "changed"
        });
      }
    }

    // Handle additional approvers
    if (args.additionalApproverUserIds) {
      const oldApprovers = moc.additionalApproverUserIds || [];
      const newApprovers = args.additionalApproverUserIds || [];
      
      if (JSON.stringify(oldApprovers.sort()) !== JSON.stringify(newApprovers.sort())) {
        const oldNames = await Promise.all(oldApprovers.map((id: string) => getUserName(id)));
        const newNames = await Promise.all(newApprovers.map((id: string) => getUserName(id)));
        
        fieldChanges.push({
          field: "Additional Approvers",
          oldValue: oldNames.join(", ") || "None",
          newValue: newNames.join(", ") || "None",
          changeType: "changed"
        });
      }
    }

    // Handle viewers
    if (args.viewerIds) {
      const oldViewers = moc.viewerIds || [];
      const newViewers = args.viewerIds || [];
      
      if (JSON.stringify(oldViewers.sort()) !== JSON.stringify(newViewers.sort())) {
        const oldNames = await Promise.all(oldViewers.map((id: string) => getUserName(id)));
        const newNames = await Promise.all(newViewers.map((id: string) => getUserName(id)));
        
        fieldChanges.push({
          field: "Viewers",
          oldValue: oldNames.join(", ") || "None",
          newValue: newNames.join(", ") || "None",
          changeType: "changed"
        });
      }
    }

    return fieldChanges;
  },
});
