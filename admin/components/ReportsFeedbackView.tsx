"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  MessageSquare,
  Search,
  CheckCircle,
  Trash2,
  Clock,
  Image as ImageIcon,
  X,
  Eye,
  User,
  Check,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

function formatTimeAgo(timestamp: number) {
  if (!timestamp) return "Just now";
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

export default function ReportsFeedbackView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const feedbacks = useQuery(api.feedback.getFeedbacksAdmin, {
    search: search || undefined,
    status_filter: statusFilter || undefined,
  });

  const updateStatus = useMutation(api.feedback.updateFeedbackStatus);
  const deleteFeedback = useMutation(api.feedback.deleteFeedbackAdmin);

  // Auto-mark as 'read' when modal is opened if it's currently 'unread'
  useEffect(() => {
    if (selectedFeedback && selectedFeedback.status === "unread") {
      updateStatus({
        feedback_id: selectedFeedback._id,
        status: "read",
      }).catch((err) => console.error("Auto mark read failed:", err));
    }
  }, [selectedFeedback, updateStatus]);

  const handleStatusChange = async (
    feedbackId: Id<"feedbacks">,
    newStatus: "unread" | "read" | "fulfilled"
  ) => {
    try {
      await updateStatus({
        feedback_id: feedbackId,
        status: newStatus,
      });

      if (selectedFeedback && selectedFeedback._id === feedbackId) {
        setSelectedFeedback((prev: any) =>
          prev ? { ...prev, status: newStatus } : null
        );
      }
    } catch (e: any) {
      alert("Failed to update status: " + e.message);
    }
  };

  const handleDelete = async (feedbackId: Id<"feedbacks">) => {
    if (!confirm("Are you sure you want to delete this feedback report?")) return;
    try {
      await deleteFeedback({ feedback_id: feedbackId });
      if (selectedFeedback && selectedFeedback._id === feedbackId) {
        setSelectedFeedback(null);
      }
    } catch (e: any) {
      alert("Failed to delete feedback: " + e.message);
    }
  };

  const unreadCount = feedbacks
    ? feedbacks.filter((f: any) => f.status === "unread").length
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Bar & Filters */}
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h3 className="card-title font-header" style={{ fontSize: 18 }}>
              Reports & Feedback Submissions
            </h3>
            {feedbacks && (
              <span className="badge badge-muted">
                {feedbacks.length} {feedbacks.length === 1 ? "Report" : "Reports"}
              </span>
            )}
            {unreadCount > 0 && (
              <span className="badge badge-gold" style={{ fontSize: 11 }}>
                {unreadCount} Unread
              </span>
            )}
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
                placeholder="Search user, email, feedback content..."
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
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
              <option value="fulfilled">Fulfilled Only</option>
            </select>
          </div>
        </div>

        {/* Feedback List */}
        {!feedbacks ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            Loading feedback reports...
          </div>
        ) : feedbacks.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No feedback submissions found matching search criteria.
          </div>
        ) : (
          <div
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {feedbacks.map((f: any) => {
              const hasImages = f.image_urls && f.image_urls.length > 0;

              return (
                <div
                  key={f._id}
                  className="card"
                  style={{
                    padding: 20,
                    border:
                      f.status === "unread"
                        ? "1px solid var(--accent-warning)"
                        : "1px solid var(--border-color)",
                    transition: "all 0.15s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedFeedback(f)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: f.user_id ? "pointer" : "default",
                      }}
                      onClick={(e) => {
                        if (f.user_id) {
                          e.stopPropagation();
                          router.push(`/customers/${f.user_id}`);
                        }
                      }}
                    >
                      <div className="avatar-circle" style={{ width: 32, height: 32, fontSize: 14 }}>
                        {f.user_fullname ? f.user_fullname.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: f.user_id ? "var(--accent-milk)" : "inherit",
                            textDecoration: f.user_id ? "underline" : "none",
                          }}
                        >
                          {f.user_fullname}
                        </div>
                        <div
                          style={{ fontSize: 12, color: "var(--text-secondary)" }}
                        >
                          {f.user_email}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {hasImages && (
                        <span
                          className="badge badge-muted"
                          style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <ImageIcon style={{ width: 12, height: 12 }} />
                          {f.image_urls.length}{" "}
                          {f.image_urls.length === 1 ? "Image" : "Images"}
                        </span>
                      )}

                      <span
                        className={`badge ${
                          f.status === "fulfilled"
                            ? "badge-green"
                            : f.status === "read"
                            ? "badge-muted"
                            : "badge-gold"
                        }`}
                        style={{ fontSize: 11 }}
                      >
                        {f.status.toUpperCase()}
                      </span>

                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock style={{ width: 11, height: 11 }} />
                        {formatTimeAgo(f.timestamp || f._creationTime)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--text-primary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginBottom: 14,
                    }}
                  >
                    "{f.content}"
                  </div>

                  {/* Bottom Controls */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid var(--border-color)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        Set Status:
                      </span>
                      <select
                        className="select-field"
                        value={f.status}
                        onChange={(e) =>
                          handleStatusChange(
                            f._id,
                            e.target.value as "unread" | "read" | "fulfilled"
                          )
                        }
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                        <option value="fulfilled">Fulfilled</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => setSelectedFeedback(f)}
                      >
                        <Eye style={{ width: 14, height: 14 }} /> View Details & Images
                      </button>

                      <button
                        className="btn-danger"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        onClick={() => handleDelete(f._id)}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FEEDBACK DETAIL MODAL */}
      {selectedFeedback && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-hover)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h3 className="font-header" style={{ fontSize: 18, fontWeight: 700 }}>
                    Feedback Report Details
                  </h3>
                  <span
                    className={`badge ${
                      selectedFeedback.status === "fulfilled"
                        ? "badge-green"
                        : selectedFeedback.status === "read"
                        ? "badge-muted"
                        : "badge-gold"
                    }`}
                  >
                    {selectedFeedback.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Submitted on {new Date(selectedFeedback.timestamp || selectedFeedback._creationTime).toLocaleString()}
                </div>
              </div>

              <button
                className="btn-secondary"
                onClick={() => setSelectedFeedback(null)}
                style={{ padding: 6, borderRadius: "50%" }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* User Metadata Card */}
            <div
              style={{
                padding: 14,
                backgroundColor: "var(--bg-input)",
                borderRadius: "var(--radius-md)",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: selectedFeedback.user_id ? "pointer" : "default",
                }}
                onClick={() => {
                  if (selectedFeedback.user_id) {
                    router.push(`/customers/${selectedFeedback.user_id}`);
                  }
                }}
              >
                <div className="avatar-circle">
                  {selectedFeedback.user_fullname ? selectedFeedback.user_fullname.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: selectedFeedback.user_id ? "var(--accent-milk)" : "inherit",
                      textDecoration: selectedFeedback.user_id ? "underline" : "none",
                    }}
                  >
                    {selectedFeedback.user_fullname}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {selectedFeedback.user_email}
                  </div>
                </div>
              </div>

              {selectedFeedback.user_id && (
                <button
                  className="btn-secondary"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => router.push(`/customers/${selectedFeedback.user_id}`)}
                >
                  <User style={{ width: 13, height: 13 }} /> View Customer Profile
                </button>
              )}
            </div>

            {/* Feedback Full Content */}
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--accent-milk)",
                  marginBottom: 8,
                  letterSpacing: "0.05em",
                }}
              >
                REPORT CONTENT
              </h4>
              <div
                style={{
                  padding: 16,
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  color: "var(--text-primary)",
                }}
              >
                {selectedFeedback.content}
              </div>
            </div>

            {/* Image Attachments Section */}
            <div style={{ marginBottom: 24 }}>
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--accent-milk)",
                  marginBottom: 10,
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ImageIcon style={{ width: 14, height: 14 }} />
                ATTACHED IMAGES (
                {selectedFeedback.image_urls ? selectedFeedback.image_urls.length : 0})
              </h4>

              {!selectedFeedback.image_urls || selectedFeedback.image_urls.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "var(--bg-input)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    textAlign: "center",
                  }}
                >
                  No image attachments uploaded with this feedback.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 12,
                  }}
                >
                  {selectedFeedback.image_urls.map((url: string, index: number) => (
                    <div
                      key={index}
                      style={{
                        position: "relative",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        border: "1px solid var(--border-color)",
                        aspectRatio: "1/1",
                        cursor: "pointer",
                        backgroundColor: "#000",
                      }}
                      onClick={() => setLightboxImage(url)}
                    >
                      <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.2s ease",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: 4,
                          background: "rgba(0,0,0,0.6)",
                          fontSize: 10,
                          color: "#fff",
                          textAlign: "center",
                        }}
                      >
                        Click to Expand
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 16,
                borderTop: "1px solid var(--border-color)",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className={`btn-secondary ${selectedFeedback.status === "fulfilled" ? "active" : ""}`}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    borderColor:
                      selectedFeedback.status === "fulfilled" ? "var(--accent-green)" : undefined,
                    color:
                      selectedFeedback.status === "fulfilled" ? "var(--accent-green)" : undefined,
                  }}
                  onClick={() => handleStatusChange(selectedFeedback._id, "fulfilled")}
                >
                  <CheckCircle style={{ width: 14, height: 14 }} /> Mark Fulfilled
                </button>

                <button
                  className="btn-secondary"
                  style={{ padding: "8px 14px", fontSize: 12 }}
                  onClick={() => handleStatusChange(selectedFeedback._id, "unread")}
                >
                  Mark as Unread
                </button>
              </div>

              <button
                className="btn-danger"
                style={{ padding: "8px 14px", fontSize: 12 }}
                onClick={() => handleDelete(selectedFeedback._id)}
              >
                <Trash2 style={{ width: 14, height: 14 }} /> Delete Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR EXPANDED IMAGE PREVIEW */}
      {lightboxImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 20,
          }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              padding: 10,
              borderRadius: "50%",
              cursor: "pointer",
            }}
            onClick={() => setLightboxImage(null)}
          >
            <X style={{ width: 24, height: 24 }} />
          </button>
          <img
            src={lightboxImage}
            alt="Expanded Attachment"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
