"use node";

import OpenAI from "openai";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import { generateContentWithGemini } from "./openrouter";

// ---------------------------------------------------------------------------
// Main action — scrape + AI extraction
// ---------------------------------------------------------------------------

export const get_active_countries = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("active_countries")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

/**
 * Scrape Google News RSS natively, then use DeepSeek to distil
 * 10 curated, trackable trending topics for each active country.
 * Results are stored in trending_cache so the frontend can read them reactively.
 *
 * Invoked by the cron in crons.ts every 3 hours.
 */
export const refresh_trending_topics = internalAction({
  args: {},
  handler: async (ctx) => {
    const deepseek_key = process.env.DEEPSEEK_API_KEY;
    const openrouter_key = process.env.OPENROUTER_API_KEY;

    if (!deepseek_key && !openrouter_key) {
      console.error(
        "[Trending] Neither DEEPSEEK_API_KEY nor OPENROUTER_API_KEY is set",
      );
      return;
    }

    const active_countries = await ctx.runQuery(
      internal.trending.get_active_countries,
      {},
    );
    
    // Add WORLD fallback
    const countriesToProcess = [
      ...active_countries,
      { code: "WORLD", gl: "WORLD", hl: "en-US" },
    ];

    for (const country of countriesToProcess) {
      console.log(`[Trending] Processing country: ${country.code}`);
      
      const NEWS_URL =
        country.code === "WORLD"
          ? "https://news.google.com/rss/headlines/section/topic/WORLD"
          : `https://news.google.com/rss?gl=${country.gl}&hl=${country.hl}&ceid=${country.gl}:en`;

      let raw_content = "";

      try {
        const res = await fetch(NEWS_URL);
        if (!res.ok) {
          console.error(`[Trending] Fetch failed for ${country.code} — HTTP ${res.status}`);
          continue;
        }

        const xml = await res.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        const titles = items.map((item) => {
            const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
            return titleMatch ? titleMatch[1] : "";
        }).filter(Boolean).slice(0, 40);

        raw_content = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");

        if (!raw_content) {
          console.warn(`[Trending] No news items found for ${country.code}`);
          continue;
        }

        console.log(`[Trending] Extracted ${titles.length} titles for ${country.code}`);
      } catch (err) {
        console.error(`[Trending] Scrape error for ${country.code}:`, err);
        continue;
      }

      const system_prompt = `You are an intelligence analyst for Snoopa, a real-time news tracking app.
Given the raw news headlines from Google News, extract exactly 10 of the most significant, trackable world topics that users would genuinely want to monitor over the next few days.

Return ONLY a valid JSON array of exactly 10 objects with these fields:
- "topic": A canonical watchlist label — NOT a headline or sentence. Format it as the subject/entity plus brief context, like a user would name a watchlist they're creating. Examples: "Iran US Gulf Tensions", "Apple AI Integration", "Gaza Ceasefire Talks", "Bitcoin Market Volatility", "Eder Militao Injury Update". Max 5 words, no verbs, no articles like "the/a/an", no punctuation.
- "category": One of: Sports, Tech, Finance, Politics, Science, Entertainment, Health, World
- "summary": One sentence explaining why this is worth tracking right now
- "suggested_condition": A clear, specific condition for Snoopa to watch (e.g. "Notify me when there is a major development or update on this story")
- "keywords": Array of 3-5 precise search keywords for monitoring

Do NOT include any markdown, explanation, or text outside the JSON array.`;

      const user_prompt = `Here are the latest news headlines (may be truncated):

${raw_content.slice(0, 8000)}

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
            model: "deepseek-chat",
            messages: [
              { role: "system", content: system_prompt },
              { role: "user", content: user_prompt },
            ],
            response_format: { type: "json_object" },
          });
          const text = response.choices[0].message.content?.trim() ?? "";
          const parsed = JSON.parse(text);
          topics_json = Array.isArray(parsed)
            ? parsed
            : (parsed.topics ?? parsed.data ?? Object.values(parsed)[0] ?? []);
          console.log(`[Trending] DeepSeek returned ${topics_json.length} topics for ${country.code}`);
        } catch (err) {
          console.warn(`[Trending] DeepSeek failed for ${country.code}, trying Gemini fallback:`, err);
        }
      }

      // Gemini fallback
      if (topics_json.length === 0 && openrouter_key) {
        try {
          let text = await generateContentWithGemini(
            user_prompt,
            system_prompt,
            "google/gemini-2.5-flash-lite",
          );
          text = text.trim();
          text = text
            .replace(/^```[\w]*\n?/, "")
            .replace(/\n?```$/, "")
            .trim();
          const parsed = JSON.parse(text);
          topics_json = Array.isArray(parsed)
            ? parsed
            : (parsed.topics ?? parsed.data ?? Object.values(parsed)[0] ?? []);
          console.log(`[Trending] Gemini returned ${topics_json.length} topics for ${country.code}`);
        } catch (err) {
          console.error(`[Trending] Gemini fallback failed for ${country.code}:`, err);
          continue;
        }
      }

      if (!topics_json.length) {
        console.error(`[Trending] No topics extracted for ${country.code}`);
        continue;
      }

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
          country_code: country.code,
          topic: String(t.topic).slice(0, 80),
          category: String(t.category).slice(0, 30),
          summary: String(t.summary).slice(0, 200),
          suggested_condition: String(t.suggested_condition).slice(0, 300),
          keywords: (t.keywords as string[]).slice(0, 5).map((k) => String(k)),
          refreshed_at,
        }));

      // Swap the cache atomically for this country
      await ctx.runMutation(internal.watchlist.clear_trending_cache, { country_code: country.code });
      await ctx.runMutation(internal.watchlist.insert_trending_topics, {
        topics: valid_topics,
      });

      console.log(`[Trending] Cache refreshed with ${valid_topics.length} topics for ${country.code}`);
    }
  },
});
