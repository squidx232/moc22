import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Types for MOC Status
type MocStatus = 
  | "draft" 
  | "pending_department_approval" 
  | "pending_final_review" 
  | "approved" 
  | "rejected" 
  | "in_progress" 
  | "completed" 
  | "cancelled";

// Helper to check user permissions
async function checkUserPermission(
    ctx: QueryCtx | MutationCtx, 
    permissionCheck: (profile: Doc<"users"> | null) => boolean
): Promise<{ userId: Id<"users">; userProfile: Doc<"users"> | null }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated.");
  const userProfile: Doc<"users"> | null = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId });
  if (!userProfile?.isAdmin && !permissionCheck(userProfile)) {
    throw new ConvexError("Permission denied.");
  }
  return { userId, userProfile };
}

// Create MOC Request
export const createMocRequest = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    assignedToId: v.optional(v.id("users")),
    requestedByDepartment: v.optional(v.id("departments")),
    reasonForChange: v.optional(v.string()),
    changeType: v.optional(v.union(v.literal("temporary"), v.literal("permanent"), v.literal("emergency"))),
    changeCategory: v.optional(v.string()),
    changeCategoryOther: v.optional(v.string()),
    departmentsAffected: v.optional(v.array(v.id("departments"))),
    riskAssessmentRequired: v.optional(v.boolean()),
    impactAssessment: v.optional(v.string()),
    hseImpactAssessment: v.optional(v.string()),
    riskEvaluation: v.optional(v.string()),
    riskLevelPreMitigation: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    riskMatrixPreMitigation: v.optional(v.string()),
    riskLevelPostMitigation: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    riskMatrixPostMitigation: v.optional(v.string()),
    preChangeCondition: v.optional(v.string()),
    postChangeCondition: v.optional(v.string()),
    supportingDocumentsNotes: v.optional(v.string()),
    stakeholderReviewApprovalsText: v.optional(v.string()),
    trainingRequired: v.optional(v.boolean()),
    trainingDetails: v.optional(v.string()),
    startDateOfChange: v.optional(v.number()),
    expectedCompletionDate: v.optional(v.number()),
    deadline: v.optional(v.number()),
    implementationOwner: v.optional(v.string()),
    verificationOfCompletionText: v.optional(v.string()),
    postImplementationReviewText: v.optional(v.string()),
    closeoutApprovedByText: v.optional(v.string()),
    additionalApproverUserIds: v.optional(v.array(v.id("users"))),
    technicalAuthorityId: v.optional(v.id("users")), // New field for technical authority
    viewerIds: v.optional(v.array(v.id("users"))),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Id<"mocRequests">> => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser?.canCreateMocs && !currentUser?.isAdmin) {
      throw new ConvexError("Permission denied. You don't have permission to create RFCs.");
    }
    const userId = args.requestingUserId;

    const mocIdString = `MOC-${String(Date.now()).slice(-6)}`;

    const departmentApprovals = args.departmentsAffected && args.departmentsAffected.length > 0
      ? await Promise.all(args.departmentsAffected.map(async (deptId) => {
          const department = await ctx.db.get(deptId);
          const approverId = department?.approverUserId; 
          return {
            departmentId: deptId,
            status: "pending" as const,
            approverId: approverId, 
          };
        }))
      : [];

    const { requestingUserId, ...mocData } = args;
    const mocRequestId: Id<"mocRequests"> = await ctx.db.insert("mocRequests", {
      ...mocData,
      submitterId: userId,
      status: "draft",
      mocIdString,
      departmentApprovals: departmentApprovals,
      dateRaised: Date.now(),
    });

    if (args.assignedToId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: args.assignedToId,
        actorUserId: userId,
        mocRequestId,
        relatedMocTitle: args.title,
        type: "assignment",
        message: `You have been assigned a new MOC: "${args.title}".`
      });
    }

    // Notify technical authority if assigned
    if (args.technicalAuthorityId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: args.technicalAuthorityId,
        actorUserId: userId,
        mocRequestId,
        relatedMocTitle: args.title,
        type: "technical_authority_assignment",
        message: `You have been designated as the technical authority for MOC: "${args.title}".`
      });
    }
    
    return mocRequestId;
  },
});

