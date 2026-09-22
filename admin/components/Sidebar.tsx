"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { BarChart3, Database, MessageSquare, Radio, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";

export default function Sidebar() {
  const pathname = usePathname();
  const unreadFeedbackCount = useQuery(api.feedback.getUnreadFeedbackCount);

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
    <aside className="sidebar">
      <div className="sidebar-header">
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

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent-milk)",
              letterSpacing: "0.05em",
            }}
          >
            GREYHOUND SPIRIT
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Proactive Fact Investigator
          </span>
        </div>
      </div>
    </aside>
  );
}
