"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { tavily } from "@tavily/core";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

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
  handler: async (ctx, args) => {
    const tavilyKey = process.env.TAVILY_API_KEY;
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!tavilyKey) throw new Error("TAVILY_API_KEY is not set");
    if (!geminiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

    let refinedQuery = args.query;
    let detectedTimeRange: "day" | "month" | "any_time" = "any_time";

    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      let prunedForTavily: any[] = [];
      if (args.history && args.history.length > 0) {
        if (args.history.length <= 4) {
          prunedForTavily = args.history;
        } else {
          const head = args.history.slice(0, 1);
          const tail = args.history.slice(-3);
          prunedForTavily = [...head, ...tail];
        }
      }

      const historySummary = prunedForTavily.length > 0
        ? prunedForTavily
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n")
        : "No history. This is the start of the conversation.";

      const systemInstruction = `Analyze the user's request. You must output exactly two lines:
        Line 1: A standalone, descriptive search query optimized for a news search engine.
        Line 2: The classified freshness/time range of the query, which must be exactly one of: "day", "month", or "any_time".
        
        Freshness rules:
        - Use "day" for queries asking for today's news, live/current scores, breaking events, things happening right now, or explicitly mentioning "today", "yesterday", "last 24 hours".
        - Use "month" for queries asking about recent events, this month's updates, or queries where the most fresh/recent data from the last few weeks is highly preferred (e.g. injury updates, current status of an ongoing event).
        - Use "any_time" for historical facts, general knowledge, or queries where time is not a major factor.
        
        Format the output EXACTLY like this:
        QUERY: <refined query>
        TIME_RANGE: <day | month | any_time>`;

      const userPrompt = `Current Conversation:
        ${historySummary}
        
        New User Message: ${args.query}
        ${args.source ? `Target Source/URL: ${args.source}` : ""}`;

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        systemInstruction,
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text().trim();

      if (result.response.usageMetadata) {
        console.log(
          "Tavily Query Refinement - Input: ",
          result.response.usageMetadata.promptTokenCount,
          " Output: ",
          result.response.usageMetadata.candidatesTokenCount,
        );
      }

      if (text) {
        const lines = text.split("\n");
        let parsedQuery = "";
        for (const line of lines) {
          if (line.toUpperCase().startsWith("QUERY:")) {
            parsedQuery = line.substring(6).trim();
          } else if (line.toUpperCase().startsWith("TIME_RANGE:")) {
            const tr = line.substring(11).trim().toLowerCase();
            if (tr === "day" || tr === "month" || tr === "any_time") {
              detectedTimeRange = tr as "day" | "month" | "any_time";
            }
          }
        }
        if (parsedQuery) {
          refinedQuery = parsedQuery;
        } else {
          refinedQuery = text;
        }
        console.log(
          `[Tavily] Synthesized search query: "${refinedQuery}" | Detected timeRange: ${detectedTimeRange}`,
        );
      }
    } catch (err) {
      console.error("Failed to refine query with Gemini:", err);
    }

    const tvly = tavily({ apiKey: tavilyKey });

    const finalTimeRange = args.timeRange ?? detectedTimeRange;
    const tavilyTimeRange = finalTimeRange === "any_time" ? undefined : finalTimeRange;

    // Search results from tavily api
    const searchResult = await tvly.search(refinedQuery, {
      topic: "general",
      searchDepth: "advanced",
      includeAnswer: false,
      maxResults: 5,
      timeRange: tavilyTimeRange,
    });

    // Reducing search result tokens
    const leanNews = searchResult.results
      .map(
        (r: any, i: number) =>
          `SOURCE [${i + 1}]: ${r.title}\nContent: ${r.content}\nURL: ${r.url}`,
      )
      .join("\n\n");

    const sources = searchResult.results.map((r: any) => ({
      title: r.title,
      url: r.url,
    }));

    return { leanNews, sources };
  },
});

export const firehose_search = internalAction({
  args: {
    query: v.string(),
    searchType: v.union(v.literal("general"), v.literal("news")),
    timeRange: v.union(v.literal("day"), v.literal("any_time")),
  },
  handler: async (ctx, args) => {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) throw new Error("TAVILY_API_KEY is not set");

    const tvly = tavily({ apiKey: tavilyKey });

    const options: Record<string, any> = {
      topic: args.searchType,
      searchDepth: "advanced",
      maxResults: 10,
      includeAnswer: false,
    };

    if (args.timeRange === "day" && args.searchType === "news") {
      options.days = 1;
    }

    try {
      const res = await tvly.search(args.query, options);
      console.log(
        `Tavily [${args.searchType}/${args.timeRange}]: "${args.query}" → ${res.results.length} results`,
      );
      // Ensure we only return fields we need, but the API returns title, url, content easily
      return res.results as Array<{
        title: string;
        url: string;
        content: string;
        score?: number;
        publishedDate?: string;
      }>;
    } catch (err: any) {
      console.error(`Tavily error for query "${args.query}":`, err);
      return [];
    }
  },
});

export const extract_source = internalAction({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) throw new Error("TAVILY_API_KEY is not set");

    const tvly = tavily({ apiKey: tavilyKey });

    try {
      const extractResult = await tvly.extract([args.url]);
      // Assuming extractResult is an object with a results array containing the extracted data
      const data = extractResult.results[0];
      if (!data) return { success: false };

      return {
        success: true,
        content: data.rawContent || "No content extracted",
      };
    } catch (err: any) {
      console.error(`Tavily extract error for url "${args.url}":`, err);
      return { success: false };
    }
  },
});
