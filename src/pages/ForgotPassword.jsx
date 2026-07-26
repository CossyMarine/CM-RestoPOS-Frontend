import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api/axios";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/forgot-password", { identifier });
      toast.success(res.data.message || "Code sent");
      navigate("/verify-reset-code", {
        state: {
          identifier,
          method: res.data.method,
          channel: res.data.channel,
          maskedContact: res.data.maskedContact,
        },
      });
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 404 && data?.notFound) {
        toast.error("No account found with that email or phone number.");
      } else if (err.response?.status === 429) {
        toast.error(data?.message || "Please wait before trying again.");
      } else {
        toast.error(data?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-6 py-12">
      <div className="lg:hidden flex items-center gap-2 mb-10">
        <span className="text-2xl">🍴</span>
        <span className="font-black text-xl text-white">
          Resto<span className="text-orange-500">POS</span>
        </span>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Forgot password</h1>
          <p className="text-gray-500">
            Enter your email or phone number and we'll send you a reset code.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "Sending…" : "Send Reset Code"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Remember your password?{" "}
          <Link to="/login" className="text-orange-500 font-semibold hover:text-orange-400">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
