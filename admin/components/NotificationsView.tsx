"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Gift,
  Info,
  Radio,
  Search,
  ShieldAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const notifications = useQuery(api.admin.getAdminNotifications) as
    AdminNotificationItem[] | undefined;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selected notification for modal
  const [selectedNotification, setSelectedNotification] =
    useState<AdminNotificationItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Close modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedNotification(null);
      }
    };
    if (selectedNotification) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNotification]);

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
          (n.watchlist_title &&
            n.watchlist_title.toLowerCase().includes(query));

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

  // Compute KPI: Delivered this month vs all-time
  const stats = useMemo(() => {
    if (!notifications) return { thisMonth: 0, allTime: 0 };
    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();

    const thisMonth = notifications.filter(
      (n: AdminNotificationItem) => n.created_at >= startOfMonth,
    ).length;
    const allTime = notifications.length;

    return { thisMonth, allTime };
  }, [notifications]);

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long" }).format(
      new Date(),
    );
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleCopyId = (idStr: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(idStr);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "alert":
        return (
          <span
            className="badge badge-gold"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Bell style={{ width: 11, height: 11 }} /> ALERT
          </span>
        );
      case "system":
        return (
          <span
            className="badge badge-purple"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ShieldAlert style={{ width: 11, height: 11 }} /> SYSTEM
          </span>
        );
      case "snoops":
        return (
          <span
            className="badge badge-green"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Zap style={{ width: 11, height: 11 }} /> SNOOPS
          </span>
        );
      case "reward":
        return (
          <span
            className="badge badge-blue"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Gift style={{ width: 11, height: 11 }} /> REWARD
          </span>
        );
      case "info":
      default:
        return (
          <span
            className="badge badge-muted"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Info style={{ width: 11, height: 11 }} /> INFO
          </span>
        );
    }
  };

  const getModalTypeIcon = (type: string) => {
    switch (type) {
      case "alert":
        return (
          <Radio
            style={{ width: 20, height: 20, color: "var(--accent-warning)" }}
          />
        );
      case "system":
        return (
          <ShieldAlert
            style={{ width: 20, height: 20, color: "var(--accent-milk)" }}
          />
        );
      case "snoops":
        return (
          <Zap
            style={{ width: 20, height: 20, color: "var(--accent-green)" }}
          />
        );
      case "reward":
        return (
          <Gift
            style={{
              width: 20,
              height: 20,
              color: "var(--accent-blue, #60a5fa)",
            }}
          />
        );
      case "info":
      default:
        return (
          <Info
            style={{ width: 20, height: 20, color: "var(--text-secondary)" }}
          />
        );
    }
  };

  if (!notifications) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        Loading App Notifications Feed...
      </div>
    );
  }

  return (
    <div>
      {/* Metric KPI Card: Single card showing this month's deliveries with all-time total */}
      <div style={{ marginBottom: 24, maxWidth: 440 }}>
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Notifications Delivered</span>
            <div className="metric-icon-wrap">
              <Bell
                style={{ width: 18, height: 18, color: "var(--accent-milk)" }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              className="metric-value"
              style={{ marginBottom: 0, fontSize: 34 }}
            >
              {stats.thisMonth.toLocaleString()}
            </div>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              delivered this month ({currentMonthName})
            </span>
          </div>

          <div
            className="metric-sub"
            style={{ color: "var(--text-muted)", marginBottom: 14 }}
          >
            Monthly dispatch volume across proactive intel alerts and system
            updates
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 12,
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <CheckCircle2
                style={{ width: 15, height: 15, color: "var(--accent-green)" }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Total Delivered All-Time
              </span>
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "var(--font-header)",
                color: "var(--text-primary)",
              }}
            >
              {stats.allTime.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
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
          <div
            className="search-bar"
            style={{ flex: 1, minWidth: 260, maxWidth: 420 }}
          >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Type Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Type:
              </span>
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
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Status:
              </span>
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
                <th
                  onClick={() => toggleSort("title")}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    Notification Title & Message
                    {sortBy === "title" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown
                        style={{
                          width: 12,
                          height: 12,
                          color: "var(--text-muted)",
                        }}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("user")}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    Recipient Customer
                    {sortBy === "user" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown
                        style={{
                          width: 12,
                          height: 12,
                          color: "var(--text-muted)",
                        }}
                      />
                    )}
                  </div>
                </th>
                <th>Watchlist Target</th>
                <th
                  onClick={() => toggleSort("type")}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    Type
                    {sortBy === "type" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown
                        style={{
                          width: 12,
                          height: 12,
                          color: "var(--text-muted)",
                        }}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    Status
                    {sortBy === "status" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown
                        style={{
                          width: 12,
                          height: 12,
                          color: "var(--text-muted)",
                        }}
                      />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("created")}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    Sent Time
                    {sortBy === "created" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp style={{ width: 12, height: 12 }} />
                      ) : (
                        <ArrowDown style={{ width: 12, height: 12 }} />
                      )
                    ) : (
                      <ArrowUpDown
                        style={{
                          width: 12,
                          height: 12,
                          color: "var(--text-muted)",
                        }}
                      />
                    )}
                  </div>
                </th>
                <th style={{ width: 90, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      padding: 40,
                    }}
                  >
                    No app notifications found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((n: AdminNotificationItem) => (
                  <tr
                    key={n.id.toString()}
                    onClick={() => setSelectedNotification(n)}
                    title="Click to view notification details"
                  >
                    {/* Title & Message */}
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--accent-milk)",
                          marginBottom: 2,
                        }}
                      >
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
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/customers/${n.user_id}`);
                        }}
                        title="Click to view customer details"
                      >
                        <Users
                          style={{
                            width: 13,
                            height: 13,
                            color: "var(--text-secondary)",
                          }}
                        />
                        <span>{n.user_name}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/watchlists/${n.watchlist_id}`);
                          }}
                          title="Click to view watchlist intel"
                        >
                          <Radio
                            style={{
                              width: 13,
                              height: 13,
                              color: "var(--accent-warning)",
                            }}
                          />
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
                        <span
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          General App Alert
                        </span>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td>{getTypeBadge(n.type)}</td>

                    {/* Read / Seen Status */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          className={`badge ${n.read ? "badge-green" : "badge-muted"}`}
                        >
                          {n.read ? "READ" : "UNREAD"}
                        </span>
                        {n.seen && !n.read && (
                          <span
                            style={{ fontSize: 10, color: "var(--text-muted)" }}
                          >
                            SEEN
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sent Time */}
                    <td>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        {formatTimeAgo(n.created_at)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </td>

                    {/* Action: Open Modal */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn-secondary"
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNotification(n);
                        }}
                        title="View details"
                      >
                        <Eye style={{ width: 13, height: 13 }} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTIFICATION DETAILS MODAL */}
      {selectedNotification && (
        <div
          className="modal-center-overlay"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="modal-center-box"
            style={{
              maxWidth: 620,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 16,
                marginBottom: 20,
                borderBottom: "1px solid var(--border-color)",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  className="metric-icon-wrap"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  {getModalTypeIcon(selectedNotification.type)}
                </div>
                <div>
                  <h3
                    className="font-header"
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    Notification Intel
                  </h3>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {getTypeBadge(selectedNotification.type)}
                <button
                  className="btn-icon"
                  onClick={() => setSelectedNotification(null)}
                  title="Close modal"
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            {/* Notification Content Box */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                padding: 18,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--accent-milk)",
                  marginBottom: 8,
                  fontFamily: "var(--font-header)",
                }}
              >
                {selectedNotification.title}
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {selectedNotification.message}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border-color)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock style={{ width: 13, height: 13 }} />
                  <span>{formatTimeAgo(selectedNotification.created_at)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar style={{ width: 13, height: 13 }} />
                  <span>
                    {new Date(selectedNotification.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Breakdown Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 5,
                  }}
                >
                  Read Status
                </div>
                <span
                  className={`badge ${selectedNotification.read ? "badge-green" : "badge-muted"}`}
                >
                  {selectedNotification.read ? "READ" : "UNREAD"}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 5,
                  }}
                >
                  Feed Visibility
                </div>
                <span
                  className={`badge ${selectedNotification.seen ? "badge-green" : "badge-muted"}`}
                >
                  {selectedNotification.seen ? "SEEN IN FEED" : "UNSEEN"}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 5,
                  }}
                >
                  Category
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    textTransform: "capitalize",
                  }}
                >
                  {selectedNotification.type}
                </div>
              </div>

              {selectedNotification.reward_claimed !== undefined && (
                <div
                  style={{
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 5,
                    }}
                  >
                    Reward Status
                  </div>
                  <span
                    className={`badge ${selectedNotification.reward_claimed ? "badge-green" : "badge-gold"}`}
                  >
                    {selectedNotification.reward_claimed
                      ? "CLAIMED"
                      : "UNCLAIMED"}
                  </span>
                </div>
              )}
            </div>

            {/* Recipient Customer Details Card */}
            <div
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                marginBottom: 16,
                backgroundColor: "var(--bg-input)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Users style={{ width: 14, height: 14 }} />
                Recipient Customer
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    className="avatar-circle"
                    style={{
                      width: 38,
                      height: 38,
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    {(
                      selectedNotification.user_name ||
                      selectedNotification.user_email ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "var(--text-primary)",
                      }}
                    >
                      {selectedNotification.user_name}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      {selectedNotification.user_email}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="badge badge-purple"
                    style={{ textTransform: "uppercase" }}
                  >
                    {selectedNotification.user_sub_tier} TIER
                  </span>
                  <button
                    className="btn-secondary"
                    style={{
                      fontSize: 12,
                      padding: "6px 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    onClick={() => {
                      router.push(`/customers/${selectedNotification.user_id}`);
                    }}
                  >
                    Customer Profile{" "}
                    <ExternalLink style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Watchlist Intel (if linked) */}
            {selectedNotification.watchlist_id &&
              selectedNotification.watchlist_title && (
                <div
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: 16,
                    marginBottom: 20,
                    backgroundColor: "var(--bg-input)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--accent-warning)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Radio style={{ width: 14, height: 14 }} />
                    Associated Watchlist
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "var(--accent-milk)",
                        }}
                      >
                        {selectedNotification.watchlist_title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        Status:{" "}
                        {selectedNotification.watchlist_status || "active"}
                      </div>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{
                        fontSize: 12,
                        padding: "6px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onClick={() => {
                        router.push(
                          `/watchlists/${selectedNotification.watchlist_id}`,
                        );
                      }}
                    >
                      Watchlist Intel{" "}
                      <ExternalLink style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
              )}

            {/* Modal Actions Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 10,
                paddingTop: 16,
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => setSelectedNotification(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
