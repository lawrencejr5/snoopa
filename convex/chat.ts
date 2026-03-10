import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import OpenAI from "openai";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";

// --- Queries ---

/**
 * Get all messages for a specific session.
 */
export const get_messages = query({
  args: { session_id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return [];

    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== user_id) {
      throw new Error("Session not found or unauthorized");
    }

    return await ctx.db
      .query("chats")
      .withIndex("by_session", (q) => q.eq("session_id", args.session_id))
      .order("asc")
      .collect();
  },
});

/**
 * Count unseen snoopa messages in a session.
 * Used to show the red dot on the "Go to chat" button from the snoop details page.
 */
export const get_unseen_chats_count = query({
  args: { session_id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) return 0;

    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== user_id) return 0;

    const unseen = await ctx.db
      .query("chats")
      .withIndex("by_session", (q) => q.eq("session_id", args.session_id))
      .filter((q) =>
        q.and(q.eq(q.field("role"), "snoopa"), q.eq(q.field("seen"), false)),
      )
      .collect();

    return unseen.length;
  },
});

/**
 * Mark all unseen snoopa messages in a session as seen.
 * Called when the user opens the chat screen.
 */
export const mark_chats_seen = mutation({
  args: { session_id: v.id("sessions") },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== user_id) {
      throw new Error("Session not found or unauthorized");
    }

    const unseenChats = await ctx.db
      .query("chats")
      .withIndex("by_session", (q) => q.eq("session_id", args.session_id))
      .filter((q) =>
        q.and(q.eq(q.field("role"), "snoopa"), q.eq(q.field("seen"), false)),
      )
      .collect();

    await Promise.all(
      unseenChats.map((chat) => ctx.db.patch(chat._id, { seen: true })),
    );
  },
});

// --- Mutations ---

/**
 * Internal mutation to save a message.
 */
export const save_message = internalMutation({
  args: {
    session_id: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("snoopa")),
    content: v.string(),
    type: v.optional(
      v.union(
        v.literal("snoop"),
        v.literal("watchlist"),
        v.literal("chat"),
        v.literal("search"),
      ),
    ),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.insert("chats", {
      session_id: args.session_id,
      role: args.role,
      content: args.content,
      // User messages are always "seen" by the user; snoopa messages start unseen
      seen: args.role === "user" ? true : false,
      type: args.type,
      sources: args.sources,
    });

    // Update session's last_updated time
    await ctx.db.patch(args.session_id, {
      last_updated: Date.now(),
    });

    return message;
  },
});

/**
 * Mutation to update the type of a chat message.
 */
export const update_chat_type = mutation({
  args: {
    old_type: v.any(),
    type: v.union(
      v.literal("snoop"),
      v.literal("watchlist"),
      v.literal("chat"),
      v.literal("search"),
    ),
  },
  handler: async (ctx, args) => {
    const chats = await ctx.db
      .query("chats")
      .filter((q) => q.eq(q.field("type"), args.old_type))
      .collect();

    for (const chat of chats) {
      await ctx.db.patch("chats", chat._id, { type: args.type });
    }
  },
});

/**
 * Migration: backfill seen=true for user messages and seen=false for snoopa messages
 * where seen is currently undefined.
 */
export const migrate_seen_field = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allChats = await ctx.db.query("chats").collect();
    const toUpdate = allChats.filter((c) => c.seen === undefined);

    await Promise.all(toUpdate.map((c) => ctx.db.patch(c._id, { seen: true })));

    return `Updated ${toUpdate.length} chats!`;
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentDateTime() {
  return new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZoneName: "short",
  });
}

// ---------------------------------------------------------------------------
// Shared intent detection helper
// ---------------------------------------------------------------------------

type Intent = "SEARCH" | "WATCHLIST" | "CHAT";

