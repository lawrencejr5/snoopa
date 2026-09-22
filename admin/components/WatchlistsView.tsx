"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Search,
  Eye,
  Globe,
  Clock,
  ShieldCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Radio,
  MessageSquare,
  Bell,
  Tag,
} from "lucide-react";

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

type SortField =
  | "created"
  | "title"
  | "status"
  | "owner"
  | "lastChecked"
  | "chats"
  | "notifications";

export default function WatchlistsView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Convex query
  const watchlists = useQuery(api.admin.getWatchlists, {
    search: search || undefined,
    status_filter: statusFilter || undefined,
  });

  const sortedWatchlists = watchlists
    ? [...watchlists].sort((a: any, b: any) => {
        let valA: any;
        let valB: any;

        if (sortBy === "title") {
          valA = (a.title || "").toLowerCase();
          valB = (b.title || "").toLowerCase();
        } else if (sortBy === "status") {
          valA = (a.status || "").toLowerCase();
          valB = (b.status || "").toLowerCase();
        } else if (sortBy === "owner") {
          valA = (a.owner_email || "").toLowerCase();
          valB = (b.owner_email || "").toLowerCase();
        } else if (sortBy === "lastChecked") {
          valA = a.last_checked || 0;
          valB = b.last_checked || 0;
        } else if (sortBy === "chats") {
          valA = a.chat_count || 0;
          valB = b.chat_count || 0;
        } else if (sortBy === "notifications") {
          valA = a.notification_count || 0;
          valB = b.notification_count || 0;
        } else {
          valA = a._creationTime || 0;
          valB = b._creationTime || 0;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      })
    : [];

  const handleHeaderSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "title" || field === "owner" ? "asc" : "desc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ArrowUp style={{ width: 12, height: 12, marginLeft: 4, display: "inline" }} />
    ) : (
      <ArrowDown style={{ width: 12, height: 12, marginLeft: 4, display: "inline" }} />
    );
  };

  return (
    <div>
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h3 className="card-title font-header" style={{ fontSize: 18 }}>
              Watchlists Directory
            </h3>
            {watchlists && (
              <span className="badge badge-muted">
                {watchlists.length}{" "}
                {watchlists.length === 1 ? "Watchlist" : "Watchlists"}
              </span>
            )}
            <span className="badge badge-muted" style={{ fontSize: 11 }}>
              <ShieldCheck style={{ width: 12, height: 12 }} /> Proactive Snoopers
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div className="search-input-wrap">
              <Search className="search-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Search title, condition, keywords, owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select
                className="select-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
              >
                <option value="created">Sort: Created Date</option>
                <option value="title">Sort: Title</option>
                <option value="status">Sort: Status</option>
                <option value="owner">Sort: Owner Email</option>
                <option value="lastChecked">Sort: Last Checked</option>
                <option value="chats">Sort: Chat Count</option>
                <option value="notifications">Sort: Notifications</option>
              </select>

              <button
                className="btn-secondary"
                style={{ padding: "8px 12px", fontSize: 13 }}
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                title={`Toggle order (${
                  sortOrder === "asc" ? "Ascending" : "Descending"
                })`}
              >
                <ArrowUpDown style={{ width: 14, height: 14 }} />
                <span>{sortOrder === "asc" ? "Asc" : "Desc"}</span>
              </button>
            </div>
          </div>
        </div>

        {!watchlists ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            Loading Watchlist Intelligence...
          </div>
        ) : watchlists.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No watchlists found matching search criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleHeaderSort("title")}
                >
                  Watchlist & Snoop Target {renderSortIcon("title")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleHeaderSort("owner")}
                >
                  Owner {renderSortIcon("owner")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleHeaderSort("status")}
                >
                  Status {renderSortIcon("status")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleHeaderSort("chats")}
                >
                  Chats {renderSortIcon("chats")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleHeaderSort("notifications")}
                >
                  Push Alerts {renderSortIcon("notifications")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleHeaderSort("lastChecked")}
                >
                  Last Checked {renderSortIcon("lastChecked")}
                </th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedWatchlists.map((w: any) => {
                return (
                  <tr
                    key={w._id}
                    onClick={() => router.push(`/watchlists/${w._id}`)}
                  >
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Radio style={{ width: 14, height: 14, color: "var(--accent-milk)", flexShrink: 0 }} />
                          <span>{w.title}</span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "1.4",
                          }}
                          title={`Condition: "${w.condition}"`}
                        >
                          Condition: "{w.condition}"
                        </div>
                        {w.keywords && w.keywords.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                            {w.keywords.slice(0, 3).map((kw: string, idx: number) => (
                              <span
                                key={idx}
                                className="badge badge-muted"
                                style={{ fontSize: 10, padding: "2px 6px" }}
                              >
                                #{kw}
                              </span>
                            ))}
                            {w.keywords.length > 3 && (
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                +{w.keywords.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/customers/${w.user_id}`);
                        }}
                        style={{ cursor: "pointer" }}
                        title={`View customer profile for ${w.owner_name}`}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--accent-milk)", textDecoration: "underline" }}>
                          {w.owner_name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {w.owner_email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          w.status === "active"
                            ? "badge-green"
                            : w.status === "completed"
                            ? "badge-gold"
                            : "badge-muted"
                        }`}
                      >
                        {w.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <MessageSquare style={{ width: 13, height: 13, color: "var(--accent-green)" }} />
                        <span>{w.chat_count}</span>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <Bell style={{ width: 13, height: 13, color: "var(--accent-warning)" }} />
                        <span>{w.notification_count}</span>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: "var(--accent-lightgreen)",
                        }}
                      >
                        <Clock style={{ width: 12, height: 12 }} />
                        <span>{formatTimeAgo(w.last_checked || w._creationTime)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/watchlists/${w._id}`);
                        }}
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        <Eye style={{ width: 14, height: 14 }} /> View Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
