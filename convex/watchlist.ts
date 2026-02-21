import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// --- Queries ---

/**
 * Get all watchlist items for the current user.
 */
export const get_watchlists = query({
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

/**
 * Get all message IDs that have been saved as watchlist items for the current user.
 * Used to show which messages have already been saved.
 */
export const get_saved_message_ids = query({
  args: { session_id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return [];

    const watchlistItems = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .collect();

    // Filter for items that have message_id and belong to this session
    const messageIds: string[] = [];
    for (const item of watchlistItems) {
      if (item.message_id) {
        // Verify the message belongs to this session
        const message = await ctx.db.get(item.message_id);
        if (message && message.session_id === args.session_id) {
          messageIds.push(item.message_id);
        }
      }
    }

    return messageIds;
  },
});

/**
 * Get the last 20 unique canonical topics from all watchlist items.
 * Used as context when generating new watchlist items in the chat.
 */
export const get_recent_canonical_topics = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("watchlist").order("desc").collect(); // take a large enough sample to find 20 unique topics

    const seen = new Set<string>();
    const topics: string[] = [];

    for (const item of items) {
      if (item.canonical_topic && !seen.has(item.canonical_topic)) {
        seen.add(item.canonical_topic);
        topics.push(item.canonical_topic);
        if (topics.length === 20) break;
      }
    }

    return topics;
  },
});

/**
 * Internal mutation to add a watchlist item (called from chat action).
 */
export const add_watchlist_item = mutation({
  args: {
    user_id: v.id("users"),
    title: v.string(),
    keywords: v.array(v.string()),
    condition: v.string(),
    canonical_topic: v.optional(v.string()),
    sources: v.optional(v.array(v.string())),
    message_id: v.optional(v.id("chats")),
    session_id: v.optional(v.id("sessions")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("watchlist", {
      user_id: args.user_id,
      title: args.title,
      keywords: args.keywords,
      condition: args.condition,
      canonical_topic: args.canonical_topic,
      status: "active",
      last_checked: Date.now(),
      sources: args.sources ?? [],
      message_id: args.message_id,
      session_id: args.session_id,
    });

    // Create an initial log entry
    await ctx.db.insert("logs", {
      watchlist_id: id,
      timestamp: Date.now(),
      action: "Watchlist item created",
      verified: true,
      session_id: args.session_id,
    });

    return id;
  },
});

/**
 * Update a watchlist item (title, keywords, condition).
 */
export const update_watchlist_item = mutation({
  args: {
    watchlist_id: v.id("watchlist"),
    title: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    condition: v.optional(v.string()),
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
    if (args.keywords !== undefined) updates.keywords = args.keywords;
    if (args.condition !== undefined) updates.condition = args.condition;

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
