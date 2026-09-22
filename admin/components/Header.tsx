"use client";

import { Menu, ShieldAlert } from "lucide-react";

interface HeaderProps {
  title: string;
  adminName: string;
  adminEmail: string;
  onToggleMobileMenu?: () => void;
}

export default function Header({
  title,
  adminName,
  adminEmail,
  onToggleMobileMenu,
}: HeaderProps) {
  return (
    <header className="top-header">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {onToggleMobileMenu && (
          <button
            className="btn-icon mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Toggle Menu"
          >
            <Menu style={{ width: 18, height: 18 }} />
          </button>
        )}

        <h2 className="header-title font-header">{title}</h2>
        <span className="badge badge-muted header-prod-badge" style={{ fontSize: 11 }}>
          <ShieldAlert style={{ width: 12, height: 12 }} /> Production
        </span>
      </div>

      <div className="header-actions">
        <div
          className="admin-user-chip"
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
          <div className="admin-email-text" style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {adminName}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{adminEmail}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