export const updateMocRequest = mutation({
  args: {
    id: v.id("mocRequests"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    assignedToId: v.optional(v.id("users")),
    requestedByDepartment: v.optional(v.id("departments")),
    reasonForChange: v.optional(v.string()),
    changeType: v.optional(v.union(v.literal("temporary"), v.literal("permanent"), v.literal("emergency"))),
    changeCategory: v.optional(v.string()),
    changeCategoryOther: v.optional(v.string()),
    departmentsAffected: v.optional(v.array(v.id("departments"))),
    riskAssessmentRequired: v.optional(v.boolean()),
    impactAssessment: v.optional(v.string()),
    hseImpactAssessment: v.optional(v.string()),
    riskEvaluation: v.optional(v.string()),
    riskLevelPreMitigation: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    riskMatrixPreMitigation: v.optional(v.string()),
    riskLevelPostMitigation: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    riskMatrixPostMitigation: v.optional(v.string()),
    preChangeCondition: v.optional(v.string()),
    postChangeCondition: v.optional(v.string()),
    supportingDocumentsNotes: v.optional(v.string()),
    stakeholderReviewApprovalsText: v.optional(v.string()),
    trainingRequired: v.optional(v.boolean()),
    trainingDetails: v.optional(v.string()),
    startDateOfChange: v.optional(v.number()),
    expectedCompletionDate: v.optional(v.number()),
    deadline: v.optional(v.number()),
    implementationOwner: v.optional(v.string()),
    verificationOfCompletionText: v.optional(v.string()),
    postImplementationReviewText: v.optional(v.string()),
    closeoutApprovedByText: v.optional(v.string()),
    additionalApproverUserIds: v.optional(v.array(v.id("users"))),
    technicalAuthorityId: v.optional(v.id("users")), // New field for technical authority
    viewerIds: v.optional(v.array(v.id("users"))),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUserId = args.requestingUserId;

    const moc = await ctx.db.get(args.id);
    if (!moc) throw new ConvexError("MOC not found.");

    const profile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: authUserId });

    // Restrict editing for completed or in-progress MOCs
    if ((moc.status === "completed" || moc.status === "in_progress") && !profile?.isAdmin) {
      throw new ConvexError("Cannot edit RFC after it has been completed or is in progress without admin approval.");
    }

    // Allow editing during department approval stage but warn about re-approval requirement
    // This will be handled in the logic below by resetting approvals

    const canEditThisMoc = profile?.isAdmin || 
                           (moc.submitterId === authUserId && (moc.status === "draft" || moc.status === "rejected" || moc.status === "pending_department_approval" || moc.status === "pending_final_review")) ||
                           (moc.assignedToId === authUserId && (moc.status === "draft" || moc.status === "rejected" || moc.status === "pending_department_approval" || moc.status === "pending_final_review"));

    if (!canEditThisMoc) {
      throw new ConvexError("Permission denied to edit this RFC.");
    }
    
    const { id, requestingUserId, ...updateData } = args;

    // Check for actual changes
    const hasChanges = Object.keys(updateData).some(key => {
      const oldValue = moc[key as keyof typeof moc];
      const newValue = updateData[key as keyof typeof updateData];
      
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        return JSON.stringify(oldValue.sort()) !== JSON.stringify(newValue.sort());
      }
      
      return oldValue !== newValue;
    });

    if (!hasChanges) {
      return { success: true };
    }

    // If editing during approval stages, reset approvals and status
    let statusUpdate: Partial<Doc<"mocRequests">> = {};
    if (moc.status === "pending_department_approval" || moc.status === "pending_final_review") {
      statusUpdate.status = "draft";
      // Reset department approvals to pending
      if (moc.departmentsAffected) {
        statusUpdate.departmentApprovals = await Promise.all(moc.departmentsAffected.map(async (deptId) => {
          const department = await ctx.db.get(deptId);
          return {
            departmentId: deptId,
            status: "pending" as const,
            approverId: department?.approverUserId,
          };
        }));
      }
      // Clear review data
      statusUpdate.reviewedAt = undefined;
      statusUpdate.reviewerId = undefined;
      statusUpdate.reviewComments = undefined;
    }

    if (updateData.departmentsAffected) {
      const departmentApprovals = updateData.departmentsAffected && updateData.departmentsAffected.length > 0
        ? await Promise.all(updateData.departmentsAffected.map(async (deptId) => {
            const department = await ctx.db.get(deptId);
            const approverId = department?.approverUserId;
            const existingApproval = moc.departmentApprovals?.find(da => da.departmentId === deptId);
            return {
              departmentId: deptId,
              status: existingApproval?.status || "pending" as const,
              approverId: approverId, // This is the initially assigned one
              approvedAt: existingApproval?.approvedAt,
              comments: existingApproval?.comments,
            };
          }))
        : [];
      await ctx.db.patch(id, { ...updateData, ...statusUpdate, departmentApprovals });
    } else {
      await ctx.db.patch(id, { ...updateData, ...statusUpdate });
    }

    if (args.assignedToId && args.assignedToId !== moc.assignedToId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: args.assignedToId,
        actorUserId: authUserId,
        mocRequestId: id,
        relatedMocTitle: moc.title,
        type: "assignment",
        message: `You have been assigned to MOC: "${moc.title}".`
      });
    }

    // Notify technical authority if changed
    if (args.technicalAuthorityId && args.technicalAuthorityId !== moc.technicalAuthorityId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: args.technicalAuthorityId,
        actorUserId: authUserId,
        mocRequestId: id,
        relatedMocTitle: moc.title,
        type: "technical_authority_assignment",
        message: `You have been designated as the technical authority for MOC: "${moc.title}".`
      });
    }

    // Log the edit if there were changes
    if (hasChanges) {
      const editorUser = await ctx.db.get(authUserId);
      
      // Delete previous edit by this user for this MOC
      const previousEdits = await ctx.db
        .query("editHistory")
        .withIndex("by_user_moc", (q) => q.eq("editedById", authUserId).eq("mocRequestId", id))
        .collect();
      
      for (const edit of previousEdits) {
        await ctx.db.delete(edit._id);
      }

      // Track field changes and add edit record
      const fieldChanges = await ctx.runMutation(internal.fieldTracking.trackFieldChanges, {
        mocId: id,
        updateData,
        args,
      });

      console.log("Field changes tracked:", fieldChanges);

      const changesDescription = fieldChanges.length > 0 
        ? `Updated ${fieldChanges.length} field${fieldChanges.length > 1 ? 's' : ''}: ${fieldChanges.map((c: any) => c.field).slice(0, 3).join(', ')}`
        : "Updated RFC details";

      await ctx.db.insert("editHistory", {
        mocRequestId: id,
        editedById: authUserId,
        editedByName: editorUser?.name || editorUser?.email || "Unknown",
        changesDescription,
        editedAt: Date.now(),
        fieldChanges: fieldChanges.length > 0 ? fieldChanges : [],
      });
    }

    return { success: true };
  },
});

