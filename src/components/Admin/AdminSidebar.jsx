import {
    LayoutDashboard,
    UtensilsCrossed,
    ReceiptText,
    ShieldAlert,
    Users,
    LogOut,
    UtensilsCrossed as Logo,
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'menu', label: 'Manage Menu', icon: UtensilsCrossed },
    { id: 'orders', label: 'Orders & Receipts', icon: ReceiptText },
    { id: 'voids', label: 'Void Requests', icon: ShieldAlert },
    { id: 'users', label: 'Users', icon: Users },
];

export default function AdminSidebar({ activeView, onNavigate, user, onLogout }) {
    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col justify-between shrink-0 shadow-sm">
            <div className="p-6">
                <div className="flex items-center gap-2">
                    <Logo size={20} className="text-orange-500" />
                    <span className="font-black text-lg text-gray-800">
                        Resto<span className="text-orange-500">POS</span>
                    </span>
                </div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mt-0.5">
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
                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'
                                }`}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500 font-medium truncate mb-3">
                    {user?.fullName || 'Authorized Admin'}
                </p>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 text-gray-500 hover:text-red-600 text-sm font-semibold transition-colors"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
