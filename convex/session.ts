import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .order("desc")
      .collect();

    return await Promise.all(
      sessions.map(async (session) => {
        const last_message = await ctx.db
          .query("chats")
          .withIndex("by_session", (q) => q.eq("session_id", session._id))
          .order("desc")
          .first();

        return {
          ...session,
          excerpt: last_message?.content || "No messages yet...",
        };
      }),
    );
  },
});

// --- Mutations ---

/**
 * Mutation to create a new session.
 */
export const create_session = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    return await ctx.db.insert("sessions", {
      user_id,
      title: args.title,
      active: true,
      last_updated: Date.now(),
    });
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

    // Delete all messages in the session
    const messages = await ctx.db
      .query("chats")
      .withIndex("by_session", (q) => q.eq("session_id", args.session_id))
      .collect();

    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));

    // Delete the session itself
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