export const listMocRequests = query({
  args: { requestingUserId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requestingUserId);
    if (!user) throw new ConvexError("User not found");
    const requests = await ctx.db.query("mocRequests").order("desc").collect();
    
    // Filter out Draft MOCs that the user doesn't own
    const filteredRequests = requests.filter(moc => {
      if (moc.status === "draft") {
        return moc.submitterId === args.requestingUserId;
      }
      return true;
    });
    
    return Promise.all(filteredRequests.map(async (moc) => {
      const submitter = moc.submitterId ? await ctx.db.get(moc.submitterId) : null;
      const assignedTo = moc.assignedToId ? await ctx.db.get(moc.assignedToId) : null;
      return { ...moc, submitterName: submitter?.name || "Unknown", assignedToName: assignedTo?.name || "N/A" };
    }));
  },
});

export const listRequests = query({
  args: {
    statusFilter: v.optional(v.string()),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser) throw new ConvexError("User not found");
    let requests;
    if (args.statusFilter && args.statusFilter !== "all") {
      const validStatuses: MocStatus[] = ["draft", "pending_department_approval", "pending_final_review", "approved", "rejected", "in_progress", "completed", "cancelled"];
      if (validStatuses.includes(args.statusFilter as MocStatus)) {
        requests = await ctx.db
          .query("mocRequests")
          .withIndex("by_status", (q) => q.eq("status", args.statusFilter as MocStatus))
          .order("desc")
          .collect();
      } else {
        console.warn(`Invalid status filter: ${args.statusFilter}`);
        requests = await ctx.db.query("mocRequests").order("desc").collect();
      }
    } else {
      requests = await ctx.db.query("mocRequests").order("desc").collect();
    }

    // Filter out Draft MOCs that the user doesn't own
    const filteredRequests = requests.filter(moc => {
      if (moc.status === "draft") {
        return moc.submitterId === args.requestingUserId;
      }
      return true;
    });

    return Promise.all(filteredRequests.map(async (moc) => {
      const submitter = moc.submitterId ? await ctx.db.get(moc.submitterId) : null;
      const assignedTo = moc.assignedToId ? await ctx.db.get(moc.assignedToId) : null;
      const technicalAuthority = moc.technicalAuthorityId ? await ctx.db.get(moc.technicalAuthorityId) : null;
      
      const departmentApprovalsWithNames = moc.departmentApprovals ? await Promise.all(
        moc.departmentApprovals.map(async da => {
          const department = await ctx.db.get(da.departmentId);
          let approverDisplayName = "N/A";
          if (da.approverId) { 
            const approverUser = await ctx.db.get(da.approverId);
            if (approverUser) {
                approverDisplayName = approverUser.name || approverUser.email || "Unknown";
            }
          }
          return {
            ...da,
            departmentName: department?.name || "Unknown Department",
            approverDisplayName,
            approverEmail: da.approverId ? (await ctx.db.get(da.approverId))?.email : undefined, 
          };
        })
      ) : [];

      return {
        ...moc,
        submitterName: submitter?.name || submitter?.email || "Unknown",
        assignedToName: assignedTo?.name || assignedTo?.email || "N/A",
        technicalAuthorityName: technicalAuthority?.name || technicalAuthority?.email || "N/A",
        departmentApprovals: departmentApprovalsWithNames,
      };
    }));
  },
});

