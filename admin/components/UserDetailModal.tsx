"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  X,
  Smartphone,
  Globe,
  Trash2,
  ShieldAlert,
  Save,
  CreditCard,
  Apple,
} from "lucide-react";

interface UserDetailModalProps {
  userId: Id<"users">;
  onClose: () => void;
}

export default function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const data = useQuery(api.admin.getUserDetails, { user_id: userId });
  const updateUserPlan = useMutation(api.admin.updateUserPlan);
  const deleteUserAdmin = useMutation(api.admin.deleteUserAdmin);

  const [activeTab, setActiveTab] = useState<"overview" | "watchlists" | "chats" | "activity">("overview");

  // Edit sub tier state
  const [selectedTier, setSelectedTier] = useState<"free" | "pro" | "supa" | "max">("free");
  const [isPremium, setIsPremium] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setSelectedTier((data.user.sub_tier as any) || data.user.plan || "free");
      setIsPremium(!!data.user.is_premium || data.user.sub_tier !== "free");
    }
  }, [data]);

  if (!data || !data.user) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-content" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
          <div className="drawer-header">
            <h3>Customer Intel</h3>
            <button className="btn-icon" onClick={onClose}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            Loading customer deep-dive...
          </div>
        </div>
      </div>
    );
  }

  const { user, watchlists, snoopsList, adViews, feedbacks, notifications, chats } = data;

  const handleSavePlan = async () => {
    setUpdating(true);
    try {
      await updateUserPlan({
        user_id: user._id,
        sub_tier: selectedTier,
        is_premium: isPremium || selectedTier !== "free",
      });
      alert("User subscription updated successfully.");
    } catch (e: any) {
      alert("Failed to update user plan: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUserAdmin({ user_id: user._id });
      alert("User and all associated data deleted successfully.");
      onClose();
    } catch (e: any) {
      alert("Failed to delete user: " + e.message);
    }
  };

  const userOs = user.os === "ios" ? "iOS" : user.os === "android" ? "Android" : "iOS";
  const userCountry = user.country || "US";

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar-circle" style={{ width: 42, height: 42, fontSize: 18 }}>
              {(user.fullname || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-header" style={{ fontSize: 18, lineHeight: 1.2 }}>
                {user.fullname || "User Profile"}
              </h3>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{user.email}</div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Convex User Attributes Banner */}
        <div style={{ padding: "16px 24px", backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
            CONVEX DATABASE USER INTEL
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="badge badge-green">
              {userOs === "iOS" ? <Apple style={{ width: 12, height: 12 }} /> : <Smartphone style={{ width: 12, height: 12 }} />}
              <span>OS: {userOs}</span>
            </div>

            <div className="badge badge-gold">
              <Globe style={{ width: 12, height: 12 }} />
              <span>Country: {userCountry}</span>
            </div>

            <div className="badge badge-muted">
              <CreditCard style={{ width: 12, height: 12 }} />
              <span>Tier: {user.sub_tier ? user.sub_tier.toUpperCase() : "FREE"}</span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{ padding: "0 24px", paddingTop: 16 }}>
          <div className="tab-list" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview & Plan
            </button>
            <button
              className={`tab-btn ${activeTab === "watchlists" ? "active" : ""}`}
              onClick={() => setActiveTab("watchlists")}
            >
              Watchlists ({watchlists.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "chats" ? "active" : ""}`}
              onClick={() => setActiveTab("chats")}
            >
              Chats & Intel ({chats.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "activity" ? "active" : ""}`}
              onClick={() => setActiveTab("activity")}
            >
              Activity & Logs
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Subscription Editor Card */}
              <div className="card" style={{ padding: 20 }}>
                <h4 className="font-header" style={{ fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <CreditCard style={{ width: 16, height: 16, color: "var(--accent-green)" }} /> Admin Subscription Manager
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div>
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
                  <div>
                    <label className="form-label">Premium Status</label>
                    <select
                      className="select-field"
                      style={{ width: "100%" }}
                      value={isPremium ? "yes" : "no"}
                      onChange={(e) => setIsPremium(e.target.value === "yes")}
                    >
                      <option value="no">Standard (Free)</option>
                      <option value="yes">Active Premium</option>
                    </select>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleSavePlan}
                  disabled={updating}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Save style={{ width: 14, height: 14 }} />
                  {updating ? "Saving Plan..." : "Save Subscription Changes"}
                </button>
              </div>

              {/* Profile Meta Details */}
              <div className="card" style={{ padding: 20 }}>
                <h4 className="font-header" style={{ fontSize: 15, marginBottom: 14 }}>User Metadata</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Username:</span>
                    <span style={{ fontWeight: 600 }}>{user.username ? `@${user.username}` : "Not Set"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>OS Platform:</span>
                    <span style={{ fontWeight: 600 }}>{userOs}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Country:</span>
                    <span style={{ fontWeight: 600 }}>{userCountry}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Last Seen:</span>
                    <span style={{ fontWeight: 600 }}>
                      {user.last_seen ? new Date(user.last_seen).toLocaleString() : new Date(user._creationTime).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Avatar Preset:</span>
                    <span style={{ fontWeight: 600 }}>{user.avatar || "chill"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Push Notification Tokens:</span>
                    <span style={{ fontWeight: 600 }}>{user.pushTokens?.length || 0} Registered</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Account Created:</span>
                    <span style={{ fontWeight: 600 }}>{new Date(user._creationTime).toLocaleString()}</span>
                  </div>
                  {user.memory && (
                    <div style={{ marginTop: 10 }}>
                      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Snoopa Agent Memory Note:</span>
                      <div className="json-code" style={{ marginTop: 6 }}>{user.memory}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div style={{ marginTop: 10, padding: 18, border: "1px dashed var(--accent-danger)", borderRadius: "var(--radius-lg)" }}>
                <h4 style={{ color: "var(--accent-danger)", fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldAlert style={{ width: 16, height: 16 }} /> Danger Zone
                </h4>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
                  Permanently remove user account and all watchlists, chats, notifications, and logs.
                </p>
                {!deleteConfirm ? (
                  <button className="btn-danger" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 style={{ width: 14, height: 14 }} /> Delete User Account
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-danger" onClick={handleDeleteUser}>
                      Confirm Delete
                    </button>
                    <button className="btn-secondary" onClick={() => setDeleteConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "watchlists" && (
            <div>
              {watchlists.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                  This user has no watchlists created.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {watchlists.map((wl: any) => (
                    <div key={wl._id} className="card" style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 700 }}>{wl.title}</h4>
                        <span className={`badge ${wl.status === "active" ? "badge-green" : "badge-muted"}`}>
                          {wl.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
                        <strong style={{ color: "var(--accent-milk)" }}>Condition:</strong> {wl.condition}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {wl.keywords.map((kw: string, i: number) => (
                          <span key={i} className="badge badge-muted" style={{ fontSize: 11 }}>
                            #{kw}
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
                        Last Checked: {new Date(wl.last_checked).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "chats" && (
            <div>
              {chats.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                  No recent chat or intel history.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {chats.map((c: any) => (
                    <div
                      key={c._id}
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius-md)",
                        backgroundColor: c.role === "user" ? "var(--bg-card)" : "var(--bg-input)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: c.role === "user" ? "var(--text-primary)" : "var(--accent-green)", marginBottom: 4 }}>
                        {c.role === "user" ? "User Inquiry" : "Snoopa Investigator Response"}
                      </div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  Ad Views Count: {adViews.length}
                </h4>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Total ad impressions watched to unlock extra snoops.
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  Feedback Submissions: {feedbacks.length}
                </h4>
                {feedbacks.map((f: any) => (
                  <div key={f._id} style={{ padding: 10, backgroundColor: "var(--bg-input)", borderRadius: 6, marginTop: 8 }}>
                    <div style={{ fontSize: 13 }}>{f.content}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                      {new Date(f.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
