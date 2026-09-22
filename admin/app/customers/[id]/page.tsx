"use client";

import { useParams } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import AdminShell from "../../../components/AdminShell";
import CustomerDetailPage from "../../../components/CustomerDetailPage";

export default function CustomerDetailRoutePage() {
  const params = useParams();
  const userId = params.id as Id<"users">;

  return (
    <AdminShell>
      <CustomerDetailPage userId={userId} />
    </AdminShell>
  );
}
