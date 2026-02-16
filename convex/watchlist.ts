import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// --- Queries ---

/**
 * Get all watchlist items for the current user.
 */
export const get_watchlist = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return [];

    return await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single watchlist item by ID.
 */
export const get_watchlist_item = query({
  args: { watchlist_id: v.id("watchlist") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return null;

    const item = await ctx.db.get(args.watchlist_id);
    if (!item || item.user_id !== user_id) return null;

    return item;
  },
});

/**
 * Get logs for a specific watchlist item.
 */
export const get_watchlist_logs = query({
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
 * Internal mutation to add a watchlist item (called from chat action).
 */
export const add_watchlist_item = mutation({
  args: {
    user_id: v.id("users"),
    title: v.string(),
    description: v.string(),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("watchlist", {
      user_id: args.user_id,
      title: args.title,
      description: args.description,
      status: "active",
      last_checked: Date.now(),
      sources: args.sources ?? [],
    });

    // Create an initial log entry
    await ctx.db.insert("logs", {
      watchlist_id: id,
      timestamp: Date.now(),
      action: "Watchlist item created",
      verified: false,
      outcome: "pending",
    });

    return id;
  },
});

/**
 * Update a watchlist item (title, description).
 */
export const update_watchlist_item = mutation({
  args: {
    watchlist_id: v.id("watchlist"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.watchlist_id);
    if (!item || item.user_id !== user_id) {
      throw new Error("Watchlist item not found or unauthorized");
    }

    const updates: Record<string, any> = {
      last_checked: Date.now(),
    };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.watchlist_id, updates);
  },
});

/**
 * Mark a watchlist item as completed or active.
 */
export const toggle_watchlist_status = mutation({
  args: {
    watchlist_id: v.id("watchlist"),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.watchlist_id);
    if (!item || item.user_id !== user_id) {
      throw new Error("Watchlist item not found or unauthorized");
    }

    const newStatus = item.status === "active" ? "completed" : "active";

    await ctx.db.patch(args.watchlist_id, {
      status: newStatus,
      last_checked: Date.now(),
    });

    // Log the status change
    await ctx.db.insert("logs", {
      watchlist_id: args.watchlist_id,
      timestamp: Date.now(),
      action: `Status changed to ${newStatus}`,
      verified: true,
      outcome: newStatus === "completed" ? "true" : "pending",
    });
  },
});

/**
 * Delete a watchlist item and its associated logs.
 */
export const delete_watchlist_item = mutation({
  args: { watchlist_id: v.id("watchlist") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.watchlist_id);
    if (!item || item.user_id !== user_id) {
      throw new Error("Watchlist item not found or unauthorized");
    }

    // Delete associated logs first
    const logs = await ctx.db
      .query("logs")
      .withIndex("by_watchlist", (q) => q.eq("watchlist_id", args.watchlist_id))
      .collect();

    await Promise.all(logs.map((log) => ctx.db.delete(log._id)));

    // Delete the watchlist item
    await ctx.db.delete(args.watchlist_id);
  },
});
