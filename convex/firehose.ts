import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
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
// Tavily fetch
// ---------------------------------------------------------------------------

interface TavilySearchResult {
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
    console.error("Gemini verification error:", err);
    return false;
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
    console.error("Gemini source verification error:", err);
    return false;
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

async function generateBrief(
  watchlistTitle: string,
  condition: string,
  headlines: VerifiedHeadline[],
  geminiKey: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const headlineList = headlines
    .map(
      (h, i) => `${i + 1}. "${h.title}"${h.snippet ? ` — ${h.snippet}` : ""}`,
    )
    .join("\n");

  const prompt = `You are Snoopa, a sharp AI intelligence agent. Given these verified news headlines about "${watchlistTitle}" (tracking condition: "${condition}"), write a 1-2 sentence casual briefing that captures the key takeaway.
    Sound natural, like you're briefing a friend. Be a bit detailed if you need to be.
    Headlines:
    ${headlineList}

    Return ONLY the brief, no quotes, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini brief generation error:", err);
    // Fallback: use the first headline title
    return headlines[0].title;
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

    const tierInterval = TIER_INTERVALS[args.tier] ?? TIER_INTERVALS[3];

    // 1. Load active watchlist items for this tier
    const allTierItems = await ctx.runQuery(
      internal.firehose.get_active_watchlist_items,
      { tier: args.tier },
    );

    // Filter out items that were checked too recently (safety net against double-runs)
    const now = Date.now();
    const activeItems = allTierItems.filter(
      (item) => now - item.last_checked >= tierInterval * 0.9,
    );

    if (activeItems.length === 0) {
      console.log(
        `Firehose (tier ${args.tier}): no items due for check, skipping.`,
      );
      return;
    }

    console.log(
      `Firehose (tier ${args.tier}): ${activeItems.length} items due for check.`,
    );

    // 2. Bulk-load all processed hashes for all active items — 1 query
    //    Builds an in-memory Set of "urlHash::watchlist_id" keys
    const watchlistIds = activeItems.map((i) => i._id);
    const processedKeys = await ctx.runQuery(
      internal.log.get_processed_hashes_for_items,
      { watchlist_ids: watchlistIds },
    );
    const processedSet = new Set<string>(processedKeys);

    // Collect verified headlines per watchlist item for brief generation
    const verifiedByItem = new Map<
      string,
      {
        item: (typeof activeItems)[0];
        headlines: VerifiedHeadline[];
      }
    >();

    // -----------------------------------------------------------------------
    // NEW Phase 3A: Process Monitored Sources (The "First Option")
    // -----------------------------------------------------------------------
    const allMonitoredSources = await ctx.runQuery(
      internal.firehose.get_monitored_sources_for_items,
      { watchlist_ids: watchlistIds },
    );

    const sourcesByWatchlistId = new Map<
      Id<"watchlist">,
      typeof allMonitoredSources
    >();
    for (const source of allMonitoredSources) {
      if (!sourcesByWatchlistId.has(source.watchlist_id)) {
        sourcesByWatchlistId.set(source.watchlist_id, []);
      }
      sourcesByWatchlistId.get(source.watchlist_id)!.push(source);
    }

    const sourceUpdates: Array<{
      source: (typeof allMonitoredSources)[0];
      newHash: string;
      newSnapshot: string;
      satisfied: boolean;
    }> = [];

    // Parallel fetch and verify all sources
    await Promise.all(
      allMonitoredSources.map(async (source) => {
        const extractResult = await ctx.runAction(
          internal.tavily.extract_source,
          { url: source.url },
        );
        if (!extractResult.success) return;

        const snapshot = extractResult.content as string;
        const newHash = await hashString(snapshot);

        // Only process if the content hash has changed
        if (newHash !== source.last_hash) {
          const item = activeItems.find((i) => i._id === source.watchlist_id);
          if (!item) return;

          const satisfied = await verifySourceWithGemini(
            snapshot,
            item.condition,
            geminiKey,
          );

          sourceUpdates.push({
            source,
            newHash,
            newSnapshot: snapshot,
            satisfied,
          });
        }
      }),
    );

    // Save hash updates and process satisfied hits
    for (const update of sourceUpdates) {
      await ctx.runMutation(internal.chat.update_monitored_source_hash, {
        monitored_source_id: update.source._id,
        last_hash: update.newHash,
        last_snapshot: update.newSnapshot,
      });

      if (update.satisfied) {
        const item = activeItems.find(
          (i) => i._id === update.source.watchlist_id,
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

    // Determine fallback for general search
    const itemsForGeneralSearch = activeItems.filter((item) => {
      const sources = sourcesByWatchlistId.get(item._id) || [];

      // Exclude if it has a primary source (primary = NO general search)
      const primarySrc = sources.find((s) => s.source_weight === "primary");
      if (primarySrc) return false;

      // Exclude if it has a secondary source that got a HIT (skip general search if first option succeeded)
      const secondarySatisfied = sources.some(
        (s) =>
          s.source_weight === "secondary" &&
          sourceUpdates.some((su) => su.source._id === s._id && su.satisfied),
      );
      if (secondarySatisfied) return false;

      return true; // Use general search
    });

    console.log(
      `Firehose: ${itemsForGeneralSearch.length} items proceeding to General Search.`,
    );

    // -----------------------------------------------------------------------
    // NEW Phase 3B: Build unique Tavily queries for items needing General Search
    // -----------------------------------------------------------------------
    interface TavilyQuery {
      topic: string;
      searchType: "general" | "news";
      timeRange: "day" | "any_time";
    }
    const queryMap = new Map<string, TavilyQuery>();
    for (const item of itemsForGeneralSearch) {
      if (!item.canonical_topic) continue;
      const type = item.search_type ?? "general";
      const range = item.time_range ?? "day";
      const key = `${item.canonical_topic}::${type}::${range}`;
      if (!queryMap.has(key)) {
        queryMap.set(key, {
          topic: item.canonical_topic,
          searchType: type,
          timeRange: range,
        });
      }
    }

    const tavilyQueries = [...queryMap.values()];

    // Fallback: if no items have canonical_topic yet, run nothing
    if (tavilyQueries.length === 0) {
      console.log(
        "Firehose: no canonical topics found, skipping Tavily fetch.",
      );
      return;
    }

    // Fetch headlines for each unique query config in parallel
    const headlineArrays = await Promise.all(
      tavilyQueries.map((tq) =>
        ctx.runAction(internal.tavily.firehose_search, {
          query: tq.topic,
          searchType: tq.searchType,
          timeRange: tq.timeRange,
        }),
      ),
    );
    const allHeadlines = headlineArrays.flat();

    console.log(
      `Firehose: fetched ${allHeadlines.length} headlines across ${tavilyQueries.length} queries.`,
    );

    // 4. Within-run dedup — in-memory only, zero DB cost
    const seen = new Set<string>();
    const uniqueHeadlines: Array<TavilySearchResult & { hash: string }> = [];

    for (const h of allHeadlines) {
      const hash = await hashString(h.url);
      if (seen.has(hash)) continue;
      seen.add(hash);
      uniqueHeadlines.push({ ...h, hash });
    }

    console.log(
      `Firehose: ${uniqueHeadlines.length} unique headlines to check.`,
    );

    // 5. Process — all checks are in-memory, accumulate writes
    const toMarkProcessed: Array<{
      urlHash: string;
      watchlist_id: Id<"watchlist">;
    }> = [];

    for (const item of itemsForGeneralSearch) {
      let keywordMatches = 0;
      let verified = 0;

      for (const headline of uniqueHeadlines) {
        const compositeKey = `${headline.hash}::${item._id}`;

        // In-memory check — zero DB cost
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

        // Stage the processed entry — written in one batch at end
        toMarkProcessed.push({
          urlHash: headline.hash,
          watchlist_id: item._id,
        });
        // Add to in-memory set so subsequent items in same run don't re-check
        processedSet.add(compositeKey);

        if (satisfied) {
          verified++;

          // Accumulate verified headlines for this watchlist item
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

    // 6. Flush processed entries
    if (toMarkProcessed.length > 0) {
      await ctx.runMutation(internal.log.batch_mark_processed, {
        entries: toMarkProcessed,
      });
    }

    // 7. Generate briefs, save logs + notifications + chat messages
    let totalAlerts = 0;

    for (const [, { item, headlines }] of verifiedByItem) {
      // Generate a contextual brief from all verified headlines
      const brief = await generateBrief(
        item.title,
        item.condition,
        headlines,
        geminiKey,
      );

      console.log(`Firehose: brief for "${item.title}" → "${brief}"`);

      // 1. Send the brief as a chat message if the watchlist has a linked session
      let chatId: Id<"chats"> | undefined;
      if (item.session_id) {
        chatId = await ctx.runMutation(internal.chat.save_message, {
          session_id: item.session_id,
          role: "snoopa",
          content: brief,
          type: "snoop",
        });
      }

      // 2. Build log entries: individual headlines as sources
      const logEntries: Array<{
        watchlist_id: (typeof activeItems)[0]["_id"];
        action: string;
        url?: string;
        type: "source";
        chat_id?: Id<"chats">;
      }> = [];

      for (const h of headlines) {
        logEntries.push({
          watchlist_id: item._id,
          action: `${h.title}${h.source ? ` — ${h.source}` : ""}`,
          url: h.url,
          type: "source",
          chat_id: chatId,
        });
      }

      // Batch insert logs
      await ctx.runMutation(internal.log.batch_insert_logs, {
        entries: logEntries,
      });
      totalAlerts += logEntries.length;

      // 3. Save notification with the brief
      await ctx.runMutation(internal.notifications.save_notification, {
        user_id: item.user_id,
        title: item.title,
        message: brief,
        type: "alert",
        watchlist_id: item._id,
      });

      // 4. Push notification with randomized prefix
      const prefixes = [
        "New intel on",
        "Found something new regarding",
        "Just spotted a change in",
        "Sharing some new findings on",
        "Fresh scent on",
        "Intel drop:",
        "Something's moving on",
      ];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const pushTitle = `${prefix} ${item.title}`;

      const pushTokens = await ctx.runQuery(internal.users.get_push_tokens, {
        user_id: item.user_id,
      });
      await sendExpoPush(pushTokens, pushTitle, brief);
    }

    // 8. Update last_checked for all active items — 1 mutation
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

    // Send the brief as a chat message if the watchlist has a linked session
    let chatId: Id<"chats"> | undefined;
    if (item.session_id) {
      chatId = await ctx.runMutation(internal.chat.save_message, {
        session_id: item.session_id,
        role: "snoopa",
        content: args.briefing,
        type: "snoop",
      });
    }

    // Build log entries
    const logEntries = [
      {
        watchlist_id: item._id,
        action: `${args.fake_headline.title}${args.fake_headline.source ? ` — ${args.fake_headline.source}` : ""}`,
        url: args.fake_headline.url,
        type: "source" as const,
        chat_id: chatId,
      },
    ];

    // Batch insert logs
    await ctx.runMutation(internal.log.batch_insert_logs, {
      entries: logEntries,
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
