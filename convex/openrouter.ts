"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call the OpenRouter API with a list of messages.
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  model: string = "google/gemini-2.5-flash-lite",
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://snoopa.lawjun.ng",
        "X-Title": "Snoopa",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter API error (HTTP ${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (text === undefined || text === null) {
    throw new Error("OpenRouter response did not contain message content");
  }

  if (data.usage) {
    console.log(
      `[OpenRouter] model: ${model} - Prompt tokens: ${data.usage.prompt_tokens}, Completion tokens: ${data.usage.completion_tokens}`,
    );
  }

  return text;
}

/**
 * Simple helper to generate content with Gemini 2.5 Flash Lite via OpenRouter.
 */
export async function generateContentWithGemini(
  prompt: string,
  systemInstruction?: string,
  model: string = "google/gemini-2.5-flash-lite",
): Promise<string> {
  const messages: OpenRouterMessage[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });
  return callOpenRouter(messages, model);
}

/**
 * Test action to verify OpenRouter Gemini is working correctly.
 */
export const testOpenRouterGemini = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await generateContentWithGemini(
        args.prompt,
        "You are a helpful assistant for Snoopa.",
      );
      return { success: true, response };
    } catch (e: any) {
      console.error("[Test] OpenRouter Gemini failed:", e);
      return { success: false, error: e.message || String(e) };
    }
  },
});
