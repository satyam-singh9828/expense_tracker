import { useState } from 'react';
import FetchTransactions from './transaction' ;
import axios from "axios";
const Home = ()  => {
    const [file , setFile] = useState(null) ;
    const [message , setMessage] = useState("") ;
    const [loading , setLoading] = useState(false) ;
    const [showTransactions , setShowTransactions] = useState(false) ;
    const handleFileChange = (e) => {
      console.log("FILES:", e.target.files);

  const selectedFile = e.target.files?.[0];

  if (!selectedFile) {
    console.log("No file detected");
    return;
  }

  setFile(selectedFile);

  console.log("Selected file:", selectedFile);
  setMessage("");

    };
    const token = localStorage.getItem("token") ;


    const handleUpload = async () => {
  console.log("1. Button clicked");

  if (!file) {
    console.log("No file selected");
    return;
  }

  console.log("2. File exists:", file);

  const formData = new FormData();
  formData.append("file", file);

  console.log("3. Sending request...");
  setLoading(true);
  setMessage("");

  try {
    const res = await axios.post(
      "http://localhost:3000/transactions/upload",
      formData ,
       {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  }
    );

    console.log("4. Response received:", res.data);
    if (res.data.duplicate) {
      setMessage(res.data.message);
      return;
    }

    setMessage(`Uploaded ${res.data.count} transaction(s).`);
  } catch (err) {
    console.log("5. Error:", err);
    setMessage(err.response?.data?.message || "Error uploading file. Please try again.");
  } finally {
    setLoading(false);
  }
};
    
     return (
          <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 px-8 py-4 flex justify-between">
        <h1 className="text-2xl font-bold text-emerald-400">
          Finance Tracker
        </h1>

        <button className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg">
          Logout
        </button>
      </nav>
       <div className="max-w-7xl mx-auto p-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-4">
            Upload & Analyze Your Transactions
          </h1>

          <p className="text-slate-400 text-lg">
            Get insights into your spending habits and make informed financial
              
          </p>
          <div className = " w-full max-w-2xl bg-slate-800 p-5 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between "> 
              <input
          type="file"
          accept=".csv,.png,.jpg,.jpeg,.pdf"
          onChange={handleFileChange}
            className="text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
        />
          <button onClick={handleUpload} disabled={loading}  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50">
          {loading ? "Uploading..." : "Upload"}
        </button>
           
        </div>
       {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
       <button
  onClick={() => setShowTransactions(true)}
  className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
>
  View Transactions
</button>
{showTransactions && <FetchTransactions />}
</div>
        </div>
        </div>


     )
}
export default Home ; 
