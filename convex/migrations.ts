import { internalMutation } from "./_generated/server";
import { end_of_month_timestamp } from "./snoops";

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

/**
 * Assigns a random avatar to every user that doesn't already have one.
 */
export const seed_user_avatars = internalMutation({
  args: {},
  handler: async (ctx) => {
    const avatars = ["chill", "gay", "relax", "shy", "swaga"] as const;
    const users = await ctx.db.query("users").collect();
    let count = 0;

    for (const user of users) {
      if ((user as any).avatar === undefined) {
        const random_avatar = avatars[Math.floor(Math.random() * avatars.length)];
        await ctx.db.patch(user._id, { avatar: random_avatar } as any);
        count++;
      }
    }

    return `Assigned random avatars to ${count} users.`;
  },
});

export const migrate_snoop_expirations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const monthly_snoops = await ctx.db
      .query("snoops")
      .filter((q) => q.eq(q.field("type"), "monthly"))
      .collect();

    let migrated_count = 0;
    let users_patched_count = 0;

    for (const snoop of monthly_snoops) {
      const user = await ctx.db.get(snoop.user_id);
      if (!user) continue;

      let sub_end_date = user.sub_end_date;

      if (sub_end_date === undefined && user.date_of_sub !== undefined) {
        // Calculate subscription end date: add exactly 1 month to date_of_sub
        const start_date = new Date(user.date_of_sub);
        start_date.setUTCMonth(start_date.getUTCMonth() + 1);
        sub_end_date = start_date.getTime();

        // Save sub_end_date to user
        await ctx.db.patch(user._id, { sub_end_date });
        users_patched_count++;
      }

      if (sub_end_date !== undefined) {
        await ctx.db.patch(snoop._id, { expiration_date: sub_end_date });
        migrated_count++;
      }
    }

    return `Migrated ${migrated_count} monthly snoops expiration dates, patched ${users_patched_count} users with computed subscription end date.`;
  },
});

// ---------------------------------------------------------------------------
// Monthly premium snoop refill
// ---------------------------------------------------------------------------

/**
 * Refills monthly snoops for every premium user whose subscription is still
 * active and who has not been refilled in the last 28 days.
 *
 * Designed to run once a month (1st at midnight UTC via cron).
 * Handles weekly, 3-month, annual, and lifetime subscribers correctly:
 *   - Weekly subs expire before the next cron fires — no refill issued.
 *   - Multi-month / annual / lifetime subs receive a fresh monthly batch.
 *   - sub_end_date === undefined is treated as lifetime (always refill).
 */
export const refill_premium_snoops = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Gate: do not refill if last refill was fewer than 28 days ago
    const twenty_eight_days_ms = 28 * 24 * 60 * 60 * 1000;
    const refill_cutoff = now - twenty_eight_days_ms;

    // Collect all premium users
    const premium_users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("is_premium"), true))
      .collect();

    let refilled_count = 0;
    let skipped_expired = 0;
    let skipped_recent = 0;

    for (const user of premium_users) {
      // Skip if subscription has already expired
      if (user.sub_end_date !== undefined && user.sub_end_date < now) {
        skipped_expired++;
        continue;
      }

      // Skip if already refilled within the last 28 days
      if (user.last_refill_at !== undefined && user.last_refill_at > refill_cutoff) {
        skipped_recent++;
        continue;
      }

      const tier = user.sub_tier ?? "pro";
      const snoop_amount =
        tier === "max" ? 12000 : tier === "supa" ? 4000 : 1000;

      // Deplete the previous monthly grant so we don't stack up old allowances
      const old_grants = await ctx.db
        .query("snoops")
        .withIndex("by_user", (q) => q.eq("user_id", user._id))
        .collect();

      for (const grant of old_grants) {
        if (grant.type === "monthly" && grant.remaining > 0) {
          await ctx.db.patch(grant._id, { remaining: 0 });
        }
      }

      // Provision the new monthly batch — expires at end of next calendar month
      // (or at sub_end_date if that comes first)
      const next_month_expiry = end_of_month_timestamp();
      const expiration_date =
        user.sub_end_date !== undefined
          ? Math.min(user.sub_end_date, next_month_expiry)
          : next_month_expiry;

      await ctx.db.insert("snoops", {
        user_id: user._id,
        snoops: snoop_amount,
        remaining: snoop_amount,
        type: "monthly",
        expiration_date,
      });

      // Stamp the refill time and notify the user
      await ctx.db.patch(user._id, { last_refill_at: now });

      const tier_label =
        tier === "max"
          ? "Snoopa Max"
          : tier === "supa"
            ? "Supa Snoopa"
            : "Snoopa Pro";

      await ctx.db.insert("notifications", {
        user_id: user._id,
        type: "reward",
        title: "🐾 Monthly Snoops Refilled!",
        message: `Your ${tier_label} allowance has been topped up with ${snoop_amount.toLocaleString()} snoops for this month. Happy snooping!`,
        seen: false,
        read: false,
        reward_claimed: false,
      });

      refilled_count++;
    }

    return `Refilled snoops for ${refilled_count} premium users. Skipped ${skipped_expired} expired subs, ${skipped_recent} recently refilled.`;
  },
});
