import { v } from "convex/values";
import { mutation, action, query } from "./_generated/server";
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
      status: "unread",
    });
    return feedback_id;
  },
});

export const getUnreadFeedbackCount = query({
  args: {},
  handler: async (ctx) => {
    const feedbacks = await ctx.db.query("feedbacks").collect();
    const unreadCount = feedbacks.filter(
      (f) => !f.status || f.status === "unread"
    ).length;
    return unreadCount;
  },
});

export const getFeedbacksAdmin = query({
  args: {
    search: v.optional(v.string()),
    status_filter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let feedbacks = await ctx.db.query("feedbacks").collect();
    const users = await ctx.db.query("users").collect();
    const users_map = new Map(users.map((u) => [u._id.toString(), u]));

    let results = await Promise.all(
      feedbacks.map(async (f) => {
        const user = users_map.get(f.user_id.toString());
        let image_urls: string[] = [];

        if (f.images && f.images.length > 0) {
          const urls = await Promise.all(
            f.images.map((img_id) => ctx.storage.getUrl(img_id))
          );
          image_urls = urls.filter((url): url is string => url !== null);
        }

        return {
          ...f,
          status: f.status || "unread",
          user_email: user ? user.email : "Unknown Email",
          user_fullname: user ? user.fullname || user.email : "Unknown User",
          image_urls,
        };
      })
    );

    if (args.search) {
      const term = args.search.toLowerCase();
      results = results.filter(
        (f) =>
          f.content.toLowerCase().includes(term) ||
          f.user_email.toLowerCase().includes(term) ||
          f.user_fullname.toLowerCase().includes(term)
      );
    }

    if (args.status_filter && args.status_filter !== "all") {
      results = results.filter((f) => f.status === args.status_filter);
    }

    results.sort(
      (a, b) => (b.timestamp || b._creationTime) - (a.timestamp || a._creationTime)
    );

    return results;
  },
});

export const updateFeedbackStatus = mutation({
  args: {
    feedback_id: v.id("feedbacks"),
    status: v.union(v.literal("unread"), v.literal("read"), v.literal("fulfilled")),
  },
  handler: async (ctx, args) => {
    const fb = await ctx.db.get(args.feedback_id);
    if (!fb) throw new Error("Feedback record not found");

    await ctx.db.patch(args.feedback_id, {
      status: args.status,
    });

    return { success: true };
  },
});

export const deleteFeedbackAdmin = mutation({
  args: { feedback_id: v.id("feedbacks") },
  handler: async (ctx, args) => {
    const fb = await ctx.db.get(args.feedback_id);
    if (!fb) throw new Error("Feedback record not found");

    await ctx.db.delete(args.feedback_id);
    return { success: true };
  },
});

