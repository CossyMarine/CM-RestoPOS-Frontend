import { Link, useNavigate } from "react-router-dom";
import {
  UserCircle2,
  LogOut,
  Phone,
  Mail,
  ShieldCheck,
  Camera,
  UserCog,
  Receipt,
  HelpCircle,
  ChevronRight,
  UserPlus,
  LogIn,
} from "lucide-react";
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

function formatJoinDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
        Loading…
      </div>
    );
  }

  // ---------- Guest view: Login / Register ----------
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 pb-24 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 text-4xl mb-5">
          <UserCircle2 size={40} />
        </div>
        <h1 className="text-xl font-black text-stone-900 mb-2">You're not signed in</h1>
        <p className="text-stone-500 text-sm mb-8 max-w-xs">
          Sign in to view your profile and order history, or create a new account to get started.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Link
            to="/login"
            state={{ from: "/profile" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            <LogIn size={18} />
            Log In
          </Link>
          <Link
            to="/login?tab=register"
            state={{ from: "/profile" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-white border border-stone-200 hover:border-orange-300 hover:text-orange-600 text-stone-700 font-bold py-3.5 rounded-xl transition-colors"
          >
            <UserPlus size={18} />
            Register
          </Link>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ---------- Logged-in view ----------
  const joined = formatJoinDate(user.createdAt);

  const options = [
    {
      icon: UserCog,
      title: "Personal Details",
      subtitle: "Update your name, email, and mobile contact",
      onClick: () => navigate("/profile/details"),
    },
    {
      icon: Receipt,
      title: "Order History",
      subtitle: "View your past orders and receipts",
      onClick: () => navigate("/orders"),
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "Call a manager or waiter directly",
      onClick: () => navigate("/profile/support"),
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      <main className="max-w-md mx-auto px-5 pt-8 space-y-5">
        {/* HERO CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-orange-400" />

          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-24 h-24 bg-orange-50 border-4 border-white rounded-full flex items-center justify-center text-orange-500 text-3xl font-black shadow-md">
              {initials(user.fullName)}
            </div>
            <button className="absolute bottom-0 right-0 bg-orange-500 hover:bg-orange-600 text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-colors">
              <Camera size={13} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-stone-900">{user.fullName}</h2>
          <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold uppercase tracking-wide text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
            <ShieldCheck size={11} /> Customer
          </span>
          {joined && <p className="text-xs text-stone-400 mt-2">Joined {joined}</p>}
        </div>

        {/* CONTACT INFO */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center shrink-0">
              <Mail size={15} className="text-stone-400" />
            </span>
            <div>
              <p className="text-stone-400 text-xs">Email</p>
              <p className="text-stone-800 font-medium">{user.email || "Not provided"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-stone-400" />
            </span>
            <div>
              <p className="text-stone-400 text-xs">Phone</p>
              <p className="text-stone-800 font-medium">{user.phone || "Not provided"}</p>
            </div>
          </div>
        </div>

        {/* OPTIONS LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100 overflow-hidden">
          {options.map(({ icon: Icon, title, subtitle, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="w-full p-4 hover:bg-stone-50/70 transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-500 group-hover:text-orange-500 group-hover:bg-orange-50 transition-colors">
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-800">{title}</h4>
                  <p className="text-xs text-stone-400">{subtitle}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-stone-300 group-hover:text-orange-500 transition-colors" />
            </button>
          ))}
        </div>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-100 font-semibold py-4 rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 group"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          <span>Log Out from Account</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
