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

export const migrate_logs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("logs").collect();
    let updatedCount = 0;

    for (const log of logs) {
      if (log.type === undefined) {
        if (log.url) {
          // It has an url, brand as source
          await ctx.db.patch(log._id, { type: "source" });
        } else {
          // No url, brand as system
          await ctx.db.patch(log._id, { type: "system" });
        }
        updatedCount++;
      }
    }

    return `Migrated ${updatedCount} logs`;
  },
});

export const migrate_logs_chat_id = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("logs")
      .filter((q) => q.eq(q.field("type"), "source"))
      .collect();

    let updatedCount = 0;

    for (const log of logs) {
      if (!log.chat_id) {
        // Fetch watchlist to get session_id
        const item = await ctx.db.get(log.watchlist_id);
        if (!item || !item.session_id) continue;

        // Fetch chats for this session
        const chats = await ctx.db
          .query("chats")
          .withIndex("by_session", (q) => q.eq("session_id", item.session_id!))
          .filter((q) => q.eq(q.field("role"), "snoopa"))
          .collect();

        // Find the closest chat in time (within ~60 seconds)
        let closestChatId = null;
        let minDiff = 60000; // 60 seconds max

        for (const chat of chats) {
          const diff = Math.abs(chat._creationTime - log.timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestChatId = chat._id;
          }
        }

        if (closestChatId) {
          await ctx.db.patch(log._id, { chat_id: closestChatId });
          updatedCount++;
        }
      }
    }

    return `Migrated ${updatedCount} source logs with chat IDs`;
  },
});