export const getRequestDetails = query({
  args: { 
    id: v.id("mocRequests"),
    requestingUserId: v.id("users")
  },
  handler: async (ctx, args) => {
    const moc = await ctx.db.get(args.id);
    if (!moc) return null;

    // Restrict access to Draft MOCs - only submitter can view
    if (moc.status === "draft" && moc.submitterId !== args.requestingUserId) {
      return null;
    }

    const submitter = await ctx.db.get(moc.submitterId);
    const assignedTo = moc.assignedToId ? await ctx.db.get(moc.assignedToId) : null;
    const reviewer = moc.reviewerId ? await ctx.db.get(moc.reviewerId) : null;
    const technicalAuthority = moc.technicalAuthorityId ? await ctx.db.get(moc.technicalAuthorityId) : null;
    const requestedByDepartmentDoc = moc.requestedByDepartment ? await ctx.db.get(moc.requestedByDepartment) : null;
    
    const departmentsAffectedNames = moc.departmentsAffected ? 
      await Promise.all(moc.departmentsAffected.map(async id => {
        const dept = await ctx.db.get(id);
        return dept?.name || "Unknown Dept";
      })) 
      : [];

    const departmentApprovalsWithDetails = moc.departmentApprovals ? await Promise.all(
      moc.departmentApprovals.map(async da => {
        const department = await ctx.db.get(da.departmentId);
        let approverDisplayName = "N/A";
        if (da.approverId) {
            const approverUser = await ctx.db.get(da.approverId);
            if (approverUser) {
                approverDisplayName = approverUser.name || approverUser.email || "Unknown";
            }
        }
        return {
          ...da,
          departmentName: department?.name || "Unknown Department",
          approverDisplayName, 
          approverEmail: da.approverId ? (await ctx.db.get(da.approverId))?.email : undefined,
        };
      })
    ) : [];

    const attachments = await ctx.db.query("mocAttachments")
      .withIndex("by_moc", q => q.eq("mocRequestId", moc._id))
      .collect();

    const attachmentsWithUrls = await Promise.all(attachments.map(async att => {
      const url = await ctx.storage.getUrl(att.storageId);
      const uploadedBy = await ctx.db.get(att.uploadedById);
      const fileDoc = await ctx.db.system.get(att.storageId);
      return { 
        ...att, 
        url, 
        uploadedByName: uploadedBy?.name || uploadedBy?.email || "Unknown",
        uploadedAt: att._creationTime, // Use creation time
        size: fileDoc?.size 
      };
    }));
    
    return {
      ...moc,
      submitterName: submitter?.name || submitter?.email || "Unknown",
      assignedToName: assignedTo?.name || assignedTo?.email || "N/A",
      reviewerName: reviewer?.name || reviewer?.email || "N/A",
      technicalAuthorityName: technicalAuthority?.name || technicalAuthority?.email || "N/A",
      requestedByDepartmentName: requestedByDepartmentDoc?.name || "N/A",
      departmentsAffectedNames,
      departmentApprovals: departmentApprovalsWithDetails,
      attachments: attachmentsWithUrls,
    };
  },
});

