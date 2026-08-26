import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getErrorList(data) {
  if (Array.isArray(data?.errorMessages)) {
    return data.errorMessages.map((error) => error.msg);
  }

  return [data?.message || "Signup failed. Please try again."];
}

const Signup = () => {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const firstname = useRef();
  const lastname = useRef();
  const email = useRef();
  const password = useRef();
  const confirmPassword = useRef();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: firstname.current.value.trim(),
          lastname: lastname.current.value.trim(),
          email: email.current.value.trim(),
          password: password.current.value,
          confirmPassword: confirmPassword.current.value,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        navigate("/login");
        return;
      }

      setErrors(getErrorList(data));
    } catch {
      setErrors(["Could not connect to the server. Make sure the backend is running."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-center text-3xl font-bold text-slate-900">
          Create Account
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          Start tracking your expenses
        </p>

        {errors.length > 0 && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              ref={firstname}
              type="text"
              placeholder="First name"
              required
              minLength={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <input
              ref={lastname}
              type="text"
              placeholder="Last name"
              required
              minLength={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <input
            ref={email}
            type="email"
            placeholder="Email address"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <input
            ref={password}
            type="password"
            placeholder="Password"
            required
            minLength={8}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <input
            ref={confirmPassword}
            type="password"
            placeholder="Confirm password"
            required
            minLength={8}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold text-blue-600 hover:underline"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
