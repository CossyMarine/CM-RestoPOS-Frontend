// src/components/Inventory/PreparedFoodPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ChefHat, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ProductionFormModal from './ProductionFormModal';
import ProductionDetailModal from './ProductionDetailModal';
import { formatQty, formatShortDate } from './inventoryLabels';

const STATUS_STYLES = {
    completed: { label: 'Completed', classes: 'bg-green-50 text-green-700 border-green-200' },
    pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-600 border-red-200' },
};

export default function PreparedFoodPage() {
    const [loading, setLoading] = useState(true);
    const [productions, setProductions] = useState([]);
    const [search, setSearch] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [detailTarget, setDetailTarget] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await API.get('/inventory/production');
            setProductions(res.data || []);
        } catch (err) {
            console.error('Failed to load prepared food', err);
            toast.error('Failed to load prepared food records');
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return productions.filter((p) => !q || p.producedItem?.name?.toLowerCase().includes(q));
    }, [productions, search]);

    const handleSaved = (saved) => {
        setProductions((prev) => [saved, ...prev]);
        setFormOpen(false);
    };

    const handleCancelled = (id) => {
        setProductions((prev) => prev.map((p) => (p._id === id ? { ...p, status: 'cancelled' } : p)));
        setDetailTarget(null);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search prepared food…"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <button
                    onClick={() => setFormOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
                >
                    <Plus size={15} /> Prepare Food
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-3">Item</th>
                            <th className="px-5 py-3">Quantity Made</th>
                            <th className="px-5 py-3">Location</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm font-medium">Loading…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-16">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <ChefHat size={28} className="text-gray-300" />
                                        <p className="text-gray-400 text-sm font-medium">
                                            {productions.length === 0 ? 'Nothing prepared yet' : 'Nothing matches your search'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((p) => {
                                const status = STATUS_STYLES[p.status] || STATUS_STYLES.completed;
                                return (
                                    <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3 font-bold text-gray-800">{p.producedItem?.name || 'Item'}</td>
                                        <td className="px-5 py-3 text-gray-700 font-semibold">
                                            {formatQty(p.quantityProduced, p.unit?.abbreviation)}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">{p.location?.name || '—'}</td>
                                        <td className="px-5 py-3">
                                            <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${status.classes}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">{formatShortDate(p.createdAt)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => setDetailTarget(p)}
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

            {formOpen && <ProductionFormModal onClose={() => setFormOpen(false)} onSaved={handleSaved} />}

            {detailTarget && (
                <ProductionDetailModal
                    production={detailTarget}
                    onClose={() => setDetailTarget(null)}
                    onCancelled={handleCancelled}
                />
            )}
        </div>
    );
}