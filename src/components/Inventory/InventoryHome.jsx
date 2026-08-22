// src/components/Inventory/InventoryHome.jsx
import { useState } from 'react';
import {
    LayoutDashboard, Boxes, PackagePlus, ArrowLeftRight, Truck,
    ClipboardList, ChefHat, Trash2, Clock,
} from 'lucide-react';
import InventoryOverview from './InventoryOverview';
import StockPage from './StockPage';
import ReceiveStock from './ReceiveStock';
import MoveStock from './MoveStock';
import SuppliersPage from './SuppliersPage';
import OrdersPage from './OrdersPage';
import PreparedFoodPage from './PreparedFoodPage';
import WastePage from './WastePage';
import ExpiringSoonPage from './ExpiringSoonPage';

const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'stock', label: 'Stock', icon: Boxes },
    { id: 'receive', label: 'Receive Stock', icon: PackagePlus },
    
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'prepared', label: 'Prepared Food', icon: ChefHat },
    { id: 'waste', label: 'Waste', icon: Trash2 },
    { id: 'expiring', label: 'Expiring Soon', icon: Clock },
];

export default function InventoryHome() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stockFilters, setStockFilters] = useState(null);
    const [receiveAgainstOrder, setReceiveAgainstOrder] = useState(null);

    const goTo = (tabId, context = null) => {
        if (tabId === 'stock') setStockFilters(context);
        if (tabId === 'receive') setReceiveAgainstOrder(context);
        setActiveTab(tabId);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-gray-800">Inventory</h2>
                <p className="text-sm text-gray-500">Keep track of what you have, what's low, and what's about to expire</p>
            </div>

            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto no-scrollbar">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => goTo(id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                                active
                                    ? 'border-orange-500 text-orange-500'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' && <InventoryOverview onNavigate={goTo} />}
            {activeTab === 'stock' && <StockPage initialFilters={stockFilters} />}
            {activeTab === 'receive' && (
                <ReceiveStock
                    purchaseOrder={receiveAgainstOrder}
                    onExitOrderMode={() => setReceiveAgainstOrder(null)}
                    onSuccess={() => { if (receiveAgainstOrder) goTo('orders'); }}
                />
            )}
            {activeTab === 'move' && <MoveStock />}
            {activeTab === 'suppliers' && <SuppliersPage />}
            {activeTab === 'orders' && <OrdersPage onReceiveAgainst={(po) => goTo('receive', po)} />}
            {activeTab === 'prepared' && <PreparedFoodPage />}
            {activeTab === 'waste' && <WastePage />}
            {activeTab === 'expiring' && <ExpiringSoonPage />}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}