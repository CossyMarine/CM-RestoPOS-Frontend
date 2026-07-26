import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api/axios";

export default function VerifyResetCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { identifier, method, channel, maskedContact } = location.state || {};

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (!identifier) {
      navigate("/forgot-password", { replace: true });
      return;
    }
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [identifier, navigate]);

  if (!identifier) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/verify-reset-code", { identifier, code });
      toast.success("Code verified");
      navigate("/reset-password", { state: { resetToken: res.data.resetToken } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Incorrect or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (useChannel) => {
    try {
      const res = await API.post("/auth/resend-reset-code", {
        identifier,
        channel: useChannel,
      });
      toast.success(res.data.message || "Code resent");
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't resend code");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Enter your code</h1>
          <p className="text-gray-500">
            We sent a 6-digit code via {channel} to{" "}
            <span className="text-white font-semibold">{maskedContact}</span>.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "Verifying…" : "Verify Code"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-stone-500 space-y-2">
            <div>
              Didn't get it?{" "}
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={() => handleResend(method === "email" ? "email" : "sms")}
                className="text-orange-500 font-semibold hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Resend {method === "email" ? "email" : "SMS"} {cooldown > 0 ? `(${cooldown}s)` : ""}
              </button>
            </div>

            {method === "phone" && (
              <div>
                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={() => handleResend("whatsapp")}
                  className="text-green-600 font-semibold hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send via WhatsApp instead
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/forgot-password" className="text-orange-500 font-semibold hover:text-orange-400">
            ← Use a different email/phone
          </Link>
        </p>
      </div>
    </div>
  );
}