async function _detectIntent(
  content: string,
  history?: string,
): Promise<Intent> {
  const api_key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!api_key) return "CHAT";

  try {
    const gen_ai = new GoogleGenerativeAI(api_key);
    const model = gen_ai.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `Analyze this user message and classify the intent.
      ${history ? `RECENT HISTORY:\n${history}\n` : ""}
      USER MESSAGE: "${content}"

      Classify as ONE of:
      - SEARCH: current/live web information, news, prices, scores, recent events, anything requiring data from the last 24 hours. Includes 'is X happening', 'did Y happen', 'I heard Z is happening'.
      - WATCHLIST: user wants to track, monitor, save, or be notified about something. E.g. 'track Bitcoin', 'watch for iPhone deals', 'notify me when Z happens', 'snoop on X'.
      - CHAT: conversational, general knowledge, opinions, or greetings.

      Reply with ONLY one word: SEARCH, WATCHLIST, or CHAT.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toUpperCase();
    console.log(`🔍 Intent: "${content.substring(0, 50)}" → ${text}`);

    if (text.includes("WATCHLIST")) return "WATCHLIST";
    if (text.includes("SEARCH")) return "SEARCH";
    return "CHAT";
  } catch (err) {
    console.warn("Intent detection failed, defaulting to CHAT:", err);
    return "CHAT";
  }
}

// --- Actions ---

/**
 * Lightweight action to detect the intent of a user message.
 * Call this before send_message to show context-aware loading text on the frontend.
 */
export const detect_intent = action({
  args: { content: v.string(), history: v.optional(v.string()) },
  handler: async (_ctx, args) => _detectIntent(args.content, args.history),
});

/**
 * Action to send a message to the AI and get a response.
 */
export const send_message = action({
  args: {
    session_id: v.optional(v.id("sessions")),
    content: v.string(),
    intent: v.optional(
      v.union(v.literal("SEARCH"), v.literal("WATCHLIST"), v.literal("CHAT")),
    ),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    // 1. Create session if needed
    const isNewSession = !args.session_id;
    let currentSessionId: Id<"sessions">;

    if (args.session_id) {
      currentSessionId = args.session_id;
    } else {
      currentSessionId = await ctx.runMutation(
        internal.session.create_session,
        {
          user_id,
          title: "New Chat",
        },
      );
    }

    // 2. Save user message
    await ctx.runMutation(internal.chat.save_message, {
      session_id: currentSessionId,
      role: "user",
      content: args.content,
    });

    // 3. Fetch history for context
    const dbMessages = await ctx.runQuery(api.chat.get_messages, {
      session_id: currentSessionId,
    });
    let messages;
    if (dbMessages.length <= 6) {
      messages = dbMessages;
    } else {
      const head = dbMessages.slice(0, 2);
      const tail = dbMessages.slice(-4);
      messages = [...head, ...tail];
    }

    // 4. Initialize Gemini
    const api_key = process.env.GOOGLE_GEMINI_API_KEY;
    if (!api_key) {
      throw new Error("GOOGLE_API_KEY is not set in environment variables");
    }

    const gen_ai = new GoogleGenerativeAI(api_key);
    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com", // This routes requests to DeepSeek
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    // Prepare history for context
    const mappedHistory = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 5. Detect intent: SEARCH, WATCHLIST, or CHAT
    // If pre-detected by the frontend (via detect_intent), use it; otherwise run detection now.
    const intent: Intent =
      args.intent ??
      (await _detectIntent(
        args.content,
        mappedHistory
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n"),
      ));

    console.log(`🔍 Intent${args.intent ? " (pre-detected)" : ""}: ${intent}`);

    // 6. Conditionally fetch search results from Tavily (only for SEARCH intent)
    const needsSearch = intent === "SEARCH";
    let leanNews = "";
    if (needsSearch) {
      leanNews = await ctx.runAction(internal.tavily.search, {
        query: args.content,
        history: mappedHistory,
      });
    }

    // 7. For WATCHLIST intent, fetch recent canonical topics for context
    let recentTopics: string[] = [];
    if (intent === "WATCHLIST") {
      recentTopics = await ctx.runQuery(
        api.watchlist.get_recent_canonical_topics,
      );
    }

    // 7.5 Fetch user context for personalization
    const user = await ctx.runQuery(api.users.get_current_user);
    const fullname = user?.fullname || "User";
    const username = user?.username || "My friend";
    const userMemory = user?.memory || "No personal context provided yet.";

    // 8. Build system prompt and message history (shared across model calls)
    const currentDateTime = getCurrentDateTime();
    let instructions = `You are Snoopa, a proactive AI agent that hunts for verified facts and 'snoops' them to users, developed by Lawjun Technologies.
      Your mascot is a Greyhound - fast, lean, and sharp. You provide accurate, verified information in a modern, clean, and elegant tone and help save watchlists to track updates.
      
      USER CONTEXT:
      - Name: ${fullname}
      - Username: ${username}
      - Memory/Preferences: ${userMemory}
      
      You should always refer to the user by their username (${username}) when appropriate.
      
      CURRENT DATE AND TIME: ${currentDateTime}
      
      You can also save watchlists for information users want to track. When the user mentions something that should be monitored, offer to track it: "Do you want me to save this as a watchlist for you and track it?"
      Tailor your response length to the user's intent: be descriptive when needed, but stay direct and speed-optimized for simple queries. Always be Snoopa.`;

    if (intent === "SEARCH") {
      instructions += `\n\nYou are being provided with web search results. Always cite your sources when giving news or factual information.`;
    } else if (intent === "WATCHLIST") {
      const topicsContext =
        recentTopics.length > 0
          ? `\n\n Existing canonical topics in the system (use these to group similar items, or create a new one if no match):\n        ${recentTopics.map((t) => `"${t}"`).join(", ")}`
          : "";

      instructions += `\n\nThe user wants to add something to their watchlist. Extract the watchlist item details and respond with EXACTLY this format:

        <Your friendly confirmation message here, 1-2 sentences acknowledging what you're tracking for them>
        ---WATCHLIST_DATA---
        {"title": "<concise title, max 8 words>", "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"], "condition": "<clear, specific condition or rule that defines when this watchlist item should trigger an alert>", "canonical_topic": "<2-4 word topic label that best describes the watchlist for easy searching.>"}

        Rules:
        - The title should be clear and specific (e.g. "Bitcoin Price Movement", "iPhone 16 Pro Deals")
        - The keywords array should contain 3-6 targeted search terms relevant to tracking this item
        - The condition should be a precise, actionable rule (e.g. "Alert when Bitcoin price drops below $80,000" or "Notify when a new iPhone 16 Pro deal appears under $900")
        - The canonical_topic must be a short 2-4 word label, most likely the first keyword. Please avoid canonical topics that are too broad, generate canonical topics that when searched would bring out results for that watchlist in the first 10 results Reuse an existing topic if it fits, otherwise create a new one.${topicsContext}
        - The confirmation message should be in Snoopa's voice — sharp, proactive, and cool
        - Do NOT include markdown formatting in the response`;
    } else {
      instructions += `\n\nBe conversational and friendly for general chat.`;
    }

    // Build the user prompt (inject search results for SEARCH intent)
    const userPrompt =
      intent === "SEARCH"
        ? `SEARCH RESULTS: ${leanNews}\n\nUSER QUESTION: ${args.content}`
        : args.content;

    const openai_history = [
      ...messages.slice(0, -1).map((msg) => ({
        role: (msg.role === "user" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: msg.content,
      })),
    ];
    // OpenAI-compatible message array (used by DeepSeek)
    const openaiMessages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      { role: "system", content: instructions },
      ...openai_history,
      { role: "user", content: userPrompt },
    ];

    // 9. Try DeepSeek first, fall back to Gemini 2.5 flash lite
    let response_text = "";
    let lastError: any = null;

    // --- Primary: DeepSeek ---
    try {
      const result = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: openaiMessages,
      });
      response_text = result.choices[0].message.content ?? "";
      console.log(
        `✅ Success (deepseek-chat) - Input: ${result.usage?.prompt_tokens}, Output: ${result.usage?.completion_tokens}`,
      );
    } catch (error: any) {
      lastError = error;
      console.warn(
        `⚠️ DeepSeek failed:`,
        error.message?.split(":")[0] || error.message || "Unknown error",
      );

      // --- Fallback: Gemini 2.5 flash lite ---
      try {
        const fallbackModel = gen_ai.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: instructions,
        });

        const geminiHistory = messages.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

        const chat_session = fallbackModel.startChat({
          history: geminiHistory.slice(0, -1),
        });

        const result = await chat_session.sendMessage(userPrompt);
        response_text = result.response.text();
        console.log(`✅ Success (gemini-2.5-flash, fallback)`);
      } catch (fallbackError: any) {
        console.error("All AI models failed. Last error:", fallbackError);

        const error_message =
          "Sorry, I hit a snag while snooping. Try again in a bit.";
        await ctx.runMutation(internal.chat.save_message, {
          session_id: currentSessionId,
          role: "snoopa",
          content: error_message,
        });

        throw new Error("All AI models failed.");
      }
    }

    // 9. Save AI response
    await ctx.runMutation(internal.chat.save_message, {
      session_id: currentSessionId,
      role: "snoopa",
      content: response_text,
      type: intent.toLowerCase() as "watchlist" | "search" | "chat",
    });

    // 10. Generate session title with Gemini if this is a new session
    if (isNewSession) {
      try {
        const titleModel = gen_ai.getGenerativeModel({
          model: "gemini-2.0-flash-lite",
        });
        const titleResult = await titleModel.generateContent(
          `Generate a short, concise title (max 6 words) for a chat that starts with this question: "${args.content}". Return ONLY the title text, nothing else. No quotes.`,
        );
        const title = titleResult.response.text().trim();
        if (title) {
          await ctx.runMutation(internal.session.set_title, {
            session_id: currentSessionId,
            title,
          });
        }
      } catch (err) {
        console.warn("Failed to generate session title:", err);
        // Not critical — the session still works with "New Chat"
      }
    }

    return { response: response_text, session_id: currentSessionId };
  },
});
