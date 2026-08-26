import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ExpenseChart from "./dailyexpense.jsx";
import { apiEndpoint } from "./config/api";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function getLocalDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function FetchTransactions({ refreshKey = 0 }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("transactions");
  const [analytics, setAnalytics] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    category: [],
    type: [],
    dailySummary: [],
    weeklySummary: [],
    monthlySummary: [],
    totalExpense: 0,
    totalCredit: 0,
    suggestion: null,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const [transactionsRes, analyticsRes] = await Promise.all([
          axios.get(apiEndpoint("/transactions/transactions"), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          axios.get(apiEndpoint("/transactions/transactions/analytics"), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setTransactions(transactionsRes.data.data || []);
        setAnalytics({
          daily: analyticsRes.data.daily || [],
          weekly: analyticsRes.data.weekly || [],
          monthly: analyticsRes.data.monthly || [],
          category: analyticsRes.data.category || [],
          type: analyticsRes.data.type || [],
          dailySummary: analyticsRes.data.dailySummary || [],
          weeklySummary: analyticsRes.data.weeklySummary || [],
          monthlySummary: analyticsRes.data.monthlySummary || [],
          totalExpense: analyticsRes.data.totalExpense || 0,
          totalCredit: analyticsRes.data.totalCredit || 0,
          suggestion: analyticsRes.data.suggestion || null,
        });
      } catch (err) {
        console.log(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const topCategory = useMemo(() => analytics.category?.[0], [analytics.category]);
  const dailyGroups = useMemo(() => {
    const groups = {};

    for (const transaction of transactions) {
      const dateKey = getLocalDateKey(transaction.date);
      const isCredit =
        transaction.type === "credit" || transaction.category === "Salary";

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          totalSpend: 0,
          totalCredit: 0,
          transactions: [],
        };
      }

      groups[dateKey].transactions.push(transaction);

      if (isCredit) {
        groups[dateKey].totalCredit += Number(transaction.amount || 0);
      } else {
        groups[dateKey].totalSpend += Number(transaction.amount || 0);
      }
    }

    return Object.values(groups)
      .map((group) => ({
        ...group,
        totalSpend: Number(group.totalSpend.toFixed(2)),
        totalCredit: Number(group.totalCredit.toFixed(2)),
        transactions: group.transactions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  return (
    <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-slate-400">
            {topCategory
              ? `${topCategory.category} is currently the highest sector`
              : "Your uploaded expenses will appear here"}
          </p>
        </div>

        <div className="flex rounded-lg bg-slate-800 p-1">
          <button
            onClick={() => setView("transactions")}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              view === "transactions"
                ? "bg-teal-500 text-slate-950"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            Transactions
          </button>

          <button
            onClick={() => setView("analytics")}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              view === "analytics"
                ? "bg-teal-500 text-slate-950"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {view === "analytics" ? (
        <ExpenseChart
          dailyData={analytics.daily}
          weeklyData={analytics.weekly}
          monthlyData={analytics.monthly}
          categoryData={analytics.category}
          typeData={analytics.type}
          dailySummary={analytics.dailySummary}
          weeklySummary={analytics.weeklySummary}
          monthlySummary={analytics.monthlySummary}
          suggestion={analytics.suggestion}
          totalExpense={analytics.totalExpense}
          totalCredit={analytics.totalCredit}
        />
      ) : (
        <>
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800 p-8 text-center">
              <p className="text-slate-400">No transactions found</p>
            </div>
          )}

          <div className="space-y-5">
            {dailyGroups.map((group) => (
              <div
                key={group.date}
                className="rounded-xl border border-slate-700 bg-slate-950 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {new Date(group.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {group.transactions.length} transaction
                      {group.transactions.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-400">Day spend</p>
                    <p className="text-xl font-bold text-rose-300">
                      {formatMoney(group.totalSpend)}
                    </p>
                    {group.totalCredit > 0 && (
                      <p className="text-xs font-semibold text-emerald-300">
                        Credit + {formatMoney(group.totalCredit)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {group.transactions.map((transaction) => {
                    const isCredit =
                      transaction.type === "credit" || transaction.category === "Salary";

                    return (
                      <article
                        key={transaction.id}
                        className="rounded-lg border border-slate-800 bg-slate-900 p-4 transition hover:border-teal-500/60"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-white">
                              {transaction.description}
                            </h3>

                            <span className="mt-2 inline-flex rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-300">
                              {transaction.category || "Others"}
                            </span>
                            <span
                              className={`ml-2 mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                isCredit
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-rose-500/15 text-rose-300"
                              }`}
                            >
                              {isCredit ? "Credit" : "Debit"}
                            </span>
                          </div>

                          <div
                            className={`text-xl font-bold ${
                              isCredit ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {isCredit ? "+" : "-"} {formatMoney(transaction.amount)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default FetchTransactions;
