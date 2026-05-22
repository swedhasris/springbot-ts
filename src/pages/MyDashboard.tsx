import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import AnalyticsCard from "../components/AnalyticsCard";
import PerformanceMetric from "../components/PerformanceMetric";
import AnalyticsChart from "../components/AnalyticsChart";
import RecentActivityList from "../components/RecentActivityList";
import MyTasksList from "../components/MyTasksList";
import QuickActions from "../components/QuickActions";

const MOCK_DATA = {
  cards: { totalAssigned: 12, totalCreated: 8, open: 5, inProgress: 3, resolved: 6, closed: 4, pending: 2, overdue: 1 },
  performance: { completionPercentage: "75%", avgResolutionTime: "4.2h", ticketsToday: 3, weekly: "18", monthly: "62", productivityScore: 82 },
  charts: {
    statusDistribution: [
      { name: "Open", value: 5, color: "#3b82f6" },
      { name: "In Progress", value: 3, color: "#f59e0b" },
      { name: "Resolved", value: 6, color: "#10b981" },
      { name: "Closed", value: 4, color: "#6b7280" },
      { name: "Pending", value: 2, color: "#8b5cf6" },
      { name: "Overdue", value: 1, color: "#ef4444" }
    ],
    categoryDistribution: [
      { name: "Bug", value: 8, color: "#ef4444" },
      { name: "Feature", value: 5, color: "#3b82f6" },
      { name: "Support", value: 4, color: "#10b981" },
      { name: "Enhancement", value: 3, color: "#f59e0b" },
      { name: "Other", value: 1, color: "#6b7280" }
    ],
    trend: [
      { name: "Mon", tickets: 4 },
      { name: "Tue", tickets: 6 },
      { name: "Wed", tickets: 3 },
      { name: "Thu", tickets: 7 },
      { name: "Fri", tickets: 5 },
      { name: "Sat", tickets: 2 },
      { name: "Sun", tickets: 1 }
    ],
    productivity: [
      { name: "Mon", score: 70 },
      { name: "Tue", score: 85 },
      { name: "Wed", score: 60 },
      { name: "Thu", score: 90 },
      { name: "Fri", score: 75 },
      { name: "Sat", score: 40 },
      { name: "Sun", score: 30 }
    ]
  },
  recentActivity: [
    { id: "1", title: "Resolved ticket #1042 - Login issue", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "resolved" },
    { id: "2", title: "Created ticket #1045 - UI alignment fix", timestamp: new Date(Date.now() - 7200000).toISOString(), type: "created" },
    { id: "3", title: "Updated ticket #1038 - Database timeout", timestamp: new Date(Date.now() - 10800000).toISOString(), type: "updated" },
    { id: "4", title: "Closed ticket #1035 - Password reset", timestamp: new Date(Date.now() - 14400000).toISOString(), type: "closed" },
    { id: "5", title: "Assigned ticket #1048 - API error", timestamp: new Date(Date.now() - 18000000).toISOString(), type: "assigned" }
  ],
  myTasks: [
    { id: "1", title: "Fix login page redirect issue", status: "in_progress", priority: "high" },
    { id: "2", title: "Update API documentation", status: "open", priority: "medium" },
    { id: "3", title: "Review database migration script", status: "open", priority: "high" },
    { id: "4", title: "Test email notification system", status: "pending", priority: "low" },
    { id: "5", title: "Deploy hotfix for payment module", status: "in_progress", priority: "critical" }
  ]
};

export function MyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(MOCK_DATA);

  useEffect(() => {
    if (user?.uid) {
      fetch(`/api/user-analytics?uid=${user.uid}`)
        .then((res) => {
          if (!res.ok) throw new Error("API not available");
          return res.json();
        })
        .then(setData)
        .catch(() => {
          // API not available, use mock data
          setData(MOCK_DATA);
        });
    }
  }, [user]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="space-y-8 max-w-7xl mx-auto bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-xl shadow-lg p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">My Personal Analytics</h1>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border">
            Logged in as: <strong className="text-foreground">{user?.email || "User"}</strong>
          </span>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsCard title="Total Tickets Assigned" value={data.cards.totalAssigned} />
          <AnalyticsCard title="Total Tickets Created" value={data.cards.totalCreated} />
          <AnalyticsCard title="Open Tickets" value={data.cards.open} />
          <AnalyticsCard title="In Progress Tickets" value={data.cards.inProgress} />
          <AnalyticsCard title="Resolved Tickets" value={data.cards.resolved} />
          <AnalyticsCard title="Closed Tickets" value={data.cards.closed} />
          <AnalyticsCard title="Pending Tickets" value={data.cards.pending} />
          <AnalyticsCard title="Overdue Tickets" value={data.cards.overdue} />
        </div>

        {/* Performance Analytics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PerformanceMetric label="Ticket Completion %" value={data.performance.completionPercentage} />
          <PerformanceMetric label="Avg Resolution Time" value={data.performance.avgResolutionTime} />
          <PerformanceMetric label="Tickets Completed Today" value={data.performance.ticketsToday} />
          <PerformanceMetric label="Weekly Performance" value={data.performance.weekly} />
          <PerformanceMetric label="Monthly Performance" value={data.performance.monthly} />
          <PerformanceMetric label="Productivity Score" value={data.performance.productivityScore} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart type="pie" title="Ticket Status Distribution" data={data.charts.statusDistribution} />
          <AnalyticsChart type="pie" title="Category Distribution" data={data.charts.categoryDistribution} />
          <AnalyticsChart type="line" title="Ticket Trends (Weekly)" data={data.charts.trend} />
          <AnalyticsChart type="line" title="Productivity & Activity Score" data={data.charts.productivity} />
        </div>

        {/* Bottom Grid: Recent Activity & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivityList items={data.recentActivity} />
          <MyTasksList tasks={data.myTasks} />
        </div>
      </div>
    </div>
  );
}
export default MyDashboard;