export const changeStatus = mutation({
  args: {
    id: v.id("mocRequests"),
    newStatus: v.string(),
    comments: v.optional(v.string()),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUserId = args.requestingUserId;
    const userProfile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: authUserId });

    const moc = await ctx.db.get(args.id);
    if (!moc) throw new ConvexError("MOC not found.");

    const validStatuses: MocStatus[] = ["draft", "pending_department_approval", "pending_final_review", "approved", "rejected", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(args.newStatus as MocStatus)) {
      throw new ConvexError("Invalid status provided.");
    }
    const newStatus = args.newStatus as MocStatus;

    const isSubmitter = moc.submitterId === authUserId;
    const isAssigned = moc.assignedToId === authUserId;
    const isAdditionalApprover = moc.additionalApproverUserIds?.includes(authUserId);
    const isTechnicalAuthority = moc.technicalAuthorityId === authUserId;

    let canChange = userProfile?.isAdmin;

    if (!canChange) {
        if (moc.status === "draft" && newStatus === "pending_department_approval" && isSubmitter) canChange = true;
        if (moc.status === "pending_department_approval" && newStatus === "cancelled" && isSubmitter) canChange = true;
        
        // Enhanced final review logic - ONLY technical authority can approve/reject if assigned
        if (moc.status === "pending_final_review" && (newStatus === "approved" || newStatus === "rejected")) {
          if (moc.technicalAuthorityId) {
            // If technical authority is assigned, ONLY they can approve/reject
            canChange = isTechnicalAuthority;
          } else {
            // If no technical authority, additional approvers can approve/reject
            canChange = isAdditionalApprover || userProfile?.isAdmin;
          }
        }
        
        if (moc.status === "pending_final_review" && newStatus === "cancelled" && isSubmitter) canChange = true;
        if (moc.status === "approved" && newStatus === "in_progress" && (isAssigned || userProfile?.isAdmin)) canChange = true;
        if (moc.status === "approved" && newStatus === "cancelled" && isSubmitter) canChange = true;
        if (moc.status === "rejected" && newStatus === "cancelled" && isSubmitter) canChange = true;
        if (moc.status === "in_progress" && newStatus === "completed" && (isAssigned || userProfile?.isAdmin)) canChange = true;
        if ((moc.status === "in_progress" || moc.status === "completed") && newStatus === "cancelled" && !userProfile?.isAdmin) {
            throw new ConvexError("Only admins can cancel MOCs that are in progress or completed.");
        }
    }
    
    if (!canChange && !userProfile?.isAdmin) { 
        throw new ConvexError("Permission denied to change status.");
    }

    const updatePayload: Partial<Doc<"mocRequests">> = { status: newStatus };
    if (newStatus === "pending_department_approval") {
      updatePayload.submittedAt = Date.now();
      if (moc.status === "rejected" || moc.status === "draft") {
        if (moc.departmentsAffected) {
            updatePayload.departmentApprovals = await Promise.all(moc.departmentsAffected.map(async (deptId) => {
                const department = await ctx.db.get(deptId);
                const existingApproval = moc.departmentApprovals?.find(da => da.departmentId === deptId);
                return {
                    departmentId: deptId,
                    status: "pending" as const,
                    approverId: existingApproval?.approverId || department?.approverUserId,
                };
            }));
        } else {
            updatePayload.departmentApprovals = [];
        }
      }
    }
    if (newStatus === "approved" || newStatus === "rejected") {
      updatePayload.reviewedAt = Date.now();
      updatePayload.reviewerId = authUserId;
      updatePayload.reviewComments = args.comments;
    }

    await ctx.db.patch(moc._id, updatePayload);

    const usersToNotify: Set<Id<"users">> = new Set();
    if (moc.submitterId !== authUserId) usersToNotify.add(moc.submitterId);
    if (moc.assignedToId && moc.assignedToId !== authUserId) usersToNotify.add(moc.assignedToId);
    if (moc.technicalAuthorityId && moc.technicalAuthorityId !== authUserId) usersToNotify.add(moc.technicalAuthorityId);
    moc.additionalApproverUserIds?.forEach(id => { if (id !== authUserId) usersToNotify.add(id) });
    moc.viewerIds?.forEach(id => { if (id !== authUserId) usersToNotify.add(id) });

    for (const notifyUserId of Array.from(usersToNotify)) {
        await ctx.runMutation(internal.notifications.createNotification, {
            userId: notifyUserId,
            actorUserId: authUserId,
            mocRequestId: moc._id,
            relatedMocTitle: moc.title,
            type: "status_change",
            message: `MOC "${moc.title}" status changed to ${newStatus.replace(/_/g, " ")}.` + (args.comments ? ` Comments: ${args.comments}` : "")
        });
    }
    
    if (newStatus === "pending_department_approval" && updatePayload.departmentApprovals) {
        for (const approval of updatePayload.departmentApprovals) {
            if (approval.approverId) {
                const approverUser = await ctx.db.get(approval.approverId);
                if (approverUser) {
                    const deptDoc = await ctx.db.get(approval.departmentId);
                    await ctx.runMutation(internal.notifications.createNotification, {
                        userId: approverUser._id,
                        actorUserId: authUserId,
                        mocRequestId: moc._id,
                        relatedMocTitle: moc.title,
                        type: "department_approval_pending",
                        message: `Your approval is requested for MOC "${moc.title}" for department ${ deptDoc?.name }.`
                    });
                }
            }
        }
    }
    return { success: true };
  },
});

