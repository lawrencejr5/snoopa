import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalQuery } from "./_generated/server";
import { hashString } from "./utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIREHOSE_QUERIES = [
  "Nigeria trending news today",
  "football transfer injury news",
  "Nigeria economy naira market",
  "Nigerian politics government policy",
];

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

const RESULTS_PER_PAGE = 10; // Serper news hard cap per request
const MAX_PAGES = 3; // 3 pages × 10 = 30 results per query

async function fetchHeadlines(
  query: string,
  apiKey: string,
): Promise<SerperNewsResult[]> {
  const all: SerperNewsResult[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: RESULTS_PER_PAGE,
        page,
        gl: "ng",
        tbs: "qdr:d",
      }),
    });

    if (!res.ok) {
      console.error(
        `Serper error for query "${query}" page ${page}: ${res.status} ${res.statusText}`,
      );
      break;
    }

    const data = await res.json();
    const results = (data.news ?? []) as SerperNewsResult[];
    all.push(...results);

    // Stop early if Serper returned fewer results than requested
    if (results.length < RESULTS_PER_PAGE) break;
  }

  console.log(`Serper: "${query}" → ${all.length} results`);
  return all;
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
  args: { urlHash: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("processed_headlines")
      .withIndex("by_hash", (q) => q.eq("urlHash", args.urlHash))
      .first();
    return existing !== null;
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

    // 1. Load all active watchlist items
    const activeItems = await ctx.runQuery(
      internal.firehose.get_active_watchlist_items,
    );

    if (activeItems.length === 0) {
      console.log("Firehose: no active watchlist items, skipping.");
      return;
    }

    // 2. Fetch headlines from all topic queries in parallel
    const headlineArrays = await Promise.all(
      FIREHOSE_QUERIES.map((q) => fetchHeadlines(q, serperKey)),
    );
    const allHeadlines = headlineArrays.flat();

    console.log(
      `Firehose: fetched ${allHeadlines.length} headlines across ${FIREHOSE_QUERIES.length} queries.`,
    );

    // 3. Deduplicate by URL hash
    const seen = new Set<string>();
    const uniqueHeadlines: SerperNewsResult[] = [];

    for (const h of allHeadlines) {
      const hash = await hashString(h.link);

      const alreadyProcessed = await ctx.runQuery(
        internal.firehose.is_headline_processed,
        { urlHash: hash },
      );

      if (alreadyProcessed || seen.has(hash)) continue;
      seen.add(hash);
      uniqueHeadlines.push(h);

      await ctx.runMutation(internal.log.mark_headline_processed, {
        urlHash: hash,
      });
    }

    console.log(
      `Firehose: ${uniqueHeadlines.length} new unique headlines to process.`,
    );

    // 4. For each watchlist item, run keyword filter then Gemini verification
    for (const item of activeItems) {
      let matchCount = 0;

      for (const headline of uniqueHeadlines) {
        const headlineText = `${headline.title} ${headline.snippet ?? ""}`;

        if (!headlineMatchesKeywords(headlineText, item.keywords)) continue;

        matchCount++;
        console.log(
          `Firehose: keyword match for "${item.title}" → "${headline.title}"`,
        );

        const satisfied = await verifyHeadlineWithGemini(
          headline.title,
          headline.snippet ?? "",
          item.condition,
          geminiKey,
        );

        if (satisfied) {
          await ctx.runMutation(internal.log.insert_log, {
            watchlist_id: item._id,
            action: `${headline.title}${headline.source ? ` — ${headline.source}` : ""}`,
            verified: true,
            outcome: "true",
          });
          console.log(
            `Firehose: ✓ saved log for "${item.title}" → "${headline.title}"`,
          );
        } else {
          console.log(
            `Firehose: ✗ condition not met, skipping "${headline.title}"`,
          );
        }
      }

      await ctx.runMutation(internal.log.update_last_checked, {
        watchlist_id: item._id,
      });

      console.log(
        `Firehose: "${item.title}" — ${matchCount} keyword matches processed.`,
      );
    }

    console.log("Firehose: run complete.");
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
