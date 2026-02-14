"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { tavily } from "@tavily/core";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const search = internalAction({
  args: {
    query: v.string(),
    history: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const tavilyKey = process.env.TAVILY_API_KEY;
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!tavilyKey) throw new Error("TAVILY_API_KEY is not set");
    if (!geminiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

    let refinedQuery = args.query;

    // Use Gemini to synthesize a better search query if history exists
    if (args.history && args.history.length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-lite",
        });

        let prunedForTavily;
        if (args.history.length <= 4) {
          prunedForTavily = args.history;
        } else {
          const head = args.history.slice(0, 1); // Just the very first message
          const tail = args.history.slice(-3); // The most recent context
          prunedForTavily = [...head, ...tail];
        }

        const historySummary = prunedForTavily
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n");

        const prompt = `
          Current Conversation:
          ${historySummary}
          
          New User Message: ${args.query}
          
         Based on the following chat history, rewrite the user's latest question into a descriptive standalone search query for a news search engine.
         Return ONLY the search query text.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        if (result.response.usageMetadata) {
          console.log(
            "Tavily Query Refinement - Input Tokens:",
            result.response.usageMetadata.promptTokenCount,
          );
          console.log(
            "Tavily Query Refinement - Output Tokens:",
            result.response.usageMetadata.candidatesTokenCount,
          );
        }

        if (text) {
          refinedQuery = text;
          console.log("Synthesized search query:", refinedQuery);
        }
      } catch (err) {
        console.error("Failed to refine query with Gemini:", err);
      }
    }

    const tvly = tavily({ apiKey: tavilyKey });

    // Search results from tavily api
    const searchResult = await tvly.search(refinedQuery, {
      topic: "general",
      searchDepth: "advanced",
      includeAnswer: false,
      maxResults: 5,
    });

    // Reducing search result tokens
    return searchResult.results
      .map(
        (r: any, i: number) =>
          `SOURCE [${i + 1}]: ${r.title}\nContent: ${r.content}\nURL: ${r.url}`,
      )
      .join("\n\n");
  },
});
