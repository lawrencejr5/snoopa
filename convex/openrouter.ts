import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  aiObservabilityOptions,
  createAIClient,
  createAIObservabilityContext,
  flushAIObservability,
  type AIObservabilityContext,
} from "./ai_observability";

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
  observability: AIObservabilityContext = createAIObservabilityContext(
    `openrouter-${crypto.randomUUID()}`,
  ),
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  const client = createAIClient({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://snoopa.lawjun.ng",
      "X-Title": "Snoopa",
    },
  });
  const response: any = await (client as any).chat.completions.create({
    model,
    messages,
    ...aiObservabilityOptions(observability, "openrouter"),
  });
  await flushAIObservability();

  const text = response.choices?.[0]?.message?.content;
  if (text === undefined || text === null) {
    throw new Error("OpenRouter response did not contain message content");
  }

  if (response.usage) {
    console.log(
      `[OpenRouter] model: ${model} - Prompt tokens: ${response.usage.prompt_tokens}, Completion tokens: ${response.usage.completion_tokens}`,
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
  observability?: AIObservabilityContext,
): Promise<string> {
  const messages: OpenRouterMessage[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });
  return callOpenRouter(messages, model, observability);
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
        "google/gemini-2.5-flash-lite",
        createAIObservabilityContext(`openrouter-test-${crypto.randomUUID()}`),
      );
      return { success: true, response };
    } catch (e: any) {
      console.error("[Test] OpenRouter Gemini failed:", e);
      return { success: false, error: e.message || String(e) };
    }
  },
});
