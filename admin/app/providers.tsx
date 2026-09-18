"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://cheerful-bear-807.convex.cloud";

export function Providers({ children }: { children: ReactNode }) {
  const [convex] = useState(() => new ConvexReactClient(convexUrl));

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
