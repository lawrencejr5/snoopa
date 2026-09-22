"use client";

import { useParams } from "next/navigation";
import { Id } from "@convex/_generated/dataModel";
import WatchlistDetailPage from "../../../components/WatchlistDetailPage";

export default function WatchlistDetailRoutePage() {
  const params = useParams();
  const watchlistId = params.id as Id<"watchlist">;

  return <WatchlistDetailPage watchlistId={watchlistId} />;
}
