import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api/axios";
import { validatePassword } from "../utils/validatePassword";
import PasswordRequirements from "../components/PasswordRequirements";
export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetToken } = location.state || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!resetToken) navigate("/forgot-password", { replace: true });
  }, [resetToken, navigate]);

  if (!resetToken) return null;

    const handleSubmit = async (e) => {
    e.preventDefault();
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.errors[0]);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/reset-password", { resetToken, newPassword });
      toast.success("Password reset successful. Please log in.");
      navigate("/login", { replace: true });
    } catch (err) {
      const requirements = err.response?.data?.requirements;
      if (requirements?.length) {
        requirements.forEach((r) => toast.error(r));
      } else {
        toast.error(err.response?.data?.message || "Couldn't reset password. Please start over.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Set a new password</h1>
          <p className="text-gray-500">Choose a new password for your account.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                New password
              </label>
                            <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <PasswordRequirements password={newPassword} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "Saving…" : "Reset Password"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="text-orange-500 font-semibold hover:text-orange-400">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
