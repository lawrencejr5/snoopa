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

export const migrate_chat_types = internalMutation({
  args: {},
  handler: async (ctx) => {
    const chats = await ctx.db.query("chats").collect();
    let count = 0;
    for (const chat of chats) {
      if (chat.type === undefined) {
        await ctx.db.patch(chat._id, { type: "chat" });
        count++;
      }
    }
    return `Migrated ${count} chats to type 'chat'.`;
  },
});

export const migrate_chats_session_to_watchlist = internalMutation({
  args: {},
  handler: async (ctx) => {
    const watchlists = await ctx.db.query("watchlist").collect();
    let chatUpdateCount = 0;
    let sessionClearCount = 0;

    // 1. Map chats with session_id to their watchlist_id
    for (const watchlist of watchlists) {
      const dbWl = watchlist as any;
      if (dbWl.session_id) {
        const chats = await ctx.db
          .query("chats")
          .collect();
        const filteredChats = chats.filter((c: any) => c.session_id === dbWl.session_id);

        for (const chat of filteredChats) {
          if (!chat.watchlist_id) {
            await ctx.db.patch(chat._id, { watchlist_id: watchlist._id });
            chatUpdateCount++;
          }
        }
      }
    }

    // 2. Clear all session_id from all chats
    const allChats = await ctx.db.query("chats").collect();
    for (const chat of allChats) {
      if ((chat as any).session_id !== undefined) {
        await ctx.db.patch(chat._id, { session_id: undefined } as any);
        sessionClearCount++;
      }
    }

    // 3. Delete every chat where watchlist_id is empty
    const finalChats = await ctx.db.query("chats").collect();
    let deleteCount = 0;
    for (const chat of finalChats) {
      if (!chat.watchlist_id) {
        await ctx.db.delete(chat._id);
        deleteCount++;
      }
    }

    return `Updated ${chatUpdateCount} chats with watchlist IDs, cleared ${sessionClearCount} session IDs, and deleted ${deleteCount} orphaned chats.`;
  },
});

export const wipe_watchlist_ids = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("watchlist").collect();
    let count = 0;
    for (const item of items) {
      if ((item as any).message_id !== undefined || (item as any).session_id !== undefined) {
        await ctx.db.patch(item._id, {
          message_id: undefined,
          session_id: undefined,
        } as any);
        count++;
      }
    }
    return `Wiped IDs from ${count} watchlist items.`;
  },
});
