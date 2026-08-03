// src/components/Admin/Inventory/InventoryHome.jsx
import { useState } from 'react';
import {
    LayoutDashboard, Boxes, PackagePlus, ArrowLeftRight, Truck,
    ClipboardList, ChefHat, Trash2, Clock,
} from 'lucide-react';
import InventoryOverview from './InventoryOverview';
import StockPage from './StockPage';
import ReceiveStock from './ReceiveStock';
import MoveStock from './MoveStock';
import ComingSoon from './ComingSoon';

const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'stock', label: 'Stock', icon: Boxes },
    { id: 'receive', label: 'Receive Stock', icon: PackagePlus },
    { id: 'move', label: 'Move Stock', icon: ArrowLeftRight },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'prepared', label: 'Prepared Food', icon: ChefHat },
    { id: 'waste', label: 'Waste', icon: Trash2 },
    { id: 'expiring', label: 'Expiring Soon', icon: Clock },
];

// Tabs that don't have a real page yet — everything else below is wired
// to a real component (Overview, Stock, Receive Stock, Move Stock).
const COMING_SOON_COPY = {
    suppliers: { title: 'Suppliers', description: 'Keep a list of who you buy from, their contact details, and what you\u2019ve received from them over time.' },
    orders: { title: 'Orders', description: 'Place and track orders from your suppliers, from draft to delivered.' },
    prepared: { title: 'Prepared Food', description: 'Turn raw ingredients into finished dishes and track what that used up.' },
    waste: { title: 'Record Waste', description: 'Log spoiled, damaged, or expired stock so your numbers always reflect reality.' },
    expiring: { title: 'Expiring Soon', description: 'A complete list of every batch approaching its expiry date, across every location.' },
};

const BUILT_TABS = ['overview', 'stock', 'receive', 'move'];

export default function InventoryHome() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stockFilters, setStockFilters] = useState(null);

    // Tabs are conditionally rendered below, so each one mounts fresh
    // every time you switch to it — Overview/Stock always show current
    // numbers after you receive or move stock, with no extra plumbing.
    const goTo = (tabId, filters = null) => {
        if (tabId === 'stock') setStockFilters(filters);
        setActiveTab(tabId);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-gray-800">Inventory</h2>
                <p className="text-sm text-gray-500">Keep track of what you have, what’s low, and what’s about to expire</p>
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
            {activeTab === 'receive' && <ReceiveStock />}
            {activeTab === 'move' && <MoveStock />}
            {!BUILT_TABS.includes(activeTab) && (
                <ComingSoon
                    icon={NAV_ITEMS.find((n) => n.id === activeTab)?.icon || Boxes}
                    title={COMING_SOON_COPY[activeTab]?.title}
                    description={COMING_SOON_COPY[activeTab]?.description}
                />
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}