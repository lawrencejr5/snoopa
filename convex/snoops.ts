import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
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

      // Save a system notification so the user sees it in-app
      await ctx.db.insert("notifications", {
        user_id: args.user_id,
        type: "system",
        title: "You're out of Snoops 🐾",
        message:
          "You've used all your snoops for this period. Top up or upgrade your plan to keep tracking.",
        seen: false,
        read: false,
        watchlist_id: args.watchlist_id,
      });

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

export const add_top_up = mutation({
  args: {
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new ConvexError("Not authenticated");

    await ctx.db.insert("snoops", {
      user_id,
      snoops: args.amount,
      remaining: args.amount,
      type: "top_up",
      // No expiration_date for top-ups — they never expire
    });
  },
});

export const upgrade_user_tier = mutation({
  args: {
    tier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("supa"),
      v.literal("max"),
    ),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(user_id);
    if (!user) throw new ConvexError("User not found");

    const is_premium = args.tier !== "free";
    const plan_val = args.tier === "free" ? "free" : "pro";

    // Update user record
    await ctx.db.patch(user_id, {
      plan: plan_val,
      sub_tier: args.tier,
      is_premium,
      date_of_sub: Date.now(),
    });

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

    // Provision new monthly balance for the purchased tier
    let snoop_amount = 0;
    if (args.tier === "pro") snoop_amount = 1000;
    else if (args.tier === "supa") snoop_amount = 4000;
    else if (args.tier === "max") snoop_amount = 12000;

    if (snoop_amount > 0) {
      await ctx.db.insert("snoops", {
        user_id,
        snoops: snoop_amount,
        remaining: snoop_amount,
        type: "monthly",
        expiration_date: end_of_month_timestamp(),
      });
    }
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
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(user_id);
    if (!user) throw new ConvexError("User not found");

    const current_is_premium = user.is_premium === true;
    const current_tier = user.sub_tier || "free";

    if (current_is_premium === args.is_premium && current_tier === args.tier) {
      return;
    }

    const plan_val = args.tier === "free" ? "free" : "pro";

    await ctx.db.patch(user_id, {
      plan: plan_val,
      sub_tier: args.tier,
      is_premium: args.is_premium,
      date_of_sub: args.is_premium ? Date.now() : undefined,
    });

    if (args.is_premium && current_tier !== args.tier) {
      let snoop_amount = 0;
      if (args.tier === "pro") snoop_amount = 1000;
      else if (args.tier === "supa") snoop_amount = 4000;
      else if (args.tier === "max") snoop_amount = 12000;

      if (snoop_amount > 0) {
        // Prevent duplicate refills if a monthly grant for this tier & month already exists
        const end_timestamp = end_of_month_timestamp();
        const existing_monthly = await ctx.db
          .query("snoops")
          .withIndex("by_user_expiry", (q) => q.eq("user_id", user_id).eq("expiration_date", end_timestamp))
          .filter((q) => q.eq(q.field("snoops"), snoop_amount))
          .first();

        // Also check if a reward notification with the exact same title exists to prevent duplicate notifications
        const tier_label = TIER_LABELS[args.tier] ?? args.tier.toUpperCase();
        const expected_title = `🎉 You've been granted ${tier_label}!`;
        const existing_notification = await ctx.db
          .query("notifications")
          .withIndex("by_user", (q) => q.eq("user_id", user_id))
          .filter((q) =>
            q.and(
              q.eq(q.field("type"), "reward"),
              q.eq(q.field("title"), expected_title)
            )
          )
          .first();

        if (existing_monthly && existing_notification) {
          return; // Already provisioned
        }

        const active_grants = await ctx.db
          .query("snoops")
          .withIndex("by_user", (q) => q.eq("user_id", user_id))
          .collect();

        for (const grant of active_grants) {
          if (grant.type === "free" || grant.type === "monthly") {
            await ctx.db.patch(grant._id, { remaining: 0 });
          }
        }

        if (!existing_monthly) {
          await ctx.db.insert("snoops", {
            user_id,
            snoops: snoop_amount,
            remaining: snoop_amount,
            type: "monthly",
            expiration_date: end_timestamp,
          });
        }

        if (!existing_notification) {
          const snoop_count = TIER_SNOOPS[args.tier] ?? snoop_amount;
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
  },
});

