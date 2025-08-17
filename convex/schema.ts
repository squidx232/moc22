import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Extend the users table from authTables with additional fields
const extendedAuthTables = {
  ...authTables,
  users: defineTable({
    ...authTables.users.validator.fields,
    // Additional user fields
    isAdmin: v.optional(v.boolean()),
    isApproved: v.optional(v.boolean()),
    canCreateMocs: v.optional(v.boolean()),
    canEditAnyMoc: v.optional(v.boolean()),
    canDeleteAnyMoc: v.optional(v.boolean()),
    canManageUsers: v.optional(v.boolean()),
    canManageDepartments: v.optional(v.boolean()),
    canViewAllMocs: v.optional(v.boolean()),
    canManageMocRolesGlobally: v.optional(v.boolean()),
    departmentId: v.optional(v.id("departments")),
    passwordHash: v.optional(v.string()),
    requiresPasswordSetup: v.optional(v.boolean()),
    temporaryPassword: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
};

const applicationTables = {
  mocRequests: defineTable({
    title: v.string(),
    description: v.string(),
    submitterId: v.id("users"),
    assignedToId: v.optional(v.id("users")),
    requestedByDepartment: v.optional(v.id("departments")),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_department_approval"),
      v.literal("pending_final_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    mocIdString: v.string(),
    dateRaised: v.number(),
    submittedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    reviewerId: v.optional(v.id("users")),
    reviewComments: v.optional(v.string()),
    
    // Change details
    reasonForChange: v.optional(v.string()),
    changeType: v.optional(v.union(v.literal("temporary"), v.literal("permanent"), v.literal("emergency"))),
    changeCategory: v.optional(v.string()),
    changeCategoryOther: v.optional(v.string()),
    
    // Departments and approvals
    departmentsAffected: v.optional(v.array(v.id("departments"))),
    departmentApprovals: v.optional(v.array(v.object({
      departmentId: v.id("departments"),
      status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
      approverId: v.optional(v.id("users")),
      approvedAt: v.optional(v.number()),
      comments: v.optional(v.string()),
    }))),
    
    // Risk assessment
    riskAssessmentRequired: v.optional(v.boolean()),
    impactAssessment: v.optional(v.string()),
    hseImpactAssessment: v.optional(v.string()),
    riskEvaluation: v.optional(v.string()),
    riskLevelPreMitigation: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    riskMatrixPreMitigation: v.optional(v.string()),
    riskLevelPostMitigation: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    riskMatrixPostMitigation: v.optional(v.string()),
    
    // Implementation details
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
    
    // Additional approvers and viewers
    additionalApproverUserIds: v.optional(v.array(v.id("users"))),
    technicalAuthorityId: v.optional(v.id("users")), // New field for technical authority
    viewerIds: v.optional(v.array(v.id("users"))),
  })
    .index("by_submitter", ["submitterId"])
    .index("by_assigned", ["assignedToId"])
    .index("by_status", ["status"])
    .index("by_department", ["requestedByDepartment"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "submitterId"]
    }),

  departments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    approverUserId: v.optional(v.id("users")),
    approverUserIds: v.optional(v.array(v.id("users"))),
    isActive: v.optional(v.boolean()),
  }),

  mocAttachments: defineTable({
    mocRequestId: v.id("mocRequests"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    uploadedById: v.id("users"),
  }).index("by_moc", ["mocRequestId"]),

  notifications: defineTable({
    userId: v.id("users"),
    actorUserId: v.optional(v.id("users")),
    mocRequestId: v.optional(v.id("mocRequests")),
    relatedMocTitle: v.optional(v.string()),
    type: v.union(
      v.literal("assignment"),
      v.literal("status_change"),
      v.literal("department_approval_pending"),
      v.literal("department_action"),
      v.literal("final_review_pending"),
      v.literal("technical_authority_assignment"),
      v.literal("general"),
      v.literal("new_comment"),
      v.literal("deadline_approaching")
    ),
    message: v.string(),
    isRead: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_user_time", ["userId", "createdAt"])
    .index("by_moc", ["mocRequestId"]),

  editHistory: defineTable({
    mocRequestId: v.id("mocRequests"),
    editedById: v.id("users"),
    editedByName: v.string(),
    changesDescription: v.string(),
    editedAt: v.number(),
    fieldChanges: v.optional(v.array(v.object({
      field: v.string(),
      oldValue: v.optional(v.string()),
      newValue: v.optional(v.string()),
      changeType: v.union(v.literal("added"), v.literal("changed"), v.literal("removed"))
    }))),
  }).index("by_moc", ["mocRequestId"])
    .index("by_user_moc", ["editedById", "mocRequestId"]),

  userSessions: defineTable({
    userId: v.id("users"),
    sessionToken: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    lastAccessedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["sessionToken"])
    .index("by_expires", ["expiresAt"]),

  pendingSignups: defineTable({
    name: v.string(),
    email: v.string(),
    password: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    userId: v.optional(v.id("users")),
    requestedDepartment: v.optional(v.string()),
    processedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  hashedPasswords: defineTable({
    signupId: v.id("pendingSignups"),
    hashedPassword: v.string(),
  }),
};

export default defineSchema({
  ...extendedAuthTables,
  ...applicationTables,
});
