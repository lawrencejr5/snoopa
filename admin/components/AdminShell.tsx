"use client";

import { useEffect, useState, ReactNode } from "react";
import Image from "next/image";
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Check stored token on load
  useEffect(() => {
    const savedToken = localStorage.getItem("snoopa_admin_token");
    if (savedToken) {
      setToken(savedToken);
    }
    setIsInitializing(false);
  }, []);

  const sessionCheck = useQuery(
    api.admin.verifyAdminSession,
    token ? { token } : "skip"
  );

  // Show loading screen while reading stored token or validating session with Convex
  if (isInitializing || (token && sessionCheck === undefined)) {
    return (
      <div className="auth-wrapper">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              src="/images/icon-nobg.png"
              alt="Snoopa Logo"
              width={48}
              height={48}
              style={{ objectFit: "contain" }}
            />
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>
            Authenticating Snoopa Admin Session...
          </div>
        </div>
      </div>
    );
  }

  if (!token || sessionCheck?.valid === false) {
    return <AdminAuth onAuthenticated={(newToken) => setToken(newToken)} />;
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
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

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
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="content-body">{children}</main>
      </div>
    </div>
  );
}
