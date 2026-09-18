"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Search,
  Eye,
  Smartphone,
  Globe,
  Apple,
  Clock,
  ShieldCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import UserDetailModal from "./UserDetailModal";

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

type SortField = "created" | "country" | "snoops" | "watchlists" | "lastSeen";

export default function CustomersView() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);

  // Direct Convex query
  const users = useQuery(api.admin.getUsers, {
    search: search || undefined,
    tierFilter: tierFilter || undefined,
  });

  const sortedUsers = users
    ? [...users].sort((a: any, b: any) => {
        let valA: any;
        let valB: any;

        if (sortBy === "country") {
          valA = (a.country || "US").toLowerCase();
          valB = (b.country || "US").toLowerCase();
        } else if (sortBy === "snoops") {
          valA = a.snoopsRemaining || 0;
          valB = b.snoopsRemaining || 0;
        } else if (sortBy === "watchlists") {
          valA = a.watchlistCount || 0;
          valB = b.watchlistCount || 0;
        } else if (sortBy === "lastSeen") {
          valA = a.lastSeen || a._creationTime || 0;
          valB = b.lastSeen || b._creationTime || 0;
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
      setSortOrder(field === "country" ? "asc" : "desc");
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
              Customers Directory
            </h3>
            {users && (
              <span className="badge badge-muted">
                {users.length} {users.length === 1 ? "Customer" : "Customers"}
              </span>
            )}
            <span className="badge badge-muted" style={{ fontSize: 11 }}>
              <ShieldCheck style={{ width: 12, height: 12 }} /> Convex Real-time DB
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="search-input-wrap">
              <Search className="search-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Search name, email, username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="select-field"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="all">All Subscriptions</option>
              <option value="free">Free Tier</option>
              <option value="pro">Pro Tier</option>
              <option value="supa">Supa Tier</option>
              <option value="max">Max Tier</option>
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select
                className="select-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
              >
                <option value="created">Sort: Joined Date</option>
                <option value="country">Sort: Country</option>
                <option value="snoops">Sort: Snoops</option>
                <option value="watchlists">Sort: Watchlists</option>
                <option value="lastSeen">Sort: Last Seen</option>
              </select>

              <button
                className="btn-secondary"
                style={{ padding: "8px 12px", fontSize: 13 }}
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={`Toggle order (${sortOrder === "asc" ? "Ascending" : "Descending"})`}
              >
                <ArrowUpDown style={{ width: 14, height: 14 }} />
                <span>{sortOrder === "asc" ? "Asc" : "Desc"}</span>
              </button>
            </div>
          </div>
        </div>

        {!users ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            Loading Snoopa Customers...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            No customers found matching search criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleHeaderSort("created")}>
                  Customer {renderSortIcon("created")}
                </th>
                <th>OS Platform</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleHeaderSort("country")}>
                  Country {renderSortIcon("country")}
                </th>
                <th>Sub Tier</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleHeaderSort("watchlists")}>
                  Watchlists {renderSortIcon("watchlists")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleHeaderSort("snoops")}>
                  Snoops {renderSortIcon("snoops")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleHeaderSort("lastSeen")}>
                  Last Seen {renderSortIcon("lastSeen")}
                </th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u: any) => {
                const isApple = u.provider === "apple" || u.os === "iOS";
                const isGoogle = u.provider === "google" || u.os === "Android";

                return (
                  <tr key={u._id} onClick={() => setSelectedUserId(u._id)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar-circle">
                          {(u.fullname || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.fullname || "Anonymous User"}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{u.email}</div>
                          {u.username && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              @{u.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {isApple ? (
                        <span className="badge badge-green" style={{ fontSize: 11 }}>
                          <Apple style={{ width: 11, height: 11 }} /> Apple (iOS)
                        </span>
                      ) : isGoogle ? (
                        <span className="badge badge-gold" style={{ fontSize: 11 }}>
                          <Smartphone style={{ width: 11, height: 11 }} /> Google (Android)
                        </span>
                      ) : (
                        <span className="badge badge-muted" style={{ fontSize: 11 }}>
                          <Globe style={{ width: 11, height: 11 }} /> {u.provider || u.os || "Email / Web"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-muted" style={{ fontWeight: 700, fontSize: 11 }}>
                        <Globe style={{ width: 11, height: 11, marginRight: 4 }} />
                        {u.country || "US"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.sub_tier === "max"
                            ? "badge-danger"
                            : u.sub_tier === "supa"
                            ? "badge-gold"
                            : u.sub_tier === "pro"
                            ? "badge-green"
                            : "badge-muted"
                        }`}
                      >
                        {u.sub_tier.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{u.watchlistCount}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--accent-milk)" }}>
                        {u.snoopsRemaining}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--accent-lightgreen)" }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        <span>{formatTimeAgo(u.lastSeen || u._creationTime)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserId(u._id);
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

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
