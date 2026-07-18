import { UserCircle2, LogOut, Phone, Mail, ShieldCheck } from "lucide-react";
import BottomNav from "../components/BottomNav";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";
}

export default function ProfilePage() {
  const { user, loading, setUser, logout } = useAuth();
  const [tab, setTab] = useState("login"); // "login" | "register"

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await logout();
    setTab("login");
  };

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">Loading…</div>;
  }

  // ---------- Logged-in view ----------
  if (user) {
    return (
      <div className="min-h-screen bg-stone-50 pb-24">
        <header className="bg-gradient-to-r from-stone-900 to-stone-800 px-6 pt-10 pb-16">
          <p className="text-stone-400 text-xs font-semibold tracking-wide uppercase mb-1">Account</p>
          <h1 className="text-white text-2xl font-black">My Profile</h1>
        </header>

        <div className="max-w-md mx-auto px-5 -mt-10">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-xl shrink-0">
                {initials(user.fullName)}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-stone-900 text-lg truncate">{user.fullName}</h2>
                <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={11} /> Customer
                </span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-stone-100 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-stone-400" />
                </span>
                <div>
                  <p className="text-stone-400 text-xs">Email</p>
                  <p className="text-stone-800 font-medium">{user.email || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center shrink-0">
                  <Phone size={15} className="text-stone-400" />
                </span>
                <div>
                  <p className="text-stone-400 text-xs">Phone</p>
                  <p className="text-stone-800 font-medium">{user.phone || "Not provided"}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 w-full flex items-center justify-center gap-2 border border-stone-200 text-stone-600 font-semibold py-3 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ---------- Logged-out: login / register ----------
  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <header className="bg-gradient-to-r from-stone-900 to-stone-800 px-6 pt-10 pb-16 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-2xl">🍴</span>
          <span className="font-black text-xl text-white">
            Resto<span className="text-orange-500">POS</span>
          </span>
        </div>
        <p className="text-stone-400 text-sm">Sign in or create an account to track your orders</p>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-10">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="flex border-b border-stone-100">
            {["login", "register"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-4 text-sm font-bold transition-colors relative ${
                  tab === t ? "text-orange-500" : "text-stone-400"
                }`}
              >
                {t === "login" ? "Log In" : "Sign Up"}
                {tab === t && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "login" ? (
              <LoginForm onSuccess={handleAuthSuccess} />
            ) : (
              <RegisterForm onSuccess={handleAuthSuccess} />
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-stone-400">
          <UserCircle2 size={14} />
          Browsing and ordering doesn't require an account — sign in only for order history.
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
