import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAllMocRequestsForExport = query({
  args: { requestingUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.requestingUserId);
    if (!currentUser) throw new Error("User not found");
    
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
      const reviewer = moc.reviewerId ? await ctx.db.get(moc.reviewerId) : null;
      const requestedByDepartmentDoc = moc.requestedByDepartment ? await ctx.db.get(moc.requestedByDepartment) : null;
      
      const departmentsAffectedNames = moc.departmentsAffected ? 
        await Promise.all(moc.departmentsAffected.map(async id => (await ctx.db.get(id))?.name || "Unknown Dept")) 
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
          };
        })
      ) : [];

      const additionalApproverNames = moc.additionalApproverUserIds ? 
        await Promise.all(moc.additionalApproverUserIds.map(async id => {
          const user = await ctx.db.get(id);
          return user?.name || user?.email || "Unknown User";
        })) : [];

      const viewerNames = moc.viewerIds ? 
        await Promise.all(moc.viewerIds.map(async id => {
          const user = await ctx.db.get(id);
          return user?.name || user?.email || "Unknown User";
        })) : [];

      const attachments = await ctx.db.query("mocAttachments")
        .withIndex("by_moc", q => q.eq("mocRequestId", moc._id))
        .collect();

      return {
        ...moc,
        submitterName: submitter?.name || submitter?.email || "Unknown",
        assignedToName: assignedTo?.name || assignedTo?.email || "N/A",
        reviewerName: reviewer?.name || reviewer?.email || "N/A",
        requestedByDepartmentName: requestedByDepartmentDoc?.name || "N/A",
        departmentsAffectedNames,
        departmentApprovals: departmentApprovalsWithDetails,
        additionalApproverNames,
        viewerNames,
        attachmentsCount: attachments.length,
      };
    }));
  },
});
