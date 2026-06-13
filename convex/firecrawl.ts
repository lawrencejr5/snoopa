"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

function getFirecrawlKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not set");
  return key;
}

// ---------------------------------------------------------------------------
// extract_source — scrape a specific URL
// Primary replacement for tavily.extract_source
// Returns the same shape: { success: boolean, content: string }
// ---------------------------------------------------------------------------

export const extract_source = internalAction({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args) => {
    const api_key = getFirecrawlKey();

    try {
      const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          url: args.url,
          formats: ["markdown"],
        }),
      });

      if (!res.ok) {
        const error_body = await res.text();
        console.error(
          `[Firecrawl] Scrape failed for "${args.url}" — HTTP ${res.status}: ${error_body}`,
        );
        return { success: false, content: "" };
      }

      const data = await res.json();

      // Firecrawl returns data.data.markdown on success
      const content: string = data?.data?.markdown || "";

      if (!content) {
        console.warn(
          `[Firecrawl] Scrape returned empty content for "${args.url}"`,
        );
        return { success: false, content: "" };
      }

      console.log(
        `[Firecrawl] Scraped "${args.url}" — ${content.length} chars`,
      );
      return { success: true, content };
    } catch (err: any) {
      console.error(`[Firecrawl] extract_source error for "${args.url}":`, err);
      return { success: false, content: "" };
    }
  },
});

// ---------------------------------------------------------------------------
// search — mirrored from tavily.search for future use
// Not wired up as primary anywhere yet, but available when needed.
// Returns same shape: { leanNews: string, sources: { title, url }[] }
// ---------------------------------------------------------------------------

export const search = internalAction({
  args: {
    query: v.string(),
    source: v.optional(v.string()),
    history: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
        }),
      ),
    ),
    timeRange: v.optional(
      v.union(v.literal("day"), v.literal("month"), v.literal("any_time")),
    ),
  },
  handler: async (_ctx, args) => {
    const api_key = getFirecrawlKey();
    const gemini_key = process.env.GOOGLE_GEMINI_API_KEY;

    if (!gemini_key) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

    let refined_query = args.query;
    let detected_time_range: "day" | "month" | "any_time" = "any_time";

    // Refine the query with Gemini (same logic as tavily.search)
    try {
      const gen_ai = new GoogleGenerativeAI(gemini_key);
      const model = gen_ai.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });

      let pruned_history: any[] = [];
      if (args.history && args.history.length > 0) {
        if (args.history.length <= 4) {
          pruned_history = args.history;
        } else {
          const head = args.history.slice(0, 1);
          const tail = args.history.slice(-3);
          pruned_history = [...head, ...tail];
        }
      }

      const history_summary =
        pruned_history.length > 0
          ? pruned_history
              .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
              .join("\n")
          : "No history. This is the start of the conversation.";

      const prompt = `
        Current Conversation:
        ${history_summary}
        
        New User Message: ${args.query}
        ${args.source ? `Target Source/URL: ${args.source}` : ""}
        
        Analyze the user's request. You must output exactly two lines:
        Line 1: A standalone, descriptive search query optimized for a news search engine.
        Line 2: The classified freshness/time range of the query, which must be exactly one of: "day", "month", or "any_time".
        
        Freshness rules:
        - Use "day" for queries asking for today's news, live/current scores, breaking events, things happening right now, or explicitly mentioning "today", "yesterday", "last 24 hours".
        - Use "month" for queries asking about recent events, this month's updates, or queries where the most fresh/recent data from the last few weeks is highly preferred (e.g. injury updates, current status of an ongoing event).
        - Use "any_time" for historical facts, general knowledge, or queries where time is not a major factor.
        
        Format the output EXACTLY like this:
        QUERY: <refined query>
        TIME_RANGE: <day | month | any_time>
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      if (text) {
        const lines = text.split("\n");
        let parsed_query = "";
        for (const line of lines) {
          if (line.toUpperCase().startsWith("QUERY:")) {
            parsed_query = line.substring(6).trim();
          } else if (line.toUpperCase().startsWith("TIME_RANGE:")) {
            const tr = line.substring(11).trim().toLowerCase();
            if (tr === "day" || tr === "month" || tr === "any_time") {
              detected_time_range = tr as "day" | "month" | "any_time";
            }
          }
        }
        if (parsed_query) refined_query = parsed_query;
        else refined_query = text;

        console.log(
          `[Firecrawl] Refined query: "${refined_query}" | timeRange: ${detected_time_range}`,
        );
      }
    } catch (err) {
      console.error("[Firecrawl] Failed to refine query with Gemini:", err);
    }

    const final_time_range = args.timeRange ?? detected_time_range;

    // Append a time qualifier to the query when freshness matters
    const time_qualified_query =
      final_time_range === "day"
        ? `${refined_query} today`
        : final_time_range === "month"
          ? `${refined_query} recent`
          : refined_query;

    try {
      const res = await fetch(`${FIRECRAWL_BASE}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          query: time_qualified_query,
          limit: 5,
        }),
      });

      if (!res.ok) {
        const error_body = await res.text();
        console.error(
          `[Firecrawl] Search failed — HTTP ${res.status}: ${error_body}`,
        );
        return { leanNews: "", sources: [] };
      }

      const data = await res.json();
      const results: any[] = data?.data || [];

      const lean_news = results
        .map(
          (r: any, i: number) =>
            `SOURCE [${i + 1}]: ${r.title}\nContent: ${r.description || r.markdown || ""}\nURL: ${r.url}`,
        )
        .join("\n\n");

      const sources = results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      return { leanNews: lean_news, sources };
    } catch (err: any) {
      console.error(`[Firecrawl] Search error:`, err);
      return { leanNews: "", sources: [] };
    }
  },
});
