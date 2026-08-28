"use node";

import { generateContentWithGemini } from "./openrouter";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// ---------------------------------------------------------------------------
// Main action — scrape + AI extraction
// ---------------------------------------------------------------------------

/**
 * Scrape Google News RSS via Firecrawl, then use DeepSeek to distil
 * 10 curated, trackable trending topics. Results are stored in
 * trending_cache so the frontend can read them reactively via
 * watchlist.get_trending_topics.
 *
 * Invoked by the cron in crons.ts every 3 hours.
 * Can also be triggered manually:
 *   npx convex run trending:refresh_trending_topics
 */
export const refresh_trending_topics = internalAction({
  args: {},
  handler: async (ctx) => {
    const firecrawl_key = process.env.FIRECRAWL_API_KEY;
    const deepseek_key = process.env.DEEPSEEK_API_KEY;
    const openrouter_key = process.env.OPENROUTER_API_KEY;

    if (!firecrawl_key) {
      console.error("[Trending] FIRECRAWL_API_KEY not set");
      return;
    }
    if (!deepseek_key && !openrouter_key) {
      console.error("[Trending] Neither DEEPSEEK_API_KEY nor OPENROUTER_API_KEY is set");
      return;
    }

    // ------------------------------------------------------------------
    // 1. Scrape Google News RSS
    // ------------------------------------------------------------------
    const NEWS_URL = "https://news.google.com/rss/headlines/section/topic/WORLD";
    let raw_content = "";

    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawl_key}`,
        },
        body: JSON.stringify({
          url: NEWS_URL,
          formats: ["markdown"],
        }),
      });

      if (!res.ok) {
        console.error(`[Trending] Firecrawl failed — HTTP ${res.status}: ${await res.text()}`);
        return;
      }

      const data = await res.json();
      raw_content = data?.data?.markdown || "";

      if (!raw_content) {
        console.warn("[Trending] Firecrawl returned empty content");
        return;
      }

      console.log(`[Trending] Scraped ${raw_content.length} chars from Google News RSS`);
    } catch (err) {
      console.error("[Trending] Firecrawl scrape error:", err);
      return;
    }

    // ------------------------------------------------------------------
    // 2. Ask DeepSeek (with Gemini fallback) for 10 curated topics
    // ------------------------------------------------------------------
    const system_prompt = `You are an intelligence analyst for Snoopa, a real-time news tracking app.
Given the raw content scraped from Google News, extract exactly 10 of the most significant, trackable world topics that users would genuinely want to monitor over the next few days.

Return ONLY a valid JSON array of exactly 10 objects with these fields:
- "topic": A canonical watchlist label — NOT a headline or sentence. Format it as the subject/entity plus brief context, like a user would name a watchlist they're creating. Examples: "Iran US Gulf Tensions", "Apple AI Integration", "Gaza Ceasefire Talks", "Bitcoin Market Volatility", "Eder Militao Injury Update". Max 5 words, no verbs, no articles like "the/a/an", no punctuation.
- "category": One of: Sports, Tech, Finance, Politics, Science, Entertainment, Health, World
- "summary": One sentence explaining why this is worth tracking right now
- "suggested_condition": A clear, specific condition for Snoopa to watch (e.g. "Notify me when there is a major development or update on this story")
- "keywords": Array of 3-5 precise search keywords for monitoring

Do NOT include any markdown, explanation, or text outside the JSON array.`;

    const user_prompt = `Here is the scraped Google News content (may be truncated):

${raw_content.slice(0, 12000)}

Extract exactly 10 trackable trending topics from this content.`;

    let topics_json: any[] = [];

    // Try DeepSeek first
    if (deepseek_key) {
      try {
        const openai = new OpenAI({
          baseURL: "https://api.deepseek.com",
          apiKey: deepseek_key,
        });
        const response = await openai.chat.completions.create({
          model: "deepseek-v4-flash",
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: user_prompt },
          ],
          response_format: { type: "json_object" },
        });
        const text = response.choices[0].message.content?.trim() ?? "";
        // DeepSeek wraps arrays in an object — handle both shapes
        const parsed = JSON.parse(text);
        topics_json = Array.isArray(parsed)
          ? parsed
          : parsed.topics ?? parsed.data ?? Object.values(parsed)[0] ?? [];
        console.log(`[Trending] DeepSeek returned ${topics_json.length} topics`);
      } catch (err) {
        console.warn("[Trending] DeepSeek failed, trying Gemini fallback:", err);
      }
    }

    // Gemini fallback
    if (topics_json.length === 0 && openrouter_key) {
      try {
        let text = await generateContentWithGemini(user_prompt, system_prompt, "google/gemini-2.5-flash-lite");
        text = text.trim();
        // Strip markdown code fences if present
        text = text.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
        const parsed = JSON.parse(text);
        topics_json = Array.isArray(parsed)
          ? parsed
          : parsed.topics ?? parsed.data ?? Object.values(parsed)[0] ?? [];
        console.log(`[Trending] Gemini via OpenRouter returned ${topics_json.length} topics`);
      } catch (err) {
        console.error("[Trending] Gemini fallback also failed:", err);
        return;
      }
    }

    if (!topics_json.length) {
      console.error("[Trending] No topics extracted");
      return;
    }

    // ------------------------------------------------------------------
    // 3. Validate & persist to trending_cache
    // ------------------------------------------------------------------
    const refreshed_at = Date.now();
    const valid_topics = topics_json
      .filter(
        (t: any) =>
          t.topic &&
          t.category &&
          t.summary &&
          t.suggested_condition &&
          Array.isArray(t.keywords),
      )
      .slice(0, 10)
      .map((t: any) => ({
        topic: String(t.topic).slice(0, 80),
        category: String(t.category).slice(0, 30),
        summary: String(t.summary).slice(0, 200),
        suggested_condition: String(t.suggested_condition).slice(0, 300),
        keywords: (t.keywords as string[]).slice(0, 5).map((k) => String(k)),
        refreshed_at,
      }));

    // Swap the cache atomically: clear old rows, insert fresh ones
    await ctx.runMutation(internal.watchlist.clear_trending_cache, {});
    await ctx.runMutation(internal.watchlist.insert_trending_topics, {
      topics: valid_topics,
    });

    console.log(`[Trending] Cache refreshed with ${valid_topics.length} topics`);
  },
});
