import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

import { getAuthUserId } from "@convex-dev/auth/server";

export const get_user_internal = internalQuery({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.user_id);
  },
});

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

    const current_tokens = user.pushTokens || [];
    if (!current_tokens.includes(args.token)) {
      await ctx.db.patch(user_id, {
        pushTokens: [...current_tokens, args.token],
      });
    }
  },
});

export const set_notifications_enabled = mutation({
  args: {
    enabled: v.boolean(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const user = await ctx.db.get(user_id);
    if (!user) return;

    const patch: { notifications_enabled: boolean; pushTokens?: string[] } = {
      notifications_enabled: args.enabled,
    };

    if (args.enabled && args.token) {
      const current_tokens = user.pushTokens || [];
      if (!current_tokens.includes(args.token)) {
        patch.pushTokens = [...current_tokens, args.token];
      }
    }

    await ctx.db.patch(user_id, patch);
  },
});

export const removePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const user = await ctx.db.get(user_id);
    if (!user || !user.pushTokens) return;

    const new_tokens = user.pushTokens.filter((t) => t !== args.token);
    await ctx.db.patch(user_id, {
      pushTokens: new_tokens,
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

    return users.filter(
      (u) =>
        u.notifications_enabled !== false &&
        u.pushTokens &&
        u.pushTokens.length > 0,
    );
  },
});

export const get_push_tokens = internalQuery({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user || user.notifications_enabled === false) return [];
    return user.pushTokens ?? [];
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

export const save_referral_source = mutation({
  args: {
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const user = await ctx.db.get(user_id);
    if (!user) return;

    await ctx.db.patch(user_id, {
      referral_source: args.source,
    });
  },
});

export const update_app_load_metadata = mutation({
  args: {
    os: v.optional(
      v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
    ),
    country: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    last_seen: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return;

    const user = await ctx.db.get(user_id);
    if (!user) return;

    const updates: {
      os?: "ios" | "android" | "web";
      country?: string;
      last_seen?: number;
    } = {};

    if (args.os !== undefined) updates.os = args.os;

    let country_name = args.country;
    const country_code = args.countryCode;

    if (country_name && country_name.length === 2) {
      try {
        const display_names = new Intl.DisplayNames(["en"], { type: "region" });
        country_name =
          display_names.of(country_name.toUpperCase()) || country_name;
      } catch {
        // fallback
      }
    }

    if (country_name !== undefined) updates.country = country_name;

    if (country_code !== undefined && country_name) {
      // Dynamically register the country in active_countries if not exists
      const existing_country = await ctx.db
        .query("active_countries")
        .withIndex("by_code", (q) => q.eq("code", country_code as string))
        .first();

      if (!existing_country) {
        await ctx.db.insert("active_countries", {
          name: country_name,
          code: country_code,
          gl: country_code,
          hl: `en-${country_code}`,
          status: "active",
        });
      } else if (
        existing_country.name &&
        existing_country.name.length === 2 &&
        country_name.length > 2
      ) {
        await ctx.db.patch(existing_country._id, {
          name: country_name,
        });
      }
    }
    if (args.last_seen !== undefined) updates.last_seen = args.last_seen;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user_id, updates);
    }
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
      const [
        logs,
        chats,
        sources,
        monitoredSources,
        notifications,
        processedHeadlines,
      ] = await Promise.all([
        ctx.db
          .query("logs")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id))
          .collect(),
        ctx.db
          .query("chats")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id))
          .collect(),
        ctx.db
          .query("sources")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id))
          .collect(),
        ctx.db
          .query("monitored_sources")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id))
          .collect(),
        ctx.db
          .query("notifications")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id))
          .collect(),
        ctx.db
          .query("processed_headlines")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id))
          .collect(),
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

    // 2. Delete user-level data (sessions, notifications, snoops, ad_views)
    const [sessions, userNotifications, snoops, adViews] = await Promise.all([
      ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("user_id", user_id))
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("user_id", user_id))
        .collect(),
      ctx.db
        .query("snoops")
        .withIndex("by_user", (q) => q.eq("user_id", user_id))
        .collect(),
      ctx.db
        .query("ad_views")
        .withIndex("by_user", (q) => q.eq("user_id", user_id))
        .collect(),
    ]);

    await Promise.all([
      ...sessions.map((s) => ctx.db.delete(s._id)),
      ...userNotifications.map((n) => ctx.db.delete(n._id)),
      ...snoops.map((sn) => ctx.db.delete(sn._id)),
      ...adViews.map((av) => ctx.db.delete(av._id)),
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

export const check_apple_user = query({
  args: { apple_user_id: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "apple").eq("providerAccountId", args.apple_user_id),
      )
      .unique();

    if (account !== null) {
      return { exists: true };
    }

    const users = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .collect();

    if (users.length > 0) {
      return { exists: true };
    }

    return { exists: false };
  },
});
