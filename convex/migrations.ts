import { internalMutation } from "./_generated/server";

export const migrateWatchlist = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("watchlist").collect();
    let count = 0;

    for (const item of items) {
      const dbItem: any = item;
      const updates: any = {};
      
      if (dbItem.serper_type !== undefined) {
        updates.search_type = dbItem.serper_type === "news" ? "news" : "general";
        updates.serper_type = undefined; // Deletes the field
      }
      
      if (dbItem.serper_date_range !== undefined) {
        updates.time_range = dbItem.serper_date_range;
        updates.serper_date_range = undefined; // Deletes the field
      }
      
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(item._id, updates);
        count++;
      }
    }
    
    return `Migrated ${count} watchlist items.`;
  },
});

export const migrate_logs_to_sources = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("logs").collect();
    let migratedCount = 0;

    for (const log of logs) {
      if ((log as any).type === "source" && (log as any).chat_id) {
        await ctx.db.insert("sources", {
          chat_id: (log as any).chat_id,
          title: log.action,
          url: (log as any).url,
        });
        migratedCount++;
      }
    }

    return `Migrated ${migratedCount} source logs to sources table`;
  },
});

export const clean_up_logs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("logs").collect();
    let deletedCount = 0;
    let convertedCount = 0;

    for (const log of logs) {
      if ((log as any).type === "source") {
        // We moved them to the sources table in the previous step
        await ctx.db.delete(log._id);
        deletedCount++;
      } else {
        // It's a system log or unspecified, convert to success/error
        const isError = log.action.toLowerCase().includes("failed");
        const newType = isError ? "error" : "success";

        await ctx.db.patch(log._id, {
          type: newType,
          url: undefined,
          verified: undefined,
          session_id: undefined,
          chat_id: undefined,
        } as any);

        convertedCount++;
      }
    }

    return `Cleaned up logs: deleted ${deletedCount} sources, converted ${convertedCount} to success/error.`;
  },
});

export const remove_watchlist_id_from_sources = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();
    let count = 0;
    for (const source of sources) {
      if ((source as any).watchlist_id !== undefined) {
        await ctx.db.patch(source._id, { watchlist_id: undefined } as any);
        count++;
      }
    }
    return `Cleared watchlist_id from ${count} sources.`;
  },
});
