"use client";

import { useParams } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import AdminShell from "../../../components/AdminShell";
import WatchlistDetailPage from "../../../components/WatchlistDetailPage";

export default function WatchlistDetailRoutePage() {
  const params = useParams();
  const watchlistId = params.id as Id<"watchlist">;

  return (
    <AdminShell>
      <WatchlistDetailPage watchlistId={watchlistId} />
    </AdminShell>
  );
}
