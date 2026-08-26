import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const VIEWS = [
  { id: "type", label: "Type", xKey: "type" },
  { id: "category", label: "Category", xKey: "category" },
  { id: "daily", label: "Daily", xKey: "date" },
  { id: "weekly", label: "Weekly", xKey: "week" },
  { id: "monthly", label: "Monthly", xKey: "month" },
];

const CATEGORY_COLORS = [
  "#14b8a6",
  "#f97316",
  "#38bdf8",
  "#a78bfa",
  "#f43f5e",
  "#84cc16",
  "#facc15",
  "#fb7185",
];

const VIEW_COLORS = {
  type: "#14b8a6",
  daily: "#38bdf8",
  weekly: "#22c55e",
  monthly: "#f97316",
};

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatPeriod(period, type) {
  if (type === "daily") {
    return new Date(period).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (type === "monthly") {
    return new Date(`${period}-01`).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }

  return period;
}

function ExactSpendList({ title, items = [], type }) {
  const visibleItems = items.slice(0, 8);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-300">
        {title}
      </h3>

      {!visibleItems.length ? (
        <p className="mt-4 text-sm text-slate-500">No spend yet</p>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleItems.map((item) => (
            <div
              key={item.period}
              className="flex items-center justify-between gap-4 rounded-lg bg-slate-900 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatPeriod(item.period, type)}
                </p>
                <p className="text-xs text-slate-500">
                  {item.transactionCount} transaction
                  {item.transactionCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-rose-300">
                  {formatMoney(item.totalSpend)}
                </p>
                {item.totalCredit > 0 && (
                  <p className="text-xs font-semibold text-emerald-300">
                    + {formatMoney(item.totalCredit)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExpenseChart({
  dailyData = [],
  weeklyData = [],
  monthlyData = [],
  categoryData = [],
  typeData = [],
  dailySummary = [],
  weeklySummary = [],
  monthlySummary = [],
  suggestion,
  totalExpense = 0,
  totalCredit = 0,
}) {
  const [view, setView] = useState("type");
  const activeView = VIEWS.find((item) => item.id === view) || VIEWS[0];
  const chartData =
    view === "type"
      ? typeData
      : view === "daily"
      ? dailyData
      : view === "weekly"
      ? weeklyData
      : view === "monthly"
      ? monthlyData
      : categoryData;
  const chartWidth = Math.max(620, chartData.length * (view === "category" ? 110 : 58));

  const formatXAxis = (value) => {
    if (view === "daily") {
      return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    }

    if (view === "monthly") {
      return new Date(`${value}-01`).toLocaleDateString("en-IN", {
        month: "short",
      });
    }

    return value;
  };

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Expense Chart</h2>
              <p className="text-sm text-slate-400">
                Expense: {formatMoney(totalExpense)} | Credit: {formatMoney(totalCredit)}
              </p>
            </div>

            <div className="flex rounded-lg bg-slate-900 p-1">
              {VIEWS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    view === item.id
                      ? "bg-teal-500 text-slate-950"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!chartData.length ? (
            <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-600 text-slate-400">
              No chart data yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ width: chartWidth, height: 420 }}>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 18,
                      right: 20,
                      left: 14,
                      bottom: view === "category" || view === "daily" ? 70 : 42,
                    }}
                  >
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />

                    <XAxis
                      dataKey={activeView.xKey}
                      tickFormatter={formatXAxis}
                      angle={view === "category" || view === "daily" ? -32 : 0}
                      textAnchor={view === "category" || view === "daily" ? "end" : "middle"}
                      height={view === "category" || view === "daily" ? 80 : 44}
                      interval={0}
                      tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    />

                    <YAxis
                      tickFormatter={formatMoney}
                      tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    />

                    <Tooltip
                      formatter={(value) => [
                        formatMoney(value),
                        view === "type" ? "Amount" : "Expense",
                      ]}
                      labelFormatter={(label) =>
                        view === "category" ? `Sector: ${label}` : `${activeView.label}: ${label}`
                      }
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        color: "#f8fafc",
                      }}
                    />

                    <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={28}>
                      {chartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            view === "category"
                              ? CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                              : VIEW_COLORS[view]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-teal-500/30 bg-slate-800 p-5 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
            Smart Suggestion
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {suggestion?.sector || "No sector yet"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {suggestion?.message ||
              "Upload expenses to see which category needs the most control."}
          </p>

          <div className="mt-5 space-y-3">
            {(suggestion?.tips || []).map((tip) => (
              <div
                key={tip}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300"
              >
                {tip}
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExactSpendList title="Per Day Spend" items={dailySummary} type="daily" />
        <ExactSpendList title="Per Week Spend" items={weeklySummary} type="weekly" />
        <ExactSpendList title="Per Month Spend" items={monthlySummary} type="monthly" />
      </div>
    </section>
  );
}
