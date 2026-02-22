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
 * Count of unseen notifications — drives the bell red dot.
 * Clears once the user opens the notifications screen (mark_all_seen).
 */
export const unread_count = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return 0;

    const unseen = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .filter((q) => q.eq(q.field("seen"), false))
      .collect();

    return unseen.length;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mark all notifications as SEEN (not read) — called when the screen opens.
 * Clears the bell red dot without marking individual cards as read.
 */
export const mark_all_seen = mutation({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const unseen = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .filter((q) => q.eq(q.field("seen"), false))
      .collect();

    await Promise.all(unseen.map((n) => ctx.db.patch(n._id, { seen: true })));
  },
});

/**
 * Mark all notifications as seen + read — full clear.
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
 * Mark a single notification as read — called when the user taps it.
 */
export const mark_read = mutation({
  args: { notification_id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const notification = await ctx.db.get(args.notification_id);
    if (!notification || notification.user_id !== user_id) return;

    await ctx.db.patch(args.notification_id, { seen: true, read: true });
  },
});

/**
 * Internal mutation — only saves a notification record to the DB.
 * fetch() is NOT allowed in mutations, so push delivery is handled
 * separately via sendExpoPush() called directly from the firehose action.
 */
export const save_notification = internalMutation({
  args: {
    user_id: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("system"), v.literal("alert"), v.literal("info")),
    watchlist_id: v.optional(v.id("watchlist")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      user_id: args.user_id,
      type: args.type,
      title: args.title,
      message: args.message,
      seen: false,
      read: false,
      watchlist_id: args.watchlist_id,
    });
  },
});

// ---------------------------------------------------------------------------
// Plain async helper — called directly from actions (fetch is allowed there)
// ---------------------------------------------------------------------------

/**
 * Fire an Expo push notification to one or more device tokens.
 * Must be called from an action, not a mutation or query.
 */
export async function sendExpoPush(
  pushTokens: string[],
  title: string,
  message: string,
) {
  if (pushTokens.length === 0) return;

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushTokens,
        sound: "default",
        title,
        body: message,
        data: { type: "alert" },
      }),
    });

    if (!res.ok) {
      console.error(`Expo push failed: ${res.status} ${res.statusText}`);
    } else {
      console.log(`Push sent: "${title}"`);
    }
  } catch (err) {
    console.error("Expo push error:", err);
  }
}
