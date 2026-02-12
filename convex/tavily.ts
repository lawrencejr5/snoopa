"use node";

import { tavily } from "@tavily/core";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const search = internalAction({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not set");
    }

    const tvly = tavily({ apiKey });

    // Search results from tavily api
    const searchResult = await tvly.search(args.query, {
      topic: "news",
      searchDepth: "basic",
      includeAnswer: false,
      maxResults: 3,
    });

    // Reducing search result tokens
    return searchResult.results
      .map(
        (r: any, i: number) =>
          `SOURCE [${i}]: ${r.title}\nContent: ${r.content}\nURL: ${r.url}`,
      )
      .join("\n\n");
  },
});
