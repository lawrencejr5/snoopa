"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/llm/context";

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

interface BraveResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

async function braveSearch(
  query: string,
  options: {
    count?: number;
    freshness?: string;
    maximum_number_of_urls?: number;
    maximum_number_of_snippets_per_url?: number;
    maximum_number_of_tokens_per_url?: number;
  } = {},
): Promise<BraveResult[]> {
  const brave_key = process.env.BRAVE_API_KEY;
  if (!brave_key) throw new Error("BRAVE_API_KEY is not set");

  const params = new URLSearchParams({ q: query });
  if (options.count) params.set("count", String(options.count));
  if (options.freshness) params.set("freshness", options.freshness);
  if (options.maximum_number_of_urls) {
    params.set("maximum_number_of_urls", String(options.maximum_number_of_urls));
  }
  if (options.maximum_number_of_snippets_per_url) {
    params.set(
      "maximum_number_of_snippets_per_url",
      String(options.maximum_number_of_snippets_per_url),
    );
  }
  if (options.maximum_number_of_tokens_per_url) {
    params.set(
      "maximum_number_of_tokens_per_url",
      String(options.maximum_number_of_tokens_per_url),
    );
  }

  const response = await fetch(`${BRAVE_API_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": brave_key,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Brave API error: ${response.status} ${response.statusText}`,
    );
  }

  const raw = await response.json();

  // Brave LLM Context API response shape:
  // {
  //   grounding: { generic: [ { url, title, snippets: string[] }, ... ], map: [] },
  //   sources: { [url]: { title, hostname, age: [longDate, isoDate, relativeDate], snippet } }
  // }
  const generic: any[] = raw?.grounding?.generic ?? [];
  const sources_map: Record<string, any> = raw?.sources ?? {};

  return generic.map((item: any) => {
    const snippets: string[] = Array.isArray(item.snippets) ? item.snippets : [];
    // Filter out JSON-LD blobs (start with '{') to keep content readable
    const readable = snippets
      .filter((s) => typeof s === "string" && !s.trimStart().startsWith("{"))
      .join(" ");

    // age[1] is the ISO date string e.g. "2026-06-02"
    const source_meta = sources_map[item.url];
    const published_date: string | undefined = Array.isArray(source_meta?.age)
      ? source_meta.age[1]
      : undefined;

    return {
      title: item.title ?? "",
      url: item.url ?? "",
      content: readable,
      score: undefined,
      publishedDate: published_date,
    };
  });
}

// ---------------------------------------------------------------------------
// search — mirrors tavily.search (used by chat)
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
  },
  handler: async (_ctx, args) => {
    const gemini_key = process.env.GOOGLE_GEMINI_API_KEY;
    if (!gemini_key) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

    let refined_query = args.query;

    // Use Gemini to synthesize a better search query if history exists
    if (args.history && args.history.length > 0) {
      try {
        const gen_ai = new GoogleGenerativeAI(gemini_key);
        const model = gen_ai.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
        });

        let pruned_history;
        if (args.history.length <= 4) {
          pruned_history = args.history;
        } else {
          const head = args.history.slice(0, 1);
          const tail = args.history.slice(-3);
          pruned_history = [...head, ...tail];
        }

        const history_summary = pruned_history
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n");

        const prompt = `
          Current Conversation:
          ${history_summary}
          
          New User Message: ${args.query}
          ${args.source ? `Target Source/URL: ${args.source}` : ""}
          
          Based on the following chat history ${args.source ? `and the target source provided (${args.source})` : ""}, rewrite the user's latest question into a descriptive standalone search query for a news search engine.
          ${args.source ? "The user wants to specifically find information related to or from this source." : ""}
          Standalone Query (One line only).
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        if (result.response.usageMetadata) {
          console.log(
            "[Brave] Query Refinement - Input:",
            result.response.usageMetadata.promptTokenCount,
            "Output:",
            result.response.usageMetadata.candidatesTokenCount,
          );
        }

        if (text) {
          refined_query = text;
          console.log("[Brave] Synthesized search query:", refined_query);
        }
      } catch (err) {
        console.error("[Brave] Failed to refine query with Gemini:", err);
      }
    }

    const results = await braveSearch(refined_query, {
      maximum_number_of_urls: 3,
      maximum_number_of_snippets_per_url: 2,
      maximum_number_of_tokens_per_url: 400,
    });

    const lean_news = results
      .map(
        (r, i) =>
          `SOURCE [${i + 1}]: ${r.title}\nContent: ${r.content}\nURL: ${r.url}`,
      )
      .join("\n\n");

    const sources = results.map((r) => ({
      title: r.title,
      url: r.url,
    }));

    return { leanNews: lean_news, sources };
  },
});

// ---------------------------------------------------------------------------
// firehose_search — mirrors tavily.firehose_search (used by the firehose pipeline)
// Note: Brave LLM Context API does not support a searchType (general/news) param.
// ---------------------------------------------------------------------------

export const firehose_search = internalAction({
  args: {
    query: v.string(),
    timeRange: v.union(v.literal("day"), v.literal("any_time")),
  },
  handler: async (_ctx, args) => {
    // Map timeRange to Brave's freshness param:
    //   "pd" = past day, omit = all time
    const freshness = args.timeRange === "day" ? "pd" : undefined;

    try {
      const results = await braveSearch(args.query, {
        freshness,
        maximum_number_of_urls: 3,
        maximum_number_of_snippets_per_url: 3,
        maximum_number_of_tokens_per_url: 300,
      });
      console.log(
        `[Brave] firehose_search [${args.timeRange}]: "${args.query}" → ${results.length} results`,
      );
      return results as Array<{
        title: string;
        url: string;
        content: string;
        score?: number;
        publishedDate?: string;
      }>;
    } catch (err: any) {
      console.error(
        `[Brave] firehose_search error for query "${args.query}":`,
        err,
      );
      return [];
    }
  },
});
