import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { identifier, password });
      const { user } = res.data;

      if (user.isAdmin) navigate("/admin");
      else if (user.role === "kitchen") navigate("/kitchen");
      else if (user.role === "waiter") navigate("/waiter");
      else if (user.role === "accountant") navigate("/accountant");
      else navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email/phone or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gray-900 border-r border-gray-800 p-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍴</span>
          <span className="font-black text-xl tracking-tight text-white">
            Resto<span className="text-orange-500">POS</span>
          </span>
        </div>

        <div>
          <div className="text-5xl mb-8">🍽️</div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Your restaurant,<br />
            <span className="text-orange-500">fully in control.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            Real-time orders, table management, and receipts — all from one fast login.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: "📋", label: "Orders" },
            { icon: "🧾", label: "Receipts" },
            { icon: "📊", label: "Revenue" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-gray-400 text-xs font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <span className="text-2xl">🍴</span>
          <span className="font-black text-xl text-white">
            Resto<span className="text-orange-500">POS</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to your staff account</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email or phone
              </label>
              <input
                type="text"
                placeholder="you@example.com or 07XX XXX XXX"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-100 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          <button
            onClick={() => navigate("/home")}
            className="mt-8 w-full text-center text-gray-600 hover:text-gray-400 text-sm transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
