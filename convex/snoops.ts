import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const TIER_LABELS: Record<string, string> = {
  pro: "Snoopa Pro",
  supa: "Supa Snoopa",
  max: "Snoopa Max",
};

const TIER_SNOOPS: Record<string, number> = {
  pro: 1000,
  supa: 4000,
  max: 12000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the timestamp for the very end of the current calendar month (UTC). */
export function end_of_month_timestamp(): number {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
  return end.getTime();
}

/** Returns the timestamp for the very start of the current calendar month (UTC). */
export function start_of_month_timestamp(): number {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  return start.getTime();
}

/** Returns the timestamp for the end of next calendar month from the given base date (UTC). */
export function end_of_next_month_from(base_ms: number): number {
  const base = new Date(base_ms);
  // End of the month that is one month after base
  const end = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 2, 0, 23, 59, 59, 999),
  );
  return end.getTime();
}

/** Checks user snoop limits and triggers Low or Exhausted alerts if needed. */
export async function check_and_trigger_snoop_alerts(
  ctx: any,
  user_id: Id<"users">,
) {
  const grants = await _fetch_active_grants(ctx, user_id);
  const remaining_total = grants.reduce(
    (sum: number, g: any) => sum + g.remaining,
    0,
  );
  const allocated_total = grants.reduce(
    (sum: number, g: any) => sum + g.snoops,
    0,
  );

  if (allocated_total <= 0) return;

  const start_time = start_of_month_timestamp();

  if (remaining_total === 0) {
    const expected_title = "You're out of Snoops 💀";
    // Check if we already alerted this month
    const existing_exhausted = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("user_id", user_id))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("title"), expected_title),
          q.gt(q.field("_creationTime"), start_time),
        ),
      )
      .first();

    if (!existing_exhausted) {
      await ctx.db.insert("notifications", {
        user_id,
        type: "snoops",
        title: expected_title,
        message:
          "You've run out of snoops for this period. Top up or upgrade your plan to keep investigating.",
        seen: false,
        read: false,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.send_snoop_alert_push,
        {
          user_id,
          alert_type: "exhausted",
        },
      );
    }
  } else if (remaining_total / allocated_total <= 0.05) {
    const expected_title = "Running Low on Snoops 🪫";
    // Check if we already alerted this month
    const existing_low = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("user_id", user_id))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("title"), expected_title),
          q.gt(q.field("_creationTime"), start_time),
        ),
      )
      .first();

    if (!existing_low) {
      await ctx.db.insert("notifications", {
        user_id,
        type: "snoops",
        title: expected_title,
        message: `You've used up to 95% of your snoops this month (${remaining_total} remaining). Top up or upgrade your plan to keep tracking.`,
        seen: false,
        read: false,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.send_snoop_alert_push,
        {
          user_id,
          alert_type: "low",
        },
      );
    }
  }
}

/**
 * Sorts snoop grants so that the one expiring soonest is drained first.
 * Grants with no expiration (top-ups) go last.
 */
function sort_grants_by_expiry<
  T extends { _id: Id<"snoops">; expiration_date?: number; remaining: number },
>(grants: T[]): T[] {
  return [...grants].sort((a, b) => {
    const a_exp = a.expiration_date ?? Infinity;
    const b_exp = b.expiration_date ?? Infinity;
    return a_exp - b_exp;
  });
}

/**
 * Inline helper — queries the DB directly for active (non-expired, remaining > 0) grants.
 * Used within mutations/queries in this file to avoid circular `internal.snoops` references.
 */
async function _fetch_active_grants(ctx: any, user_id: Id<"users">) {
  const now = Date.now();
  const grants = await ctx.db
    .query("snoops")
    .withIndex("by_user", (q: any) => q.eq("user_id", user_id))
    .collect();

  return (grants as any[]).filter(
    (g) =>
      g.remaining > 0 &&
      (g.expiration_date === undefined ||
        g.expiration_date === null ||
        g.expiration_date > now),
  );
}

