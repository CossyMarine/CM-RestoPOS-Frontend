import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import API from '../api/axios';
import AdminSidebar from '../components/Admin/AdminSidebar';
import ShiftBar from '../components/Accountant/ShiftBar';
import AccountantOrdersLedger from '../components/Accountant/AccountantOrdersLedger';
import PaymentsView from '../components/Admin/PaymentsView';
import VoidRequestsView from '../components/Admin/VoidRequestsView';
import InventoryManagement from '../components/Admin/InventoryManagement';
import MenuManagement from '../components/Admin/MenuManagement';
import UsersManagement from '../components/Admin/UsersManagement';
import SettingsManagement from '../components/Admin/SettingsManagement';
import WaiterManagement from '../components/Admin/WaiterManagement';
import KitchenManagement from '../components/Admin/KitchenManagement';
import {
    ReceiptText, CreditCard, ShieldAlert, Boxes, UtensilsCrossed, Users, UserCog, Settings, ChefHat,
} from 'lucide-react';

const MODULE_MAP = {
    ordersReceipts: { id: 'orders', label: 'Orders & Receipts', icon: ReceiptText, Component: AccountantOrdersLedger },
    payments: { id: 'payments', label: 'Payments', icon: CreditCard, Component: PaymentsView },
    voidRequests: { id: 'voids', label: 'Void Requests', icon: ShieldAlert, Component: VoidRequestsView },
    inventory: { id: 'inventory', label: 'Inventory', icon: Boxes, Component: InventoryManagement },
    manageMenu: { id: 'menu', label: 'Manage Menu', icon: UtensilsCrossed, Component: MenuManagement },
    users: { id: 'users', label: 'Users', icon: Users, Component: UsersManagement },
    waiterManagement: { id: 'waiters', label: 'Waiter Management', icon: UserCog, Component: WaiterManagement },
    kitchen: { id: 'kitchen', label: 'Kitchen', icon: ChefHat, Component: KitchenManagement },
    settings: { id: 'settings', label: 'Settings', icon: Settings, Component: SettingsManagement },
};

// Fixed display order regardless of permissions object key order
const MODULE_ORDER = ['ordersReceipts', 'payments', 'voidRequests', 'inventory', 'manageMenu', 'waiterManagement', 'kitchen', 'users', 'settings'];

export default function AccountantPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [shiftOpen, setShiftOpen] = useState(null);

    const permissions = user?.permissions || {};
    const enabledModules = MODULE_ORDER.filter((key) => permissions[key]).map((key) => MODULE_MAP[key]);
    const [activeView, setActiveView] = useState('orders');

    useEffect(() => {
        if (enabledModules.length && !enabledModules.some((m) => m.id === activeView)) {
            setActiveView(enabledModules[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchPendingCount = useCallback(() => {
        if (!permissions.payments) return;
        API.get('/payments/pending/count').then((res) => setPendingPaymentsCount(res.data.count || 0)).catch(() => {});
    }, [permissions.payments]);

    useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = enabledModules.map(({ id, label, icon }) => ({ id, label, icon }));
    const active = enabledModules.find((m) => m.id === activeView) || enabledModules[0];
    const ActiveComponent = active?.Component;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex">
            <AdminSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                user={user}
                onLogout={handleLogout}
                pendingPaymentsCount={pendingPaymentsCount}
                navItems={navItems}
                title="Accounts Console"
            />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <ShiftBar onShiftChange={setShiftOpen} />
                {ActiveComponent ? (
                    active.id === 'orders'
                        ? <ActiveComponent shiftOpen={!!shiftOpen} />
                        : <ActiveComponent onPendingChange={fetchPendingCount} />
                ) : (
                    <div className="text-center text-gray-400 py-24">
                        No sections are enabled on your account yet — ask an admin to grant access.
                    </div>
                )}
            </main>
        </div>
    );
}
