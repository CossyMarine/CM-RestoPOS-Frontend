import { Link } from "react-router-dom";
import { ChefHat, LayoutDashboard, History, LogOut, ExternalLink, Bell } from "lucide-react";

export default function WaiterHeader({ activeTab, onTabChange, billCount, unseenCount, onBellClick, onLogout }) {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <ChefHat size={20} className="text-orange-500" /> RestoPOS
            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
              Waiter Mode
            </span>
          </h1>
          <p className="text-xs text-stone-400">Direct ordering & instant table billing desk</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBellClick}
            className="relative w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 flex items-center justify-center"
            title="Online order notifications"
          >
            <Bell size={16} />
            {unseenCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unseenCount > 9 ? "9+" : unseenCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
              activeTab === "dashboard"
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            <LayoutDashboard size={16} /> POS Desk
          </button>
          <button
            onClick={() => onTabChange("history")}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
              activeTab === "history"
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            <History size={16} /> Bill Records ({billCount})
          </button>

          <Link
            to="/home"
            className="px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 text-stone-500 hover:bg-stone-50 border border-stone-200"
            title="Customer dashboard"
          >
            <ExternalLink size={16} />
          </Link>

          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 text-stone-500 hover:bg-red-50 hover:text-red-600 border border-stone-200"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
