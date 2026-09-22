"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  ArrowLeft,
  MessageSquare,
  Bell,
  Trash2,
  Tag,
  Radio,
  Clock,
  User,
  Globe,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  FileText,
  Activity,
} from "lucide-react";

interface WatchlistDetailPageProps {
  watchlistId: Id<"watchlist">;
  onBack?: () => void;
}

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

export default function WatchlistDetailPage({
  watchlistId,
  onBack,
}: WatchlistDetailPageProps) {
  const router = useRouter();
  const data = useQuery(api.admin.getWatchlistDetails, {
    watchlist_id: watchlistId,
  });
  const updateStatus = useMutation(api.admin.updateWatchlistStatusAdmin);
  const deleteWatchlist = useMutation(api.admin.deleteWatchlistAdmin);

  const [activeTab, setActiveTab] = useState<
    "chats" | "notifications" | "logs" | "overview"
  >("chats");
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  if (!data || !data.watchlist) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
        <button
          className="btn-secondary"
          onClick={handleBack}
          style={{ marginBottom: 20 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Watchlists Directory
        </button>
        <div>Loading watchlist intel & message history...</div>
      </div>
    );
  }

  const {
    watchlist,
    owner,
    chats,
    notifications,
    logs,
    monitored_sources,
    processed_headlines,
  } = data;

  const handleStatusChange = async (
    newStatus: "active" | "completed" | "inactive"
  ) => {
    setUpdating(true);
    try {
      await updateStatus({
        watchlist_id: watchlist._id,
        status: newStatus,
      });
    } catch (e: any) {
      alert("Failed to update status: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteWatchlist = async () => {
    try {
      await deleteWatchlist({ watchlist_id: watchlist._id });
      alert("Watchlist and associated chats & notifications deleted successfully.");
      router.push("/watchlists");
    } catch (e: any) {
      alert("Failed to delete watchlist: " + e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header & Navigation */}
      <div>
        <button
          className="btn-secondary"
          onClick={handleBack}
          style={{ marginBottom: 16, padding: "8px 14px", fontSize: 13 }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Watchlists Directory
        </button>

        <div
          className="card"
          style={{
            padding: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div
              className="avatar-circle"
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Radio style={{ width: 24, height: 24, color: "var(--accent-milk)" }} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h2 className="font-header" style={{ fontSize: 24, fontWeight: 700 }}>
                  {watchlist.title}
                </h2>
                <span
                  className={`badge ${
                    watchlist.status === "active"
                      ? "badge-green"
                      : watchlist.status === "completed"
                      ? "badge-gold"
                      : "badge-muted"
                  }`}
                  style={{ fontSize: 12 }}
                >
                  {watchlist.status.toUpperCase()}
                </span>
                {watchlist.search_type && (
                  <span className="badge badge-muted" style={{ fontSize: 11 }}>
                    <Globe style={{ width: 11, height: 11, marginRight: 4 }} />
                    {watchlist.search_type.toUpperCase()} SEARCH
                  </span>
                )}
                {watchlist.canonical_topic && (
                  <span className="badge badge-muted" style={{ fontSize: 11 }}>
                    Topic: {watchlist.canonical_topic}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>
                <strong style={{ color: "var(--text-secondary)" }}>Snoop Condition: </strong>
                <span style={{ fontStyle: "italic", color: "var(--accent-milk)" }}>
                  "{watchlist.condition}"
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <User style={{ width: 13, height: 13 }} />
                  <span>Owner: <strong>{owner ? owner.fullname || owner.email : "Unknown"}</strong></span>
                </div>
                <span>• Created: {new Date(watchlist._creationTime).toLocaleDateString()}</span>
                <span>• Last Checked: {formatTimeAgo(watchlist.last_checked)}</span>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Status:</span>
              <select
                className="select-field"
                value={watchlist.status}
                disabled={updating}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {!deleteConfirm ? (
              <button
                className="btn-danger"
                onClick={() => setDeleteConfirm(true)}
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                <Trash2 style={{ width: 14, height: 14 }} /> Delete Watchlist
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-danger"
                  onClick={handleDeleteWatchlist}
                  style={{ padding: "8px 12px", fontSize: 12 }}
                >
                  Confirm Delete
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(false)}
                  style={{ padding: "8px 12px", fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Metric Overview Cards */}
      <div className="metrics-grid">
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Chat & Intel Messages</span>
            <div className="metric-icon-wrap">
              <MessageSquare style={{ width: 18, height: 18, color: "var(--accent-green)" }} />
            </div>
          </div>
          <div className="metric-value">{chats.length}</div>
          <div className="metric-sub">Total user queries & Snoopa investigator responses</div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Push Notifications</span>
            <div className="metric-icon-wrap">
              <Bell style={{ width: 18, height: 18, color: "var(--accent-warning)" }} />
            </div>
          </div>
          <div className="metric-value">{notifications.length}</div>
          <div className="metric-sub">
            {notifications.filter((n: any) => n.read || n.seen).length} Read / Seen
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Intel Sources Monitored</span>
            <div className="metric-icon-wrap">
              <Globe style={{ width: 18, height: 18, color: "var(--accent-milk)" }} />
            </div>
          </div>
          <div className="metric-value">{monitored_sources.length || watchlist.sources?.length || 0}</div>
          <div className="metric-sub">{processed_headlines.length} headlines scraped</div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Activity Logs</span>
            <div className="metric-icon-wrap">
              <Activity style={{ width: 18, height: 18, color: "var(--text-secondary)" }} />
            </div>
          </div>
          <div className="metric-value">{logs.length}</div>
          <div className="metric-sub">Background monitoring executions</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list" style={{ marginBottom: 0 }}>
        <button
          className={`tab-btn ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => setActiveTab("chats")}
        >
          Chat Conversation Stream ({chats.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          Push Notifications Sent ({notifications.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          Activity Logs & Sources ({logs.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Watchlist Specs & Owner Profile
        </button>
      </div>

      {/* Tab Content: Chats */}
      {activeTab === "chats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="font-header" style={{ fontSize: 18 }}>
              Watchlist Chat Stream ({chats.length})
            </h3>
            <span className="badge badge-muted">Chronological order</span>
          </div>

          {chats.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
              No chat messages recorded for this watchlist yet.
            </div>
          ) : (
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {chats.map((c: any) => {
                const isUser = c.role === "user";
                return (
                  <div
                    key={c._id}
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      backgroundColor: isUser ? "var(--bg-card)" : "var(--bg-input)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: isUser ? "var(--text-primary)" : "var(--accent-green)",
                          }}
                        >
                          {isUser ? "👤 User Query" : "🐕 Snoopa Investigator"}
                        </span>
                        {c.type && (
                          <span className="badge badge-muted" style={{ fontSize: 11 }}>
                            {c.type.toUpperCase()}
                          </span>
                        )}
                        {c.feedback && (
                          <span
                            className={`badge ${c.feedback === "like" ? "badge-green" : "badge-danger"}`}
                            style={{ fontSize: 11 }}
                          >
                            {c.feedback === "like" ? "👍 Liked" : "👎 Disliked"}
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(c._creationTime).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {c.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Push Notifications */}
      {activeTab === "notifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="font-header" style={{ fontSize: 18 }}>
              Push Notifications Log ({notifications.length})
            </h3>
          </div>

          {notifications.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
              No push notifications have been sent for this watchlist yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notifications.map((n: any) => (
                <div
                  key={n._id}
                  className="card"
                  style={{
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        padding: 8,
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-input)",
                        marginTop: 2,
                      }}
                    >
                      <Bell style={{ width: 16, height: 16, color: "var(--accent-warning)" }} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 700 }}>{n.title}</h4>
                        <span className="badge badge-gold" style={{ fontSize: 11 }}>
                          {n.type.toUpperCase()}
                        </span>
                        {n.read ? (
                          <span className="badge badge-green" style={{ fontSize: 10 }}>Read</span>
                        ) : n.seen ? (
                          <span className="badge badge-muted" style={{ fontSize: 10 }}>Seen</span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: 10 }}>Unread</span>
                        )}
                      </div>

                      <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(n._creationTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Activity Logs & Sources */}
      {activeTab === "logs" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Cron & Action Execution Logs */}
          <div className="card" style={{ padding: 20 }}>
            <h4 className="font-header" style={{ fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Activity style={{ width: 16, height: 16, color: "var(--accent-green)" }} /> Execution & Snooper Logs ({logs.length})
            </h4>

            {logs.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "10px 0" }}>
                No execution logs recorded yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto" }}>
                {logs.map((l: any) => (
                  <div
                    key={l._id}
                    style={{
                      padding: 10,
                      backgroundColor: "var(--bg-input)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      borderLeft: `3px solid ${
                        l.type === "error" ? "var(--accent-danger)" : "var(--accent-green)"
                      }`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>{l.action}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                        {new Date(l.timestamp || l._creationTime).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monitored Sources & Intel Feeds */}
          <div className="card" style={{ padding: 20 }}>
            <h4 className="font-header" style={{ fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Globe style={{ width: 16, height: 16, color: "var(--accent-milk)" }} /> Monitored Web Sources ({monitored_sources.length || watchlist.sources?.length || 0})
            </h4>

            {monitored_sources.length === 0 && (!watchlist.sources || watchlist.sources.length === 0) ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "10px 0" }}>
                No explicit sources attached; utilizing standard Tavily google search index.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {monitored_sources.map((ms: any) => (
                  <div
                    key={ms._id}
                    style={{
                      padding: 12,
                      backgroundColor: "var(--bg-input)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, wordBreak: "break-all" }}>
                      <LinkIcon style={{ width: 14, height: 14, flexShrink: 0, color: "var(--accent-milk)" }} />
                      <a href={ms.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-milk)", textDecoration: "underline" }}>
                        {ms.url}
                      </a>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      Weight: {ms.source_weight?.toUpperCase() || "PRIMARY"}
                    </div>
                  </div>
                ))}

                {watchlist.sources?.map((url: string, index: number) => (
                  <div
                    key={index}
                    style={{
                      padding: 10,
                      backgroundColor: "var(--bg-input)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      wordBreak: "break-all",
                    }}
                  >
                    🔗 {url}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Specs & Owner Profile */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Watchlist Full Metadata */}
          <div className="card" style={{ padding: 24 }}>
            <h4 className="font-header" style={{ fontSize: 16, marginBottom: 16 }}>
              Watchlist Configuration Specs
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Watchlist ID:</span>
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>{watchlist._id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Title:</span>
                <span style={{ fontWeight: 600 }}>{watchlist.title}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Search Type:</span>
                <span style={{ fontWeight: 600 }}>{(watchlist.search_type || "general").toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Time Range:</span>
                <span style={{ fontWeight: 600 }}>{(watchlist.time_range || "any_time").toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Priority Tier:</span>
                <span style={{ fontWeight: 600 }}>Tier {watchlist.tier || 1}</span>
              </div>

              <div style={{ marginTop: 8 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13, display: "block", marginBottom: 6 }}>
                  Keywords:
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {watchlist.keywords.map((kw: string, i: number) => (
                    <span key={i} className="badge badge-muted" style={{ fontSize: 11 }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Owner Profile Card */}
          <div className="card" style={{ padding: 24 }}>
            <h4 className="font-header" style={{ fontSize: 16, marginBottom: 16 }}>
              Owner Customer Profile
            </h4>

            {owner ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Customer Name:</span>
                  <span style={{ fontWeight: 600 }}>{owner.fullname || "Anonymous"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Email:</span>
                  <span style={{ fontWeight: 600 }}>{owner.email}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Subscription Tier:</span>
                  <span className={`badge ${owner.sub_tier === "max" ? "badge-danger" : owner.sub_tier === "pro" ? "badge-green" : "badge-muted"}`}>
                    {(owner.sub_tier || owner.plan || "free").toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Country / Region:</span>
                  <span style={{ fontWeight: 600 }}>{owner.country || "US"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Account ID:</span>
                  <span style={{ fontFamily: "monospace", fontSize: 12 }}>{owner._id}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Owner details unavailable.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