export const resubmitMocRequest = mutation({
  args: { 
    mocId: v.id("mocRequests"),
    requestingUserId: v.id("users")
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUserId = args.requestingUserId;
    const userProfile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: authUserId });

    const moc = await ctx.db.get(args.mocId);
    if (!moc) throw new ConvexError("MOC not found.");

    if (moc.submitterId !== authUserId && !userProfile?.isAdmin) {
      throw new ConvexError("Only the submitter or an admin can resubmit this MOC.");
    }

    if (moc.status !== "rejected" && moc.status !== "draft") {
      throw new ConvexError("MOC can only be resubmitted if it's in 'rejected' or 'draft' status.");
    }
    
    const resetDepartmentApprovals = moc.departmentsAffected
    ? await Promise.all(moc.departmentsAffected.map(async (deptId) => {
        const department = await ctx.db.get(deptId);
        return {
            departmentId: deptId,
            status: "pending" as const,
            approverId: department?.approverUserId, 
        };
    }))
    : [];

    await ctx.db.patch(args.mocId, { 
        status: "pending_department_approval", 
        submittedAt: Date.now(),
        reviewedAt: undefined,
        reviewerId: undefined,
        reviewComments: undefined,
        departmentApprovals: resetDepartmentApprovals,
    });

    if (resetDepartmentApprovals) {
        for (const approval of resetDepartmentApprovals) {
            if (approval.approverId) {
                const approverUser = await ctx.db.get(approval.approverId);
                if (approverUser) {
                    const deptDoc = await ctx.db.get(approval.departmentId);
                    await ctx.runMutation(internal.notifications.createNotification, {
                        userId: approverUser._id,
                        actorUserId: authUserId,
                        mocRequestId: moc._id,
                        relatedMocTitle: moc.title,
                        type: "department_approval_pending",
                        message: `MOC "${moc.title}" has been resubmitted and requires your department's approval for department ${deptDoc?.name}.`
                    });
                }
            }
        }
    }
    if (moc.assignedToId && moc.assignedToId !== authUserId) {
        await ctx.runMutation(internal.notifications.createNotification, {
            userId: moc.assignedToId,
            actorUserId: authUserId,
            mocRequestId: moc._id,
            relatedMocTitle: moc.title,
            type: "status_change",
            message: `MOC "${moc.title}" has been resubmitted and is now pending department approval.`
        });
    }
    return { success: true };
  },
});

