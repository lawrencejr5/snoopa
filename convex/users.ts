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
