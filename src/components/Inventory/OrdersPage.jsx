// src/components/Inventory/OrdersPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ClipboardList, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import PurchaseOrderFormModal from './PurchaseOrderFormModal';
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal';
import { formatKES, formatShortDate } from './inventoryLabels';

const STATUS_STYLES = {
    draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
    ordered: { label: 'Ordered', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    partially_received: { label: 'Partially Received', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    received: { label: 'Received', classes: 'bg-green-50 text-green-700 border-green-200' },
    cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-600 border-red-200' },
};

const STATUS_FILTERS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'partially_received', label: 'Partially Received' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function OrdersPage({ onReceiveAgainst }) {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [formTarget, setFormTarget] = useState(null); // null closed, {} = new, order obj = edit
    const [detailTarget, setDetailTarget] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await API.get('/inventory/purchase-orders');
            setOrders(res.data || []);
        } catch (err) {
            console.error('Failed to load orders', err);
            toast.error('Failed to load orders');
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders
            .filter((o) => !q || o.poNumber.toLowerCase().includes(q) || o.supplier?.name?.toLowerCase().includes(q))
            .filter((o) => statusFilter === 'all' || o.status === statusFilter);
    }, [orders, search, statusFilter]);

    const handleSaved = (saved) => {
        setOrders((prev) => {
            const exists = prev.some((o) => o._id === saved._id);
            return exists ? prev.map((o) => (o._id === saved._id ? saved : o)) : [saved, ...prev];
        });
        setFormTarget(null);
        setDetailTarget((prev) => (prev && prev._id === saved._id ? saved : prev));
    };

    const handleChanged = (updated) => {
        setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
        setDetailTarget(updated);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by order number or supplier…"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-orange-400"
                >
                    {STATUS_FILTERS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <button
                    onClick={() => setFormTarget({})}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
                >
                    <Plus size={15} /> New Order
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-3">Order #</th>
                            <th className="px-5 py-3">Supplier</th>
                            <th className="px-5 py-3">Location</th>
                            <th className="px-5 py-3">Value</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Created</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm font-medium">Loading orders…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-16">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <ClipboardList size={28} className="text-gray-300" />
                                        <p className="text-gray-400 text-sm font-medium">
                                            {orders.length === 0 ? 'No orders placed yet' : 'No orders match your filters'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((o) => {
                                const value = (o.items || []).reduce((s, i) => s + (i.totalCost || 0), 0);
                                const status = STATUS_STYLES[o.status] || STATUS_STYLES.draft;
                                return (
                                    <tr key={o._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3 font-bold text-gray-800">{o.poNumber}</td>
                                        <td className="px-5 py-3 text-gray-500">{o.supplier?.name || '—'}</td>
                                        <td className="px-5 py-3 text-gray-500">{o.location?.name || '—'}</td>
                                        <td className="px-5 py-3 text-gray-700 font-semibold">{formatKES(value)}</td>
                                        <td className="px-5 py-3">
                                            <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${status.classes}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">{formatShortDate(o.createdAt)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => setDetailTarget(o)}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {formTarget !== null && (
                <PurchaseOrderFormModal
                    purchaseOrder={formTarget._id ? formTarget : null}
                    onClose={() => setFormTarget(null)}
                    onSaved={handleSaved}
                />
            )}

            {detailTarget && (
                <PurchaseOrderDetailModal
                    purchaseOrder={detailTarget}
                    onClose={() => setDetailTarget(null)}
                    onEdit={(o) => { setDetailTarget(null); setFormTarget(o); }}
                    onChanged={handleChanged}
                    onReceive={(o) => { setDetailTarget(null); onReceiveAgainst(o); }}
                />
            )}
        </div>
    );
}