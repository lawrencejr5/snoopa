"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Apple,
  ArrowLeft,
  CreditCard,
  Eye,
  Globe,
  Radio,
  Save,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface CustomerDetailPageProps {
  userId: Id<"users">;
  onBack?: () => void;
}

export default function CustomerDetailPage({
  userId,
  onBack,
}: CustomerDetailPageProps) {
  const router = useRouter();
  const data = useQuery(api.admin.getUserDetails, { user_id: userId });
  const updateUserPlan = useMutation(api.admin.updateUserPlan);
  const deleteUserAdmin = useMutation(api.admin.deleteUserAdmin);

  const [activeTab, setActiveTab] = useState<
    "watchlists" | "overview" | "activity"
  >("watchlists");
  const [selectedTier, setSelectedTier] = useState<
    "free" | "pro" | "supa" | "max"
  >("free");
  const [isPremium, setIsPremium] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setSelectedTier((data.user.sub_tier as any) || data.user.plan || "free");
      setIsPremium(!!data.user.is_premium || data.user.sub_tier !== "free");
    }
  }, [data]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  if (!data || !data.user) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        <button
          className="btn-secondary"
          onClick={handleBack}
          style={{ marginBottom: 20 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back
        </button>
        <div>Loading customer profile intelligence...</div>
      </div>
    );
  }

  const { user, watchlists, snoopsList, adViews, feedbacks } = data;

  const handleSavePlan = async () => {
    setUpdating(true);
    try {
      await updateUserPlan({
        user_id: user._id,
        sub_tier: selectedTier,
        is_premium: isPremium || selectedTier !== "free",
      });
      alert("User subscription tier updated successfully!");
    } catch (e: any) {
      alert("Failed to update user plan: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUserAdmin({ user_id: user._id });
      alert("User account and all associated watchlists deleted.");
      router.push("/customers");
    } catch (e: any) {
      alert("Failed to delete user: " + e.message);
    }
  };

  const userOs =
    user.os === "ios" ? "iOS" : user.os === "android" ? "Android" : "iOS";
  const userCountry = user.country || "US";
  const totalSnoopsRemaining = snoopsList.reduce(
    (acc: number, s: any) => acc + (s.remaining || 0),
    0,
  );
  const activeWatchlistsCount = watchlists.filter(
    (w: any) => w.status === "active",
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Navigation & Profile Header */}
      <div>
        <button
          className="btn-secondary"
          onClick={handleBack}
          style={{ marginBottom: 16, padding: "8px 14px", fontSize: 13 }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} /> Back
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
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              className="avatar-circle"
              style={{
                width: 56,
                height: 56,
                fontSize: 24,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
              }}
            >
              {(user.fullname || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <h2
                  className="font-header"
                  style={{ fontSize: 24, fontWeight: 700 }}
                >
                  {user.fullname || "Anonymous Customer"}
                </h2>
                <span
                  className={`badge ${
                    selectedTier === "max"
                      ? "badge-danger"
                      : selectedTier === "supa"
                        ? "badge-gold"
                        : selectedTier === "pro"
                          ? "badge-green"
                          : "badge-muted"
                  }`}
                  style={{ fontSize: 12 }}
                >
                  {selectedTier.toUpperCase()} TIER
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                <span>{user.email}</span>
                {user.username && <span>• @{user.username}</span>}
                <span>
                  • Joined {new Date(user._creationTime).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="badge badge-muted" style={{ padding: "6px 12px" }}>
              {userOs === "iOS" ? (
                <Apple style={{ width: 13, height: 13 }} />
              ) : (
                <Smartphone style={{ width: 13, height: 13 }} />
              )}
              <span>{userOs}</span>
            </div>
            <div className="badge badge-muted" style={{ padding: "6px 12px" }}>
              <Globe style={{ width: 13, height: 13 }} />
              <span>{userCountry}</span>
            </div>
            {!deleteConfirm ? (
              <button
                className="btn-danger"
                onClick={() => setDeleteConfirm(true)}
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                <Trash2 style={{ width: 14, height: 14 }} /> Delete User
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-danger"
                  onClick={handleDeleteUser}
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

      {/* KPI Overview Grid */}
      <div className="metrics-grid">
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Subscription Tier</span>
            <div className="metric-icon-wrap">
              <CreditCard
                style={{ width: 18, height: 18, color: "var(--accent-green)" }}
              />
            </div>
          </div>
          <div className="metric-value">{selectedTier.toUpperCase()}</div>
          <div
            className="metric-sub"
            style={{
              color: isPremium ? "var(--accent-green)" : "var(--text-muted)",
            }}
          >
            {isPremium
              ? "● Active Premium Subscription"
              : "Standard Free Account"}
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Snoops Balance</span>
            <div className="metric-icon-wrap">
              <Sparkles
                style={{
                  width: 18,
                  height: 18,
                  color: "var(--accent-warning)",
                }}
              />
            </div>
          </div>
          <div className="metric-value">{totalSnoopsRemaining}</div>
          <div className="metric-sub">
            Remaining balance across all refill passes
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Tracked Watchlists</span>
            <div className="metric-icon-wrap">
              <Radio
                style={{ width: 18, height: 18, color: "var(--accent-milk)" }}
              />
            </div>
          </div>
          <div className="metric-value">{watchlists.length}</div>
          <div className="metric-sub">
            <strong style={{ color: "var(--accent-green)" }}>
              {activeWatchlistsCount} Active
            </strong>{" "}
            • {watchlists.length - activeWatchlistsCount} Completed/Inactive
          </div>
        </div>

        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Ad Views & Activity</span>
            <div className="metric-icon-wrap">
              <Eye
                style={{
                  width: 18,
                  height: 18,
                  color: "var(--text-secondary)",
                }}
              />
            </div>
          </div>
          <div className="metric-value">{adViews.length}</div>
          <div className="metric-sub">
            Total ad impressions watched for snoops
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-list" style={{ marginBottom: 0 }}>
        <button
          className={`tab-btn ${activeTab === "watchlists" ? "active" : ""}`}
          onClick={() => setActiveTab("watchlists")}
        >
          Tracked Watchlists ({watchlists.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Account & Subscription Settings
        </button>
        <button
          className={`tab-btn ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          Feedback & Activity Logs ({feedbacks.length})
        </button>
      </div>

      {/* Tracked Watchlists Tab */}
      {activeTab === "watchlists" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 className="font-header" style={{ fontSize: 18 }}>
              Customer Fact Watchlists ({watchlists.length})
            </h3>
          </div>

          {watchlists.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              No watchlists have been created by this user yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {watchlists.map((wl: any) => {
                return (
                  <div
                    key={wl._id}
                    className="card"
                    style={{
                      padding: 22,
                      border: "1px solid var(--border-color)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Watchlist Header Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 4,
                          }}
                        >
                          <h4
                            className="font-header"
                            style={{ fontSize: 18, fontWeight: 700 }}
                          >
                            {wl.title}
                          </h4>
                          <span
                            className={`badge ${wl.status === "active" ? "badge-green" : "badge-muted"}`}
                          >
                            {wl.status.toUpperCase()}
                          </span>
                          {wl.search_type && (
                            <span
                              className="badge badge-muted"
                              style={{ fontSize: 11 }}
                            >
                              {wl.search_type.toUpperCase()} SEARCH
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "var(--text-primary)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "1.4",
                          }}
                        >
                          <strong style={{ color: "var(--text-secondary)" }}>
                            Condition to Snoop:{" "}
                          </strong>
                          <span>"{wl.condition}"</span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          textAlign: "right",
                        }}
                      >
                        <div>
                          Created:{" "}
                          {new Date(wl._creationTime).toLocaleDateString()}
                        </div>
                        <div>
                          Last Checked:{" "}
                          {wl.last_checked
                            ? new Date(wl.last_checked).toLocaleString()
                            : "Never"}
                        </div>
                      </div>
                    </div>

                    {/* Keywords Tags */}
                    {wl.keywords && wl.keywords.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 10,
                        }}
                      >
                        <Tag
                          style={{
                            width: 13,
                            height: 13,
                            color: "var(--text-muted)",
                          }}
                        />
                        {wl.keywords.map((kw: string, i: number) => (
                          <span
                            key={i}
                            className="badge badge-muted"
                            style={{
                              fontSize: 11,
                              background: "var(--bg-input)",
                            }}
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Row: Direct View Watchlist Button */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {wl.sources && wl.sources.length > 0 && (
                          <span
                            style={{ fontSize: 12, color: "var(--text-muted)" }}
                          >
                            • {wl.sources.length} Intel Sources
                          </span>
                        )}
                      </div>

                      <button
                        className="btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => router.push(`/watchlists/${wl._id}`)}
                      >
                        <Eye style={{ width: 14, height: 14 }} /> View Watchlist
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Account & Subscription Settings Tab */}
      {activeTab === "overview" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          {/* Admin Subscription Manager Card */}
          <div className="card" style={{ padding: 24 }}>
            <h4
              className="font-header"
              style={{
                fontSize: 16,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CreditCard
                style={{ width: 18, height: 18, color: "var(--accent-green)" }}
              />{" "}
              Subscription & Tier Control
            </h4>

            <div className="form-group">
              <label className="form-label">Subscription Tier</label>
              <select
                className="select-field"
                style={{ width: "100%" }}
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
              >
                <option value="free">Free Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="supa">Supa Tier</option>
                <option value="max">Max Tier</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Premium Status Override</label>
              <select
                className="select-field"
                style={{ width: "100%" }}
                value={isPremium ? "yes" : "no"}
                onChange={(e) => setIsPremium(e.target.value === "yes")}
              >
                <option value="no">Free Account</option>
                <option value="yes">Active Premium</option>
              </select>
            </div>

            <button
              className="btn-primary"
              onClick={handleSavePlan}
              disabled={updating}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Save style={{ width: 15, height: 15 }} />
              {updating ? "Saving Changes..." : "Save Subscription Changes"}
            </button>
          </div>

          {/* Account Metadata Details */}
          <div className="card" style={{ padding: 24 }}>
            <h4
              className="font-header"
              style={{ fontSize: 16, marginBottom: 16 }}
            >
              Full Account Metadata
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Convex User ID:
                </span>
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {user._id}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Email Address:
                </span>
                <span style={{ fontWeight: 600 }}>{user.email}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Username:
                </span>
                <span style={{ fontWeight: 600 }}>
                  {user.username ? `@${user.username}` : "None"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  OS Platform:
                </span>
                <span style={{ fontWeight: 600 }}>{userOs}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Country Code:
                </span>
                <span style={{ fontWeight: 600 }}>{userCountry}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: 8,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Last Active Seen:
                </span>
                <span style={{ fontWeight: 600 }}>
                  {user.last_seen
                    ? new Date(user.last_seen).toLocaleString()
                    : new Date(user._creationTime).toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  Push Notification Tokens:
                </span>
                <span style={{ fontWeight: 600 }}>
                  {user.pushTokens?.length || 0} Registered
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Activity Tab */}
      {activeTab === "activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h4
              className="font-header"
              style={{ fontSize: 16, marginBottom: 12 }}
            >
              Feedback Submissions ({feedbacks.length})
            </h4>
            {feedbacks.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                No feedback submissions recorded for this user.
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {feedbacks.map((f: any) => (
                  <div
                    key={f._id}
                    style={{
                      padding: 12,
                      backgroundColor: "var(--bg-input)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {f.content}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 6,
                      }}
                    >
                      Submitted on:{" "}
                      {new Date(
                        f.timestamp || f._creationTime,
                      ).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
