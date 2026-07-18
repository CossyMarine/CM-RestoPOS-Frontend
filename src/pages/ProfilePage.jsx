import { Link } from "react-router-dom";
import { UserCircle2, LogOut, Phone, Mail, ShieldCheck } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../hooks/useAuth";

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U"
  );
}

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
        Loading…
      </div>
    );
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
              onClick={logout}
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

  // ---------- Logged-out: link out to the single login page ----------
  return (
    <div className="min-h-screen bg-stone-50 pb-24 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">👤</div>
      <h1 className="text-xl font-black text-stone-900 mb-2">You're not signed in</h1>
      <p className="text-stone-500 text-sm mb-6 max-w-xs">
        Sign in to view your profile and order history, or create a new account.
      </p>
      <Link
        to="/login"
        state={{ from: "/profile" }}
        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
      >
        <UserCircle2 size={18} />
        Sign In / Sign Up
      </Link>

      <BottomNav />
    </div>
  );
}
