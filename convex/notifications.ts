import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get all notifications for the current user, newest first.
 */
export const get_notifications = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .order("desc")
      .collect();
  },
});

/**
 * Count of unread notifications for the current user.
 */
export const unread_count = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    return unread.length;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mark all notifications as seen + read for the current user.
 */
export const mark_all_read = mutation({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    await Promise.all(
      unread.map((n) => ctx.db.patch(n._id, { seen: true, read: true })),
    );
  },
});

/**
 * Internal mutation — save a notification to the DB and fire an Expo push.
 * Called from the firehose action after a verified headline is found.
 */
export const send_alert = internalMutation({
  args: {
    user_id: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("system"), v.literal("alert"), v.literal("info")),
  },
  handler: async (ctx, args) => {
    // 1. Save to notifications table
    await ctx.db.insert("notifications", {
      user_id: args.user_id,
      type: args.type,
      title: args.title,
      message: args.message,
      seen: false,
      read: false,
    });

    // 2. Look up user's push tokens and fire Expo push for each
    const user = await ctx.db.get(args.user_id);
    if (!user?.pushTokens || user.pushTokens.length === 0) return;

    const payload = {
      to: user.pushTokens,
      sound: "default",
      title: args.title,
      body: args.message,
      data: { type: args.type },
    };

    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(
          `Expo push failed for user ${args.user_id}: ${res.status}`,
        );
      } else {
        console.log(`Push sent to user ${args.user_id}: "${args.title}"`);
      }
    } catch (err) {
      console.error("Expo push fetch error:", err);
    }
  },
});
