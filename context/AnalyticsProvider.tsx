import { PropsWithChildren } from "react";
import { PostHogProvider } from "posthog-react-native";

import { posthog } from "@/utils/posthog";

export default function AnalyticsProvider({ children }: PropsWithChildren) {
  if (!posthog) {
    return children;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
