import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

// Helper for hashing password using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_snoopa_admin_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate random session token
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

export const signUpAdmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("admin_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();

    if (existing) {
      throw new Error("An admin account with this email already exists.");
    }

    const password_hash = await hashPassword(args.password);
    const now = Date.now();

    const adminId = await ctx.db.insert("admin_users", {
      email: args.email.toLowerCase().trim(),
      password_hash,
      name: args.name || args.email.split("@")[0],
      created_at: now,
    });

    const token = generateToken();
    const expires_at = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("admin_sessions", {
      admin_id: adminId,
      token,
      expires_at,
    });

    return {
      token,
      admin: {
        id: adminId,
        email: args.email,
        name: args.name || args.email.split("@")[0],
      },
    };
  },
});

export const signInAdmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("admin_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();

    if (!admin) {
      throw new Error("Invalid email or password.");
    }

    const password_hash = await hashPassword(args.password);
    if (admin.password_hash !== password_hash) {
      throw new Error("Invalid email or password.");
    }

    const token = generateToken();
    const now = Date.now();
    const expires_at = now + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("admin_sessions", {
      admin_id: admin._id,
      token,
      expires_at,
    });

    return {
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name || admin.email.split("@")[0],
      },
    };
  },
});

export const verifyAdminSession = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return { valid: false };

    const session = await ctx.db
      .query("admin_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token!))
      .first();

    if (!session || session.expires_at < Date.now()) {
      return { valid: false };
    }

    const admin = await ctx.db.get(session.admin_id);
    if (!admin) return { valid: false };

    return {
      valid: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name || admin.email.split("@")[0],
      },
    };
  },
});

export const signOutAdmin = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("admin_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
    return { success: true };
  },
});

// ==========================================
// ANALYTICS & DASHBOARD STATS
// ==========================================

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const [users, watchlists, waitlist, feedbacks, snoops, adViews, authAccounts] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("watchlist").collect(),
      ctx.db.query("waitlist").collect(),
      ctx.db.query("feedbacks").collect(),
      ctx.db.query("snoops").collect(),
      ctx.db.query("ad_views").collect(),
      ctx.db.query("authAccounts").collect(),
    ]);

    const tierCounts = {
      free: 0,
      pro: 0,
      supa: 0,
      max: 0,
    };

    let totalPremium = 0;
    let iosCount = 0;
    let androidCount = 0;
    let webCount = 0;
    const countryCounts: Record<string, number> = {};

    const appleUsers = new Set<string>();
    authAccounts.forEach((acc) => {
      if (acc.userId && acc.provider === "apple") appleUsers.add(acc.userId);
    });

    users.forEach((u: any) => {
      const tier = u.sub_tier || u.plan || "free";
      if (tier in tierCounts) {
        tierCounts[tier as keyof typeof tierCounts]++;
      }
      if (u.is_premium || tier !== "free") {
        totalPremium++;
      }

      // Calculate OS from DB field or Apple Auth / Push tokens
      const userOs = u.os || (appleUsers.has(u._id) ? "ios" : (u.pushTokens && u.pushTokens.length > 0 ? "ios" : "android"));
      if (userOs === "ios") iosCount++;
      else if (userOs === "android") androidCount++;
      else webCount++;

      // Country count
      const c = u.country || "US";
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });

    const storeSplit = [
      { name: "iOS", value: iosCount || 1, color: "#6aaa66" },
      { name: "Android", value: androidCount || 1, color: "#F4D03F" },
      ...(webCount > 0 ? [{ name: "Web App", value: webCount, color: "#e2e2bb" }] : []),
    ];

    const countryDistribution = Object.entries(countryCounts).map(([code, count]) => ({
      country: code === "US" ? "United States" : code === "GB" ? "United Kingdom" : code === "NG" ? "Nigeria" : code,
      code,
      count,
    }));

    const watchlistStatus = {
      active: 0,
      completed: 0,
      inactive: 0,
    };

    watchlists.forEach((w) => {
      if (w.status in watchlistStatus) {
        watchlistStatus[w.status]++;
      }
    });

    const totalSnoopsRemaining = snoops.reduce((acc, s) => acc + (s.remaining || 0), 0);

    return {
      totalUsers: users.length,
      totalPremiumUsers: totalPremium,
      tierCounts,
      totalWatchlists: watchlists.length,
      watchlistStatus,
      totalWaitlist: waitlist.length,
      totalFeedbacks: feedbacks.length,
      totalSnoopsRemaining,
      totalAdViews: adViews.length,
      storeSplit,
      countryDistribution: countryDistribution.length > 0 ? countryDistribution : [{ country: "United States", code: "US", count: users.length }],
      recentUsers: users
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 5)
        .map((u) => ({
          id: u._id,
          email: u.email,
          fullname: u.fullname,
          sub_tier: u.sub_tier || u.plan || "free",
          created_at: u._creationTime,
        })),
    };
  },
});

