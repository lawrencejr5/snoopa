"use client";

import { LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface HeaderProps {
  title: string;
  adminName: string;
  adminEmail: string;
  token: string;
  onSignOut: () => void;
  onRefresh?: () => void;
}

export default function Header({
  title,
  adminName,
  adminEmail,
  token,
  onSignOut,
  onRefresh,
}: HeaderProps) {
  const signOut = useMutation(api.admin.signOutAdmin);

  const handleLogout = async () => {
    try {
      if (token) {
        await signOut({ token });
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("snoopa_admin_token");
    onSignOut();
  };

  return (
    <header className="top-header">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h2 className="header-title font-header">{title}</h2>
        <span className="badge badge-muted" style={{ fontSize: 11 }}>
          <ShieldAlert style={{ width: 12, height: 12 }} /> Production
        </span>
      </div>

      <div className="header-actions">
        {onRefresh && (
          <button className="btn-icon" onClick={onRefresh} title="Refresh Data">
            <RefreshCw style={{ width: 16, height: 16 }} />
          </button>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="avatar-circle">{adminName.charAt(0).toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {adminName}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{adminEmail}</span>
          </div>
        </div>

        <button className="btn-secondary" onClick={handleLogout} title="Sign Out">
          <LogOut style={{ width: 16, height: 16, color: "var(--accent-danger)" }} />
          <span style={{ fontSize: 13 }}>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
