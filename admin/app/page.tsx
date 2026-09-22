"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Sidebar, { TabType } from "../components/Sidebar";
import Header from "../components/Header";
import AdminAuth from "../components/AdminAuth";
import AnalyticsView from "../components/AnalyticsView";
import CustomersView from "../components/CustomersView";
import WatchlistsView from "../components/WatchlistsView";
import TableManagerView from "../components/TableManagerView";
import ReportsFeedbackView from "../components/ReportsFeedbackView";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [refreshKey, setRefreshKey] = useState(0);

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

  const isAuthenticated = !!token && sessionCheck?.valid === true;

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
    switch (activeTab) {
      case "analytics":
        return "Analytics & Revenue Intelligence";
      case "customers":
        return "Customer Explorer & Profile Intel";
      case "watchlists":
        return "Watchlist Intelligence & Proactive Snoopers";
      case "crud":
        return "Database Table Manager";
      case "reports_feedback":
        return "Customer Reports & Feedback Submissions";
      default:
        return "Admin Dashboard";
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-wrapper">
        <Header
          title={getTabTitle()}
          adminName={adminName}
          adminEmail={adminEmail}
          token={token}
          onSignOut={() => setToken(null)}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />

        <main className="content-body" key={refreshKey}>
          {activeTab === "analytics" && <AnalyticsView />}
          {activeTab === "customers" && <CustomersView />}
          {activeTab === "watchlists" && <WatchlistsView />}
          {activeTab === "crud" && <TableManagerView />}
          {activeTab === "reports_feedback" && <ReportsFeedbackView />}
        </main>
      </div>
    </div>
  );
}
