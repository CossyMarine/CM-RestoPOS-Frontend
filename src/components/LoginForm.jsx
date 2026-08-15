import { useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import API from "../api/axios";

export default function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { identifier, password });
      toast.success(`Welcome back, ${res.data.user.fullName}`);
      onSuccess?.(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email / Phone Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
          Email or Phone
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Mail size={16} />
          </div>
          <input
            type="text"
            placeholder="e.g. jane@mail.com or 07XX XXX XXX"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800 font-medium placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>
      </div>

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
            Password
          </label>
          <Link
            to="/forgot-password"
            className="text-xs text-orange-500 font-bold hover:text-orange-600 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Lock size={16} />
          </div>
          <input
            type={showPass ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-12 py-3 text-sm text-gray-800 font-medium placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 group active:scale-[0.99]"
      >
        <span>{loading ? "Signing in…" : "Sign In"}</span>
        {!loading && <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />}
      </button>

      {/* Switch to Register */}
      <p className="text-center text-xs font-semibold text-gray-500 pt-2">
        Don’t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-orange-500 font-bold hover:text-orange-600 transition-colors underline underline-offset-2"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}