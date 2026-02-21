import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalQuery } from "./_generated/server";
import { hashString } from "./utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESULTS_PER_PAGE = 10; // 10 results per topic query

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
// Serper fetch
// ---------------------------------------------------------------------------

interface SerperNewsResult {
  title: string;
  link: string;
  snippet?: string;
  source?: string;
  date?: string;
}

async function fetchHeadlines(
  query: string,
  apiKey: string,
): Promise<SerperNewsResult[]> {
  const res = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: RESULTS_PER_PAGE,
      page: 1,
      gl: "ng",
      tbs: "qdr:d",
    }),
  });

  if (!res.ok) {
    console.error(
      `Serper error for query "${query}": ${res.status} ${res.statusText}`,
    );
    return [];
  }

  const data = await res.json();
  const results = (data.news ?? []) as SerperNewsResult[];
  console.log(`Serper: "${query}" → ${results.length} results`);
  return results;
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

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

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

export const get_active_watchlist_items = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("watchlist")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
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
 * These become the Serper search queries for the firehose run.
 */
export const get_unique_canonical_topics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("watchlist")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const seen = new Set<string>();
    const topics: string[] = [];
    for (const item of items) {
      if (item.canonical_topic && !seen.has(item.canonical_topic)) {
        seen.add(item.canonical_topic);
        topics.push(item.canonical_topic);
      }
    }
    return topics;
  },
});

// ---------------------------------------------------------------------------
// Core internal action — runs the full firehose pipeline
// ---------------------------------------------------------------------------

export const run_firehose = internalAction({
  args: {},
  handler: async (ctx) => {
    const serperKey = process.env.SERPER_API_KEY;
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!serperKey || !geminiKey) {
      console.error("Missing SERPER_API_KEY or GOOGLE_GEMINI_API_KEY");
      return;
    }

    // 1. Load all active watchlist items — 1 query
    const activeItems = await ctx.runQuery(
      internal.firehose.get_active_watchlist_items,
    );

    if (activeItems.length === 0) {
      console.log("Firehose: no active watchlist items, skipping.");
      return;
    }

    // 2. Bulk-load all processed hashes for all active items — 1 query
    //    Builds an in-memory Set of "urlHash::watchlist_id" keys
    const watchlistIds = activeItems.map((i) => i._id);
    const processedKeys = await ctx.runQuery(
      internal.log.get_processed_hashes_for_items,
      { watchlist_ids: watchlistIds },
    );
    const processedSet = new Set<string>(processedKeys);

    // 3. Build dynamic Serper queries from unique canonical topics — 1 query
    const canonicalTopics = await ctx.runQuery(
      internal.firehose.get_unique_canonical_topics,
    );

    // Fallback: if no items have canonical_topic yet, run nothing
    if (canonicalTopics.length === 0) {
      console.log(
        "Firehose: no canonical topics found, skipping Serper fetch.",
      );
      return;
    }

    // Fetch headlines for each unique topic in parallel
    const headlineArrays = await Promise.all(
      canonicalTopics.map((topic) => fetchHeadlines(topic, serperKey)),
    );
    const allHeadlines = headlineArrays.flat();

    console.log(
      `Firehose: fetched ${allHeadlines.length} headlines across ${canonicalTopics.length} topics.`,
    );

    // 4. Within-run dedup — in-memory only, zero DB cost
    const seen = new Set<string>();
    const uniqueHeadlines: Array<SerperNewsResult & { hash: string }> = [];

    for (const h of allHeadlines) {
      const hash = await hashString(h.link);
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
      watchlist_id: (typeof activeItems)[0]["_id"];
    }> = [];
    const toInsertLogs: Array<{
      watchlist_id: (typeof activeItems)[0]["_id"];
      action: string;
    }> = [];
    const toSendNotifications: Array<{
      user_id: (typeof activeItems)[0]["user_id"];
      title: string;
      message: string;
    }> = [];

    for (const item of activeItems) {
      let keywordMatches = 0;
      let verified = 0;

      for (const headline of uniqueHeadlines) {
        const compositeKey = `${headline.hash}::${item._id}`;

        // In-memory check — zero DB cost
        if (processedSet.has(compositeKey)) continue;

        const headlineText = `${headline.title} ${headline.snippet ?? ""}`;
        if (!headlineMatchesKeywords(headlineText, item.keywords)) continue;

        keywordMatches++;

        const satisfied = await verifyHeadlineWithGemini(
          headline.title,
          headline.snippet ?? "",
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
          const logAction = `${headline.title}${headline.source ? ` — ${headline.source}` : ""}`;
          toInsertLogs.push({
            watchlist_id: item._id,
            action: logAction,
          });
          toSendNotifications.push({
            user_id: item.user_id,
            title: `Snoopa: ${item.title}`,
            message: headline.title,
          });
          console.log(`Firehose: ✓ "${item.title}" → "${headline.title}"`);
        }
      }

      console.log(
        `Firehose: "${item.title}" — ${keywordMatches} keyword matches, ${verified} verified.`,
      );
    }

    // 6. Flush all writes — 2 batch mutations
    if (toMarkProcessed.length > 0) {
      await ctx.runMutation(internal.log.batch_mark_processed, {
        entries: toMarkProcessed,
      });
    }

    if (toInsertLogs.length > 0) {
      await ctx.runMutation(internal.log.batch_insert_logs, {
        entries: toInsertLogs,
      });
    }

    // 7. Send notifications for all verified hits
    await Promise.all(
      toSendNotifications.map((n) =>
        ctx.runMutation(internal.notifications.send_alert, {
          user_id: n.user_id,
          title: n.title,
          message: n.message,
          type: "alert",
        }),
      ),
    );

    // 8. Update last_checked for all active items — 1 mutation
    await ctx.runMutation(internal.log.batch_update_last_checked, {
      watchlist_ids: watchlistIds,
    });

    console.log(
      `Firehose: complete. ${toInsertLogs.length} alerts sent, ${toMarkProcessed.length} headlines marked processed.`,
    );
  },
});

// ---------------------------------------------------------------------------
// Public action — manually trigger firehose (e.g. for testing)
// ---------------------------------------------------------------------------

export const trigger_firehose = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(internal.firehose.run_firehose);
  },
});
