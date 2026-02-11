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

    const currentTokens = user.push_tokens || [];
    if (!currentTokens.includes(args.token)) {
      await ctx.db.patch(user_id, {
        push_tokens: [...currentTokens, args.token],
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
    if (!user || !user.push_tokens) return;

    const newTokens = user.push_tokens.filter((t) => t !== args.token);
    await ctx.db.patch(user_id, {
      push_tokens: newTokens,
    });
  },
});

export const getAllUsersWithTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("push_tokens"), undefined))
      .collect();

    return users.filter((u) => u.push_tokens && u.push_tokens.length > 0);
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

    await ctx.db.delete(user_id);
  },
});
