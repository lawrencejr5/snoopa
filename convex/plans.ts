import { Id } from "./_generated/dataModel";

/** Monthly snoop allowance per paid tier. */
export const TIER_SNOOPS: Record<string, number> = {
  pro: 250,
  supa: 600,
  max: 1500,
};

/** Max number of ACTIVE watchlists per tier. */
export const TIER_WATCHLIST_LIMIT: Record<string, number> = {
  free: 2,
  pro: 7,
  supa: 20,
  max: Infinity,
};

/** One-time, non-expiring snoops every free user receives. */
export const FREE_LIFETIME_SNOOPS = 50;

/** Snoops granted per top-up pack (the server decides, never the client). */
export const PACK_SNOOPS: Record<string, number> = {
  boost_pack: 100,
  fuel_pack: 300,
  surge_pack: 850,
};

/** Resolves a user's effective tier ("free" if not premium). */
export function get_user_tier(user: any): string {
  if (!user || user.is_premium !== true) return "free";
  return user.sub_tier ?? "pro";
}

export function get_watchlist_limit(user: any): number {
  return TIER_WATCHLIST_LIMIT[get_user_tier(user)] ?? TIER_WATCHLIST_LIMIT.free;
}

/** Counts the user's active watchlists. */
export async function count_active_watchlists(
  ctx: any,
  user_id: Id<"users">,
): Promise<number> {
  const items = await ctx.db
    .query("watchlist")
    .withIndex("by_user", (q: any) => q.eq("user_id", user_id))
    .collect();
  return (items as any[]).filter((w) => w.status === "active").length;
}

/** Builds the user-facing limit error message. */
export function watchlist_limit_message(limit: number, tier: string): string {
  const upgrade = tier === "free" ? " Upgrade your plan to track more." : "";
  return `FREE_LIMIT_REACHED: You've reached the limit of ${limit} active watchlists on your plan.${upgrade}`;
}

/** Throws FREE_LIMIT_REACHED if the user cannot have another active watchlist. */
export async function assert_can_activate_watchlist(
  ctx: any,
  user_id: Id<"users">,
): Promise<void> {
  const user = await ctx.db.get(user_id);
  const limit = get_watchlist_limit(user);
  if (limit === Infinity) return;
  const active = await count_active_watchlists(ctx, user_id);
  if (active >= limit) {
    throw new Error(watchlist_limit_message(limit, get_user_tier(user)));
  }
}
