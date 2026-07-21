import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import API from '../api/axios';
import AdminSidebar from '../components/Admin/AdminSidebar';
import DashboardOverview from '../components/Admin/DashboardOverview';
import MenuManagement from '../components/Admin/MenuManagement';
import OrdersLedger from '../components/Admin/OrdersLedger';
import PaymentsView from '../components/Admin/PaymentsView';
import VoidRequestsView from '../components/Admin/VoidRequestsView';
import UsersManagement from '../components/Admin/UsersManagement';
import SettingsManagement from '../components/Admin/SettingsManagement';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const VIEWS = {
    dashboard: DashboardOverview,
    menu: MenuManagement,
    orders: OrdersLedger,
    payments: PaymentsView,
    voids: VoidRequestsView,
    users: UsersManagement,
    settings: SettingsManagement,
};

export default function Admin() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const activeViewRef = useRef(activeView);
    activeViewRef.current = activeView;

    const fetchPendingCount = useCallback(() => {
        API.get('/payments/pending/count')
            .then((res) => setPendingPaymentsCount(res.data.count || 0))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchPendingCount();
    }, [fetchPendingCount]);

    // Sidebar-wide toast + badge — fires no matter which admin view is open
    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('receipt:manualPending', (payload) => {
            fetchPendingCount();
            if (activeViewRef.current !== 'payments') {
                const latest = payload?.receipt?.pendingManualPayments?.slice(-1)[0];
                toast.info(
                    `New pending payment on ${payload?.receipt?.billId || 'a bill'}${
                        latest ? ` — KES ${Number(latest.amount).toLocaleString()}` : ''
                    }`
                );
            }
        });
        socket.on('receipt:manualPaymentResolved', () => fetchPendingCount());
        return () => socket.disconnect();
    }, [fetchPendingCount]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const ActiveComponent = VIEWS[activeView] || DashboardOverview;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex">
            <AdminSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                user={user}
                onLogout={handleLogout}
                pendingPaymentsCount={pendingPaymentsCount}
            />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <ActiveComponent onPendingChange={fetchPendingCount} />
            </main>
        </div>
    );
}
