"use client";

import { useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AdminAuth from "./AdminAuth";

interface AdminShellProps {
  children: ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const [token, setToken] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Check stored token on load
  useEffect(() => {
    const savedToken = localStorage.getItem("snoopa_admin_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const sessionCheck = useQuery(
    api.admin.verifyAdminSession,
    token ? { token } : "skip"
  );

  if (!token || sessionCheck?.valid === false) {
    return <AdminAuth onAuthenticated={(newToken) => setToken(newToken)} />;
  }

  if (token && sessionCheck === undefined) {
    return (
      <div className="auth-wrapper">
        <div style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Authenticating Snoopa Admin Session...
        </div>
      </div>
    );
  }

  const adminName = sessionCheck?.admin?.name || "Admin";
  const adminEmail = sessionCheck?.admin?.email || "admin@snoopa.app";

  const getTabTitle = () => {
    if (pathname === "/" || pathname === "/analytics") {
      return "Analytics & Revenue Intelligence";
    }
    if (pathname === "/customers") {
      return "Customer Explorer & Profile Intel";
    }
    if (pathname.startsWith("/customers/")) {
      return "Customer Profile & Intel Detail";
    }
    if (pathname === "/watchlists") {
      return "Watchlist Intelligence & Proactive Snoopers";
    }
    if (pathname.startsWith("/watchlists/")) {
      return "Watchlist Detail & Intel History";
    }
    if (pathname.startsWith("/crud")) {
      return "Database Table Manager";
    }
    if (pathname.startsWith("/reports-feedback")) {
      return "Customer Reports & Feedback Submissions";
    }
    return "Admin Dashboard";
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-wrapper">
        <Header
          title={getTabTitle()}
          adminName={adminName}
          adminEmail={adminEmail}
          token={token}
          onSignOut={() => {
            setToken(null);
            router.push("/");
          }}
          onRefresh={() => {
            router.refresh();
          }}
        />

        <main className="content-body">{children}</main>
      </div>
    </div>
  );
}
