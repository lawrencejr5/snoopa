"use client";

import { BarChart3, Users, Database, MessageSquare } from "lucide-react";

export type TabType = "analytics" | "customers" | "crud" | "waitlist_feedback";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
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
      id: "crud" as TabType,
      label: "Table Manager (CRUD)",
      icon: Database,
    },
    {
      id: "waitlist_feedback" as TabType,
      label: "Waitlist & Feedback",
      icon: MessageSquare,
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
              <Icon className="icon" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-milk)", letterSpacing: "0.05em" }}>
            GREYHOUND SPIRIT
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Proactive Fact Investigator</span>
        </div>
      </div>
    </aside>
  );
}
