import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Run the firehose every 1hr to check for new headlines
 * that match active watchlist items.
 */
crons.interval(
  "firehose-run",
  { minutes: 1440 },
  // { minutes: 5 },
  internal.firehose.run_firehose,
);

export default crons;
