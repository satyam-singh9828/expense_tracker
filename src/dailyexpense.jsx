import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function ExpenseChart({
  dailyData,
  weeklyData,
  monthlyData,
}) {
  const [view, setView] = useState("daily");

  const chartData =
    view === "daily"
      ? dailyData
      : view === "weekly"
      ? weeklyData
      : monthlyData;

  const xKey =
    view === "daily"
      ? "date"
      : view === "weekly"
      ? "week"
      : "month";

  // Different color for each mode
  const barColor =
    view === "daily"
      ? "#3b82f6" // Blue
      : view === "weekly"
      ? "#10b981" // Green
      : "#f59e0b"; // Orange

  // Format X-axis
const formatXAxis = (value) => {
  if (view === "daily") {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  if (view === "monthly") {
    return new Date(value + "-01").toLocaleDateString("en-IN", {
      month: "short",
    });
  }

  return value;
};

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">

      {/* Toggle Buttons */}
      <div className="flex gap-3 mb-6">
        {["daily", "weekly", "monthly"].map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`px-5 py-2 rounded-lg font-medium transition-all ${
              view === item
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
    <div className="overflow-x-auto">
  <div style={{ width: `${dailyData.length * 45}px`, height: 420 }}>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            left: 20,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey={xKey}
            tickFormatter={formatXAxis}
            angle={view === "daily" ? -35 : 0}
            textAnchor={view === "daily" ? "end" : "middle"}
            height={60}
            interval={view === "daily" ? 2 : 0}
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tickFormatter={(value) =>
              value >= 1000
                ? `₹${(value / 1000).toFixed(0)}k`
                : `₹${value}`
            }
          />

          <Tooltip
            formatter={(value) => [
              `₹${Number(value).toLocaleString()}`,
              "Expense",
            ]}
            labelFormatter={(label) => {
              if (view === "daily")
                return `Date : ${label}`;

              if (view === "weekly")
                return `Week : ${label}`;

              return `Month : ${label}`;
            }}
          />

          <Bar
            dataKey="total"
            radius={[6, 6, 0, 0]}
            barSize={22}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={barColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}