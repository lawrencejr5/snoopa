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

export default function CustomersView() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);

  // Direct Convex query
  const users = useQuery(api.admin.getUsers, {
    search: search || undefined,
    tierFilter: tierFilter || undefined,
  });

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

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                <th>Customer</th>
                <th>OS Platform</th>
                <th>Country</th>
                <th>Sub Tier</th>
                <th>Watchlists</th>
                <th>Snoops</th>
                <th>Last Seen</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
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
                    {u.os === "iOS" ? (
                      <span className="badge badge-green" style={{ fontSize: 11 }}>
                        <Apple style={{ width: 11, height: 11 }} /> iOS
                      </span>
                    ) : (
                      <span className="badge badge-gold" style={{ fontSize: 11 }}>
                        <Smartphone style={{ width: 11, height: 11 }} /> Android
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
              ))}
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
