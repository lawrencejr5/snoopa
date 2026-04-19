import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

import { getAuthUserId } from "@convex-dev/auth/server";

export const get_current_user = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (user_id === null) return null;

    const user = await ctx.db.get(user_id);
    if (!user) return null;

    return user;
  },
});

export const storePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const user = await ctx.db.get(user_id);
    if (!user) return;

    const currentTokens = user.pushTokens || [];
    if (!currentTokens.includes(args.token)) {
      await ctx.db.patch(user_id, {
        pushTokens: [...currentTokens, args.token],
      });
    }
  },
});

export const removePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const user = await ctx.db.get(user_id);
    if (!user || !user.pushTokens) return;

    const newTokens = user.pushTokens.filter((t) => t !== args.token);
    await ctx.db.patch(user_id, {
      pushTokens: newTokens,
    });
  },
});

export const getAllUsersWithTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("pushTokens"), undefined))
      .collect();

    return users.filter((u) => u.pushTokens && u.pushTokens.length > 0);
  },
});

export const get_push_tokens = internalQuery({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    return user?.pushTokens ?? [];
  },
});

export const updateUser = mutation({
  args: {
    fullname: v.optional(v.string()),
    username: v.optional(v.string()),
    memory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const user = await ctx.db.get(user_id);
    if (!user) throw new Error("User not found");

    const updates: Partial<typeof user> = {};
    if (args.fullname !== undefined) updates.fullname = args.fullname;
    if (args.username !== undefined) updates.username = args.username;
    if (args.memory !== undefined) updates.memory = args.memory;

    await ctx.db.patch(user_id, updates);
  },
});

export const deleteUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const user = await ctx.db.get(user_id);
    if (!user) throw new Error("User not found");

    // 1. Delete all watchlists and their associated data
    const watchlists = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .collect();

    for (const wl of watchlists) {
      // For each watchlist, find all related data
      const [logs, chats, sources, monitoredSources, notifications, processedHeadlines] = await Promise.all([
        ctx.db.query("logs").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
        ctx.db.query("chats").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
        ctx.db.query("sources").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
        ctx.db.query("monitored_sources").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
        ctx.db.query("notifications").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
        ctx.db.query("processed_headlines").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
      ]);

      await Promise.all([
        ...logs.map((log) => ctx.db.delete(log._id)),
        ...chats.map((chat) => ctx.db.delete(chat._id)),
        ...sources.map((s) => ctx.db.delete(s._id)),
        ...monitoredSources.map((ms) => ctx.db.delete(ms._id)),
        ...notifications.map((n) => ctx.db.delete(n._id)),
        ...processedHeadlines.map((ph) => ctx.db.delete(ph._id)),
      ]);
      await ctx.db.delete(wl._id);
    }

    // 2. Delete user-level data (sessions and general notifications)
    const [sessions, userNotifications] = await Promise.all([
      ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("user_id", user_id)).collect(),
      ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("user_id", user_id)).collect(),
    ]);

    await Promise.all([
      ...sessions.map((s) => ctx.db.delete(s._id)),
      ...userNotifications.map((n) => ctx.db.delete(n._id)),
    ]);

    // 2.5 Delete auth accounts
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user_id))
      .collect();

    await Promise.all(authAccounts.map((a) => ctx.db.delete(a._id)));

    // 3. Delete the user record itself
    await ctx.db.delete(user_id);
  },
});
