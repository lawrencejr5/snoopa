"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { BarChart3, Database, MessageSquare, Radio, Users, X, LogOut } from "lucide-react";
import { api } from "../../convex/_generated/api";

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  token?: string | null;
  onSignOut?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose, token, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const unreadFeedbackCount = useQuery(api.feedback.getUnreadFeedbackCount);
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
    if (onSignOut) onSignOut();
    if (onClose) onClose();
  };

  const navItems = [
    {
      id: "analytics",
      href: "/",
      label: "Analytics & Revenue",
      icon: BarChart3,
      isActive: pathname === "/" || pathname === "/analytics",
    },
    {
      id: "customers",
      href: "/customers",
      label: "Customer Explorer",
      icon: Users,
      isActive: pathname.startsWith("/customers"),
    },
    {
      id: "watchlists",
      href: "/watchlists",
      label: "Watchlists & Intel",
      icon: Radio,
      isActive: pathname.startsWith("/watchlists"),
    },
    {
      id: "reports_feedback",
      href: "/reports-feedback",
      label: "Reports & Feedback",
      icon: MessageSquare,
      badge: unreadFeedbackCount || 0,
      isActive: pathname.startsWith("/reports-feedback"),
    },
    {
      id: "crud",
      href: "/crud",
      label: "Table Manager (CRUD)",
      icon: Database,
      isActive: pathname.startsWith("/crud"),
    },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="logo-badge"
            style={{
              background: "transparent",
              padding: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              src="/images/icon-nobg.png"
              alt="Snoopa Logo"
              width={36}
              height={36}
              style={{ objectFit: "contain" }}
            />
          </div>
          <div>
            <h1 className="brand-title">Snoopa</h1>
            <p className="brand-subtitle">Admin Intelligence</p>
          </div>
        </div>

        {onClose && (
          <button
            className="mobile-close-btn"
            onClick={onClose}
            title="Close Menu"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => onClose?.()}
            >
              <Icon
                className="icon"
                style={{
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                }}
              />
              <span style={{ flex: 1, textAlign: "left" }}>
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginLeft: 4,
                      color: isActive
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                    }}
                  >
                    ({item.badge})
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn-secondary"
          onClick={handleLogout}
          title="Sign Out"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "10px 14px",
            borderColor: "var(--accent-danger-glow)",
            color: "var(--accent-danger)",
          }}
        >
          <LogOut style={{ width: 16, height: 16, color: "var(--accent-danger)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
