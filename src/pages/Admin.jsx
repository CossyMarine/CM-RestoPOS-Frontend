import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../hooks/useAuth';
import AdminSidebar from '../components/Admin/AdminSidebar';
import DashboardOverview from '../components/Admin/DashboardOverview';
import MenuManagement from '../components/Admin/MenuManagement';
import OrdersLedger from '../components/Admin/OrdersLedger';
import VoidRequestsView from '../components/Admin/VoidRequestsView';
import UsersManagement from '../components/Admin/UsersManagement';

const VIEWS = {
    dashboard: DashboardOverview,
    menu: MenuManagement,
    orders: OrdersLedger,
    voids: VoidRequestsView,
    users: UsersManagement,
};

export default function Admin() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');

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
            />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <ActiveComponent />
            </main>
            <ToastContainer position="top-right" theme="light" autoClose={3000} />
        </div>
    );
}
