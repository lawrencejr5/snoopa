import { OpenAI } from "@posthog/ai/openai";
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

/**
 * Lightweight, fetch-based PostHog client compatible with both Convex V8 isolate runtime
 * and Node runtimes without relying on Node built-ins (node:os, node:fs, node:zlib).
 */
class ConvexPostHog {
  private projectToken: string;
  private host: string;
  private queue: any[] = [];

  constructor(projectToken: string, host: string) {
    this.projectToken = projectToken;
    this.host = host.replace(/\/$/, "");
  }

  capture(event: { distinctId?: string; event: string; properties?: any }) {
    const payload = {
      api_key: this.projectToken,
      event: event.event,
      distinct_id:
        event.distinctId || event.properties?.distinct_id || "snoopa-ai",
      properties: {
        ...event.properties,
        $lib: "posthog-convex",
      },
      timestamp: new Date().toISOString(),
    };
    this.queue.push(payload);
  }

  async flush() {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    try {
      await fetch(`${this.host}/batch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.projectToken,
          batch,
        }),
      });
    } catch (err) {
      console.warn("[PostHog] Failed to flush events:", err);
    }
  }

  async shutdown() {
    await this.flush();
  }
}

const posthog =
  projectToken && host ? new ConvexPostHog(projectToken, host) : undefined;

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
