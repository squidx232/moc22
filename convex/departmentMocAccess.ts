import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get MOCs that a department approver can view/approve
export const getDepartmentMocs = query({
  args: {
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.email) throw new ConvexError("User email not found");

    const userProfile = await ctx.db.get(userId);

    // If user is admin, they can see all MOCs except Draft MOCs they don't own
    if (userProfile?.isAdmin) {
      const allMocs = await ctx.db.query("mocRequests").collect();
      return allMocs.filter(moc => {
        if (moc.status === "draft") {
          return moc.submitterId === userId;
        }
        return true;
      });
    }

    // Find departments where this user is an approver
    const userDepartments = await ctx.db
      .query("departments")
      .filter((q) => 
        q.neq(q.field("approverUserId"), undefined)
      )
      .collect();

    const approverDepartments = userDepartments.filter(dept => 
      dept.approverUserId === user._id
    );

    if (approverDepartments.length === 0) {
      // User is not a department approver, return MOCs they created or are assigned to
      const userMocs = await ctx.db
        .query("mocRequests")
        .filter((q) => 
          q.or(
            q.eq(q.field("submitterId"), userId),
            q.eq(q.field("assignedToId"), userId)
          )
        )
        .collect();

      // Also include MOCs where they are viewers or additional approvers
      const allMocs = await ctx.db.query("mocRequests").collect();
      const additionalMocs = allMocs.filter(moc => 
        moc.viewerIds?.includes(userId) || 
        moc.additionalApproverUserIds?.includes(userId)
      );

      // Combine and deduplicate
      const combinedMocs = [...userMocs];
      additionalMocs.forEach(moc => {
        if (!combinedMocs.find(existing => existing._id === moc._id)) {
          combinedMocs.push(moc);
        }
      });

      // Filter out Draft MOCs that the user doesn't own
      return combinedMocs.filter(moc => {
        if (moc.status === "draft") {
          return moc.submitterId === userId;
        }
        return true;
      });
    }

    // User is a department approver - get all MOCs related to their departments
    const departmentIds = approverDepartments.map(dept => dept._id);
    const allMocs = await ctx.db.query("mocRequests").collect();

    const relevantMocs = allMocs.filter(moc => {
      // MOCs requested by their departments
      if (moc.requestedByDepartment && departmentIds.includes(moc.requestedByDepartment)) {
        return true;
      }

      // MOCs affecting their departments
      if (moc.departmentsAffected?.some(deptId => departmentIds.includes(deptId))) {
        return true;
      }

      // MOCs with department approvals for their departments
      if (moc.departmentApprovals?.some(approval => 
        departmentIds.includes(approval.departmentId)
      )) {
        return true;
      }

      // MOCs they created, are assigned to, or are viewers/approvers of
      if (moc.submitterId === userId || 
          moc.assignedToId === userId ||
          moc.viewerIds?.includes(userId) ||
          moc.additionalApproverUserIds?.includes(userId)) {
        return true;
      }

      return false;
    });

    // Filter out Draft MOCs that the user doesn't own
    const filteredMocs = relevantMocs.filter(moc => {
      if (moc.status === "draft") {
        return moc.submitterId === userId;
      }
      return true;
    });

    return filteredMocs;
  },
});

// Get departments where user is an approver
export const getUserDepartments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.email) throw new ConvexError("User email not found");

    const allDepartments = await ctx.db.query("departments").collect();
    
    return allDepartments.filter(dept => 
      dept.approverUserId === user._id
    );
  },
});
