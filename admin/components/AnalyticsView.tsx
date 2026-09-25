"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Bell, CreditCard, Eye, Globe, Radio, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function AnalyticsView() {
  const router = useRouter();
  const stats = useQuery(api.admin.getAdminStats);

  if (!stats) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        Loading Snoopa Analytics...
      </div>
    );
  }

  const tierChartData = [
    { name: "Free", count: stats.tierCounts.free, fill: "#A3A398" },
    { name: "Pro", count: stats.tierCounts.pro, fill: "#6aaa66" },
    { name: "Supa", count: stats.tierCounts.supa, fill: "#F4D03F" },
    { name: "Max", count: stats.tierCounts.max, fill: "#fd5a5a" },
  ];

  const storeData = stats.storeSplit || [
    { name: "Apple (iOS)", value: 1, color: "#6aaa66" },
    { name: "Google (Android)", value: 1, color: "#F4D03F" },
  ];

  const countries = stats.countryDistribution || [
    { country: "United States", code: "US", count: stats.totalUsers },
  ];

  return (
    <div>
      {/* KPI Cards Row */}
      <div className="metrics-grid">
        {/* Card 1: Total Customers */}
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Total Customers</span>
            <div className="metric-icon-wrap">
              <Users style={{ width: 18, height: 18 }} />
            </div>
          </div>
          <div className="metric-value">{stats.totalUsers}</div>
          <div className="metric-sub">
            <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>
              {stats.totalPremiumUsers} Paid
            </span>
            {" • "}
            {stats.totalUsers - stats.totalPremiumUsers} Free
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Active Subscriptions</span>
            <div className="metric-icon-wrap">
              <CreditCard style={{ width: 18, height: 18 }} />
            </div>
          </div>
          <div className="metric-value">{stats.totalPremiumUsers}</div>
          <div className="metric-sub">
            Pro: {stats.tierCounts.pro} | Supa: {stats.tierCounts.supa} | Max:{" "}
            {stats.tierCounts.max}
          </div>
        </div>

        {/* Card 3: Total Active Watchlists */}
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Total Active Watchlists</span>
            <div className="metric-icon-wrap">
              <Radio
                style={{
                  width: 18,
                  height: 18,
                }}
              />
            </div>
          </div>
          <div className="metric-value">{stats.watchlistStatus.active}</div>
          <div
            className="metric-sub"
            style={{ fontSize: 11, color: "var(--text-secondary)" }}
          >
            Total Snoops Used for the Month:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {stats.snoopsUsedThisMonth}
            </strong>
          </div>
        </div>

        {/* Card 4: Ad Views (This Month vs All Time) */}
        <div className="card">
          <div className="metric-header">
            <span className="metric-title">Ad Views (This Month)</span>
            <div className="metric-icon-wrap">
              <Eye
                style={{ width: 18, height: 18, color: "var(--accent-milk)" }}
              />
            </div>
          </div>
          <div className="metric-value">{stats.adViewsThisMonth}</div>
          <div
            className="metric-sub"
            style={{ fontSize: 11, color: "var(--text-secondary)" }}
          >
            Total Ad Views:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {stats.totalAdViewsAllTime}
            </strong>{" "}
            All-Time
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="charts-grid">
        {/* Subscriptions Tier Distribution */}
        <div className="card chart-card-lg">
          <div className="card-title-row">
            <h3 className="card-title font-header">
              Subscription Tiers Breakdown
            </h3>
            <span className="badge badge-muted">Users by Plan</span>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-color)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {tierChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Split Donut */}
        <div className="card chart-card-sm">
          <div className="card-title-row">
            <h3 className="card-title font-header">OS Platform Source</h3>
            <span className="badge badge-muted">authAccounts</span>
          </div>
          <div
            style={{
              width: "100%",
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={storeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {storeData.map(
                    (
                      entry: { name: string; value: number; color: string },
                      index: number,
                    ) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ),
                  )}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-color)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              marginTop: 10,
            }}
          >
            {storeData.map(
              (item: { name: string; value: number; color: string }) => (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: item.color,
                    }}
                  />
                  <span>{`${item.name}: ${item.value}`}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Country Distribution & Active Watchlists */}
      <div className="charts-grid">
        <div className="card chart-card-sm">
          <div className="card-title-row">
            <h3 className="card-title font-header">
              Customer Geolocation (Countries)
            </h3>
            <Globe
              style={{ width: 18, height: 18, color: "var(--text-secondary)" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {countries.map((c: { code: string; count: number }) => (
              <div
                key={c.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  backgroundColor: "var(--bg-input)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className="badge badge-muted"
                    style={{ fontWeight: 700 }}
                  >
                    {c.code}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {c.code}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--accent-milk)",
                  }}
                >
                  {c.count} users
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-card-lg">
          <div className="card-title-row">
            <h3 className="card-title font-header">
              Watchlists & Snoopa Activity
            </h3>
            <span className="badge badge-muted">
              Best Performing (This Month)
            </span>
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Bell
              style={{ width: 15, height: 15, color: "var(--accent-warning)" }}
            />
            <span>Best Performing Watchlists for the Month</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Watchlist & Snoop Target</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Alerts (This Month)</th>
                  <th>Total Alerts</th>
                </tr>
              </thead>
              <tbody>
                {(stats.bestPerformingWatchlists || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        padding: 20,
                      }}
                    >
                      No watchlist notification activity recorded this month.
                    </td>
                  </tr>
                ) : (
                  (stats.bestPerformingWatchlists || []).map((w: any) => (
                    <tr
                      key={w.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/watchlists/${w.id}`)}
                    >
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: "var(--accent-milk)",
                          }}
                        >
                          {w.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={`Condition: "${w.condition}"`}
                        >
                          Condition: "{w.condition}"
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <div style={{ fontWeight: 500 }}>{w.user_name}</div>
                        <div
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {w.user_email}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            w.status === "active"
                              ? "badge-green"
                              : w.status === "completed"
                                ? "badge-gold"
                                : "badge-muted"
                          }`}
                        >
                          {w.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 700,
                            color: "var(--accent-warning)",
                            fontSize: 13,
                          }}
                        >
                          <Bell style={{ width: 13, height: 13 }} />
                          <span>{w.notificationsThisMonth}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          {w.notificationsAllTime}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
