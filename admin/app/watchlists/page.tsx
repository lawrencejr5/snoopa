"use client";

import { Suspense } from "react";
import WatchlistsView from "../../components/WatchlistsView";

export default function WatchlistsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
          Loading Watchlist Intelligence...
        </div>
      }
    >
      <WatchlistsView />
    </Suspense>
  );
}