// ---------------------------------------------------------------------------
// Internal Queries
// ---------------------------------------------------------------------------

/**
 * Returns all active (non-expired, remaining > 0) snoop grants for a user.
 * Exposed as an internalQuery so other modules can call it via `internal.snoops.get_active_grants`.
 */
export const get_active_grants = internalQuery({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    return _fetch_active_grants(ctx, args.user_id);
  },
});

/**
 * Returns the total remaining snoops for a user across all active grants.
 */
export const get_total_remaining = internalQuery({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const grants = await _fetch_active_grants(ctx, args.user_id);
    return grants.reduce((sum: number, g: any) => sum + g.remaining, 0);
  },
});

// ---------------------------------------------------------------------------
// Internal Mutations
// ---------------------------------------------------------------------------

/**
 * Deducts `amount` snoops from the user's balance, consuming grants
 * with the closest expiry first (top-ups, which never expire, go last).
 *
 * Throws ConvexError("SNOOPS_EXHAUSTED") if the user does not have enough.
 */
export const deduct_snoops = internalMutation({
  args: {
    user_id: v.id("users"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const amount = args.amount ?? 1;
    const grants = await _fetch_active_grants(ctx, args.user_id);

    const total = grants.reduce((sum: number, g: any) => sum + g.remaining, 0);
    if (total < amount) {
      throw new ConvexError("SNOOPS_EXHAUSTED");
    }

    const sorted = sort_grants_by_expiry(grants);
    let remaining_to_deduct = amount;

    for (const grant of sorted) {
      if (remaining_to_deduct <= 0) break;
      const deduct_from_this = Math.min(grant.remaining, remaining_to_deduct);
      await ctx.db.patch(grant._id, {
        remaining: grant.remaining - deduct_from_this,
      });
      remaining_to_deduct -= deduct_from_this;
    }

    // Trigger snoop alerts check
    await check_and_trigger_snoop_alerts(ctx, args.user_id);
  },
});

/**
 * Convenience wrapper used by firehose and chat.
 * Checks if the user has at least 1 snoop and deducts it. If not:
 *  - Saves a system log (if watchlist_id is provided)
 *  - Saves a system notification telling the user they're out of snoops
 *  - Throws ConvexError("SNOOPS_EXHAUSTED")
 */
export const check_and_deduct = internalMutation({
  args: {
    user_id: v.id("users"),
    watchlist_id: v.optional(v.id("watchlist")),
  },
  handler: async (ctx, args) => {
    const grants = await _fetch_active_grants(ctx, args.user_id);
    const total = grants.reduce((sum: number, g: any) => sum + g.remaining, 0);

    if (total < 1) {
      // Save a system log entry if a watchlist context is present
      if (args.watchlist_id) {
        await ctx.db.insert("logs", {
          watchlist_id: args.watchlist_id,
          timestamp: Date.now(),
          action: "Snoop failed: user has exhausted their snoop balance.",
          type: "error",
          seen: false,
        });
      }

      // Check and trigger snoop alerts (handles push notification + DB notification + monthly deduplication)
      await check_and_trigger_snoop_alerts(ctx, args.user_id);

      throw new ConvexError("SNOOPS_EXHAUSTED");
    }

    // Deduct 1 snoop from the grant expiring soonest
    const sorted = sort_grants_by_expiry(grants);
    for (const grant of sorted) {
      if (grant.remaining > 0) {
        await ctx.db.patch(grant._id, { remaining: grant.remaining - 1 });
        break;
      }
    }

    // Check snoop alert thresholds after deduction (handles 95% used / 100% used triggers)
    await check_and_trigger_snoop_alerts(ctx, args.user_id);
  },
});

// ---------------------------------------------------------------------------
// Public Queries (for Frontend)
// ---------------------------------------------------------------------------

/**
 * Returns the total remaining snoops for the currently authenticated user.
 */
export const get_snoop_balance = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return 0;

    const grants = await _fetch_active_grants(ctx, user_id);
    return grants.reduce((sum: number, g: any) => sum + g.remaining, 0);
  },
});

