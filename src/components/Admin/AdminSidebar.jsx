import {
    LayoutDashboard, UtensilsCrossed, ChefHat, ReceiptText, CreditCard,
    ShieldAlert, Users, UserCog, Settings, LogOut, Boxes, FlaskConical,
    FileBarChart, UtensilsCrossed as Logo,
} from 'lucide-react';

export const ADMIN_NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'menu', label: 'Manage Menu', icon: UtensilsCrossed },
    { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'batchIntegrityTest', label: 'Batch Integrity DEV TEST', icon: FlaskConical },
    { id: 'orders', label: 'Orders & Receipts', icon: ReceiptText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'voids', label: 'Void Requests', icon: ShieldAlert },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'waiters', label: 'Waiter Management', icon: UserCog },
    { id: 'accountants', label: 'Accountants', icon: UserCog },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({
    activeView, onNavigate, user, onLogout, pendingPaymentsCount = 0,
    navItems = ADMIN_NAV_ITEMS, title = 'Management Console', extra = null,
}) {
    return (
        <aside className="w-64 bg-white h-screen sticky top-0 flex flex-col justify-between shrink-0 shadow-sm border-r border-gray-100 z-20">
            <div className="p-6">
                <div className="flex items-center gap-2">
                    <Logo size={20} className="text-orange-500" />
                    <span className="font-black text-lg text-gray-800">
                        Resto<span className="text-orange-500">POS</span>
                    </span>
                </div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mt-0.5">
                    {title}
                </p>

                {extra}

                <nav className="mt-8 space-y-1">
                    {navItems.map(({ id, label, icon: Icon }) => {
                        const active = activeView === id;
                        const badge = id === 'payments' ? pendingPaymentsCount : 0;
                        return (
                            <button
                                key={id}
                                onClick={() => onNavigate(id)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                                    active
                                        ? 'bg-orange-500 text-white shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-orange-500'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="flex-1">{label}</span>
                                {badge > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="p-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium truncate mb-3">
                    {user?.fullName || 'Authorized User'}
                </p>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm font-semibold transition-colors"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}