"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Bell,
  Search,
  Radio,
  CheckCircle2,
  Info,
  Gift,
  Zap,
  ShieldAlert,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";

function formatTimeAgo(timestamp: number) {
  if (!timestamp) return "Never";
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface AdminNotificationItem {
  id: any;
  title: string;
  message: string;
  type: string;
  seen: boolean;
  read: boolean;
  reward_claimed?: boolean;
  created_at: number;
  user_id: any;
  user_email: string;
  user_name: string;
  user_sub_tier: string;
  watchlist_id?: any;
  watchlist_title?: string | null;
  watchlist_status?: string | null;
}

type SortField = "created" | "title" | "user" | "type" | "status";

export default function NotificationsView() {
  const router = useRouter();
  const notifications = useQuery(api.admin.getAdminNotifications) as AdminNotificationItem[] | undefined;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSorted = useMemo(() => {
    if (!notifications) return [];

    return notifications
      .filter((n: AdminNotificationItem) => {
        // Search filter
        const query = search.toLowerCase().trim();
        const matchesSearch =
          !query ||
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.user_email.toLowerCase().includes(query) ||
          n.user_name.toLowerCase().includes(query) ||
          (n.watchlist_title && n.watchlist_title.toLowerCase().includes(query));

        // Type filter
        const matchesType = typeFilter === "all" || n.type === typeFilter;

        // Status filter
        let matchesStatus = true;
        if (statusFilter === "unread") matchesStatus = !n.read;
        else if (statusFilter === "read") matchesStatus = n.read;
        else if (statusFilter === "unseen") matchesStatus = !n.seen;
        else if (statusFilter === "seen") matchesStatus = n.seen;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a: AdminNotificationItem, b: AdminNotificationItem) => {
        let valA: any = a.created_at;
        let valB: any = b.created_at;

        if (sortBy === "title") {
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
        } else if (sortBy === "user") {
          valA = a.user_email.toLowerCase();
          valB = b.user_email.toLowerCase();
        } else if (sortBy === "type") {
          valA = a.type;
          valB = b.type;
        } else if (sortBy === "status") {
          valA = a.read ? 1 : 0;
          valB = b.read ? 1 : 0;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [notifications, search, typeFilter, statusFilter, sortBy, sortOrder]);

  // Compute metric totals
  const stats = useMemo(() => {
    if (!notifications) return { total: 0, alerts: 0, system: 0, unread: 0 };
    return {
      total: notifications.length,
      alerts: notifications.filter((n: AdminNotificationItem) => n.type === "alert").length,
      system: notifications.filter((n: AdminNotificationItem) => n.type === "system" || n.type === "info").length,
      unread: notifications.filter((n: AdminNotificationItem) => !n.read).length,
    };
  }, [notifications]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "alert":
        return (
          <span className="badge badge-gold" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Bell style={{ width: 11, height: 11 }} /> ALERT
          </span>
        );
      case "system":
        return (
          <span className="badge badge-purple" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ShieldAlert style={{ width: 11, height: 11 }} /> SYSTEM
          </span>
        );
      case "snoops":
        return (
          <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Zap style={{ width: 11, height: 11 }} /> SNOOPS
          </span>
        );
      case "reward":
        return (
          <span className="badge badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Gift style={{ width: 11, height: 11 }} /> REWARD
          </span>
        );
      case "info":
      default:
        return (
          <span className="badge badge-muted" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Info style={{ width: 11, height: 11 }} /> INFO
          </span>
        );
    }
  };

  if (!notifications) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
        Loading App Notifications Feed...
      </div>
    );
  }

  return (
    <div>
      {/* Metric KPI Cards Header */}
      <div className="metrics-grid">
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Total App Notifications</span>
            <div className="metric-icon-wrap">
              <Bell style={{ width: 18, height: 18, color: "var(--accent-milk)" }} />
            </div>
          </div>
          <div className="metric-value">{stats.total}</div>
          <div className="metric-sub" style={{ color: "var(--text-secondary)" }}>
            All-time in-app push & system notifications
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Proactive Snoop Alerts</span>
            <div className="metric-icon-wrap">
              <Radio style={{ width: 18, height: 18, color: "var(--accent-warning)" }} />
            </div>
          </div>
          <div className="metric-value">{stats.alerts}</div>
          <div className="metric-sub" style={{ color: "var(--accent-warning)" }}>
            Triggered watchlists alerts
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">System & Info Broadcasts</span>
            <div className="metric-icon-wrap">
              <ShieldAlert style={{ width: 18, height: 18, color: "var(--accent-milk)" }} />
            </div>
          </div>
          <div className="metric-value">{stats.system}</div>
          <div className="metric-sub" style={{ color: "var(--text-secondary)" }}>
            System updates & announcement alerts
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Unread Customer Notifications</span>
            <div className="metric-icon-wrap">
              <CheckCircle2 style={{ width: 18, height: 18, color: "var(--accent-green)" }} />
            </div>
          </div>
          <div className="metric-value">{stats.unread}</div>
          <div className="metric-sub" style={{ color: "var(--accent-green)" }}>
            Pending customer read receipts
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ marginTop: 20 }}>
        {/* Controls Header Row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          {/* Search Bar */}
          <div className="search-bar" style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
            <Search className="search-icon" style={{ width: 16, height: 16 }} />
            <input
              type="text"
              placeholder="Search notifications, messages, customers, or watchlists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ width: "100%", paddingLeft: 38 }}
            />
          </div>

          {/* Filter Group */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Type Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field"
                style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
              >
                <option value="all">All Types</option>
                <option value="alert">Alerts (Snoops)</option>
                <option value="system">System</option>
                <option value="info">Info</option>
                <option value="reward">Reward</option>
                <option value="snoops">Snoops Refill</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
                style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
              >
                <option value="all">All Statuses</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="unseen">Unseen</option>
                <option value="seen">Seen</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("title")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Notification Title & Message
                    {sortBy === "title" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
                    )}
                  </div>
                </th>
                <th onClick={() => toggleSort("user")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Recipient Customer
                    {sortBy === "user" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
                    )}
                  </div>
                </th>
                <th>Watchlist Target</th>
                <th onClick={() => toggleSort("type")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Type
                    {sortBy === "type" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
                    )}
                  </div>
                </th>
                <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Status
                    {sortBy === "status" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
                    )}
                  </div>
                </th>
                <th onClick={() => toggleSort("created")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Sent Time
                    {sortBy === "created" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>
                    No app notifications found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((n: AdminNotificationItem) => (
                  <tr key={n.id.toString()}>
                    {/* Title & Message */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--accent-milk)", marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          maxWidth: 340,
                        }}
                        title={n.message}
                      >
                        {n.message}
                      </div>
                    </td>

                    {/* Recipient Customer */}
                    <td>
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onClick={() => router.push(`/customers?search=${encodeURIComponent(n.user_email)}`)}
                      >
                        <Users style={{ width: 13, height: 13, color: "var(--text-secondary)" }} />
                        <span>{n.user_name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {n.user_email}
                      </div>
                    </td>

                    {/* Watchlist Target */}
                    <td>
                      {n.watchlist_id && n.watchlist_title ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--accent-milk)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                          onClick={() => router.push(`/watchlists/${n.watchlist_id}`)}
                          title="Click to view watchlist intel"
                        >
                          <Radio style={{ width: 13, height: 13, color: "var(--accent-warning)" }} />
                          <span
                            style={{
                              textDecoration: "underline",
                              textDecorationColor: "var(--border-color)",
                            }}
                          >
                            {n.watchlist_title}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>General App Alert</span>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td>{getTypeBadge(n.type)}</td>

                    {/* Read / Seen Status */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        <span className={`badge ${n.read ? "badge-green" : "badge-muted"}`}>
                          {n.read ? "READ" : "UNREAD"}
                        </span>
                        {n.seen && !n.read && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>SEEN</span>
                        )}
                      </div>
                    </td>

                    {/* Sent Time */}
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                        {formatTimeAgo(n.created_at)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
