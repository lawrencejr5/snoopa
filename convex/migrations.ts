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
      const dbLog = log as any;
      if (dbLog.type === "source" && dbLog.chat_id) {
        const chat = (await ctx.db.get(dbLog.chat_id)) as any;
        if (chat && chat.watchlist_id) {
          await ctx.db.insert("sources", {
            watchlist_id: chat.watchlist_id,
            chat_id: dbLog.chat_id,
            title: log.action,
            url: dbLog.url,
          });
          migratedCount++;
        }
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

export const backfill_watchlist_id_to_sources = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();
    let count = 0;
    for (const source of sources) {
      if (!(source as any).watchlist_id) {
        const chat = await ctx.db.get(source.chat_id);
        if (chat && chat.watchlist_id) {
          await ctx.db.patch(source._id, { watchlist_id: chat.watchlist_id });
          count++;
        }
      }
    }
    return `Backfilled watchlist_id for ${count} sources.`;
  },
});

// ---------------------------------------------------------------------------
// Snoop Economy Migrations
// ---------------------------------------------------------------------------

/**
 * Sets sub_tier = "free" and is_premium = false for every user
 * that doesn't already have these fields set.
 */
export const seed_free_users = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let count = 0;

    for (const user of users) {
      const db_user = user as any;
      if (db_user.sub_tier === undefined || db_user.is_premium === undefined) {
        await ctx.db.patch(user._id, {
          sub_tier: "free",
          is_premium: false,
        } as any);
        count++;
      }
    }

    return `Set free tier on ${count} users.`;
  },
});

/**
 * Creates a 30-snoop "free" grant expiring at the end of the current calendar
 * month for every user that does not already have a free/monthly grant
 * active for this month.
 */
export const seed_free_snoops = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Compute end-of-month timestamp (UTC)
    const nowDate = new Date(now);
    const end_of_month = new Date(
      Date.UTC(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    ).getTime();

    // Start-of-month for checking existing grants
    const start_of_month = new Date(
      Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1),
    ).getTime();

    const users = await ctx.db.query("users").collect();
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if the user already has a free or monthly grant for this month
      const existing_grants = await ctx.db
        .query("snoops")
        .withIndex("by_user", (q) => q.eq("user_id", user._id))
        .collect();

      const has_current_grant = existing_grants.some(
        (g) =>
          (g.type === "free" || g.type === "monthly") &&
          g.expiration_date !== undefined &&
          g.expiration_date >= start_of_month,
      );

      if (has_current_grant) {
        skipped++;
        continue;
      }

      await ctx.db.insert("snoops", {
        user_id: user._id,
        snoops: 30,
        remaining: 30,
        type: "free",
        expiration_date: end_of_month,
      });
      created++;
    }

    return `Created free snoop grants for ${created} users, skipped ${skipped} (already had a grant this month).`;
  },
});

