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
  LayoutDashboard,
  ChefHat
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 font-semibold text-sm">
        Syncing system profiles…
      </div>
    );
  }

  // ---------- Guest view: Login / Register ----------
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 pb-24 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 text-4xl mb-5 border border-orange-100">
          <UserCircle2 size={40} />
        </div>
        <h1 className="text-xl font-black text-stone-900 mb-2">Account Required</h1>
        <p className="text-stone-500 text-sm mb-8 max-w-xs">
          Sign in to access order terminals, view your dashboard logs, or track historical customer table sessions.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Link
            to="/login"
            state={{ from: "/profile" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <LogIn size={18} />
            Log In
          </Link>
          <Link
            to="/login?tab=register"
            state={{ from: "/profile" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-white border border-stone-200 hover:border-orange-300 hover:text-orange-600 text-stone-700 font-bold py-3.5 rounded-xl transition-colors shadow-sm"
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
  const isWaiter = user.role?.toLowerCase() === "waiter" || user.isStaff;

  // Build options list contextually depending on active role type
  const options = [
    ...(isWaiter 
      ? [{
          icon: LayoutDashboard,
          title: "POS Waiter Dashboard",
          subtitle: "Launch primary table order management workspace",
          onClick: () => navigate("/waiter-dashboard"), 
        }]
      : [{
          icon: Receipt,
          title: "My Order History",
          subtitle: "Track live status updates and historical receipts",
          onClick: () => navigate("/orders"),
        }]
    ),
    {
      icon: UserCog,
      title: "Personal Details",
      subtitle: "Update account name, notification email, and phone contact",
      onClick: () => navigate("/profile/details"),
    },
    {
      icon: HelpCircle,
      title: "Help & Support Desk",
      subtitle: "Review system documentation or call support channels",
      onClick: () => navigate("/profile/support"),
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      <main className="max-w-md mx-auto px-5 pt-8 space-y-5">
        
        {/* HERO CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 text-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${isWaiter ? 'from-stone-900 to-stone-700' : 'from-orange-500 to-orange-400'}`} />

          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className={`w-24 h-24 border-4 border-white rounded-full flex items-center justify-center text-3xl font-black shadow-md ${isWaiter ? 'bg-stone-100 text-stone-800' : 'bg-orange-50 text-orange-500'}`}>
              {initials(user.fullName)}
            </div>
            <button className={`absolute bottom-0 right-0 text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-colors ${isWaiter ? 'bg-stone-800 hover:bg-stone-900' : 'bg-orange-500 hover:bg-orange-600'}`}>
              <Camera size={13} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-stone-900">{user.fullName}</h2>
          
          {/* Contextual Badging system */}
          <div className="mt-2.5">
            {isWaiter ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-700 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full">
                <ChefHat size={11} /> Floor Staff / Waiter
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                <ShieldCheck size={11} /> Verified Customer
              </span>
            )}
          </div>
          
          {joined && <p className="text-xs text-stone-400 mt-2.5">Member since {joined}</p>}
        </div>

        {/* CONTACT INFO CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
              <Mail size={15} className="text-stone-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Account Email</p>
              <p className="text-stone-800 font-semibold truncate">{user.email || "No email address linked"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
              <Phone size={15} className="text-stone-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Mobile Contact</p>
              <p className="text-stone-800 font-semibold truncate">{user.phone || "No phone number listed"}</p>
            </div>
          </div>
        </div>

        {/* DYNAMIC NAVIGATION OPTIONS MATRIX */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100 overflow-hidden">
          {options.map(({ icon: Icon, title, subtitle, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="w-full p-4 hover:bg-stone-50/70 transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center space-x-4 min-w-0 flex-1 pr-2">
                <div className={`w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-500 transition-colors ${isWaiter ? 'group-hover:text-stone-900 group-hover:bg-stone-100' : 'group-hover:text-orange-500 group-hover:bg-orange-50'}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-bold text-stone-800 transition-colors ${isWaiter ? 'group-hover:text-stone-900' : 'group-hover:text-orange-600'}`}>{title}</h4>
                  <p className="text-xs text-stone-400 truncate">{subtitle}</p>
                </div>
              </div>
              <ChevronRight size={14} className={`text-stone-300 transition-colors ${isWaiter ? 'group-hover:text-stone-900' : 'group-hover:text-orange-500'}`} />
            </button>
          ))}
        </div>

        {/* LOGOUT CONTROL BUTTON */}
        <button
          onClick={logout}
          className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-100 font-bold py-4 rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 group active:scale-98"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          <span>Secure Sign Out</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
