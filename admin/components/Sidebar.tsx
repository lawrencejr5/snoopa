"use client";

import { useQuery } from "convex/react";
import { BarChart3, Database, MessageSquare, Radio, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";

export type TabType =
  "analytics" | "customers" | "watchlists" | "crud" | "reports_feedback";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const unreadFeedbackCount = useQuery(api.feedback.getUnreadFeedbackCount);

  const navItems = [
    {
      id: "analytics" as TabType,
      label: "Analytics & Revenue",
      icon: BarChart3,
    },
    {
      id: "customers" as TabType,
      label: "Customer Explorer",
      icon: Users,
    },
    {
      id: "watchlists" as TabType,
      label: "Watchlists & Intel",
      icon: Radio,
    },
    {
      id: "reports_feedback" as TabType,
      label: "Reports & Feedback",
      icon: MessageSquare,
      badge: unreadFeedbackCount || 0,
    },
    {
      id: "crud" as TabType,
      label: "Table Manager (CRUD)",
      icon: Database,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">S</div>
        <div>
          <h1 className="brand-title">Snoopa</h1>
          <p className="brand-subtitle">Admin Intelligence</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
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
            </button>
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
