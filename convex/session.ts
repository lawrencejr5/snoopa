import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// --- Queries ---

/**
 * List all chat sessions for the current user with their latest message.
 */
export const list_sessions = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_updated", (q) => q.eq("user_id", user_id))
      .order("desc")
      .collect();

    return await Promise.all(
      sessions.map(async (session) => {
        return {
          ...session,
          excerpt: "Session data...",
        };
      }),
    );
  },
});

/**
 * Get a specific session by ID.
 */
export const get_session = query({
  args: { session_id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return null;

    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== user_id) {
      return null;
    }

    return session;
  },
});

// --- Mutations ---

/**
 * Internal mutation to create a new session (called from send_message action).
 */
export const create_session = internalMutation({
  args: { user_id: v.id("users"), title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      user_id: args.user_id,
      title: args.title,
      active: true,
      last_updated: Date.now(),
    });
  },
});

/**
 * Internal mutation to update session title (called after AI generates a title).
 */
export const set_title = internalMutation({
  args: { session_id: v.id("sessions"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.session_id, { title: args.title });
  },
});

/**
 * Mutation to delete a session and its messages.
 */
export const delete_session = mutation({
  args: { session_id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== user_id) {
      throw new Error("Unauthorized");
    }

    // Note: session_id was removed from watchlist table, so we can't delete linked watchlists here anymore
    await ctx.db.delete(args.session_id);
  },
});

/**
 * Mutation to update a session (e.g. rename).
 */
export const update_session = mutation({
  args: {
    session_id: v.id("sessions"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== user_id) {
      throw new Error("Unauthorized");
    }

    const updates: any = { last_updated: Date.now() };
    if (args.title !== undefined) updates.title = args.title;

    await ctx.db.patch(args.session_id, updates);
  },
});
