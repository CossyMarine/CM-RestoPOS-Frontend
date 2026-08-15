import { useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
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
      const res = await API.post("/auth/login", {
        identifier,
        password,
      });

      toast.success(`Welcome back, ${res.data.user.fullName}`);
      onSuccess?.(res.data.user);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Invalid login credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Email / Phone */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Email or Phone
        </label>

        <div className="relative">
          <Mail
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />

          <input
            type="text"
            placeholder="Email or phone number"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            className="
              w-full
              h-12
              bg-white
              border border-gray-200
              rounded-xl
              pl-11 pr-4
              text-sm
              text-gray-900
              placeholder:text-gray-400
              outline-none
              transition-all
              focus:border-orange-400
              focus:ring-4
              focus:ring-orange-500/10
            "
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700">
            Password
          </label>

          <Link
            to="/forgot-password"
            className="
              text-xs
              font-semibold
              text-orange-500
              hover:text-orange-600
              transition-colors
            "
          >
            Forgot password?
          </Link>
        </div>

        <div className="relative">
          <Lock
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />

          <input
            type={showPass ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="
              w-full
              h-12
              bg-white
              border border-gray-200
              rounded-xl
              pl-11 pr-12
              text-sm
              text-gray-900
              placeholder:text-gray-400
              outline-none
              transition-all
              focus:border-orange-400
              focus:ring-4
              focus:ring-orange-500/10
            "
          />

          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              p-2
              text-gray-400
              hover:text-gray-600
              transition-colors
            "
            aria-label={
              showPass
                ? "Hide password"
                : "Show password"
            }
          >
            {showPass ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Sign In */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full
          h-12
          bg-orange-500
          hover:bg-orange-600
          disabled:opacity-60
          disabled:cursor-not-allowed
          text-white
          font-bold
          rounded-xl
          transition-all
          shadow-sm
          shadow-orange-500/20
          flex
          items-center
          justify-center
          gap-2
          active:scale-[0.99]
        "
      >
        <span>
          {loading ? "Signing in..." : "Sign In"}
        </span>

        {!loading && (
          <ArrowRight
            size={17}
            className="group-hover:translate-x-1 transition-transform"
          />
        )}
      </button>

      {/* Register */}
      <div className="pt-1 text-center">
        <p className="text-sm text-gray-500">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="
              font-bold
              text-orange-500
              hover:text-orange-600
              transition-colors
            "
          >
            Sign up
          </button>
        </p>
      </div>

    </form>
  );
}