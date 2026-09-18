"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Mail, MessageSquare, CheckCircle, Trash2, Clock, Star } from "lucide-react";

export default function WaitlistFeedbackView() {
  const [tab, setTab] = useState<"waitlist" | "feedbacks">("waitlist");

  const waitlistData = useQuery(api.admin.getTableRecords, { tableName: "waitlist" });
  const feedbackData = useQuery(api.admin.getTableRecords, { tableName: "feedbacks" });
  const usersData = useQuery(api.admin.getUsers, {});

  const deleteRecord = useMutation(api.admin.deleteTableRecord);
  const updateRecord = useMutation(api.admin.updateTableRecord);

  const usersMap = new Map<string, string>();
  if (usersData) {
    usersData.forEach((u: any) => {
      usersMap.set(u._id, u.email || u.fullname);
    });
  }

  const handleToggleNotified = async (rec: any) => {
    try {
      await updateRecord({
        tableName: "waitlist",
        recordId: rec._id,
        patchData: { notified: !rec.notified },
      });
    } catch (e: any) {
      alert("Failed to update waitlist notification status: " + e.message);
    }
  };

  const handleDelete = async (recId: string, table: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteRecord({ recordId: recId });
    } catch (e: any) {
      alert("Failed to delete record: " + e.message);
    }
  };

  const waitlists = waitlistData?.records || [];
  const feedbacks = feedbackData?.records || [];

  return (
    <div>
      <div className="tab-list">
        <button
          className={`tab-btn ${tab === "waitlist" ? "active" : ""}`}
          onClick={() => setTab("waitlist")}
        >
          Waitlist Signups ({waitlists.length})
        </button>
        <button
          className={`tab-btn ${tab === "feedbacks" ? "active" : ""}`}
          onClick={() => setTab("feedbacks")}
        >
          Customer Feedbacks ({feedbacks.length})
        </button>
      </div>

      {tab === "waitlist" && (
        <div className="table-container">
          <div className="table-toolbar">
            <h3 className="card-title font-header" style={{ fontSize: 18 }}>
              Early Access Waitlist
            </h3>
            <span className="badge badge-gold">{waitlists.length} Waitlist Registrations</span>
          </div>

          {waitlists.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
              No waitlist entries yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Email Address</th>
                  <th>Signed Up Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waitlists.map((item: any) => (
                  <tr key={item._id}>
                    <td>
                      <span className="badge badge-muted" style={{ fontWeight: 700 }}>
                        #{item.position}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.email}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(item.signed_up_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${item.notified ? "badge-green" : "badge-gold"}`}>
                        {item.notified ? "Notified" : "Pending Launch"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 12px", fontSize: 12 }}
                          onClick={() => handleToggleNotified(item)}
                        >
                          {item.notified ? "Mark Pending" : "Mark Notified"}
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => handleDelete(item._id, "waitlist")}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "feedbacks" && (
        <div className="table-container">
          <div className="table-toolbar">
            <h3 className="card-title font-header" style={{ fontSize: 18 }}>
              User Feedback Submissions
            </h3>
            <span className="badge badge-green">{feedbacks.length} Submissions</span>
          </div>

          {feedbacks.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
              No feedback submissions recorded.
            </div>
          ) : (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {feedbacks.map((f: any) => (
                <div key={f._id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: "var(--accent-milk)", fontSize: 14 }}>
                      User: {usersMap.get(f.user_id) || f.user_id}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(f.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: "pre-wrap", color: "var(--text-primary)", marginBottom: 12 }}>
                    "{f.content}"
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="btn-danger"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => handleDelete(f._id, "feedbacks")}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} /> Delete Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