export const approveOrRejectDepartmentStep = mutation({
  args: {
    mocId: v.id("mocRequests"),
    departmentId: v.id("departments"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    comments: v.optional(v.string()),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUserId = args.requestingUserId;
    const currentUser = await ctx.db.get(authUserId);
    if (!currentUser || !currentUser.email) throw new ConvexError("User or user email not found.");
    const userProfile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: authUserId });

    const moc = await ctx.db.get(args.mocId);
    if (!moc) throw new ConvexError("MOC not found.");
    if (moc.status !== "pending_department_approval") {
      throw new ConvexError("MOC is not pending department approval.");
    }

    const departmentApprovalIndex = moc.departmentApprovals?.findIndex(da => da.departmentId === args.departmentId);
    if (departmentApprovalIndex === undefined || departmentApprovalIndex === -1 || !moc.departmentApprovals) {
         throw new ConvexError("Department approval not found for this MOC.");
    }
    const departmentApproval = moc.departmentApprovals[departmentApprovalIndex];

    const department = await ctx.db.get(args.departmentId);
    const isDesignatedApprover = department?.approverUserId === currentUser._id || false;

    if (!userProfile?.isAdmin && !isDesignatedApprover) {
      throw new ConvexError("Permission denied. Not an admin or designated approver for this department.");
    }
    if (departmentApproval.status !== "pending") {
        throw new ConvexError(`This department step has already been ${departmentApproval.status}.`);
    }

    const updatedApprovals = [...moc.departmentApprovals];
    updatedApprovals[departmentApprovalIndex] = { 
        ...departmentApproval, 
        status: args.decision, 
        approvedAt: Date.now(), 
        comments: args.comments, 
        approverId: currentUser._id 
    };

    await ctx.db.patch(args.mocId, { departmentApprovals: updatedApprovals });

    const allApproved = updatedApprovals.every(da => da.status === "approved");
    const anyRejected = updatedApprovals.some(da => da.status === "rejected");

    let nextMocStatus: MocStatus | null = null;
    if (anyRejected) {
      nextMocStatus = "rejected";
    } else if (allApproved) {
      // Enhanced logic: Check if technical authority exists
      if (moc.technicalAuthorityId) {
        // If technical authority is assigned, go to final review
        nextMocStatus = "pending_final_review";
      } else {
        // If no technical authority, auto-approve (skip final review)
        nextMocStatus = "approved";
      }
    }

    if (nextMocStatus) {
      await ctx.db.patch(args.mocId, { 
        status: nextMocStatus,
        ...(nextMocStatus === "rejected" && { 
            reviewComments: `Rejected during department approval. Department: ${department?.name}. Comments: ${args.comments || 'N/A'}`,
            reviewerId: authUserId, 
            reviewedAt: Date.now(),
        }),
        ...(nextMocStatus === "approved" && !moc.technicalAuthorityId && {
            reviewComments: "Auto-approved after all department approvals completed (no technical authority assigned).",
            reviewerId: authUserId,
            reviewedAt: Date.now(),
        }),
      });
    }
    
    const usersToNotify = new Set<Id<"users">>();
    if (moc.submitterId !== authUserId) usersToNotify.add(moc.submitterId);
    if (moc.assignedToId && moc.assignedToId !== authUserId) usersToNotify.add(moc.assignedToId);

    const deptName = department?.name || "Unknown Department";
    for (const notifyUserId of Array.from(usersToNotify)) {
        await ctx.runMutation(internal.notifications.createNotification, {
            userId: notifyUserId,
            actorUserId: authUserId,
            mocRequestId: moc._id,
            relatedMocTitle: moc.title,
            type: "department_action",
            message: `Department "${deptName}" has ${args.decision} their step for MOC "${moc.title}".` + (args.comments ? ` Comments: ${args.comments}` : "")
        });
    }
    if (nextMocStatus) {
        for (const notifyUserId of Array.from(usersToNotify)) {
            await ctx.runMutation(internal.notifications.createNotification, {
                userId: notifyUserId,
                actorUserId: authUserId,
                mocRequestId: moc._id,
                relatedMocTitle: moc.title,
                type: "status_change",
                message: `MOC "${moc.title}" status changed to ${nextMocStatus.replace(/_/g, " ")}.`
            });
        }

        // Notify technical authority if moving to final review
        if (nextMocStatus === "pending_final_review" && moc.technicalAuthorityId) {
            await ctx.runMutation(internal.notifications.createNotification, {
                userId: moc.technicalAuthorityId,
                actorUserId: authUserId,
                mocRequestId: moc._id,
                relatedMocTitle: moc.title,
                type: "final_review_pending",
                message: `MOC "${moc.title}" is now pending your final technical review.`
            });
        }
    }
    return { success: true };
  },
});