// ==========================================
// CUSTOMER EXPLORER
// ==========================================

export const getUsers = query({
  args: {
    search: v.optional(v.string()),
    tierFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();

    if (args.search) {
      const term = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.fullname.toLowerCase().includes(term) ||
          (u.username && u.username.toLowerCase().includes(term))
      );
    }

    if (args.tierFilter && args.tierFilter !== "all") {
      users = users.filter((u) => (u.sub_tier || u.plan || "free") === args.tierFilter);
    }

    users.sort((a, b) => b._creationTime - a._creationTime);

    // Join watchlist counts, snoops balance, sessions (last_seen), and authAccounts (os)
    const [watchlists, snoops, sessions, authAccounts] = await Promise.all([
      ctx.db.query("watchlist").collect(),
      ctx.db.query("snoops").collect(),
      ctx.db.query("sessions").collect(),
      ctx.db.query("authAccounts").collect(),
    ]);

    const wlCountMap = new Map<string, number>();
    watchlists.forEach((wl) => {
      wlCountMap.set(wl.user_id, (wlCountMap.get(wl.user_id) || 0) + 1);
    });

    const snoopsMap = new Map<string, number>();
    snoops.forEach((s) => {
      snoopsMap.set(s.user_id, (snoopsMap.get(s.user_id) || 0) + (s.remaining || 0));
    });

    const lastSeenMap = new Map<string, number>();
    sessions.forEach((sess) => {
      const prev = lastSeenMap.get(sess.user_id) || 0;
      const latest = Math.max(sess.last_updated || 0, sess.last_read_at || 0, prev);
      lastSeenMap.set(sess.user_id, latest);
    });

    const appleUsers = new Set<string>();
    authAccounts.forEach((acc) => {
      if (acc.userId && acc.provider === "apple") appleUsers.add(acc.userId);
    });

    return users.map((u: any) => {
      const dbOs = u.os ? (u.os === "ios" ? "iOS" : u.os === "android" ? "Android" : "Web") : null;
      const os = dbOs || (appleUsers.has(u._id) ? "iOS" : (u.pushTokens && u.pushTokens.length > 0 ? "iOS" : "Android"));
      const lastSeen = u.last_seen || lastSeenMap.get(u._id) || u._creationTime;

      return {
        ...u,
        watchlistCount: wlCountMap.get(u._id) || 0,
        snoopsRemaining: snoopsMap.get(u._id) || 0,
        sub_tier: u.sub_tier || u.plan || "free",
        lastSeen: lastSeen,
        os: os,
        country: u.country || "US",
      };
    });
  },
});

export const getUserDetails = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) return null;

    const [watchlists, snoopsList, adViews, feedbacks, notifications] = await Promise.all([
      ctx.db
        .query("watchlist")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .collect(),
      ctx.db
        .query("snoops")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .collect(),
      ctx.db
        .query("ad_views")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .collect(),
      ctx.db
        .query("feedbacks")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .collect(),
    ]);

    // Gather chats for user's watchlists
    let chats: Doc<"chats">[] = [];
    if (watchlists.length > 0) {
      const chatPromises = watchlists.map((wl) =>
        ctx.db
          .query("chats")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id))
          .collect()
      );
      const chatArrays = await Promise.all(chatPromises);
      chats = chatArrays.flat();
    }

    return {
      user,
      watchlists,
      snoopsList,
      adViews,
      feedbacks,
      notifications,
      chats,
    };
  },
});

