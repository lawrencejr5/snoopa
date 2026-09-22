"use client";

import AdminShell from "../../components/AdminShell";
import TableManagerView from "../../components/TableManagerView";

export default function CrudPage() {
  return (
    <AdminShell>
      <TableManagerView />
    </AdminShell>
  );
}
