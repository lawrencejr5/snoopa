"use client";

import { useParams } from "next/navigation";
import { Id } from "@convex/_generated/dataModel";
import CustomerDetailPage from "../../../components/CustomerDetailPage";

export default function CustomerDetailRoutePage() {
  const params = useParams();
  const userId = params.id as Id<"users">;

  return <CustomerDetailPage userId={userId} />;
}