export const deleteMocRequest = mutation({
  args: { mocId: v.id("mocRequests"), requestingUserId: v.id("users") },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUserId = args.requestingUserId;
    const userProfile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: authUserId });
    
    const moc = await ctx.db.get(args.mocId);
    if (!moc) throw new ConvexError("MOC not found.");

    const isSubmitter = moc.submitterId === authUserId;
    const canDeleteThisMoc = userProfile?.isAdmin || 
                             userProfile?.canDeleteAnyMoc ||
                             (isSubmitter && (moc.status === "draft" || moc.status === "rejected" || moc.status === "cancelled"));
    
    if (!canDeleteThisMoc) {
        throw new ConvexError("Permission denied to delete this MOC.");
    }

    const attachments = await ctx.db.query("mocAttachments")
      .withIndex("by_moc", q => q.eq("mocRequestId", args.mocId))
      .collect();
    for (const att of attachments) {
      await ctx.storage.delete(att.storageId);
      await ctx.db.delete(att._id);
    }
    const notifications = await ctx.db.query("notifications")
      .filter(q => q.eq(q.field("mocRequestId"), args.mocId))
      .collect();
    for (const notif of notifications) {
        await ctx.db.delete(notif._id);
    }

    await ctx.db.delete(args.mocId);
    return { success: true };
  },
});

export const generateUploadUrl = mutation({
  args: { requestingUserId: v.id("users") },
  handler: async (ctx, args): Promise<string> => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser) throw new ConvexError("User not found.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const addAttachment = mutation({
  args: {
    mocRequestId: v.id("mocRequests"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser) throw new ConvexError("User not found.");
    
    await ctx.db.insert("mocAttachments", {
      mocRequestId: args.mocRequestId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      uploadedById: args.requestingUserId,
    });
    return { success: true };
  },
});

export const getEditLogs = query({
  args: { 
    mocRequestId: v.id("mocRequests"),
    requestingUserId: v.id("users")
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser) throw new ConvexError("User not found.");

    const editHistory = await ctx.db
      .query("editHistory")
      .withIndex("by_moc", (q) => q.eq("mocRequestId", args.mocRequestId))
      .order("desc")
      .collect();

    return editHistory;
  },
});

export const getEditLogsSummary = query({
  args: { 
    mocRequestId: v.id("mocRequests"),
    requestingUserId: v.id("users")
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser) throw new ConvexError("User not found.");

    // Get the most recent edit from each user
    const editHistory = await ctx.db
      .query("editHistory")
      .withIndex("by_moc", (q) => q.eq("mocRequestId", args.mocRequestId))
      .order("desc")
      .collect();

    // Group by user and take the most recent edit from each
    const userEdits = new Map();
    editHistory.forEach(edit => {
      if (!userEdits.has(edit.editedById)) {
        userEdits.set(edit.editedById, edit);
      }
    });

    return Array.from(userEdits.values()).sort((a, b) => b.editedAt - a.editedAt);
  },
});