/**
 * Returns all active snoop grants for the authenticated user, sorted soonest-expiry first.
 * Useful for a detailed breakdown on the billing screen.
 */
export const get_snoop_grants = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return [];

    const grants = await _fetch_active_grants(ctx, user_id);
    return sort_grants_by_expiry(grants);
  },
});

// ---------------------------------------------------------------------------
// Mutation to manually add a top-up grant (placeholder — no RevenueCat yet)
// ---------------------------------------------------------------------------

export const add_top_up = internalMutation({
  args: {
    user_id: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("snoops", {
      user_id: args.user_id,
      snoops: args.amount,
      remaining: args.amount,
      type: "top_up",
      // No expiration_date for top-ups — they never expire
    });
  },
});



// ---------------------------------------------------------------------------
// Ad Reward — helpers
// ---------------------------------------------------------------------------

/** Returns the UTC midnight timestamp (ms) for the start of today. */
function start_of_today_utc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** Snoops rewarded per completed ad, keyed by sub_tier. */
const AD_REWARD_BY_TIER: Record<string, number> = {
  free: 2,
  pro: 3,
  supa: 5,
  max: 10,
};

const AD_DAILY_LIMIT = 3;

// ---------------------------------------------------------------------------
// Ad Reward — Public Query
// ---------------------------------------------------------------------------

/**
 * Returns the number of rewarded ads the current user has watched today (UTC day).
 * Used by the frontend to render the "X/3 today" counter.
 */
export const get_ad_views_today = query({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return 0;

    const today_start = start_of_today_utc();

    const views = await ctx.db
      .query("ad_views")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .filter((q) => q.gte(q.field("viewed_at"), today_start))
      .collect();

    return views.length;
  },
});

// ---------------------------------------------------------------------------
// Ad Reward — Public Mutation
// ---------------------------------------------------------------------------

/**
 * Called after the client confirms the user has fully watched a rewarded ad.
 * Enforces the daily 3-ad cap server-side and grants tier-appropriate snoops.
 */
export const claim_ad_reward = mutation({
  args: {},
  handler: async (ctx) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new ConvexError("Not authenticated");

    const today_start = start_of_today_utc();

    // Check daily cap
    const views_today = await ctx.db
      .query("ad_views")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .filter((q) => q.gte(q.field("viewed_at"), today_start))
      .collect();

    if (views_today.length >= AD_DAILY_LIMIT) {
      throw new ConvexError("AD_DAILY_LIMIT_REACHED");
    }

    // Determine reward based on user tier
    const user = await ctx.db.get(user_id);
    const sub_tier = user?.sub_tier ?? "free";
    const reward_amount = AD_REWARD_BY_TIER[sub_tier] ?? 2;

    // Grant snoops (top_up type — never expire)
    await ctx.db.insert("snoops", {
      user_id,
      snoops: reward_amount,
      remaining: reward_amount,
      type: "top_up",
    });

    // Log the view
    await ctx.db.insert("ad_views", {
      user_id,
      viewed_at: Date.now(),
    });

    return { reward_amount };
  },
});

