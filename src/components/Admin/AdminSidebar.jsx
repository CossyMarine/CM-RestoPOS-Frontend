import {
    LayoutDashboard,
    UtensilsCrossed,
    ReceiptText,
    ShieldAlert,
    Users,
    Settings,
    LogOut,
    UtensilsCrossed as Logo,
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'menu', label: 'Manage Menu', icon: UtensilsCrossed },
    { id: 'orders', label: 'Orders & Receipts', icon: ReceiptText },
    { id: 'voids', label: 'Void Requests', icon: ShieldAlert },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({ activeView, onNavigate, user, onLogout }) {
    return (
        <aside className="w-64 bg-slate-900 h-screen sticky top-0 flex flex-col justify-between shrink-0 shadow-lg z-20">
            <div className="p-6">
                <div className="flex items-center gap-2">
                    <Logo size={20} className="text-orange-500" />
                    <span className="font-black text-lg text-white">
                        Resto<span className="text-orange-500">POS</span>
                    </span>
                </div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mt-0.5">
                    Management Console
                </p>

                <nav className="mt-8 space-y-1">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                        const active = activeView === id;
                        return (
                            <button
                                key={id}
                                onClick={() => onNavigate(id)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                                    active
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-orange-400'
                                }`}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/30">
                <p className="text-xs text-slate-500 font-medium truncate mb-3">
                    {user?.fullName || 'Authorized Admin'}
                </p>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm font-semibold transition-colors"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
