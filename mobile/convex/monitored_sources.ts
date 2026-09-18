import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const save_monitored_source_and_link = internalMutation({
  args: {
    url: v.string(),
    watchlist_id: v.id("watchlist"),
    status: v.union(v.literal("success"), v.literal("failure")),
    last_snapshot: v.optional(v.string()),
    last_hash: v.optional(v.string()),
    source_weight: v.optional(
      v.union(v.literal("primary"), v.literal("secondary")),
    ),
  },
  handler: async (ctx, args) => {
    let action_text = "";
    let hostname = "Source";
    try {
      hostname = new URL(args.url).hostname;
    } catch {}

    if (
      args.status === "success" &&
      args.last_snapshot &&
      args.last_hash &&
      args.source_weight
    ) {
      const monitored_source_id = await ctx.db.insert("monitored_sources", {
        watchlist_id: args.watchlist_id,
        url: args.url,
        last_snapshot: args.last_snapshot,
        last_hash: args.last_hash,
        source_weight: args.source_weight,
      });

      const watchlist = await ctx.db.get(args.watchlist_id);
      if (watchlist) {
        const sources = watchlist.sources || [];
        sources.push(monitored_source_id as string);
        await ctx.db.patch(args.watchlist_id, { sources });
      }

      action_text = `Source saved successfully: ${hostname}`;
    } else {
      action_text = `Failed to save source: ${hostname}`;
    }

    // Save system log
    await ctx.db.insert("logs", {
      watchlist_id: args.watchlist_id,
      timestamp: Date.now(),
      action: action_text,
      seen: true,
      type: args.status === "success" ? "success" : "error",
    });

    return args.status === "success";
  },
});

export const get_monitored_sources = query({
  args: { watchlist_id: v.id("watchlist") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("monitored_sources")
      .withIndex("by_watchlist", (q) => q.eq("watchlist_id", args.watchlist_id))
      .collect();
  },
});

export const update_monitored_source_hash = internalMutation({
  args: {
    monitored_source_id: v.id("monitored_sources"),
    last_snapshot: v.string(),
    last_hash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.monitored_source_id, {
      last_snapshot: args.last_snapshot,
      last_hash: args.last_hash,
    });
  },
});

export const delete_monitored_source = mutation({
  args: { monitored_source_id: v.id("monitored_sources") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const source = await ctx.db.get(args.monitored_source_id);
    if (!source) throw new Error("Source not found");

    const watchlist = await ctx.db.get(source.watchlist_id);
    if (!watchlist || watchlist.user_id !== user_id) {
      throw new Error("Unauthorized");
    }

    // 1. Remove from watchlist.sources array
    const updatedSources = (watchlist.sources || []).filter(
      (id) => id !== (args.monitored_source_id as string),
    );
    await ctx.db.patch(source.watchlist_id, { sources: updatedSources });

    // 2. Delete the source record
    await ctx.db.delete(args.monitored_source_id);

    // 3. Log the deletion
    let hostname = "Source";
    try {
      hostname = new URL(source.url).hostname;
    } catch {}

    await ctx.db.insert("logs", {
      watchlist_id: source.watchlist_id,
      timestamp: Date.now(),
      action: `Source deleted: ${hostname}`,
      seen: true,
      type: "system",
    });
  },
});
