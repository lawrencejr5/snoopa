"use node";

import { OpenAI } from "@posthog/ai/openai";
import { PostHog } from "posthog-node";
import VendorOpenAI from "openai";

const projectToken = process.env.POSTHOG_PROJECT_TOKEN;
const host = process.env.POSTHOG_HOST;

if (process.env.NODE_ENV === "development" && !projectToken) {
  throw new Error(
    "POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured",
  );
}

if (process.env.NODE_ENV === "development" && !host) {
  throw new Error(
    "POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured",
  );
}

const posthog =
  projectToken && host
    ? new PostHog(projectToken, {
        host,
        privacyMode: false,
        flushAt: 1,
        flushInterval: 0,
      })
    : undefined;

export type AIObservabilityContext = {
  sessionId: string;
  traceId: string;
  distinctId?: string;
};

export function createAIObservabilityContext(
  sessionId: string,
  distinctId?: string,
): AIObservabilityContext {
  return {
    sessionId,
    traceId: crypto.randomUUID(),
    distinctId,
  };
}

export function aiObservabilityOptions(
  context: AIObservabilityContext,
  provider: "deepseek" | "openrouter",
) {
  if (!posthog) return {};

  return {
    ...(context.distinctId
      ? { posthogDistinctId: context.distinctId }
      : {}),
    posthogTraceId: context.traceId,
    posthogProperties: {
      $ai_session_id: context.sessionId,
      $ai_provider: provider,
    },
  };
}

export function createAIClient(options: any) {
  if (!posthog) return new VendorOpenAI(options);

  return new OpenAI({
    ...options,
    posthog,
  });
}

export async function flushAIObservability() {
  await posthog?.flush();
}
