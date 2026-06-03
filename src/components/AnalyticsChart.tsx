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
} from "recharts";

interface AnalyticsChartProps {
  type: "pie" | "line";
  title: string;
  data: any[];
}

const COLORS = [
  "#00f2fe", // Neon Cyan
  "#a855f7", // Neon Violet
  "#10b981", // Neon Emerald
  "#f59e0b", // Neon Amber
  "#ec4899", // Neon Pink
  "#3b82f6", // Electric Blue
  "#ef4444", // Neon Red
  "#14b8a6", // Neon Teal
];

export default function AnalyticsChart({ type, title, data }: AnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center items-center h-80 border border-border/80 shadow-xl">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 self-start font-outfit">{title}</h3>
        <p className="text-xs text-muted-foreground font-outfit">No Telemetry Data Available</p>
      </div>
    );
  }

  // Detect key for numeric values in line chart data
  const keys = Object.keys(data[0] || {}).filter(
    (k) => k !== "name" && k !== "color" && typeof data[0][k] === "number"
  );

  return (
    <div className="glass-panel rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-border/80 shadow-xl">
      <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground font-outfit">{title}</h3>
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
                  backgroundColor: "rgba(9, 10, 21, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  color: "#ffffff",
                  fontFamily: "Outfit, sans-serif",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
                }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "10px", paddingTop: "10px", fontFamily: "Outfit, sans-serif" }}
              />
            </PieChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis
                dataKey="name"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                tickMargin={8}
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              <YAxis
                fontSize={9}
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                allowDecimals={false}
                tickMargin={8}
                style={{ fontFamily: "Orbitron, sans-serif" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(9, 10, 21, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  color: "#ffffff",
                  fontFamily: "Outfit, sans-serif",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
                }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="plainline"
                wrapperStyle={{ fontSize: "10px", fontFamily: "Outfit, sans-serif" }}
              />
              {keys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, fill: "currentColor", className: "text-background" }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
