import { useEffect, useState } from "react";
import axios from "axios";
import ExpenseChart from "./dailyexpense.jsx";

function FetchTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view , setView] = useState("transactions") ;
  const [analytics, setAnalytics] = useState({
    daily: [],
    weekly: [],
    monthly: []
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:3000/transactions/transactions",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Fetched transactions:", res.data.data);
      setTransactions(res.data.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
const fetchAnalytics = async() => {
   try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      "http://localhost:3000/transactions/transactions/analytics" ,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Fetched analytics:", res.data);
    setAnalytics(res.data);
  } catch (err) {
    console.log(err);
  }
}
  // ✅ Component level par
  useEffect(() => {
    fetchTransactions();
    fetchAnalytics();
  }, []);

  // ✅ Component level par
return (
  <div className="min-h-screen bg-slate-900 text-white p-6">
    <div className="max-w-5xl mx-auto">
      <div className="flex gap-4 mb-8">
  <button
    onClick={() => setView("transactions")}
    className={`px-5 py-2 rounded-lg font-semibold transition ${
      view === "transactions"
        ? "bg-sky-500 text-white"
        : "bg-slate-700 text-slate-300"
    }`}
  >
    Transactions
  </button>

  <button
    onClick={() => setView("analytics")}
    className={`px-5 py-2 rounded-lg font-semibold transition ${
      view === "analytics"
        ? "bg-sky-500 text-white"
        : "bg-slate-700 text-slate-300"
    }`}
  >
    Analytics
  </button>
</div>
      {/* Header */}
      {view === "transactions" ? (
        <>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-sky-400">
            Transactions
          </h1>
          <p className="text-slate-400 mt-2">
          View and manage your transaction history
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && transactions.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-lg">
            No transactions found
          </p>
        </div>
      )}

      {/* Transactions List */}
      <div className="space-y-4">
        {transactions.map((t, index) => (
          <div
            key={index}
            className="bg-slate-800 hover:bg-slate-700 transition-all duration-200 rounded-xl p-5 shadow-lg border border-slate-700"
          >
            <div className="flex justify-between items-center">
              
              {/* Left Side */}
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {t.description}
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  {new Date(t.date).toLocaleDateString()}
                </p>

                <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-sky-500/20 text-sky-400">
                  {t.category}
                </span>
              </div>

              {/* Right Side */}
              <div
                className={`text-xl font-bold ${
                  t.amount < 0
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                ₹{Math.abs(t.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
      ):(
          <ExpenseChart
    dailyData={analytics.daily}
    weeklyData={analytics.weekly}
    monthlyData={analytics.monthly}
  />

      )
    }
    </div>
  </div>
)
}




export default FetchTransactions;