import { v } from "convex/values";
import { mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";

export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit_feedback = mutation({
  args: {
    user_id: v.id("users"),
    content: v.string(),
    images: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const feedback_id = await ctx.db.insert("feedbacks", {
      user_id: args.user_id,
      content: args.content,
      images: args.images,
      timestamp: Date.now(),
    });
    return feedback_id;
  },
});
