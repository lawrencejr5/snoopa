import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
// --- Queries ---

/**
 * Get all logs for a specific watchlist item (auth-gated).
 */
export const get_logs = query({
  args: { watchlist_id: v.id("watchlist") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return [];

    // Verify ownership
    const item = await ctx.db.get(args.watchlist_id);
    if (!item || item.user_id !== user_id) return [];

    return await ctx.db
      .query("logs")
      .withIndex("by_watchlist", (q) => q.eq("watchlist_id", args.watchlist_id))
      .order("desc")
      .collect();
  },
});

// --- Mutations ---

/**
 * Internal mutation to insert a log entry (called from firehose action).
 */
export const insert_log = internalMutation({
  args: {
    watchlist_id: v.id("watchlist"),
    action: v.string(),
    verified: v.boolean(),
    outcome: v.optional(
      v.union(v.literal("true"), v.literal("false"), v.literal("pending")),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("logs", {
      watchlist_id: args.watchlist_id,
      timestamp: Date.now(),
      action: args.action,
      verified: args.verified,
    });
  },
});

/**
 * Internal mutation to mark a processed headline URL hash as seen,
 * preventing duplicate processing.
 */
export const mark_headline_processed = internalMutation({
  args: { urlHash: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("processed_headlines", {
      urlHash: args.urlHash,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to update the last_checked timestamp on a watchlist item.
 */
export const update_last_checked = internalMutation({
  args: { watchlist_id: v.id("watchlist") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.watchlist_id, { last_checked: Date.now() });
  },
});

/**
 * Delete all logs for a watchlist item (public mutation, auth-gated).
 */
export const delete_logs = mutation({
  args: { watchlist_id: v.id("watchlist") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.watchlist_id);
    if (!item || item.user_id !== user_id) {
      throw new Error("Watchlist item not found or unauthorized");
    }

    const logs = await ctx.db
      .query("logs")
      .withIndex("by_watchlist", (q) => q.eq("watchlist_id", args.watchlist_id))
      .collect();

    await Promise.all(logs.map((log) => ctx.db.delete(log._id)));
  },
});
