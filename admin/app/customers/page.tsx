"use client";

import { Suspense } from "react";
import CustomersView from "../../components/CustomersView";

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
          Loading Snoopa Customers...
        </div>
      }
    >
      <CustomersView />
    </Suspense>
  );
}

