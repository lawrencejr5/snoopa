import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();

if (process.env.RUN_CRONS === "true") {
  // Tier 1 (Critical): every 6 hours — crypto, breaking news, live events
  crons.interval(
    "firehose-tier-1",
    { hours: 6 },
    internal.firehose.run_firehose,
    { tier: 1 },
  );

  // Tier 2 (High): every 12 hours — stocks, trending topics
  crons.interval(
    "firehose-tier-2",
    { hours: 12 },
    internal.firehose.run_firehose,
    { tier: 2 },
  );

  // Tier 3 (Standard): every 24 hours — deals, releases, general tracking
  crons.interval(
    "firehose-tier-3",
    { hours: 24 },
    internal.firehose.run_firehose,
    { tier: 3 },
  );

  // Tier 4 (Low): every 72 hours — long-term monitoring
  crons.interval(
    "firehose-tier-4",
    { hours: 72 },
    internal.firehose.run_firehose,
    { tier: 4 },
  );

  // Monthly refill of free snoops for all free users (at midnight on the 1st of every month)
  crons.cron(
    "refill-free-snoops",
    "0 0 1 * *",
    internal.migrations.seed_free_snoops,
  );
}

export default crons;
