import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Mail, Phone, Lock, UserCircle2 } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../hooks/useAuth";
import API from "../api/axios";
import { validatePassword } from "../utils/validatePassword";
import PasswordRequirements from "../components/PasswordRequirements";
export default function ProfileDetailsPage() {
  const { user, loading, refetch } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingContact, setSavingContact] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 font-semibold text-sm">
        Syncing system profiles…
      </div>
    );
  }

  if (!user) {
    navigate("/profile", { replace: true });
    return null;
  }

  const missingEmail = !user.email;
  const missingPhone = !user.phone;

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      await API.patch("/auth/me", { fullName, email, phone });
      await refetch();
      toast.success("Details updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update your details");
    } finally {
      setSavingContact(false);
    }
  };

    const handleChangePassword = async (e) => {
    e.preventDefault();
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.errors[0]);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setSavingPassword(true);
    try {
      await API.put("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const requirements = err.response?.data?.requirements;
      if (requirements?.length) {
        requirements.forEach((r) => toast.error(r));
      } else {
        toast.error(err.response?.data?.message || "Couldn't update your password");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      <main className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm font-semibold transition-colors"
        >
          <ArrowLeft size={16} /> Back to profile
        </button>

        <div className="flex items-center gap-2">
          <UserCircle2 className="text-orange-500" size={22} />
          <h1 className="text-xl font-black text-stone-900">Personal Details</h1>
        </div>

        {(missingEmail || missingPhone) && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-800 font-semibold">
            Add your {missingEmail && missingPhone ? "email and phone number" : missingEmail ? "email" : "phone number"} below to keep your account secure and reachable.
          </div>
        )}

        {/* CONTACT INFO */}
        <form
          onSubmit={handleSaveContact}
          className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-4"
        >
          <h2 className="text-sm font-black text-stone-800 uppercase tracking-wide">Basic Info</h2>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-stone-500 mb-1.5">
              <Mail size={12} /> Email {missingEmail && <span className="text-orange-500">(add one)</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={missingEmail ? "e.g. jane@mail.com" : ""}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-stone-500 mb-1.5">
              <Phone size={12} /> Phone {missingPhone && <span className="text-orange-500">(add one)</span>}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={missingPhone ? "e.g. 07XX XXX XXX" : ""}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <button
            type="submit"
            disabled={savingContact}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {savingContact ? "Saving…" : "Save Details"}
          </button>
        </form>

        {/* CHANGE PASSWORD */}
        <form
          onSubmit={handleChangePassword}
          className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-4"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-black text-stone-800 uppercase tracking-wide">
            <Lock size={14} className="text-stone-400" /> Change Password
          </h2>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

                  <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <PasswordRequirements password={newPassword} />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {savingPassword ? "Updating…" : "Update Password"}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
          }
