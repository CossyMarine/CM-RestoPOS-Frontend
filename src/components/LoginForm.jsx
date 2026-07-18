import { useState } from "react";
import { toast } from "react-toastify";
import API from "../api/axios";

export default function LoginForm({ onSuccess }) {
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
      toast.error(err.response?.data?.message || "Invalid login or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">
          Email or phone
        </label>
        <input
          type="text"
          placeholder="e.g. jane@mail.com or 07XX XXX XXX"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoFocus
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">Password</label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-stone-300 rounded-xl px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold"
          >
            {showPass ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