export const sync_user_subscription = mutation({
  args: {
    is_premium: v.boolean(),
    tier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("supa"),
      v.literal("max"),
    ),
    sub_end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(user_id);
    if (!user) throw new ConvexError("User not found");

    const current_is_premium = user.is_premium === true;
    const current_tier = user.sub_tier || "free";

    const is_new_sub_cycle =
      (args.is_premium && !current_is_premium) ||
      (args.is_premium && current_tier !== args.tier) ||
      (args.is_premium &&
        args.sub_end_date !== undefined &&
        user.sub_end_date !== undefined &&
        args.sub_end_date > user.sub_end_date);

    if (
      current_is_premium === args.is_premium &&
      current_tier === args.tier &&
      !is_new_sub_cycle
    ) {
      return;
    }

    const plan_val = args.tier === "free" ? "free" : "pro";
    const date_of_sub_val = args.is_premium
      ? (is_new_sub_cycle && !current_is_premium)
        ? Date.now()
        : user.date_of_sub || Date.now()
      : undefined;

    await ctx.db.patch(user_id, {
      plan: plan_val,
      sub_tier: args.tier,
      is_premium: args.is_premium,
      date_of_sub: date_of_sub_val,
      sub_end_date: args.is_premium ? args.sub_end_date : undefined,
    });

    if (
      args.is_premium &&
      (current_tier !== args.tier || !current_is_premium || is_new_sub_cycle)
    ) {
      let snoop_amount = 0;
      if (args.tier === "pro") snoop_amount = 1000;
      else if (args.tier === "supa") snoop_amount = 4000;
      else if (args.tier === "max") snoop_amount = 12000;

      if (snoop_amount > 0) {
        // Deplete previous monthly or free snoop grants
        const active_grants = await ctx.db
          .query("snoops")
          .withIndex("by_user", (q) => q.eq("user_id", user_id))
          .collect();

        for (const grant of active_grants) {
          if (grant.type === "free" || grant.type === "monthly") {
            await ctx.db.patch(grant._id, { remaining: 0 });
          }
        }

        await ctx.db.insert("snoops", {
          user_id,
          snoops: snoop_amount,
          remaining: snoop_amount,
          type: "monthly",
          expiration_date: args.sub_end_date ?? end_of_month_timestamp(),
        });
        // Stamp the refill time so the monthly cron knows when we last provisioned
        await ctx.db.patch(user_id, { last_refill_at: Date.now() });

        const tier_label = TIER_LABELS[args.tier] ?? args.tier.toUpperCase();
        const expected_title = `🎉 You've been granted ${tier_label}!`;
        const snoop_count = TIER_SNOOPS[args.tier] ?? snoop_amount;

        // Check if we recently sent this exact notification (prevent double push just in case)
        const recent_notification = await ctx.db
          .query("notifications")
          .withIndex("by_user", (q: any) => q.eq("user_id", user_id))
          .filter((q: any) =>
            q.and(
              q.eq(q.field("type"), "reward"),
              q.eq(q.field("title"), expected_title),
              q.gte(q.field("_creationTime"), Date.now() - 60 * 1000)
            ),
          )
          .first();

        if (!recent_notification) {
          await ctx.db.insert("notifications", {
            user_id,
            type: "reward",
            title: expected_title,
            message: `Your ${tier_label} plan is now active. You've received ${snoop_count.toLocaleString()} snoops this month. Welcome to the pack! 🐾`,
            seen: false,
            read: false,
            reward_claimed: false,
          });
        }
      }
    }

    if (!args.is_premium && args.tier === "free") {
      // Free user: check if they have a free snoop grant for this month
      const start_timestamp = start_of_month_timestamp();
      const existing_free = await ctx.db
        .query("snoops")
        .withIndex("by_user", (q: any) => q.eq("user_id", user_id))
        .filter((q: any) =>
          q.and(
            q.eq(q.field("type"), "free"),
            q.gte(q.field("expiration_date"), start_timestamp),
          ),
        )
        .first();

      if (!existing_free) {
        // Provision 30 free snoops expiring at the end of the month
          await ctx.db.insert("snoops", {
          user_id,
          snoops: 30,
          remaining: 30,
          type: "free",
          expiration_date: end_of_month_timestamp(),
        });
      }
    }
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
    const end_of_month = end_of_month_timestamp();

    // Start-of-month for checking existing grants
    const start_of_month = start_of_month_timestamp();

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
      const snoop_amount = TIER_SNOOPS[tier] ?? 1000;

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

      const tier_label = TIER_LABELS[tier] ?? "Snoopa Pro";

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
