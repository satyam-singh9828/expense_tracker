import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import FetchTransactions from "./transaction";
import { apiEndpoint } from "./config/api";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

const Home = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadSummary, setUploadSummary] = useState([]);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setMessage("");
    setUploadSummary([]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Choose a PhonePe screenshot or transaction file first.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login again before uploading.");
      navigate("/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(apiEndpoint("/transactions/upload"), formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.duplicate) {
        setMessage(res.data.message);
        setUploadSummary([]);
        return;
      }

      const uploaded = res.data.data || [];
      setUploadSummary(uploaded);
      setMessage(`Read ${res.data.count} transaction(s) from ${file.name}.`);
      setShowTransactions(true);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setUploadSummary([]);
      setMessage(err.response?.data?.message || "Could not read this file.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-teal-300">Finance Tracker</h1>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
              Expense Control
            </p>
            <h2 className="mt-2 text-3xl font-bold">Upload Transactions</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              PhonePe receipt images, CSV, Excel, and PDF files are supported.
            </p>

            <div className="mt-6 space-y-4">
              <label
                htmlFor="transaction-file"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-950 px-4 py-6 text-center transition hover:border-teal-400"
              >
                <span className="text-sm font-semibold text-slate-200">
                  {file ? file.name : "Choose file"}
                </span>
                <span className="mt-2 text-xs text-slate-500">
                  JPG, PNG, WEBP, PDF, CSV, XLSX
                </span>
              </label>

              <input
                id="transaction-file"
                type="file"
                accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.pdf,image/*"
                onChange={handleFileChange}
                className="sr-only"
              />

              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full rounded-lg bg-teal-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Reading..." : "Upload and Analyze"}
              </button>

              {message && (
                <p className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
                  {message}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
                  Latest Reading
                </p>
                <h2 className="mt-2 text-3xl font-bold">Detected Details</h2>
              </div>

              <button
                onClick={() => setShowTransactions((value) => !value)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                {showTransactions ? "Hide List" : "View Transactions"}
              </button>
            </div>

            {!uploadSummary.length ? (
              <div className="mt-6 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-700 text-center text-sm text-slate-500">
                Upload a receipt to see amount, merchant, and category here.
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {uploadSummary.map((transaction, index) => (
                  <div
                    key={`${transaction.description}-${index}`}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-4"
                  >
                    {(() => {
                      const isCredit =
                        transaction.type === "credit" || transaction.category === "Salary";

                      return (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-white">
                          {transaction.description}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {new Date(transaction.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-300">
                          {transaction.category || "Others"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isCredit
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {isCredit ? "Credit" : "Debit"}
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            isCredit ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {isCredit ? "+" : "-"} {formatMoney(transaction.amount)}
                        </span>
                      </div>
                    </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {showTransactions && <FetchTransactions refreshKey={refreshKey} />}
      </div>
    </main>
  );
};

export default Home;
