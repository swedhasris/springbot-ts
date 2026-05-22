import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

interface AnalyticsChartProps {
  type: "pie" | "line";
  title: string;
  data: any[];
}

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
];

export default function AnalyticsChart({ type, title, data }: AnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 flex flex-col justify-center items-center h-80">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 self-start">{title}</h3>
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Detect key for numeric values in line chart data
  const keys = Object.keys(data[0] || {}).filter(
    (k) => k !== "name" && k !== "color" && typeof data[0][k] === "number"
  );

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">{title}</h3>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name || index}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
            </PieChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                tickMargin={8}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                allowDecimals={false}
                tickMargin={8}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="plainline"
                wrapperStyle={{ fontSize: "11px" }}
              />
              {keys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1.5, fill: "#ffffff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
