import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const deleteAttachment = mutation({
  args: { attachmentId: v.id("mocAttachments") },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new ConvexError("Not authenticated.");
    
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) throw new ConvexError("Attachment not found.");
    
    const moc = await ctx.db.get(attachment.mocRequestId);
    if (!moc) throw new ConvexError("MOC not found.");
    
    const userProfile = await ctx.runQuery(internal.userInternal.getUserProfileByUserId, { userId: authUserId });
    
    // Check if user is the uploader of this specific attachment
    const isUploader = attachment.uploadedById === authUserId;
    // Check if user is the MOC owner/submitter
    const isMocOwner = moc.submitterId === authUserId;
    
    const canDelete = userProfile?.isAdmin || 
                     (isUploader) || 
                     (isMocOwner); // MOC owners can delete any attachment on their MOC
    
    if (!canDelete) {
      if (!isMocOwner && !isUploader) {
        throw new ConvexError("Permission denied. Only MOC owners/submitters can delete attachments uploaded by others, or you can delete your own uploads.");
      } else {
        throw new ConvexError("Permission denied. Only admins, MOC owners, or the uploader can delete attachments.");
      }
    }
    
    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(args.attachmentId);
    
    return { success: true };
  },
});
