"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Database, Plus, Trash2, Edit3, Eye, Search, X, Check } from "lucide-react";

const TABLES = [
  "users",
  "watchlist",
  "chats",
  "notifications",
  "waitlist",
  "feedbacks",
  "snoops",
  "trending_cache",
  "logs",
  "monitored_sources",
  "sources",
  "processed_headlines",
  "sessions",
  "ad_views",
  "admin_users",
];

export default function TableManagerView() {
  const [selectedTable, setSelectedTable] = useState("users");
  const [search, setSearch] = useState("");

  // Modal states
  const [viewJsonRecord, setViewJsonRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editJsonStr, setEditJsonStr] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJsonStr, setNewJsonStr] = useState("{\n  \n}");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const tableData = useQuery(api.admin.getTableRecords, { tableName: selectedTable });
  const createRecord = useMutation(api.admin.createTableRecord);
  const updateRecord = useMutation(api.admin.updateTableRecord);
  const deleteRecord = useMutation(api.admin.deleteTableRecord);

  const handleSelectTable = (table: string) => {
    setSelectedTable(table);
    setSearch("");
    setStatusMsg(null);
  };

  const handleOpenEdit = (rec: any) => {
    setEditRecord(rec);
    // Remove internal _id and _creationTime for clean editing, keep copy
    const copy = { ...rec };
    delete copy._id;
    delete copy._creationTime;
    setEditJsonStr(JSON.stringify(copy, null, 2));
  };

  const handleSaveEdit = async () => {
    try {
      const parsed = JSON.parse(editJsonStr);
      await updateRecord({
        tableName: selectedTable,
        recordId: editRecord._id,
        patchData: parsed,
      });
      setEditRecord(null);
      setStatusMsg("Record updated successfully!");
    } catch (e: any) {
      alert("Invalid JSON format or update failed: " + e.message);
    }
  };

  const handleCreateRecord = async () => {
    try {
      const parsed = JSON.parse(newJsonStr);
      await createRecord({
        tableName: selectedTable,
        recordData: parsed,
      });
      setShowAddModal(false);
      setStatusMsg("New record inserted successfully!");
    } catch (e: any) {
      alert("Invalid JSON format or insert failed: " + e.message);
    }
  };

  const handleDelete = async (recId: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteRecord({ recordId: recId });
      setStatusMsg("Record deleted successfully!");
    } catch (e: any) {
      alert("Failed to delete record: " + e.message);
    }
  };

  const filteredRecords = (tableData?.records || []).filter((r: any) => {
    if (!search) return true;
    const str = JSON.stringify(r).toLowerCase();
    return str.includes(search.toLowerCase());
  });

  return (
    <div>
      {/* Table Toolbar & Selector */}
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Database style={{ width: 20, height: 20, color: "var(--accent-green)" }} />
            <div>
              <h3 className="card-title font-header" style={{ fontSize: 18 }}>
                Universal Database CRUD Inspector
              </h3>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Active Table: <span style={{ color: "var(--accent-milk)", fontWeight: 700 }}>{selectedTable}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select
              className="select-field"
              value={selectedTable}
              onChange={(e) => handleSelectTable(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {TABLES.map((t) => (
                <option key={t} value={t}>
                  Table: {t}
                </option>
              ))}
            </select>

            <div className="search-input-wrap">
              <Search className="search-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Search table fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus style={{ width: 16, height: 16 }} /> Add Record
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--accent-green-glow)",
              color: "var(--accent-green)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check style={{ width: 14, height: 14 }} /> {statusMsg}
          </div>
        )}

        {/* Data Table View */}
        {!tableData ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            Loading table records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            No records found in table <strong style={{ color: "var(--text-primary)" }}>{selectedTable}</strong>.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Record ID (_id)</th>
                  <th>Key Preview Data</th>
                  <th>Created / Time</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r: any) => (
                  <tr key={r._id}>
                    <td>
                      <span className="badge badge-muted" style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {r._id}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          maxWidth: 460,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.email || r.title || r.topic || r.action || r.content || JSON.stringify(r)}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {r._creationTime ? new Date(r._creationTime).toLocaleString() : "N/A"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => setViewJsonRecord(r)}
                          title="View JSON"
                        >
                          <Eye style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => handleOpenEdit(r)}
                          title="Edit Record"
                        >
                          <Edit3 style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => handleDelete(r._id)}
                          title="Delete Record"
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Record JSON */}
      {viewJsonRecord && (
        <div className="modal-center-overlay" onClick={() => setViewJsonRecord(null)}>
          <div className="modal-center-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 className="font-header" style={{ fontSize: 16 }}>Record JSON Inspector</h3>
              <button className="btn-icon" onClick={() => setViewJsonRecord(null)}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div className="json-code" style={{ maxHeight: 380 }}>
              {JSON.stringify(viewJsonRecord, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Record */}
      {editRecord && (
        <div className="modal-center-overlay" onClick={() => setEditRecord(null)}>
          <div className="modal-center-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 className="font-header" style={{ fontSize: 16 }}>Edit Record ID: {editRecord._id}</h3>
              <button className="btn-icon" onClick={() => setEditRecord(null)}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
              Modify field properties in valid JSON format:
            </p>
            <textarea
              className="input-field-normal"
              rows={12}
              style={{ fontFamily: "monospace", fontSize: 12, marginBottom: 16 }}
              value={editJsonStr}
              onChange={(e) => setEditJsonStr(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setEditRecord(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Record */}
      {showAddModal && (
        <div className="modal-center-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-center-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 className="font-header" style={{ fontSize: 16 }}>Add Record to Table: {selectedTable}</h3>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
              Provide document object fields in JSON format:
            </p>
            <textarea
              className="input-field-normal"
              rows={12}
              style={{ fontFamily: "monospace", fontSize: 12, marginBottom: 16 }}
              value={newJsonStr}
              onChange={(e) => setNewJsonStr(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateRecord}>
                Insert Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
