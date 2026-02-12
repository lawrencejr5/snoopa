import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
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
    session_id: v.id("sessions"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user_id = await getAuthUserId(ctx);
    if (!user_id) throw new Error("Not authenticated");

    // 1. Save user message
    await ctx.runMutation(internal.chat.save_message, {
      session_id: args.session_id,
      role: "user",
      content: args.content,
    });

    // 2. Fetch history for context
    const messages = await ctx.runQuery(api.chat.get_messages, {
      session_id: args.session_id,
    });

    // 3. Initialize Gemini
    const api_key = process.env.GOOGLE_GEMINI_API_KEY;
    if (!api_key) {
      throw new Error("GOOGLE_API_KEY is not set in environment variables");
    }

    const gen_ai = new GoogleGenerativeAI(api_key);
    // Search results from tavily via internal action
    const leanNews = await ctx.runAction(internal.tavily.search, {
      query: args.content,
    });

    // User requested gemini-2.5-flash
    const model = gen_ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are Snoopa, a proactive AI agent that hunts for verified facts and 'snoops' them to users. Your mascot is a Greyhound - fast, lean, and sharp. You provide accurate, verified information in a modern, clean, and elegant tone. Be direct but detailed, and also site your sources when giving news. If you snoop something, be sure it's verified. Don't be verbose; be speed-optimized.",
    });

    // Prepare history for Gemini
    const history = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Remove the last message from history as it's the one we're sending now
    const chat_session = model.startChat({
      history: history.slice(0, -1),
    });

    // 4. Get AI Response
    try {
      const prompt = `
          SEARCH RESULTS: ${leanNews}
          USER QUESTION: ${args.content}
        `;
      const result = await chat_session.sendMessage(prompt);
      const response = result.response;
      const text = response.text();

      // 5. Save AI response
      await ctx.runMutation(internal.chat.save_message, {
        session_id: args.session_id,
        role: "snoopa",
        content: text,
      });

      return text;
    } catch (error) {
      console.error("Gemini Error:", error);

      const error_message =
        "Sorry, I hit a snag while snitching. Try again in a bit.";
      await ctx.runMutation(internal.chat.save_message, {
        session_id: args.session_id,
        role: "snoopa",
        content: error_message,
      });

      throw new Error("Failed to get AI response");
    }
  },
});
