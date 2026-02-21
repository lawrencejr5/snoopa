import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, query } from "./_generated/server";

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

// --- Mutations ---

/**
 * Internal mutation to save a message.
 */
export const save_message = internalMutation({
  args: {
    session_id: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("snoopa")),
    content: v.string(),
    type: v.optional(v.union(v.literal("snitch"), v.literal("status"))),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.insert("chats", {
      session_id: args.session_id,
      role: args.role,
      content: args.content,
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

// --- Actions ---

/**
 * Action to send a message to the AI and get a response.
 */
export const send_message = action({
  args: {
    session_id: v.optional(v.id("sessions")),
    content: v.string(),
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

    // Prepare history for context
    const mappedHistory = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 5. Detect intent: SEARCH, WATCHLIST, or CHAT
    let intent: "SEARCH" | "WATCHLIST" | "CHAT" = "CHAT";
    try {
      const intentModel = gen_ai.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
      });

      const intentPrompt = `Analyze this user message and determine the intent. Consider the conversation history for context.

        CONVERSATION HISTORY:
        ${mappedHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

        USER MESSAGE: "${args.content}"

        Classify the intent as ONE of:
        - SEARCH: The user wants current/live information from the web (news, current events, recent facts, statistics, live data, specific products/services, prices, scores, weather).
        - WATCHLIST: The user wants to save, track, monitor, or add something to their watchlist. Examples: "track Bitcoin price", "watch for iPhone deals", "monitor this stock", "add X to my watchlist", "keep an eye on Y", "notify me when Z happens", "snoop on X for me".
        - CHAT: The message is conversational, general knowledge, greetings, opinions, or can be answered without web data and is NOT a watchlist request.

        Reply with ONLY one word: SEARCH, WATCHLIST, or CHAT.`;

      const intentResult = await intentModel.generateContent(intentPrompt);
      const intentResponse = intentResult.response.text().trim().toUpperCase();
      console.log("Intent raw:", intentResponse);

      if (intentResponse.includes("WATCHLIST")) {
        intent = "WATCHLIST";
      } else if (intentResponse.includes("SEARCH")) {
        intent = "SEARCH";
      } else {
        intent = "CHAT";
      }

      console.log(
        `🔍 Intent Detection: Query "${args.content.substring(0, 50)}..." → ${intent}`,
      );
    } catch (err) {
      console.warn("Intent detection failed, defaulting to CHAT:", err);
      intent = "CHAT";
    }

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

    // 8. Try models in order with automatic fallback
    const modelsToTry = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];
    let response_text = "";
    let lastError: any = null;

    // Build adaptive system instructions based on intent
    let instructions = `You are Snoopa, a proactive AI agent that hunts for verified facts and 'snoops' them to users developed by Lawjun Technologies.
      Your mascot is a Greyhound - fast, lean, and sharp. You provide accurate, verified information in a modern, clean, and elegant tone.
      Determine from the user's prompt if you need to be descriptive or very direct. Don't be verbose; be speed-optimized.`;

    if (intent === "SEARCH") {
      instructions += `\n\nYou are being provided with web search results. Always cite your sources when giving news or factual information.`;
    } else if (intent === "WATCHLIST") {
      const topicsContext =
        recentTopics.length > 0
          ? `\n\n        Existing canonical topics in the system (use these to group similar items, or create a new one if no match):\n        ${recentTopics.map((t) => `"${t}"`).join(", ")}`
          : "";

      instructions += `\n\nThe user wants to add something to their watchlist. Extract the watchlist item details and respond with EXACTLY this format:

        <Your friendly confirmation message here, 1-2 sentences acknowledging what you're tracking for them>
        ---WATCHLIST_DATA---
        {"title": "<concise title, max 8 words>", "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"], "condition": "<clear, specific condition or rule that defines when this watchlist item should trigger an alert>", "canonical_topic": "<2-4 word topic label, e.g. 'Bitcoin Price', 'Nigeria Politics', 'Premier League'>"}

        Rules:
        - The title should be clear and specific (e.g. "Bitcoin Price Movement", "iPhone 16 Pro Deals")
        - The keywords array should contain 3-6 targeted search terms relevant to tracking this item
        - The condition should be a precise, actionable rule (e.g. "Alert when Bitcoin price drops below $80,000" or "Notify when a new iPhone 16 Pro deal appears under $900")
        - The canonical_topic must be a short 2-4 word label that categorises the subject broadly (e.g. "Bitcoin Price", "Premier League", "Nigeria Fuel Price"). Reuse an existing topic if it fits, otherwise create a new one.${topicsContext}
        - The confirmation message should be in Snoopa's voice — sharp, proactive, and cool
        - Do NOT include markdown formatting in the response`;
    } else {
      instructions += `\n\nBe conversational and friendly for general chat.`;
    }

    for (const model_name of modelsToTry) {
      try {
        const model = gen_ai.getGenerativeModel({
          model: model_name,
          systemInstruction: instructions,
        });

        const history = messages.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

        const chat_session = model.startChat({
          history: history.slice(0, -1),
        });

        // Adjust prompt based on intent
        let prompt = args.content;
        if (intent === "SEARCH") {
          prompt = `SEARCH RESULTS: ${leanNews}\n\nUSER QUESTION: ${args.content}`;
        }

        const result = await chat_session.sendMessage(prompt);
        const response = result.response;
        response_text = response.text();

        if (response.usageMetadata) {
          console.log(
            `✅ Success (${model_name}) - Input: ${response.usageMetadata.promptTokenCount}, Output: ${response.usageMetadata.candidatesTokenCount}`,
          );
        }

        break;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `⚠️ Failed with ${model_name}:`,
          error.message?.split(":")[0] || error.message || "Unknown error",
        );

        if (model_name === modelsToTry[modelsToTry.length - 1]) {
          console.error("All AI models failed. Last error:", lastError);

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
    }

    // 9. Save AI response (with type "status" for watchlist items)
    await ctx.runMutation(internal.chat.save_message, {
      session_id: currentSessionId,
      role: "snoopa",
      content: response_text,
      type: intent === "WATCHLIST" ? "status" : undefined,
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