export const updateUserPlan = mutation({
  args: {
    user_id: v.id("users"),
    sub_tier: v.union(v.literal("free"), v.literal("pro"), v.literal("supa"), v.literal("max")),
    is_premium: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new Error("User not found");

    const plan = args.sub_tier === "free" ? "free" : "pro";

    await ctx.db.patch(args.user_id, {
      sub_tier: args.sub_tier,
      plan: plan,
      is_premium: args.is_premium,
      date_of_sub: args.is_premium ? Date.now() : undefined,
    });

    return { success: true };
  },
});

export const deleteUserAdmin = mutation({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new Error("User not found");

    // Clean up watchlists & dependencies
    const watchlists = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    for (const wl of watchlists) {
      const [logs, chats, sources, monitoredSources, notifications, processedHeadlines] =
        await Promise.all([
          ctx.db.query("logs").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
          ctx.db.query("chats").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
          ctx.db.query("sources").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
          ctx.db.query("monitored_sources").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
          ctx.db.query("notifications").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
          ctx.db.query("processed_headlines").withIndex("by_watchlist", (q) => q.eq("watchlist_id", wl._id)).collect(),
        ]);

      await Promise.all([
        ...logs.map((item) => ctx.db.delete(item._id)),
        ...chats.map((item) => ctx.db.delete(item._id)),
        ...sources.map((item) => ctx.db.delete(item._id)),
        ...monitoredSources.map((item) => ctx.db.delete(item._id)),
        ...notifications.map((item) => ctx.db.delete(item._id)),
        ...processedHeadlines.map((item) => ctx.db.delete(item._id)),
        ctx.db.delete(wl._id),
      ]);
    }

    // Delete user level data
    const [sessions, userNotifications, snoops, adViews, feedbacks] = await Promise.all([
      ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("user_id", args.user_id)).collect(),
      ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("user_id", args.user_id)).collect(),
      ctx.db.query("snoops").withIndex("by_user", (q) => q.eq("user_id", args.user_id)).collect(),
      ctx.db.query("ad_views").withIndex("by_user", (q) => q.eq("user_id", args.user_id)).collect(),
      ctx.db.query("feedbacks").withIndex("by_user", (q) => q.eq("user_id", args.user_id)).collect(),
    ]);

    await Promise.all([
      ...sessions.map((s) => ctx.db.delete(s._id)),
      ...userNotifications.map((n) => ctx.db.delete(n._id)),
      ...snoops.map((s) => ctx.db.delete(s._id)),
      ...adViews.map((a) => ctx.db.delete(a._id)),
      ...feedbacks.map((f) => ctx.db.delete(f._id)),
      ctx.db.delete(args.user_id),
    ]);

    return { success: true };
  },
});

// ==========================================
// UNIVERSAL DATABASE TABLE MANAGER (CRUD)
// ==========================================

export const getTableRecords = query({
  args: {
    tableName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxLimit = args.limit || 100;
    const table = args.tableName as any;

    try {
      const records = await ctx.db.query(table).take(maxLimit);
      return {
        success: true,
        tableName: args.tableName,
        records,
        count: records.length,
      };
    } catch (err: any) {
      return {
        success: false,
        tableName: args.tableName,
        error: err.message || "Failed to query table",
        records: [],
        count: 0,
      };
    }
  },
});

export const createTableRecord = mutation({
  args: {
    tableName: v.string(),
    recordData: v.any(),
  },
  handler: async (ctx, args) => {
    const table = args.tableName as any;
    const id = await ctx.db.insert(table, args.recordData);
    return { success: true, id };
  },
});

export const updateTableRecord = mutation({
  args: {
    tableName: v.string(),
    recordId: v.string(),
    patchData: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recordId as any, args.patchData);
    return { success: true };
  },
});

export const deleteTableRecord = mutation({
  args: {
    recordId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.recordId as any);
    return { success: true };
  },
});


