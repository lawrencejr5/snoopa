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
    const dbMessages = await ctx.runQuery(api.chat.get_messages, {
      session_id: args.session_id,
    });
    let messages;
    if (dbMessages.length <= 6) {
      // If the chat is short, just send everything
      messages = dbMessages;
    } else {
      // KEEP: First 2 messages (First Question + First Answer)
      const head = dbMessages.slice(0, 2);
      // KEEP: Last 4 messages (Current Context)
      const tail = dbMessages.slice(-4);

      messages = [...head, ...tail];
    }
    // 3. Initialize Gemini
    const api_key = process.env.GOOGLE_GEMINI_API_KEY;
    if (!api_key) {
      throw new Error("GOOGLE_API_KEY is not set in environment variables");
    }

    const gen_ai = new GoogleGenerativeAI(api_key);

    // Prepare history for Gemini
    const mappedHistory = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Search results from tavily via internal action
    const leanNews = await ctx.runAction(internal.tavily.search, {
      query: args.content,
      history: mappedHistory,
    });

    // 4. Try models in order with automatic fallback
    const modelsToTry = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];
    let response_text = "";
    let lastError: any = null;

    const instructions = `You are Snoopa, a proactive AI agent that hunts for verified facts and 'snoops' them to users developed my Lawjun Technologies.
      Your mascot is a Greyhound - fast, lean, and sharp. You provide accurate, verified information in a modern, clean, and elegant tone.
      Determine from the user's prompt if you need to be descriptive or very direct.
      Always site your sources when giving news.
      If you snoop something, be sure it's verified. Don't be verbose; be speed-optimized.`;
    for (const model_name of modelsToTry) {
      try {
        const model = gen_ai.getGenerativeModel({
          model: model_name,
          systemInstruction: instructions,
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

        const prompt = `SEARCH RESULTS: ${leanNews}\nUSER QUESTION: ${args.content}`;
        const result = await chat_session.sendMessage(prompt);
        const response = result.response;
        response_text = response.text();

        if (response.usageMetadata) {
          console.log(
            `✅ Success (${model_name}) - Input: ${response.usageMetadata.promptTokenCount}, Output: ${response.usageMetadata.candidatesTokenCount}`,
          );
        }

        // Success! Break out of the loop
        break;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `⚠️ Failed with ${model_name}:`,
          error.message?.split(":")[0] || error.message || "Unknown error",
        );

        // If it's the last model in the list, we have to give up
        if (model_name === modelsToTry[modelsToTry.length - 1]) {
          console.error("All AI models failed. Last error:", lastError);

          const error_message =
            "Sorry, I hit a snag while snooping. Try again in a bit.";
          await ctx.runMutation(internal.chat.save_message, {
            session_id: args.session_id,
            role: "snoopa",
            content: error_message,
          });

          throw new Error("All AI models failed.");
        }
        // Otherwise, continue to the next model
      }
    }

    // 5. Save AI response
    await ctx.runMutation(internal.chat.save_message, {
      session_id: args.session_id,
      role: "snoopa",
      content: response_text,
    });

    return response_text;
  },
});
