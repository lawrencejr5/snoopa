import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalQuery } from "./_generated/server";
import { sendExpoPush } from "./notifications";
import { hashString } from "./utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tier check intervals in milliseconds */
const TIER_INTERVALS: Record<number, number> = {
  1: 6 * 60 * 60 * 1000, // 6 hours
  2: 12 * 60 * 60 * 1000, // 12 hours
  3: 24 * 60 * 60 * 1000, // 24 hours
  4: 72 * 60 * 60 * 1000, // 72 hours
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function headlineMatchesKeywords(
  headline: string,
  keywords: string[],
): boolean {
  const lower = headline.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Search result shape (provider-agnostic)
// ---------------------------------------------------------------------------

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

// ---------------------------------------------------------------------------
// Gemini verification
// ---------------------------------------------------------------------------

async function verifyHeadlineWithGemini(
  headline: string,
  snippet: string,
  condition: string,
  geminiKey: string,
): Promise<boolean> {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `You are a strict fact-checker. Given a news headline and snippet, determine whether it satisfies the following condition.
        Condition: "${condition}"
        Headline: "${headline}"
        Snippet: "${snippet}"

        Reply with ONLY "true" if the condition is satisfied, or "false" if it is not. No explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toLowerCase();
    return text === "true";
  } catch (err) {
    console.warn("Primary verification model failed, falling back to gemini-3.1-flash-lite");
    try {
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
      });
      const result = await fallbackModel.generateContent(prompt);
      const text = result.response.text().trim().toLowerCase();
      return text === "true";
    } catch (fallbackErr) {
      console.error("Gemini verification error:", fallbackErr);
      return false;
    }
  }
}

async function verifySourceWithGemini(
  content: string,
  condition: string,
  geminiKey: string,
): Promise<boolean> {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `You are a strict fact-checker. Given the content of a web page, determine whether it satisfies the following condition.
        Condition: "${condition}"
        Content: "${content.substring(0, 15000)}"

        Reply with ONLY "true" if the condition is satisfied, or "false" if it is not. No explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toLowerCase();
    return text === "true";
  } catch (err) {
    console.warn("Primary source verification model failed, falling back to gemini-3.1-flash-lite");
    try {
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
      });
      const result = await fallbackModel.generateContent(prompt);
      const text = result.response.text().trim().toLowerCase();
      return text === "true";
    } catch (fallbackErr) {
      console.error("Gemini source verification error:", fallbackErr);
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Gemini brief generation
// ---------------------------------------------------------------------------

interface VerifiedHeadline {
  title: string;
  snippet: string;
  url: string;
  source?: string;
  hash: string;
}

const NO_NEW_INFO_SENTINEL = "NO_NEW_INFO";

async function generateBrief(
  watchlistTitle: string,
  condition: string,
  headlines: VerifiedHeadline[],
  geminiKey: string,
  recentBriefs: string[] = [],
): Promise<string> {
  const genAI = new GoogleGenerativeAI(geminiKey);

  const headlineList = headlines
    .map(
      (h, i) => `${i + 1}. "${h.title}"${h.snippet ? ` — ${h.snippet}` : ""}`,
    )
    .join("\n");

  const priorKnowledgeSection =
    recentBriefs.length > 0
      ? `IMPORTANT — What the user already knows (do NOT repeat this):\n${recentBriefs.map((b) => `- "${b}"`).join("\n")}\n\n`
      : "";

  const prompt = `You are Snoopa, a sharp AI intelligence agent.
${priorKnowledgeSection}Given these NEW verified headlines about "${watchlistTitle}" (tracking condition: "${condition}"):
${headlineList}

If ALL of the above is already covered by what the user already knows, reply with exactly: ${NO_NEW_INFO_SENTINEL}
Otherwise, write a 1-2 sentence casual briefing covering ONLY what is genuinely new. Sound natural, like you're briefing a friend.
Return ONLY the brief or ${NO_NEW_INFO_SENTINEL}. No quotes, no markdown.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.warn("Primary model failed, falling back to gemini-3.1-flash-lite");
    try {
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
      });
      const result = await fallbackModel.generateContent(prompt);
      return result.response.text().trim();
    } catch (fallbackErr) {
      console.error("Gemini brief generation error:", fallbackErr);
      // Fallback: use the first headline title
      return headlines[0].title;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

export const get_active_watchlist_items = internalQuery({
  args: { tier: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("watchlist")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (args.tier !== undefined) {
      // Filter by tier (items without a tier default to 3)
      return items.filter((item) => (item.tier ?? 3) === args.tier);
    }
    return items;
  },
});

export const is_headline_processed = internalQuery({
  args: {
    urlHash: v.string(),
    watchlist_id: v.id("watchlist"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("processed_headlines")
      .withIndex("by_hash_and_watchlist", (q) =>
        q.eq("urlHash", args.urlHash).eq("watchlist_id", args.watchlist_id),
      )
      .first();
    return existing !== null;
  },
});

/**
 * Extract unique canonical topics from active watchlist items.
 * These become the Tavily search queries for the firehose run.
 */
export const get_unique_canonical_topics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("watchlist")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const seen = new Set<string>();
    for (const item of items) {
      if (item.canonical_topic) {
        seen.add(item.canonical_topic);
      }
    }
    return [...seen];
  },
});

export const get_monitored_sources_for_items = internalQuery({
  args: { watchlist_ids: v.array(v.id("watchlist")) },
  handler: async (ctx, args) => {
    const sources = await Promise.all(
      args.watchlist_ids.map(async (id) => {
        return await ctx.db
          .query("monitored_sources")
          .withIndex("by_watchlist", (q) => q.eq("watchlist_id", id))
          .collect();
      }),
    );
    return sources.flat();
  },
});

// ---------------------------------------------------------------------------
// run_firehose phase helpers
// ---------------------------------------------------------------------------

/** Phase 1 — loads active items for the tier and filters out recently-checked ones. */
async function _loadDueItems(ctx: any, tier: number): Promise<any[]> {
  return await ctx.runQuery(
    internal.firehose.get_active_watchlist_items,
    { tier },
  );
}

/**
 * Phase 3A — scrapes all monitored sources in parallel, verifies changed ones with Gemini,
 * updates their hashes, and accumulates verified hits into verifiedByItem.
 * Returns { sourceUpdates, sourcesByWatchlistId }.
 */
async function _processMonitoredSources(
  ctx: any,
  activeItems: any[],
  verifiedByItem: Map<string, { item: any; headlines: VerifiedHeadline[] }>,
  geminiKey: string,
) {
  const watchlistIds = activeItems.map((i: any) => i._id);
  const allMonitoredSources = await ctx.runQuery(
    internal.firehose.get_monitored_sources_for_items,
    { watchlist_ids: watchlistIds },
  );

  // Group sources by watchlist id
  const sourcesByWatchlistId = new Map<any, any[]>();
  for (const source of allMonitoredSources) {
    if (!sourcesByWatchlistId.has(source.watchlist_id)) {
      sourcesByWatchlistId.set(source.watchlist_id, []);
    }
    sourcesByWatchlistId.get(source.watchlist_id)!.push(source);
  }

  const sourceUpdates: Array<{
    source: any;
    newHash: string;
    newSnapshot: string;
    satisfied: boolean;
  }> = [];

  // Parallel fetch + verify all sources
  await Promise.all(
    allMonitoredSources.map(async (source: any) => {
      const extractResult = await ctx.runAction(
        internal.tavily.extract_source,
        {
          url: source.url,
        },
      );
      if (!extractResult.success) return;

      const snapshot = extractResult.content as string;
      const newHash = await hashString(snapshot);

      if (newHash === source.last_hash) return; // No change

      const item = activeItems.find((i: any) => i._id === source.watchlist_id);
      if (!item) return;

      const satisfied = await verifySourceWithGemini(
        snapshot,
        item.condition,
        geminiKey,
      );
      sourceUpdates.push({ source, newHash, newSnapshot: snapshot, satisfied });
    }),
  );

  // Persist hash updates and collect verified hits
  for (const update of sourceUpdates) {
    await ctx.runMutation(
      internal.monitored_sources.update_monitored_source_hash,
      {
        monitored_source_id: update.source._id,
        last_hash: update.newHash,
        last_snapshot: update.newSnapshot,
      },
    );

    if (update.satisfied) {
      const item = activeItems.find(
        (i: any) => i._id === update.source.watchlist_id,
      )!;
      if (!verifiedByItem.has(item._id)) {
        verifiedByItem.set(item._id, { item, headlines: [] });
      }
      let hostname = "Source";
      try {
        hostname = new URL(update.source.url).hostname;
      } catch {}
      verifiedByItem.get(item._id)!.headlines.push({
        title: `Source Update detected on ${hostname}`,
        snippet:
          update.newSnapshot.substring(0, 200).replace(/\n/g, " ") + "...",
        url: update.source.url,
        source: hostname,
        hash: update.newHash,
      });
      console.log(`Firehose: Monitored Source HIT for "${item.title}"`);
    }
  }

  return { sourceUpdates, sourcesByWatchlistId };
}

/**
 * Phase 3B+4+5 — builds Tavily queries, fetches + dedupes headlines,
 * runs keyword + Gemini verification per item, and accumulates verified hits.
 * Returns toMarkProcessed entries.
 */
async function _runGeneralSearch(
  ctx: any,
  itemsForGeneralSearch: any[],
  processedSet: Set<string>,
  verifiedByItem: Map<string, { item: any; headlines: VerifiedHeadline[] }>,
  geminiKey: string,
): Promise<Array<{ urlHash: string; watchlist_id: any }>> {
  // Build unique query configs (deduplicated by title+type+range)
  const queryMap = new Map<
    string,
    {
      topic: string;
      searchType: "general" | "news";
      timeRange: "day" | "any_time";
    }
  >();
  for (const item of itemsForGeneralSearch) {
    const type = item.search_type ?? "general";
    const range = item.time_range ?? "day";
    const key = `${item.title}::${type}::${range}`;
    if (!queryMap.has(key)) {
      queryMap.set(key, {
        topic: item.title,
        searchType: type,
        timeRange: range,
      });
    }
  }
  const queries = [...queryMap.values()];

  if (queries.length === 0) {
    console.log("Firehose: no items for general search, skipping fetch.");
    return [];
  }

  // Fetch headlines in parallel — Brave primary, Tavily fallback per query
  const headlineArrays = await Promise.all(
    queries.map(async (q) => {
      // 1. Try Brave first
      const braveResults: SearchResult[] = await ctx.runAction(
        internal.brave.firehose_search,
        { query: q.topic, timeRange: q.timeRange },
      );

      if (braveResults.length > 0) {
        console.log(
          `Firehose [Brave]: "${q.topic}" → ${braveResults.length} results`,
        );
        return braveResults;
      }

      // 2. Brave returned nothing — fall back to Tavily
      console.log(
        `Firehose: Brave returned no results for "${q.topic}", falling back to Tavily.`,
      );
      const tavilyResults: SearchResult[] = await ctx.runAction(
        internal.tavily.firehose_search,
        { query: q.topic, searchType: q.searchType, timeRange: q.timeRange },
      );
      console.log(
        `Firehose [Tavily fallback]: "${q.topic}" → ${tavilyResults.length} results`,
      );
      return tavilyResults;
    }),
  );
  const allHeadlines = headlineArrays.flat();
  console.log(
    `Firehose: fetched ${allHeadlines.length} headlines across ${queries.length} queries.`,
  );

  // Within-run dedup
  const seen = new Set<string>();
  const uniqueHeadlines: Array<SearchResult & { hash: string }> = [];
  for (const h of allHeadlines) {
    const hash = await hashString(h.url);
    if (seen.has(hash)) continue;
    seen.add(hash);
    uniqueHeadlines.push({ ...h, hash });
  }
  console.log(`Firehose: ${uniqueHeadlines.length} unique headlines to check.`);

  // Keyword match + Gemini verify per item
  const toMarkProcessed: Array<{ urlHash: string; watchlist_id: any }> = [];
  for (const item of itemsForGeneralSearch) {
    let keywordMatches = 0;
    let verified = 0;

    for (const headline of uniqueHeadlines) {
      const compositeKey = `${headline.hash}::${item._id}`;
      if (processedSet.has(compositeKey)) continue;

      const headlineText = `${headline.title} ${headline.content ?? ""}`;
      if (!headlineMatchesKeywords(headlineText, item.keywords)) continue;

      keywordMatches++;
      const satisfied = await verifyHeadlineWithGemini(
        headline.title,
        headline.content ?? "",
        item.condition,
        geminiKey,
      );

      toMarkProcessed.push({ urlHash: headline.hash, watchlist_id: item._id });
      processedSet.add(compositeKey);

      if (satisfied) {
        verified++;
        if (!verifiedByItem.has(item._id)) {
          verifiedByItem.set(item._id, { item, headlines: [] });
        }
        verifiedByItem.get(item._id)!.headlines.push({
          title: headline.title,
          snippet: headline.content ?? "",
          url: headline.url,
          source: headline.url ? new URL(headline.url).hostname : undefined,
          hash: headline.hash,
        });
        console.log(`Firehose: ✓ "${item.title}" → "${headline.title}"`);
      }
    }

    console.log(
      `Firehose: "${item.title}" — ${keywordMatches} keyword matches, ${verified} verified.`,
    );
  }

  return toMarkProcessed;
}

/**
 * Phase 7 — generates a brief per verified item, saves chat message + sources +
 * notification + push notification, and returns the total alert count.
 */
async function _dispatchAlerts(
  ctx: any,
  verifiedByItem: Map<string, { item: any; headlines: VerifiedHeadline[] }>,
  geminiKey: string,
): Promise<number> {
  const PUSH_PREFIXES = [
    "New intel on",
    "Found something new regarding",
    "Just spotted a change in",
    "Sharing some new findings on",
    "Fresh scent on",
    "Intel drop:",
    "Something's moving on",
  ];

  let totalAlerts = 0;

  for (const [, { item, headlines }] of verifiedByItem) {
    // Fetch the last 3 snoop briefs sent to the user for this item
    const recent_briefs: string[] = await ctx.runQuery(
      internal.chat.get_recent_snoop_briefs,
      { watchlist_id: item._id, limit: 3 },
    );

    const brief = await generateBrief(
      item.title,
      item.condition,
      headlines,
      geminiKey,
      recent_briefs,
    );

    // If everything in the new headlines is already known — skip dispatch
    if (brief === NO_NEW_INFO_SENTINEL) {
      console.log(`Firehose: "${item.title}" — no new info, skipping dispatch.`);
      continue;
    }

    console.log(`Firehose: brief for "${item.title}" → "${brief}"`);

    // 1. Save chat message
    const chatId = await ctx.runMutation(internal.chat.save_message, {
      watchlist_id: item._id,
      role: "snoopa",
      content: brief,
      type: "snoop",
    });

    // 2. Batch-insert headline sources
    const sourceEntries = headlines.map((h) => ({
      watchlist_id: item._id,
      chat_id: chatId,
      title: `${h.title}${h.source ? ` — ${h.source}` : ""}`,
      url: h.url,
    }));
    await ctx.runMutation(internal.chat.batch_insert_sources, {
      entries: sourceEntries,
    });
    totalAlerts += sourceEntries.length;

    // 3. Save in-app notification
    await ctx.runMutation(internal.notifications.save_notification, {
      user_id: item.user_id,
      title: item.title,
      message: brief,
      type: "alert",
      watchlist_id: item._id,
    });

    // 4. Push notification
    const prefix =
      PUSH_PREFIXES[Math.floor(Math.random() * PUSH_PREFIXES.length)];
    const pushTitle = `${prefix} ${item.title}`;
    const pushTokens = await ctx.runQuery(internal.users.get_push_tokens, {
      user_id: item.user_id,
    });

    let pushBody = brief;
    const words = brief.split(/\s+/).filter(Boolean);
    if (words.length > 15) {
      pushBody = words.slice(0, 15).join(" ") + "...";
    }

    await sendExpoPush(pushTokens, pushTitle, pushBody);
  }

  return totalAlerts;
}

// ---------------------------------------------------------------------------
// Core internal action — runs the full firehose pipeline
// ---------------------------------------------------------------------------

export const run_firehose = internalAction({
  args: { tier: v.number() },
  handler: async (ctx, args) => {
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiKey) {
      console.error("Missing GOOGLE_GEMINI_API_KEY");
      return;
    }

    // 1. Load watchlist items due for this tier
    const activeItems = await _loadDueItems(ctx, args.tier);
    if (activeItems.length === 0) {
      console.log(
        `Firehose (tier ${args.tier}): no items due for check, skipping.`,
      );
      return;
    }
    console.log(
      `Firehose (tier ${args.tier}): ${activeItems.length} items due for check.`,
    );

    // 2. Bulk-load processed hashes (single query, in-memory set)
    const watchlistIds = activeItems.map((i: any) => i._id);
    const processedKeys = await ctx.runQuery(
      internal.log.get_processed_hashes_for_items,
      { watchlist_ids: watchlistIds },
    );
    const processedSet = new Set<string>(processedKeys);

    // Accumulator shared across phases
    const verifiedByItem = new Map<
      string,
      { item: any; headlines: VerifiedHeadline[] }
    >();

    // 3A. Process monitored sources (primary + secondary)
    const { sourceUpdates, sourcesByWatchlistId } =
      await _processMonitoredSources(
        ctx,
        activeItems,
        verifiedByItem,
        geminiKey,
      );

    // 3B. Determine which items still need a general search
    const itemsForGeneralSearch = activeItems.filter((item: any) => {
      const sources = sourcesByWatchlistId.get(item._id) || [];
      if (sources.find((s: any) => s.source_weight === "primary")) return false;
      const secondarySatisfied = sources.some(
        (s: any) =>
          s.source_weight === "secondary" &&
          sourceUpdates.some((su) => su.source._id === s._id && su.satisfied),
      );
      return !secondarySatisfied;
    });
    console.log(
      `Firehose: ${itemsForGeneralSearch.length} items proceeding to General Search.`,
    );

    // 4+5. Run general search, dedup, keyword match + Gemini verify
    const toMarkProcessed = await _runGeneralSearch(
      ctx,
      itemsForGeneralSearch,
      processedSet,
      verifiedByItem,
      geminiKey,
    );

    // 6. Flush processed headline entries
    if (toMarkProcessed.length > 0) {
      await ctx.runMutation(internal.log.batch_mark_processed, {
        entries: toMarkProcessed,
      });
    }

    // 7. Generate briefs + dispatch alerts (chat, notification, push)
    const totalAlerts = await _dispatchAlerts(ctx, verifiedByItem, geminiKey);

    // 8. Update last_checked for all active items
    await ctx.runMutation(internal.log.batch_update_last_checked, {
      watchlist_ids: watchlistIds,
    });

    console.log(
      `Firehose (tier ${args.tier}): complete. ${totalAlerts} alerts sent, ${toMarkProcessed.length} headlines marked processed.`,
    );
  },
});

// ---------------------------------------------------------------------------
// Public action — manually trigger firehose (e.g. for testing)
// ---------------------------------------------------------------------------

export const trigger_firehose = action({
  args: { tier: v.number() },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.firehose.run_firehose, { tier: args.tier });
  },
});

// ---------------------------------------------------------------------------
// Simulated Firehose (for Testing/Screen Recording)
// ---------------------------------------------------------------------------

export const get_watchlist_by_id = internalQuery({
  args: { watchlist_id: v.id("watchlist") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.watchlist_id);
  },
});

export const run_simulated_firehose = internalAction({
  args: {
    watchlist_id: v.id("watchlist"),
    fake_headline: v.object({
      title: v.string(),
      url: v.optional(v.string()),
      source: v.optional(v.string()),
    }),
    briefing: v.string(),
    push_tokens: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.firehose.get_watchlist_by_id, {
      watchlist_id: args.watchlist_id,
    });

    if (!item) {
      console.log("Simulated Firehose: watchlist item not found.");
      return;
    }

    console.log(`Simulated Firehose: triggering for "${item.title}"`);

    // Send the brief as a chat message tracking on watchlist mapping natively
    const chatId = await ctx.runMutation(internal.chat.save_message, {
      watchlist_id: item._id,
      role: "snoopa",
      content: args.briefing,
      type: "snoop",
    });

    // Build source entries
    const sourceEntries = [
      {
        watchlist_id: item._id,
        chat_id: chatId,
        title: `${args.fake_headline.title}${args.fake_headline.source ? ` — ${args.fake_headline.source}` : ""}`,
        url: args.fake_headline.url,
      },
    ];

    // Batch insert sources
    await ctx.runMutation(internal.chat.batch_insert_sources, {
      entries: sourceEntries,
    });

    // Save notification with the brief
    await ctx.runMutation(internal.notifications.save_notification, {
      user_id: item.user_id,
      title: item.title,
      message: args.briefing,
      type: "alert",
      watchlist_id: item._id,
    });

    // Push notification with a prefix
    const pushTitle = `New intel on ${item.title}`;

    if (args.push_tokens.length > 0) {
      await sendExpoPush(args.push_tokens, pushTitle, args.briefing);
    } else {
      // Fallback: look up user's push tokens if none provided
      const pushTokens = await ctx.runQuery(internal.users.get_push_tokens, {
        user_id: item.user_id,
      });
      await sendExpoPush(pushTokens, pushTitle, args.briefing);
    }

    // Update last_checked for this item
    await ctx.runMutation(internal.log.batch_update_last_checked, {
      watchlist_ids: [item._id],
    });

    console.log(`Simulated Firehose: complete.`);
  },
});

export const trigger_simulated_firehose = action({
  args: {
    watchlist_id: v.id("watchlist"),
    fake_headline: v.object({
      title: v.string(),
      url: v.optional(v.string()),
      source: v.optional(v.string()),
    }),
    briefing: v.string(),
    push_tokens: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.firehose.run_simulated_firehose, args);
  },
});
